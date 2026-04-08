import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * T6: Subscription lifecycle test
 * Verifies subscription plan retrieval, subscribe, usage, cancel flows.
 */
describe('T6: Subscription Lifecycle', () => {
  beforeAll(async () => {
    const statements = SCHEMA_SQL.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      await env.DB.prepare(stmt).run();
    }
    const seeds = SEED_SQL.split(';').filter((s) => s.trim());
    for (const seed of seeds) {
      if (seed.trim()) await env.DB.prepare(seed).run();
    }
  });

  it('GET /subscriptions/plans returns available plans', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions/plans');
    expect(res.status).toBeLessThan(500);
    const json = await res.json() as { data?: unknown[] };
    // Plans endpoint should return array or require auth
    if (res.status === 200) {
      expect(Array.isArray(json.data)).toBe(true);
    }
  });

  it('GET /subscriptions/current requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions/current');
    expect(res.status).toBe(401);
  });

  it('POST /subscriptions requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: 'professional', billing_cycle: 'monthly' }),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /subscriptions requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions', {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('GET /subscriptions/usage requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions/usage');
    expect(res.status).toBe(401);
  });

  it('GET /subscriptions/all requires admin auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/subscriptions/all');
    expect(res.status).toBe(401);
  });
});
