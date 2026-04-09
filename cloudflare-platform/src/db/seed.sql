-- NXT Energy Trading Platform — Seed Data
-- 7 participants, 4 projects, 6 contracts, 4 credits, 3 options, etc.

-- Password hashes pre-computed using PBKDF2-SHA256, 100k iterations, salt 'seedsalt12345678'
-- Regular accounts: Password123!  → 8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169
-- Admin account:    NxtAdmin@2024! → 3e2685475ef6409acfe03ba80eb850f84bab50eba9d71cf6dd62ad27ef7b5a99

-- 1. Participants (7)
INSERT OR IGNORE INTO participants (id, company_name, registration_number, tax_number, vat_number, role, contact_person, email, password_hash, password_salt, phone, physical_address, sa_id_number, bbbee_level, nersa_licence, fsca_licence, kyc_status, trading_enabled) VALUES
('p001terravolt00000001', 'TerraVolt Energy (Pty) Ltd', '2019/123456/07', '9012345678', '4901234567', 'ipp', 'James Mokoena', 'james@terravolt.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 11 555 0101', '42 Solar Drive, Johannesburg, 2001', '8501015800083', 2, 'NERSA-GEN-2020-0451', NULL, 'verified', 1),
('p002bevcopower000002', 'BevCo Power Solutions', '2015/789012/07', '8765432109', '4876543210', 'offtaker', 'Sarah van der Merwe', 'sarah@bevco-power.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 21 555 0202', '100 Industria Road, Cape Town, 8001', NULL, 3, NULL, NULL, 'verified', 1),
('p003enveragreen00003', 'Envera Green Trading', '2021/345678/07', '7654321098', '4765432109', 'trader', 'Thabo Ndlovu', 'thabo@envera.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 12 555 0303', '15 Market Square, Pretoria, 0002', '9203045800085', 1, NULL, 'FSCA-OTC-2022-1234', 'verified', 1),
('p004greenfundmgr0004', 'GreenFund Capital Management', '2018/567890/07', '6543210987', '4654321098', 'carbon_fund', 'Nomsa Dlamini', 'nomsa@greenfund.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 11 555 0404', '88 Green Point, Sandton, 2196', NULL, 2, NULL, 'FSCA-FAIS-2019-5678', 'verified', 1),
('p005carbonbridge005', 'CarbonBridge Africa', '2020/678901/07', '5432109876', '4543210987', 'trader', 'Pieter Botha', 'pieter@carbonbridge.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 31 555 0505', '22 Carbon Lane, Durban, 4001', '8806125800087', 3, NULL, 'FSCA-OTC-2021-9012', 'verified', 1),
('p006absacib00000006', 'ABSA CIB — Project Finance', '2005/234567/07', '4321098765', '4432109876', 'lender', 'Michelle Govender', 'michelle.govender@absa.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 11 555 0606', '15 Alice Lane, Sandton, 2196', NULL, 1, NULL, NULL, 'verified', 1),
('p007eskomgrid0000007', 'Eskom Grid Operations', '1923/000001/06', '3210987654', '4321098765', 'grid', 'David Mahlangu', 'david.mahlangu@eskom.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27 11 555 0707', 'Megawatt Park, Sunninghill, 2157', NULL, 4, 'NERSA-GRID-2020-0001', NULL, 'verified', 1);

-- Admin user
INSERT OR IGNORE INTO participants (id, company_name, registration_number, tax_number, vat_number, role, contact_person, email, password_hash, password_salt, phone, physical_address, kyc_status, trading_enabled) VALUES
('p000adminplatform000', 'NXT Platform Admin', '2023/999999/07', '9999999999', '4999999999', 'admin', 'Platform Admin', 'admin@et.vantax.co.za', '3e2685475ef6409acfe03ba80eb850f84bab50eba9d71cf6dd62ad27ef7b5a99', 'seedsalt12345678', '+27 11 555 0000', 'NXT HQ, Johannesburg', 'verified', 1);

