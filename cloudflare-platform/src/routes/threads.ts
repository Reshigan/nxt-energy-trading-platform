import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';

const threads = new Hono<HonoEnv>();
threads.use('*', authMiddleware());

// Helper: check if user has access to an entity
async function checkEntityAccess(db: D1Database, entityType: string, entityId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true;
  if (entityType === 'contract') {
    const doc = await db.prepare('SELECT id FROM contract_documents WHERE id = ? AND (creator_id = ? OR counterparty_id = ?)').bind(entityId, userId, userId).first();
    return !!doc;
  } else if (entityType === 'trade') {
    const trade = await db.prepare('SELECT id FROM trades WHERE id = ? AND (buyer_id = ? OR seller_id = ?)').bind(entityId, userId, userId).first();
    return !!trade;
  } else if (entityType === 'project') {
    const project = await db.prepare('SELECT id FROM projects WHERE id = ? AND (developer_id = ? OR lender_id = ? OR grid_operator_id = ? OR offtaker_id = ?)').bind(entityId, userId, userId, userId, userId).first();
    return !!project;
  }
  return false;
}

// GET /threads/:entityType/:entityId — Get all comments for an entity (threaded)
threads.get('/:entityType/:entityId', async (c) => {
  try {
    const { entityType, entityId } = c.req.param();
    const user = c.get('user');
    const hasAccess = await checkEntityAccess(c.env.DB, entityType, entityId, user.sub, user.role);
    if (!hasAccess) return c.json({ success: false, error: 'Access denied' }, 403);
    const results = await c.env.DB.prepare(
      'SELECT t.*, p.company_name, p.email FROM entity_threads t LEFT JOIN participants p ON t.participant_id = p.id WHERE t.entity_type = ? AND t.entity_id = ? ORDER BY t.created_at ASC'
    ).bind(entityType, entityId).all();
    // Build threaded structure
    const topLevel = (results.results || []).filter((r: Record<string, unknown>) => !r.parent_id);
    const replies = (results.results || []).filter((r: Record<string, unknown>) => r.parent_id);
    const threaded = topLevel.map((t: Record<string, unknown>) => ({
      ...t,
      replies: replies.filter((r: Record<string, unknown>) => r.parent_id === t.id),
    }));
    return c.json({ success: true, data: threaded });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// POST /threads/:entityType/:entityId — Add comment
threads.post('/:entityType/:entityId', async (c) => {
  try {
    const { entityType, entityId } = c.req.param();
    const user = c.get('user');
    const hasAccess = await checkEntityAccess(c.env.DB, entityType, entityId, user.sub, user.role);
    if (!hasAccess) return c.json({ success: false, error: 'Access denied' }, 403);
    const body = await c.req.json() as { message: string; message_type?: string; attachment_r2_key?: string; attachment_name?: string };
    if (!body.message?.trim()) return c.json({ success: false, error: 'Message required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO entity_threads (id, entity_type, entity_id, participant_id, message, message_type, attachment_r2_key, attachment_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, entityType, entityId, user.sub, body.message, body.message_type || 'comment', body.attachment_r2_key || null, body.attachment_name || null).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to add comment' }, 500);
  }
});

// POST /threads/:id/reply — Reply to a specific comment
threads.post('/:id/reply', async (c) => {
  try {
    const parentId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json() as { message: string; message_type?: string };
    if (!body.message?.trim()) return c.json({ success: false, error: 'Message required' }, 400);
    // Get parent to inherit entity_type/entity_id
    const parent = await c.env.DB.prepare('SELECT entity_type, entity_id FROM entity_threads WHERE id = ?').bind(parentId).first<{ entity_type: string; entity_id: string }>();
    if (!parent) return c.json({ success: false, error: 'Parent comment not found' }, 404);
    const hasAccess = await checkEntityAccess(c.env.DB, parent.entity_type, parent.entity_id, user.sub, user.role);
    if (!hasAccess) return c.json({ success: false, error: 'Access denied' }, 403);
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO entity_threads (id, entity_type, entity_id, participant_id, message, message_type, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, parent.entity_type, parent.entity_id, user.sub, body.message, body.message_type || 'comment', parentId).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to reply' }, 500);
  }
});

// POST /threads/:id/read — Mark as read
threads.post('/:id/read', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const thread = await c.env.DB.prepare('SELECT read_by FROM entity_threads WHERE id = ?').bind(id).first<{ read_by: string }>();
    if (!thread) return c.json({ success: false, error: 'Not found' }, 404);
    const readBy: string[] = JSON.parse(thread.read_by || '[]');
    if (!readBy.includes(user.sub)) {
      readBy.push(user.sub);
      await c.env.DB.prepare('UPDATE entity_threads SET read_by = ? WHERE id = ?').bind(JSON.stringify(readBy), id).run();
    }
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to mark read' }, 500);
  }
});

// GET /threads/unread — Count of unread comments across all my entities
threads.get('/unread/count', async (c) => {
  try {
    const user = c.get('user');
    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM entity_threads t
       WHERE t.read_by NOT LIKE ? AND t.participant_id != ?
       AND (
         t.entity_type = 'contract' AND t.entity_id IN (
           SELECT id FROM contract_documents WHERE creator_id = ? OR counterparty_id = ?
         )
         OR t.entity_type = 'trade' AND t.entity_id IN (
           SELECT id FROM trades WHERE buyer_id = ? OR seller_id = ?
         )
         OR t.entity_type = 'project' AND t.entity_id IN (
           SELECT id FROM projects WHERE developer_id = ?
         )
       )`
    ).bind(`%${user.sub}%`, user.sub, user.sub, user.sub, user.sub, user.sub, user.sub).first<{ count: number }>();
    return c.json({ success: true, data: { unread: result?.count || 0 } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { unread: 0 } });
  }
});

export default threads;
