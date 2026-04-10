-- Migration 002: Expanded seed data for UAT
-- Phase 6.3: 5 demo participants, 3 projects, 10 contracts, 20 orders, 15 carbon credits, 5 invoices

-- Additional participants (beyond existing seed)
-- Schema requires: id, company_name, registration_number, tax_number(NOT NULL), role(NOT NULL CHECK), contact_person(NOT NULL), email(NOT NULL UNIQUE), password_hash(NOT NULL), password_salt(NOT NULL), phone(NOT NULL), physical_address(NOT NULL), bbbee_level, kyc_status
INSERT OR IGNORE INTO participants (id, company_name, registration_number, tax_number, role, contact_person, email, password_hash, password_salt, phone, physical_address, bbbee_level, kyc_status, trading_enabled)
VALUES
  ('P-UAT-IPP2', 'WindPower SA', '2021/200001/07', '9100000001', 'ipp', 'Linda Nkosi', 'linda@windpower.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27115550101', '10 Wind Avenue, Port Elizabeth, 6001', 2, 'verified', 1),
  ('P-UAT-TRD2', 'GreenTraders Pty', '2021/200002/07', '9100000002', 'trader', 'Johan van Wyk', 'johan@greentraders.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27115550102', '22 Market Street, Johannesburg, 2001', 1, 'verified', 1),
  ('P-UAT-OFF2', 'MuniPower Cape', '2021/200003/07', '9100000003', 'offtaker', 'Fatima Patel', 'fatima@munipower.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27115550103', '5 Civic Centre, Cape Town, 8001', 3, 'verified', 1),
  ('P-UAT-LND2', 'DevBank Africa', '2021/200004/07', '9100000004', 'lender', 'Samuel Moyo', 'samuel@devbank.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27115550104', '100 Finance Road, Sandton, 2196', 1, 'verified', 1),
  ('P-UAT-GRD2', 'GridOps National', '2021/200005/07', '9100000005', 'grid', 'Priya Govender', 'priya@gridops.co.za', '8ee5f8158e47e69d929347998f486e994e071cc731000a790dfca127d8748169', 'seedsalt12345678', '+27115550105', '1 Grid Road, Durban, 4001', 2, 'verified', 1);

-- Additional projects
-- Schema requires: id, name, developer_id(FK), technology(CHECK), capacity_mw, location(NOT NULL), province, phase(CHECK IN development/financial_close/construction/commissioning/commercial_ops)
INSERT OR IGNORE INTO projects (id, name, developer_id, technology, capacity_mw, location, province, phase)
VALUES
  ('PRJ-UAT-001', 'Karoo Solar Array', 'P-UAT-IPP2', 'solar', 75.0, 'Karoo, Northern Cape', 'Northern Cape', 'construction'),
  ('PRJ-UAT-002', 'Jeffreys Bay Wind', 'P-UAT-IPP2', 'wind', 120.0, 'Jeffreys Bay, Eastern Cape', 'Eastern Cape', 'commercial_ops'),
  ('PRJ-UAT-003', 'Vaal Hydro Station', 'P-UAT-IPP2', 'hydro', 30.0, 'Vaal Dam, Free State', 'Free State', 'development');

