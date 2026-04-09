-- Migration 001: Add migrations tracking table
-- Phase 6.2: Database migration tooling
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT (datetime('now'))
);
