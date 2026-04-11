-- Migration 011: National Platform Completion
-- All subsections A1-A11

-- A1: Admin role hierarchy
ALTER TABLE participants ADD COLUMN admin_level TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_admin_level ON participants(admin_level);
UPDATE participants SET admin_level = 'superadmin' WHERE email = 'admin@et.vantax.co.za';

-- A2: Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  assigned_to TEXT REFERENCES participants(id),
  category TEXT NOT NULL CHECK (category IN ('account','kyc','trading','settlement','billing','technical','compliance','other')),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','waiting_on_user','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
  sender_id TEXT NOT NULL REFERENCES participants(id),
  message TEXT NOT NULL,
  is_internal_note INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_participant ON support_tickets(participant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id);

-- A3: Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info','warning','maintenance','update')),
  active INTEGER DEFAULT 1,
  starts_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES participants(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);

-- A4: Platform configuration
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO platform_config (key, value, description, category) VALUES
  ('trading.margin_limit_cents','10000000','Default margin limit per participant (cents)','trading'),
  ('trading.price_band_pct','20','Max deviation from last trade (%)','trading'),
  ('trading.tick_size_cents','100','Min price increment (cents)','trading'),
  ('trading.circuit_breaker_pct','30','Auto-halt threshold (% move in 5min)','trading'),
  ('trading.daily_loss_limit_cents','50000000','Default max daily loss (cents)','trading'),
  ('auth.max_login_attempts','5','Failed logins before lockout','security'),
  ('auth.lockout_seconds','900','Lockout duration (seconds)','security'),
  ('platform.maintenance_mode','0','Maintenance mode (0=off,1=on)','system'),
  ('platform.maintenance_message','Scheduled maintenance in progress.','Maintenance banner text','system'),
  ('compliance.kyc_docs_required','1','Min docs before KYC approval','compliance'),
  ('compliance.sanctions_provider','mock','Sanctions provider (mock/refinitiv)','compliance'),
  ('payment.provider','mock','Payment provider (mock/stitch/ozow)','payment'),
  ('carbon.registry_provider','mock','Registry provider (mock/verra/goldstandard)','carbon');

-- A5: Trading limits per participant
CREATE TABLE IF NOT EXISTS participant_trading_limits (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id),
  max_position_cents INTEGER DEFAULT 100000000,
  max_order_cents INTEGER DEFAULT 10000000,
  max_daily_loss_cents INTEGER DEFAULT 50000000,
  daily_loss_today_cents INTEGER DEFAULT 0,
  daily_loss_reset_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ptl_participant ON participant_trading_limits(participant_id);

-- A6: Market sessions
CREATE TABLE IF NOT EXISTS market_sessions (
  id TEXT PRIMARY KEY,
  market TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'continuous' CHECK (session_type IN ('continuous','auction','call')),
  open_time TEXT NOT NULL DEFAULT '00:00',
  close_time TEXT NOT NULL DEFAULT '23:59',
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri',
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO market_sessions (id, market, session_type, open_time, close_time, days) VALUES
  ('ms-solar','solar','continuous','06:00','18:00','mon,tue,wed,thu,fri'),
  ('ms-wind','wind','continuous','00:00','23:59','mon,tue,wed,thu,fri,sat,sun'),
  ('ms-gas','gas','continuous','08:00','16:00','mon,tue,wed,thu,fri'),
  ('ms-carbon','carbon','continuous','08:00','16:00','mon,tue,wed,thu,fri'),
  ('ms-battery','battery','continuous','00:00','23:59','mon,tue,wed,thu,fri,sat,sun'),
  ('ms-hydro','hydro','continuous','06:00','18:00','mon,tue,wed,thu,fri');

-- A7: Circuit breaker events
CREATE TABLE IF NOT EXISTS circuit_breaker_events (
  id TEXT PRIMARY KEY,
  market TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('price_move','volume_spike','manual')),
  trigger_value TEXT,
  halt_started_at TEXT NOT NULL,
  halt_ended_at TEXT,
  resumed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cb_market ON circuit_breaker_events(market);

-- A8: Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  trade_id TEXT,
  invoice_id TEXT,
  from_participant_id TEXT NOT NULL REFERENCES participants(id),
  to_participant_id TEXT NOT NULL REFERENCES participants(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payment_method TEXT NOT NULL DEFAULT 'eft' CHECK (payment_method IN ('eft','instant_eft','card','crypto','manual')),
  provider TEXT NOT NULL DEFAULT 'mock' CHECK (provider IN ('mock','stitch','ozow','manual')),
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','reversed')),
  proof_r2_key TEXT,
  bank_reference TEXT,
  reconciled INTEGER DEFAULT 0,
  reconciled_at TEXT,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  issued_by TEXT NOT NULL REFERENCES participants(id),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','applied','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pay_tx_trade ON payment_transactions(trade_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

-- A9: Regulatory verification log
CREATE TABLE IF NOT EXISTS regulatory_verifications (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  provider TEXT NOT NULL CHECK (provider IN ('cipc','sars_tax','sars_vat','nersa','fsca','sanctions','fica')),
  external_ref TEXT,
  request_payload TEXT,
  response_payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','expired','manual_review')),
  verified_at TEXT,
  expires_at TEXT,
  verified_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_ver_participant ON regulatory_verifications(participant_id);
CREATE INDEX IF NOT EXISTS idx_reg_ver_provider ON regulatory_verifications(provider);
CREATE INDEX IF NOT EXISTS idx_reg_ver_status ON regulatory_verifications(status);

-- A10: AML monitoring
CREATE TABLE IF NOT EXISTS aml_alerts (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'unusual_volume','rapid_trading','wash_trading','layering',
    'structuring','sanctions_hit','pep_match','adverse_media',
    'threshold_breach','pattern_anomaly'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  description TEXT NOT NULL,
  related_trade_ids TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','escalated','resolved','false_positive','dismissed')),
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aml_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold','frequency','pattern','structuring')),
  parameters TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aml_alerts_participant ON aml_alerts(participant_id);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_severity ON aml_alerts(severity);

INSERT OR IGNORE INTO aml_rules (id, rule_name, rule_type, parameters) VALUES
  ('aml-r1','High Value Single Trade','threshold','{max_cents:50000000,window_hours:1}'),
  ('aml-r2','Rapid Fire Orders','frequency','{max_orders:100,window_minutes:60}'),
  ('aml-r3','Unusual Daily Volume','pattern','{std_dev_multiplier:3,lookback_days:30}'),
  ('aml-r4','Potential Wash Trading','pattern','{min_roundtrips:3,window_hours:24}'),
  ('aml-r5','Possible Structuring','structuring','{threshold_cents:10000000,max_splits:5,window_hours:24}');

-- A11: Audit trail hash chain
ALTER TABLE audit_log ADD COLUMN prev_hash TEXT;
ALTER TABLE audit_log ADD COLUMN entry_hash TEXT;
