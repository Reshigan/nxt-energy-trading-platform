/**
 * M1-M4: Health check monitoring script for NXT Energy Trading Platform
 * Runs periodic checks against the live API and reports status.
 * 
 * Usage: npx tsx monitoring/health-check.ts [base_url]
 * Default base_url: https://et.vantax.co.za
 */

const BASE_URL = process.argv[2] || 'https://et.vantax.co.za';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  latencyMs: number;
  details?: string;
}

async function checkEndpoint(name: string, path: string, expectStatus = 200): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - start;
    if (res.status === expectStatus) {
      return { name, status: 'pass', latencyMs };
    }
    return { name, status: 'fail', latencyMs, details: `Expected ${expectStatus}, got ${res.status}` };
  } catch (err) {
    return { name, status: 'fail', latencyMs: Date.now() - start, details: String(err) };
  }
}

async function checkSecurityHeaders(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/v1/market/insights`);
    const latencyMs = Date.now() - start;
    const required = ['x-content-type-options', 'x-frame-options'];
    const missing = required.filter(h => !res.headers.get(h));
    if (missing.length === 0) return { name: 'Security Headers', status: 'pass', latencyMs };
    return { name: 'Security Headers', status: 'warn', latencyMs, details: `Missing: ${missing.join(', ')}` };
  } catch (err) {
    return { name: 'Security Headers', status: 'fail', latencyMs: Date.now() - start, details: String(err) };
  }
}

async function checkSSL(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(BASE_URL);
    const latencyMs = Date.now() - start;
    const url = new URL(BASE_URL);
    if (url.protocol === 'https:') return { name: 'SSL/TLS', status: 'pass', latencyMs };
    return { name: 'SSL/TLS', status: 'fail', latencyMs, details: 'Not using HTTPS' };
  } catch (err) {
    return { name: 'SSL/TLS', status: 'fail', latencyMs: Date.now() - start, details: String(err) };
  }
}

async function runChecks() {
  console.log(`\n🏥 NXT Energy Platform Health Check`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}\n`);

  const results: CheckResult[] = await Promise.all([
    checkEndpoint('Frontend (HTML)', '/', 200),
    checkEndpoint('API Market Insights', '/api/v1/market/insights', 200),
    checkEndpoint('API Auth (unauth)', '/api/v1/dashboard/summary', 401),
    checkEndpoint('API Login endpoint', '/api/v1/auth/login', 405),
    checkSSL(),
    checkSecurityHeaders(),
  ]);

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name} (${r.latencyMs}ms)${r.details ? ` — ${r.details}` : ''}`);
  }

  console.log(`\n📊 Results: ${passed} passed, ${warned} warnings, ${failed} failed`);
  console.log(`📈 Avg latency: ${Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length)}ms\n`);

  if (failed > 0) process.exit(1);
}

runChecks();
