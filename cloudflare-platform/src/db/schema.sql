-- NXT Energy Trading Platform — D1 Schema (22 tables)
-- All monetary values stored as INTEGER (cents)
-- All IDs as TEXT (hex(randomblob(16)))
-- All timestamps as TEXT (ISO 8601 UTC)

-- 1. Participants
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  tax_number TEXT NOT NULL,
  vat_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','ipp','trader','carbon_fund','offtaker','lender','grid')),
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  phone TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  sa_id_number TEXT,
  bbbee_level INTEGER CHECK (bbbee_level BETWEEN 1 AND 8),
  nersa_licence TEXT,
  fsca_licence TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','verified','rejected','suspended')),
  trading_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 2. Projects (IPP)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  developer_id TEXT NOT NULL REFERENCES participants(id),
  technology TEXT NOT NULL CHECK (technology IN ('solar','wind','hydro','biomass','gas','battery','hybrid')),
  capacity_mw REAL NOT NULL,
  location TEXT NOT NULL,
  province TEXT,
  phase TEXT NOT NULL DEFAULT 'development' CHECK (phase IN ('development','financial_close','construction','commissioning','commercial_ops')),
  estimated_cod TEXT,
  actual_cod TEXT,
  total_cost_cents INTEGER,
  debt_ratio REAL,
  equity_ratio REAL,
  offtaker_id TEXT REFERENCES participants(id),
  lender_id TEXT REFERENCES participants(id),
  grid_operator_id TEXT REFERENCES participants(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 3. Contract Documents
CREATE TABLE IF NOT EXISTS contract_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('loi','term_sheet','hoa','ppa_wheeling','ppa_btm','carbon_purchase','carbon_option_isda','forward','epc','wheeling_agreement','side_letter','nda')),
  phase TEXT NOT NULL DEFAULT 'draft' CHECK (phase IN ('draft','loi','term_sheet','hoa','draft_agreement','legal_review','statutory_check','execution','active','amended','terminated')),
  creator_id TEXT NOT NULL REFERENCES participants(id),
  counterparty_id TEXT NOT NULL REFERENCES participants(id),
  project_id TEXT REFERENCES projects(id),
  commercial_terms TEXT, -- JSON
  r2_key TEXT,
  template_id TEXT REFERENCES document_templates(id),
  version TEXT NOT NULL DEFAULT 'v1.0',
  previous_version_id TEXT REFERENCES contract_documents(id),
  sha256_hash TEXT,
  page_count INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 4. Document Signatories
