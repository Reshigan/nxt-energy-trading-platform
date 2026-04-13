-- Migration 012: Deep Sweep Audit Fixes
-- Phase 3: Schema & Data Integrity

-- Subscriptions table (was only created inline in route handler)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  price_cents INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  next_billing_at TEXT,
  stripe_customer_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_participant ON subscriptions(participant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Add rejection_reason column to kyc_documents (used by compliance reject endpoint)
-- Note: Uses INSERT trick since SQLite has no IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If column already exists, this will be a no-op error caught by D1
ALTER TABLE kyc_documents ADD COLUMN rejection_reason TEXT;

-- Phase 11: Missing indexes on hot columns
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_settled ON trades(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_participant_status ON orders(participant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_market ON orders(market);
CREATE INDEX IF NOT EXISTS idx_contract_documents_phase ON contract_documents(phase);
CREATE INDEX IF NOT EXISTS idx_contract_documents_creator ON contract_documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_status ON carbon_credits(status);
CREATE INDEX IF NOT EXISTS idx_carbon_credits_owner ON carbon_credits(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_from ON invoices(from_participant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_to ON invoices(to_participant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_claimant ON disputes(claimant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_participant_read ON notifications(participant_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_status ON p2p_trades(status);
CREATE INDEX IF NOT EXISTS idx_licences_status_expiry ON licences(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_participant ON kyc_documents(participant_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_project ON meter_readings(project_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
-- Add created_by column (production table may lack it)
ALTER TABLE support_tickets ADD COLUMN created_by TEXT;
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_from ON payment_transactions(from_participant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_to ON payment_transactions(to_participant_id);
