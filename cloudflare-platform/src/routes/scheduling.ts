/**
 * 1.3 Scheduling & Nominations — Physical delivery scheduling after trade match
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes, parsePagination, paginatedResponse } from '../utils/pagination';

const scheduling = new Hono<HonoEnv>();
scheduling.use('*', authMiddleware());

// POST /scheduling/nominate — Generator nominates delivery volumes for D+1
scheduling.post('/nominate', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      trade_id: string; contract_id?: string; delivery_date: string;
      delivery_period: string; nominated_volume_kwh: number;
      connection_point: string; offtaker_id: string; grid_operator_id?: string;
    }>();

    const trade = await c.env.DB.prepare('SELECT * FROM trades WHERE id = ?').bind(body.trade_id).first();
    if (!trade) return c.json({ success: false, error: 'Trade not found' }, 404);

    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO delivery_schedules (id, trade_id, contract_id, delivery_date, delivery_period, nominated_volume_kwh, connection_point, generator_id, offtaker_id, grid_operator_id, nomination_status, nominated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nominated', ?)`
    ).bind(
      id, body.trade_id, body.contract_id || null, body.delivery_date,
      body.delivery_period, body.nominated_volume_kwh, body.connection_point,
      user.sub, body.offtaker_id, body.grid_operator_id || null, nowISO()
    ).run();

    return c.json({ success: true, data: { id, status: 'nominated' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create nomination'), 500);
  }
});

// GET /scheduling/nominations — List pending nominations
scheduling.get('/nominations', async (c) => {
  try {
    const user = c.get('user');
    const pag = parsePagination(c.req.query());
    const limit = pag.per_page;
    const offset = pag.offset;
    const status = c.req.query('status') || 'nominated';

    const results = await c.env.DB.prepare(
      `SELECT ds.*, g.company_name as generator_name, o.company_name as offtaker_name
       FROM delivery_schedules ds
       LEFT JOIN participants g ON ds.generator_id = g.id
       LEFT JOIN participants o ON ds.offtaker_id = o.id
       WHERE (ds.generator_id = ? OR ds.offtaker_id = ? OR ds.grid_operator_id = ?) AND ds.nomination_status = ?
       ORDER BY ds.delivery_date ASC LIMIT ? OFFSET ?`
    ).bind(user.sub, user.sub, user.sub, status, limit, offset).all();

    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM delivery_schedules WHERE (generator_id = ? OR offtaker_id = ? OR grid_operator_id = ?) AND nomination_status = ?'
    ).bind(user.sub, user.sub, user.sub, status).first<{ count: number }>();

    return c.json(paginatedResponse(results.results, total?.count || 0, pag));
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch nominations'), 500);
  }
});

// POST /scheduling/:id/confirm — Offtaker confirms nomination
scheduling.post('/:id/confirm', async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const schedule = await c.env.DB.prepare('SELECT * FROM delivery_schedules WHERE id = ?').bind(id).first();
    if (!schedule) return c.json({ success: false, error: 'Schedule not found' }, 404);
    if (schedule.offtaker_id !== user.sub && !['admin', 'grid'].includes(user.role)) {
      return c.json({ success: false, error: 'Only the offtaker can confirm' }, 403);
    }

    await c.env.DB.prepare(
      "UPDATE delivery_schedules SET nomination_status = 'confirmed', confirmed_volume_kwh = nominated_volume_kwh, confirmed_at = ? WHERE id = ?"
    ).bind(nowISO(), id).run();

    return c.json({ success: true, data: { id, status: 'confirmed' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to confirm nomination'), 500);
  }
});

// POST /scheduling/:id/grid-confirm — Grid operator confirms wheeling capacity
scheduling.post('/:id/grid-confirm', async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    if (!['grid', 'admin'].includes(user.role)) {
      return c.json({ success: false, error: 'Only grid operators can confirm wheeling' }, 403);
    }

    await c.env.DB.prepare(
      "UPDATE delivery_schedules SET grid_confirmed_at = ? WHERE id = ?"
    ).bind(nowISO(), id).run();

    return c.json({ success: true, data: { id, grid_confirmed: true } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to grid-confirm'), 500);
  }
});

// GET /scheduling/calendar — Calendar view of all scheduled deliveries
scheduling.get('/calendar', async (c) => {
  try {
    const user = c.get('user');
    const from = c.req.query('from') || new Date().toISOString().substring(0, 10);
    const to = c.req.query('to') || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);

    const results = await c.env.DB.prepare(
      `SELECT ds.*, g.company_name as generator_name, o.company_name as offtaker_name
       FROM delivery_schedules ds
       LEFT JOIN participants g ON ds.generator_id = g.id
       LEFT JOIN participants o ON ds.offtaker_id = o.id
       WHERE (ds.generator_id = ? OR ds.offtaker_id = ? OR ds.grid_operator_id = ? OR ? IN ('admin', 'regulator'))
       AND ds.delivery_date BETWEEN ? AND ?
       ORDER BY ds.delivery_date ASC`
    ).bind(user.sub, user.sub, user.sub, user.role, from, to).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch calendar'), 500);
  }
});

// POST /scheduling/:id/actual — Submit actual delivered volume (from metering)
scheduling.post('/:id/actual', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json<{ metered_volume_kwh: number }>();
    const schedule = await c.env.DB.prepare('SELECT * FROM delivery_schedules WHERE id = ?').bind(id).first();
    if (!schedule) return c.json({ success: false, error: 'Schedule not found' }, 404);

    const nominated = (schedule.nominated_volume_kwh as number) || 0;
    const imbalance = body.metered_volume_kwh - nominated;

    // Imbalance cost: R2.50/kWh penalty
    const imbalanceCost = Math.round(Math.abs(imbalance) * 250);

    await c.env.DB.prepare(
      "UPDATE delivery_schedules SET metered_volume_kwh = ?, imbalance_kwh = ?, imbalance_cost_cents = ?, nomination_status = 'delivered' WHERE id = ?"
    ).bind(body.metered_volume_kwh, imbalance, imbalanceCost, id).run();

    return c.json({ success: true, data: { id, metered_volume_kwh: body.metered_volume_kwh, imbalance_kwh: imbalance, imbalance_cost_cents: imbalanceCost } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to submit actuals'), 500);
  }
});

// GET /scheduling/imbalance — Calculate imbalance summary
scheduling.get('/imbalance', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      `SELECT SUM(ABS(imbalance_kwh)) as total_imbalance_kwh, SUM(imbalance_cost_cents) as total_cost_cents, COUNT(*) as count
       FROM delivery_schedules WHERE (generator_id = ? OR offtaker_id = ?) AND nomination_status = 'delivered' AND imbalance_kwh IS NOT NULL`
    ).bind(user.sub, user.sub).first<{ total_imbalance_kwh: number; total_cost_cents: number; count: number }>();

    return c.json({ success: true, data: results || { total_imbalance_kwh: 0, total_cost_cents: 0, count: 0 } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get imbalance'), 500);
  }
});

// POST /scheduling/imbalance/settle — Settle imbalance charges
scheduling.post('/imbalance/settle', async (c) => {
  try {
    const user = c.get('user');
    const unsettled = await c.env.DB.prepare(
      "SELECT * FROM delivery_schedules WHERE (generator_id = ? OR offtaker_id = ?) AND nomination_status = 'delivered' AND imbalance_kwh IS NOT NULL"
    ).bind(user.sub, user.sub).all();

    let settledCount = 0;
    for (const s of unsettled.results) {
      await c.env.DB.prepare("UPDATE delivery_schedules SET nomination_status = 'settled' WHERE id = ?").bind(s.id).run();
      settledCount++;
    }

    return c.json({ success: true, data: { settled_count: settledCount } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to settle imbalances'), 500);
  }
});

export default scheduling;
