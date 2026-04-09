import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { cascade } from '../utils/cascade';

const iot = new Hono<HonoEnv>();

// POST /ingest — IoT/SCADA direct data ingestion
iot.post('/ingest', authMiddleware({ roles: ['generator', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    
    // Expected body: { plant_id: string, reading_mwh: number, timestamp: string, voltage: number, frequency: number }
    const { plant_id, reading_mwh, timestamp, voltage, frequency } = body;

    if (!plant_id || reading_mwh === undefined) {
      return c.json({ success: false, error: 'Missing required plant data' }, 400);
    }

    const readingId = generateId();
    
    // Store reading in D1
    await c.env.DB.prepare(`
      INSERT INTO metering_readings (id, participant_id, plant_id, value_mwh, timestamp, meta_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      readingId, 
      user.sub, 
      plant_id, 
      reading_mwh, 
      timestamp || nowISO(), 
      JSON.stringify({ voltage, frequency })
    ).run();

    // Fire cascade for real-time monitoring and potential trade settlement triggers
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'metering.ingested',
      actor_id: user.sub,
      entity_type: 'reading',
      entity_id: readingId,
      data: { plant_id, value: reading_mwh },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, readingId }, 201);
  } catch (err) {
    return c.json({ success: false, error: 'IoT Ingestion failed' }, 500);
  }
});

export default iot;
