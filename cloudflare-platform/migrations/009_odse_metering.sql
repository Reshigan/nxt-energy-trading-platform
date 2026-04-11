-- Migration 009: ODSE (Open Data Schema for Energy) compliant metering
-- Adds ODSE asset metadata and timeseries tables with full schema coverage

-- ── ODSE Asset Metadata ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odse_assets (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  participant_id TEXT NOT NULL,
  project_id TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'solar_pv', 'wind_turbine', 'battery_storage', 'grid_meter',
    'ev_charger', 'hvac_system', 'generator', 'chp', 'fuel_cell', 'other'
  )),
  capacity_kw REAL NOT NULL CHECK (capacity_kw >= 0),
  oem TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  commissioning_date TEXT,
  ppa_id TEXT,
  -- Location (flattened from ODSE JSON for SQL queryability)
  latitude REAL CHECK (latitude >= -90 AND latitude <= 90),
  longitude REAL CHECK (longitude >= -180 AND longitude <= 180),
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  region TEXT,
  country_code TEXT DEFAULT 'ZA',
  grid_connection_point TEXT,
  municipality_id TEXT,
  voltage_level TEXT CHECK (voltage_level IN ('LV', 'MV', 'HV', 'EHV') OR voltage_level IS NULL),
  connection_status TEXT DEFAULT 'connected' CHECK (connection_status IN (
    'applied', 'pre_feasibility', 'reserved', 'allocated', 'connected', 'decommissioned'
  )),
  allocated_capacity_kw REAL,
  meter_id TEXT,
  -- Building metadata (ComStock/ResStock compatible)
  building_type TEXT,
  floor_area_sqm REAL,
  -- Metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'decommissioned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- ── ODSE Energy Timeseries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS odse_timeseries (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  -- Core ODSE required fields
  timestamp TEXT NOT NULL,
  kwh REAL NOT NULL,
  error_type TEXT NOT NULL DEFAULT 'normal' CHECK (error_type IN (
    'normal', 'warning', 'critical', 'fault', 'offline', 'standby', 'unknown'
  )),
  -- ODSE optional electrical fields
  error_code TEXT,
  kvarh REAL,
  kva REAL CHECK (kva IS NULL OR kva >= 0),
  pf REAL CHECK (pf IS NULL OR (pf >= 0 AND pf <= 1)),
  -- Direction and classification
  direction TEXT NOT NULL DEFAULT 'generation' CHECK (direction IN ('generation', 'consumption', 'net')),
  end_use TEXT CHECK (end_use IS NULL OR end_use IN (
    'cooling', 'heating', 'fans', 'pumps', 'water_systems',
    'interior_lighting', 'exterior_lighting', 'interior_equipment',
    'refrigeration', 'cooking', 'laundry', 'ev_charging',
    'pv_generation', 'battery_storage', 'whole_building', 'other'
  )),
  fuel_type TEXT DEFAULT 'electricity' CHECK (fuel_type IN ('electricity', 'natural_gas', 'propane', 'fuel_oil', 'other')),
  -- Settlement context
  seller_party_id TEXT,
  buyer_party_id TEXT,
  settlement_period_start TEXT,
  settlement_period_end TEXT,
  loss_factor REAL CHECK (loss_factor IS NULL OR loss_factor >= 0),
  contract_reference TEXT,
  settlement_type TEXT CHECK (settlement_type IS NULL OR settlement_type IN (
    'bilateral', 'sawem_day_ahead', 'sawem_intra_day', 'balancing', 'ancillary'
  )),
  -- Tariff context
  tariff_schedule_id TEXT,
  tariff_period TEXT CHECK (tariff_period IS NULL OR tariff_period IN ('peak', 'standard', 'off_peak', 'critical_peak')),
  tariff_currency TEXT DEFAULT 'ZAR',
  energy_charge_component REAL,
  network_charge_component REAL,
  -- Wheeling
  wheeling_type TEXT CHECK (wheeling_type IS NULL OR wheeling_type IN ('traditional', 'virtual', 'portfolio')),
  injection_point_id TEXT,
  offtake_point_id TEXT,
  wheeling_status TEXT CHECK (wheeling_status IS NULL OR wheeling_status IN ('provisional', 'confirmed', 'reconciled', 'disputed')),
  -- BRP and imbalance
  balance_responsible_party_id TEXT,
  forecast_kwh REAL,
  imbalance_kwh REAL,
  -- Curtailment
  curtailment_flag INTEGER DEFAULT 0,
  curtailed_kwh REAL CHECK (curtailed_kwh IS NULL OR curtailed_kwh >= 0),
  curtailment_type TEXT CHECK (curtailment_type IS NULL OR curtailment_type IN (
    'congestion', 'frequency', 'voltage', 'instruction', 'other'
  )),
  -- Billing
  billing_period TEXT,
  billed_kwh REAL,
  billing_status TEXT CHECK (billing_status IS NULL OR billing_status IN ('metered', 'estimated', 'adjusted', 'disputed')),
  -- Carbon and certificates
  carbon_intensity_gco2_per_kwh REAL CHECK (carbon_intensity_gco2_per_kwh IS NULL OR carbon_intensity_gco2_per_kwh >= 0),
  renewable_attribute_id TEXT,
  certificate_standard TEXT CHECK (certificate_standard IS NULL OR certificate_standard IN ('i_rec', 'rego', 'go', 'rec', 'tigr', 'other')),
  verification_status TEXT CHECK (verification_status IS NULL OR verification_status IN ('pending', 'issued', 'retired', 'cancelled')),
  -- Quality tracking
  quality TEXT NOT NULL DEFAULT 'actual' CHECK (quality IN ('actual', 'estimated', 'validated', 'adjusted')),
  source TEXT DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES odse_assets(asset_id)
);

