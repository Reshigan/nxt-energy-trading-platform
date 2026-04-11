-- Migration 008: Go-Live Remediation
-- Adds email_verified column to participants table.
-- Note: two_factor_enabled is already added by migration 004 and is NOT repeated here.
-- On production D1, this migration is already tracked in d1_migrations (applied 2026-04-11).
-- Wrangler will skip it on production. Fresh databases will run the ALTER TABLE normally.

-- Email verification status
ALTER TABLE participants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
