-- NXT Energy Trading Platform — Complete Seed Data
-- Spec 8 Section 4.2: Realistic SA energy market demo data
-- Usage: wrangler d1 execute nxt_energy_trading --file=seed.sql

-- Clear existing data
DELETE FROM audit_log;
DELETE FROM notifications;
DELETE FROM meter_readings;
DELETE FROM disputes;
DELETE FROM invoices;
DELETE FROM escrows;
DELETE FROM orders;
DELETE FROM trades;
DELETE FROM carbon_options;
DELETE FROM carbon_credits;
DELETE FROM project_milestones;
DELETE FROM conditions_precedent;
DELETE FROM projects;
DELETE FROM contract_signatures;
DELETE FROM contract_documents;
DELETE FROM statutory_checks;
DELETE FROM licences;
DELETE FROM participants;

-- ============================================================
-- PARTICIPANTS (7 organisations)
-- ============================================================
INSERT INTO participants (id, company_name, registration_number, participant_type, contact_name, contact_email, phone, province, bbbee_level, kyc_status, password_hash, created_at) VALUES
('P001', 'GONXT Technology', '2020/123456/07', 'admin', 'Reshigan Govender', 'reshigan@gonxt.tech', '+27 11 234 5678', 'Gauteng', 1, 'verified', '$2b$12$placeholder_hash_gonxt', '2024-01-15T08:00:00Z'),
('P002', 'TerraVolt Energy', '2019/654321/07', 'generator', 'Johan van der Merwe', 'johan@terravolt.co.za', '+27 12 345 6789', 'Limpopo', 2, 'verified', '$2b$12$placeholder_hash_terravolt', '2024-02-01T09:00:00Z'),
('P003', 'NXT Trading Desk', '2021/111222/07', 'trader', 'Sarah Nkosi', 'sarah@nxttrading.co.za', '+27 11 456 7890', 'Gauteng', 1, 'verified', '$2b$12$placeholder_hash_nxttrading', '2024-02-15T10:00:00Z'),
('P004', 'Envera Capital', '2018/333444/07', 'carbon_fund', 'David Pillay', 'david@envera.co.za', '+27 21 567 8901', 'Western Cape', 3, 'verified', '$2b$12$placeholder_hash_envera', '2024-03-01T08:30:00Z'),
('P005', 'BevCo South Africa', '2015/555666/07', 'offtaker', 'Thabo Molefe', 'thabo@bevco.co.za', '+27 31 678 9012', 'KwaZulu-Natal', 2, 'verified', '$2b$12$placeholder_hash_bevco', '2024-03-15T11:00:00Z'),
('P006', 'ABSA CIB', '2010/777888/07', 'lender', 'Lerato Mokoena', 'lerato@absa.co.za', '+27 11 789 0123', 'Gauteng', 1, 'verified', '$2b$12$placeholder_hash_absa', '2024-04-01T07:00:00Z'),
('P007', 'Eskom SOC', '1923/999000/30', 'generator', 'Sipho Dlamini', 'sipho@eskom.co.za', '+27 11 890 1234', 'Mpumalanga', 1, 'verified', '$2b$12$placeholder_hash_eskom', '2024-01-01T06:00:00Z');

