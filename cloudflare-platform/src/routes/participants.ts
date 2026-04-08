import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';

const participants = new Hono<HonoEnv>();

// GET /participants — List all (admin) or own profile
participants.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');

    if (user.role === 'admin') {
      const { page = '1', limit = '20', status, role } = c.req.query();
      const pg = parsePagination(c.req.query());

      let query = 'SELECT id, company_name, registration_number, role, contact_person, email, phone, kyc_status, trading_enabled, bbbee_level, created_at FROM participants';
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (status) { conditions.push('kyc_status = ?'); params.push(status); }
      if (role) { conditions.push('role = ?'); params.push(role); }

      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(pg.per_page, pg.offset);

      const results = await c.env.DB.prepare(query).bind(...params).all();

      const countQuery = conditions.length > 0
        ? `SELECT COUNT(*) as total FROM participants WHERE ${conditions.join(' AND ')}`
        : 'SELECT COUNT(*) as total FROM participants';
      const countParams = params.slice(0, -2);
      const count = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();

      return c.json({
        success: true,
        data: results.results,
        meta: { page: pg.page, limit: pg.per_page, total: count?.total || 0 },
      });
    }

    // Non-admin: return own profile
    const participant = await c.env.DB.prepare(`
      SELECT id, company_name, registration_number, tax_number, vat_number, role,
        contact_person, email, phone, physical_address, sa_id_number, bbbee_level,
        nersa_licence, fsca_licence, kyc_status, trading_enabled, created_at, updated_at
      FROM participants WHERE id = ?
    `).bind(user.sub).first();

    return c.json({ success: true, data: participant });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /participants/:id — Get specific participant
participants.get('/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    if (user.sub !== id && user.role !== 'admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const participant = await c.env.DB.prepare(`
      SELECT id, company_name, registration_number, tax_number, vat_number, role,
        contact_person, email, phone, physical_address, sa_id_number, bbbee_level,
        nersa_licence, fsca_licence, kyc_status, trading_enabled, created_at, updated_at
      FROM participants WHERE id = ?
    `).bind(id).first();

    if (!participant) {
      return c.json({ success: false, error: 'Participant not found' }, 404);
    }

    return c.json({ success: true, data: participant });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /participants/:id — Update participant
participants.patch('/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    if (user.sub !== id && user.role !== 'admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const body = await c.req.json() as Record<string, unknown>;
    const allowedFields = [
      'company_name', 'contact_person', 'phone', 'physical_address',
      'bbbee_level', 'nersa_licence', 'fsca_licence',
    ];

    // Admin can update more fields
    if (user.role === 'admin') {
      allowedFields.push('role', 'kyc_status', 'trading_enabled', 'vat_number');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE participants SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'update_participant', 'participant', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ fields: Object.keys(body).filter((k) => allowedFields.includes(k)) }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true, message: 'Participant updated' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /participants/:id/suspend — Suspend participant
participants.post('/:id/suspend', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { reason: string };

    if (!body.reason) {
      return c.json({ success: false, error: 'Suspension reason required' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE participants SET kyc_status = 'suspended', trading_enabled = 0, updated_at = ?
      WHERE id = ?
    `).bind(nowISO(), id).run();

    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'suspend_participant', 'participant', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ reason: body.reason }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    await c.env.DB.prepare(`
      INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
      VALUES (?, ?, 'Account Suspended', ?, 'danger', 'participant', ?)
    `).bind(generateId(), id, `Your account has been suspended: ${body.reason}`, id).run();

    return c.json({ success: true, message: 'Participant suspended' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default participants;
