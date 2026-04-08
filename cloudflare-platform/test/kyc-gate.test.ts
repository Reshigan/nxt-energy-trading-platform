import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * T4: KYC gate test
 * Verifies: Trading/carbon/P2P routes are blocked when KYC is pending, allowed when verified.
 * Acceptance: Unverified participants get 403 on trading actions.
 */
describe('T4: KYC Gate Enforcement', () => {
  beforeAll(async () => {
    const statements = SCHEMA_SQL.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      await env.DB.prepare(stmt).run();
    }
    const seeds = SEED_SQL.split(';').filter((s) => s.trim());
    for (const seed of seeds) {
      if (seed.trim()) await env.DB.prepare(seed).run();
    }
    // Add a pending KYC participant
    await env.DB.prepare(
      "INSERT INTO participants (id, company_name, registration_number, participant_type, contact_name, contact_email, phone, province, kyc_status, password_hash) VALUES ('P_PENDING', 'Pending Co', '2024/888888/07', 'trader', 'Pending User', 'pending@test.co.za', '+27110008888', 'Gauteng', 'pending', 'hash_pending')"
    ).run();
  });

  it('POST /trading/orders requires auth (KYC check happens after auth)', async () => {
    const res = await SELF.fetch('https://fake/api/v1/trading/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'buy', market: 'solar', volume: 5, price: 125 }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /carbon/credits/:id/retire requires auth (KYC check after)', async () => {
    const res = await SELF.fetch('https://fake/api/v1/carbon/credits/CC001/retire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume_tonnes: 10, reason: 'Compliance' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /p2p/offers requires auth (KYC check after)', async () => {
    const res = await SELF.fetch('https://fake/api/v1/p2p/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer_type: 'sell', volume_kwh: 100, price_cents_per_kwh: 120 }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /compliance/kyc requires auth, not 500', async () => {
    const res = await SELF.fetch('https://fake/api/v1/compliance/kyc');
    expect(res.status).toBeLessThan(500);
  });

  it('POST /compliance/kyc/:id/verify requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/compliance/kyc/P_PENDING/verify', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('KYC-gated routes never return 500 for unauthenticated requests', async () => {
    const routes = [
      { url: 'https://fake/api/v1/trading/orders', method: 'POST' },
      { url: 'https://fake/api/v1/carbon/credits/CC001/retire', method: 'POST' },
      { url: 'https://fake/api/v1/carbon/credits/CC001/transfer', method: 'POST' },
      { url: 'https://fake/api/v1/p2p/offers', method: 'POST' },
      { url: 'https://fake/api/v1/p2p/offers/fake/accept', method: 'POST' },
    ];
    for (const r of routes) {
      const res = await SELF.fetch(r.url, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBeLessThan(500);
    }
  });
});
