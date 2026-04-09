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
      if (seed.trim()) await env.DB.prepare(seed).run();
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

  // Phase 2: Rule 8 compliance tests — verify hardened routes never return 500
  describe('Rule 8: Backend Error Handling', () => {
    // Trading routes
    it('GET /api/v1/trading/positions requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/trading/positions');
      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/v1/trading/history requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/trading/history');
      expect(res.status).toBeLessThan(500);
    });

    // Carbon routes
    it('GET /api/v1/carbon/credits requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/carbon/credits');
      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/v1/carbon/retirements requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/carbon/retirements');
      expect(res.status).toBeLessThan(500);
    });

    // Settlement routes
    it('GET /api/v1/settlement/invoices requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/settlement/invoices');
      expect(res.status).toBeLessThan(500);
    });

    it('GET /api/v1/settlement/escrows requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/settlement/escrows');
      expect(res.status).toBeLessThan(500);
    });

    // Compliance routes
    it('GET /api/v1/compliance/checks requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/compliance/checks');
      expect(res.status).toBeLessThan(500);
    });

    // Contract routes
    it('GET /api/v1/contracts/documents requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/contracts/documents');
      expect(res.status).toBeLessThan(500);
    });

    // Projects routes
    it('GET /api/v1/projects requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/projects');
      expect(res.status).toBeLessThan(500);
    });

    // Metering routes
    it('GET /api/v1/metering/readings requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/metering/readings');
      expect(res.status).toBeLessThan(500);
    });

    // P2P routes
    it('GET /api/v1/p2p/offers requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/p2p/offers');
      expect(res.status).toBeLessThan(500);
    });

    // Marketplace routes
    it('GET /api/v1/marketplace/listings requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/marketplace/listings');
      expect(res.status).toBeLessThan(500);
    });

    // Reports routes
    it('GET /api/v1/reports requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/reports');
      expect(res.status).toBeLessThan(500);
    });

    // Developer routes
    it('GET /api/v1/developer/keys requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/developer/keys');
      expect(res.status).toBeLessThan(500);
    });

    // AI routes
    it('GET /api/v1/ai/optimisations requires auth, not 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/ai/optimisations');
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Rule 8: Error responses include requestId', () => {
    it('401 response includes requestId in header', async () => {
      const res = await SELF.fetch('https://fake/api/v1/notifications');
      expect(res.status).toBe(401);
      const reqId = res.headers.get('x-request-id');
      expect(reqId).toBeTruthy();
      expect(typeof reqId).toBe('string');
    });
  });

  describe('Rule 8: Invalid POST bodies handled gracefully', () => {
    it('POST /api/v1/auth/login with invalid JSON returns < 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json{{{',
      });
      expect(res.status).toBeLessThan(500);
    });

    it('POST /api/v1/auth/refresh with invalid JSON returns < 500', async () => {
      const res = await SELF.fetch('https://fake/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid',
      });
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Frontend Error Reporting', () => {
    it('POST /api/v1/errors/frontend accepts error reports', async () => {
      const res = await SELF.fetch('https://fake/api/v1/errors/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test error', url: '/test', timestamp: new Date().toISOString() }),
      });
      expect(res.status).toBe(200);
    });
  });
});