-- 2. Projects (4)
INSERT OR IGNORE INTO projects (id, name, developer_id, technology, capacity_mw, location, province, phase, estimated_cod, total_cost_cents, debt_ratio, equity_ratio, offtaker_id, lender_id, grid_operator_id) VALUES
('proj001solarfarm0001', 'Limpopo Solar Farm — Phase 1', 'p001terravolt00000001', 'solar', 75.0, 'Lephalale, Limpopo', 'Limpopo', 'construction', '2025-06-30', 125000000000, 0.70, 0.30, 'p002bevcopower000002', 'p006absacib00000006', 'p007eskomgrid0000007'),
('proj002windfarm00002', 'Eastern Cape Wind Complex', 'p001terravolt00000001', 'wind', 140.0, 'Cookhouse, Eastern Cape', 'Eastern Cape', 'financial_close', '2026-03-31', 280000000000, 0.75, 0.25, 'p002bevcopower000002', 'p006absacib00000006', 'p007eskomgrid0000007'),
('proj003hybridplant03', 'Northern Cape Hybrid Plant', 'p001terravolt00000001', 'hybrid', 50.0, 'Upington, Northern Cape', 'Northern Cape', 'development', '2027-01-15', 95000000000, 0.65, 0.35, NULL, NULL, 'p007eskomgrid0000007'),
('proj004batterystor04', 'Gauteng Battery Storage', 'p001terravolt00000001', 'battery', 25.0, 'Midrand, Gauteng', 'Gauteng', 'commercial_ops', '2024-01-15', 45000000000, 0.60, 0.40, 'p002bevcopower000002', 'p006absacib00000006', 'p007eskomgrid0000007');

-- 3. Contract Documents (6)
INSERT OR IGNORE INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id, project_id, version) VALUES
('doc001loi000000001', 'LOI — Limpopo Solar Farm Phase 1', 'loi', 'active', 'p001terravolt00000001', 'p002bevcopower000002', 'proj001solarfarm0001', 'v1.0'),
('doc002termsheet0002', 'Term Sheet — Limpopo Solar Farm', 'term_sheet', 'active', 'p001terravolt00000001', 'p002bevcopower000002', 'proj001solarfarm0001', 'v1.0'),
('doc003ppawheel00003', 'PPA Virtual Wheeling — Limpopo Solar', 'ppa_wheeling', 'execution', 'p001terravolt00000001', 'p002bevcopower000002', 'proj001solarfarm0001', 'v2.0'),
('doc004carbpurch0004', 'Carbon Credit Purchase Agreement', 'carbon_purchase', 'active', 'p004greenfundmgr0004', 'p005carbonbridge005', NULL, 'v1.0'),
('doc005epc0000000005', 'EPC Contract — EC Wind Complex', 'epc', 'draft_agreement', 'p001terravolt00000001', 'p002bevcopower000002', 'proj002windfarm00002', 'v1.0'),
('doc006nda0000000006', 'NDA — Project Evaluation', 'nda', 'active', 'p003enveragreen00003', 'p004greenfundmgr0004', NULL, 'v1.0');

-- 4. Carbon Credits (4)
INSERT OR IGNORE INTO carbon_credits (id, serial_number, project_name, registry, vintage, quantity, available_quantity, price_cents, status, owner_id, sdg_goals, methodology, country) VALUES
('cc001goldstd00000001', 'GS-ZA-2023-0001-0500', 'Limpopo Solar Farm', 'gold_standard', 2023, 500, 350, 1875, 'active', 'p004greenfundmgr0004', '["7","13"]', 'ACM0002', 'South Africa'),
('cc002verra000000002', 'VCS-ZA-2022-0001-1000', 'Eastern Cape Wind', 'verra', 2022, 1000, 800, 1650, 'active', 'p004greenfundmgr0004', '["7","13","15"]', 'ACM0018', 'South Africa'),
('cc003goldstd00000003', 'GS-ZA-2023-0501-0250', 'Northern Cape Solar', 'gold_standard', 2023, 250, 250, 2100, 'listed', 'p005carbonbridge005', '["7","13"]', 'AMS-I.D', 'South Africa'),
('cc004cdm0000000004', 'CDM-ZA-2021-0001-2000', 'KZN Biomass Project', 'cdm', 2021, 2000, 1500, 1200, 'active', 'p005carbonbridge005', '["7","12","13"]', 'AMS-I.E', 'South Africa');

