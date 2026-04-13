-- Migration 015: Platform Integration — Cross-Module Data Flow
-- Adds contract_id to trades, action_queue table, and entity_links table

-- Add contract_id to trades for cross-module linking
ALTER TABLE trades ADD COLUMN contract_id TEXT REFERENCES contract_documents(id);

-- Action Queue: items that appear in user cockpits requiring action
CREATE TABLE IF NOT EXISTS action_queue (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  action_type TEXT NOT NULL, -- 'confirm_settlement', 'confirm_delivery', 'activate_metering', 'configure_wheeling', 'review_forecast', 'pay_invoice', 'sign_contract'
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL, -- 'trade', 'contract', 'project', 'invoice', 'escrow'
  entity_id TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'dismissed', 'expired'
  due_date TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_action_queue_participant ON action_queue(participant_id, status);
CREATE INDEX IF NOT EXISTS idx_action_queue_entity ON action_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_queue_status ON action_queue(status, priority);

-- Index for trade → contract lookups
CREATE INDEX IF NOT EXISTS idx_trades_contract_id ON trades(contract_id);
