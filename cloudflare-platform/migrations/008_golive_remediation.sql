-- Migration 008: Go-Live Remediation
-- Adds email_verified column to participants table.
-- Note: two_factor_enabled is already added by migration 004 and is NOT repeated here.
-- On production D1, this migration was previously applied manually and is
-- already tracked in d1_migrations. Wrangler will skip it on production.
-- Fresh databases will run the ALTER TABLE statement normally.

-- Email verification status
ALTER TABLE participants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