-- 5. Carbon Options (3)
INSERT OR IGNORE INTO carbon_options (id, type, underlying_credit_id, strike_price_cents, premium_cents, quantity, expiry, exercise_style, settlement_type, writer_id, holder_id, status) VALUES
('opt001call00000001', 'call', 'cc001goldstd00000001', 2000, 150, 100, '2025-12-31T23:59:59Z', 'european', 'physical', 'p004greenfundmgr0004', 'p003enveragreen00003', 'active'),
('opt002put000000002', 'put', 'cc002verra000000002', 1500, 120, 200, '2025-09-30T23:59:59Z', 'american', 'cash', 'p005carbonbridge005', 'p004greenfundmgr0004', 'active'),
('opt003collar000003', 'collar', 'cc004cdm0000000004', 1400, 200, 500, '2026-06-30T23:59:59Z', 'european', 'physical', 'p005carbonbridge005', 'p003enveragreen00003', 'active');

-- 6. Trades (6)
INSERT OR IGNORE INTO trades (id, buyer_id, seller_id, market, volume, price_cents, total_cents, fee_cents, status, created_at) VALUES
('trd001solar00000001', 'p003enveragreen00003', 'p001terravolt00000001', 'solar', 50.0, 8500, 425000, 638, 'settled', '2024-03-15T09:30:00Z'),
('trd002wind000000002', 'p002bevcopower000002', 'p003enveragreen00003', 'wind', 100.0, 9200, 920000, 1380, 'settled', '2024-03-15T10:15:00Z'),
('trd003carbon0000003', 'p004greenfundmgr0004', 'p005carbonbridge005', 'carbon', 200.0, 1650, 330000, 495, 'settled', '2024-03-16T14:00:00Z'),
('trd004gas0000000004', 'p003enveragreen00003', 'p005carbonbridge005', 'gas', 75.0, 12500, 937500, 1406, 'pending', '2024-03-17T11:00:00Z'),
('trd005solar00000005', 'p002bevcopower000002', 'p001terravolt00000001', 'solar', 30.0, 8600, 258000, 387, 'disputed', '2024-03-17T15:30:00Z'),
('trd006battery000006', 'p003enveragreen00003', 'p001terravolt00000001', 'battery', 20.0, 15000, 300000, 450, 'pending', '2024-03-18T08:45:00Z');

-- 7. Escrows (3)
INSERT OR IGNORE INTO escrows (id, trade_id, depositor_id, beneficiary_id, amount_cents, status, created_at) VALUES
('esc001trade00000001', 'trd004gas0000000004', 'p003enveragreen00003', 'p005carbonbridge005', 937500, 'held', '2024-03-17T11:00:00Z'),
('esc002trade00000002', 'trd005solar00000005', 'p002bevcopower000002', 'p001terravolt00000001', 258000, 'disputed', '2024-03-17T15:30:00Z'),
('esc003trade00000003', 'trd006battery000006', 'p003enveragreen00003', 'p001terravolt00000001', 300000, 'held', '2024-03-18T08:45:00Z');

-- 8. Invoices (4)
INSERT OR IGNORE INTO invoices (id, invoice_number, trade_id, from_participant_id, to_participant_id, subtotal_cents, vat_cents, total_cents, status, due_date, created_at) VALUES
('inv001outstanding001', 'INV-2024-000001', 'trd001solar00000001', 'p001terravolt00000001', 'p003enveragreen00003', 425000, 63750, 488750, 'outstanding', '2024-04-15', '2024-03-15T09:30:00Z'),
('inv002paid000000002', 'INV-2024-000002', 'trd002wind000000002', 'p003enveragreen00003', 'p002bevcopower000002', 920000, 138000, 1058000, 'paid', '2024-04-15', '2024-03-15T10:15:00Z'),
('inv003outstanding003', 'INV-2024-000003', 'trd003carbon0000003', 'p005carbonbridge005', 'p004greenfundmgr0004', 330000, 49500, 379500, 'outstanding', '2024-04-16', '2024-03-16T14:00:00Z'),
('inv004paid000000004', 'INV-2024-000004', 'trd004gas0000000004', 'p005carbonbridge005', 'p003enveragreen00003', 937500, 140625, 1078125, 'paid', '2024-04-17', '2024-03-17T11:00:00Z');

