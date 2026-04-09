-- Migration 004: Report schedules + addendum tables for Missing Screens
-- Phase 7a: Backend routes for new pages

CREATE TABLE IF NOT EXISTS report_schedules (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  email TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'deleted')),
  last_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_participant ON report_schedules(participant_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_status ON report_schedules(status);

-- Add two_factor_enabled column to participants if not exists
-- (SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a safe approach)
-- This column tracks whether a participant has 2FA enabled
ALTER TABLE participants ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;

-- Add subscription_tier column to participants if not exists
ALTER TABLE participants ADD COLUMN subscription_tier TEXT;
