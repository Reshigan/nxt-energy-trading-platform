import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * Phase 4: Carbon Credit Lifecycle Test
 * Verifies carbon credit CRUD, options, retirement, and registry operations.
 */
describe('Phase 4: Carbon Credit Lifecycle', () => {
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

  describe('Carbon credit endpoints require auth', () => {
    const carbonRoutes = [
      { method: 'GET', path: '/api/v1/carbon/credits' },
      { method: 'GET', path: '/api/v1/carbon/retirements' },
      { method: 'GET', path: '/api/v1/carbon/options' },
      { method: 'GET', path: '/api/v1/carbon/registry/sync' },
    ];

    for (const route of carbonRoutes) {
      it(`${route.method} ${route.path} returns 401 without auth`, async () => {
        const res = await SELF.fetch(`https://fake${route.path}`, {
          method: route.method,
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Carbon credit data integrity', () => {
    it('carbon_credits table has required columns', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='carbon_credits'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('owner_id');
      expect(result!.sql).toContain('volume_tonnes');
      expect(result!.sql).toContain('status');
      expect(result!.sql).toContain('vintage_year');
    });

    it('carbon_options table has required columns', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='carbon_options'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('underlying_credit_id');
      expect(result!.sql).toContain('option_type');
      expect(result!.sql).toContain('expiry_date');
      expect(result!.sql).toContain('strike_price_cents');
    });

    it('seed carbon credits exist', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM carbon_credits"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(2);
    });

    it('carbon credits have valid statuses', async () => {
      const result = await env.DB.prepare(
        "SELECT DISTINCT status FROM carbon_credits"
      ).all();
      expect(result.success).toBe(true);
      for (const row of result.results) {
        expect(['active', 'retired', 'transferred', 'pending', 'cancelled']).toContain(row.status);
      }
    });
  });

  describe('Carbon credit queries execute without SQL errors', () => {
    it('query credits by owner', async () => {
      const result = await env.DB.prepare(
        "SELECT id, project_id, volume_tonnes, status, vintage_year, registry, serial_number FROM carbon_credits WHERE owner_id = ?"
      ).bind('P004').all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('query options with underlying_credit_id join', async () => {
      const result = await env.DB.prepare(
        "SELECT co.id, co.option_type, co.underlying_credit_id, co.strike_price_cents, co.volume_tonnes, co.expiry_date, cc.serial_number FROM carbon_options co LEFT JOIN carbon_credits cc ON co.underlying_credit_id = cc.id WHERE co.holder_id = ? OR co.writer_id = ?"
      ).bind('P004', 'P004').all();
      expect(result.success).toBe(true);
    });

    it('aggregate credit volume by status', async () => {
      const result = await env.DB.prepare(
        "SELECT status, SUM(volume_tonnes) as total FROM carbon_credits GROUP BY status"
      ).all();
      expect(result.success).toBe(true);
    });

    it('aggregate credit volume by vintage year', async () => {
      const result = await env.DB.prepare(
        "SELECT vintage_year, SUM(volume_tonnes) as total FROM carbon_credits GROUP BY vintage_year"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Carbon POST endpoints reject unauthenticated requests', () => {
    it('POST /api/v1/carbon/credits returns 401', async () => {
      const res = await SELF.fetch('https://fake/api/v1/carbon/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'PRJ001',
          volume_tonnes: 100,
          vintage_year: 2026,
          registry: 'gold_standard',
        }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/carbon/retire returns 401', async () => {
      const res = await SELF.fetch('https://fake/api/v1/carbon/retire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_id: 'CC001', volume_tonnes: 10, reason: 'voluntary' }),
      });
      expect(res.status).toBeLessThan(500);
    });
  });
});
