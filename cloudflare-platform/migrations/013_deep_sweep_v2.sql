-- Migration 013: Deep Sweep V2 — Create missing tables referenced in code
-- These tables are used by routes but were never created in schema or migrations

-- surveillance_alerts: used by surveillance_tools.ts
CREATE TABLE IF NOT EXISTS surveillance_alerts (
  id TEXT PRIMARY KEY,
  market TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- trading_rules: used by algo.ts
CREATE TABLE IF NOT EXISTS trading_rules (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  market TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold REAL NOT NULL,
  action TEXT NOT NULL,
  volume REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','executed','cancelled')),
  executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- vault_documents: used by esg_reporting.ts, lifecycle.ts
CREATE TABLE IF NOT EXISTS vault_documents (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  type TEXT NOT NULL,
  content_json TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived','revoked')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- project_cps (conditions precedent): used by ipp_tools.ts, lifecycle.ts
CREATE TABLE IF NOT EXISTS project_cps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  cp_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','waived','failed')),
  verified_at TEXT,
  verifier_id TEXT REFERENCES participants(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- lender_disbursements: used by lifecycle.ts
CREATE TABLE IF NOT EXISTS lender_disbursements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  tranche_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','disbursed','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- metering_readings: used by cascade.ts, lifecycle.ts, iot.ts
-- Note: Two different schemas are used in code — union of all columns
CREATE TABLE IF NOT EXISTS metering_readings (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  participant_id TEXT,
  meter_id TEXT,
  plant_id TEXT,
  timestamp TEXT NOT NULL,
  kwh_delivered REAL DEFAULT 0,
  kwh_generated REAL DEFAULT 0,
  value_mwh REAL DEFAULT 0,
  performance_ratio REAL,
  validated INTEGER DEFAULT 0,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_surveillance_alerts_status ON surveillance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_trading_rules_participant ON trading_rules(participant_id);
CREATE INDEX IF NOT EXISTS idx_trading_rules_market_status ON trading_rules(market, status);
CREATE INDEX IF NOT EXISTS idx_vault_documents_participant ON vault_documents(participant_id);
CREATE INDEX IF NOT EXISTS idx_project_cps_project ON project_cps(project_id);
CREATE INDEX IF NOT EXISTS idx_lender_disbursements_project ON lender_disbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_metering_readings_project ON metering_readings(project_id);
CREATE INDEX IF NOT EXISTS idx_metering_readings_participant ON metering_readings(participant_id);
CREATE INDEX IF NOT EXISTS idx_metering_readings_timestamp ON metering_readings(timestamp);