-- 9. Disputes (2)
INSERT OR IGNORE INTO disputes (id, claimant_id, respondent_id, category, description, value_cents, trade_id, status, created_at) VALUES
('dsp001settlement001', 'p002bevcopower000002', 'p001terravolt00000001', 'delivery', 'Metered volume 12% below contracted minimum for March delivery. Shortfall penalty disputed.', 258000, 'trd005solar00000005', 'evidence_phase', '2024-03-18T10:00:00Z'),
('dsp002payment000002', 'p005carbonbridge005', 'p003enveragreen00003', 'payment', 'Payment for carbon credit batch not received within 30-day terms. Invoice INV-2024-000001 outstanding.', 488750, NULL, 'filed', '2024-03-20T09:00:00Z');

-- 10. Milestones for lead project (proj001solarfarm0001)
INSERT OR IGNORE INTO milestones (id, project_id, name, sequence, status, target_date, completed_date) VALUES
('ms001envauth0000001', 'proj001solarfarm0001', 'Environmental Authorisation', 1, 'completed', '2023-06-30', '2023-06-15'),
('ms002gridconn000002', 'proj001solarfarm0001', 'Grid Connection Agreement', 2, 'completed', '2023-09-30', '2023-09-20'),
('ms003nersagen000003', 'proj001solarfarm0001', 'Generation Licence (NERSA)', 3, 'completed', '2023-12-31', '2023-11-28'),
('ms004ppaexec0000004', 'proj001solarfarm0001', 'PPA Execution', 4, 'completed', '2024-01-31', '2024-01-15'),
('ms005financlclose05', 'proj001solarfarm0001', 'Financial Close — All CPs', 5, 'completed', '2024-03-31', '2024-03-10'),
('ms006constcommence6', 'proj001solarfarm0001', 'Construction Commencement', 6, 'in_progress', '2024-04-30', NULL),
('ms007commission0007', 'proj001solarfarm0001', 'Commissioning & Testing', 7, 'pending', '2025-03-31', NULL),
('ms008cod00000000008', 'proj001solarfarm0001', 'COD Declaration', 8, 'pending', '2025-06-30', NULL),
('ms009envauth0000009', 'proj002windfarm00002', 'Environmental Authorisation', 1, 'completed', '2024-03-31', '2024-03-20'),
('ms010gridconn00010', 'proj002windfarm00002', 'Grid Connection Agreement', 2, 'in_progress', '2024-06-30', NULL);

-- 11. Conditions Precedent for lead project
INSERT OR IGNORE INTO conditions_precedent (id, project_id, description, category, status, responsible_party) VALUES
('cp001signedppa00001', 'proj001solarfarm0001', 'Signed PPA or equivalent offtake', 'legal', 'satisfied', 'ipp'),
('cp002envauth0000002', 'proj001solarfarm0001', 'Environmental Authorisation (EIA approved)', 'environmental', 'satisfied', 'ipp'),
('cp003nersalic000003', 'proj001solarfarm0001', 'Generation Licence issued by NERSA', 'regulatory', 'satisfied', 'ipp'),
('cp004gridconn000004', 'proj001solarfarm0001', 'Grid Connection Agreement signed', 'technical', 'satisfied', 'grid'),
('cp005epccontract005', 'proj001solarfarm0001', 'EPC Contract executed', 'legal', 'satisfied', 'ipp'),
('cp006insurance00006', 'proj001solarfarm0001', 'Insurance policies in place', 'insurance', 'satisfied', 'ipp'),
('cp007landrights0007', 'proj001solarfarm0001', 'Land rights secured (lease/ownership)', 'legal', 'satisfied', 'ipp'),
('cp008equityconf0008', 'proj001solarfarm0001', 'Equity contribution confirmed', 'financial', 'satisfied', 'ipp'),
('cp009legalopinion09', 'proj001solarfarm0001', 'Legal opinions delivered', 'legal', 'satisfied', 'lender'),
('cp010ieappointed010', 'proj001solarfarm0001', 'Independent Engineer appointed', 'technical', 'satisfied', 'lender');