-- ── ODSE Aggregations (pre-computed for dashboard performance) ──────
CREATE TABLE IF NOT EXISTS odse_daily_aggregations (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  date TEXT NOT NULL,
  direction TEXT NOT NULL,
  total_kwh REAL NOT NULL DEFAULT 0,
  peak_kwh REAL NOT NULL DEFAULT 0,
  off_peak_kwh REAL NOT NULL DEFAULT 0,
  standard_kwh REAL NOT NULL DEFAULT 0,
  reading_count INTEGER NOT NULL DEFAULT 0,
  avg_pf REAL,
  max_kva REAL,
  avg_carbon_intensity REAL,
  total_curtailed_kwh REAL DEFAULT 0,
  total_energy_charge REAL DEFAULT 0,
  total_network_charge REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(asset_id, date, direction),
  FOREIGN KEY (asset_id) REFERENCES odse_assets(asset_id)
);

-- ── Performance indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_odse_assets_participant ON odse_assets(participant_id);
CREATE INDEX IF NOT EXISTS idx_odse_assets_project ON odse_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_odse_assets_type ON odse_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_odse_ts_asset_ts ON odse_timeseries(asset_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_odse_ts_direction ON odse_timeseries(direction, timestamp);
CREATE INDEX IF NOT EXISTS idx_odse_ts_tariff ON odse_timeseries(tariff_period, timestamp);
CREATE INDEX IF NOT EXISTS idx_odse_ts_billing ON odse_timeseries(billing_period, billing_status);
CREATE INDEX IF NOT EXISTS idx_odse_daily_asset ON odse_daily_aggregations(asset_id, date);
CREATE INDEX IF NOT EXISTS idx_odse_daily_direction ON odse_daily_aggregations(direction, date);

-- ── Seed: Sample ODSE assets ────────────────────────────────────────
INSERT OR IGNORE INTO odse_assets (id, asset_id, participant_id, project_id, asset_type, capacity_kw, oem, model, serial_number, commissioning_date, latitude, longitude, timezone, region, country_code, grid_connection_point, voltage_level, connection_status, meter_id, status)
VALUES
  ('odse-asset-001', 'nxt-solar-cpt-001', 'participant-ipp-001', 'proj-solar-001', 'solar_pv', 5000, 'Huawei', 'SUN2000-100KTL', 'HW-2024-00142', '2024-06-15', -33.9249, 18.4241, 'Africa/Johannesburg', 'Western Cape', 'ZA', 'CPT-MV-FEED-012', 'MV', 'connected', 'MTR-CPT-001', 'active'),
  ('odse-asset-002', 'nxt-wind-ec-001', 'participant-ipp-001', 'proj-wind-001', 'wind_turbine', 12000, 'Vestas', 'V150-4.2MW', 'VS-2024-00088', '2024-03-20', -33.0292, 27.8546, 'Africa/Johannesburg', 'Eastern Cape', 'ZA', 'EC-HV-FEED-003', 'HV', 'connected', 'MTR-EC-001', 'active'),
  ('odse-asset-003', 'nxt-grid-jhb-001', 'participant-offtaker-001', NULL, 'grid_meter', 2000, 'Landis+Gyr', 'E650', 'LG-2024-00201', '2024-01-10', -26.2041, 28.0473, 'Africa/Johannesburg', 'Gauteng', 'ZA', 'JHB-MV-FEED-045', 'MV', 'connected', 'MTR-JHB-001', 'active'),
  ('odse-asset-004', 'nxt-solar-jhb-001', 'participant-trader-001', NULL, 'solar_pv', 1500, 'SolarEdge', 'SE100K', 'SE-2024-00315', '2024-08-01', -26.1076, 28.0567, 'Africa/Johannesburg', 'Gauteng', 'ZA', 'JHB-LV-FEED-112', 'LV', 'connected', 'MTR-JHB-002', 'active'),
  ('odse-asset-005', 'nxt-batt-cpt-001', 'participant-ipp-001', 'proj-solar-001', 'battery_storage', 3000, 'BYD', 'Battery-Box HV', 'BYD-2024-00077', '2024-07-01', -33.9249, 18.4241, 'Africa/Johannesburg', 'Western Cape', 'ZA', 'CPT-MV-FEED-012', 'MV', 'connected', 'MTR-CPT-002', 'active');

-- ── Seed: 30 days of hourly ODSE timeseries (generation + consumption) ──
-- Solar generation (asset nxt-solar-cpt-001): ~5MW, hours 6-18, bell curve
INSERT OR IGNORE INTO odse_timeseries (id, asset_id, timestamp, kwh, error_type, pf, direction, end_use, tariff_period, tariff_currency, energy_charge_component, carbon_intensity_gco2_per_kwh, quality, source)
SELECT
  'ts-gen-' || d.day || '-' || h.hour,
  'nxt-solar-cpt-001',
  date('now', '-' || d.day || ' days') || 'T' || printf('%02d', h.hour) || ':00:00Z',
  CASE
    WHEN h.hour BETWEEN 6 AND 18 THEN
      ROUND(5000 * (1.0 - ABS(h.hour - 12.0) / 7.0) * (0.85 + (ABS(RANDOM()) % 30) / 100.0), 2)
    ELSE 0
  END,
  'normal',
  CASE WHEN h.hour BETWEEN 6 AND 18 THEN 0.98 ELSE NULL END,
  'generation',
  'pv_generation',
  CASE
    WHEN h.hour BETWEEN 7 AND 9 THEN 'peak'
    WHEN h.hour BETWEEN 17 AND 19 THEN 'peak'
    WHEN h.hour BETWEEN 10 AND 16 THEN 'standard'
    ELSE 'off_peak'
  END,
  'ZAR',
  CASE
    WHEN h.hour BETWEEN 7 AND 9 THEN 2.15
    WHEN h.hour BETWEEN 17 AND 19 THEN 2.15
    WHEN h.hour BETWEEN 10 AND 16 THEN 1.45
    ELSE 0.85
  END,
  0.0,
  'actual',
  'solaredge'
FROM (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) d
CROSS JOIN (SELECT 0 AS hour UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23) h;

-- Consumption (asset nxt-grid-jhb-001): ~2MW offtaker load, higher evening
INSERT OR IGNORE INTO odse_timeseries (id, asset_id, timestamp, kwh, error_type, pf, direction, end_use, tariff_period, tariff_currency, energy_charge_component, carbon_intensity_gco2_per_kwh, quality, source)
SELECT
  'ts-con-' || d.day || '-' || h.hour,
  'nxt-grid-jhb-001',
  date('now', '-' || d.day || ' days') || 'T' || printf('%02d', h.hour) || ':00:00Z',
  CASE
    WHEN h.hour BETWEEN 0 AND 5 THEN ROUND(400 + (ABS(RANDOM()) % 200), 2)
    WHEN h.hour BETWEEN 6 AND 8 THEN ROUND(1200 + (ABS(RANDOM()) % 400), 2)
    WHEN h.hour BETWEEN 9 AND 16 THEN ROUND(1600 + (ABS(RANDOM()) % 300), 2)
    WHEN h.hour BETWEEN 17 AND 20 THEN ROUND(1800 + (ABS(RANDOM()) % 400), 2)
    ELSE ROUND(800 + (ABS(RANDOM()) % 300), 2)
  END,
  'normal',
  0.92,
  'consumption',
  'whole_building',
  CASE
    WHEN h.hour BETWEEN 7 AND 9 THEN 'peak'
    WHEN h.hour BETWEEN 17 AND 19 THEN 'peak'
    WHEN h.hour BETWEEN 10 AND 16 THEN 'standard'
    ELSE 'off_peak'
  END,
  'ZAR',
  CASE
    WHEN h.hour BETWEEN 7 AND 9 THEN 2.85
    WHEN h.hour BETWEEN 17 AND 19 THEN 2.85
    WHEN h.hour BETWEEN 10 AND 16 THEN 1.95
    ELSE 1.15
  END,
  950.0,
  'actual',
  'eskom_ami'
FROM (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) d
CROSS JOIN (SELECT 0 AS hour UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23) h;

-- Wind generation (asset nxt-wind-ec-001): ~12MW, variable with higher afternoon
INSERT OR IGNORE INTO odse_timeseries (id, asset_id, timestamp, kwh, error_type, pf, direction, tariff_period, carbon_intensity_gco2_per_kwh, quality, source)
SELECT
  'ts-wind-' || d.day || '-' || h.hour,
  'nxt-wind-ec-001',
  date('now', '-' || d.day || ' days') || 'T' || printf('%02d', h.hour) || ':00:00Z',
  ROUND(12000 * (0.20 + 0.30 * (CASE WHEN h.hour BETWEEN 12 AND 20 THEN 1.0 ELSE 0.5 END) + (ABS(RANDOM()) % 20) / 100.0), 2),
  'normal',
  0.97,
  'generation',
  CASE
    WHEN h.hour BETWEEN 7 AND 9 THEN 'peak'
    WHEN h.hour BETWEEN 17 AND 19 THEN 'peak'
    WHEN h.hour BETWEEN 10 AND 16 THEN 'standard'
    ELSE 'off_peak'
  END,
  0.0,
  'actual',
  'sma'
FROM (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) d
CROSS JOIN (SELECT 0 AS hour UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23) h;

-- ── Seed: Daily aggregations (pre-computed from timeseries) ─────────
INSERT OR IGNORE INTO odse_daily_aggregations (id, asset_id, date, direction, total_kwh, peak_kwh, off_peak_kwh, standard_kwh, reading_count, avg_pf, avg_carbon_intensity, total_energy_charge)
SELECT
  'agg-gen-' || d.day,
  'nxt-solar-cpt-001',
  date('now', '-' || d.day || ' days'),
  'generation',
  ROUND(5000 * 6.5 * (0.85 + (ABS(RANDOM()) % 15) / 100.0), 0),
  ROUND(5000 * 2 * 0.7, 0),
  0,
  ROUND(5000 * 4.5 * 0.8, 0),
  24,
  0.98,
  0.0,
  ROUND(5000 * 6.5 * 1.45, 0)
FROM (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) d;

INSERT OR IGNORE INTO odse_daily_aggregations (id, asset_id, date, direction, total_kwh, peak_kwh, off_peak_kwh, standard_kwh, reading_count, avg_pf, avg_carbon_intensity, total_energy_charge)
SELECT
  'agg-con-' || d.day,
  'nxt-grid-jhb-001',
  date('now', '-' || d.day || ' days'),
  'consumption',
  ROUND(1200 * 24 * (0.9 + (ABS(RANDOM()) % 20) / 100.0), 0),
  ROUND(1800 * 6, 0),
  ROUND(600 * 8, 0),
  ROUND(1600 * 7, 0),
  24,
  0.92,
  950.0,
  ROUND(1200 * 24 * 1.95, 0)
FROM (SELECT 0 AS day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29) d;
