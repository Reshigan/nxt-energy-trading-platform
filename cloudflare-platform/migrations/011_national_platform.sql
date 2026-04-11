-- Migration 011: National Platform Completion
-- Adds support tickets, announcements, platform config, and admin_level column

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  assigned_to TEXT DEFAULT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  resolved_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_participant ON support_tickets(participant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);

-- Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal_note INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active, starts_at, expires_at);

-- Platform Configuration
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_by TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add admin_level column to participants
ALTER TABLE participants ADD COLUMN admin_level TEXT DEFAULT NULL;

-- Seed platform_config with defaults
INSERT OR IGNORE INTO platform_config (key, value, description, category) VALUES
  ('margin_limit_cents', '10000000', 'Maximum margin exposure per participant in cents (R100k)', 'trading'),
  ('price_band_deviation', '0.20', 'Maximum allowed price deviation from last trade (20%)', 'trading'),
  ('login_max_attempts', '5', 'Maximum failed login attempts before lockout', 'security'),
  ('login_lockout_seconds', '900', 'Lockout duration in seconds after max failed attempts (15 min)', 'security'),
  ('otp_ttl_seconds', '600', 'OTP expiry time in seconds (10 min)', 'security'),
  ('session_ttl_hours', '24', 'JWT session duration in hours', 'security'),
  ('maintenance_mode', 'false', 'Enable maintenance mode (blocks all non-admin requests)', 'system'),
  ('platform_name', 'Ionvex', 'Platform display name', 'branding'),
  ('support_email', 'support@et.vantax.co.za', 'Support contact email', 'branding'),
  ('max_file_upload_mb', '10', 'Maximum file upload size in MB', 'system'),
  ('kyc_auto_approve', 'false', 'Automatically approve KYC submissions', 'compliance'),
  ('trading_enabled', 'true', 'Global trading enable/disable switch', 'trading'),
  ('announcement_default_ttl_hours', '168', 'Default announcement visibility in hours (7 days)', 'system');
