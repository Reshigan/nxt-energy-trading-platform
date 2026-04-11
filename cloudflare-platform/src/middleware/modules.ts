import { Context, Next } from 'hono';
import { HonoEnv } from '../utils/types';

const MODULE_CACHE_TTL = 300; // 5 minutes

/**
 * Middleware that gates routes behind module feature flags.
 * Checks KV cache first (5-min TTL), then falls back to D1.
 * Returns 403 with MODULE_DISABLED code if module is not enabled.
 */
export function requireModule(moduleName: string) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const tenantId = (c.req.header('X-Tenant-Id') || 'default');
    const cacheKey = `modules:${tenantId}`;

    // Check KV cache first
    let modules: Record<string, boolean> | null = null;
    try {
      const cached = await c.env.KV.get(cacheKey);
      if (cached) modules = JSON.parse(cached);
    } catch { /* cache miss */ }

    if (!modules) {
      // Load from D1
      const global = await c.env.DB.prepare(
        'SELECT name, enabled_global FROM platform_modules'
      ).all();

      modules = {};
      for (const mod of global.results) {
        modules[mod.name as string] = !!(mod.enabled_global);
      }

      // Override with tenant-specific settings
      if (tenantId !== 'default') {
        const tenant = await c.env.DB.prepare(
          'SELECT pm.name, tm.enabled FROM tenant_modules tm JOIN platform_modules pm ON tm.module_id = pm.id WHERE tm.tenant_id = ?'
        ).bind(tenantId).all();

        for (const mod of tenant.results) {
          modules[mod.name as string] = !!(mod.enabled);
        }
      }

      // Cache for 5 minutes
      try {
        await c.env.KV.put(cacheKey, JSON.stringify(modules), { expirationTtl: MODULE_CACHE_TTL });
      } catch { /* non-critical */ }
    }

    if (!modules[moduleName]) {
      return c.json({
        success: false,
        error: `Module "${moduleName}" is not enabled`,
        code: 'MODULE_DISABLED',
        module: moduleName,
      }, 403);
    }

    await next();
  };
}
