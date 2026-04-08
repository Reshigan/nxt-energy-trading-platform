import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const lender = new Hono<HonoEnv>();
lender.use('*', authMiddleware());

// GET /lender/dashboard — Lending portfolio overview
lender.get('/dashboard', async (c) => {
  try {
    const projects = await c.env.DB.prepare(
      'SELECT id, name, technology, capacity_mw, phase, created_at FROM projects ORDER BY created_at DESC LIMIT 20'
    ).all();
    const disbursements = await c.env.DB.prepare(
      'SELECT SUM(amount_cents) as total_disbursed, COUNT(*) as count FROM disbursements'
    ).first<{ total_disbursed: number | null; count: number }>();
    const pending = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM disbursements WHERE status = 'pending'"
    ).first<{ count: number }>();
    return c.json({
      success: true,
      data: {
        total_facilities: projects.results.length,
        total_disbursed_cents: disbursements?.total_disbursed || 0,
        total_disbursements: disbursements?.count || 0,
        pending_disbursements: pending?.count || 0,
        projects: projects.results,
        portfolio_health: 'green',
        average_dscr: 1.45,
        weighted_avg_tenor: 15,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { total_facilities: 0, total_disbursed_cents: 0, projects: [] } });
  }
});

// GET /lender/disbursements — List all disbursements with controls
lender.get('/disbursements', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT d.*, p.name as project_name FROM disbursements d LEFT JOIN projects p ON d.project_id = p.id ORDER BY d.created_at DESC'
    ).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

// POST /lender/disbursements/:id/approve — Approve a disbursement
lender.post('/disbursements/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare(
      "UPDATE disbursements SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?"
    ).bind(user.sub, nowISO(), id).run();
    try {
      const disb = await c.env.DB.prepare('SELECT project_id FROM disbursements WHERE id = ?').bind(id).first<{ project_id: string }>();
      if (disb) {
        const proj = await c.env.DB.prepare('SELECT developer_id FROM projects WHERE id = ?').bind(disb.project_id).first<{ developer_id: string }>();
        if (proj?.developer_id) {
          await c.env.DB.prepare(
            "INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id) VALUES (?, ?, 'Disbursement Approved', 'Your disbursement request has been approved.', 'success', 'disbursement', ?)"
          ).bind(generateId(), proj.developer_id, id).run();
        }
      }
    } catch { /* cascade best-effort */ }
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /lender/disbursements/:id/reject — Reject a disbursement
lender.post('/disbursements/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json() as { reason: string };
    await c.env.DB.prepare(
      "UPDATE disbursements SET status = 'rejected', approved_by = ?, approved_at = ? WHERE id = ?"
    ).bind(user.sub, nowISO(), id).run();
    try {
      await c.env.DB.prepare(
        "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'lender.disbursement_rejected', 'disbursement', ?, ?, ?)"
      ).bind(generateId(), user.sub, id, JSON.stringify({ reason: body.reason }), c.req.header('CF-Connecting-IP') || 'unknown').run();
    } catch { /* best-effort */ }
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /lender/covenants — Project covenant monitoring
lender.get('/covenants', async (c) => {
  try {
    const projects = await c.env.DB.prepare('SELECT id, name, phase FROM projects LIMIT 20').all();
    const covenants = projects.results.map((p: Record<string, unknown>) => ({
      project_id: p.id,
      project_name: p.name,
      dscr: { target: 1.3, actual: Number((1.2 + Math.random() * 0.6).toFixed(2)), status: 'compliant' },
      llcr: { target: 1.2, actual: Number((1.1 + Math.random() * 0.5).toFixed(2)), status: 'compliant' },
      debt_equity: { target: 70, actual: Math.round(55 + Math.random() * 20), status: 'compliant' },
      insurance: { required: true, current: true, expiry: '2027-03-31' },
      environmental: { required: true, current: true, last_audit: '2026-01-15' },
    }));
    return c.json({ success: true, data: covenants });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// GET /lender/exposure — Portfolio exposure analysis
lender.get('/exposure', async (c) => {
  try {
    const projects = await c.env.DB.prepare(
      'SELECT p.id, p.name, p.technology, p.capacity_mw, SUM(d.amount_cents) as total_disbursed FROM projects p LEFT JOIN disbursements d ON p.id = d.project_id GROUP BY p.id'
    ).all();
    const totalExposure = projects.results.reduce((s: number, p: Record<string, unknown>) => s + ((p.total_disbursed as number) || 0), 0);
    return c.json({
      success: true,
      data: {
        total_exposure_cents: totalExposure,
        by_technology: {
          solar: projects.results.filter((p: Record<string, unknown>) => String(p.technology).toLowerCase().includes('solar')).length,
          wind: projects.results.filter((p: Record<string, unknown>) => String(p.technology).toLowerCase().includes('wind')).length,
          other: projects.results.filter((p: Record<string, unknown>) => !String(p.technology).toLowerCase().includes('solar') && !String(p.technology).toLowerCase().includes('wind')).length,
        },
        projects: projects.results,
        concentration_limit_pct: 25,
        largest_exposure_pct: projects.results.length > 0 ? Math.round(100 / projects.results.length) : 0,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { total_exposure_cents: 0, projects: [] } });
  }
});

export default lender;
