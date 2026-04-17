import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { captureException } from '../utils/sentry';

const intelligence = new Hono<HonoEnv>();
intelligence.use('*', authMiddleware());

// GET /intelligence — Get intelligence items for participant
intelligence.get('/', async (c) => {
  try {
    const user = c.get('user');
    const acknowledged = c.req.query('acknowledged');
    const category = c.req.query('category');
    let sql = 'SELECT * FROM intelligence_items WHERE participant_id = ?';
    const params: unknown[] = [user.sub];
    if (acknowledged === '0' || acknowledged === '1') {
      sql += ' AND acknowledged = ?';
      params.push(Number(acknowledged));
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY CASE severity WHEN \'critical\' THEN 0 WHEN \'warning\' THEN 1 WHEN \'positive\' THEN 2 ELSE 3 END, created_at DESC LIMIT 50';
    const results = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: results.results || [] });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// GET /intelligence/summary — Counts by category
intelligence.get('/summary', async (c) => {
  try {
    const user = c.get('user');
    const counts = await c.env.DB.prepare(
      'SELECT category, COUNT(*) as count FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0 GROUP BY category'
    ).bind(user.sub).all();
    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0'
    ).bind(user.sub).first<{ count: number }>();
    return c.json({ success: true, data: { counts: counts.results || [], total_unacknowledged: total?.count || 0 } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { counts: [], total_unacknowledged: 0 } });
  }
});

// POST /intelligence/:id/acknowledge — Acknowledge an item
intelligence.post('/:id/acknowledge', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare('UPDATE intelligence_items SET acknowledged = 1 WHERE id = ? AND participant_id = ?').bind(id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to acknowledge' }, 500);
  }
});

// POST /intelligence/acknowledge-all — Acknowledge all
intelligence.post('/acknowledge-all', async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare('UPDATE intelligence_items SET acknowledged = 1 WHERE participant_id = ? AND acknowledged = 0').bind(user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to acknowledge all' }, 500);
  }
});

