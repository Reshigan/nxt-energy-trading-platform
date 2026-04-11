-- Migration 007: Module Registry, Feature Flags, and Go-Live features
-- Spec 10: Modules, Feature Flags, Go-Live

-- ── Platform Modules ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_modules (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('core', 'trading', 'carbon', 'ipp', 'compliance', 'advanced', 'integration')),
  enabled_global INTEGER DEFAULT 1,
  requires_licence TEXT,
  min_subscription_tier TEXT DEFAULT 'starter',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_modules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT REFERENCES tenants(id),
  module_id TEXT REFERENCES platform_modules(id),
  enabled INTEGER DEFAULT 1,
  config_override TEXT DEFAULT '{}',
  activated_at TEXT,
  deactivated_at TEXT,
  UNIQUE(tenant_id, module_id)
);

-- ── Notification Preferences ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT UNIQUE REFERENCES participants(id),
  email_trade_confirmations INTEGER DEFAULT 1,
  email_contract_signatures INTEGER DEFAULT 1,
  email_cp_deadlines INTEGER DEFAULT 1,
  email_invoice_generated INTEGER DEFAULT 1,
  email_monthly_summary INTEGER DEFAULT 1,
  push_trade_executions INTEGER DEFAULT 1,
  push_price_alerts INTEGER DEFAULT 1,
  push_cp_deadlines INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ── Account Deletion Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS deletion_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT REFERENCES participants(id),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TEXT DEFAULT (datetime('now')),
  process_after TEXT,
  completed_at TEXT
);

-- ── Onboarding Email Tracking ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_emails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participant_id TEXT REFERENCES participants(id),
  day INTEGER NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  UNIQUE(participant_id, day)
);

-- ── Seed 23 Platform Modules ──────────────────────────────────────
-- Core (5) — cannot be disabled
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-auth',          'auth',             'Authentication',       'Login, registration, 2FA, session management',  'core', 1, 'starter', 'Shield',       1),
  ('mod-dashboard',     'dashboard',        'Dashboard & Cockpit',  'Role-specific cockpits and overview',           'core', 1, 'starter', 'LayoutDashboard', 2),
  ('mod-contracts',     'contracts',        'Contract Management',  'Multi-phase contract lifecycle',                'core', 1, 'starter', 'FileText',     3),
  ('mod-compliance',    'compliance',       'Compliance Engine',    'Statutory checks, KYC/AML validation',          'core', 1, 'starter', 'CheckCircle',  4),
  ('mod-notifications', 'notifications',    'Notifications',        'In-app and email notifications',                'core', 1, 'starter', 'Bell',         5);

-- Trading (3)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-spot',      'spot_trading',  'Spot Trading',      'Real-time order book and market orders',          'trading', 1, 'starter', 'TrendingUp',  10),
  ('mod-p2p',       'p2p_trading',   'P2P Trading',       'Peer-to-peer bilateral energy trading',           'trading', 1, 'pro',     'Users',       11),
  ('mod-market',    'marketplace',   'Marketplace',       'Energy marketplace with listings and auctions',   'trading', 1, 'starter', 'ShoppingBag', 12);

-- Carbon (4)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-carbon',    'carbon_credits',    'Carbon Credits',      'Carbon credit issuance, retirement, transfer',    'carbon', 1, 'starter',    'Leaf',       20),
  ('mod-carbderiv', 'carbon_derivatives','Carbon Derivatives',  'Options, forwards, swaps on carbon',              'carbon', 1, 'pro',        'BarChart',   21),
  ('mod-token',     'tokenization',      'Tokenization',        'Blockchain-style tokenization of credits/RECs',   'carbon', 1, 'enterprise', 'Coins',      22),
  ('mod-recs',      'recs',              'RECs',                'Renewable Energy Certificates management',        'carbon', 1, 'pro',        'Award',      23);

-- IPP (2)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-ipp',     'ipp_projects', 'IPP Projects',  'Independent Power Producer project tracking',  'ipp', 1, 'starter', 'Zap',       30),
  ('mod-meter',   'metering',     'Metering',       'Smart meter data ingestion and validation',    'ipp', 1, 'starter', 'Activity',  31);

-- Compliance (2)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-settle',  'settlement',  'Settlement',  'Invoice generation, netting, reconciliation',  'compliance', 1, 'starter', 'DollarSign', 40),
  ('mod-dispute', 'disputes',    'Disputes',    'Dispute filing, mediation, arbitration',       'compliance', 1, 'pro',     'AlertTriangle', 41);

-- Advanced (4)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-ai',      'ai_portfolio',   'AI Portfolio',      'AI-powered portfolio optimization',            'advanced', 1, 'enterprise', 'Brain',      50),
  ('mod-risk',    'risk_analytics', 'Risk Analytics',    'VaR, stress testing, position monitoring',     'advanced', 1, 'pro',        'Shield',     51),
  ('mod-report',  'report_builder', 'Report Builder',    'Custom report generation and scheduling',      'advanced', 1, 'pro',        'FileBarChart', 52),
  ('mod-rules',   'smart_rules',    'Smart Rules',       'Automated contract rules and triggers',        'advanced', 1, 'enterprise', 'Cpu',        53);

-- Integration (3)
INSERT OR IGNORE INTO platform_modules (id, name, display_name, description, category, enabled_global, min_subscription_tier, icon, sort_order) VALUES
  ('mod-dev',     'developer_api', 'Developer API',   'REST API, webhooks, SDK access',                 'integration', 1, 'pro',        'Code',       60),
  ('mod-billing', 'billing',       'Billing',          'Stripe subscription management',                 'integration', 1, 'starter',    'CreditCard', 61),
  ('mod-tenant',  'multi_tenant',  'Multi-Tenant',     'Tenant isolation and administration',            'integration', 1, 'enterprise', 'Building',   62);

-- Index for fast module lookups
CREATE INDEX IF NOT EXISTS idx_platform_modules_category ON platform_modules(category);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_emails_participant ON onboarding_emails(participant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_participant ON notification_preferences(participant_id);
