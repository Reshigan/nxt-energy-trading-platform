import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';

const modules = new Hono<HonoEnv>();

// GET /modules/status — Get all modules with their enabled state (auth required)
modules.get('/status', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const tenantId = c.req.header('X-Tenant-Id') || 'default';

    const global = await c.env.DB.prepare(
      'SELECT id, name, display_name, description, category, enabled_global, icon, sort_order, min_subscription_tier, config FROM platform_modules ORDER BY sort_order'
    ).all();

    // Get tenant overrides if applicable
    let tenantOverrides: Record<string, boolean> = {};
    if (tenantId !== 'default') {
      const tenant = await c.env.DB.prepare(
        'SELECT pm.name, tm.enabled FROM tenant_modules tm JOIN platform_modules pm ON tm.module_id = pm.id WHERE tm.tenant_id = ?'
      ).bind(tenantId).all();
      for (const mod of tenant.results) {
        tenantOverrides[mod.name as string] = !!(mod.enabled);
      }
    }

    const data = global.results.map((mod) => ({
      id: mod.id,
      name: mod.name,
      display_name: mod.display_name,
      description: mod.description,
      category: mod.category,
      enabled: tenantOverrides[mod.name as string] ?? !!(mod.enabled_global),
      icon: mod.icon,
      sort_order: mod.sort_order,
      min_subscription_tier: mod.min_subscription_tier,
      config: mod.config ? JSON.parse(mod.config as string) : {},
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Module status error:', err);
    return c.json({ success: false, error: 'Failed to load module status' }, 500);
  }
});

// POST /modules/:id/toggle — Admin toggle module on/off
modules.post('/:id/toggle', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json() as { enabled: boolean };

  const mod = await c.env.DB.prepare('SELECT id, name, category FROM platform_modules WHERE id = ?').bind(id).first();
  if (!mod) return c.json({ success: false, error: 'Module not found' }, 404);

  // Core modules cannot be disabled
  if (mod.category === 'core' && !body.enabled) {
    return c.json({ success: false, error: 'Core modules cannot be disabled' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE platform_modules SET enabled_global = ? WHERE id = ?'
  ).bind(body.enabled ? 1 : 0, id).run();

  // Invalidate module cache for all tenants
  try {
    await c.env.KV.delete('modules:default');
  } catch { /* non-critical */ }

  // Audit log
  await c.env.DB.prepare(
    `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, 'module_toggle', 'module', ?, ?, ?)`
  ).bind(
    generateId(), c.get('user').sub, id,
    JSON.stringify({ module: mod.name, enabled: body.enabled }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, message: `Module ${body.enabled ? 'enabled' : 'disabled'}` });
});

// POST /modules/:id/tenant-toggle — Admin toggle module for a specific tenant
modules.post('/:id/tenant-toggle', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json() as { tenant_id: string; enabled: boolean };

  const mod = await c.env.DB.prepare('SELECT id, category FROM platform_modules WHERE id = ?').bind(id).first();
  if (!mod) return c.json({ success: false, error: 'Module not found' }, 404);

  if (mod.category === 'core' && !body.enabled) {
    return c.json({ success: false, error: 'Core modules cannot be disabled' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM tenant_modules WHERE tenant_id = ? AND module_id = ?'
  ).bind(body.tenant_id, id).first();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE tenant_modules SET enabled = ?, activated_at = CASE WHEN ? = 1 THEN ? ELSE activated_at END, deactivated_at = CASE WHEN ? = 0 THEN ? ELSE deactivated_at END WHERE id = ?'
    ).bind(body.enabled ? 1 : 0, body.enabled ? 1 : 0, nowISO(), body.enabled ? 1 : 0, nowISO(), existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO tenant_modules (id, tenant_id, module_id, enabled, activated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), body.tenant_id, id, body.enabled ? 1 : 0, nowISO()).run();
  }

  // Invalidate tenant module cache
  try {
    await c.env.KV.delete(`modules:${body.tenant_id}`);
  } catch { /* non-critical */ }

  return c.json({ success: true });
});

// GET /modules/categories — Get module categories with counts
modules.get('/categories', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const categories = await c.env.DB.prepare(
      'SELECT category, COUNT(*) as count, SUM(CASE WHEN enabled_global = 1 THEN 1 ELSE 0 END) as enabled_count FROM platform_modules GROUP BY category ORDER BY MIN(sort_order)'
    ).all();
    return c.json({ success: true, data: categories.results });
  } catch (err) {
    console.error('Module categories error:', err);
    return c.json({ success: false, error: 'Failed to load categories' }, 500);
  }
});

export default modules;
