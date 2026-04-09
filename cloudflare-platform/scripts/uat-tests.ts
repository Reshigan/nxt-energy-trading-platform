#!/usr/bin/env npx tsx
/**
 * Phase 6.9: UAT Test Scripts for all 6 user roles.
 * Each role has specific test flows that exercise their core functionality.
 *
 * Usage:
 *   npx tsx scripts/uat-tests.ts [base_url]
 *
 * Example:
 *   npx tsx scripts/uat-tests.ts https://et.vantax.co.za/api/v1
 */

const BASE_URL = process.argv[2] || 'https://et.vantax.co.za/api/v1';

interface UATResult {
  role: string;
  flow: string;
  step: string;
  passed: boolean;
  details: string;
}

const results: UATResult[] = [];

async function login(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/register/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { token?: string } };
    return data.data?.token || null;
  } catch {
    return null;
  }
}

function headers(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function report(role: string, flow: string, step: string, passed: boolean, details: string) {
  results.push({ role, flow, step, passed, details });
  console.log(`  ${passed ? '✓' : '✗'} [${role}] ${flow} > ${step}: ${details}`);
}

// === ADMIN TESTS ===
async function testAdmin(token: string) {
  console.log('\n--- Admin Role Tests ---');

  // Dashboard
  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: headers(token) });
  report('admin', 'Dashboard', 'Load summary', dashRes.ok, `Status: ${dashRes.status}`);

  // Participants list
  const partRes = await fetch(`${BASE_URL}/participants`, { headers: headers(token) });
  report('admin', 'Participants', 'List participants', partRes.ok, `Status: ${partRes.status}`);

  // Compliance overview
  const compRes = await fetch(`${BASE_URL}/compliance/kyc-stats`, { headers: headers(token) });
  report('admin', 'Compliance', 'KYC stats', compRes.status < 500, `Status: ${compRes.status}`);

  // Analytics
  const anlRes = await fetch(`${BASE_URL}/analytics/api`, { headers: headers(token) });
  report('admin', 'Analytics', 'API analytics', anlRes.ok, `Status: ${anlRes.status}`);

  // Notifications
  const notRes = await fetch(`${BASE_URL}/notifications`, { headers: headers(token) });
  report('admin', 'Notifications', 'Load notifications', notRes.ok, `Status: ${notRes.status}`);
}

// === TRADER TESTS ===
async function testTrader(token: string) {
  console.log('\n--- Trader Role Tests ---');

  // Market insights
  const mktRes = await fetch(`${BASE_URL}/market/insights`);
  report('trader', 'Markets', 'Market insights', mktRes.ok, `Status: ${mktRes.status}`);

  // Orderbook
  const obRes = await fetch(`${BASE_URL}/trading/orderbook/solar`, { headers: headers(token) });
  report('trader', 'Trading', 'View orderbook', obRes.status < 500, `Status: ${obRes.status}`);

  // Place order
  const orderRes = await fetch(`${BASE_URL}/trading/orders`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ direction: 'buy', market: 'solar', volume: 5, price_cents: 12000, order_type: 'limit', validity: 'day' }),
  });
  report('trader', 'Trading', 'Place limit order', orderRes.status < 500, `Status: ${orderRes.status}`);

  // View orders
  const ordersRes = await fetch(`${BASE_URL}/trading/orders`, { headers: headers(token) });
  report('trader', 'Trading', 'List orders', ordersRes.status < 500, `Status: ${ordersRes.status}`);

  // Carbon credits
  const carbRes = await fetch(`${BASE_URL}/carbon/credits`, { headers: headers(token) });
  report('trader', 'Carbon', 'List credits', carbRes.status < 500, `Status: ${carbRes.status}`);
}

// === IPP TESTS ===
async function testIPP(token: string) {
  console.log('\n--- IPP Role Tests ---');

  // Projects
  const projRes = await fetch(`${BASE_URL}/projects`, { headers: headers(token) });
  report('ipp', 'Projects', 'List projects', projRes.status < 500, `Status: ${projRes.status}`);

  // Dashboard
  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: headers(token) });
  report('ipp', 'Dashboard', 'Load summary', dashRes.ok, `Status: ${dashRes.status}`);

  // Contracts
  const conRes = await fetch(`${BASE_URL}/contracts/documents`, { headers: headers(token) });
  report('ipp', 'Contracts', 'List contracts', conRes.status < 500, `Status: ${conRes.status}`);

  // Metering
  const metRes = await fetch(`${BASE_URL}/metering/readings`, { headers: headers(token) });
  report('ipp', 'Metering', 'View readings', metRes.status < 500, `Status: ${metRes.status}`);
}

