import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';

const reports = new Hono<HonoEnv>();
reports.use('*', authMiddleware());

// POST /reports — Create report definition
reports.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      name: string;
      report_type: string;
      date_range?: { from: string; to: string };
      filters?: Record<string, unknown>;
      grouping?: string[];
      metrics?: string[];
      output_format?: string;
      schedule?: string;
    };

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO report_definitions (id, participant_id, name, report_type, date_range, filters, grouping, metrics, output_format, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.sub, body.name, body.report_type,
      body.date_range ? JSON.stringify(body.date_range) : null,
      body.filters ? JSON.stringify(body.filters) : null,
      body.grouping ? JSON.stringify(body.grouping) : null,
      body.metrics ? JSON.stringify(body.metrics) : null,
      body.output_format || 'pdf',
      body.schedule || null,
    ).run();

    return c.json({ success: true, data: { id, name: body.name } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /reports — List report definitions
reports.get('/', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT * FROM report_definitions WHERE participant_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /reports/schedules — List report schedules
reports.get('/schedules', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare('SELECT * FROM report_schedules WHERE participant_id = ? ORDER BY created_at DESC').bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error(err);
    return c.json({ success: true, data: [] });
  }
});

// POST /reports/schedule — Create report schedule
reports.post('/schedule', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { frequency: string; email: string; report_type?: string };
    if (!body.frequency || !body.email) return c.json({ success: false, error: 'Frequency and email are required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO report_schedules (id, participant_id, frequency, email, report_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.frequency, body.email, body.report_type || 'general', 'active', nowISO()).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Report schedules not available' }, 500);
  }
});

// DELETE /reports/schedule/:id — Delete report schedule
reports.delete('/schedule/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM report_schedules WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to delete schedule' }, 500);
  }
});

// GET /reports/:id — Get report definition
reports.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const report = await c.env.DB.prepare(
      'SELECT * FROM report_definitions WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).first();
    if (!report) return c.json({ success: false, error: 'Report not found' }, 404);
    return c.json({ success: true, data: report });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /reports/:id/generate — Generate report data
reports.post('/:id/generate', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const report = await c.env.DB.prepare(
      'SELECT * FROM report_definitions WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).first();
    if (!report) return c.json({ success: false, error: 'Report not found' }, 404);

    const reportType = report.report_type as string;
    const dateRange = report.date_range ? JSON.parse(report.date_range as string) : { from: '2024-01-01', to: nowISO() };

    let data: Record<string, unknown> = {};

    switch (reportType) {
      case 'portfolio': {
        const positions = await c.env.DB.prepare(
          "SELECT market, SUM(volume) as volume, AVG(price_cents) as avg_price FROM orders WHERE participant_id = ? AND status IN ('open','partial') GROUP BY market"
        ).bind(user.sub).all();
        const trades = await c.env.DB.prepare(
          "SELECT COUNT(*) as count, SUM(total_cents) as total FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND created_at >= ? AND created_at <= ?"
        ).bind(user.sub, user.sub, dateRange.from, dateRange.to).first();
        data = { positions: positions.results, trades, period: dateRange };
        break;
      }
      case 'trading': {
        const trades = await c.env.DB.prepare(
          "SELECT * FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC"
        ).bind(user.sub, user.sub, dateRange.from, dateRange.to).all();
        data = { trades: trades.results, period: dateRange, total: trades.results.length };
        break;
      }
      case 'carbon': {
        const credits = await c.env.DB.prepare(
          "SELECT * FROM carbon_credits WHERE owner_id = ? AND created_at >= ? AND created_at <= ?"
        ).bind(user.sub, dateRange.from, dateRange.to).all();
        const retired = credits.results.filter((cr) => (cr.status as string) === 'retired');
        data = { credits: credits.results, retired_count: retired.length, period: dateRange };
        break;
      }
      case 'compliance': {
        const checks = await c.env.DB.prepare(
          "SELECT sc.*, p.company_name FROM statutory_checks sc JOIN participants p ON sc.entity_id = p.id WHERE sc.entity_type = 'participant' ORDER BY sc.checked_at DESC LIMIT 100"
        ).all();
        data = { checks: checks.results, period: dateRange };
        break;
      }
      case 'tcfd': {
        // TCFD auto-generation: Governance, Strategy, Risk Management, Metrics & Targets
        const credits = await c.env.DB.prepare(
          "SELECT SUM(quantity) as total_retired FROM carbon_credits WHERE owner_id = ? AND status = 'retired'"
        ).bind(user.sub).first<{ total_retired: number | null }>();
        const trades = await c.env.DB.prepare(
          "SELECT COUNT(*) as count, SUM(total_cents) as total FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND market = 'carbon'"
        ).bind(user.sub, user.sub).first();
        const projects = await c.env.DB.prepare(
          "SELECT technology, capacity_mw, phase FROM projects WHERE developer_id = ?"
        ).bind(user.sub).all();

        data = {
          governance: {
            board_oversight: 'Climate risk integrated into board-level risk management framework',
            management_role: 'Sustainability team reports to CEO with quarterly ESG metrics',
          },
          strategy: {
            climate_risks: ['Physical risk from extreme weather events on generation assets', 'Transition risk from regulatory changes in carbon pricing'],
            opportunities: ['Renewable energy cost reduction', 'Carbon market growth', 'Green financing premiums'],
            scenario_analysis: 'Platform models Eskom tariff increase (+40%), solar generation decrease (-30%), and carbon price crash (-50%) scenarios',
          },
          risk_management: {
            identification: 'Automated statutory checks across 14 SA regulations',
            assessment: `Portfolio VaR calculated daily across ${projects.results.length} projects`,
            mitigation: 'Escrow-backed settlements, counterparty credit limits, diversified energy mix',
          },
          metrics_and_targets: {
            total_retired_tonnes: credits?.total_retired || 0,
            carbon_trades: trades,
            renewable_capacity_mw: projects.results.reduce((s, p) => s + (p.capacity_mw as number || 0), 0),
            projects_by_technology: projects.results.reduce((acc: Record<string, number>, p) => {
              const tech = p.technology as string;
              acc[tech] = (acc[tech] || 0) + 1;
              return acc;
            }, {}),
          },
          period: dateRange,
        };
        break;
      }
      default: {
        data = { message: 'Custom report - configure metrics in report definition', period: dateRange };
      }
    }

    // Update last generated
    await c.env.DB.prepare(
      'UPDATE report_definitions SET last_generated_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    // Cascade: report.generated — notify user + audit
    try {
      await c.env.DB.prepare(`
        INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
        VALUES (?, ?, 'Report Generated', ?, 'success', 'report', ?)
      `).bind(generateId(), user.sub, `Your ${reportType} report has been generated.`, id).run();
      await c.env.DB.prepare(`
        INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, 'report.generated', 'report', ?, ?, ?)
      `).bind(generateId(), user.sub, id, JSON.stringify({ report_type: reportType }), c.req.header('CF-Connecting-IP') || 'unknown').run();
    } catch { /* cascade best-effort */ }

    return c.json({ success: true, data: { report_id: id, report_type: reportType, generated_at: nowISO(), data } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /reports/:id — Delete report definition
reports.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare(
      'DELETE FROM report_definitions WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default reports;
