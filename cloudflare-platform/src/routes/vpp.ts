/**
 * 3.3 Demand Response / Virtual Power Plant (VPP)
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const vpp = new Hono<HonoEnv>();
vpp.use('*', authMiddleware());

// POST /vpp/assets — Register a DER asset
vpp.post('/assets', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      asset_type: string; capacity_kw: number; available_kw: number;
      location_lat?: number; location_lng?: number; connection_point?: string;
    }>();

    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO vpp_assets (id, participant_id, asset_type, capacity_kw, available_kw, location_lat, location_lng, connection_point, status, last_heartbeat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)`
    ).bind(
      id, user.sub, body.asset_type, body.capacity_kw, body.available_kw,
      body.location_lat || null, body.location_lng || null, body.connection_point || null, nowISO()
    ).run();

    return c.json({ success: true, data: { id, status: 'available' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to register asset'), 500);
  }
});

// GET /vpp/assets — List VPP assets
vpp.get('/assets', async (c) => {
  try {
    const user = c.get('user');
    const all = c.req.query('all') === 'true' && ['admin', 'grid'].includes(user.role);

    const query = all
      ? 'SELECT a.*, p.company_name FROM vpp_assets a JOIN participants p ON a.participant_id = p.id ORDER BY a.created_at DESC'
      : 'SELECT * FROM vpp_assets WHERE participant_id = ? ORDER BY created_at DESC';

    const results = all
      ? await c.env.DB.prepare(query).all()
      : await c.env.DB.prepare(query).bind(user.sub).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list assets'), 500);
  }
});

// POST /vpp/dispatch — Dispatch VPP assets (grid operator or auto-trigger)
vpp.post('/dispatch', authMiddleware({ roles: ['admin', 'grid'] }), async (c) => {
  try {
    const body = await c.req.json<{
      trigger_type: string; load_shedding_stage?: number;
      target_kw?: number;
    }>();

    const targetKw = body.target_kw || 5000;

    // Get available assets sorted by capacity
    const assets = await c.env.DB.prepare(
      "SELECT * FROM vpp_assets WHERE status = 'available' ORDER BY available_kw DESC"
    ).all();

    let dispatched = 0;
    let assetsDispatched = 0;
    const dispatchedAssets: Array<{ id: string; capacity_kw: number }> = [];

    for (const asset of assets.results) {
      if (dispatched >= targetKw) break;
      const kw = (asset.available_kw as number) || 0;
      dispatched += kw;
      assetsDispatched++;
      dispatchedAssets.push({ id: asset.id as string, capacity_kw: kw });

      await c.env.DB.prepare("UPDATE vpp_assets SET status = 'dispatched' WHERE id = ?").bind(asset.id).run();
    }

    // Calculate revenue: R2.50/kWh for 2 hours = R5/kW dispatched
    const revenueCents = Math.round(dispatched * 500);

    const eventId = generateId();

    // Update dispatched assets with the event ID
    for (const da of dispatchedAssets) {
      await c.env.DB.prepare("UPDATE vpp_assets SET dispatch_event_id = ? WHERE id = ?").bind(eventId, da.id).run();
    }

    await c.env.DB.prepare(
      `INSERT INTO vpp_dispatch_events (id, trigger_type, load_shedding_stage, total_dispatched_kw, assets_dispatched, revenue_cents, started_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
    ).bind(
      eventId, body.trigger_type, body.load_shedding_stage || null,
      dispatched, assetsDispatched, revenueCents, nowISO()
    ).run();

    return c.json({
      success: true,
      data: {
        event_id: eventId, trigger_type: body.trigger_type,
        total_dispatched_kw: dispatched, assets_dispatched: assetsDispatched,
        estimated_revenue_cents: revenueCents, dispatched_assets: dispatchedAssets,
      },
    }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Dispatch failed'), 500);
  }
});

// POST /vpp/dispatch/:id/end — End a dispatch event
vpp.post('/dispatch/:id/end', authMiddleware({ roles: ['admin', 'grid'] }), async (c) => {
  try {
    const { id } = c.req.param();

    // Mark event completed
    await c.env.DB.prepare(
      "UPDATE vpp_dispatch_events SET status = 'completed', ended_at = ? WHERE id = ?"
    ).bind(nowISO(), id).run();

    // Release only assets belonging to this specific dispatch event
    await c.env.DB.prepare(
      "UPDATE vpp_assets SET status = 'available', dispatch_event_id = NULL WHERE dispatch_event_id = ?"
    ).bind(id).run();

    return c.json({ success: true, data: { id, status: 'completed' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to end dispatch'), 500);
  }
});

// GET /vpp/events — Dispatch event history
vpp.get('/events', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM vpp_dispatch_events ORDER BY started_at DESC LIMIT 50'
    ).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get events'), 500);
  }
});

// GET /vpp/dashboard — VPP dashboard summary
vpp.get('/dashboard', async (c) => {
  try {
    const [totalAssets, availableKw, activeDispatches, totalRevenue] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM vpp_assets').first<{ count: number }>(),
      c.env.DB.prepare("SELECT SUM(available_kw) as total FROM vpp_assets WHERE status = 'available'").first<{ total: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM vpp_dispatch_events WHERE status = 'active'").first<{ count: number }>(),
      c.env.DB.prepare("SELECT SUM(revenue_cents) as total FROM vpp_dispatch_events WHERE status = 'completed'").first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      data: {
        total_assets: totalAssets?.count || 0,
        available_capacity_kw: availableKw?.total || 0,
        active_dispatches: activeDispatches?.count || 0,
        total_revenue_rands: Math.round((totalRevenue?.total || 0) / 100),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get VPP dashboard'), 500);
  }
});

// POST /vpp/assets/:id/heartbeat — Asset sends heartbeat
vpp.post('/assets/:id/heartbeat', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json<{ available_kw?: number; status?: string }>();
    await c.env.DB.prepare(
      'UPDATE vpp_assets SET last_heartbeat = ?, available_kw = COALESCE(?, available_kw) WHERE id = ?'
    ).bind(nowISO(), body.available_kw !== undefined ? body.available_kw : null, id).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Heartbeat failed'), 500);
  }
});

export default vpp;