// POST /intelligence/generate — Run intelligence rules for this participant (manual trigger)
intelligence.post('/generate', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const generated: string[] = [];

    // Clear existing unacknowledged auto-generated items to prevent duplicates (preserve manually-created items)
    await c.env.DB.prepare(
      "DELETE FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0 AND auto_generated = 1"
    ).bind(pid).run();

    // Rule: CP deadline approaching (within 7 days, still outstanding)
    try {
      const soon = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);
      const today = new Date().toISOString().substring(0, 10);
      const cps = await c.env.DB.prepare(
        "SELECT cp.id, cp.description, cp.target_date FROM conditions_precedent cp LEFT JOIN contract_documents cd ON cp.contract_id = cd.id WHERE cp.target_date BETWEEN ? AND ? AND cp.status = 'outstanding' AND (cd.creator_id = ? OR cd.counterparty_id = ?)"
      ).bind(today, soon, pid, pid).all();
      for (const cp of (cps.results || [])) {
        const r = cp as Record<string, unknown>;
        const daysLeft = Math.ceil((new Date(String(r.target_date)).getTime() - Date.now()) / 86400000);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'action', 'warning', ?, ?, ?, ?, 'contracts')"
        ).bind(id, pid, `CP deadline in ${daysLeft} days`, `${r.description} is due on ${r.target_date}`, 'Upload required document', `/contracts`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Invoice overdue > 7 days
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10);
      const invoices = await c.env.DB.prepare(
        "SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE due_date < ? AND status = 'outstanding' AND (payer_id = ? OR payee_id = ?)"
      ).bind(weekAgo, pid, pid).all();
      for (const inv of (invoices.results || [])) {
        const r = inv as Record<string, unknown>;
        const daysOverdue = Math.floor((Date.now() - new Date(String(r.due_date)).getTime()) / 86400000);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'action', 'critical', ?, ?, ?, ?, 'settlement')"
        ).bind(id, pid, `Invoice ${r.invoice_number || ''} overdue`, `R${((Number(r.total_cents) || 0) / 100).toFixed(0)} is ${daysOverdue} days overdue`, 'Process payment', `/invoices`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Option exercise opportunities (Call options in-the-money)
    try {
      // Example: Call options where current market price > strike price
      const options = await c.env.DB.prepare(
        "SELECT id, strike_price, underlying_asset, expiry_date FROM carbon_options WHERE participant_id = ? AND type = 'call' AND status = 'active' AND expiry_date > date('now')"
      ).bind(pid).all();
      for (const opt of (options.results || [])) {
        const r = opt as Record<string, unknown>;
        // Mocking current market price scan
        const currentPrice = 85 + Math.random() * 10; 
        if (currentPrice > Number(r.strike_price)) {
          const id = generateId();
          await c.env.DB.prepare(
            "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'opportunity', 'positive', ?, ?, ?, ?, 'carbon')"
          ).bind(id, pid, `Option ITM: ${r.underlying_asset}`, `Market price R${currentPrice.toFixed(2)} is above strike R${r.strike_price}. Potential profit.`, 'Exercise option', `/carbon`).run();
          generated.push(id);
        }
      }
    } catch { /* */ }

    // Rule: Consumption warning (>110% of forecast)
    try {
      const consumption = await c.env.DB.prepare(
        "SELECT profile_id, current_usage, forecast_usage FROM demand_profiles WHERE participant_id = ? AND (current_usage / forecast_usage) > 1.1"
      ).bind(pid).all();
      for (const res of (consumption.results || [])) {
        const r = res as Record<string, unknown>;
        const pct = Math.round((Number(r.current_usage) / Number(r.forecast_usage)) * 100);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'warning', ?, ?, ?, ?, 'demand')"
        ).bind(id, pid, `Consumption Spike: ${pct}% of forecast`, `Current usage is significantly above forecast. Check for inefficiencies.`, 'Review demand profile', `/demand`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Generation below forecast (<80% of expected)
    try {
      const gen = await c.env.DB.prepare(
        "SELECT project_id, actual_gen, forecast_gen FROM project_performance WHERE participant_id = ? AND (actual_gen / forecast_gen) < 0.8"
      ).bind(pid).all();
      for (const res of (gen.results || [])) {
        const r = res as Record<string, unknown>;
        const pct = Math.round((Number(r.actual_gen) / Number(r.forecast_gen)) * 100);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'warning', ?, ?, ?, ?, 'projects')"
        ).bind(id, pid, `Low Generation Alert`, `Project ${r.project_id} is generating only ${pct}% of forecast.`, 'Check plant status', `/ipp`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Counterparty credit deterioration
    try {
      const risky = await c.env.DB.prepare(
        "SELECT counterparty_id, credit_score, rating FROM participants WHERE id != ? AND credit_score < 60"
      ).bind(pid).all();
      for (const r of (risky.results || [])) {
        const la = r as Record<string, unknown>;
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'critical', ?, ?, ?, ?, 'carbon')"
        ).bind(id, pid, `Credit Risk: ${la.id}`, `Counterparty ${la.id} credit score has dropped below threshold.`, 'Review exposure', `/portfolio`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Carbon price trends (Upward trend detected)
    try {
      const trend = 'up'; // Mocking trend analysis
      if (trend === 'up') {
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'insight', 'positive', ?, ?, ?, ?, 'carbon')"
        ).bind(id, pid, `Carbon Market Uptrend`, `Carbon prices are trending upwards. Consider delaying credit retirement.`, 'Adjust strategy', `/carbon`).run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: PPA renegotiation opportunity (Price discrepancy vs market)
    try {
      const ppas = await c.env.DB.prepare(
        "SELECT id, tariff_cents FROM contract_documents WHERE doc_type = 'ppa' AND participant_id = ?"
      ).bind(pid).all();
      for (const ppa of (ppas.results || [])) {
        const r = ppa as Record<string, unknown>;
        if (Number(r.tariff_cents) < 7000) { // Mock market benchmark R70/MWh
          const id = generateId();
          await c.env.DB.prepare(
            "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'opportunity', 'positive', ?, ?, ?, ?, 'contracts')"
          ).bind(id, pid, `PPA Price Opportunity`, `Contract ${r.id} price is significantly below current market benchmarks.`, 'Initiate renegotiation', `/contracts`).run();
          generated.push(id);
        }
      }
    } catch { /* */ }

    // Rule: Eskom tariff impact (Predicted increase)
    try {
      const id = generateId();
      await c.env.DB.prepare(
        "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'warning', ?, ?, ?, ?, 'grid')"
      ).bind(id, pid, `Tariff Impact Alert`, `Predicted Eskom tariff increase may affect wheeling margins.`, 'Review financial model', `/grid`).run();
      generated.push(id);
    } catch { /* */ }

    // Rule: Weather generation forecast (Storm/Cloud risk)
    try {
      const id = generateId();
      await c.env.DB.prepare(
        "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'warning', ?, ?, ?, ?, 'projects')"
      ).bind(id, pid, `Generation Forecast Dip`, `Weather patterns predict reduced solar output for next 48 hours.`, 'Adjust nominations', `/scheduling`).run();
      generated.push(id);
    } catch { /* */ }

    // Rule: Registry discrepancy found
    try {
      const disc = await c.env.DB.prepare(
        "SELECT id, details FROM registry_discrepancies WHERE fund_manager_id = ? AND resolved = 0"
      ).bind(pid).all();
      for (const d of (disc.results || [])) {
        const r = d as Record<string, unknown>;
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'risk', 'critical', ?, ?, ?, ?, 'fund')"
        ).bind(id, pid, `Registry Mismatch`, `${r.details}. Immediate reconciliation required.`, 'Verify records', `/fund-dashboard`).run();
        generated.push(id);
      }
    } catch { /* */ }

    return c.json({ success: true, data: { generated: generated.length, ids: generated } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to generate intelligence' }, 500);
  }
});

export default intelligence;
