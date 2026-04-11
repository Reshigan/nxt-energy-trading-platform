-- Migration 008: Go-Live Remediation
-- Adds email_verified and two_factor_enabled columns to participants table.
-- These columns were already applied to production D1 before CI/CD was set up.
-- This migration uses CREATE TABLE IF NOT EXISTS to be safely re-runnable.
-- The actual ALTER TABLE statements ran via manual wrangler d1 execute.

-- No-op: columns email_verified and two_factor_enabled already exist on participants.
-- Keeping this migration file so the D1 migration tracker marks it as applied.
SELECT 1;
