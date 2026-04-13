-- Migration 014: Go-Live Readiness Fixes
-- Expands role CHECK constraint, adds missing columns, fixes schema gaps

-- ═══════════════════════════════════════════════════════════════
-- 1. Expand participants role CHECK to include regulator, ipp_developer, generator
-- SQLite doesn't support ALTER COLUMN, so we recreate the table preserving data
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Create new table with expanded CHECK
CREATE TABLE IF NOT EXISTS participants_new (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  tax_number TEXT NOT NULL,
  vat_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','ipp','trader','carbon_fund','offtaker','lender','grid','regulator','ipp_developer','generator')),
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  phone TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  sa_id_number TEXT,
  bbbee_level INTEGER CHECK (bbbee_level BETWEEN 1 AND 8),
  nersa_licence TEXT,
  fsca_licence TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','in_review','manual_review','verified','rejected','suspended')),
  trading_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  two_factor_enabled INTEGER DEFAULT 0,
  subscription_tier TEXT,
  admin_level TEXT DEFAULT NULL
);

-- Step 2: Copy existing data
INSERT OR IGNORE INTO participants_new
  SELECT id, company_name, registration_number, tax_number, vat_number, role,
         contact_person, email, password_hash, password_salt, phone, physical_address,
         sa_id_number, bbbee_level, nersa_licence, fsca_licence, kyc_status,
         trading_enabled, created_at, updated_at, two_factor_enabled, subscription_tier, admin_level
  FROM participants;

-- Step 3: Drop old table and rename
DROP TABLE IF EXISTS participants;
ALTER TABLE participants_new RENAME TO participants;

-- Step 4: Recreate indexes on participants
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role);
CREATE INDEX IF NOT EXISTS idx_participants_kyc_status ON participants(kyc_status);

-- ═══════════════════════════════════════════════════════════════
-- 2. Also expand kyc_status CHECK to include 'manual_review' (used by admin cockpit)
--    Already handled above in the new table definition
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 3. Add regulator seed user if not exists
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO participants (id, company_name, registration_number, tax_number, role, contact_person, email, password_hash, password_salt, phone, physical_address, kyc_status, trading_enabled)
VALUES (
  'reg-nersa-001',
  'NERSA Regulatory Office',
  'GOV-NERSA-001',
  'GOV0000000',
  'regulator',
  'Regulator Admin',
  'regulator@et.vantax.co.za',
  -- PBKDF2 hash for 'NxtRegulator@2024!' (will need to be reset via forgot password)
  'placeholder_hash_needs_reset',
  'placeholder_salt',
  '+27-12-000-0001',
  'Kulawula House, 526 Madiba Street, Arcadia, Pretoria',
  'verified',
  1
);

-- ═══════════════════════════════════════════════════════════════
-- 4. Add grid operator seed user if not exists
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO participants (id, company_name, registration_number, tax_number, role, contact_person, email, password_hash, password_salt, phone, physical_address, kyc_status, trading_enabled)
VALUES (
  'grid-eskom-001',
  'Eskom Grid Operations',
  'SOC-ESKOM-001',
  'SOC0000000',
  'grid',
  'Grid Operator',
  'grid@et.vantax.co.za',
  'placeholder_hash_needs_reset',
  'placeholder_salt',
  '+27-11-000-0001',
  'Megawatt Park, Maxwell Drive, Sunninghill, Sandton',
  'verified',
  1
);