-- 12. Disbursements
INSERT OR IGNORE INTO disbursements (id, project_id, amount_cents, purpose, status, ie_certification, lender_approval) VALUES
('disb001first0000001', 'proj001solarfarm0001', 2500000000, 'Initial mobilisation and site preparation', 'disbursed', 1, 1),
('disb002second000002', 'proj001solarfarm0001', 5000000000, 'Foundation and civil works', 'approved', 1, 1),
('disb003third0000003', 'proj001solarfarm0001', 3500000000, 'Module procurement and delivery', 'ie_certified', 1, 0),
('disb004fourth000004', 'proj001solarfarm0001', 2000000000, 'Electrical installation and grid tie-in', 'pending', 0, 0);

-- 13. Statutory Checks (mix of statuses)
INSERT OR IGNORE INTO statutory_checks (id, entity_type, entity_id, regulation, status, method, source, checked_at) VALUES
('sc001cipc000000001', 'participant', 'p001terravolt00000001', 'cipc', 'pass', 'auto', 'CIPC Registry', '2024-01-15T10:00:00Z'),
('sc002sarstax000002', 'participant', 'p001terravolt00000001', 'sars_tax', 'pass', 'auto', 'SARS eFiling', '2024-01-15T10:00:05Z'),
('sc003fica0000000003', 'participant', 'p001terravolt00000001', 'fica', 'pass', 'auto', 'FICA KYC Module', '2024-01-15T10:00:10Z'),
('sc004nersa000000004', 'participant', 'p001terravolt00000001', 'nersa', 'pass', 'auto', 'NERSA Registry', '2024-01-15T10:00:15Z'),
('sc005bbbee000000005', 'participant', 'p001terravolt00000001', 'bbbee', 'pass', 'auto', 'CIPC/DTI', '2024-01-15T10:00:20Z'),
('sc006era0000000006', 'document', 'doc003ppawheel00003', 'era', 'pass', 'auto', 'NERSA API', '2024-02-01T09:00:00Z'),
('sc007municipal00007', 'document', 'doc003ppawheel00003', 'municipal_systems', 'pending', 'manual', NULL, NULL),
('sc008fsca0000000008', 'participant', 'p003enveragreen00003', 'fsca', 'pass', 'auto', 'FSCA Registry', '2024-01-20T11:00:00Z'),
('sc009cipc000000009', 'participant', 'p005carbonbridge005', 'cipc', 'fail', 'auto', 'CIPC Registry', '2024-01-18T10:00:00Z');

-- 14. KYC Documents
INSERT OR IGNORE INTO kyc_documents (id, participant_id, document_type, r2_key, file_name, verified, auto_verified) VALUES
('kyc001id00000000001', 'p001terravolt00000001', 'id_document', 'kyc/p001/id_document/james_mokoena_id.pdf', 'james_mokoena_id.pdf', 1, 0),
('kyc002companyreg002', 'p001terravolt00000001', 'company_registration', 'kyc/p001/company_registration/cipc_cert.pdf', 'cipc_cert.pdf', 1, 1),
('kyc003taxclear00003', 'p001terravolt00000001', 'tax_clearance', 'kyc/p001/tax_clearance/sars_clearance.pdf', 'sars_clearance.pdf', 1, 1),
('kyc004nersalic00004', 'p001terravolt00000001', 'nersa_licence', 'kyc/p001/nersa_licence/nersa_gen_licence.pdf', 'nersa_gen_licence.pdf', 1, 0);

-- 15. Licences
INSERT OR IGNORE INTO licences (id, participant_id, type, licence_number, registry, issued_date, expiry_date, auto_verified, status) VALUES
('lic001nersagen00001', 'p001terravolt00000001', 'nersa_generation', 'NERSA-GEN-2020-0451', 'NERSA', '2020-06-15', '2025-06-14', 1, 'active'),
('lic002fscaotc000002', 'p003enveragreen00003', 'fsca_otc', 'FSCA-OTC-2022-1234', 'FSCA', '2022-03-01', '2025-02-28', 1, 'active'),
('lic003fscafais00003', 'p004greenfundmgr0004', 'fsca_fais', 'FSCA-FAIS-2019-5678', 'FSCA', '2019-11-01', '2024-10-31', 1, 'active');

