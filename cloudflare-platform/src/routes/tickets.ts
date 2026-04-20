import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { roleMatches } from '../auth/permissions';

const tickets = new Hono<HonoEnv>();

// POST /tickets — User creates a support ticket
tickets.post('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      category: string;
      subject: string;
      description: string;
      priority?: string;
    };

    if (!body.subject || !body.description) {
      return c.json({ success: false, error: 'subject and description are required' }, 400);
    }

    const id = generateId();
    const now = nowISO();
    const category = body.category || 'general';
    const priority = body.priority || 'medium';

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (id, participant_id, category, subject, description, status, priority, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).bind(id, user.sub, category, body.subject, body.description, priority, now, now).run();

    return c.json({ success: true, data: { id, status: 'open' } }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to create ticket' }, 500);
  }
});

// GET /tickets — List tickets (filtered by role: users see own, staff see all)
tickets.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const isStaff = !!user.admin_level;

    let query: string;
    const binds: unknown[] = [];

    if (isStaff) {
      query = 'SELECT t.*, p.email as participant_email, p.company_name FROM support_tickets t LEFT JOIN participants p ON t.participant_id = p.id';
      if (status) {
        query += ' WHERE t.status = ?';
        binds.push(status);
      }
    } else {
      query = 'SELECT * FROM support_tickets WHERE participant_id = ?';
      binds.push(user.sub);
      if (status) {
        query += ' AND status = ?';
        binds.push(status);
      }
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const results = await c.env.DB.prepare(query).bind(...binds).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to list tickets' }, 500);
  }
});

// GET /tickets/stats — Ticket statistics (staff only)
tickets.get('/stats', authMiddleware({ roles: ['admin'], adminLevel: 'support' }), async (c) => {
  try {
    const [open, inProgress, resolved, total] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in_progress'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets").first<{ count: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        open: open?.count ?? 0,
        in_progress: inProgress?.count ?? 0,
        resolved: resolved?.count ?? 0,
        total: total?.count ?? 0,
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to fetch ticket stats' }, 500);
  }
});

// GET /tickets/:id — Ticket detail with messages
tickets.get('/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const isStaff = !!user.admin_level;

    const ticket = await c.env.DB.prepare(
      'SELECT t.*, p.email as participant_email, p.company_name FROM support_tickets t LEFT JOIN participants p ON t.participant_id = p.id WHERE t.id = ?'
    ).bind(id).first();

    if (!ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    // Non-staff can only see their own tickets
    if (!isStaff && ticket.participant_id !== user.sub) {
      return c.json({ success: false, error: 'Not authorized' }, 403);
    }

    // Fetch messages (hide internal notes from non-staff)
    let messagesQuery = 'SELECT tm.*, p.email as sender_email FROM ticket_messages tm LEFT JOIN participants p ON tm.sender_id = p.id WHERE tm.ticket_id = ?';
    if (!isStaff) {
      messagesQuery += ' AND tm.is_internal_note = 0';
    }
    messagesQuery += ' ORDER BY tm.created_at ASC';

    const messages = await c.env.DB.prepare(messagesQuery).bind(id).all();

    return c.json({ success: true, data: { ...ticket, messages: messages.results } });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to fetch ticket' }, 500);
  }
});

// POST /tickets/:id/messages — Add message to ticket
tickets.post('/:id/messages', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { message: string; is_internal_note?: boolean };

    if (!body.message) {
      return c.json({ success: false, error: 'message is required' }, 400);
    }

    const isStaff = !!user.admin_level;

    // Verify ticket exists and user has access
    const ticket = await c.env.DB.prepare(
      'SELECT id, participant_id, status FROM support_tickets WHERE id = ?'
    ).bind(id).first<{ id: string; participant_id: string; status: string }>();

    if (!ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }
    if (!isStaff && ticket.participant_id !== user.sub) {
      return c.json({ success: false, error: 'Not authorized' }, 403);
    }

    // Only staff can add internal notes
    const isInternalNote = isStaff && body.is_internal_note ? 1 : 0;

    const msgId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, sender_id, message, is_internal_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(msgId, id, user.sub, body.message, isInternalNote, nowISO()).run();

    // Update ticket's updated_at
    await c.env.DB.prepare(
      "UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    return c.json({ success: true, data: { id: msgId } }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to add message' }, 500);
  }
});

// PATCH /tickets/:id — Update ticket status/assignment (staff only)
tickets.patch('/:id', authMiddleware({ roles: ['admin'], adminLevel: 'support' }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { status?: string; assigned_to?: string; priority?: string };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
        return c.json({ success: false, error: 'Invalid status' }, 400);
      }
      updates.push('status = ?');
      values.push(body.status);
      if (body.status === 'resolved') {
        updates.push("resolved_at = datetime('now')");
      }
    }
    if (body.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(body.assigned_to || null);
    }
    if (body.priority) {
      updates.push('priority = ?');
      values.push(body.priority);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'update_ticket', 'support_ticket', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify(body),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to update ticket' }, 500);
  }
});

export default tickets;
