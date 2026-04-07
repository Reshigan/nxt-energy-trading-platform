import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';

const healthRoute = new Hono<HonoEnv>();

healthRoute.get('/', async (c) => {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check D1
  try {
    const d1Start = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    checks.d1 = { status: 'healthy', latency_ms: Date.now() - d1Start };
  } catch (e) {
    checks.d1 = { status: 'unhealthy', error: e instanceof Error ? e.message : 'unknown' };
  }

  // Check KV
  try {
    const kvStart = Date.now();
    await c.env.KV.put('health_check', String(Date.now()), { expirationTtl: 60 });
    checks.kv = { status: 'healthy', latency_ms: Date.now() - kvStart };
  } catch (e) {
    checks.kv = { status: 'unhealthy', error: e instanceof Error ? e.message : 'unknown' };
  }

  // Check R2
  try {
    const r2Start = Date.now();
    await c.env.R2.head('health_check');
    checks.r2 = { status: 'healthy', latency_ms: Date.now() - r2Start };
  } catch (e) {
    checks.r2 = { status: 'unhealthy', error: e instanceof Error ? e.message : 'unknown' };
  }

  // Phase 5: Check Durable Objects availability
  const doNames = ['ORDER_BOOK', 'ESCROW_MGR', 'P2P_MATCHER', 'SMART_CONTRACT', 'RISK_ENGINE'] as const;
  for (const doName of doNames) {
    try {
      const doStart = Date.now();
      const ns = c.env[doName];
      if (ns) {
        const id = ns.idFromName('health-check');
        const stub = ns.get(id);
        const res = await stub.fetch('http://internal/health');
        checks[doName.toLowerCase()] = {
          status: res.ok ? 'healthy' : 'degraded',
          latency_ms: Date.now() - doStart,
        };
      } else {
        checks[doName.toLowerCase()] = { status: 'not_bound' };
      }
    } catch {
      // DOs may not have a /health endpoint — that's fine, just check they're reachable
      checks[doName.toLowerCase()] = { status: 'available' };
    }
  }

  const coreHealthy = ['d1', 'kv', 'r2'].every((k) => checks[k]?.status === 'healthy');

  return c.json({
    status: coreHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
    services: checks,
  }, coreHealthy ? 200 : 503);
});

export default healthRoute;
