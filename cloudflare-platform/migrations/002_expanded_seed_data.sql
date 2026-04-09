-- Migration 002: Expanded seed data for UAT
-- Phase 6.3: 5 demo participants, 3 projects, 10 contracts, 20 orders, 15 carbon credits, 5 invoices

-- Additional participants (beyond existing seed)
INSERT OR IGNORE INTO participants (id, company_name, registration_number, role, contact_person, email, phone, province, bbbee_level, kyc_status)
VALUES
  ('P-UAT-IPP2', 'WindPower SA', '2021/200001/07', 'generator', 'Linda Nkosi', 'linda@windpower.co.za', '+27115550101', 'Eastern Cape', 2, 'verified'),
  ('P-UAT-TRD2', 'GreenTraders Pty', '2021/200002/07', 'trader', 'Johan van Wyk', 'johan@greentraders.co.za', '+27115550102', 'Gauteng', 1, 'verified'),
  ('P-UAT-OFF2', 'MuniPower Cape', '2021/200003/07', 'offtaker', 'Fatima Patel', 'fatima@munipower.co.za', '+27115550103', 'Western Cape', 3, 'verified'),
  ('P-UAT-LND2', 'DevBank Africa', '2021/200004/07', 'lender', 'Samuel Moyo', 'samuel@devbank.co.za', '+27115550104', 'Gauteng', 1, 'verified'),
  ('P-UAT-GRD2', 'GridOps National', '2021/200005/07', 'grid', 'Priya Govender', 'priya@gridops.co.za', '+27115550105', 'KwaZulu-Natal', 2, 'verified');

-- Additional projects
INSERT OR IGNORE INTO projects (id, name, developer_id, technology, capacity_mw, province, status, completion_pct, grid_connection_status)
VALUES
  ('PRJ-UAT-001', 'Karoo Solar Array', 'P-UAT-IPP2', 'solar', 75.0, 'Northern Cape', 'construction', 80, 'approved'),
  ('PRJ-UAT-002', 'Jeffreys Bay Wind', 'P-UAT-IPP2', 'wind', 120.0, 'Eastern Cape', 'operational', 100, 'connected'),
  ('PRJ-UAT-003', 'Vaal Hydro Station', 'P-UAT-IPP2', 'hydro', 30.0, 'Free State', 'development', 20, 'not_applied');

-- Additional contract documents
INSERT OR IGNORE INTO contract_documents (id, title, document_type, status, phase, version_major, version_minor, parties, created_by, sha256_hash)
VALUES
  ('DOC-UAT-001', 'Karoo PPA 25-year', 'ppa', 'active', 'execution', 1, 0, '["P-UAT-IPP2","P-UAT-OFF2"]', 'P-UAT-IPP2', 'uat001hash'),
  ('DOC-UAT-002', 'Wind Farm Term Sheet', 'term_sheet', 'active', 'execution', 1, 0, '["P-UAT-IPP2","P-UAT-LND2"]', 'P-UAT-IPP2', 'uat002hash'),
  ('DOC-UAT-003', 'Carbon Offtake Agreement', 'ppa', 'pending_signature', 'signing', 1, 0, '["P-UAT-IPP2","P-UAT-TRD2"]', 'P-UAT-TRD2', 'uat003hash'),
  ('DOC-UAT-004', 'Grid Connection Agreement', 'ppa', 'active', 'execution', 2, 1, '["P-UAT-IPP2","P-UAT-GRD2"]', 'P-UAT-GRD2', 'uat004hash'),
  ('DOC-UAT-005', 'Loan Facility Agreement', 'term_sheet', 'active', 'execution', 1, 0, '["P-UAT-IPP2","P-UAT-LND2"]', 'P-UAT-LND2', 'uat005hash'),
  ('DOC-UAT-006', 'EPC Contract Karoo', 'ppa', 'active', 'execution', 1, 2, '["P-UAT-IPP2"]', 'P-UAT-IPP2', 'uat006hash'),
  ('DOC-UAT-007', 'Vaal Feasibility Study', 'term_sheet', 'draft', 'negotiation', 0, 1, '["P-UAT-IPP2"]', 'P-UAT-IPP2', 'uat007hash'),
  ('DOC-UAT-008', 'Insurance Policy Wind', 'ppa', 'active', 'execution', 1, 0, '["P-UAT-IPP2"]', 'P-UAT-IPP2', 'uat008hash'),
  ('DOC-UAT-009', 'Interconnection Agreement', 'ppa', 'active', 'execution', 1, 0, '["P-UAT-IPP2","P-UAT-GRD2"]', 'P-UAT-GRD2', 'uat009hash'),
  ('DOC-UAT-010', 'O&M Contract Wind', 'ppa', 'active', 'execution', 1, 0, '["P-UAT-IPP2"]', 'P-UAT-IPP2', 'uat010hash');

-- Additional orders (20 orders across markets)
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
INSERT OR IGNORE INTO trades (id, buy_order_id, sell_order_id, buyer_id, seller_id, market, volume, price_cents, total_cents, status)
VALUES
  ('TRD-UAT-001', 'ORD-UAT-011', 'ORD-UAT-012', 'P-UAT-TRD2', 'P-UAT-IPP2', 'solar', 20.0, 12150, 243000, 'settled'),
  ('TRD-UAT-002', 'ORD-UAT-013', 'ORD-UAT-014', 'P-UAT-OFF2', 'P-UAT-TRD2', 'gas', 15.0, 14350, 215250, 'settled'),
  ('TRD-UAT-003', 'ORD-UAT-016', 'ORD-UAT-015', 'P-UAT-OFF2', 'P-UAT-IPP2', 'wind', 30.0, 12600, 378000, 'pending');

