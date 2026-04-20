-- Migration 016: Spec 12 — World-Leader Enhancements (25 features)

-- 1.1 TOU Pricing Engine
CREATE TABLE IF NOT EXISTS tou_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'eskom',
  effective_date TEXT NOT NULL,
  peak_hours TEXT NOT NULL,
  standard_hours TEXT NOT NULL,
  offpeak_hours TEXT NOT NULL,
  peak_rate_cents INTEGER NOT NULL,
  standard_rate_cents INTEGER NOT NULL,
  offpeak_rate_cents INTEGER NOT NULL,
  season TEXT DEFAULT 'summer' CHECK (season IN ('summer','winter')),
  demand_charge_cents_kva INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tou_trade_periods (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(id),
  period TEXT NOT NULL CHECK (period IN ('peak','standard','offpeak')),
  volume_kwh REAL NOT NULL,
  rate_cents INTEGER NOT NULL,
  value_cents INTEGER NOT NULL
);

-- 1.2 Forward Price Curves
CREATE TABLE IF NOT EXISTS forward_curves (
  id TEXT PRIMARY KEY,
  market TEXT NOT NULL,
  curve_date TEXT NOT NULL,
  tenor_months INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  confidence_lower_cents INTEGER,
  confidence_upper_cents INTEGER,
  model TEXT DEFAULT 'regression',
  inputs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(market, curve_date, tenor_months)
);

-- 1.3 Scheduling & Nominations
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(id),
  contract_id TEXT REFERENCES contract_documents(id),
  delivery_date TEXT NOT NULL,
  delivery_period TEXT NOT NULL CHECK (delivery_period IN ('peak','standard','offpeak','baseload','shaped')),
  nominated_volume_kwh REAL NOT NULL,
  confirmed_volume_kwh REAL,
  connection_point TEXT NOT NULL,
  generator_id TEXT NOT NULL REFERENCES participants(id),
  offtaker_id TEXT NOT NULL REFERENCES participants(id),
  grid_operator_id TEXT REFERENCES participants(id),
  nomination_status TEXT DEFAULT 'draft' CHECK (nomination_status IN ('draft','nominated','confirmed','rejected','delivered','settled')),
  nominated_at TEXT,
  confirmed_at TEXT,
  grid_confirmed_at TEXT,
  metered_volume_kwh REAL,
  imbalance_kwh REAL,
  imbalance_cost_cents INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 1.4 Multi-Currency
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'ZAR',
  target_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  source TEXT DEFAULT 'manual',
  effective_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3.2 Collaborative Deal Room
CREATE TABLE IF NOT EXISTS deal_rooms (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contract_documents(id),
  created_by TEXT NOT NULL REFERENCES participants(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','expired')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deal_room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES deal_rooms(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','proposal','counter','accept','reject','system')),
  content TEXT NOT NULL,
  field_changes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3.3 Demand Response / VPP
CREATE TABLE IF NOT EXISTS vpp_assets (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('solar_rooftop','battery','ev_charger','diesel_genset','load_curtailment')),
  capacity_kw REAL NOT NULL,
  available_kw REAL NOT NULL,
  location_lat REAL,
  location_lng REAL,
  connection_point TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','dispatched','offline','maintenance')),
  last_heartbeat TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vpp_dispatch_events (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('load_shedding','price_spike','grid_frequency','manual','scheduled')),
  load_shedding_stage INTEGER,
  total_dispatched_kw REAL,
  assets_dispatched INTEGER,
  revenue_cents INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled'))
);

-- 4.1 WhatsApp Bot
CREATE TABLE IF NOT EXISTS whatsapp_links (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  phone_number TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  otp_code TEXT,
  otp_expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4.3 Mobile Trade Alerts
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  market TEXT NOT NULL,
  target_price_cents INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above','below')),
  triggered INTEGER DEFAULT 0,
  triggered_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2.3 Data Retention: archival_log
CREATE TABLE IF NOT EXISTS archival_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  records_archived INTEGER NOT NULL,
  r2_key TEXT,
  archived_at TEXT DEFAULT (datetime('now'))
);

-- ESG scores cache
CREATE TABLE IF NOT EXISTS esg_scores (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  renewable_energy_score REAL DEFAULT 0,
  carbon_offset_score REAL DEFAULT 0,
  bbbee_score REAL DEFAULT 0,
  governance_score REAL DEFAULT 0,
  community_impact_score REAL DEFAULT 0,
  transparency_score REAL DEFAULT 0,
  total_score REAL DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  calculated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(participant_id)
);

-- Surveillance alerts persistent table
CREATE TABLE IF NOT EXISTS surveillance_alerts (
  id TEXT PRIMARY KEY,
  rule_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  participant_id TEXT REFERENCES participants(id),
  description TEXT NOT NULL,
  evidence TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
  investigator_id TEXT REFERENCES participants(id),
  resolution_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Saved scenarios
CREATE TABLE IF NOT EXISTS saved_scenarios (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  name TEXT NOT NULL,
  scenarios_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Dead letter queue for error recovery
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  error_message TEXT,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','retrying','completed','failed')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed TOU profiles for Eskom
INSERT OR IGNORE INTO tou_profiles (id, name, provider, effective_date, peak_hours, standard_hours, offpeak_hours, peak_rate_cents, standard_rate_cents, offpeak_rate_cents, season, demand_charge_cents_kva)
VALUES
  ('tou-eskom-summer-2026', 'Eskom Megaflex Summer 2026', 'eskom', '2026-04-01', '["06:00-09:00","17:00-20:00"]', '["09:00-17:00","20:00-22:00"]', '["22:00-06:00"]', 385, 145, 82, 'summer', 5200),
  ('tou-eskom-winter-2026', 'Eskom Megaflex Winter 2026', 'eskom', '2026-06-01', '["06:00-09:00","17:00-19:00"]', '["09:00-17:00","19:00-22:00"]', '["22:00-06:00"]', 520, 195, 95, 'winter', 7800),
  ('tou-coj-summer-2026', 'City of Joburg Summer 2026', 'municipal', '2026-04-01', '["07:00-10:00","18:00-20:00"]', '["10:00-18:00","20:00-22:00"]', '["22:00-07:00"]', 410, 165, 98, 'summer', 4800),
  ('tou-coj-winter-2026', 'City of Joburg Winter 2026', 'municipal', '2026-06-01', '["07:00-10:00","17:00-19:00"]', '["10:00-17:00","19:00-22:00"]', '["22:00-07:00"]', 555, 210, 108, 'winter', 7200);

-- Seed exchange rates
INSERT OR IGNORE INTO exchange_rates (id, base_currency, target_currency, rate, source, effective_date)
VALUES
  ('fx-zar-usd', 'ZAR', 'USD', 0.054, 'manual', '2026-04-01'),
  ('fx-zar-eur', 'ZAR', 'EUR', 0.049, 'manual', '2026-04-01'),
  ('fx-zar-gbp', 'ZAR', 'GBP', 0.042, 'manual', '2026-04-01');

-- Add dispatch_event_id to vpp_assets for event-scoped release
ALTER TABLE vpp_assets ADD COLUMN dispatch_event_id TEXT REFERENCES vpp_dispatch_events(id);
