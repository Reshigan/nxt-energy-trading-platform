-- Migration 019: Ona Platform Integration
-- Operational Intelligence for Ona-Subscribed IPPs
-- Spec: /workspace/NXT-Ona-Integration-Bridge-Spec.md

BEGIN;

-- ============================================================
-- PART 1: Platform Module (2 hours - Data Model)
-- ============================================================

INSERT INTO platform_modules (id, name, display_name, description, category, enabled_global, sort_order, min_subscription_tier, config)
VALUES (
  'MOD_ONA',
  'ona_integration',
  'Ona O&M Integration',
  'Live operational intelligence from Ona Platform — forecasts, fault detection, validated metering, and maintenance prioritisation for Ona-subscribed IPPs',
  'integration',
  0,
  60,
  'professional',
  '{"requires_ona_subscription": true, "ona_api_base": "https://api.asoba.co"}'
)
ON CONFLICT(id) DO UPDATE SET
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order,
  min_subscription_tier = excluded.min_subscription_tier,
  config = excluded.config;

-- ============================================================
-- PART 1.2: Ona Link Table
-- Track which NXT participants have linked Ona accounts
-- ============================================================

CREATE TABLE IF NOT EXISTS ona_links (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  ona_customer_id TEXT NOT NULL,
  ona_api_key_hash TEXT NOT NULL,
  linked_at TEXT DEFAULT (datetime('now')),
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error', 'revoked')),
  sync_errors TEXT DEFAULT '[]',
  config TEXT DEFAULT '{}',
  UNIQUE(participant_id)
);

CREATE INDEX IF NOT EXISTS idx_ona_links_participant ON ona_links(participant_id);
CREATE INDEX IF NOT EXISTS idx_ona_links_status ON ona_links(sync_status);

-- ============================================================
-- PART 1.3: Ona Asset Mapping
-- Map NXT project assets to Ona asset IDs
-- ============================================================

CREATE TABLE IF NOT EXISTS ona_asset_map (
  id TEXT PRIMARY KEY,
  ona_link_id TEXT NOT NULL REFERENCES ona_links(id) ON DELETE CASCADE,
  nxt_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nxt_odse_asset_id TEXT REFERENCES odse_assets(asset_id) ON DELETE SET NULL,
  ona_asset_id TEXT NOT NULL,
  ona_site_id TEXT,
  mapped_at TEXT DEFAULT (datetime('now')),
  UNIQUE(ona_link_id, ona_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_ona_asset_map_link ON ona_asset_map(ona_link_id);
CREATE INDEX IF NOT EXISTS idx_ona_asset_map_project ON ona_asset_map(nxt_project_id);
CREATE INDEX IF NOT EXISTS idx_ona_asset_map_ona ON ona_asset_map(ona_asset_id);

-- ============================================================
-- PART 1.4: Ona Sync Log
-- Track sync history for audit and debugging
-- ============================================================

CREATE TABLE IF NOT EXISTS ona_sync_log (
  id TEXT PRIMARY KEY,
  ona_link_id TEXT NOT NULL REFERENCES ona_links(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('forecast', 'fault', 'metering', 'asset', 'market_signal')),
  direction TEXT NOT NULL CHECK (direction IN ('ona_to_nxt', 'nxt_to_ona')),
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error')),
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ona_sync_log_link ON ona_sync_log(ona_link_id);
CREATE INDEX IF NOT EXISTS idx_ona_sync_log_type ON ona_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_ona_sync_log_started ON ona_sync_log(started_at DESC);

-- ============================================================
-- PART 2: Seed data for default admin (for testing)
-- ============================================================

-- Insert placeholder Ona link for admin (for testing - should be removed in production)
-- NOTE: This is for development/testing only. Real links should be created via the UI.

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run separately after migration)
-- ============================================================

-- SELECT 'Module' as entity, COUNT(*) as count FROM platform_modules WHERE id = 'MOD_ONA'
-- UNION ALL SELECT 'Links' as entity, COUNT(*) as count FROM ona_links
-- UNION ALL SELECT 'Asset Maps' as entity, COUNT(*) as count FROM ona_asset_map
-- UNION ALL SELECT 'Sync Logs' as entity, COUNT(*) as count FROM ona_sync_log;