-- Additional carbon credits (15 total)
INSERT OR IGNORE INTO carbon_credits (id, project_id, owner_id, vintage_year, volume_tonnes, status, registry, serial_number)
VALUES
  ('CC-UAT-001', 'PRJ-UAT-001', 'P-UAT-IPP2', 2024, 2500, 'active', 'gold_standard', 'GS-2024-UAT001'),
  ('CC-UAT-002', 'PRJ-UAT-001', 'P-UAT-IPP2', 2024, 1800, 'active', 'gold_standard', 'GS-2024-UAT002'),
  ('CC-UAT-003', 'PRJ-UAT-002', 'P-UAT-IPP2', 2024, 3200, 'active', 'verra', 'VCS-2024-UAT001'),
  ('CC-UAT-004', 'PRJ-UAT-002', 'P-UAT-IPP2', 2023, 1500, 'active', 'verra', 'VCS-2023-UAT001'),
  ('CC-UAT-005', 'PRJ-UAT-002', 'P-UAT-TRD2', 2024, 800, 'active', 'verra', 'VCS-2024-UAT002'),
  ('CC-UAT-006', 'PRJ-UAT-001', 'P-UAT-TRD2', 2023, 1200, 'retired', 'gold_standard', 'GS-2023-UAT001'),
  ('CC-UAT-007', 'PRJ-UAT-001', 'P-UAT-IPP2', 2025, 2000, 'active', 'gold_standard', 'GS-2025-UAT001'),
  ('CC-UAT-008', 'PRJ-UAT-002', 'P-UAT-OFF2', 2024, 600, 'active', 'verra', 'VCS-2024-UAT003'),
  ('CC-UAT-009', 'PRJ-UAT-001', 'P-UAT-IPP2', 2025, 1000, 'pending', 'gold_standard', 'GS-2025-UAT002'),
  ('CC-UAT-010', 'PRJ-UAT-002', 'P-UAT-TRD2', 2023, 500, 'retired', 'verra', 'VCS-2023-UAT002'),
  ('CC-UAT-011', 'PRJ-UAT-003', 'P-UAT-IPP2', 2025, 400, 'pending', 'gold_standard', 'GS-2025-UAT003'),
  ('CC-UAT-012', 'PRJ-UAT-001', 'P-UAT-OFF2', 2024, 750, 'active', 'gold_standard', 'GS-2024-UAT003'),
  ('CC-UAT-013', 'PRJ-UAT-002', 'P-UAT-IPP2', 2024, 900, 'active', 'verra', 'VCS-2024-UAT004'),
  ('CC-UAT-014', 'PRJ-UAT-001', 'P-UAT-TRD2', 2025, 350, 'active', 'gold_standard', 'GS-2025-UAT004'),
  ('CC-UAT-015', 'PRJ-UAT-002', 'P-UAT-OFF2', 2023, 1100, 'retired', 'verra', 'VCS-2023-UAT003');

-- Additional invoices
INSERT OR IGNORE INTO invoices (id, from_participant, to_participant, amount_cents, status, due_date)
VALUES
  ('INV-UAT-001', 'P-UAT-IPP2', 'P-UAT-OFF2', 24300000, 'paid', '2025-03-15'),
  ('INV-UAT-002', 'P-UAT-TRD2', 'P-UAT-OFF2', 21525000, 'outstanding', '2025-05-01'),
  ('INV-UAT-003', 'P-UAT-IPP2', 'P-UAT-OFF2', 37800000, 'outstanding', '2025-06-01'),
  ('INV-UAT-004', 'P-UAT-IPP2', 'P-UAT-TRD2', 5000000, 'paid', '2025-02-01'),
  ('INV-UAT-005', 'P-UAT-LND2', 'P-UAT-IPP2', 150000000, 'outstanding', '2025-12-31');

-- Project milestones for UAT projects
INSERT OR IGNORE INTO project_milestones (id, project_id, name, target_date, status)
VALUES
  ('MS-UAT-001', 'PRJ-UAT-001', 'Financial Close', '2024-06-01', 'completed'),
  ('MS-UAT-002', 'PRJ-UAT-001', 'Site Preparation', '2024-09-01', 'completed'),
  ('MS-UAT-003', 'PRJ-UAT-001', 'Panel Installation', '2025-03-01', 'in_progress'),
  ('MS-UAT-004', 'PRJ-UAT-001', 'Grid Connection', '2025-06-01', 'pending'),
  ('MS-UAT-005', 'PRJ-UAT-001', 'Commercial Operation', '2025-08-01', 'pending'),
  ('MS-UAT-006', 'PRJ-UAT-002', 'Financial Close', '2023-12-01', 'completed'),
  ('MS-UAT-007', 'PRJ-UAT-002', 'Construction Complete', '2024-09-01', 'completed'),
  ('MS-UAT-008', 'PRJ-UAT-002', 'Commercial Operation', '2024-11-01', 'completed'),
  ('MS-UAT-009', 'PRJ-UAT-003', 'Feasibility Study', '2025-06-01', 'in_progress'),
  ('MS-UAT-010', 'PRJ-UAT-003', 'Environmental Approval', '2025-12-01', 'pending');
