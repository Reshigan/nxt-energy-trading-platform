import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';

const p2p = new Hono<HonoEnv>();
p2p.use('*', authMiddleware());

// POST /p2p/offers — Create P2P offer
p2p.post('/offers', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      volume_kwh: number;
      price_cents_per_kwh: number;
      distribution_zone: string;
      offer_type: 'sell' | 'buy';
      expires_at?: string;
    };

    // Item 22: Idempotency key check
    const idempotencyKey = c.req.header('X-Idempotency-Key');
    if (idempotencyKey) {
      const cached = await c.env.KV.get(`idempotency:p2p:${idempotencyKey}`);
      if (cached) return c.json(JSON.parse(cached), 201);
    }

    // Item 23 + B1: KYC gates trading — reject unverified users; require manual KYC approval
    const participant = await c.env.DB.prepare(
      'SELECT kyc_status, trading_enabled FROM participants WHERE id = ?'
    ).bind(user.sub).first<{ kyc_status: string; trading_enabled: number }>();
    if (!participant || participant.kyc_status !== 'verified' || participant.trading_enabled !== 1) {
      return c.json({ success: false, error: 'KYC verification required before trading. Your account must be manually approved by an admin.' }, 403);
    }

    // Validate volume limits: min 10 kWh
    if (body.volume_kwh < 10) {
      return c.json({ success: false, error: 'Minimum volume is 10 kWh' }, 400);
    }

    const id = generateId();
    const total = Math.round(body.volume_kwh * body.price_cents_per_kwh);

    await c.env.DB.prepare(`
      INSERT INTO p2p_trades (id, seller_id, volume_kwh, price_cents_per_kwh, total_cents, distribution_zone, offer_type, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.sub,
      body.volume_kwh,
      body.price_cents_per_kwh,
      total,
      body.distribution_zone,
      body.offer_type,
      body.expires_at || null,
    ).run();

    // Submit to P2PMatcherDO for matching
    const doId = c.env.P2P_MATCHER.idFromName(body.distribution_zone);
    const stub = c.env.P2P_MATCHER.get(doId);
    await stub.fetch(new Request('https://do/offer', {
      method: 'POST',
      body: JSON.stringify({
        id,
        participant_id: user.sub,
        volume_kwh: body.volume_kwh,
        price_cents_per_kwh: body.price_cents_per_kwh,
        distribution_zone: body.distribution_zone,
        offer_type: body.offer_type,
        expires_at: body.expires_at || '',
      }),
    }));

    // Fire cascade for P2P offer creation
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'p2p.offer_created',
      actor_id: user.sub,
      entity_type: 'p2p_trade',
      entity_id: id,
      data: { volume_kwh: body.volume_kwh, price_cents_per_kwh: body.price_cents_per_kwh, zone: body.distribution_zone, offer_type: body.offer_type },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    const offerResponse = { success: true, data: { id, total_cents: total } };

    // Item 22: Store idempotency result
    if (idempotencyKey) {
      c.executionCtx.waitUntil(
        c.env.KV.put(`idempotency:p2p:${idempotencyKey}`, JSON.stringify(offerResponse), { expirationTtl: 86400 })
      );
    }

    return c.json(offerResponse, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /p2p/offers — List P2P offers
p2p.get('/offers', authMiddleware(), async (c) => {
  try {
    const zone = c.req.query('zone');
    const status = c.req.query('status') || 'open';
    const offerType = c.req.query('offer_type');

    let query = 'SELECT p.*, s.company_name as seller_name FROM p2p_trades p JOIN participants s ON p.seller_id = s.id WHERE p.status = ?';
    const params: unknown[] = [status];

    if (zone) { query += ' AND p.distribution_zone = ?'; params.push(zone); }
    if (offerType) { query += ' AND p.offer_type = ?'; params.push(offerType); }

    query += ' ORDER BY p.created_at DESC LIMIT 50';

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /p2p/offers/:id/accept — Accept a P2P offer (match)
p2p.post('/offers/:id/accept', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const offer = await c.env.DB.prepare(
      'SELECT * FROM p2p_trades WHERE id = ? AND status = ?'
    ).bind(id, 'open').first();
    if (!offer) return c.json({ success: false, error: 'Offer not found or already matched' }, 404);

    // Cannot accept own offer
    if (offer.seller_id === user.sub) {
      return c.json({ success: false, error: 'Cannot accept your own offer' }, 400);
    }

    // Match the trade
    await c.env.DB.prepare(`
      UPDATE p2p_trades SET buyer_id = ?, status = 'matched', matched_at = ? WHERE id = ?
    `).bind(user.sub, nowISO(), id).run();

    // Notify seller
    await c.env.DB.prepare(`
      INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
      VALUES (?, ?, 'P2P Trade Matched', ?, 'trade', 'p2p_trade', ?)
    `).bind(
      generateId(), offer.seller_id as string,
      `Your ${offer.offer_type} offer of ${offer.volume_kwh} kWh in ${offer.distribution_zone} has been matched.`,
      id,
    ).run();

    // Fire cascade for P2P match
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'p2p.accepted',
      actor_id: user.sub,
      entity_type: 'p2p_trade',
      entity_id: id,
      data: { buyer_id: user.sub, seller_id: offer.seller_id as string, volume_kwh: offer.volume_kwh, total_cents: offer.total_cents, zone: offer.distribution_zone },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({
      success: true,
      data: {
        id,
        status: 'matched',
        buyer_id: user.sub,
        seller_id: offer.seller_id,
        volume_kwh: offer.volume_kwh,
        price_cents_per_kwh: offer.price_cents_per_kwh,
        total_cents: offer.total_cents,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /p2p/offers/:id/settle — Settle a matched P2P trade
p2p.post('/offers/:id/settle', authMiddleware({ roles: ['admin', 'grid'] }), async (c) => {
  try {
    const id = c.req.param('id');

    const trade = await c.env.DB.prepare(
      'SELECT * FROM p2p_trades WHERE id = ? AND status = ?'
    ).bind(id, 'matched').first();
    if (!trade) return c.json({ success: false, error: 'Trade not found or not matched' }, 404);

    await c.env.DB.prepare(`
      UPDATE p2p_trades SET status = 'settled', settled_at = ?, settlement_agent = 'platform' WHERE id = ?
    `).bind(nowISO(), id).run();

    // Notify both parties
    const notifications = [trade.seller_id, trade.buyer_id].map((pid) =>
      c.env.DB.prepare(`
        INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
        VALUES (?, ?, 'P2P Trade Settled', ?, 'settlement', 'p2p_trade', ?)
      `).bind(
        generateId(), pid as string,
        `P2P trade of ${trade.volume_kwh} kWh has been settled.`,
        id,
      )
    );
    await c.env.DB.batch(notifications);

    // Fire cascade for P2P settlement
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'p2p.settled',
      actor_id: c.get('user').sub,
      entity_type: 'p2p_trade',
      entity_id: id,
      data: { seller_id: trade.seller_id, buyer_id: trade.buyer_id, volume_kwh: trade.volume_kwh, total_cents: trade.total_cents },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { id, status: 'settled' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /p2p/offers/:id — Cancel own offer
p2p.delete('/offers/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const offer = await c.env.DB.prepare(
      'SELECT * FROM p2p_trades WHERE id = ? AND seller_id = ? AND status = ?'
    ).bind(id, user.sub, 'open').first();
    if (!offer) return c.json({ success: false, error: 'Offer not found or cannot be cancelled' }, 404);

    await c.env.DB.prepare(
      "UPDATE p2p_trades SET status = 'cancelled' WHERE id = ?"
    ).bind(id).run();

    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /p2p/zones — List available distribution zones
p2p.get('/zones', authMiddleware(), async (c) => {
  try {
    const zones = await c.env.DB.prepare(
      "SELECT DISTINCT distribution_zone, COUNT(*) as offer_count FROM p2p_trades WHERE status = 'open' GROUP BY distribution_zone ORDER BY offer_count DESC"
    ).all();
    return c.json({ success: true, data: zones.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /p2p/my — My P2P trades
p2p.get('/my', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT * FROM p2p_trades WHERE seller_id = ? OR buyer_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(user.sub, user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default p2p;