-- Additional contract documents
-- Schema requires: id, title, document_type(CHECK valid types), phase(CHECK valid phases), creator_id(FK NOT NULL), counterparty_id(FK NOT NULL), version, sha256_hash
INSERT OR IGNORE INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id, version, sha256_hash)
VALUES
  ('DOC-UAT-001', 'Karoo PPA 25-year', 'solar_ppa', 'active', 'P-UAT-IPP2', 'P-UAT-OFF2', 'v1.0', 'uat001hash'),
  ('DOC-UAT-002', 'Wind Farm Term Sheet', 'term_sheet', 'active', 'P-UAT-IPP2', 'P-UAT-LND2', 'v1.0', 'uat002hash'),
  ('DOC-UAT-003', 'Carbon Offtake Agreement', 'carbon_purchase', 'execution', 'P-UAT-TRD2', 'P-UAT-IPP2', 'v1.0', 'uat003hash'),
  ('DOC-UAT-004', 'Grid Connection Agreement', 'wheeling_agreement', 'active', 'P-UAT-GRD2', 'P-UAT-IPP2', 'v2.1', 'uat004hash'),
  ('DOC-UAT-005', 'Loan Facility Agreement', 'term_sheet', 'active', 'P-UAT-LND2', 'P-UAT-IPP2', 'v1.0', 'uat005hash'),
  ('DOC-UAT-006', 'EPC Contract Karoo', 'epc', 'active', 'P-UAT-IPP2', 'P-UAT-OFF2', 'v1.2', 'uat006hash'),
  ('DOC-UAT-007', 'Vaal Feasibility Study', 'term_sheet', 'draft', 'P-UAT-IPP2', 'P-UAT-LND2', 'v0.1', 'uat007hash'),
  ('DOC-UAT-008', 'Insurance Policy Wind', 'side_letter', 'active', 'P-UAT-IPP2', 'P-UAT-OFF2', 'v1.0', 'uat008hash'),
  ('DOC-UAT-009', 'Interconnection Agreement', 'wheeling_agreement', 'active', 'P-UAT-GRD2', 'P-UAT-IPP2', 'v1.0', 'uat009hash'),
  ('DOC-UAT-010', 'O&M Contract Wind', 'epc', 'active', 'P-UAT-IPP2', 'P-UAT-OFF2', 'v1.0', 'uat010hash');

-- Additional orders (20 orders across markets)
-- Schema: id, participant_id(FK), direction(buy/sell), market(CHECK), volume, price_cents, order_type(CHECK), validity(CHECK), status(CHECK)
INSERT OR IGNORE INTO orders (id, participant_id, direction, market, volume, price_cents, order_type, validity, status)
VALUES
  ('ORD-UAT-001', 'P-UAT-TRD2', 'buy', 'solar', 25.0, 11500, 'limit', 'gtc', 'open'),
  ('ORD-UAT-002', 'P-UAT-TRD2', 'sell', 'wind', 15.0, 13200, 'limit', 'gtc', 'open'),
  ('ORD-UAT-003', 'P-UAT-IPP2', 'sell', 'solar', 50.0, 12000, 'limit', 'day', 'open'),
  ('ORD-UAT-004', 'P-UAT-OFF2', 'buy', 'wind', 30.0, 12800, 'limit', 'gtc', 'open'),
  ('ORD-UAT-005', 'P-UAT-TRD2', 'buy', 'gas', 10.0, 15000, 'limit', 'day', 'open'),
  ('ORD-UAT-006', 'P-UAT-IPP2', 'sell', 'hydro', 20.0, 10500, 'limit', 'gtc', 'open'),
  ('ORD-UAT-007', 'P-UAT-OFF2', 'buy', 'solar', 40.0, 11800, 'limit', 'gtc', 'open'),
  ('ORD-UAT-008', 'P-UAT-TRD2', 'sell', 'carbon', 100.0, 8500, 'limit', 'gtc', 'open'),
  ('ORD-UAT-009', 'P-UAT-IPP2', 'sell', 'solar', 35.0, 11900, 'limit', 'day', 'open'),
  ('ORD-UAT-010', 'P-UAT-OFF2', 'buy', 'wind', 25.0, 13000, 'limit', 'gtc', 'open'),
  ('ORD-UAT-011', 'P-UAT-TRD2', 'buy', 'solar', 20.0, 12200, 'limit', 'gtc', 'filled'),
  ('ORD-UAT-012', 'P-UAT-IPP2', 'sell', 'solar', 20.0, 12100, 'limit', 'gtc', 'filled'),
  ('ORD-UAT-013', 'P-UAT-OFF2', 'buy', 'gas', 15.0, 14500, 'limit', 'day', 'filled'),
  ('ORD-UAT-014', 'P-UAT-TRD2', 'sell', 'gas', 15.0, 14200, 'limit', 'day', 'filled'),
  ('ORD-UAT-015', 'P-UAT-IPP2', 'sell', 'wind', 30.0, 12500, 'limit', 'gtc', 'filled'),
  ('ORD-UAT-016', 'P-UAT-OFF2', 'buy', 'wind', 30.0, 12700, 'limit', 'gtc', 'filled'),
  ('ORD-UAT-017', 'P-UAT-TRD2', 'buy', 'hydro', 10.0, 10800, 'limit', 'gtc', 'open'),
  ('ORD-UAT-018', 'P-UAT-IPP2', 'sell', 'battery', 5.0, 18000, 'limit', 'gtc', 'open'),
  ('ORD-UAT-019', 'P-UAT-OFF2', 'buy', 'battery', 5.0, 18500, 'limit', 'gtc', 'open'),
  ('ORD-UAT-020', 'P-UAT-TRD2', 'sell', 'solar', 45.0, 11700, 'limit', 'day', 'open');

