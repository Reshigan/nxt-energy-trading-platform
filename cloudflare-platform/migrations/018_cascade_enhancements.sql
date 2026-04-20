-- Migration 018: Cascade Engine Enhancements + Fee Schedule + Platform Modules
-- Adds fund_nav_history table, fee_schedule data, and platform_modules entries

-- ─── FUND NAV HISTORY TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fund_nav_history (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  nav_cents INTEGER NOT NULL,
  record_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS idx_fund_nav_participant ON fund_nav_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_fund_nav_date ON fund_nav_history(record_date);

-- ─── WATCHLIST TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lender_watchlist (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'amber',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_participant ON lender_watchlist(participant_id);

-- ─── FEE SCHEDULE SEED DATA ───────────────────────────────────────────────────
INSERT OR IGNORE INTO fee_schedule (id, fee_type, description, rate, basis, minimum_cents, maximum_cents, active) VALUES
('FEE001', 'trading', 'Trade execution fee (0.15%)', 0.0015, 'percentage', 100, 1000000, 1),
('FEE002', 'settlement', 'Settlement processing fee', 0.0005, 'percentage', 50, 500000, 1),
('FEE003', 'listing', 'Marketplace listing fee', 5000, 'fixed', 5000, 5000, 1),
('FEE004', 'carbon_retirement', 'Carbon credit retirement fee', 25, 'per_unit', 2500, 250000, 1),
('FEE005', 'option_premium', 'Option premium processing', 0.005, 'percentage', 1000, 500000, 1),
('FEE006', 'document_generation', 'Contract document fee', 2500, 'fixed', 2500, 2500, 1);

-- ─── PLATFORM MODULES ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO platform_modules (id, name, display_name, category, enabled_global, sort_order) VALUES
('MOD_VPP', 'vpp', 'Virtual Power Plant', 'advanced', 0, 54),
('MOD_SCHED', 'scheduling', 'Scheduling & Nominations', 'trading', 1, 13),
('MOD_CURVES', 'forward_curves', 'Forward Price Curves', 'trading', 1, 14),
('MOD_VALUATION', 'ppa_valuation', 'PPA Valuation', 'advanced', 1, 55),
('MOD_DEALROOM', 'deal_room', 'Collaborative Deal Room', 'advanced', 0, 56),
('MOD_ESG_SCORE', 'esg_scoring', 'ESG Scoring', 'compliance', 1, 42),
('MOD_SURV_ENH', 'surveillance', 'Enhanced Surveillance', 'compliance', 1, 43),
('MOD_GRID', 'grid_operations', 'Grid Operations', 'ipp', 1, 32),
('MOD_FUND', 'fund_management', 'Fund Management', 'carbon', 0, 24),
('MOD_PROCURE', 'procurement', 'Procurement & RFP', 'trading', 1, 15);

-- ─── PROCUREMENT TABLES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procurement_rfps (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  volume_mwh_year REAL NOT NULL,
  technology TEXT NOT NULL,
  province TEXT NOT NULL,
  start_date TEXT,
  contract_term_years INTEGER DEFAULT 10,
  max_tariff_cents_kwh REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  bid_count INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES participants(id)
);

CREATE TABLE IF NOT EXISTS procurement_bids (
  id TEXT PRIMARY KEY,
  rfp_id TEXT NOT NULL,
  bidder_id TEXT NOT NULL,
  volume_mwh_year REAL NOT NULL,
  tariff_cents_kwh REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (rfp_id) REFERENCES procurement_rfps(id),
  FOREIGN KEY (bidder_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS idx_rfps_creator ON procurement_rfps(creator_id);
CREATE INDEX IF NOT EXISTS idx_bids_rfp ON procurement_bids(rfp_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON procurement_bids(bidder_id);
