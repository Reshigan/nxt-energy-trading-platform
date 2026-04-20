-- Migration 010: Create contracts table + SA-law legal framework metadata
-- ═══════════════════════════════════════════════════════════════════════
-- The contracts table represents executed business agreements (PPAs, wheeling,
-- carbon offtake, etc.) as distinct from contract_documents which tracks the
-- document lifecycle/phase (draft → LOI → term sheet → execution → active).
--
-- All contract templates comply with South African legislation including:
--   • Electricity Regulation Act 4 of 2006 (ERA)
--   • NERSA Regulatory Rules for embedded generation and wheeling
--   • Protection of Personal Information Act 4 of 2013 (POPIA)
--   • Financial Intelligence Centre Act 38 of 2001 (FICA)
--   • Consumer Protection Act 68 of 2008 (CPA) — cooling-off rights
--   • Broad-Based Black Economic Empowerment Act 53 of 2003 (B-BBEE)
--   • Companies Act 71 of 2008
--   • Carbon Tax Act 15 of 2019
--   • National Environmental Management Act 107 of 1998 (NEMA)
--   • Financial Markets Act 19 of 2012 (derivatives)
--   • Financial Sector Regulation Act 9 of 2017 (FSRA / Twin Peaks)
--   • Electronic Communications and Transactions Act 25 of 2002 (ECT Act)
--   • Arbitration Act 42 of 1965 / AFSA Rules
--   • Construction Industry Development Board Act 38 of 2000 (CIDB)
--   • Occupational Health and Safety Act 85 of 1993 (OHS)

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_type TEXT NOT NULL CHECK (contract_type IN (
    'ppa_wheeling','ppa_btm','solar_ppa','wind_ppa','wheeling_agreement',
    'carbon_offtake','carbon_option','forward','epc','grid_connection',
    'project_finance','nda','service','gas_spot','loi','term_sheet','hoa','side_letter'
  )),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  counterparty_id TEXT NOT NULL REFERENCES participants(id),
  project_id TEXT REFERENCES projects(id),
  document_id TEXT REFERENCES contract_documents(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','active','suspended','terminated','expired')),
  start_date TEXT,
  end_date TEXT,
  value_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  term_months INTEGER,
  auto_renew INTEGER NOT NULL DEFAULT 0,
  -- SA regulatory compliance fields
  governing_law TEXT NOT NULL DEFAULT 'Republic of South Africa',
  jurisdiction TEXT NOT NULL DEFAULT 'Gauteng Division, High Court of South Africa, Johannesburg',
  nersa_licence_ref TEXT,
  era_registration_ref TEXT,
  bbbee_level_required INTEGER,
  popia_dpia_completed INTEGER NOT NULL DEFAULT 0,
  fica_verified INTEGER NOT NULL DEFAULT 0,
  dispute_resolution_method TEXT NOT NULL DEFAULT 'afsa_arbitration'
    CHECK (dispute_resolution_method IN ('afsa_arbitration','mediation','litigation','expert_determination')),
  cooling_off_applicable INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  commercial_terms TEXT,
  template_version TEXT NOT NULL DEFAULT 'v2.0-za',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_participant ON contracts(participant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_counterparty ON contracts(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);

-- Seed contracts from existing contract_documents
INSERT OR IGNORE INTO contracts (
  id, contract_type, participant_id, counterparty_id, project_id,
  document_id, title, status, term_months,
  governing_law, jurisdiction, template_version
)
SELECT
  'ctr-' || cd.id,
  CASE cd.document_type
    WHEN 'ppa_wheeling' THEN 'ppa_wheeling'
    WHEN 'ppa_btm' THEN 'ppa_btm'
    WHEN 'solar_ppa' THEN 'solar_ppa'
    WHEN 'wind_ppa' THEN 'wind_ppa'
    WHEN 'wheeling_agreement' THEN 'wheeling_agreement'
    WHEN 'carbon_purchase' THEN 'carbon_offtake'
    WHEN 'carbon_option_isda' THEN 'carbon_option'
    WHEN 'forward' THEN 'forward'
    WHEN 'epc' THEN 'epc'
    WHEN 'nda' THEN 'nda'
    WHEN 'loi' THEN 'loi'
    WHEN 'term_sheet' THEN 'term_sheet'
    WHEN 'hoa' THEN 'hoa'
    WHEN 'side_letter' THEN 'side_letter'
    WHEN 'gas_spot' THEN 'gas_spot'
    ELSE 'service'
  END,
  cd.creator_id,
  cd.counterparty_id,
  cd.project_id,
  cd.id,
  cd.title,
  CASE WHEN cd.phase IN ('active', 'execution') THEN 'active' ELSE 'draft' END,
  240,
  'Republic of South Africa',
  'Gauteng Division, High Court of South Africa, Johannesburg',
  'v2.0-za'
FROM contract_documents cd;

-- Add legal framework metadata columns to document_templates
ALTER TABLE document_templates ADD COLUMN legal_framework TEXT;
ALTER TABLE document_templates ADD COLUMN governing_legislation TEXT;
ALTER TABLE document_templates ADD COLUMN mandatory_annexures TEXT;

-- Tag energy contract templates with NERSA / ERA legislation
UPDATE document_templates SET
  legal_framework = 'South African Law — Energy Sector',
  governing_legislation = 'Electricity Regulation Act 4/2006; NERSA Rules on Embedded Generation; Grid Code (Version 10); Distribution Code; NRS 049; NRS 097',
  mandatory_annexures = '["Annexure A: Technical Specifications","Annexure B: Commercial Terms Schedule","Annexure C: NERSA Licence Copy","Annexure D: Grid Connection Agreement","Annexure E: Metering Specification (NRS 049)","Annexure F: B-BBEE Certificate"]'
WHERE document_type IN ('ppa_wheeling', 'ppa_btm', 'solar_ppa', 'wind_ppa', 'wheeling_agreement');

-- Tag carbon templates with Carbon Tax Act / NEMA
UPDATE document_templates SET
  legal_framework = 'South African Law — Carbon & Environmental',
  governing_legislation = 'Carbon Tax Act 15/2019; National Environmental Management Act 107/1998 (NEMA); National Environmental Management: Air Quality Act 39/2004',
  mandatory_annexures = '["Annexure A: Credit Specifications & Serial Numbers","Annexure B: Registry Account Details","Annexure C: Third-Party Verification Report","Annexure D: SDG Co-Benefit Evidence"]'
WHERE document_type IN ('carbon_purchase');

-- Tag ISDA / derivatives with Financial Markets Act
UPDATE document_templates SET
  legal_framework = 'South African Law — Financial Derivatives',
  governing_legislation = 'Financial Markets Act 19/2012; FSCA Conduct Standards; ISDA 2002 Master Agreement (SA-adapted); Financial Sector Regulation Act 9/2017',
  mandatory_annexures = '["Annexure A: ISDA Schedule (SA-adapted)","Annexure B: Credit Support Annex","Annexure C: FSCA Reporting Confirmation"]'
WHERE document_type IN ('carbon_option_isda');

-- Tag EPC with CIDB / OHS
UPDATE document_templates SET
  legal_framework = 'South African Law — Construction',
  governing_legislation = 'CIDB Act 38/2000; Occupational Health and Safety Act 85/1993; NEC4 ECC (SA-adapted); ECSA Code of Conduct; National Building Regulations (SANS 10400)',
  mandatory_annexures = '["Annexure A: Scope of Works & Technical Specification","Annexure B: Bill of Quantities","Annexure C: Project Schedule (Gantt)","Annexure D: Performance Guarantee Instrument","Annexure E: CIDB Registration Certificate","Annexure F: OHS Plan (Construction Regulation 2014)","Annexure G: Environmental Management Plan"]'
WHERE document_type = 'epc';

-- Tag NDA with POPIA
UPDATE document_templates SET
  legal_framework = 'South African Law — Data Protection',
  governing_legislation = 'Protection of Personal Information Act 4/2013 (POPIA); Promotion of Access to Information Act 2/2000 (PAIA)',
  mandatory_annexures = '["Annexure A: Definition of Confidential Information","Annexure B: Permitted Recipients List"]'
WHERE document_type = 'nda';

-- Tag forward / gas with Financial Markets Act
UPDATE document_templates SET
  legal_framework = 'South African Law — Commodity Trading',
  governing_legislation = 'Financial Markets Act 19/2012; Gas Act 48/2001; Petroleum Pipelines Act 60/2003; SABS 1741 (Gas Quality)',
  mandatory_annexures = '["Annexure A: Delivery Schedule","Annexure B: Settlement Terms","Annexure C: Credit Support Details"]'
WHERE document_type IN ('forward', 'gas_spot');

-- Tag pre-agreement documents with Companies Act
UPDATE document_templates SET
  legal_framework = 'South African Law — Commercial',
  governing_legislation = 'Companies Act 71/2008; Common Law of Contract',
  mandatory_annexures = '["Annexure A: Key Terms Summary"]'
WHERE document_type IN ('loi', 'term_sheet', 'hoa', 'side_letter');

-- ═══════════════════════════════════════════════════════════════════════
-- Digital Signature Workflow Tables
-- ═══════════════════════════════════════════════════════════════════════

-- Contract signatories — tracks who must sign and their status
CREATE TABLE IF NOT EXISTS contract_signers (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT NOT NULL DEFAULT 'signatory'
    CHECK (signer_role IN ('signatory', 'witness', 'approver', 'observer')),
  signing_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined', 'expired')),
  signed_at TEXT,
  signature_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  decline_reason TEXT,
  reminder_sent_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_contract_signers_contract ON contract_signers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_participant ON contract_signers(participant_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_status ON contract_signers(status);

-- Contract field values — stores form-captured data for each contract
CREATE TABLE IF NOT EXISTS contract_field_values (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT NOT NULL DEFAULT 'text',
  section TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(contract_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_contract_field_values_contract ON contract_field_values(contract_id);

-- Contract activity log — cross-platform activity feed for all parties
CREATE TABLE IF NOT EXISTS contract_activity (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'submitted', 'sent_for_signing',
    'viewed', 'signed', 'declined', 'countersigned',
    'activated', 'suspended', 'terminated', 'expired',
    'reminder_sent', 'field_updated', 'comment_added',
    'document_generated', 'annexure_uploaded'
  )),
  details TEXT,
  visibility TEXT NOT NULL DEFAULT 'all_parties'
    CHECK (visibility IN ('all_parties', 'internal', 'creator_only')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_contract_activity_contract ON contract_activity(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_activity_actor ON contract_activity(actor_id);
CREATE INDEX IF NOT EXISTS idx_contract_activity_created ON contract_activity(created_at DESC);
