import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';

const config = new Hono<HonoEnv>();

// GET /admin/config — List all config (admin+ only)
config.get('/', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT key, value, description, category, updated_by, updated_at FROM platform_config ORDER BY category, key'
    ).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch config' }, 500);
  }
});

// GET /admin/config/:key — Get single config value
config.get('/:key', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { key } = c.req.param();
    const row = await c.env.DB.prepare(
      'SELECT key, value, description, category, updated_by, updated_at FROM platform_config WHERE key = ?'
    ).bind(key).first();

    if (!row) {
      return c.json({ success: false, error: 'Config key not found' }, 404);
    }
    return c.json({ success: true, data: row });
  } catch {
    return c.json({ success: false, error: 'Failed to fetch config' }, 500);
  }
});

// PATCH /admin/config/:key — Update config value (admin+ only)
config.patch('/:key', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { key } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { value: string };

    if (body.value === undefined || body.value === null) {
      return c.json({ success: false, error: 'value is required' }, 400);
    }

    // Verify key exists
    const existing = await c.env.DB.prepare(
      'SELECT key FROM platform_config WHERE key = ?'
    ).bind(key).first();
    if (!existing) {
      return c.json({ success: false, error: 'Config key not found' }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE platform_config SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?"
    ).bind(body.value, user.sub, nowISO(), key).run();

    // Invalidate KV cache
    try {
      await c.env.KV.delete(`config:${key}`);
    } catch {
      // Non-fatal
    }

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update config' }, 500);
  }
});

export default config;
