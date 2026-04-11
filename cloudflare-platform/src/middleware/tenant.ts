/**
 * Tenant Middleware — Subdomain-based tenant resolution
 * Maps subdomains to tenant IDs for multi-tenant isolation.
 * e.g., acme.et.vantax.co.za → tenant_id = 'acme'
 */
import { Context, Next } from 'hono';
import { HonoEnv } from '../utils/types';

export interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
  subdomain: string;
}

/**
 * Resolve tenant from request hostname.
 * Pattern: {tenant}.et.vantax.co.za
 * Falls back to 'default' tenant for et.vantax.co.za and localhost.
 */
export function tenantMiddleware() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const host = c.req.header('host') || '';
    let subdomain = 'default';

    // Extract subdomain from host
    // e.g., acme.et.vantax.co.za → acme
    // e.g., et.vantax.co.za → default
    // e.g., localhost:8787 → default
    const parts = host.split('.');
    if (parts.length > 3 && host.includes('et.vantax.co.za')) {
      subdomain = parts[0];
    }

    // Look up tenant in KV
    const tenantData = await c.env.KV.get(`tenant:${subdomain}`);
    const tenant: TenantInfo = tenantData
      ? JSON.parse(tenantData)
      : { tenant_id: 'default', tenant_name: 'NXT Energy', subdomain: 'default' };

    // Set tenant info on context for downstream handlers
    c.set('tenant' as never, tenant as never);

    await next();
  };
}
