-- Migration 008: Go-Live Remediation
-- Adds email_verified and two_factor_enabled columns to participants table
-- Adds password_reset_token support columns

-- Email verification status
ALTER TABLE participants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Two-factor authentication enabled flag
ALTER TABLE participants ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;
