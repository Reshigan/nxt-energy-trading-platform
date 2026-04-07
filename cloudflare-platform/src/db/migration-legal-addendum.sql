-- Legal/Digital Signatures Addendum — Schema additions
-- Run against existing D1 database to add legal compliance columns

-- Add POPIA consent columns to participants
ALTER TABLE participants ADD COLUMN consent_given INTEGER DEFAULT 0;
ALTER TABLE participants ADD COLUMN consent_given_at TEXT;
ALTER TABLE participants ADD COLUMN consent_version TEXT DEFAULT '1.0';

-- Add governing law and jurisdiction columns to contract_documents
ALTER TABLE contract_documents ADD COLUMN governing_law TEXT DEFAULT 'South Africa';
ALTER TABLE contract_documents ADD COLUMN jurisdiction TEXT DEFAULT 'Gauteng Division, High Court of South Africa';
ALTER TABLE contract_documents ADD COLUMN dispute_resolution TEXT DEFAULT 'AFSA Arbitration';
ALTER TABLE contract_documents ADD COLUMN integrity_seal TEXT;

-- Add signing certificate and chain hash columns to document_signatories
ALTER TABLE document_signatories ADD COLUMN certificate_serial TEXT;
ALTER TABLE document_signatories ADD COLUMN certificate_r2_key TEXT;
ALTER TABLE document_signatories ADD COLUMN chain_hash TEXT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_contract_documents_governing_law ON contract_documents(governing_law);
CREATE INDEX IF NOT EXISTS idx_document_signatories_certificate ON document_signatories(certificate_serial);
