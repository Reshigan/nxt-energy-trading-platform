import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';

const announcements = new Hono<HonoEnv>();

// GET /announcements — Active announcements (any authenticated user)
announcements.get('/', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const now = nowISO();
    const results = await c.env.DB.prepare(`
      SELECT id, title, body, type, starts_at, expires_at, created_at
      FROM announcements
      WHERE active = 1
        AND (starts_at IS NULL OR starts_at <= ?)
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC
    `).bind(now, now).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error(err);
    return c.json({ success: true, data: [] });
  }
});

// POST /admin/announcements — Create announcement (admin+ only)
announcements.post('/admin', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      title: string;
      body: string;
      type?: string;
      starts_at?: string;
      expires_at?: string;
    };

    if (!body.title || !body.body) {
      return c.json({ success: false, error: 'title and body are required' }, 400);
    }

    const id = generateId();
    const type = body.type || 'info';

    await c.env.DB.prepare(`
      INSERT INTO announcements (id, title, body, type, active, starts_at, expires_at, created_by, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).bind(id, body.title, body.body, type, body.starts_at ?? null, body.expires_at ?? null, user.sub, nowISO()).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to create announcement' }, 500);
  }
});

// PATCH /admin/announcements/:id — Update announcement (admin+ only)
announcements.patch('/admin/:id', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json() as {
      title?: string;
      body?: string;
      type?: string;
      active?: boolean;
      starts_at?: string;
      expires_at?: string;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.body !== undefined) { updates.push('body = ?'); values.push(body.body); }
    if (body.type !== undefined) { updates.push('type = ?'); values.push(body.type); }
    if (body.active !== undefined) { updates.push('active = ?'); values.push(body.active ? 1 : 0); }
    if (body.starts_at !== undefined) { updates.push('starts_at = ?'); values.push(body.starts_at); }
    if (body.expires_at !== undefined) { updates.push('expires_at = ?'); values.push(body.expires_at); }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    values.push(id);
    await c.env.DB.prepare(
      `UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to update announcement' }, 500);
  }
});

// DELETE /admin/announcements/:id — Delete announcement (superadmin only)
announcements.delete('/admin/:id', authMiddleware({ roles: ['admin'], adminLevel: 'superadmin' }), async (c) => {
  try {
    const { id } = c.req.param();
    await c.env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to delete announcement' }, 500);
  }
});

export default announcements;
