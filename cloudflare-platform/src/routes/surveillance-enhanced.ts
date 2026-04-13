/**
 * 2.1 Enhanced Surveillance — 7 detection rules for market manipulation
 * Rules: wash trading, spoofing, front running, price manipulation, concentration, layering, marking the close
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const surveillanceEnhanced = new Hono<HonoEnv>();
surveillanceEnhanced.use('*', authMiddleware({ roles: ['admin', 'regulator'] }));

interface Alert {
  id: string;
  rule_type: string;
  severity: string;
  participant_id: string | null;
  description: string;
  evidence: string;
}

// POST /surveillance/scan — Run all 7 detection rules
surveillanceEnhanced.post('/scan', async (c) => {
  try {
    const alerts: Alert[] = [];

    // Fetch recent data
    const recentTrades = await c.env.DB.prepare(
      "SELECT t.*, b.company_name as buyer_name, s.company_name as seller_name FROM trades t LEFT JOIN participants b ON t.buyer_id = b.id LEFT JOIN participants s ON t.seller_id = s.id WHERE t.created_at > datetime('now', '-24 hours') ORDER BY t.created_at DESC"
    ).all();

    const recentOrders = await c.env.DB.prepare(
      "SELECT * FROM orders WHERE created_at > datetime('now', '-24 hours') ORDER BY created_at DESC"
    ).all();

    // Rule 1: WASH TRADING — Same entity on both sides of trade
    for (const t of recentTrades.results) {
      if (t.buyer_id && t.seller_id && t.buyer_id === t.seller_id) {
        alerts.push({
          id: generateId(), rule_type: 'wash_trading', severity: 'critical',
          participant_id: t.buyer_id as string,
          description: `Self-trade detected: ${t.buyer_name} bought and sold in same transaction`,
          evidence: JSON.stringify({ trade_id: t.id, market: t.market, volume: t.volume, price_cents: t.price_cents }),
        });
      }
    }

    // Rule 2: SPOOFING — Large orders placed and cancelled quickly
    const cancelledOrders = await c.env.DB.prepare(
      "SELECT participant_id, COUNT(*) as cancel_count, SUM(volume) as total_volume FROM orders WHERE status = 'cancelled' AND created_at > datetime('now', '-1 hour') GROUP BY participant_id HAVING cancel_count > 5"
    ).all();
    for (const o of cancelledOrders.results) {
      alerts.push({
        id: generateId(), rule_type: 'spoofing', severity: 'high',
        participant_id: o.participant_id as string,
        description: `${o.cancel_count} orders cancelled within 1 hour (${o.total_volume} MWh total)`,
        evidence: JSON.stringify({ cancel_count: o.cancel_count, total_volume: o.total_volume }),
      });
    }

    // Rule 3: FRONT RUNNING — Small order placed just before large order in same market
    const ordersByTime = recentOrders.results.sort((a, b) =>
      (a.created_at as string).localeCompare(b.created_at as string)
    );
    for (let i = 1; i < ordersByTime.length; i++) {
      const prev = ordersByTime[i - 1];
      const curr = ordersByTime[i];
      if (prev.market === curr.market && prev.participant_id !== curr.participant_id) {
        const prevVol = (prev.volume as number) || 0;
        const currVol = (curr.volume as number) || 0;
        if (currVol > prevVol * 10 && prevVol < 10) {
          const prevTime = new Date(prev.created_at as string).getTime();
          const currTime = new Date(curr.created_at as string).getTime();
          if (currTime - prevTime < 120000) { // within 2 minutes
            alerts.push({
              id: generateId(), rule_type: 'front_running', severity: 'high',
              participant_id: prev.participant_id as string,
              description: `Small order (${prevVol} MWh) placed ${Math.round((currTime - prevTime) / 1000)}s before large order (${currVol} MWh)`,
              evidence: JSON.stringify({ small_order: prev.id, large_order: curr.id, market: prev.market }),
            });
          }
        }
      }
    }

    // Rule 4: PRICE MANIPULATION — Price moved >15% in 10 minutes
    const markets = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];
    for (const market of markets) {
      const priceWindow = await c.env.DB.prepare(
        "SELECT MIN(price_cents) as min_price, MAX(price_cents) as max_price FROM trades WHERE market = ? AND created_at > datetime('now', '-10 minutes') AND status = 'settled'"
      ).bind(market).first<{ min_price: number; max_price: number }>();

      if (priceWindow?.min_price && priceWindow?.max_price && priceWindow.min_price > 0) {
        const pctMove = ((priceWindow.max_price - priceWindow.min_price) / priceWindow.min_price) * 100;
        if (pctMove > 15) {
          alerts.push({
            id: generateId(), rule_type: 'price_manipulation', severity: 'critical',
            participant_id: null,
            description: `${market} price moved ${pctMove.toFixed(1)}% in 10 minutes (${priceWindow.min_price}→${priceWindow.max_price} cents)`,
            evidence: JSON.stringify({ market, min: priceWindow.min_price, max: priceWindow.max_price, pct: pctMove }),
          });
        }
      }
    }

    // Rule 5: CONCENTRATION — Single participant >30% of market volume
    const volumeByParticipant = await c.env.DB.prepare(
      "SELECT buyer_id as pid, market, SUM(volume) as vol FROM trades WHERE created_at > datetime('now', '-7 days') AND status = 'settled' GROUP BY buyer_id, market"
    ).all();
    const marketTotals: Record<string, number> = {};
    for (const v of volumeByParticipant.results) {
      const key = v.market as string;
      marketTotals[key] = (marketTotals[key] || 0) + ((v.vol as number) || 0);
    }
    for (const v of volumeByParticipant.results) {
      const total = marketTotals[v.market as string] || 0;
      const pct = total > 0 ? ((v.vol as number) / total) * 100 : 0;
      if (pct > 30) {
        alerts.push({
          id: generateId(), rule_type: 'concentration', severity: 'medium',
          participant_id: v.pid as string,
          description: `${pct.toFixed(1)}% of ${v.market} market volume in past 7 days`,
          evidence: JSON.stringify({ market: v.market, participant_volume: v.vol, market_total: total, pct }),
        });
      }
    }

    // Rule 6: LAYERING — Multiple orders at incrementally different prices
    const participantOrders: Record<string, Array<Record<string, unknown>>> = {};
    for (const o of recentOrders.results) {
      const pid = o.participant_id as string;
      if (!participantOrders[pid]) participantOrders[pid] = [];
      participantOrders[pid].push(o);
    }
    for (const [pid, orders] of Object.entries(participantOrders)) {
      const byMarket: Record<string, Array<Record<string, unknown>>> = {};
      for (const o of orders) {
        const m = o.market as string;
        if (!byMarket[m]) byMarket[m] = [];
        byMarket[m].push(o);
      }
      for (const [market, mOrders] of Object.entries(byMarket)) {
        if (mOrders.length >= 5) {
          const prices = mOrders.map(o => (o.price_cents as number) || 0).sort((a, b) => a - b);
          let isIncremental = true;
          for (let i = 1; i < prices.length; i++) {
            if (Math.abs(prices[i] - prices[i - 1]) > 500 || prices[i] === prices[i - 1]) {
              isIncremental = false;
              break;
            }
          }
          if (isIncremental) {
            alerts.push({
              id: generateId(), rule_type: 'layering', severity: 'high',
              participant_id: pid,
              description: `${mOrders.length} orders at incrementally different prices in ${market}`,
              evidence: JSON.stringify({ market, order_count: mOrders.length, price_range: `${prices[0]}-${prices[prices.length - 1]}` }),
            });
          }
        }
      }
    }

    // Rule 7: MARKING THE CLOSE — Large orders in last 5 minutes of trading session
    const now = new Date();
    const saHour = (now.getUTCHours() + 2) % 24;
    const saMin = now.getUTCMinutes();
    // SA trading hours: assume market closes at 17:00
    if (saHour === 16 && saMin >= 55) {
      const lateOrders = await c.env.DB.prepare(
        "SELECT * FROM orders WHERE created_at > datetime('now', '-5 minutes') AND volume > 50 ORDER BY volume DESC"
      ).all();
      for (const o of lateOrders.results) {
        alerts.push({
          id: generateId(), rule_type: 'marking_close', severity: 'medium',
          participant_id: o.participant_id as string,
          description: `Large order (${o.volume} MWh) placed in final 5 minutes of trading session`,
          evidence: JSON.stringify({ order_id: o.id, volume: o.volume, market: o.market, price: o.price_cents }),
        });
      }
    }

    // Store all alerts
    for (const alert of alerts) {
      try {
        await c.env.DB.prepare(
          'INSERT INTO surveillance_alerts (id, rule_type, severity, participant_id, description, evidence, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(alert.id, alert.rule_type, alert.severity, alert.participant_id, alert.description, alert.evidence, 'open').run();
      } catch { /* duplicate or constraint failure — skip */ }
    }

    return c.json({
      success: true,
      data: {
        alerts_generated: alerts.length,
        by_rule: {
          wash_trading: alerts.filter(a => a.rule_type === 'wash_trading').length,
          spoofing: alerts.filter(a => a.rule_type === 'spoofing').length,
          front_running: alerts.filter(a => a.rule_type === 'front_running').length,
          price_manipulation: alerts.filter(a => a.rule_type === 'price_manipulation').length,
          concentration: alerts.filter(a => a.rule_type === 'concentration').length,
          layering: alerts.filter(a => a.rule_type === 'layering').length,
          marking_close: alerts.filter(a => a.rule_type === 'marking_close').length,
        },
        alerts,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Surveillance scan failed'), 500);
  }
});

