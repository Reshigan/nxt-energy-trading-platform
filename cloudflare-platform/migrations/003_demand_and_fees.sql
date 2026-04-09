-- Migration 003: Demand profiles, bill uploads, and fees tables
-- Phase 0.9: Create demand_profiles + bill_uploads tables

CREATE TABLE IF NOT EXISTS demand_profiles (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  company_name TEXT NOT NULL,
  annual_kwh INTEGER NOT NULL DEFAULT 0,
  peak_kw INTEGER NOT NULL DEFAULT 0,
  monthly_spend_cents INTEGER NOT NULL DEFAULT 0,
  load_factor REAL NOT NULL DEFAULT 0.0,
  supply_type TEXT NOT NULL DEFAULT 'grid',
  province TEXT NOT NULL DEFAULT 'Gauteng',
  municipality TEXT,
  grid_connection TEXT DEFAULT 'medium_voltage',
  time_of_use_profile TEXT,
  renewable_preference REAL DEFAULT 0.5,
  contract_term_months INTEGER DEFAULT 120,
  max_price_cents_kwh INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'complete', 'matched', 'contracted')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bill_uploads (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES demand_profiles(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  filename TEXT NOT NULL,
  month TEXT NOT NULL,
  kwh_usage INTEGER NOT NULL DEFAULT 0,
  peak_kw INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  tariff_category TEXT,
  r2_key TEXT,
  parsed_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demand_matches (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES demand_profiles(id),
  project_id TEXT,
  match_score REAL NOT NULL DEFAULT 0.0,
  match_type TEXT NOT NULL DEFAULT 'ai' CHECK(match_type IN ('ai', 'manual', 'marketplace')),
  price_cents_kwh INTEGER,
  volume_kwh INTEGER,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested', 'interested', 'loi_sent', 'contracted', 'rejected')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fees (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  fee_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'invoiced', 'paid', 'waived')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demand_profiles_participant ON demand_profiles(participant_id);
CREATE INDEX IF NOT EXISTS idx_demand_profiles_status ON demand_profiles(status);
CREATE INDEX IF NOT EXISTS idx_bill_uploads_profile ON bill_uploads(profile_id);
CREATE INDEX IF NOT EXISTS idx_demand_matches_profile ON demand_matches(profile_id);
CREATE INDEX IF NOT EXISTS idx_demand_matches_status ON demand_matches(status);
CREATE INDEX IF NOT EXISTS idx_fees_participant ON fees(participant_id);
CREATE INDEX IF NOT EXISTS idx_fees_entity ON fees(entity_type, entity_id);
