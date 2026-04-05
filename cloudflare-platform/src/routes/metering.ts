import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';

const metering = new Hono<HonoEnv>();

// POST /metering/ingest — Webhook endpoint for batch meter readings
// Accepts data from 5 sources: Eskom AMI, SolarEdge, Fronius, SMA, Custom
metering.post('/ingest', async (c) => {
  // API key auth for IoT devices (no JWT required)
  const apiKey = c.req.header('X-API-Key');
  const authHeader = c.req.header('Authorization');

  if (!apiKey && !authHeader) {
    return c.json({ success: false, error: 'Authentication required (X-API-Key or Bearer token)' }, 401);
  }

  // If API key, validate
  if (apiKey) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const keyRecord = await c.env.DB.prepare(
      'SELECT id, participant_id FROM api_keys WHERE key_hash = ? AND revoked = 0'
    ).bind(keyHash).first();
    if (!keyRecord) return c.json({ success: false, error: 'Invalid API key' }, 401);
  }

  const body = await c.req.json() as {
    source: string;
    project_id: string;
    readings: Array<{
      meter_id: string;
      meter_type: string;
      timestamp: string;
      value_kwh: number;
      quality?: string;
    }>;
  };

  const validSources = ['eskom_ami', 'solaredge', 'fronius', 'sma', 'manual', 'webhook'];
  if (!validSources.includes(body.source)) {
    return c.json({ success: false, error: `Invalid source. Must be one of: ${validSources.join(', ')}` }, 400);
  }

  if (!body.readings?.length) {
    return c.json({ success: false, error: 'No readings provided' }, 400);
  }

  // Batch insert readings
  const insertStmt = c.env.DB.prepare(`
    INSERT INTO meter_readings (id, project_id, meter_id, meter_type, timestamp, value_kwh, source, quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batch = body.readings.map((r) =>
    insertStmt.bind(
      generateId(), body.project_id, r.meter_id, r.meter_type,
      r.timestamp, r.value_kwh, body.source, r.quality || 'actual'
    )
  );

  await c.env.DB.batch(batch);

  // Trigger smart contract rules (metering_trigger)
  try {
    const doId = c.env.SMART_CONTRACT.idFromName(body.project_id);
    const stub = c.env.SMART_CONTRACT.get(doId);
    await stub.fetch(new Request('https://do/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'meter_reading',
        data: {
          project_id: body.project_id,
          readings_count: body.readings.length,
          total_kwh: body.readings.reduce((s, r) => s + r.value_kwh, 0),
        },
      }),
    }));
  } catch {
    // Non-critical: smart contract evaluation failure shouldn't block ingestion
  }

  return c.json({
    success: true,
    data: {
      ingested: body.readings.length,
      source: body.source,
      project_id: body.project_id,
    },
  });
});

// GET /metering/readings — Get meter readings for a project
metering.get('/readings', authMiddleware(), async (c) => {
  const projectId = c.req.query('project_id');
  const meterId = c.req.query('meter_id');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const limit = parseInt(c.req.query('limit') || '100', 10);

  let query = 'SELECT * FROM meter_readings WHERE 1=1';
  const params: unknown[] = [];

  if (projectId) { query += ' AND project_id = ?'; params.push(projectId); }
  if (meterId) { query += ' AND meter_id = ?'; params.push(meterId); }
  if (from) { query += ' AND timestamp >= ?'; params.push(from); }
  if (to) { query += ' AND timestamp <= ?'; params.push(to); }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// GET /metering/summary — Aggregated metering summary
metering.get('/summary', authMiddleware(), async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ success: false, error: 'project_id required' }, 400);

  const summary = await c.env.DB.prepare(`
    SELECT
      meter_type,
      COUNT(*) as reading_count,
      SUM(value_kwh) as total_kwh,
      AVG(value_kwh) as avg_kwh,
      MIN(timestamp) as first_reading,
      MAX(timestamp) as last_reading
    FROM meter_readings
    WHERE project_id = ?
    GROUP BY meter_type
  `).bind(projectId).all();

  // Metered vs contracted comparison
  const project = await c.env.DB.prepare('SELECT capacity_mw FROM projects WHERE id = ?').bind(projectId).first();
  const contractedMwh = project ? (project.capacity_mw as number) * 8760 * 0.25 : 0; // 25% capacity factor
  const totalGenerated = summary.results
    .filter((s) => ['solar_gen', 'wind_gen'].includes(s.meter_type as string))
    .reduce((sum, s) => sum + ((s.total_kwh as number) || 0), 0) / 1000; // MWh

  return c.json({
    success: true,
    data: {
      by_meter_type: summary.results,
      total_generated_mwh: Math.round(totalGenerated * 100) / 100,
      contracted_annual_mwh: Math.round(contractedMwh * 100) / 100,
      performance_ratio: contractedMwh > 0 ? Math.round((totalGenerated / contractedMwh) * 10000) / 100 : 0,
    },
  });
});

// GET /metering/meters — List distinct meters for a project
metering.get('/meters', authMiddleware(), async (c) => {
  const projectId = c.req.query('project_id');
  if (!projectId) return c.json({ success: false, error: 'project_id required' }, 400);

  const meters = await c.env.DB.prepare(`
    SELECT DISTINCT meter_id, meter_type, source,
      COUNT(*) as reading_count,
      MAX(timestamp) as last_reading,
      quality
    FROM meter_readings
    WHERE project_id = ?
    GROUP BY meter_id, meter_type, source, quality
  `).bind(projectId).all();

  return c.json({ success: true, data: meters.results });
});

// POST /metering/validate — Mark readings as validated
metering.post('/validate', authMiddleware({ roles: ['admin', 'grid'] }), async (c) => {
  const body = await c.req.json() as { reading_ids: string[] };
  if (!body.reading_ids?.length) return c.json({ success: false, error: 'No reading_ids provided' }, 400);

  const placeholders = body.reading_ids.map(() => '?').join(',');
  await c.env.DB.prepare(
    `UPDATE meter_readings SET quality = 'validated' WHERE id IN (${placeholders})`
  ).bind(...body.reading_ids).run();

  return c.json({ success: true, data: { validated: body.reading_ids.length } });
});

export default metering;
