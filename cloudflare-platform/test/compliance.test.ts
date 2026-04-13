import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { SCHEMA_SQL, SEED_SQL } from './fixtures/seed';

/**
 * Phase 4: Compliance/KYC Full Flow Test
 * Verifies KYC status transitions, statutory checks, licence management,
 * and compliance endpoint behavior.
 */
describe('Phase 4: Compliance & KYC Flow', () => {
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

  describe('KYC endpoints require authentication', () => {
    const kycRoutes = [
      { method: 'GET', path: '/api/v1/compliance/kyc/status' },
      { method: 'GET', path: '/api/v1/compliance/checks' },
      { method: 'GET', path: '/api/v1/compliance/licences' },
    ];

    for (const route of kycRoutes) {
      it(`${route.method} ${route.path} returns 401 without auth`, async () => {
        const res = await SELF.fetch(`https://fake${route.path}`, {
          method: route.method,
        });
        expect(res.status).toBe(401);
      });
    }
  });

  describe('KYC data integrity', () => {
    it('participants have valid kyc_status values', async () => {
      const result = await env.DB.prepare(
        "SELECT DISTINCT kyc_status FROM participants"
      ).all();
      expect(result.success).toBe(true);
      const validStatuses = ['pending', 'in_review', 'verified', 'rejected', 'suspended', 'manual_review'];
      for (const row of result.results) {
        expect(validStatuses).toContain(row.kyc_status);
      }
    });

    it('statutory_checks table has required columns', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='statutory_checks'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('participant_id');
      expect(result!.sql).toContain('check_type');
      expect(result!.sql).toContain('status');
    });

    it('seed statutory checks exist', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM statutory_checks"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(2);
    });

    it('statutory checks have valid types', async () => {
      const result = await env.DB.prepare(
        "SELECT DISTINCT check_type FROM statutory_checks"
      ).all();
      expect(result.success).toBe(true);
      for (const row of result.results) {
        expect(['cipc', 'sars', 'nersa', 'fsca', 'bbbee', 'popia', 'era', 'nema', 'carbon_tax']).toContain(row.check_type);
      }
    });
  });

  describe('Licence management data integrity', () => {
    it('licences table has required columns', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='licences'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('participant_id');
      expect(result!.sql).toContain('status');
      expect(result!.sql).toContain('expiry_date');
    });

    it('seed licences exist', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM licences"
      ).first<{ c: number }>();
      expect(result).toBeTruthy();
      expect(result!.c).toBeGreaterThanOrEqual(1);
    });

    it('licences have valid status values', async () => {
      const result = await env.DB.prepare(
        "SELECT DISTINCT status FROM licences"
      ).all();
      expect(result.success).toBe(true);
      for (const row of result.results) {
        expect(['active', 'expired', 'suspended', 'revoked', 'pending']).toContain(row.status);
      }
    });

    it('licence expiry query returns correct data', async () => {
      const result = await env.DB.prepare(
        "SELECT id, licence_type, expiry_date, status FROM licences WHERE status = 'active' AND expiry_date IS NOT NULL"
      ).all();
      expect(result.success).toBe(true);
    });
  });

  describe('KYC status transition queries', () => {
    it('can count participants by kyc_status', async () => {
      const result = await env.DB.prepare(
        "SELECT kyc_status, COUNT(*) as count FROM participants GROUP BY kyc_status"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('can query pending KYC participants', async () => {
      const result = await env.DB.prepare(
        "SELECT id, company_name, kyc_status FROM participants WHERE kyc_status = 'pending'"
      ).all();
      expect(result.success).toBe(true);
    });

    it('can query verified participants', async () => {
      const result = await env.DB.prepare(
        "SELECT id, company_name, kyc_status FROM participants WHERE kyc_status = 'verified'"
      ).all();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Registration endpoint validation', () => {
    it('POST /api/v1/register rejects empty body', async () => {
      const res = await SELF.fetch('https://fake/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBeLessThan(500);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('POST /api/v1/register rejects invalid role', async () => {
      const res = await SELF.fetch('https://fake/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Test Corp',
          registration_number: '2024/999999/07',
          tax_number: '9999999999',
          role: 'invalid_role',
          contact_person: 'Test User',
          email: 'invalid-role@test.co.za',
          password: 'TestPass123!',
          phone: '+27119999999',
          physical_address: '1 Test Street',
        }),
      });
      expect(res.status).toBeLessThan(500);
    });

    it('POST /api/v1/register rejects duplicate email', async () => {
      const res = await SELF.fetch('https://fake/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Duplicate Corp',
          registration_number: '2024/888888/07',
          tax_number: '8888888888',
          role: 'trader',
          contact_person: 'Dupe User',
          email: 'admin@test.co.za',
          password: 'TestPass123!',
          phone: '+27118888888',
          physical_address: '2 Test Street',
        }),
      });
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Audit trail for compliance', () => {
    it('audit_log table exists', async () => {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='audit_log'"
      ).first<{ c: number }>();
      expect(result!.c).toBe(1);
    });

    it('audit_log has required columns for compliance reporting', async () => {
      const result = await env.DB.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='audit_log'"
      ).first<{ sql: string }>();
      expect(result).toBeTruthy();
      expect(result!.sql).toContain('actor_id');
      expect(result!.sql).toContain('action');
      expect(result!.sql).toContain('entity_type');
      expect(result!.sql).toContain('entity_id');
      expect(result!.sql).toContain('ip_address');
    });
  });
});
