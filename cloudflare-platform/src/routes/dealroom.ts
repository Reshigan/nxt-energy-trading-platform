/**
 * 3.2 Collaborative Deal Room — Real-time negotiation workspace
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes, parsePagination, paginatedResponse } from '../utils/pagination';

const dealroom = new Hono<HonoEnv>();
dealroom.use('*', authMiddleware());

// POST /dealroom — Create a deal room for a contract
dealroom.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{ contract_id: string }>();

    const contract = await c.env.DB.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(body.contract_id).first();
    if (!contract) return c.json({ success: false, error: 'Contract not found' }, 404);

    const id = generateId();
    await c.env.DB.prepare(
      "INSERT INTO deal_rooms (id, contract_id, created_by, status) VALUES (?, ?, ?, 'active')"
    ).bind(id, body.contract_id, user.sub).run();

    // System message
    await c.env.DB.prepare(
      "INSERT INTO deal_room_messages (id, room_id, participant_id, message_type, content) VALUES (?, ?, ?, 'system', ?)"
    ).bind(generateId(), id, user.sub, `Deal room created by ${user.company_name} for contract ${body.contract_id}`).run();

    return c.json({ success: true, data: { id, contract_id: body.contract_id, status: 'active' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create deal room'), 500);
  }
});

// GET /dealroom — List deal rooms I'm involved in
dealroom.get('/', async (c) => {
  try {
    const user = c.get('user');
    const { per_page: limit, offset } = parsePagination(c.req.query());

    const results = await c.env.DB.prepare(
      `SELECT dr.*, cd.document_type, cd.counterparty_name, p.company_name as created_by_name
       FROM deal_rooms dr
       JOIN contract_documents cd ON dr.contract_id = cd.id
       JOIN participants p ON dr.created_by = p.id
       WHERE dr.created_by = ? OR cd.participant_id = ? OR cd.counterparty_id = ?
       ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`
    ).bind(user.sub, user.sub, user.sub, limit, offset).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list deal rooms'), 500);
  }
});

// GET /dealroom/:id — Get deal room with messages
dealroom.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const room = await c.env.DB.prepare(
      `SELECT dr.*, cd.document_type, cd.counterparty_name, cd.total_value_cents
       FROM deal_rooms dr JOIN contract_documents cd ON dr.contract_id = cd.id WHERE dr.id = ?`
    ).bind(id).first();
    if (!room) return c.json({ success: false, error: 'Deal room not found' }, 404);

    const messages = await c.env.DB.prepare(
      `SELECT m.*, p.company_name as sender_name FROM deal_room_messages m
       JOIN participants p ON m.participant_id = p.id
       WHERE m.room_id = ? ORDER BY m.created_at ASC`
    ).bind(id).all();

    return c.json({ success: true, data: { room, messages: messages.results } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get deal room'), 500);
  }
});

// POST /dealroom/:id/message — Send a message or proposal
dealroom.post('/:id/message', async (c) => {
  try {
    const roomId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json<{
      message_type?: string; content: string;
      field_changes?: Record<string, { old: string | number; new: string | number }>;
    }>();

    const msgId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO deal_room_messages (id, room_id, participant_id, message_type, content, field_changes) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      msgId, roomId, user.sub,
      body.message_type || 'text', body.content,
      body.field_changes ? JSON.stringify(body.field_changes) : null
    ).run();

    // If it's an accept, update deal room status
    if (body.message_type === 'accept') {
      await c.env.DB.prepare("UPDATE deal_rooms SET status = 'completed' WHERE id = ?").bind(roomId).run();
    }

    return c.json({ success: true, data: { id: msgId, room_id: roomId, message_type: body.message_type || 'text' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send message'), 500);
  }
});

// POST /dealroom/:id/propose — Propose term changes
dealroom.post('/:id/propose', async (c) => {
  try {
    const roomId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json<{
      changes: Record<string, { old: string | number; new: string | number }>;
      notes?: string;
    }>();

    const msgId = generateId();
    const changesSummary = Object.entries(body.changes).map(([k, v]) => `${k}: ${v.old} → ${v.new}`).join(', ');

    await c.env.DB.prepare(
      "INSERT INTO deal_room_messages (id, room_id, participant_id, message_type, content, field_changes) VALUES (?, ?, ?, 'proposal', ?, ?)"
    ).bind(msgId, roomId, user.sub, body.notes || `Proposed changes: ${changesSummary}`, JSON.stringify(body.changes)).run();

    return c.json({ success: true, data: { id: msgId, changes: body.changes } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to propose changes'), 500);
  }
});

// POST /dealroom/:id/close — Close deal room
dealroom.post('/:id/close', async (c) => {
  try {
    const roomId = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare("UPDATE deal_rooms SET status = 'completed' WHERE id = ?").bind(roomId).run();
    await c.env.DB.prepare(
      "INSERT INTO deal_room_messages (id, room_id, participant_id, message_type, content) VALUES (?, ?, ?, 'system', 'Deal room closed')"
    ).bind(generateId(), roomId, user.sub).run();
    return c.json({ success: true, data: { id: roomId, status: 'completed' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to close deal room'), 500);
  }
});

export default dealroom;
