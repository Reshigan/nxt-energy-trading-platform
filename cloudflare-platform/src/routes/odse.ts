import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';

const odse = new Hono<HonoEnv>();

// ── ODSE Asset Management ───────────────────────────────────────────

// GET /odse/assets — List ODSE assets with filters
odse.get('/assets', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const assetType = c.req.query('asset_type');
    const projectId = c.req.query('project_id');
    const status = c.req.query('status') || 'active';
    const { page, per_page, offset } = parsePagination({
      page: c.req.query('page'),
      per_page: c.req.query('per_page'),
    });

    let where = 'WHERE a.status = ?';
    const params: unknown[] = [status];

    // Role-based scoping: non-admin users only see their own or linked assets
    if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      where += ' AND (a.participant_id = ? OR p.offtaker_id = ? OR p.lender_id = ?)';
      params.push(user.sub, user.sub, user.sub);
    }
    if (assetType) { where += ' AND a.asset_type = ?'; params.push(assetType); }
    if (projectId) { where += ' AND a.project_id = ?'; params.push(projectId); }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM odse_assets a LEFT JOIN projects p ON a.project_id = p.id ${where}`
    ).bind(...params).first<{ c: number }>();
    const total = countResult?.c ?? 0;

    const results = await c.env.DB.prepare(
      `SELECT a.*, p.name as project_name FROM odse_assets a LEFT JOIN projects p ON a.project_id = p.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, per_page, offset).all();

    return c.json(paginatedResponse(results.results, total, { page, per_page, offset }));
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /odse/assets — Register a new ODSE-compliant asset
odse.post('/assets', authMiddleware({ roles: ['admin', 'ipp', 'ipp_developer', 'generator'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      asset_id: string;
      asset_type: string;
      capacity_kw: number;
      oem: string;
      model?: string;
      serial_number?: string;
      commissioning_date?: string;
      project_id?: string;
      ppa_id?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
      region?: string;
      country_code?: string;
      grid_connection_point?: string;
      voltage_level?: string;
      meter_id?: string;
    };

    if (!body.asset_id || !body.asset_type || !body.capacity_kw || !body.oem) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'asset_id, asset_type, capacity_kw, and oem are required'), 400);
    }

    const validTypes = ['solar_pv', 'wind_turbine', 'battery_storage', 'grid_meter', 'ev_charger', 'hvac_system', 'generator', 'chp', 'fuel_cell', 'other'];
    if (!validTypes.includes(body.asset_type)) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, `Invalid asset_type. Must be one of: ${validTypes.join(', ')}`), 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO odse_assets (id, asset_id, participant_id, project_id, asset_type, capacity_kw, oem, model, serial_number, commissioning_date, ppa_id, latitude, longitude, timezone, region, country_code, grid_connection_point, voltage_level, meter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.asset_id, user.sub, body.project_id || null,
      body.asset_type, body.capacity_kw, body.oem, body.model || null,
      body.serial_number || null, body.commissioning_date || null,
      body.ppa_id || null, body.latitude || null, body.longitude || null,
      body.timezone || 'Africa/Johannesburg', body.region || null,
      body.country_code || 'ZA', body.grid_connection_point || null,
      body.voltage_level || null, body.meter_id || null
    ).run();

    return c.json({ success: true, data: { id, asset_id: body.asset_id } }, 201);
  } catch (err) {
    captureException(c, err);
    if (String(err).includes('UNIQUE')) {
      return c.json(errorResponse(ErrorCodes.CONFLICT, 'Asset ID already exists'), 409);
    }
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ── ODSE Timeseries Ingestion ───────────────────────────────────────

// POST /odse/ingest — Batch ingest ODSE-compliant timeseries readings
odse.post('/ingest', async (c) => {
  try {
    // Support both API key and JWT auth
    const apiKey = c.req.header('X-API-Key');
    const authHeader = c.req.header('Authorization');

    if (!apiKey && !authHeader) {
      return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Authentication required (X-API-Key or Bearer token)'), 401);
    }

    if (apiKey) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      const keyRecord = await c.env.DB.prepare(
        'SELECT id, participant_id FROM api_keys WHERE key_hash = ? AND revoked = 0'
      ).bind(keyHash).first();
      if (!keyRecord) return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Invalid API key'), 401);
    } else if (authHeader) {
      // Validate JWT token when using Bearer auth (not API key)
      if (!authHeader.startsWith('Bearer ')) {
        return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Invalid Authorization header format'), 401);
      }
      const token = authHeader.slice(7);
      const secret = (c.env as Record<string, unknown>).JWT_SECRET as string;
      if (!secret) {
        return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'JWT secret not configured'), 500);
      }
      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        const parts = token.split('.');
        if (parts.length !== 3) {
          return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Malformed token'), 401);
        }
        const sigInput = `${parts[0]}.${parts[1]}`;
        const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
        const valid = await crypto.subtle.verify('HMAC', cryptoKey, signature, encoder.encode(sigInput));
        if (!valid) {
          return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Invalid token signature'), 401);
        }
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Token expired'), 401);
        }
      } catch {
        return c.json(errorResponse(ErrorCodes.AUTH_FAILED, 'Token validation failed'), 401);
      }
    }

    const body = await c.req.json() as {
      readings: Array<{
        asset_id: string;
        timestamp: string;
        kWh: number;
        error_type?: string;
        direction?: string;
        end_use?: string;
        pf?: number;
        kVArh?: number;
        kVA?: number;
        tariff_period?: string;
        energy_charge_component?: number;
        network_charge_component?: number;
        carbon_intensity_gCO2_per_kWh?: number;
        contract_reference?: string;
        settlement_type?: string;
        billing_period?: string;
        billing_status?: string;
        curtailment_flag?: boolean;
        curtailed_kWh?: number;
        quality?: string;
        source?: string;
      }>;
    };

    if (!body.readings?.length) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'No readings provided'), 400);
    }

    if (body.readings.length > 1000) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 1000 readings per batch'), 400);
    }

    // Validate all readings have required ODSE fields
    for (let i = 0; i < body.readings.length; i++) {
      const r = body.readings[i];
      if (!r.asset_id || !r.timestamp || r.kWh === undefined) {
        return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, `Reading ${i}: asset_id, timestamp, and kWh are required (ODSE spec)`), 400);
      }
    }

    const insertStmt = c.env.DB.prepare(`
      INSERT INTO odse_timeseries (id, asset_id, timestamp, kwh, error_type, pf, kvarh, kva, direction, end_use, tariff_period, energy_charge_component, network_charge_component, carbon_intensity_gco2_per_kwh, contract_reference, settlement_type, billing_period, billing_status, curtailment_flag, curtailed_kwh, quality, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = body.readings.map((r) =>
      insertStmt.bind(
        generateId(), r.asset_id, r.timestamp, r.kWh,
        r.error_type || 'normal', r.pf ?? null, r.kVArh ?? null, r.kVA ?? null,
        r.direction || 'generation', r.end_use || null,
        r.tariff_period || null, r.energy_charge_component ?? null,
        r.network_charge_component ?? null, r.carbon_intensity_gCO2_per_kWh ?? null,
        r.contract_reference || null, r.settlement_type || null,
        r.billing_period || null, r.billing_status || null,
        r.curtailment_flag ? 1 : 0, r.curtailed_kWh ?? null,
        r.quality || 'actual', r.source || 'api'
      )
    );

    await c.env.DB.batch(batch);

    return c.json({
      success: true,
      data: {
        ingested: body.readings.length,
        timestamp: nowISO(),
        schema: 'odse/v1/energy-timeseries',
      },
    }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ── ODSE Timeseries Query ───────────────────────────────────────────

// GET /odse/timeseries — Query ODSE timeseries with filters
odse.get('/timeseries', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const assetId = c.req.query('asset_id');
    const direction = c.req.query('direction');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const tariffPeriod = c.req.query('tariff_period');
    const limit = Math.min(1000, parseInt(c.req.query('limit') || '100', 10));

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    // Role-based scoping: non-admin users only see their own assets
    if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      where += ' AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    if (assetId) { where += ' AND t.asset_id = ?'; params.push(assetId); }
    if (direction) { where += ' AND t.direction = ?'; params.push(direction); }
    if (from) { where += ' AND t.timestamp >= ?'; params.push(from); }
    if (to) { where += ' AND t.timestamp <= ?'; params.push(to); }
    if (tariffPeriod) { where += ' AND t.tariff_period = ?'; params.push(tariffPeriod); }

    const results = await c.env.DB.prepare(
      `SELECT t.*, a.asset_type, a.oem, a.capacity_kw FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id ${where} ORDER BY t.timestamp DESC LIMIT ?`
    ).bind(...params, limit).all();

    return c.json({
      success: true,
      data: results.results,
      schema: 'odse/v1/energy-timeseries',
      count: results.results.length,
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ── ODSE Analytics ──────────────────────────────────────────────────

// GET /odse/analytics/summary — Aggregated consumption/generation summary
odse.get('/analytics/summary', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const assetId = c.req.query('asset_id');
    const projectId = c.req.query('project_id');
    const days = parseInt(c.req.query('days') || '30', 10);

    let assetFilter = '';
    const params: unknown[] = [];

    if (assetId) {
      assetFilter = 'AND t.asset_id = ?';
      params.push(assetId);
    } else if (projectId) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE project_id = ?)';
      params.push(projectId);
    } else if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    const dateFilter = `AND t.timestamp >= datetime('now', '-${days} days')`;

    const [generation, consumption, byTariff, byDirection, avgPF] = await Promise.all([
      c.env.DB.prepare(`
        SELECT COALESCE(SUM(t.kwh), 0) as total_kwh, COUNT(*) as readings,
               COALESCE(AVG(t.kwh), 0) as avg_kwh, COALESCE(MAX(t.kwh), 0) as peak_kwh,
               COALESCE(SUM(t.energy_charge_component), 0) as total_energy_charge,
               COALESCE(SUM(t.curtailed_kwh), 0) as total_curtailed
        FROM odse_timeseries t WHERE t.direction = 'generation' ${assetFilter} ${dateFilter}
      `).bind(...params).first(),
      c.env.DB.prepare(`
        SELECT COALESCE(SUM(t.kwh), 0) as total_kwh, COUNT(*) as readings,
               COALESCE(AVG(t.kwh), 0) as avg_kwh, COALESCE(MAX(t.kwh), 0) as peak_kwh,
               COALESCE(SUM(t.energy_charge_component), 0) as total_energy_charge,
               COALESCE(AVG(t.carbon_intensity_gco2_per_kwh), 0) as avg_carbon_intensity
        FROM odse_timeseries t WHERE t.direction = 'consumption' ${assetFilter} ${dateFilter}
      `).bind(...params).first(),
      c.env.DB.prepare(`
        SELECT t.tariff_period, t.direction, COALESCE(SUM(t.kwh), 0) as total_kwh, COUNT(*) as readings,
               COALESCE(SUM(t.energy_charge_component), 0) as total_charge
        FROM odse_timeseries t WHERE t.tariff_period IS NOT NULL ${assetFilter} ${dateFilter}
        GROUP BY t.tariff_period, t.direction
      `).bind(...params).all(),
      c.env.DB.prepare(`
        SELECT t.direction, COALESCE(SUM(t.kwh), 0) as total_kwh, COUNT(*) as readings
        FROM odse_timeseries t WHERE 1=1 ${assetFilter} ${dateFilter}
        GROUP BY t.direction
      `).bind(...params).all(),
      c.env.DB.prepare(`
        SELECT COALESCE(AVG(t.pf), 0) as avg_pf
        FROM odse_timeseries t WHERE t.pf IS NOT NULL ${assetFilter} ${dateFilter}
      `).bind(...params).first(),
    ]);

    const genKwh = (generation as Record<string, number>)?.total_kwh ?? 0;
    const conKwh = (consumption as Record<string, number>)?.total_kwh ?? 0;
    const conCarbon = (consumption as Record<string, number>)?.avg_carbon_intensity ?? 0;

    return c.json({
      success: true,
      data: {
        period_days: days,
        generation: {
          total_kwh: genKwh,
          total_mwh: Math.round(genKwh / 1000 * 100) / 100,
          readings: (generation as Record<string, number>)?.readings ?? 0,
          avg_kwh: Math.round(((generation as Record<string, number>)?.avg_kwh ?? 0) * 100) / 100,
          peak_kwh: (generation as Record<string, number>)?.peak_kwh ?? 0,
          total_energy_charge_zar: Math.round(((generation as Record<string, number>)?.total_energy_charge ?? 0) * 100) / 100,
          total_curtailed_kwh: (generation as Record<string, number>)?.total_curtailed ?? 0,
        },
        consumption: {
          total_kwh: conKwh,
          total_mwh: Math.round(conKwh / 1000 * 100) / 100,
          readings: (consumption as Record<string, number>)?.readings ?? 0,
          avg_kwh: Math.round(((consumption as Record<string, number>)?.avg_kwh ?? 0) * 100) / 100,
          peak_kwh: (consumption as Record<string, number>)?.peak_kwh ?? 0,
          total_energy_charge_zar: Math.round(((consumption as Record<string, number>)?.total_energy_charge ?? 0) * 100) / 100,
          avg_carbon_intensity_gco2: Math.round(conCarbon * 100) / 100,
          estimated_emissions_kgco2: Math.round(conKwh * conCarbon / 1000 * 100) / 100,
        },
        net_kwh: Math.round((genKwh - conKwh) * 100) / 100,
        by_tariff_period: byTariff.results,
        by_direction: byDirection.results,
        avg_power_factor: Math.round(((avgPF as Record<string, number>)?.avg_pf ?? 0) * 1000) / 1000,
        schema: 'odse/v1',
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /odse/analytics/hourly — 24-hour consumption/generation profile (pivoted)
odse.get('/analytics/hourly', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const assetId = c.req.query('asset_id');
    const days = parseInt(c.req.query('days') || '30', 10);

    let assetFilter = '';
    const params: unknown[] = [];

    if (assetId) {
      assetFilter = 'AND t.asset_id = ?';
      params.push(assetId);
    } else if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    const results = await c.env.DB.prepare(`
      SELECT
        CAST(strftime('%H', t.timestamp) AS INTEGER) as hour,
        ROUND(AVG(CASE WHEN t.direction = 'generation' THEN t.kwh END), 2) as generation,
        ROUND(AVG(CASE WHEN t.direction = 'consumption' THEN t.kwh END), 2) as consumption,
        COUNT(*) as readings,
        ROUND(AVG(t.pf), 3) as avg_pf
      FROM odse_timeseries t
      WHERE t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
      GROUP BY CAST(strftime('%H', t.timestamp) AS INTEGER)
      ORDER BY hour
    `).bind(...params).all();

    return c.json({ success: true, data: results.results, period_days: days });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /odse/analytics/daily — Daily trend (30d default)
odse.get('/analytics/daily', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const assetId = c.req.query('asset_id');
    const direction = c.req.query('direction');
    const days = parseInt(c.req.query('days') || '30', 10);

    let assetFilter = '';
    const params: unknown[] = [];

    if (assetId) {
      assetFilter = 'AND t.asset_id = ?';
      params.push(assetId);
    } else if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    let dirFilter = '';
    if (direction) {
      dirFilter = 'AND t.direction = ?';
      params.push(direction);
    }

    const results = await c.env.DB.prepare(`
      SELECT
        date(t.timestamp) as date,
        ROUND(SUM(CASE WHEN t.direction = 'generation' THEN t.kwh ELSE 0 END) / 1000, 2) as generation,
        ROUND(SUM(CASE WHEN t.direction = 'consumption' THEN t.kwh ELSE 0 END) / 1000, 2) as consumption,
        COUNT(*) as readings,
        ROUND(AVG(t.pf), 3) as avg_pf,
        ROUND(SUM(t.energy_charge_component), 2) as total_charge,
        ROUND(AVG(t.carbon_intensity_gco2_per_kwh), 2) as avg_carbon_intensity
      FROM odse_timeseries t
      WHERE t.timestamp >= datetime('now', '-${days} days') ${assetFilter} ${dirFilter}
      GROUP BY date(t.timestamp)
      ORDER BY date DESC
    `).bind(...params).all();

    return c.json({ success: true, data: results.results, period_days: days });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /odse/analytics/carbon — Carbon intensity analysis
odse.get('/analytics/carbon', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const days = parseInt(c.req.query('days') || '30', 10);

    let assetFilter = '';
    const params: unknown[] = [];

    if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    const [summary, daily, byAsset] = await Promise.all([
      c.env.DB.prepare(`
        SELECT
          ROUND(SUM(CASE WHEN t.direction = 'generation' THEN t.kwh ELSE 0 END), 2) as total_gen_kwh,
          ROUND(SUM(CASE WHEN t.direction = 'consumption' THEN t.kwh ELSE 0 END), 2) as total_con_kwh,
          ROUND(AVG(CASE WHEN t.direction = 'consumption' THEN t.carbon_intensity_gco2_per_kwh END), 2) as avg_grid_carbon_intensity,
          ROUND(SUM(CASE WHEN t.direction = 'generation' AND t.carbon_intensity_gco2_per_kwh = 0 THEN t.kwh ELSE 0 END), 2) as renewable_gen_kwh
        FROM odse_timeseries t
        WHERE t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
      `).bind(...params).first(),
      c.env.DB.prepare(`
        SELECT
          date(t.timestamp) as date,
          ROUND(SUM(CASE WHEN t.direction = 'generation' AND t.carbon_intensity_gco2_per_kwh = 0 THEN t.kwh ELSE 0 END), 2) as renewable_kwh,
          ROUND(SUM(CASE WHEN t.direction = 'consumption' THEN t.kwh ELSE 0 END), 2) as consumption_kwh,
          ROUND(AVG(CASE WHEN t.direction = 'consumption' THEN t.carbon_intensity_gco2_per_kwh END), 2) as carbon_intensity
        FROM odse_timeseries t
        WHERE t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
        GROUP BY date(t.timestamp)
        ORDER BY date DESC
      `).bind(...params).all(),
      c.env.DB.prepare(`
        SELECT
          a.asset_id, a.asset_type, a.oem,
          ROUND(SUM(t.kwh), 2) as total_kwh,
          ROUND(AVG(t.carbon_intensity_gco2_per_kwh), 2) as avg_carbon_intensity,
          t.direction
        FROM odse_timeseries t
        JOIN odse_assets a ON t.asset_id = a.asset_id
        WHERE t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
        GROUP BY a.asset_id, t.direction
        ORDER BY total_kwh DESC
      `).bind(...params).all(),
    ]);

    const s = summary as Record<string, number> | null;
    const renewableKwh = s?.renewable_gen_kwh ?? 0;
    const consumptionKwh = s?.total_con_kwh ?? 0;
    const gridIntensity = s?.avg_grid_carbon_intensity ?? 950;
    const avoidedEmissions = Math.round(renewableKwh * gridIntensity / 1000 * 100) / 100;

    return c.json({
      success: true,
      data: {
        period_days: days,
        total_generation_kwh: s?.total_gen_kwh ?? 0,
        total_consumption_kwh: consumptionKwh,
        renewable_generation_kwh: renewableKwh,
        avg_grid_carbon_intensity_gco2: gridIntensity,
        avoided_emissions_kgco2: avoidedEmissions,
        avoided_emissions_tco2: Math.round(avoidedEmissions / 1000 * 100) / 100,
        renewable_fraction: consumptionKwh > 0 ? Math.round(renewableKwh / consumptionKwh * 10000) / 100 : 0,
        daily_trend: daily.results,
        by_asset: byAsset.results,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /odse/analytics/tariff — Tariff period breakdown
odse.get('/analytics/tariff', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const direction = c.req.query('direction') || 'consumption';
    const days = parseInt(c.req.query('days') || '30', 10);

    let assetFilter = '';
    const params: unknown[] = [direction];

    if (!['admin', 'regulator', 'grid'].includes(user.role)) {
      assetFilter = 'AND t.asset_id IN (SELECT asset_id FROM odse_assets WHERE participant_id = ?)';
      params.push(user.sub);
    }

    const [breakdown, dailyByTariff] = await Promise.all([
      c.env.DB.prepare(`
        SELECT
          t.tariff_period,
          ROUND(SUM(t.kwh), 2) as total_kwh,
          ROUND(SUM(t.kwh) / 1000, 2) as total_mwh,
          COUNT(*) as readings,
          ROUND(AVG(t.energy_charge_component), 4) as avg_rate,
          ROUND(SUM(t.energy_charge_component * t.kwh), 2) as total_cost_zar,
          ROUND(SUM(t.kwh) * 100.0 / NULLIF((SELECT SUM(kwh) FROM odse_timeseries WHERE direction = ? AND timestamp >= datetime('now', '-${days} days')), 0), 1) as pct_of_total
        FROM odse_timeseries t
        WHERE t.direction = ? AND t.tariff_period IS NOT NULL
          AND t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
        GROUP BY t.tariff_period
        ORDER BY total_kwh DESC
      `).bind(direction, ...params).all(),
      c.env.DB.prepare(`
        SELECT
          date(t.timestamp) as date,
          t.tariff_period,
          ROUND(SUM(t.kwh), 2) as total_kwh
        FROM odse_timeseries t
        WHERE t.direction = ? AND t.tariff_period IS NOT NULL
          AND t.timestamp >= datetime('now', '-${days} days') ${assetFilter}
        GROUP BY date(t.timestamp), t.tariff_period
        ORDER BY date DESC
      `).bind(...params).all(),
    ]);

    return c.json({
      success: true,
      data: {
        direction,
        period_days: days,
        breakdown: breakdown.results,
        daily: dailyByTariff.results,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default odse;
