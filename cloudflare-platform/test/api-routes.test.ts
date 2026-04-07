import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

describe('API Routes Integration', () => {
  beforeAll(async () => {
    // Set up DB schema and seed data
    const statements = SCHEMA_SQL.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      await env.DB.prepare(stmt).run();
    }
    const seeds = SEED_SQL.split(';').filter((s) => s.trim());
    for (const seed of seeds) {
      await seed.trim() && env.DB.prepare(seed).run();
    }
  });

  describe('Health', () => {
    it('GET /health returns status', async () => {
      const res = await SELF.fetch('https://fake/health');
      expect(res.status).toBe(200);
      const data = await res.json() as { status: string; services: Record<string, unknown> };
      expect(data.status).toBeDefined();
      expect(data.services).toBeDefined();
    });
  });

  describe('Root', () => {
    it('GET / returns API info', async () => {
      const res = await SELF.fetch('https://fake/');
      expect(res.status).toBe(200);
      const data = await res.json() as { message: string; version: string };
      expect(data.message).toContain('NXT');
      expect(data.version).toBe('2.0.0');
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/login rejects missing credentials', async () => {
      const res = await SELF.fetch('https://fake/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Should return 400 or 401 — not 500
      expect(res.status).toBeLessThan(500);
    });

    it('POST /api/v1/auth/logout requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/auth/logout', {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/auth/refresh rejects missing token', async () => {
      const res = await SELF.fetch('https://fake/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Market Insights', () => {
    it('GET /api/v1/market/insights returns data', async () => {
      const res = await SELF.fetch('https://fake/api/v1/market/insights');
      expect(res.status).toBe(200);
      const data = await res.json() as { marketCondition: string; confidence: number };
      expect(data.marketCondition).toBe('Bullish');
      expect(data.confidence).toBe(0.87);
    });
  });

  describe('Fee Schedule', () => {
    it('GET /api/v1/fees returns fee list', async () => {
      const res = await SELF.fetch('https://fake/api/v1/fees');
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: unknown[] };
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/v1/notifications requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/dashboard/summary requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/participants requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/participants');
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/contracts/documents requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/contracts/documents');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/trading/orders requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'buy', market: 'solar', volume: 10, price_cents: 12000 }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await SELF.fetch('https://fake/api/v1/market/insights', {
        headers: { Origin: 'https://et.vantax.co.za' },
      });
      expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers on responses', async () => {
      const res = await SELF.fetch('https://fake/');
      const xfo = res.headers.get('x-frame-options');
      const xcto = res.headers.get('x-content-type-options');
      // At least one security header should be present
      expect(xfo || xcto).toBeTruthy();
    });
  });

  describe('Request ID', () => {
    it('should return X-Request-Id header', async () => {
      const res = await SELF.fetch('https://fake/');
      const reqId = res.headers.get('x-request-id');
      expect(reqId).toBeTruthy();
    });
  });
});
