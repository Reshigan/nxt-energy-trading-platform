-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_participant ON orders(participant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_creator ON contract_documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_phase ON contract_documents(phase);
CREATE INDEX IF NOT EXISTS idx_statutory_entity ON statutory_checks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_project ON meter_readings(project_id, reading_timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_participant ON notifications(participant_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_carbon_owner ON carbon_credits(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_token_owner ON tokenised_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_recs_project ON recs(project_id);
CREATE INDEX IF NOT EXISTS idx_p2p_status ON p2p_trades(status);
CREATE INDEX IF NOT EXISTS idx_invoices_to ON invoices(to_participant_id, status);
