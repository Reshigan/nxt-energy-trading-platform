/**
 * 2.2 Regulatory Export — NERSA/FSCA-format regulatory reports
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const regulatory = new Hono<HonoEnv>();
regulatory.use('*', authMiddleware({ roles: ['admin', 'regulator'] }));

// GET /regulatory/nersa — Generate NERSA compliance report
regulatory.get('/nersa', async (c) => {
  try {
    const period = c.req.query('period') || 'monthly';
    const now = new Date();
    const periodStart = period === 'quarterly'
      ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStartStr = periodStart.toISOString().substring(0, 10);

    const [trades, participants, licences, disputes, credits] = await Promise.all([
      c.env.DB.prepare(
        "SELECT COUNT(*) as count, SUM(total_cents) as volume_cents, AVG(price_cents) as avg_price FROM trades WHERE status = 'settled' AND created_at >= ?"
      ).bind(periodStartStr).first<{ count: number; volume_cents: number; avg_price: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) as verified FROM participants").first<{ total: number; verified: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as active FROM participants WHERE kyc_status = 'verified'").first<{ active: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE created_at >= ?").bind(periodStartStr).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count, SUM(amount_tonnes) as tonnes FROM carbon_credits WHERE created_at >= ?").bind(periodStartStr).first<{ count: number; tonnes: number }>(),
    ]);

    const report = {
      report_type: 'NERSA_COMPLIANCE',
      period: periodStartStr,
      generated_at: nowISO(),
      reference: `NERSA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${generateId().substring(0, 8)}`,
      sections: {
        market_activity: {
          total_trades: trades?.count || 0,
          total_volume_rands: Math.round((trades?.volume_cents || 0) / 100),
          avg_price_cents_kwh: Math.round(trades?.avg_price || 0),
        },
        participant_compliance: {
          total_participants: participants?.total || 0,
          kyc_verified: participants?.verified || 0,
          compliance_rate_pct: participants?.total ? Math.round(((participants?.verified || 0) / participants.total) * 100) : 0,
        },
        licence_status: {
          active_licences: licences?.active || 0,
        },
        dispute_resolution: {
          disputes_filed: disputes?.count || 0,
        },
        carbon_market: {
          credits_issued: credits?.count || 0,
          tonnes_registered: credits?.tonnes || 0,
        },
      },
    };

    return c.json({ success: true, data: report });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'NERSA report generation failed'), 500);
  }
});

// GET /regulatory/fsca — Generate FSCA financial conduct report
regulatory.get('/fsca', async (c) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);

    const [alerts, largeOrders, aml] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as count FROM surveillance_alerts WHERE created_at >= ?").bind(monthStart).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE total_cents > 10000000 AND created_at >= ?").bind(monthStart).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM aml_checks WHERE created_at >= ?").bind(monthStart).first<{ count: number }>(),
    ]);

    const report = {
      report_type: 'FSCA_CONDUCT',
      period: monthStart,
      generated_at: nowISO(),
      reference: `FSCA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${generateId().substring(0, 8)}`,
      sections: {
        market_surveillance: {
          alerts_generated: alerts?.count || 0,
          types: ['wash_trading', 'spoofing', 'front_running', 'price_manipulation', 'concentration', 'layering', 'marking_close'],
        },
        large_trade_reporting: {
          large_orders_above_100k: largeOrders?.count || 0,
          threshold_rands: 100000,
        },
        aml_compliance: {
          checks_performed: aml?.count || 0,
        },
      },
    };

    return c.json({ success: true, data: report });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'FSCA report generation failed'), 500);
  }
});

// GET /regulatory/export/:format — Export in CSV/JSON format
regulatory.get('/export/:format', async (c) => {
  try {
    const format = c.req.param('format');
    const reportType = c.req.query('type') || 'nersa';
    const from = c.req.query('from') || new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10);

    const trades = await c.env.DB.prepare(
      "SELECT t.id, t.market, t.volume, t.price_cents, t.total_cents, t.status, t.created_at, b.company_name as buyer, s.company_name as seller FROM trades t LEFT JOIN participants b ON t.buyer_id = b.id LEFT JOIN participants s ON t.seller_id = s.id WHERE t.created_at >= ? ORDER BY t.created_at DESC LIMIT 10000"
    ).bind(from).all();

    if (format === 'csv') {
      const header = 'id,market,volume,price_cents,total_cents,status,buyer,seller,created_at\n';
      const rows = trades.results.map((t: Record<string, unknown>) =>
        `${t.id},${t.market},${t.volume},${t.price_cents},${t.total_cents},${t.status},"${t.buyer || ''}","${t.seller || ''}",${t.created_at}`
      ).join('\n');
      return new Response(header + rows, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${reportType}_export.csv"` } });
    }

    return c.json({ success: true, data: { report_type: reportType, from, records: trades.results.length, trades: trades.results } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Export failed'), 500);
  }
});

// POST /regulatory/schedule — Schedule auto-generation
regulatory.post('/schedule', async (c) => {
  try {
    const body = await c.req.json<{ report_type: string; frequency: string; recipients: string[] }>();
    const id = generateId();
    await c.env.KV.put(`regulatory_schedule:${id}`, JSON.stringify({
      id, ...body, created_at: nowISO(), status: 'active'
    }));
    return c.json({ success: true, data: { id, status: 'scheduled' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to schedule report'), 500);
  }
});

export default regulatory;