-- ============================================================
-- LICENCES (9)
-- ============================================================
INSERT INTO licences (id, participant_id, licence_type, licence_number, issuing_authority, issue_date, expiry_date, status, created_at) VALUES
('L001', 'P002', 'generation', 'GEN-2024-001', 'NERSA', '2024-01-01', '2027-01-01', 'active', '2024-01-15T08:00:00Z'),
('L002', 'P002', 'trading', 'TRD-2024-002', 'NERSA', '2024-02-01', '2026-08-01', 'expiring', '2024-02-01T09:00:00Z'),
('L003', 'P003', 'trading', 'TRD-2024-003', 'NERSA', '2024-01-15', '2027-01-15', 'active', '2024-01-15T10:00:00Z'),
('L004', 'P003', 'financial_services', 'FSP-2024-001', 'FSCA', '2024-03-01', '2027-03-01', 'active', '2024-03-01T08:00:00Z'),
('L005', 'P004', 'carbon_trading', 'CBN-2024-001', 'DEA', '2024-02-15', '2027-02-15', 'active', '2024-02-15T09:00:00Z'),
('L006', 'P005', 'supply', 'SUP-2024-001', 'NERSA', '2024-04-01', '2027-04-01', 'active', '2024-04-01T10:00:00Z'),
('L007', 'P006', 'financial_services', 'FSP-2024-002', 'FSCA', '2024-01-01', '2027-01-01', 'active', '2024-01-01T07:00:00Z'),
('L008', 'P007', 'generation', 'GEN-2024-007', 'NERSA', '2024-01-01', '2029-01-01', 'active', '2024-01-01T06:00:00Z'),
('L009', 'P002', 'distribution', 'DST-2024-001', 'NERSA', '2024-06-01', '2024-06-01', 'applied', '2024-05-15T08:00:00Z');

-- ============================================================
-- STATUTORY CHECKS (mix of pass, pending, failed, overridden)
-- ============================================================
INSERT INTO statutory_checks (id, participant_id, check_type, status, details, checked_at, created_at) VALUES
('SC001', 'P002', 'cipc', 'pass', 'CIPC registration verified', '2024-02-01T09:10:00Z', '2024-02-01T09:00:00Z'),
('SC002', 'P002', 'sars', 'pass', 'Tax clearance valid', '2024-02-01T09:11:00Z', '2024-02-01T09:00:00Z'),
('SC003', 'P002', 'vat', 'pass', 'VAT registration confirmed', '2024-02-01T09:12:00Z', '2024-02-01T09:00:00Z'),
('SC004', 'P002', 'fica', 'pass', 'FICA compliant', '2024-02-01T09:13:00Z', '2024-02-01T09:00:00Z'),
('SC005', 'P002', 'sanctions', 'pass', 'No sanctions matches', '2024-02-01T09:14:00Z', '2024-02-01T09:00:00Z'),
('SC006', 'P002', 'bbbee', 'pass', 'Level 2 verified', '2024-02-01T09:15:00Z', '2024-02-01T09:00:00Z'),
('SC007', 'P002', 'nersa', 'pass', 'NERSA licence valid', '2024-02-01T09:16:00Z', '2024-02-01T09:00:00Z'),
('SC008', 'P003', 'cipc', 'pass', 'CIPC verified', '2024-02-15T10:05:00Z', '2024-02-15T10:00:00Z'),
('SC009', 'P003', 'sars', 'pass', 'Tax clearance valid', '2024-02-15T10:06:00Z', '2024-02-15T10:00:00Z'),
('SC010', 'P003', 'fica', 'pending', 'Awaiting FICA documentation', NULL, '2024-02-15T10:00:00Z'),
('SC011', 'P005', 'cipc', 'pass', 'CIPC verified', '2024-03-15T11:05:00Z', '2024-03-15T11:00:00Z'),
('SC012', 'P005', 'sars', 'failed', 'Tax clearance expired — renewal required', '2024-03-15T11:06:00Z', '2024-03-15T11:00:00Z'),
('SC013', 'P005', 'fica', 'overridden', 'Admin override — pending docs accepted', '2024-03-20T14:00:00Z', '2024-03-15T11:00:00Z');

-- ============================================================
-- PROJECTS (4 IPP projects)
-- ============================================================
INSERT INTO projects (id, name, developer_id, technology, capacity_mw, province, status, completion_pct, grid_connection_status, created_at) VALUES
('PRJ001', 'TerraVolt Solar Limpopo', 'P002', 'solar', 75.0, 'Limpopo', 'construction', 72, 'approved', '2024-01-20T08:00:00Z'),
('PRJ002', 'Envera Wind EC', 'P004', 'wind', 120.0, 'Eastern Cape', 'financial_close', 45, 'pending', '2024-02-10T09:00:00Z'),
('PRJ003', 'Goldrush Rooftop', 'P002', 'solar', 5.0, 'Gauteng', 'commercial_ops', 100, 'connected', '2023-06-01T08:00:00Z'),
('PRJ004', 'KwaDukuza Hydro', 'P004', 'hydro', 25.0, 'KwaZulu-Natal', 'development', 22, 'not_applied', '2024-05-01T10:00:00Z');

