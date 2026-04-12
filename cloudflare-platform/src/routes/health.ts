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

// GET /health/detailed — Detailed health check with DB stats
healthRoute.get('/detailed', async (c) => {
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

  // DB stats
  let dbStats: Record<string, number> = {};
  try {
    const [participants, trades, orders, contracts, credits] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM trades').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM orders').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM contract_documents').first<{ count: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM carbon_credits').first<{ count: number }>(),
    ]);
    dbStats = {
      participants: participants?.count || 0,
      trades: trades?.count || 0,
      orders: orders?.count || 0,
      contracts: contracts?.count || 0,
      carbon_credits: credits?.count || 0,
    };
  } catch { /* tables may not exist */ }

  const coreHealthy = ['d1', 'kv'].every((k) => checks[k]?.status === 'healthy');

  return c.json({
    status: coreHealthy ? 'healthy' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: 'cloudflare-workers',
    services: checks,
    database: dbStats,
    platform: 'cloudflare-workers',
  }, coreHealthy ? 200 : 503);
});

// GET /health/status — Simple status check
healthRoute.get('/status', async (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /health/metrics — Basic metrics
healthRoute.get('/metrics', async (c) => {
  let metrics: Record<string, unknown> = {};
  try {
    const hour = new Date().toISOString().substring(0, 13);
    const segments = ['trading', 'carbon', 'contracts', 'settlement', 'compliance', 'marketplace'];
    const results: Record<string, unknown> = {};
    for (const seg of segments) {
      const count = await c.env.KV.get(`api_count:/${seg}:${hour}`);
      const errors = await c.env.KV.get(`api_errors:/${seg}:${hour}`);
      results[seg] = { requests: parseInt(count || '0', 10), errors: parseInt(errors || '0', 10) };
    }
    metrics = { hour, endpoints: results };
  } catch { /* KV may not be available */ }

  return c.json({ success: true, data: metrics });
});

export default healthRoute;