CREATE TABLE IF NOT EXISTS document_signatories (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES contract_documents(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  signatory_name TEXT NOT NULL,
  signatory_designation TEXT NOT NULL,
  signed INTEGER NOT NULL DEFAULT 0,
  signed_at TEXT,
  signature_r2_key TEXT,
  ip_address TEXT,
  document_hash_at_signing TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 5. Statutory Checks
CREATE TABLE IF NOT EXISTS statutory_checks (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('participant','document','project')),
  entity_id TEXT NOT NULL,
  regulation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','pass','fail','exempt','overridden')),
  method TEXT NOT NULL CHECK (method IN ('auto','manual')),
  source TEXT,
  reason TEXT,
  checked_at TEXT,
  override_by TEXT REFERENCES participants(id),
  override_reason TEXT,
  override_at TEXT,
  evidence_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 6. Trades
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES participants(id),
  seller_id TEXT NOT NULL REFERENCES participants(id),
  market TEXT NOT NULL CHECK (market IN ('solar','wind','hydro','gas','carbon','battery')),
  volume REAL NOT NULL,
  price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','disputed','cancelled')),
  settled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  direction TEXT NOT NULL CHECK (direction IN ('buy','sell')),
  market TEXT NOT NULL CHECK (market IN ('solar','wind','hydro','gas','carbon','battery')),
  volume REAL NOT NULL,
  filled_volume REAL NOT NULL DEFAULT 0,
  price_cents INTEGER,
  order_type TEXT NOT NULL CHECK (order_type IN ('limit','market','stop_loss','take_profit','iceberg')),
  validity TEXT NOT NULL DEFAULT 'gtc' CHECK (validity IN ('gtc','day','ioc','fok','gtd')),
  gtd_expiry TEXT,
  iceberg_visible_qty REAL,
  iceberg_total_qty REAL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','filled','cancelled','expired')),
  trigger_price_cents INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 8. Carbon Credits
CREATE TABLE IF NOT EXISTS carbon_credits (
  id TEXT PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  registry TEXT NOT NULL CHECK (registry IN ('gold_standard','verra','cdm','voluntary')),
  vintage INTEGER NOT NULL,
  quantity REAL NOT NULL,
  available_quantity REAL NOT NULL,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired','transferred','listed','suspended')),
  owner_id TEXT NOT NULL REFERENCES participants(id),
  sdg_goals TEXT, -- JSON array
  methodology TEXT,
  country TEXT,
  retirement_purpose TEXT,
  retirement_beneficiary TEXT,
  retirement_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 9. Carbon Options
CREATE TABLE IF NOT EXISTS carbon_options (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('call','put','collar','spread','barrier','asian')),
  underlying_credit_id TEXT REFERENCES carbon_credits(id),
  strike_price_cents INTEGER NOT NULL,
  premium_cents INTEGER NOT NULL,
  quantity REAL NOT NULL,
  expiry TEXT NOT NULL,
  exercise_style TEXT NOT NULL DEFAULT 'european' CHECK (exercise_style IN ('european','american')),
  settlement_type TEXT NOT NULL DEFAULT 'physical' CHECK (settlement_type IN ('physical','cash')),
  writer_id TEXT NOT NULL REFERENCES participants(id),
  holder_id TEXT REFERENCES participants(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','exercised','expired','cancelled')),
  collateral_escrow_id TEXT REFERENCES escrows(id),
  exercised_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 10. Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue','waived')),
  target_date TEXT,
  completed_date TEXT,
  completed_by TEXT REFERENCES participants(id),
  evidence_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 11. Conditions Precedent
CREATE TABLE IF NOT EXISTS conditions_precedent (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal','financial','technical','regulatory','environmental','insurance')),
  status TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding','satisfied','waived')),
  responsible_party TEXT NOT NULL CHECK (responsible_party IN ('ipp','lender','offtaker','grid','admin')),
  due_date TEXT,
  satisfied_date TEXT,
  satisfied_by TEXT REFERENCES participants(id),
  waived_by TEXT REFERENCES participants(id),
  waive_reason TEXT,
  evidence_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 12. Disbursements
CREATE TABLE IF NOT EXISTS disbursements (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  amount_cents INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  milestone_id TEXT REFERENCES milestones(id),
  invoice_r2_key TEXT,
  ie_certification INTEGER NOT NULL DEFAULT 0,
  ie_certified_by TEXT REFERENCES participants(id),
  ie_certified_at TEXT,
  lender_approval INTEGER NOT NULL DEFAULT 0,
  lender_approved_by TEXT REFERENCES participants(id),
  lender_approved_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ie_certified','approved','disbursed','rejected')),
  disbursed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 13. Escrows
CREATE TABLE IF NOT EXISTS escrows (
  id TEXT PRIMARY KEY,
  trade_id TEXT REFERENCES trades(id),
  option_id TEXT REFERENCES carbon_options(id),
  depositor_id TEXT NOT NULL REFERENCES participants(id),
  beneficiary_id TEXT REFERENCES participants(id),
  amount_cents INTEGER NOT NULL,
  conditions TEXT, -- JSON
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','funded','held','released','disputed','expired')),
  funded_at TEXT,
  released_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 14. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  contract_doc_id TEXT REFERENCES contract_documents(id),
  trade_id TEXT REFERENCES trades(id),
  from_participant_id TEXT NOT NULL REFERENCES participants(id),
  to_participant_id TEXT NOT NULL REFERENCES participants(id),
  description TEXT,
  subtotal_cents INTEGER NOT NULL,
  shortfall_penalty_cents INTEGER NOT NULL DEFAULT 0,
  vat_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  metered_volume REAL,
  contracted_volume REAL,
  unit_rate_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','outstanding','paid','overdue','cancelled')),
  due_date TEXT,
  paid_at TEXT,
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 15. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  claimant_id TEXT NOT NULL REFERENCES participants(id),
  respondent_id TEXT NOT NULL REFERENCES participants(id),
  category TEXT NOT NULL CHECK (category IN ('settlement','delivery','quality','payment','contractual','other')),
  description TEXT NOT NULL,
  value_cents INTEGER NOT NULL,
  trade_id TEXT REFERENCES trades(id),
  contract_id TEXT REFERENCES contract_documents(id),
  status TEXT NOT NULL DEFAULT 'filed' CHECK (status IN ('filed','under_review','evidence_phase','counter_claim','mediation','resolved','escalated')),
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 16. KYC Documents
CREATE TABLE IF NOT EXISTS kyc_documents (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('id_document','proof_of_address','tax_clearance','bbbee_certificate','company_registration','directors_resolution','bank_confirmation','financial_statements','nersa_licence','fsca_licence','environmental_authorisation','grid_connection','insurance_certificate','construction_permit','power_purchase_agreement','other')),
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  auto_verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT REFERENCES participants(id),
  verified_at TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 17. Licences
CREATE TABLE IF NOT EXISTS licences (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  type TEXT NOT NULL CHECK (type IN ('nersa_generation','nersa_trading','fsca_otc','fsca_fais','cidb_contractor')),
  licence_number TEXT NOT NULL,
  registry TEXT,
  issued_date TEXT,
  expiry_date TEXT,
  auto_verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','suspended','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info','success','warning','danger','trade','contract','compliance','settlement')),
  read INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 19. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES participants(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT, -- JSON
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 20. Fee Schedule
CREATE TABLE IF NOT EXISTS fee_schedule (
  id TEXT PRIMARY KEY,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('trading','settlement','listing','carbon_retirement','option_premium','document_generation')),
  description TEXT,
  rate REAL NOT NULL,
  basis TEXT NOT NULL CHECK (basis IN ('percentage','fixed','per_unit')),
  minimum_cents INTEGER NOT NULL DEFAULT 0,
  maximum_cents INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 21. Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES participants(id),
  type TEXT NOT NULL CHECK (type IN ('energy','carbon','rfp')),
  technology TEXT,
  capacity_mw REAL,
  volume REAL,
  price_cents INTEGER,
  tenor_months INTEGER,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','expired','withdrawn')),
  bid_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 22. Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('loi','term_sheet','hoa','ppa_wheeling','ppa_btm','carbon_purchase','carbon_option_isda','forward','epc','wheeling_agreement','side_letter','nda')),
  r2_key TEXT,
  version TEXT NOT NULL DEFAULT 'v1.0',
  page_count INTEGER,
  fields TEXT, -- JSON array of fillable field names
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 23. Meter Readings (IoT)
CREATE TABLE IF NOT EXISTS meter_readings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  meter_id TEXT NOT NULL,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('grid_import','grid_export','solar_gen','wind_gen','consumption','battery_charge','battery_discharge')),
  timestamp TEXT NOT NULL,
  value_kwh REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('eskom_ami','solaredge','fronius','sma','manual','webhook')),
  quality TEXT NOT NULL DEFAULT 'actual' CHECK (quality IN ('actual','estimated','validated')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 24. Weather Data
CREATE TABLE IF NOT EXISTS weather_data (
  id TEXT PRIMARY KEY,
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  timestamp TEXT NOT NULL,
  solar_irradiance_whm2 REAL,
  temperature_c REAL,
  wind_speed_ms REAL,
  wind_direction_deg REAL,
  cloud_cover_pct REAL,
  humidity_pct REAL,
  source TEXT NOT NULL DEFAULT 'openmeteo',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 25. AI Optimisations
CREATE TABLE IF NOT EXISTS ai_optimisations (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  algorithm TEXT NOT NULL CHECK (algorithm IN ('min_cost','min_carbon','balanced','max_reliability')),
  demand_profile TEXT, -- JSON array
  available_sources TEXT, -- JSON array
  constraints TEXT, -- JSON
  result_mix TEXT, -- JSON array
  result_cost_cents INTEGER,
  result_carbon_g REAL,
  result_reliability_pct REAL,
  result_saving_cents INTEGER,
  scenarios TEXT, -- JSON array of 4 scenarios
  execution_time_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 26. Risk Metrics
CREATE TABLE IF NOT EXISTS risk_metrics (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  var_95 REAL,
  var_99 REAL,
  cvar REAL,
  sharpe_ratio REAL,
  max_drawdown REAL,
  delta REAL,
  gamma REAL,
  theta REAL,
  vega REAL,
  counterparty_exposure TEXT, -- JSON
  stress_test_results TEXT, -- JSON
  calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 27. Tokenised Assets
CREATE TABLE IF NOT EXISTS tokenised_assets (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('carbon_credit','rec')),
  source_id TEXT NOT NULL,
  token_id TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES participants(id),
  provenance_chain TEXT NOT NULL DEFAULT '[]', -- JSON array
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','transferred','retired','burned')),
  minted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 28. Renewable Energy Certificates (RECs)
CREATE TABLE IF NOT EXISTS recs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  certificate_number TEXT NOT NULL UNIQUE,
  standard TEXT NOT NULL DEFAULT 'i_rec' CHECK (standard IN ('i_rec','tigr','go')),
  volume_mwh REAL NOT NULL,
  vintage_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','transferred','redeemed','cancelled')),
  owner_id TEXT NOT NULL REFERENCES participants(id),
  beneficiary TEXT,
  purpose TEXT,
  redeemed_at TEXT,
  token_id TEXT REFERENCES tokenised_assets(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 29. P2P Trades
CREATE TABLE IF NOT EXISTS p2p_trades (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES participants(id),
  buyer_id TEXT REFERENCES participants(id),
  volume_kwh REAL NOT NULL,
  price_cents_per_kwh INTEGER NOT NULL,
  total_cents INTEGER,
  distribution_zone TEXT NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('sell','buy')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','settled','cancelled','expired')),
  settlement_agent TEXT,
  matched_at TEXT,
  settled_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 30. Smart Contract Rules
CREATE TABLE IF NOT EXISTS smart_contract_rules (
  id TEXT PRIMARY KEY,
  contract_doc_id TEXT NOT NULL REFERENCES contract_documents(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_invoice','auto_settle','auto_penalty','auto_escalation','auto_renewal','metering_trigger','payment_trigger','threshold_alert')),
  trigger_condition TEXT NOT NULL, -- JSON
  action TEXT NOT NULL, -- JSON
  enabled INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 31. Tenants (Multi-Tenant / White-Label)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  industry TEXT,
  primary_color TEXT DEFAULT '#d4e157',
  secondary_color TEXT DEFAULT '#1a2e1a',
  logo_r2_key TEXT,
  branding TEXT, -- JSON
  active INTEGER NOT NULL DEFAULT 1,
  admin_participant_id TEXT REFERENCES participants(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 32. Report Definitions
CREATE TABLE IF NOT EXISTS report_definitions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('portfolio','trading','carbon','compliance','tcfd','custom')),
  query_definition TEXT, -- JSON
  date_range TEXT, -- JSON {from, to}
  filters TEXT, -- JSON
  grouping TEXT, -- JSON array
  metrics TEXT, -- JSON array
  output_format TEXT NOT NULL DEFAULT 'pdf' CHECK (output_format IN ('pdf','xlsx','csv','json')),
  schedule TEXT, -- cron expression
  last_generated_at TEXT,
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 33. API Keys (Developer Portal)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- first 8 chars for identification
  permissions TEXT NOT NULL DEFAULT '[]', -- JSON array
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  last_used_at TEXT,
  expires_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 34. Generation Forecasts
CREATE TABLE IF NOT EXISTS generation_forecasts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  forecast_date TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  predicted_kwh REAL NOT NULL,
  actual_kwh REAL,
  accuracy_pct REAL,
  weather_data_id TEXT REFERENCES weather_data(id),
  model_version TEXT NOT NULL DEFAULT 'v1',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 35. Webhooks (Developer Portal)
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]', -- JSON array
  secret TEXT, -- HMAC signing secret
  active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role);
CREATE INDEX IF NOT EXISTS idx_participants_kyc_status ON participants(kyc_status);
CREATE INDEX IF NOT EXISTS idx_projects_developer ON projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase);
CREATE INDEX IF NOT EXISTS idx_contract_documents_creator ON contract_documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_counterparty ON contract_documents(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_phase ON contract_documents(phase);
CREATE INDEX IF NOT EXISTS idx_statutory_checks_entity ON statutory_checks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);
CREATE INDEX IF NOT EXISTS idx_orders_participant ON orders(participant_id);
CREATE INDEX IF NOT EXISTS idx_orders_market_status ON orders(market, status);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_owner ON carbon_credits(owner_id);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_status ON carbon_credits(status);
CREATE INDEX IF NOT EXISTS idx_carbon_options_writer ON carbon_options(writer_id);
CREATE INDEX IF NOT EXISTS idx_carbon_options_holder ON carbon_options(holder_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_conditions_precedent_project ON conditions_precedent(project_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_project ON disbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_escrows_trade ON escrows(trade_id);
CREATE INDEX IF NOT EXISTS idx_invoices_to ON invoices(to_participant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_claimant ON disputes(claimant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_participant ON kyc_documents(participant_id);
CREATE INDEX IF NOT EXISTS idx_licences_participant ON licences(participant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_participant ON notifications(participant_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON marketplace_listings(type, status);
CREATE INDEX IF NOT EXISTS idx_meter_readings_project ON meter_readings(project_id, meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_timestamp ON meter_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_data_location ON weather_data(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_ai_optimisations_participant ON ai_optimisations(participant_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_participant ON risk_metrics(participant_id);
CREATE INDEX IF NOT EXISTS idx_tokenised_assets_owner ON tokenised_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_tokenised_assets_token ON tokenised_assets(token_id);
CREATE INDEX IF NOT EXISTS idx_recs_project ON recs(project_id);
CREATE INDEX IF NOT EXISTS idx_recs_owner ON recs(owner_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_seller ON p2p_trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_zone ON p2p_trades(distribution_zone, status);
CREATE INDEX IF NOT EXISTS idx_smart_contract_rules_doc ON smart_contract_rules(contract_doc_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_report_definitions_participant ON report_definitions(participant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_participant ON api_keys(participant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_generation_forecasts_project ON generation_forecasts(project_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_webhooks_participant ON webhooks(participant_id);