// GET /surveillance/enhanced/alerts — All persistent alerts
surveillanceEnhanced.get('/alerts', async (c) => {
  try {
    const status = c.req.query('status');
    const ruleType = c.req.query('rule_type');
    let query = 'SELECT sa.*, p.company_name FROM surveillance_alerts sa LEFT JOIN participants p ON sa.participant_id = p.id WHERE 1=1';
    const binds: (string | number)[] = [];

    if (status) { query += ' AND sa.status = ?'; binds.push(status); }
    if (ruleType) { query += ' AND sa.rule_type = ?'; binds.push(ruleType); }
    query += ' ORDER BY sa.created_at DESC LIMIT 100';

    const stmt = c.env.DB.prepare(query);
    const results = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get alerts'), 500);
  }
});

// POST /surveillance/enhanced/alerts/:id/investigate — Mark alert as investigating
surveillanceEnhanced.post('/alerts/:id/investigate', async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    await c.env.DB.prepare(
      "UPDATE surveillance_alerts SET status = 'investigating', investigator_id = ? WHERE id = ?"
    ).bind(user.sub, id).run();
    return c.json({ success: true, data: { id, status: 'investigating' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to investigate'), 500);
  }
});

// POST /surveillance/enhanced/alerts/:id/resolve — Resolve alert
surveillanceEnhanced.post('/alerts/:id/resolve', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json<{ resolution_notes: string; dismiss?: boolean }>();
    const status = body.dismiss ? 'dismissed' : 'resolved';
    await c.env.DB.prepare(
      'UPDATE surveillance_alerts SET status = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?'
    ).bind(status, body.resolution_notes, nowISO(), id).run();
    return c.json({ success: true, data: { id, status } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to resolve'), 500);
  }
});

// GET /surveillance/enhanced/stats — Dashboard stats
surveillanceEnhanced.get('/stats', async (c) => {
  try {
    const [total, open, byRule, bySeverity] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM surveillance_alerts').first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM surveillance_alerts WHERE status = 'open'").first<{ count: number }>(),
      c.env.DB.prepare('SELECT rule_type, COUNT(*) as count FROM surveillance_alerts GROUP BY rule_type').all(),
      c.env.DB.prepare('SELECT severity, COUNT(*) as count FROM surveillance_alerts GROUP BY severity').all(),
    ]);

    return c.json({
      success: true,
      data: {
        total_alerts: total?.count || 0,
        open_alerts: open?.count || 0,
        by_rule: Object.fromEntries(byRule.results.map(r => [r.rule_type, r.count])),
        by_severity: Object.fromEntries(bySeverity.results.map(r => [r.severity, r.count])),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get stats'), 500);
  }
});

export default surveillanceEnhanced;
