import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { runAMLChecks } from '../integrations/aml-engine';

const aml = new Hono<HonoEnv>();

// GET /aml/alerts — List AML alerts (admin only)
aml.get('/alerts', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const status = c.req.query('status');
    const severity = c.req.query('severity');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    let query = `SELECT a.*, p.email as participant_email, p.company_name
      FROM aml_alerts a
      LEFT JOIN participants p ON a.participant_id = p.id
      WHERE 1=1`;
    const binds: unknown[] = [];

    if (status) { query += ' AND a.status = ?'; binds.push(status); }
    if (severity) { query += ' AND a.severity = ?'; binds.push(severity); }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const results = await c.env.DB.prepare(query).bind(...binds).all();

    const counts = await c.env.DB.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('open','investigating')) as critical_count,
        COUNT(*) as total
      FROM aml_alerts
    `).first<{ open_count: number; critical_count: number; total: number }>();

    return c.json({
      success: true,
      data: results.results,
      meta: {
        open: counts?.open_count ?? 0,
        critical: counts?.critical_count ?? 0,
        total: counts?.total ?? 0,
      },
    });
  } catch {
    return c.json({ success: false, error: 'Failed to list AML alerts' }, 500);
  }
});

// GET /aml/alerts/:id — Alert detail
aml.get('/alerts/:id', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const alert = await c.env.DB.prepare(`
      SELECT a.*, p.email as participant_email, p.company_name
      FROM aml_alerts a
      LEFT JOIN participants p ON a.participant_id = p.id
      WHERE a.id = ?
    `).bind(id).first();

    if (!alert) return c.json({ success: false, error: 'Alert not found' }, 404);
    return c.json({ success: true, data: alert });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch alert' }, 500);
  }
});

// PATCH /aml/alerts/:id — Update alert status/assignment
aml.patch('/alerts/:id', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as {
      status?: string;
      assigned_to?: string;
      resolution_notes?: string;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.status) {
      if (!['open', 'investigating', 'escalated', 'resolved', 'false_positive', 'dismissed'].includes(body.status)) {
        return c.json({ success: false, error: 'Invalid status' }, 400);
      }
      updates.push('status = ?');
      values.push(body.status);
      if (body.status === 'resolved' || body.status === 'false_positive') {
        updates.push("resolved_at = datetime('now')");
      }
    }
    if (body.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(body.assigned_to || null);
    }
    if (body.resolution_notes !== undefined) {
      updates.push('resolution_notes = ?');
      values.push(body.resolution_notes);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    values.push(id);
    await c.env.DB.prepare(
      `UPDATE aml_alerts SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?,?,'update_aml_alert','aml_alert',?,?,?)
    `).bind(
      generateId(), user.sub, id, JSON.stringify(body),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update alert' }, 500);
  }
});

// POST /aml/scan/:participantId — Trigger AML scan for a participant
aml.post('/scan/:participantId', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { participantId } = c.req.param();
    const alertsCreated = await runAMLChecks(c.env, participantId);
    return c.json({ success: true, data: { alerts_created: alertsCreated } });
  } catch {
    return c.json({ success: false, error: 'Failed to run AML scan' }, 500);
  }
});

// GET /aml/rules — List AML rules (admin only)
aml.get('/rules', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const results = await c.env.DB.prepare('SELECT * FROM aml_rules ORDER BY rule_name').all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: false, error: 'Failed to list AML rules' }, 500);
  }
});

// PATCH /aml/rules/:id — Toggle or update AML rule
aml.patch('/rules/:id', authMiddleware({ roles: ['admin'], adminLevel: 'superadmin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json() as { active?: boolean; enabled?: boolean; parameters?: string };

    const updates: string[] = [];
    const values: unknown[] = [];

    // Support both 'active' and 'enabled' field names from frontend
    const activeValue = body.active ?? body.enabled;
    if (activeValue !== undefined) {
      updates.push('active = ?');
      values.push(activeValue ? 1 : 0);
    }
    if (body.parameters !== undefined) {
      updates.push('parameters = ?');
      values.push(body.parameters);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    values.push(id);
    await c.env.DB.prepare(
      `UPDATE aml_rules SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update AML rule' }, 500);
  }
});

export default aml;