-- 16. Fee Schedule
INSERT OR IGNORE INTO fee_schedule (id, fee_type, description, rate, basis, minimum_cents) VALUES
('fee001trading000001', 'trading', 'Platform trading fee per fill', 0.0015, 'percentage', 100),
('fee002settlement0002', 'settlement', 'Settlement processing fee', 0.001, 'percentage', 500),
('fee003listing000003', 'listing', 'Marketplace listing fee', 5000, 'fixed', 5000),
('fee004retirement0004', 'carbon_retirement', 'Carbon credit retirement fee', 250, 'per_unit', 250),
('fee005optionprem005', 'option_premium', 'Option writing platform fee', 0.005, 'percentage', 1000),
('fee006docgen0000006', 'document_generation', 'Document generation fee', 2500, 'fixed', 2500);

-- 17. Document Templates
INSERT OR IGNORE INTO document_templates (id, name, document_type, version, page_count, active) VALUES
('tmpl001loi00000001', 'Standard Letter of Intent', 'loi', 'v1.0', 4, 1),
('tmpl002termsheet002', 'Energy Term Sheet', 'term_sheet', 'v1.0', 8, 1),
('tmpl003ppawheeling3', 'PPA Virtual Wheeling Agreement', 'ppa_wheeling', 'v1.0', 42, 1),
('tmpl004ppabtm000004', 'PPA Behind-the-Meter', 'ppa_btm', 'v1.0', 28, 1),
('tmpl005carbpurch005', 'Carbon Credit Purchase Agreement', 'carbon_purchase', 'v1.0', 18, 1),
('tmpl006carboptisda6', 'ISDA Carbon Option Confirmation', 'carbon_option_isda', 'v1.0', 35, 1),
('tmpl007epc00000007', 'EPC Construction Agreement', 'epc', 'v1.0', 55, 1),
('tmpl008wheelagmt008', 'Wheeling Framework Agreement', 'wheeling_agreement', 'v1.0', 22, 1),
('tmpl009nda00000009', 'Mutual Non-Disclosure Agreement', 'nda', 'v1.0', 5, 1);

-- 18. Marketplace Listings
INSERT OR IGNORE INTO marketplace_listings (id, seller_id, type, technology, capacity_mw, volume, price_cents, tenor_months, location, description, status, bid_count) VALUES
('lst001energy0000001', 'p001terravolt00000001', 'energy', 'solar', 75.0, 50000, 8500, 240, 'Limpopo', 'Limpopo Solar Farm — 75MW PPA available, 20yr tenor, virtual wheeling', 'active', 3),
('lst002carbon0000002', 'p005carbonbridge005', 'carbon', NULL, NULL, 500, 1650, NULL, 'KwaZulu-Natal', 'CDM-certified credits — 2021 vintage, AMS-I.E methodology', 'active', 1),
('lst003rfp0000000003', 'p002bevcopower000002', 'rfp', NULL, NULL, 100000, NULL, 120, 'Western Cape', 'RFP: 100GWh/year renewable energy supply — 10yr, starting 2025', 'active', 5);

-- 19. Notifications
INSERT OR IGNORE INTO notifications (id, participant_id, title, body, type, read, entity_type, entity_id) VALUES
('ntf001trade00000001', 'p003enveragreen00003', 'Trade Executed', 'Your buy order for 50 MWh solar filled at R85.00/MWh', 'trade', 1, 'trade', 'trd001solar00000001'),
('ntf002contract000002', 'p001terravolt00000001', 'PPA Ready for Signing', 'Limpopo Solar PPA is in execution phase. Please sign.', 'contract', 0, 'contract_document', 'doc003ppawheel00003'),
('ntf003compliance003', 'p001terravolt00000001', 'NERSA Licence Renewal', 'Your NERSA generation licence expires in 90 days.', 'compliance', 0, 'licence', 'lic001nersagen00001'),
('ntf004dispute000004', 'p001terravolt00000001', 'Dispute Filed Against You', 'BevCo has filed a delivery dispute for trade TRD005.', 'danger', 0, 'dispute', 'dsp001settlement001'),
('ntf005settlement005', 'p003enveragreen00003', 'Invoice Outstanding', 'Invoice INV-2024-000001 for R4,887.50 is outstanding.', 'warning', 0, 'invoice', 'inv001outstanding001');