-- Additional trades
-- Schema: id, buyer_id(FK), seller_id(FK), market(CHECK), volume, price_cents, total_cents, fee_cents(DEFAULT 0), order_id(FK nullable), status(CHECK)
INSERT OR IGNORE INTO trades (id, buyer_id, seller_id, market, volume, price_cents, total_cents, fee_cents, status)
VALUES
  ('TRD-UAT-001', 'P-UAT-TRD2', 'P-UAT-IPP2', 'solar', 20.0, 12150, 243000, 365, 'settled'),
  ('TRD-UAT-002', 'P-UAT-OFF2', 'P-UAT-TRD2', 'gas', 15.0, 14350, 215250, 323, 'settled'),
  ('TRD-UAT-003', 'P-UAT-OFF2', 'P-UAT-IPP2', 'wind', 30.0, 12600, 378000, 567, 'pending');

-- Additional carbon credits (15 total)
-- Schema: id, serial_number(NOT NULL UNIQUE), project_name(NOT NULL), registry(CHECK), vintage(NOT NULL), quantity(NOT NULL), available_quantity(NOT NULL), price_cents, status(CHECK), owner_id(FK)
INSERT OR IGNORE INTO carbon_credits (id, serial_number, project_name, registry, vintage, quantity, available_quantity, price_cents, status, owner_id)
VALUES
  ('CC-UAT-001', 'GS-2024-UAT001', 'Karoo Solar Array', 'gold_standard', 2024, 2500, 2500, 1875, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-002', 'GS-2024-UAT002', 'Karoo Solar Array', 'gold_standard', 2024, 1800, 1800, 1875, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-003', 'VCS-2024-UAT001', 'Jeffreys Bay Wind', 'verra', 2024, 3200, 3200, 1650, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-004', 'VCS-2023-UAT001', 'Jeffreys Bay Wind', 'verra', 2023, 1500, 1500, 1650, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-005', 'VCS-2024-UAT002', 'Jeffreys Bay Wind', 'verra', 2024, 800, 800, 1650, 'active', 'P-UAT-TRD2'),
  ('CC-UAT-006', 'GS-2023-UAT001', 'Karoo Solar Array', 'gold_standard', 2023, 1200, 0, 1875, 'retired', 'P-UAT-TRD2'),
  ('CC-UAT-007', 'GS-2025-UAT001', 'Karoo Solar Array', 'gold_standard', 2025, 2000, 2000, 2100, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-008', 'VCS-2024-UAT003', 'Jeffreys Bay Wind', 'verra', 2024, 600, 600, 1650, 'active', 'P-UAT-OFF2'),
  ('CC-UAT-009', 'GS-2025-UAT002', 'Karoo Solar Array', 'gold_standard', 2025, 1000, 1000, 2100, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-010', 'VCS-2023-UAT002', 'Jeffreys Bay Wind', 'verra', 2023, 500, 0, 1650, 'retired', 'P-UAT-TRD2'),
  ('CC-UAT-011', 'GS-2025-UAT003', 'Vaal Hydro Station', 'gold_standard', 2025, 400, 400, 2100, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-012', 'GS-2024-UAT003', 'Karoo Solar Array', 'gold_standard', 2024, 750, 750, 1875, 'active', 'P-UAT-OFF2'),
  ('CC-UAT-013', 'VCS-2024-UAT004', 'Jeffreys Bay Wind', 'verra', 2024, 900, 900, 1650, 'active', 'P-UAT-IPP2'),
  ('CC-UAT-014', 'GS-2025-UAT004', 'Karoo Solar Array', 'gold_standard', 2025, 350, 350, 2100, 'active', 'P-UAT-TRD2'),
  ('CC-UAT-015', 'VCS-2023-UAT003', 'Jeffreys Bay Wind', 'verra', 2023, 1100, 0, 1650, 'retired', 'P-UAT-OFF2');

-- Additional invoices
-- Schema: id, invoice_number(NOT NULL UNIQUE), trade_id(FK), from_participant_id(FK), to_participant_id(FK), subtotal_cents(NOT NULL), vat_cents(NOT NULL), total_cents(NOT NULL), status(CHECK), due_date
INSERT OR IGNORE INTO invoices (id, invoice_number, trade_id, from_participant_id, to_participant_id, subtotal_cents, vat_cents, total_cents, status, due_date)
VALUES
  ('INV-UAT-001', 'INV-UAT-2025-001', 'TRD-UAT-001', 'P-UAT-IPP2', 'P-UAT-TRD2', 211304, 31696, 243000, 'paid', '2025-03-15'),
  ('INV-UAT-002', 'INV-UAT-2025-002', 'TRD-UAT-002', 'P-UAT-TRD2', 'P-UAT-OFF2', 187174, 28076, 215250, 'outstanding', '2025-05-01'),
  ('INV-UAT-003', 'INV-UAT-2025-003', 'TRD-UAT-003', 'P-UAT-IPP2', 'P-UAT-OFF2', 328696, 49304, 378000, 'outstanding', '2025-06-01'),
  ('INV-UAT-004', 'INV-UAT-2025-004', NULL, 'P-UAT-IPP2', 'P-UAT-TRD2', 4347826, 652174, 5000000, 'paid', '2025-02-01'),
  ('INV-UAT-005', 'INV-UAT-2025-005', NULL, 'P-UAT-LND2', 'P-UAT-IPP2', 130434783, 19565217, 150000000, 'outstanding', '2025-12-31');

-- Project milestones for UAT projects
-- Schema table is 'milestones': id, project_id(FK), name, sequence(NOT NULL), status(CHECK pending/in_progress/completed/overdue/waived), target_date, completed_date
INSERT OR IGNORE INTO milestones (id, project_id, name, sequence, target_date, status)
VALUES
  ('MS-UAT-001', 'PRJ-UAT-001', 'Financial Close', 1, '2024-06-01', 'completed'),
  ('MS-UAT-002', 'PRJ-UAT-001', 'Site Preparation', 2, '2024-09-01', 'completed'),
  ('MS-UAT-003', 'PRJ-UAT-001', 'Panel Installation', 3, '2025-03-01', 'in_progress'),
  ('MS-UAT-004', 'PRJ-UAT-001', 'Grid Connection', 4, '2025-06-01', 'pending'),
  ('MS-UAT-005', 'PRJ-UAT-001', 'Commercial Operation', 5, '2025-08-01', 'pending'),
  ('MS-UAT-006', 'PRJ-UAT-002', 'Financial Close', 1, '2023-12-01', 'completed'),
  ('MS-UAT-007', 'PRJ-UAT-002', 'Construction Complete', 2, '2024-09-01', 'completed'),
  ('MS-UAT-008', 'PRJ-UAT-002', 'Commercial Operation', 3, '2024-11-01', 'completed'),
  ('MS-UAT-009', 'PRJ-UAT-003', 'Feasibility Study', 1, '2025-06-01', 'in_progress'),
  ('MS-UAT-010', 'PRJ-UAT-003', 'Environmental Approval', 2, '2025-12-01', 'pending');