// === OFFTAKER TESTS ===
async function testOfftaker(token: string) {
  console.log('\n--- Offtaker Role Tests ---');

  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: headers(token) });
  report('offtaker', 'Dashboard', 'Load summary', dashRes.ok, `Status: ${dashRes.status}`);

  const invRes = await fetch(`${BASE_URL}/settlement/invoices`, { headers: headers(token) });
  report('offtaker', 'Settlement', 'List invoices', invRes.status < 500, `Status: ${invRes.status}`);

  const mktRes = await fetch(`${BASE_URL}/marketplace/listings`, { headers: headers(token) });
  report('offtaker', 'Marketplace', 'Browse listings', mktRes.status < 500, `Status: ${mktRes.status}`);
}

// === CARBON FUND TESTS ===
async function testCarbonFund(token: string) {
  console.log('\n--- Carbon Fund Role Tests ---');

  const credRes = await fetch(`${BASE_URL}/carbon/credits`, { headers: headers(token) });
  report('carbon_fund', 'Carbon', 'List credits', credRes.status < 500, `Status: ${credRes.status}`);

  const optRes = await fetch(`${BASE_URL}/carbon/options`, { headers: headers(token) });
  report('carbon_fund', 'Carbon', 'List options', optRes.status < 500, `Status: ${optRes.status}`);

  const navRes = await fetch(`${BASE_URL}/carbon/fund/nav`, { headers: headers(token) });
  report('carbon_fund', 'Carbon', 'Fund NAV', navRes.status < 500, `Status: ${navRes.status}`);
}

// === LENDER TESTS ===
async function testLender(token: string) {
  console.log('\n--- Lender Role Tests ---');

  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: headers(token) });
  report('lender', 'Dashboard', 'Load summary', dashRes.ok, `Status: ${dashRes.status}`);

  const projRes = await fetch(`${BASE_URL}/projects`, { headers: headers(token) });
  report('lender', 'Projects', 'View projects', projRes.status < 500, `Status: ${projRes.status}`);

  const settRes = await fetch(`${BASE_URL}/settlement/escrows`, { headers: headers(token) });
  report('lender', 'Settlement', 'View escrows', settRes.status < 500, `Status: ${settRes.status}`);
}

// === GRID TESTS ===
async function testGrid(token: string) {
  console.log('\n--- Grid Role Tests ---');

  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: headers(token) });
  report('grid', 'Dashboard', 'Load summary', dashRes.ok, `Status: ${dashRes.status}`);

  const metRes = await fetch(`${BASE_URL}/metering/readings`, { headers: headers(token) });
  report('grid', 'Metering', 'View readings', metRes.status < 500, `Status: ${metRes.status}`);
}

async function main() {
  console.log('=== NXT Energy Trading Platform — UAT Test Suite ===');
  console.log(`Target: ${BASE_URL}\n`);

  const accounts = [
    { email: 'admin@et.vantax.co.za', password: 'NxtAdmin@2024!', role: 'admin', test: testAdmin },
    { email: 'thabo@envera.co.za', password: 'NxtDemo@2024!', role: 'trader', test: testTrader },
    { email: 'james@terravolt.co.za', password: 'NxtDemo@2024!', role: 'ipp', test: testIPP },
    { email: 'sarah@bevco-power.co.za', password: 'NxtDemo@2024!', role: 'offtaker', test: testOfftaker },
    { email: 'nomsa@greenfund.co.za', password: 'NxtDemo@2024!', role: 'carbon_fund', test: testCarbonFund },
    { email: 'michelle.govender@absa.co.za', password: 'NxtDemo@2024!', role: 'lender', test: testLender },
    { email: 'david.mahlangu@eskom.co.za', password: 'NxtDemo@2024!', role: 'grid', test: testGrid },
  ];

  for (const account of accounts) {
    console.log(`\nLogging in as ${account.role} (${account.email})...`);
    const token = await login(account.email, account.password);
    if (!token) {
      report(account.role, 'Auth', 'Login', false, `Failed to login as ${account.email}`);
      continue;
    }
    report(account.role, 'Auth', 'Login', true, 'Token obtained');
    await account.test(token);
  }

  // Summary
  console.log('\n=== UAT Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const byRole: Record<string, { passed: number; failed: number }> = {};
  for (const r of results) {
    if (!byRole[r.role]) byRole[r.role] = { passed: 0, failed: 0 };
    byRole[r.role][r.passed ? 'passed' : 'failed']++;
  }

  console.log(`Total:   ${passed}/${results.length} passed`);
  for (const [role, counts] of Object.entries(byRole)) {
    console.log(`  ${role}: ${counts.passed}/${counts.passed + counts.failed} passed`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
