// Health endpoint — Spec 8 Section 7.3
import { Env } from '../utils/types';

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};
  const start = Date.now();

  // Check D1
  try {
    const d1Start = Date.now();
    await env.DB.prepare('SELECT 1').first();
    checks.d1 = { status: 'healthy', latency_ms: Date.now() - d1Start };
  } catch {
    checks.d1 = { status: 'unhealthy' };
  }

  // Check KV
  try {
    const kvStart = Date.now();
    await env.KV.put('health_check', String(Date.now()), { expirationTtl: 60 });
    checks.kv = { status: 'healthy', latency_ms: Date.now() - kvStart };
  } catch {
    checks.kv = { status: 'unhealthy' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  return new Response(JSON.stringify({
    status: allHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - start,
    services: checks,
  }), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
