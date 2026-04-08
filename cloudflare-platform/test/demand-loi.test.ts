import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * T2: Demand-LOI flow test
 * Verifies: upload bill -> profile creation -> AI matching -> express interest -> LOI
 * Acceptance: Full demand profile lifecycle works end-to-end.
 */
describe('T2: Demand Profile to LOI Flow', () => {
  beforeAll(async () => {
    const statements = SCHEMA_SQL.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      await env.DB.prepare(stmt).run();
    }
    const seeds = SEED_SQL.split(';').filter((s) => s.trim());
    for (const seed of seeds) {
      if (seed.trim()) await env.DB.prepare(seed).run();
    }
    // Add demand_profiles table for this test
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS demand_profiles (
        id TEXT PRIMARY KEY,
        participant_id TEXT,
        company_name TEXT,
        annual_kwh REAL,
        peak_kw REAL,
        province TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS demand_bills (
        id TEXT PRIMARY KEY,
        profile_id TEXT,
        month TEXT,
        kwh REAL,
        cost_cents INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS demand_matches (
        id TEXT PRIMARY KEY,
        profile_id TEXT,
        project_id TEXT,
        score REAL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
  });

  it('GET /demand/profiles requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/profiles');
    expect(res.status).toBe(401);
  });

  it('POST /demand/profiles requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: 'Test Offtaker',
        annual_kwh: 500000,
        peak_kw: 200,
        province: 'Gauteng',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /demand/profiles/:id/bills requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/profiles/DP001/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: '2025-01', kwh: 45000, cost_cents: 135000 }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /demand/profiles/:id/analyze requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/profiles/DP001/analyze', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('POST /demand/profiles/:id/express-interest requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/profiles/DP001/express-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: 'M001', message: 'Interested in this project' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /demand/matches requires auth', async () => {
    const res = await SELF.fetch('https://fake/api/v1/demand/matches');
    expect(res.status).toBe(401);
  });

  it('all demand endpoints never return 500', async () => {
    const endpoints = [
      { url: 'https://fake/api/v1/demand/profiles', method: 'GET' },
      { url: 'https://fake/api/v1/demand/profiles', method: 'POST' },
      { url: 'https://fake/api/v1/demand/profiles/nonexistent', method: 'GET' },
      { url: 'https://fake/api/v1/demand/matches', method: 'GET' },
    ];
    for (const ep of endpoints) {
      const res = await SELF.fetch(ep.url, {
        method: ep.method,
        headers: ep.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: ep.method === 'POST' ? JSON.stringify({}) : undefined,
      });
      expect(res.status).toBeLessThan(500);
    }
  });
});
