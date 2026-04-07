import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';

const healthRoute = new Hono<HonoEnv>();

healthRoute.get('/', async (c) => {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // Check D1
  try {
    const d1Start = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    checks.d1 = { status: 'healthy', latency_ms: Date.now() - d1Start };
  } catch {
    checks.d1 = { status: 'unhealthy' };
  }

  // Check KV
  try {
    const kvStart = Date.now();
    await c.env.KV.put('health_check', String(Date.now()), { expirationTtl: 60 });
    checks.kv = { status: 'healthy', latency_ms: Date.now() - kvStart };
  } catch {
    checks.kv = { status: 'unhealthy' };
  }

  // Check R2
  try {
    const r2Start = Date.now();
    await c.env.R2.head('health_check');
    checks.r2 = { status: 'healthy', latency_ms: Date.now() - r2Start };
  } catch {
    checks.r2 = { status: 'unhealthy' };
  }

  const allHealthy = Object.values(checks).every(ch => ch.status === 'healthy');

  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: checks,
  }, allHealthy ? 200 : 503);
});

export default healthRoute;
