import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { hashPassword } from '../utils/hash';
import { authMiddleware } from '../auth/middleware';
import { roleMatches } from '../auth/permissions';

const staff = new Hono<HonoEnv>();

// POST /staff — Create staff account (superadmin only)
staff.post('/', authMiddleware({ roles: ['admin'], adminLevel: 'superadmin' }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      email: string;
      password: string;
      company_name: string;
      admin_level: string;
    };

    if (!body.email || !body.password || !body.company_name || !body.admin_level) {
      return c.json({ success: false, error: 'email, password, company_name, and admin_level are required' }, 400);
    }

    if (!['admin', 'support'].includes(body.admin_level)) {
      return c.json({ success: false, error: 'admin_level must be admin or support' }, 400);
    }

    // Check if email already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM participants WHERE email = ?'
    ).bind(body.email).first();
    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }

    const id = generateId();
    const { hash, salt } = await hashPassword(body.password);
    const now = nowISO();

    await c.env.DB.prepare(`
      INSERT INTO participants (id, email, password_hash, password_salt, role, company_name, kyc_status, admin_level, trading_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', ?, 'verified', ?, 0, ?, ?)
    `).bind(id, body.email, hash, salt, body.company_name, body.admin_level, now, now).run();

    // Audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'create_staff', 'participant', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ email: body.email, admin_level: body.admin_level }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true, data: { id, email: body.email, admin_level: body.admin_level } }, 201);
  } catch {
    return c.json({ success: false, error: 'Failed to create staff account' }, 500);
  }
});

// GET /staff — List all staff members (admin+ only)
staff.get('/', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const results = await c.env.DB.prepare(
      "SELECT id, email, company_name, admin_level, kyc_status, created_at, updated_at FROM participants WHERE admin_level IS NOT NULL ORDER BY created_at DESC"
    ).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: false, error: 'Failed to list staff' }, 500);
  }
});

// PATCH /staff/:id — Update staff level (superadmin only)
staff.patch('/:id', authMiddleware({ roles: ['admin'], adminLevel: 'superadmin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { admin_level: string };

    if (!body.admin_level || !['superadmin', 'admin', 'support'].includes(body.admin_level)) {
      return c.json({ success: false, error: 'admin_level must be superadmin, admin, or support' }, 400);
    }

    // Cannot change own level
    if (id === user.sub) {
      return c.json({ success: false, error: 'Cannot change your own admin level' }, 400);
    }

    const target = await c.env.DB.prepare(
      'SELECT id, admin_level FROM participants WHERE id = ? AND admin_level IS NOT NULL'
    ).bind(id).first<{ id: string; admin_level: string }>();
    if (!target) {
      return c.json({ success: false, error: 'Staff member not found' }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE participants SET admin_level = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(body.admin_level, id).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'update_staff_level', 'participant', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ from: target.admin_level, to: body.admin_level }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update staff level' }, 500);
  }
});

// DELETE /staff/:id/revoke — Revoke staff access (superadmin only)
staff.delete('/:id/revoke', authMiddleware({ roles: ['admin'], adminLevel: 'superadmin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    if (id === user.sub) {
      return c.json({ success: false, error: 'Cannot revoke your own staff access' }, 400);
    }

    const target = await c.env.DB.prepare(
      'SELECT id, email, admin_level FROM participants WHERE id = ? AND admin_level IS NOT NULL'
    ).bind(id).first<{ id: string; email: string; admin_level: string }>();
    if (!target) {
      return c.json({ success: false, error: 'Staff member not found' }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE participants SET admin_level = NULL, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'revoke_staff', 'participant', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ email: target.email, previous_level: target.admin_level }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to revoke staff access' }, 500);
  }
});

// GET /staff/activity — Staff audit log (admin+ only)
staff.get('/activity', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const results = await c.env.DB.prepare(`
      SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at,
             p.email as actor_email, p.admin_level as actor_level
      FROM audit_log al
      LEFT JOIN participants p ON al.actor_id = p.id
      WHERE p.admin_level IS NOT NULL
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch staff activity' }, 500);
  }
});

export default staff;
