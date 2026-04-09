/** Test fixture seed data for all 35 tables */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  registration_number TEXT,
  participant_type TEXT NOT NULL CHECK(participant_type IN ('admin','generator','trader','carbon_fund','offtaker','lender','grid')),
  contact_name TEXT,
  contact_email TEXT UNIQUE,
  phone TEXT,
  province TEXT,
  bbbee_level INTEGER,
  kyc_status TEXT DEFAULT 'pending' CHECK(kyc_status IN ('pending','in_review','verified','rejected','suspended')),
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  developer_id TEXT REFERENCES participants(id),
  technology TEXT CHECK(technology IN ('solar','wind','hydro','biomass','gas','battery','hybrid')),
  capacity_mw REAL,
  province TEXT,
  status TEXT DEFAULT 'development',
  completion_pct INTEGER DEFAULT 0,
  grid_connection_status TEXT DEFAULT 'not_applied',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id),
  direction TEXT NOT NULL CHECK(direction IN ('buy','sell')),
  market TEXT NOT NULL,
  volume REAL NOT NULL,
  price_cents INTEGER,
  order_type TEXT DEFAULT 'limit',
  validity TEXT DEFAULT 'day',
  status TEXT DEFAULT 'open',
  gtd_expiry TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  buy_order_id TEXT,
  sell_order_id TEXT,
  buyer_id TEXT,
  seller_id TEXT,
  market TEXT,
  volume REAL,
  price_cents INTEGER,
  total_cents INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carbon_credits (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  owner_id TEXT REFERENCES participants(id),
  vintage_year INTEGER,
  volume_tonnes REAL,
  status TEXT DEFAULT 'active',
  registry TEXT,
  serial_number TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT,
  status TEXT DEFAULT 'draft',
  phase TEXT DEFAULT 'negotiation',
  version_major INTEGER DEFAULT 1,
  version_minor INTEGER DEFAULT 0,
  parties TEXT,
  created_by TEXT,
  sha256_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  from_participant TEXT,
  to_participant TEXT,
  amount_cents INTEGER,
  status TEXT DEFAULT 'outstanding',
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS escrows (
  id TEXT PRIMARY KEY,
  trade_id TEXT,
  depositor_id TEXT,
  beneficiary_id TEXT,
  amount_cents INTEGER,
  status TEXT DEFAULT 'created',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  complainant_id TEXT,
  respondent_id TEXT,
  trade_id TEXT,
  reason TEXT,
  status TEXT DEFAULT 'filed',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  title TEXT,
  body TEXT,
  type TEXT DEFAULT 'info',
  entity_type TEXT,
  entity_id TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS licences (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  licence_type TEXT,
  licence_number TEXT,
  issuing_authority TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statutory_checks (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  check_type TEXT,
  status TEXT DEFAULT 'pending',
  details TEXT,
  checked_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT,
  target_date TEXT,
  completion_date TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conditions_precedent (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  deadline TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS carbon_options (
  id TEXT PRIMARY KEY,
  option_type TEXT DEFAULT 'call',
  writer_id TEXT,
  holder_id TEXT,
  underlying_credit_id TEXT,
  strike_price_cents INTEGER,
  premium_cents INTEGER,
  volume_tonnes REAL,
  expiry_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meter_readings (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  reading_kwh REAL,
  interval_start TEXT,
  interval_end TEXT,
  validated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT,
  listing_type TEXT,
  title TEXT,
  description TEXT,
  price_cents INTEGER,
  status TEXT DEFAULT 'active',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS p2p_trades (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  offer_type TEXT CHECK(offer_type IN ('buy','sell')),
  volume_kwh REAL,
  price_cents_per_kwh INTEGER,
  distribution_zone TEXT,
  status TEXT DEFAULT 'open',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_metrics (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  var_95 REAL,
  var_99 REAL,
  cvar REAL,
  sharpe_ratio REAL,
  max_drawdown REAL,
  counterparty_exposure TEXT,
  stress_test_results TEXT,
  calculated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fee_schedule (
  id TEXT PRIMARY KEY,
  fee_type TEXT,
  description TEXT,
  rate_bps INTEGER,
  min_cents INTEGER,
  max_cents INTEGER,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  participant_id TEXT,
  signatory_name TEXT,
  signatory_designation TEXT,
  signed INTEGER DEFAULT 0,
  signed_at TEXT,
  document_hash_at_signing TEXT,
  certificate_serial TEXT,
  chain_hash TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_signatories (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  participant_id TEXT,
  signatory_name TEXT,
  signatory_designation TEXT,
  signed INTEGER DEFAULT 0,
  signed_at TEXT,
  document_hash_at_signing TEXT,
  certificate_serial TEXT,
  chain_hash TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disbursements (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  amount_cents INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT (datetime('now'))
);
`;

export const SEED_SQL = `
INSERT INTO participants (id, company_name, registration_number, participant_type, contact_name, contact_email, phone, province, bbbee_level, kyc_status, password_hash)
VALUES
  ('P001', 'Admin Corp', '2020/100001/07', 'admin', 'Admin User', 'admin@test.co.za', '+27110000001', 'Gauteng', 1, 'verified', 'hash_admin'),
  ('P002', 'Solar Gen', '2020/100002/07', 'generator', 'Gen User', 'gen@test.co.za', '+27110000002', 'Limpopo', 2, 'verified', 'hash_gen'),
  ('P003', 'Trade Co', '2020/100003/07', 'trader', 'Trader User', 'trader@test.co.za', '+27110000003', 'Gauteng', 1, 'verified', 'hash_trader'),
  ('P004', 'Carbon Fund', '2020/100004/07', 'carbon_fund', 'Fund User', 'fund@test.co.za', '+27110000004', 'Western Cape', 3, 'verified', 'hash_fund'),
  ('P005', 'Offtaker Ltd', '2020/100005/07', 'offtaker', 'Off User', 'off@test.co.za', '+27110000005', 'KwaZulu-Natal', 2, 'verified', 'hash_off');

INSERT INTO projects (id, name, developer_id, technology, capacity_mw, province, status, completion_pct, grid_connection_status)
VALUES
  ('PRJ001', 'Test Solar Farm', 'P002', 'solar', 50.0, 'Limpopo', 'construction', 65, 'approved'),
  ('PRJ002', 'Test Wind Park', 'P004', 'wind', 100.0, 'Eastern Cape', 'financial_close', 40, 'pending');

INSERT INTO orders (id, participant_id, direction, market, volume, price_cents, order_type, validity, status)
VALUES
  ('ORD001', 'P003', 'buy', 'solar', 10.0, 12500, 'limit', 'gtc', 'open'),
  ('ORD002', 'P002', 'sell', 'solar', 15.0, 12800, 'limit', 'gtc', 'open'),
  ('ORD003', 'P003', 'buy', 'wind', 20.0, 11000, 'limit', 'day', 'open');

INSERT INTO trades (id, buy_order_id, sell_order_id, buyer_id, seller_id, market, volume, price_cents, total_cents, status)
VALUES
  ('TRD001', 'ORD001', 'ORD002', 'P003', 'P002', 'solar', 5.0, 12500, 62500, 'settled'),
  ('TRD002', 'ORD001', 'ORD002', 'P003', 'P002', 'solar', 3.0, 12600, 37800, 'pending');

INSERT INTO carbon_credits (id, project_id, owner_id, vintage_year, volume_tonnes, status, registry, serial_number)
VALUES
  ('CC001', 'PRJ001', 'P004', 2024, 1000, 'active', 'gold_standard', 'GS-2024-001'),
  ('CC002', 'PRJ002', 'P004', 2024, 500, 'active', 'verra', 'VCS-2024-001');

INSERT INTO contract_documents (id, title, document_type, status, phase, version_major, version_minor, parties, created_by, sha256_hash)
VALUES
  ('DOC001', 'Test PPA Agreement', 'ppa', 'active', 'execution', 1, 0, '["P002","P005"]', 'P002', 'abc123hash'),
  ('DOC002', 'Test Term Sheet', 'term_sheet', 'pending_signature', 'signing', 1, 0, '["P003","P005"]', 'P003', 'def456hash');

INSERT INTO invoices (id, from_participant, to_participant, amount_cents, status, due_date)
VALUES
  ('INV001', 'P002', 'P005', 6250000, 'outstanding', '2025-05-01'),
  ('INV002', 'P002', 'P005', 3780000, 'paid', '2025-04-01');

INSERT INTO notifications (id, participant_id, title, body, type, read)
VALUES
  ('N001', 'P001', 'Welcome', 'Welcome to NXT', 'info', 0),
  ('N002', 'P001', 'Trade Executed', 'Your trade TRD001 was filled', 'trade', 1),
  ('N003', 'P003', 'Order Placed', 'Your buy order was placed', 'trade', 0);

INSERT INTO fee_schedule (id, fee_type, description, rate_bps, min_cents, max_cents, active)
VALUES
  ('FEE001', 'trading', 'Standard trading fee', 15, 100, 50000, 1),
  ('FEE002', 'carbon', 'Carbon credit transfer fee', 25, 200, 100000, 1);

INSERT INTO licences (id, participant_id, licence_type, licence_number, issuing_authority, issue_date, expiry_date, status)
VALUES
  ('L001', 'P002', 'generation', 'GEN-TEST-001', 'NERSA', '2024-01-01', '2027-01-01', 'active');

INSERT INTO statutory_checks (id, participant_id, check_type, status, details, checked_at)
VALUES
  ('SC001', 'P002', 'cipc', 'pass', 'CIPC verified', '2024-02-01T09:00:00Z'),
  ('SC002', 'P002', 'sars', 'pass', 'Tax clearance valid', '2024-02-01T09:01:00Z');
`;
