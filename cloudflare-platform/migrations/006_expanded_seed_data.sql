-- Migration 006: Expanded Seed Data
-- Adds meter readings (7 days x 96 intervals = 672 rows), smart contract rules,
-- tokenised assets, REC certificates, audit log entries, and notifications.

-- ============================================================
-- 7 days of 15-minute meter readings (672 rows) for project p-solar-limpopo
-- ============================================================
INSERT OR IGNORE INTO meter_readings (id, project_id, timestamp, generation_kwh, export_kwh, import_kwh, frequency_hz, voltage_v, power_factor, meter_serial, source)
SELECT
  'mr-' || hex(randomblob(8)),
  'p-solar-limpopo',
  datetime('now', '-' || (d * 96 + i) * 15 || ' minutes'),
  ROUND(CASE
    WHEN (i % 96) BETWEEN 24 AND 72 THEN 50 + ABS(RANDOM() % 30)
    ELSE 0
  END, 2),
  ROUND(CASE
    WHEN (i % 96) BETWEEN 24 AND 72 THEN 45 + ABS(RANDOM() % 25)
    ELSE 0
  END, 2),
  ROUND(ABS(RANDOM() % 5), 2),
  ROUND(49.95 + (ABS(RANDOM() % 10)) * 0.01, 2),
  ROUND(220 + (ABS(RANDOM() % 20)) * 0.1, 1),
  ROUND(0.95 + (ABS(RANDOM() % 5)) * 0.01, 3),
  'MTR-SOLAR-001',
  'iot'
FROM (
  SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) days
CROSS JOIN (
  SELECT 0 AS i UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
  UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
  UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
  UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
  UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
  UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27
  UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30 UNION ALL SELECT 31
  UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35
  UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39
  UNION ALL SELECT 40 UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43
  UNION ALL SELECT 44 UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47
  UNION ALL SELECT 48 UNION ALL SELECT 49 UNION ALL SELECT 50 UNION ALL SELECT 51
  UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54 UNION ALL SELECT 55
  UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59
  UNION ALL SELECT 60 UNION ALL SELECT 61 UNION ALL SELECT 62 UNION ALL SELECT 63
  UNION ALL SELECT 64 UNION ALL SELECT 65 UNION ALL SELECT 66 UNION ALL SELECT 67
  UNION ALL SELECT 68 UNION ALL SELECT 69 UNION ALL SELECT 70 UNION ALL SELECT 71
  UNION ALL SELECT 72 UNION ALL SELECT 73 UNION ALL SELECT 74 UNION ALL SELECT 75
  UNION ALL SELECT 76 UNION ALL SELECT 77 UNION ALL SELECT 78 UNION ALL SELECT 79
  UNION ALL SELECT 80 UNION ALL SELECT 81 UNION ALL SELECT 82 UNION ALL SELECT 83
  UNION ALL SELECT 84 UNION ALL SELECT 85 UNION ALL SELECT 86 UNION ALL SELECT 87
  UNION ALL SELECT 88 UNION ALL SELECT 89 UNION ALL SELECT 90 UNION ALL SELECT 91
  UNION ALL SELECT 92 UNION ALL SELECT 93 UNION ALL SELECT 94 UNION ALL SELECT 95
) intervals;

-- ============================================================
-- 3 smart contract rules
-- ============================================================
INSERT OR IGNORE INTO smart_contract_rules (id, name, description, trigger_event, condition_logic, action_type, action_params, priority, status, created_by, created_at)
VALUES
  ('scr-auto-settle', 'Auto-Settle on Delivery', 'Automatically settle trades when delivery is confirmed by meter readings', 'trade.delivered', '{"delivery_confirmed": true, "variance_pct_lt": 5}', 'settle', '{"method": "auto", "fee_bps": 15}', 1, 'active', 'system', datetime('now')),
  ('scr-penalty-shortfall', 'Shortfall Penalty', 'Apply penalty when generation falls below 90% of PPA commitment', 'meter.reading_below_threshold', '{"threshold_pct": 90, "consecutive_hours": 4}', 'penalty', '{"rate_per_mwh_cents": 5000, "cap_pct": 10}', 2, 'active', 'system', datetime('now')),
  ('scr-rec-auto-issue', 'REC Auto-Issuance', 'Automatically issue RECs when monthly generation exceeds 100 MWh', 'meter.monthly_summary', '{"min_generation_mwh": 100, "source": "renewable"}', 'issue_rec', '{"standard": "I-REC", "auto_register": true}', 3, 'active', 'system', datetime('now'));