-- ============================================================
-- PROJECT MILESTONES
-- ============================================================
INSERT INTO project_milestones (id, project_id, name, target_date, completion_date, status, created_at) VALUES
('MS001', 'PRJ001', 'Environmental Impact Assessment', '2024-03-01', '2024-02-28', 'completed', '2024-01-20T08:00:00Z'),
('MS002', 'PRJ001', 'NERSA Licence Approval', '2024-04-15', '2024-04-10', 'completed', '2024-01-20T08:00:00Z'),
('MS003', 'PRJ001', 'Financial Close', '2024-06-01', '2024-05-28', 'completed', '2024-01-20T08:00:00Z'),
('MS004', 'PRJ001', 'Foundation & Civil Works', '2024-09-01', '2024-08-25', 'completed', '2024-01-20T08:00:00Z'),
('MS005', 'PRJ001', 'Panel Installation (Phase 1)', '2024-12-01', NULL, 'in_progress', '2024-01-20T08:00:00Z'),
('MS006', 'PRJ001', 'Grid Connection & Testing', '2025-03-01', NULL, 'pending', '2024-01-20T08:00:00Z'),
('MS007', 'PRJ001', 'COD Declaration', '2025-06-01', NULL, 'pending', '2024-01-20T08:00:00Z'),
('MS008', 'PRJ002', 'Site Assessment', '2024-04-01', '2024-03-28', 'completed', '2024-02-10T09:00:00Z'),
('MS009', 'PRJ002', 'EIA Approval', '2024-07-01', '2024-06-30', 'completed', '2024-02-10T09:00:00Z'),
('MS010', 'PRJ002', 'Financial Close', '2024-10-01', NULL, 'in_progress', '2024-02-10T09:00:00Z'),
('MS011', 'PRJ003', 'COD Achieved', '2023-12-01', '2023-11-15', 'completed', '2023-06-01T08:00:00Z');

-- ============================================================
-- CONDITIONS PRECEDENT
-- ============================================================
INSERT INTO conditions_precedent (id, project_id, description, category, status, deadline, created_at) VALUES
('CP001', 'PRJ001', 'Environmental authorisation from DFFE', 'environmental', 'satisfied', '2024-03-01', '2024-01-20T08:00:00Z'),
('CP002', 'PRJ001', 'NERSA generation licence', 'regulatory', 'satisfied', '2024-04-15', '2024-01-20T08:00:00Z'),
('CP003', 'PRJ001', 'PPA execution with BevCo', 'commercial', 'satisfied', '2024-05-01', '2024-01-20T08:00:00Z'),
('CP004', 'PRJ001', 'EPC contract execution', 'commercial', 'satisfied', '2024-05-15', '2024-01-20T08:00:00Z'),
('CP005', 'PRJ001', 'Grid connection agreement with Eskom', 'technical', 'satisfied', '2024-06-01', '2024-01-20T08:00:00Z'),
('CP006', 'PRJ002', 'Environmental authorisation', 'environmental', 'satisfied', '2024-06-01', '2024-02-10T09:00:00Z'),
('CP007', 'PRJ002', 'Wind resource assessment (12 months)', 'technical', 'satisfied', '2024-05-01', '2024-02-10T09:00:00Z'),
('CP008', 'PRJ002', 'PPA term sheet signed', 'commercial', 'satisfied', '2024-07-01', '2024-02-10T09:00:00Z'),
('CP009', 'PRJ002', 'NERSA licence application', 'regulatory', 'pending', '2024-10-01', '2024-02-10T09:00:00Z'),
('CP010', 'PRJ002', 'Lender credit committee approval', 'financial', 'pending', '2024-09-15', '2024-02-10T09:00:00Z');

