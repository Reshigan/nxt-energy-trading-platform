-- Spec 13+14: Platform Evolution + Role-Complete Platform
-- Entity Threads (Spec 13 Shift 2)
CREATE TABLE IF NOT EXISTS entity_threads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'comment' CHECK (message_type IN ('comment','question','decision','approval','rejection','file')),
  parent_id TEXT REFERENCES entity_threads(id),
  attachment_r2_key TEXT,
  attachment_name TEXT,
  read_by TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_threads_entity ON entity_threads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_threads_participant ON entity_threads(participant_id);

-- Intelligence Items (Spec 13 Shift 4)
CREATE TABLE IF NOT EXISTS intelligence_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  category TEXT NOT NULL CHECK (category IN ('opportunity','risk','action','insight','prediction')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical','warning','info','positive')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT,
  action_url TEXT,
  data TEXT,
  source_module TEXT NOT NULL,
  auto_generated INTEGER DEFAULT 1,
  acknowledged INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intelligence_participant ON intelligence_items(participant_id, acknowledged);

-- Calendar Custom Events (Spec 13 Shift 3)
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  event_type TEXT DEFAULT 'custom' CHECK (event_type IN ('custom','reminder','meeting','deadline')),
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);

-- First-Deal Concierge Progress (Spec 13 Shift 10)
CREATE TABLE IF NOT EXISTS concierge_progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id),
  current_step INTEGER DEFAULT 1,
  completed_steps TEXT DEFAULT '[]',
  dismissed INTEGER DEFAULT 0,
  first_contract_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Grid Connections (Spec 14 Role A)
CREATE TABLE IF NOT EXISTS grid_connections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id),
  connection_point TEXT NOT NULL,
  applied_capacity_mw REAL NOT NULL,
  allocated_capacity_mw REAL,
  voltage_level TEXT,
  applicant_id TEXT NOT NULL REFERENCES participants(id),
  grid_operator_id TEXT NOT NULL REFERENCES participants(id),
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied','quoted','agreement_signed','under_construction','energised','rejected')),
  quote_amount_cents INTEGER,
  agreement_date TEXT,
  energised_date TEXT,
  loss_factor REAL DEFAULT 0.03,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_grid_connections_status ON grid_connections(status);

-- Lender Watchlist (Spec 14 Role B)
CREATE TABLE IF NOT EXISTS lender_watchlist (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id),
  lender_id TEXT NOT NULL REFERENCES participants(id),
  trigger_reason TEXT NOT NULL,
  exposure_cents INTEGER DEFAULT 0,
  provisioning_cents INTEGER DEFAULT 0,
  notes TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  removed_at TEXT,
  active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON lender_watchlist(lender_id, active);

-- RFP Tables (Spec 14 Role D)
CREATE TABLE IF NOT EXISTS procurement_rfps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  offtaker_id TEXT NOT NULL REFERENCES participants(id),
  title TEXT NOT NULL,
  volume_mwh REAL NOT NULL,
  technology TEXT,
  location TEXT,
  tou_profile TEXT,
  contract_term_years INTEGER,
  start_date TEXT,
  max_tariff_cents INTEGER,
  total_budget_cents INTEGER,
  bbbee_min_level INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','closed','awarded')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procurement_bids (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rfp_id TEXT NOT NULL REFERENCES procurement_rfps(id),
  generator_id TEXT NOT NULL REFERENCES participants(id),
  tariff_cents INTEGER NOT NULL,
  volume_mwh REAL,
  technology TEXT,
  location TEXT,
  bbbee_level INTEGER,
  track_record TEXT,
  esg_score INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','selected','rejected')),
  weighted_score REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bids_rfp ON procurement_bids(rfp_id);

-- Document metadata for intelligence (Spec 13 Shift 5)
-- Add extracted_metadata column to contract_documents if not exists
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a safe approach
CREATE TABLE IF NOT EXISTS document_metadata (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id TEXT NOT NULL,
  tariff_cents_kwh REAL,
  escalation_formula TEXT,
  annual_volume_mwh REAL,
  contract_term_years INTEGER,
  delivery_point TEXT,
  take_or_pay_pct REAL,
  penalty_rate REAL,
  effective_date TEXT,
  expiry_date TEXT,
  parties TEXT,
  governing_law TEXT,
  special_conditions TEXT,
  raw_text_preview TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_doc_metadata_document ON document_metadata(document_id);