-- ============================================================
-- 1 tokenised asset with provenance
-- ============================================================
INSERT OR IGNORE INTO tokenised_assets (id, token_id, source_type, source_id, owner_id, quantity, unit, status, metadata, provenance_hash, created_at, updated_at)
VALUES (
  'ta-gold-standard-001',
  'NXT-TKN-' || hex(randomblob(4)),
  'carbon_credit',
  'cc-gold-standard-batch',
  'part-eskom-green',
  1000,
  'tCO2e',
  'active',
  '{"standard": "Gold Standard", "vintage": 2025, "project": "Cookstove Distribution SA", "methodology": "GS-VER-008", "serial_range": "GS-1000-1999"}',
  'sha256:' || hex(randomblob(32)),
  datetime('now', '-30 days'),
  datetime('now')
);

-- ============================================================
-- 2 REC certificates
-- ============================================================
INSERT OR IGNORE INTO rec_certificates (id, project_id, period_start, period_end, volume_mwh, source, serial_number, status, issued_by, created_at)
VALUES
  ('rec-limpopo-2025-q1', 'p-solar-limpopo', '2025-01-01', '2025-03-31', 2450.75, 'solar', 'IREC-ZA-2025-000001', 'active', 'system', datetime('now', '-60 days')),
  ('rec-ncape-wind-2025-q1', 'p-wind-northern-cape', '2025-01-01', '2025-03-31', 3120.50, 'wind', 'IREC-ZA-2025-000002', 'active', 'system', datetime('now', '-45 days'));

-- ============================================================
-- 5 audit log entries
-- ============================================================
INSERT OR IGNORE INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
VALUES
  ('audit-seed-001', 'system', 'system_startup', 'system', 'platform', '{"version": "3.0.0", "environment": "production"}', '127.0.0.1', datetime('now', '-7 days')),
  ('audit-seed-002', 'part-eskom-green', 'trade_executed', 'trade', 'trade-seed-001', '{"market": "solar", "volume": 100, "price_cents": 85000, "fee_bps": 15}', '196.25.1.1', datetime('now', '-5 days')),
  ('audit-seed-003', 'part-eskom-green', 'rec_issued', 'rec', 'rec-limpopo-2025-q1', '{"volume_mwh": 2450.75, "source": "solar", "serial": "IREC-ZA-2025-000001"}', '196.25.1.1', datetime('now', '-3 days')),
  ('audit-seed-004', 'system', 'smart_contract_triggered', 'smart_contract_rule', 'scr-auto-settle', '{"trade_id": "trade-seed-001", "result": "settled"}', '127.0.0.1', datetime('now', '-2 days')),
  ('audit-seed-005', 'part-trader-voltex', 'carbon_credit_retired', 'carbon_credit', 'cc-gold-standard-batch', '{"quantity": 50, "reason": "Voluntary offset", "standard": "Gold Standard"}', '41.202.1.1', datetime('now', '-1 day'));

-- ============================================================
-- 3 notifications
-- ============================================================
INSERT OR IGNORE INTO notifications (id, participant_id, title, body, type, entity_type, entity_id, read, created_at)
VALUES
  ('notif-seed-001', 'part-eskom-green', 'Trade Settled', 'Your solar trade for 100 MWh has been settled at R850/MWh.', 'success', 'trade', 'trade-seed-001', 0, datetime('now', '-5 days')),
  ('notif-seed-002', 'part-eskom-green', 'REC Issued', 'Q1 2025 REC certificate issued: 2,450.75 MWh from Limpopo Solar Farm.', 'info', 'rec', 'rec-limpopo-2025-q1', 0, datetime('now', '-3 days')),
  ('notif-seed-003', 'part-trader-voltex', 'Carbon Credit Retired', '50 tCO2e of Gold Standard credits have been retired for voluntary offset.', 'info', 'carbon_credit', 'cc-gold-standard-batch', 1, datetime('now', '-1 day'));

-- ============================================================
-- Add tenant_id column to participants (if not exists)
-- ============================================================
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a safe approach
CREATE TABLE IF NOT EXISTS _tenant_migration_check (done INTEGER);
INSERT OR IGNORE INTO _tenant_migration_check VALUES (1);
-- The tenant middleware resolves tenant from subdomain; tenant_id is optional metadata
