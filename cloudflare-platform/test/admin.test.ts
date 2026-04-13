import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * Phase 4: Admin Operations Test
 * Verifies admin endpoints, staff management, fee schedule,
 * system health, and participant management.
 */
describe('Phase 4: Admin Operations', () => {
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

  describe('Admin endpoints require authentication', () => {
    const adminRoutes = [
      { method: 'GET', path: '/api/v1/admin/participants' },
      { method: 'GET', path: '/api/v1/admin/stats' },
      { method: 'GET', path: '/api/v1/admin/system-health' },
      { method: 'GET', path: '/api/v1/admin/fee-schedule' },
      { method: 'GET', path: '/api/v1/staff' },
      { method: 'GET', path: '/api/v1/admin/modules' },
    ];

    for (const route of adminRoutes) {
      it(`${route.method} ${route.path} returns 401 without auth`, async () => {
        const res = await SELF.fetch(`https://fake${route.path}`, {
          method: route.method,
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Admin POST endpoints require authentication', () => {
    it('POST /api/v1/admin/fee-schedule returns 401 without auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/admin/fee-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fee_type: 'trading',
          description: 'Test fee',
          rate_bps: 10,
          min_cents: 100,
          max_cents: 50000,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/staff returns 401 without auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newstaff@test.co.za',
          name: 'New Staff',
          role: 'support',
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Fee schedule data integrity', () => {
    it('fee_schedule table exists with required columns', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='fee_schedule'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('fee_type');
      expect(result!.sql).toContain('rate_bps');
      expect(result!.sql).toContain('min_cents');
      expect(result!.sql).toContain('max_cents');
    });

    it('seed fee schedules exist', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM fee_schedule WHERE active = 1"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(2);
    });

    it('fee schedule query executes correctly', async () => {
      const result = await env.DB.prepare(
        "SELECT id, fee_type, description, rate_bps, min_cents, max_cents FROM fee_schedule WHERE active = 1 ORDER BY fee_type"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Participant management queries', () => {
    it('can list all participants', async () => {
      const result = await env.DB.prepare(
        "SELECT id, company_name, participant_type, kyc_status, created_at FROM participants ORDER BY created_at DESC"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(5);
    });

    it('can count participants by role', async () => {
      const result = await env.DB.prepare(
        "SELECT participant_type, COUNT(*) as count FROM participants GROUP BY participant_type"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('can count participants by kyc_status', async () => {
      const result = await env.DB.prepare(
        "SELECT kyc_status, COUNT(*) as count FROM participants GROUP BY kyc_status"
      ).all();
      expect(result.success).toBe(true);
    });

    it('admin stats query for active participants', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as total, SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) as verified, SUM(CASE WHEN kyc_status = 'pending' THEN 1 ELSE 0 END) as pending FROM participants"
      ).first<{ total: number; verified: number; pending: number }>();
      expect(result).toBeTruthy();
      expect(result!.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Support ticket management', () => {
    it('support tickets endpoint requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/support/tickets', {
        method: 'GET',
      });
      expect(res.status).toBe(401);
    });

    it('creating support ticket requires auth', async () => {
      const res = await SELF.fetch('https://fake/api/v1/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Test ticket',
          description: 'Test description',
          priority: 'medium',
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Notification management', () => {
    it('notifications table has correct structure', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('participant_id');
      expect(result!.sql).toContain('title');
      expect(result!.sql).toContain('body');
      expect(result!.sql).toContain('type');
      expect(result!.sql).toContain('read');
    });

    it('seed notifications exist', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM notifications"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(3);
    });

    it('can query notifications by participant', async () => {
      const result = await env.DB.prepare(
        "SELECT id, title, body, type, read, created_at FROM notifications WHERE participant_id = ? ORDER BY created_at DESC"
      ).bind('P001').all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('can count unread notifications', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as unread FROM notifications WHERE participant_id = ? AND read = 0"
      ).bind('P001').first<{ unread: number }>();
      expect(result).toBeTruthy();
      expect(result!.unread).toBeGreaterThanOrEqual(1);
    });
  });

  describe('System health indicators', () => {
    it('can count total tables in database', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(20);
    });

    it('all core tables exist', async () => {
      const coreTables = [
        'participants', 'projects', 'orders', 'trades', 'carbon_credits',
        'contract_documents', 'invoices', 'escrows', 'disputes', 'notifications',
        'audit_log', 'licences', 'statutory_checks', 'fee_schedule',
      ];
      for (const table of coreTables) {
        const result = await env.DB.prepare(
          "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name=?"
        ).bind(table).first<{ c: number }>();
        expect(result!.c).toBe(1);
      }
    });
  });
});
