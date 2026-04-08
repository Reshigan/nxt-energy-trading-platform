#!/usr/bin/env npx tsx
/**
 * Phase 0.4: Seed initial market prices to KV.
 * Run: npx tsx scripts/seed-prices.ts
 * This uses wrangler CLI to write KV values.
 */
import { execSync } from 'child_process';

const KV_NAMESPACE = 'NXT_KV';
const markets = [
  { key: 'index:solar', price: 6990, change_24h: 2.3, volume_24h: 12500 },
  { key: 'index:wind', price: 5840, change_24h: -1.1, volume_24h: 8900 },
  { key: 'index:hydro', price: 4520, change_24h: 0.5, volume_24h: 6200 },
  { key: 'index:gas', price: 8750, change_24h: 3.7, volume_24h: 15800 },
  { key: 'index:carbon', price: 3200, change_24h: -0.8, volume_24h: 4100 },
  { key: 'index:battery', price: 11200, change_24h: 1.9, volume_24h: 3400 },
];

for (const m of markets) {
  const value = JSON.stringify({ price: m.price, change_24h: m.change_24h, volume_24h: m.volume_24h, last_trade: new Date().toISOString() });
  try {
    execSync(`npx wrangler kv:key put --namespace-id="${KV_NAMESPACE}" "${m.key}" '${value}'`, { stdio: 'inherit' });
    console.log(`Seeded ${m.key}: R${(m.price / 100).toFixed(2)}/MWh`);
  } catch {
    console.error(`Failed to seed ${m.key} — run with wrangler configured`);
  }
}

console.log('Market price seeding complete.');