-- 20. Audit Log (20+ entries)
INSERT OR IGNORE INTO audit_log (id, actor_id, action, entity_type, entity_id, details, created_at) VALUES
('aud001register00001', 'p001terravolt00000001', 'register', 'participant', 'p001terravolt00000001', '{"role":"ipp"}', '2024-01-15T09:00:00Z'),
('aud002register00002', 'p002bevcopower000002', 'register', 'participant', 'p002bevcopower000002', '{"role":"offtaker"}', '2024-01-15T09:30:00Z'),
('aud003register00003', 'p003enveragreen00003', 'register', 'participant', 'p003enveragreen00003', '{"role":"trader"}', '2024-01-16T10:00:00Z'),
('aud004register00004', 'p004greenfundmgr0004', 'register', 'participant', 'p004greenfundmgr0004', '{"role":"carbon_fund"}', '2024-01-17T11:00:00Z'),
('aud005register00005', 'p005carbonbridge005', 'register', 'participant', 'p005carbonbridge005', '{"role":"trader"}', '2024-01-18T09:00:00Z'),
('aud006register00006', 'p006absacib00000006', 'register', 'participant', 'p006absacib00000006', '{"role":"lender"}', '2024-01-19T10:00:00Z'),
('aud007register00007', 'p007eskomgrid0000007', 'register', 'participant', 'p007eskomgrid0000007', '{"role":"grid"}', '2024-01-20T11:00:00Z'),
('aud008approve000008', 'p000adminplatform000', 'approve_participant', 'participant', 'p001terravolt00000001', '{"approved_by":"admin"}', '2024-01-15T14:00:00Z'),
('aud009createproj009', 'p001terravolt00000001', 'create_project', 'project', 'proj001solarfarm0001', '{"name":"Limpopo Solar Farm"}', '2024-01-20T09:00:00Z'),
('aud010createdoc0010', 'p001terravolt00000001', 'create_document', 'contract_document', 'doc001loi000000001', '{"type":"loi"}', '2024-01-25T10:00:00Z'),
('aud011phaseadv00011', 'p001terravolt00000001', 'phase_transition', 'contract_document', 'doc001loi000000001', '{"from":"draft","to":"loi"}', '2024-01-26T10:00:00Z'),
('aud012signdoc000012', 'p001terravolt00000001', 'sign_document', 'contract_document', 'doc001loi000000001', '{"signatory":"James Mokoena"}', '2024-01-27T10:00:00Z'),
('aud013placeorder013', 'p003enveragreen00003', 'place_order', 'order', 'ord001solar00000001', '{"direction":"buy","market":"solar"}', '2024-03-15T09:28:00Z'),
('aud014trade00000014', 'p003enveragreen00003', 'settle_trade', 'trade', 'trd001solar00000001', '{"volume":50,"price_cents":8500}', '2024-03-15T09:30:00Z'),
('aud015gninvoice0015', 'p001terravolt00000001', 'generate_invoice', 'invoice', 'inv001outstanding001', '{"total_cents":488750}', '2024-03-15T09:35:00Z'),
('aud016filedispute16', 'p002bevcopower000002', 'file_dispute', 'dispute', 'dsp001settlement001', '{"category":"delivery"}', '2024-03-18T10:00:00Z'),
('aud017retirecred017', 'p004greenfundmgr0004', 'retire_credits', 'carbon_credit', 'cc001goldstd00000001', '{"quantity":150}', '2024-03-19T11:00:00Z'),
('aud018writeoption18', 'p004greenfundmgr0004', 'write_option', 'carbon_option', 'opt001call00000001', '{"type":"call","strike":2000}', '2024-03-20T10:00:00Z'),
('aud019kycupload0019', 'p001terravolt00000001', 'upload_kyc_document', 'kyc_document', 'kyc001id00000000001', '{"type":"id_document"}', '2024-01-15T09:15:00Z'),
('aud020override00020', 'p000adminplatform000', 'override_statutory', 'statutory_check', 'sc009cipc000000009', '{"regulation":"cipc","reason":"Manual verification completed"}', '2024-01-19T15:00:00Z');
