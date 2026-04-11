-- Migration 008: Go-Live Remediation
-- Adds email_verified and two_factor_enabled columns to participants table.
-- Note: On production D1, this migration was previously applied manually and is
-- already tracked in d1_migrations. Wrangler will skip it on production.
-- Fresh databases will run these ALTER TABLE statements normally.

-- Email verification status
ALTER TABLE participants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Two-factor authentication enabled flag
ALTER TABLE participants ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;
