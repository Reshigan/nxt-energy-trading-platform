#!/usr/bin/env npx tsx
/**
 * Phase 6.4: Performance Testing Script
 * Simulates 100 concurrent order placements against the trading API.
 * Measures OrderBookDO matching latency. Target: <200ms p99.
 *
 * Usage:
 *   npx tsx scripts/perf-test.ts [base_url] [token]
 *
 * Example:
 *   npx tsx scripts/perf-test.ts https://et.vantax.co.za/api/v1 eyJhbGciOi...
 */

const BASE_URL = process.argv[2] || 'https://et.vantax.co.za/api/v1';
const AUTH_TOKEN = process.argv[3] || '';

const CONCURRENT_ORDERS = 100;
const MARKETS = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];

interface OrderResult {
  status: number;
  latency_ms: number;
  success: boolean;
  error?: string;
}

async function placeOrder(index: number): Promise<OrderResult> {
  const market = MARKETS[index % MARKETS.length];
  const direction = index % 2 === 0 ? 'buy' : 'sell';
  const price_cents = 10000 + Math.floor(Math.random() * 5000);
  const volume = 1 + Math.floor(Math.random() * 50);

  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/trading/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        direction,
        market,
        volume,
        price_cents,
        order_type: 'limit',
        validity: 'day',
      }),
    });
    const latency_ms = Math.round(performance.now() - start);
    return {
      status: res.status,
      latency_ms,
      success: res.status >= 200 && res.status < 300,
    };
  } catch (err) {
    const latency_ms = Math.round(performance.now() - start);
    return {
      status: 0,
      latency_ms,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  console.log('=== NXT Energy Trading Platform — Performance Test ===\n');
  console.log(`Target:    ${BASE_URL}`);
  console.log(`Orders:    ${CONCURRENT_ORDERS} concurrent`);
  console.log(`Auth:      ${AUTH_TOKEN ? 'Bearer token provided' : 'No auth (will get 401s)'}`);
  console.log('');

  // Warm up
  console.log('Warming up (5 sequential requests)...');
  for (let i = 0; i < 5; i++) {
    await placeOrder(i);
  }

  // Fire concurrent orders
  console.log(`\nFiring ${CONCURRENT_ORDERS} concurrent orders...\n`);
  const startAll = performance.now();

  const promises = Array.from({ length: CONCURRENT_ORDERS }, (_, i) => placeOrder(i));
  const results = await Promise.all(promises);

  const totalTime = Math.round(performance.now() - startAll);

  // Analyse results
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const latencies = results.map((r) => r.latency_ms).sort((a, b) => a - b);

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const avg = Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length);
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  console.log('=== Results ===');
  console.log(`Total time:    ${totalTime}ms`);
  console.log(`Throughput:    ${Math.round((CONCURRENT_ORDERS / totalTime) * 1000)} req/s`);
  console.log(`Successes:     ${successes.length}/${CONCURRENT_ORDERS}`);
  console.log(`Failures:      ${failures.length}/${CONCURRENT_ORDERS}`);
  console.log('');
  console.log('=== Latency Distribution ===');
  console.log(`Min:           ${min}ms`);
  console.log(`Avg:           ${avg}ms`);
  console.log(`p50:           ${p50}ms`);
  console.log(`p95:           ${p95}ms`);
  console.log(`p99:           ${p99}ms  ${p99 < 200 ? '✓ PASS (<200ms)' : '✗ FAIL (>200ms)'}`);
  console.log(`Max:           ${max}ms`);

  if (failures.length > 0) {
    console.log('\n=== Failure Summary ===');
    const statusCounts: Record<number, number> = {};
    for (const f of failures) {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
    }
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  HTTP ${status}: ${count} failures`);
    }
  }

  // Exit code based on p99
  process.exit(p99 < 200 ? 0 : 1);
}

main().catch(console.error);
