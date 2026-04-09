import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware, optionalAuth } from '../auth/middleware';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';

const marketplace = new Hono<HonoEnv>();

// GET /marketplace/listings — Browse listings
marketplace.get('/listings', optionalAuth(), async (c) => {
  try {
    const { type, technology, status = 'active', page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query = 'SELECT * FROM marketplace_listings';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type) { conditions.push('type = ?'); params.push(type); }
    if (technology) { conditions.push('technology = ?'); params.push(technology); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /marketplace/listings — Create listing
marketplace.post('/listings', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      type: string; technology?: string; capacity_mw?: number;
      volume?: number; price_cents?: number; tenor_months?: number;
      location?: string; description?: string; expires_at?: string;
    };

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO marketplace_listings (id, seller_id, type, technology, capacity_mw, volume,
        price_cents, tenor_months, location, description, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      id, user.sub, body.type, body.technology || null, body.capacity_mw || null,
      body.volume || null, body.price_cents || null, body.tenor_months || null,
      body.location || null, body.description || null, body.expires_at || null
    ).run();

    // Fire cascade for listing creation
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'listing.created',
      actor_id: user.sub,
      entity_type: 'marketplace_listing',
      entity_id: id,
      data: { type: body.type, technology: body.technology, price_cents: body.price_cents, capacity_mw: body.capacity_mw },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { id } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /marketplace/listings/:id — Get listing detail
marketplace.get('/listings/:id', optionalAuth(), async (c) => {
  try {
    const { id } = c.req.param();
    const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first();
    if (!listing) return c.json({ success: false, error: 'Listing not found' }, 404);

    // Get seller info
    const seller = await c.env.DB.prepare(
      'SELECT id, company_name, role, bbbee_level FROM participants WHERE id = ?'
    ).bind(listing.seller_id).first();

    return c.json({ success: true, data: { ...listing, seller } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /marketplace/listings/:id/bid — Place bid
marketplace.post('/listings/:id/bid', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { price_cents: number; volume?: number; notes?: string };

    const listing = await c.env.DB.prepare('SELECT * FROM marketplace_listings WHERE id = ?').bind(id).first();
    if (!listing) return c.json({ success: false, error: 'Listing not found' }, 404);
    if (listing.status !== 'active') return c.json({ success: false, error: 'Listing not active' }, 400);

    // Increment bid count
    await c.env.DB.prepare(
      'UPDATE marketplace_listings SET bid_count = bid_count + 1, updated_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    // Create notification for seller
    await c.env.DB.prepare(`
      INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
      VALUES (?, ?, 'New Bid Received', ?, 'trade', 'marketplace_listing', ?)
    `).bind(
      generateId(), listing.seller_id,
      `New bid of R${(body.price_cents / 100).toFixed(2)} on your listing`,
      id
    ).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'place_bid', 'marketplace_listing', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ price_cents: body.price_cents, volume: body.volume }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for bid placed
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'bid.placed',
      actor_id: user.sub,
      entity_type: 'marketplace_listing',
      entity_id: id,
      data: { seller_id: listing.seller_id, price_cents: body.price_cents, volume: body.volume },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, message: 'Bid placed' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /marketplace/listings/:id — Update listing
marketplace.patch('/listings/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const listing = await c.env.DB.prepare(
      'SELECT * FROM marketplace_listings WHERE id = ? AND seller_id = ?'
    ).bind(id, user.sub).first();

    if (!listing && user.role !== 'admin') {
      return c.json({ success: false, error: 'Listing not found or not owner' }, 404);
    }

    const body = await c.req.json() as Record<string, unknown>;
    const allowedFields = ['price_cents', 'volume', 'description', 'status', 'expires_at'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) return c.json({ success: false, error: 'No valid fields' }, 400);

    updates.push('updated_at = ?');
    values.push(nowISO());
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE marketplace_listings SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true, message: 'Listing updated' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /notifications — List notifications
marketplace.get('/notifications', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { unread, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query = 'SELECT * FROM notifications WHERE participant_id = ?';
    const params: unknown[] = [user.sub];

    if (unread === 'true') { query += ' AND read = 0'; }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();

    // Count unread
    const unreadCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE participant_id = ? AND read = 0'
    ).bind(user.sub).first<{ count: number }>();

    return c.json({
      success: true,
      data: results.results,
      meta: { unread_count: unreadCount?.count || 0 },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /notifications/:id/read — Mark notification as read
marketplace.post('/notifications/:id/read', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).run();

    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /notifications/read-all — Mark all as read
marketplace.post('/notifications/read-all', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE participant_id = ? AND read = 0'
    ).bind(user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default marketplace;