-- ============================================================
-- CONTRACT DOCUMENTS (6)
-- ============================================================
INSERT INTO contract_documents (id, title, document_type, status, phase, version_major, version_minor, parties, created_by, sha256_hash, created_at) VALUES
('DOC001', 'BevCo Solar PPA — 75MW Limpopo', 'ppa', 'active', 'execution', 1, 0, '["P002","P005"]', 'P002', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', '2024-04-01T08:00:00Z'),
('DOC002', 'True Blue Energy Term Sheet', 'term_sheet', 'pending_signature', 'signing', 1, 0, '["P003","P005"]', 'P003', 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', '2024-05-15T09:00:00Z'),
('DOC003', 'Sasol LOI — Carbon Credit Supply', 'loi', 'pending_signature', 'signing', 1, 0, '["P004","P005"]', 'P004', 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', '2024-06-01T10:00:00Z'),
('DOC004', 'Envera Carbon Option Agreement', 'option_agreement', 'active', 'execution', 1, 0, '["P004","P003"]', 'P004', 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', '2024-04-15T08:00:00Z'),
('DOC005', 'TerraVolt EPC Contract', 'epc', 'active', 'execution', 1, 0, '["P002","P006"]', 'P002', 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', '2024-03-01T08:00:00Z'),
('DOC006', 'Wind Forward Contract — Draft', 'forward', 'draft', 'legal_review', 0, 3, '["P003","P004"]', 'P003', 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', '2024-07-01T11:00:00Z');

-- ============================================================
-- CONTRACT SIGNATURES
-- ============================================================
INSERT INTO contract_signatures (id, document_id, participant_id, signed_at, signature_hash, ip_address) VALUES
('SIG001', 'DOC001', 'P002', '2024-04-05T14:00:00Z', 'sig_hash_001_terravolt', '196.21.45.100'),
('SIG002', 'DOC001', 'P005', '2024-04-06T09:30:00Z', 'sig_hash_002_bevco', '196.21.45.101'),
('SIG003', 'DOC002', 'P003', '2024-05-20T11:00:00Z', 'sig_hash_003_nxttrading', '196.21.45.102'),
('SIG004', 'DOC003', 'P004', '2024-06-05T15:00:00Z', 'sig_hash_004_envera', '196.21.45.103'),
('SIG005', 'DOC004', 'P004', '2024-04-18T10:00:00Z', 'sig_hash_005_envera', '196.21.45.103'),
('SIG006', 'DOC004', 'P003', '2024-04-19T08:00:00Z', 'sig_hash_006_nxttrading', '196.21.45.102'),
('SIG007', 'DOC005', 'P002', '2024-03-05T09:00:00Z', 'sig_hash_007_terravolt', '196.21.45.100'),
('SIG008', 'DOC005', 'P006', '2024-03-06T14:30:00Z', 'sig_hash_008_absa', '196.21.45.104');

-- ============================================================
-- CARBON CREDITS (4 batches)
-- ============================================================
INSERT INTO carbon_credits (id, project_name, registry, vintage, technology, volume_tco2e, status, owner_id, beneficiary, created_at) VALUES
('CC001', 'KwaDukuza Mall Solar', 'gold_standard', 2024, 'solar', 1268, 'available', 'P004', NULL, '2024-03-01T08:00:00Z'),
('CC002', 'Fybatex Circular Economy', 'verra', 2024, 'waste', 890, 'available', 'P004', NULL, '2024-04-01T09:00:00Z'),
('CC003', 'UCOME Biodiesel', 'gold_standard', 2023, 'biofuel', 17700, 'reserved', 'P004', NULL, '2024-02-01T10:00:00Z'),
('CC004', 'Goldrush Rooftop', 'verra', 2024, 'solar', 2400, 'retired', 'P005', 'BevCo South Africa', '2024-05-01T11:00:00Z');

-- ============================================================
-- CARBON OPTIONS (3)
-- ============================================================
INSERT INTO carbon_options (id, option_type, underlying_credit_id, writer_id, holder_id, strike_price, premium, expiry_date, status, mtm_value, created_at) VALUES
('OPT001', 'call', 'CC001', 'P004', 'P003', 85.00, 12000.00, '2025-06-30', 'active', 42000.00, '2024-04-15T08:00:00Z'),
('OPT002', 'put', 'CC002', 'P003', 'P004', 70.00, 8000.00, '2025-03-31', 'active', -18000.00, '2024-05-01T09:00:00Z'),
('OPT003', 'collar', 'CC003', 'P004', 'P005', 90.00, 15000.00, '2025-09-30', 'pending', 0.00, '2024-06-01T10:00:00Z');

-- ============================================================
-- TRADES (6)
-- ============================================================
INSERT INTO trades (id, market, trade_type, buyer_id, seller_id, volume_mwh, price_per_mwh, total_value, status, executed_at, settlement_date, created_at) VALUES
('TRD001', 'day_ahead', 'buy', 'P005', 'P002', 500.0, 850.00, 425000.00, 'settled', '2024-06-01T08:00:00Z', '2024-06-03', '2024-06-01T08:00:00Z'),
('TRD002', 'bilateral', 'buy', 'P005', 'P003', 1200.0, 780.00, 936000.00, 'settled', '2024-06-05T10:00:00Z', '2024-06-07', '2024-06-05T10:00:00Z'),
('TRD003', 'day_ahead', 'sell', 'P003', 'P007', 300.0, 920.00, 276000.00, 'confirmed', '2024-06-10T14:00:00Z', '2024-06-12', '2024-06-10T14:00:00Z'),
('TRD004', 'carbon', 'buy', 'P005', 'P004', 500.0, 95.00, 47500.00, 'pending', '2024-06-15T09:00:00Z', '2024-06-17', '2024-06-15T09:00:00Z'),
('TRD005', 'bilateral', 'buy', 'P003', 'P002', 800.0, 810.00, 648000.00, 'processing', '2024-06-18T11:00:00Z', '2024-06-20', '2024-06-18T11:00:00Z'),
('TRD006', 'day_ahead', 'sell', 'P002', 'P005', 150.0, 890.00, 133500.00, 'settled', '2024-06-20T07:00:00Z', '2024-06-22', '2024-06-20T07:00:00Z');

-- ============================================================
-- ORDERS (3)
-- ============================================================
INSERT INTO orders (id, participant_id, market, order_type, side, volume_mwh, price_per_mwh, filled_volume, status, created_at) VALUES
('ORD001', 'P003', 'day_ahead', 'limit', 'buy', 400.0, 860.00, 0.0, 'open', '2024-06-25T08:00:00Z'),
('ORD002', 'P002', 'bilateral', 'limit', 'sell', 600.0, 830.00, 350.0, 'partial', '2024-06-24T09:00:00Z'),
('ORD003', 'P005', 'carbon', 'market', 'buy', 200.0, 0.00, 200.0, 'filled', '2024-06-22T10:00:00Z');

-- ============================================================
-- ESCROWS (3)
-- ============================================================
INSERT INTO escrows (id, trade_id, buyer_id, seller_id, amount, status, created_at) VALUES
('ESC001', 'TRD003', 'P003', 'P007', 276000.00, 'held', '2024-06-10T14:05:00Z'),
('ESC002', 'TRD004', 'P005', 'P004', 47500.00, 'held', '2024-06-15T09:05:00Z'),
('ESC003', 'TRD005', 'P003', 'P002', 648000.00, 'held', '2024-06-18T11:05:00Z');

-- ============================================================
-- INVOICES (4)
-- ============================================================
INSERT INTO invoices (id, invoice_number, seller_id, buyer_id, trade_id, subtotal, vat_amount, total, status, due_date, created_at) VALUES
('INV001', 'INV-2024-001', 'P002', 'P005', 'TRD001', 369565.22, 55434.78, 425000.00, 'paid', '2024-07-01', '2024-06-03T08:00:00Z'),
('INV002', 'INV-2024-002', 'P003', 'P005', 'TRD002', 813913.04, 122086.96, 936000.00, 'paid', '2024-07-05', '2024-06-07T08:00:00Z'),
('INV003', 'INV-2024-003', 'P007', 'P003', 'TRD003', 240000.00, 36000.00, 276000.00, 'outstanding', '2024-07-10', '2024-06-12T08:00:00Z'),
('INV004', 'INV-2024-004', 'P004', 'P005', 'TRD004', 41304.35, 6195.65, 47500.00, 'outstanding', '2024-07-15', '2024-06-17T08:00:00Z');

-- ============================================================
-- DISPUTES (2)
-- ============================================================
INSERT INTO disputes (id, trade_id, filed_by, against_id, reason, status, phase, created_at) VALUES
('DSP001', 'TRD003', 'P003', 'P007', 'Settlement delay — Eskom failed to confirm grid delivery for 300 MWh day-ahead trade. Requesting force majeure clause application.', 'under_review', 'evidence', '2024-06-14T09:00:00Z'),
('DSP002', 'TRD004', 'P005', 'P004', 'Carbon credit vintage mismatch — purchased 2024 vintage but received 2023 credits. Requesting replacement or refund.', 'open', 'filing', '2024-06-19T14:00:00Z');

-- ============================================================
-- NOTIFICATIONS (8)
-- ============================================================
INSERT INTO notifications (id, participant_id, title, body, type, read, created_at) VALUES
('N001', 'P002', 'Trade Executed', 'Your sell order for 500 MWh at R850/MWh has been executed with BevCo SA.', 'trading', 0, '2024-06-01T08:01:00Z'),
('N002', 'P002', 'Invoice Generated', 'Invoice INV-2024-001 for R425,000 has been generated. Due: 2024-07-01.', 'info', 0, '2024-06-03T08:05:00Z'),
('N003', 'P003', 'Dispute Filed Against You', 'BevCo SA has filed dispute DSP002 regarding carbon credit vintage. Respond within 14 days.', 'danger', 0, '2024-06-19T14:05:00Z'),
('N004', 'P004', 'Option Premium Received', 'Premium of R12,000 received for call option OPT001 on KwaDukuza Mall Solar credits.', 'success', 1, '2024-04-15T08:30:00Z'),
('N005', 'P005', 'Contract Ready for Signature', 'True Blue Energy Term Sheet requires your signature. 1 of 2 parties have signed.', 'compliance', 0, '2024-05-20T11:30:00Z'),
('N006', 'P005', 'CP Deadline Approaching', 'Condition precedent "Lender credit committee approval" for Envera Wind EC is due in 14 days.', 'warning', 0, '2024-09-01T08:00:00Z'),
('N007', 'P006', 'Disbursement Request', 'TerraVolt Energy has requested disbursement for milestone "Panel Installation Phase 1" — R12.5M.', 'info', 1, '2024-09-15T10:00:00Z'),
('N008', 'P002', 'Licence Expiring', 'Your trading licence TRD-2024-002 expires on 2026-08-01. Renew within 90 days.', 'warning', 0, '2024-05-01T08:00:00Z');

-- ============================================================
-- AUDIT LOG (25 entries)
-- ============================================================
INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
('AL001', 'P001', 'participant.created', 'participant', 'P002', 'TerraVolt Energy registered', '196.21.45.1', '2024-02-01T09:00:00Z'),
('AL002', 'P001', 'participant.verified', 'participant', 'P002', 'KYC verification completed — 7/7 checks passed', '196.21.45.1', '2024-02-01T09:20:00Z'),
('AL003', 'P002', 'project.created', 'project', 'PRJ001', 'TerraVolt Solar Limpopo — 75MW', '196.21.45.100', '2024-01-20T08:00:00Z'),
('AL004', 'P002', 'contract.created', 'contract', 'DOC001', 'BevCo Solar PPA created', '196.21.45.100', '2024-04-01T08:00:00Z'),
('AL005', 'P002', 'contract.signed', 'contract', 'DOC001', 'TerraVolt signed PPA', '196.21.45.100', '2024-04-05T14:00:00Z'),
('AL006', 'P005', 'contract.signed', 'contract', 'DOC001', 'BevCo signed PPA', '196.21.45.101', '2024-04-06T09:30:00Z'),
('AL007', 'P002', 'trade.executed', 'trade', 'TRD001', 'Sell 500 MWh @ R850 to BevCo', '196.21.45.100', '2024-06-01T08:00:00Z'),
('AL008', 'P003', 'trade.executed', 'trade', 'TRD002', 'Sell 1200 MWh @ R780 to BevCo', '196.21.45.102', '2024-06-05T10:00:00Z'),
('AL009', 'P004', 'carbon.option_written', 'option', 'OPT001', 'Call option on KwaDukuza Mall Solar — strike R85', '196.21.45.103', '2024-04-15T08:00:00Z'),
('AL010', 'P005', 'carbon.retired', 'carbon_credit', 'CC004', 'Retired 2400 tCO2e Goldrush Rooftop credits', '196.21.45.101', '2024-05-01T11:00:00Z'),
('AL011', 'P003', 'order.placed', 'order', 'ORD001', 'Limit buy 400 MWh @ R860 day-ahead', '196.21.45.102', '2024-06-25T08:00:00Z'),
('AL012', 'P002', 'order.placed', 'order', 'ORD002', 'Limit sell 600 MWh @ R830 bilateral', '196.21.45.100', '2024-06-24T09:00:00Z'),
('AL013', 'P005', 'order.filled', 'order', 'ORD003', 'Market buy 200 MWh carbon — filled', '196.21.45.101', '2024-06-22T10:00:00Z'),
('AL014', 'P003', 'dispute.filed', 'dispute', 'DSP001', 'Settlement delay dispute against Eskom', '196.21.45.102', '2024-06-14T09:00:00Z'),
('AL015', 'P005', 'dispute.filed', 'dispute', 'DSP002', 'Carbon vintage mismatch against Envera', '196.21.45.101', '2024-06-19T14:00:00Z'),
('AL016', 'P006', 'project.disbursement', 'project', 'PRJ001', 'Disbursement approved — R45M for civil works', '196.21.45.104', '2024-08-30T14:00:00Z'),
('AL017', 'P001', 'admin.override', 'statutory_check', 'SC013', 'Admin override on BevCo FICA check', '196.21.45.1', '2024-03-20T14:00:00Z'),
('AL018', 'P002', 'invoice.generated', 'invoice', 'INV001', 'Invoice R425,000 for TRD001', '196.21.45.100', '2024-06-03T08:00:00Z'),
('AL019', 'P005', 'invoice.paid', 'invoice', 'INV001', 'Payment received for INV-2024-001', '196.21.45.101', '2024-06-28T10:00:00Z'),
('AL020', 'P005', 'invoice.paid', 'invoice', 'INV002', 'Payment received for INV-2024-002', '196.21.45.101', '2024-07-02T09:00:00Z'),
('AL021', 'P003', 'contract.created', 'contract', 'DOC002', 'True Blue Term Sheet created', '196.21.45.102', '2024-05-15T09:00:00Z'),
('AL022', 'P003', 'contract.signed', 'contract', 'DOC002', 'NXT Trading signed term sheet', '196.21.45.102', '2024-05-20T11:00:00Z'),
('AL023', 'P004', 'contract.created', 'contract', 'DOC003', 'Sasol LOI for carbon supply created', '196.21.45.103', '2024-06-01T10:00:00Z'),
('AL024', 'P002', 'milestone.completed', 'milestone', 'MS004', 'Foundation & Civil Works completed', '196.21.45.100', '2024-08-25T16:00:00Z'),
('AL025', 'P002', 'licence.expiry_warning', 'licence', 'L002', 'Trading licence TRD-2024-002 expiring in 90 days', 'system', '2024-05-01T00:00:00Z');

-- Done. Seed data loaded successfully.
