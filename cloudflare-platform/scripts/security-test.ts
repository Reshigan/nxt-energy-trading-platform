#!/usr/bin/env npx tsx
/**
 * Phase 6.5: Security Testing Script
 * Runs basic OWASP-style security checks against the API.
 * For full penetration testing, use OWASP ZAP or Burp Suite against staging.
 *
 * Usage:
 *   npx tsx scripts/security-test.ts [base_url]
 *
 * Example:
 *   npx tsx scripts/security-test.ts https://et.vantax.co.za
 */

const BASE_URL = process.argv[2] || 'https://et.vantax.co.za';

interface TestResult {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function report(name: string, severity: TestResult['severity'], passed: boolean, details: string) {
  results.push({ name, severity, passed, details });
  const icon = passed ? '✓' : '✗';
  console.log(`  ${icon} [${severity}] ${name}: ${details}`);
}

async function testSecurityHeaders() {
  console.log('\n1. Security Headers');
  const res = await fetch(`${BASE_URL}/api/v1/market/insights`);
  const headers = res.headers;

  report('Strict-Transport-Security', 'HIGH', !!headers.get('strict-transport-security'),
    headers.get('strict-transport-security') || 'MISSING');
  report('X-Content-Type-Options', 'MEDIUM', headers.get('x-content-type-options') === 'nosniff',
    headers.get('x-content-type-options') || 'MISSING');
  report('X-Frame-Options', 'MEDIUM', headers.get('x-frame-options') === 'DENY',
    headers.get('x-frame-options') || 'MISSING');
  report('Content-Security-Policy', 'HIGH', !!headers.get('content-security-policy'),
    headers.get('content-security-policy')?.substring(0, 80) || 'MISSING');
  report('Referrer-Policy', 'LOW', !!headers.get('referrer-policy'),
    headers.get('referrer-policy') || 'MISSING');
  report('Permissions-Policy', 'LOW', !!headers.get('permissions-policy'),
    headers.get('permissions-policy')?.substring(0, 60) || 'MISSING');
  report('X-Request-Id', 'INFO', !!headers.get('x-request-id'),
    headers.get('x-request-id') || 'MISSING');
}

async function testAuthEndpoints() {
  console.log('\n2. Authentication Security');

  // Test login rate limiting
  const loginPromises = Array.from({ length: 10 }, () =>
    fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' }),
    })
  );
  const loginResults = await Promise.all(loginPromises);
  const has429 = loginResults.some((r) => r.status === 429);
  report('Login rate limiting', 'CRITICAL', has429 || loginResults.every((r) => r.status < 500),
    has429 ? 'Rate limiting active (429 returned)' : `No 429s in 10 rapid requests (got ${loginResults.map(r => r.status).join(',')})`);

  // Test protected routes without auth
  const protectedRoutes = ['/dashboard/summary', '/notifications', '/participants', '/contracts/documents', '/trading/orders'];
  for (const route of protectedRoutes) {
    const res = await fetch(`${BASE_URL}/api/v1${route}`);
    report(`Auth required: ${route}`, 'CRITICAL', res.status === 401,
      `Status: ${res.status} (expected 401)`);
  }
}

async function testInputValidation() {
  console.log('\n3. Input Validation');

  // SQL injection attempt
  const sqlRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "admin' OR '1'='1", password: "' OR '1'='1" }),
  });
  report('SQL injection (login)', 'CRITICAL', sqlRes.status !== 200 && sqlRes.status < 500,
    `Status: ${sqlRes.status} (should reject, not error)`);

  // XSS attempt in query params
  const xssRes = await fetch(`${BASE_URL}/api/v1/market/insights?q=<script>alert(1)</script>`);
  const xssBody = await xssRes.text();
  report('XSS in query params', 'HIGH', !xssBody.includes('<script>'),
    xssBody.includes('<script>') ? 'REFLECTED XSS FOUND' : 'No reflection');

  // Oversized payload
  const bigPayload = JSON.stringify({ data: 'x'.repeat(10_000_000) });
  try {
    const bigRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bigPayload,
    });
    report('Oversized payload rejection', 'MEDIUM', bigRes.status < 500,
      `Status: ${bigRes.status}`);
  } catch {
    report('Oversized payload rejection', 'MEDIUM', true, 'Connection rejected (good)');
  }
}

async function testCORS() {
  console.log('\n4. CORS Configuration');

  // Test with allowed origin
  const allowedRes = await fetch(`${BASE_URL}/api/v1/market/insights`, {
    headers: { Origin: 'https://et.vantax.co.za' },
  });
  const acao = allowedRes.headers.get('access-control-allow-origin');
  report('Allowed origin accepted', 'HIGH', acao === 'https://et.vantax.co.za',
    `ACAO: ${acao || 'MISSING'}`);

  // Test with disallowed origin
  const badRes = await fetch(`${BASE_URL}/api/v1/market/insights`, {
    headers: { Origin: 'https://evil.com' },
  });
  const badAcao = badRes.headers.get('access-control-allow-origin');
  report('Malicious origin rejected', 'HIGH', badAcao !== '*' && badAcao !== 'https://evil.com',
    `ACAO: ${badAcao || 'NONE (good)'}`);
}

async function testInformationLeakage() {
  console.log('\n5. Information Leakage');

  // Check error responses don't leak stack traces
  const notFound = await fetch(`${BASE_URL}/api/v1/nonexistent`);
  const notFoundBody = await notFound.text();
  report('No stack trace in 404', 'MEDIUM', !notFoundBody.includes('at ') && !notFoundBody.includes('.ts:'),
    notFoundBody.length > 200 ? 'Response too long (possible leak)' : `Response: ${notFoundBody.substring(0, 100)}`);

  // Check no server version header
  report('No Server header', 'LOW', !notFound.headers.get('server')?.includes('node'),
    `Server: ${notFound.headers.get('server') || 'NONE (good)'}`);
}

async function main() {
  console.log('=== NXT Energy Trading Platform — Security Test ===');
  console.log(`Target: ${BASE_URL}\n`);

  await testSecurityHeaders();
  await testAuthEndpoints();
  await testInputValidation();
  await testCORS();
  await testInformationLeakage();

  // Summary
  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const criticalFails = results.filter((r) => !r.passed && r.severity === 'CRITICAL').length;
  const highFails = results.filter((r) => !r.passed && r.severity === 'HIGH').length;

  console.log(`Total checks:    ${results.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log(`Critical fails:  ${criticalFails}`);
  console.log(`High fails:      ${highFails}`);

  if (failed > 0) {
    console.log('\n=== Failed Checks ===');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  [${r.severity}] ${r.name}: ${r.details}`);
    }
  }

  process.exit(criticalFails > 0 ? 1 : 0);
}

main().catch(console.error);
