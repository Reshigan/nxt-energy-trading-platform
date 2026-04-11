import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware, optionalAuth } from '../auth/middleware';
import { OrderSchema } from '../utils/validation';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';

const trading = new Hono<HonoEnv>();

// POST /orders — Place new order
trading.post('/orders', authMiddleware({ roles: ['admin', 'trader', 'carbon_fund', 'offtaker'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = OrderSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;

    // Item 22: Idempotency key check — prevent duplicate order submissions
    const idempotencyKey = c.req.header('X-Idempotency-Key');
    if (idempotencyKey) {
      const cached = await c.env.KV.get(`idempotency:order:${idempotencyKey}`);
      if (cached) {
        return c.json(JSON.parse(cached), 201);
      }
    }

    // Item 23 + B1: KYC gates trading — reject unverified users; require manual KYC approval
    const participant = await c.env.DB.prepare(
      'SELECT kyc_status, trading_enabled FROM participants WHERE id = ?'
    ).bind(user.sub).first<{ kyc_status: string; trading_enabled: number }>();
    if (!participant || participant.kyc_status !== 'verified' || participant.trading_enabled !== 1) {
      return c.json({ success: false, error: 'KYC verification required before trading. Your account must be manually approved by an admin.' }, 403);
    }

    // B6: Margin check — query existing settled trade exposure to prevent over-leveraging
    // Uses aggregate of settled trades as proxy for margin usage (no separate margin columns needed)
    const exposureResult = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(total_cents), 0) as exposure_cents FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'pending'"
    ).bind(user.sub, user.sub).first<{ exposure_cents: number }>();
    const currentExposureCents = exposureResult?.exposure_cents || 0;
    const orderValueCents = Math.round((data.volume || 0) * (data.price || 0) * 100); // Convert Rand to cents
    const marginLimitCents = 10000000; // Default R100k limit
    if (currentExposureCents + orderValueCents > marginLimitCents) {
      return c.json({ success: false, error: `Insufficient margin. Current exposure: R${(currentExposureCents / 100).toFixed(2)}, Order: R${(orderValueCents / 100).toFixed(2)}, Limit: R${(marginLimitCents / 100).toFixed(2)}` }, 400);
    }

    // Item 21: Market halt check — reject orders if market is halted
    const marketHalt = await c.env.KV.get(`market_halt:${data.market}`);
    if (marketHalt) {
      return c.json({ success: false, error: `Market ${data.market} is currently halted. Trading is suspended.` }, 403);
    }

    // Item 21: Price band validation — reject orders deviating >20% from last trade price
    if (data.price) {
      const lastIndexStr = await c.env.KV.get(`index:${data.market}`);
      if (lastIndexStr) {
        const lastIndex = JSON.parse(lastIndexStr);
        const lastPrice = lastIndex.price;
        if (lastPrice > 0) {
          const priceCentsCheck = Math.round(data.price * 100);
          const deviation = Math.abs(priceCentsCheck - lastPrice) / lastPrice;
          if (deviation > 0.20) {
            return c.json({ success: false, error: `Price deviates ${(deviation * 100).toFixed(1)}% from last trade (${lastPrice / 100}). Maximum allowed deviation is 20%.` }, 400);
          }
        }
      }
    }

    // Validate price for limit orders
    if (data.order_type === 'limit' && !data.price) {
      return c.json({ success: false, error: 'Price required for limit orders' }, 400);
    }

    // Validate iceberg fields
    if (data.order_type === 'iceberg' && !data.iceberg_visible_qty) {
      return c.json({ success: false, error: 'iceberg_visible_qty required for iceberg orders' }, 400);
    }

    const orderId = generateId();
    const priceCents = data.price ? Math.round(data.price * 100) : null;

    // Save order to D1
    await c.env.DB.prepare(`
      INSERT INTO orders (id, participant_id, direction, market, volume, price_cents, order_type,
        validity, gtd_expiry, iceberg_visible_qty, iceberg_total_qty, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).bind(
      orderId, user.sub, data.direction, data.market, data.volume,
      priceCents, data.order_type, data.validity,
      data.gtd_expiry || null,
      data.iceberg_visible_qty || null,
      data.order_type === 'iceberg' ? data.volume : null
    ).run();

    // Send to OrderBook Durable Object
    const doId = c.env.ORDER_BOOK.idFromName(data.market);
    const stub = c.env.ORDER_BOOK.get(doId);

    const doResponse = await stub.fetch(new Request('http://do/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        participantId: user.sub,
        direction: data.direction,
        market: data.market,
        volume: data.volume,
        price: priceCents,
        orderType: data.order_type,
        validity: data.validity,
        icebergVisibleQty: data.iceberg_visible_qty,
      }),
    }));

    const doResult = await doResponse.json() as { success: boolean; matches: Array<{
      tradeId: string; buyerId: string; sellerId: string; buyOrderId: string;
      sellOrderId: string; volume: number; price: number; market: string; timestamp: string;
    }> };

    // Record trades from matches
    if (doResult.matches && doResult.matches.length > 0) {
      let totalFilled = 0;
      for (const match of doResult.matches) {
        // B2: Fee from fee_schedule (not hardcoded)
        const feeRow = await c.env.DB.prepare(
          "SELECT rate, minimum_cents, maximum_cents FROM fee_schedule WHERE fee_type = 'trading' AND active = 1"
        ).first<{ rate: number; minimum_cents: number; maximum_cents: number }>();
        const feeRate = feeRow?.rate || 0.0015;
        const totalCents = Math.round(match.volume * match.price);
        const rawFee = Math.round(totalCents * feeRate);
        const feeCents = Math.max(
          feeRow?.minimum_cents || 100,
          Math.min(rawFee, feeRow?.maximum_cents || 1000000)
        );

        await c.env.DB.prepare(`
          INSERT INTO trades (id, buyer_id, seller_id, market, volume, price_cents, total_cents, fee_cents, order_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
          match.tradeId, match.buyerId, match.sellerId, match.market,
          match.volume, match.price, totalCents, feeCents, orderId
        ).run();

        totalFilled += match.volume;

        // Update market index in KV
        await updateMarketIndex(c.env.KV, match.market, match.price, match.volume);
      }

      // Update order status
      const status = totalFilled >= data.volume ? 'filled' : 'partial';
      await c.env.DB.prepare(
        'UPDATE orders SET filled_volume = ?, status = ?, updated_at = ? WHERE id = ?'
      ).bind(totalFilled, status, nowISO(), orderId).run();
    }

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'place_order', 'order', ?, ?, ?)
    `).bind(
      generateId(), user.sub, orderId,
      JSON.stringify({ direction: data.direction, market: data.market, volume: data.volume, price: data.price, type: data.order_type }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for order placement
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'order.placed',
      actor_id: user.sub,
      entity_type: 'order',
      entity_id: orderId,
      data: { market: data.market, direction: data.direction, volume: data.volume, price: data.price, order_type: data.order_type },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    // Fire cascade for each trade match
    if (doResult.matches && doResult.matches.length > 0) {
      for (const match of doResult.matches) {
        c.executionCtx.waitUntil(cascade(c.env, {
          type: 'trade.matched',
          actor_id: user.sub,
          entity_type: 'trade',
          entity_id: match.tradeId,
          data: { buyer_id: match.buyerId, seller_id: match.sellerId, market: match.market, volume: match.volume, price_cents: match.price, total_cents: Math.round(match.volume * match.price) },
          ip: c.req.header('CF-Connecting-IP') || 'unknown',
          request_id: c.get('requestId'),
        }));
      }
    }

    const responseBody = {
      success: true,
      data: {
        orderId,
        status: doResult.matches?.length ? (doResult.matches.reduce((s, m) => s + m.volume, 0) >= data.volume ? 'filled' : 'partial') : 'open',
        matches: doResult.matches || [],
      },
    };

    // Item 22: Store idempotency result in KV (24h TTL)
    if (idempotencyKey) {
      c.executionCtx.waitUntil(
        c.env.KV.put(`idempotency:order:${idempotencyKey}`, JSON.stringify(responseBody), { expirationTtl: 86400 })
      );
    }

    return c.json(responseBody, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /orders/:id — Cancel order
trading.delete('/orders/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const order = await c.env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).first();

    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    if (order.status !== 'open' && order.status !== 'partial') {
      return c.json({ success: false, error: 'Can only cancel open or partial orders' }, 400);
    }

    // Remove from DO order book
    const doId = c.env.ORDER_BOOK.idFromName(order.market as string);
    const stub = c.env.ORDER_BOOK.get(doId);
    await stub.fetch(new Request('http://do/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    }));

    await c.env.DB.prepare(
      'UPDATE orders SET status = \'cancelled\', updated_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    // Fire cascade for order cancellation
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'order.cancelled',
      actor_id: user.sub,
      entity_type: 'order',
      entity_id: id,
      data: { market: order.market as string },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, message: 'Order cancelled' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /orders — List orders
trading.get('/orders', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { status, market, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query = 'SELECT * FROM orders WHERE participant_id = ?';
    const params: unknown[] = [user.sub];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (market) { query += ' AND market = ?'; params.push(market); }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /orders/history — Trade fill history
trading.get('/orders/history', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    const results = await c.env.DB.prepare(`
      SELECT t.*, o.direction, o.order_type
      FROM trades t JOIN orders o ON t.order_id = o.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.created_at DESC LIMIT ? OFFSET ?
    `).bind(user.sub, user.sub, pg.per_page, pg.offset).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /positions — Current positions with P&L
trading.get('/positions', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');

    const results = await c.env.DB.prepare(`
      SELECT market,
        SUM(CASE WHEN buyer_id = ? THEN volume ELSE 0 END) as bought_volume,
        SUM(CASE WHEN seller_id = ? THEN volume ELSE 0 END) as sold_volume,
        SUM(CASE WHEN buyer_id = ? THEN volume ELSE 0 END) -
          SUM(CASE WHEN seller_id = ? THEN volume ELSE 0 END) as net_volume,
        SUM(CASE WHEN buyer_id = ? THEN total_cents ELSE 0 END) as total_bought_cents,
        SUM(CASE WHEN seller_id = ? THEN total_cents ELSE 0 END) as total_sold_cents
      FROM trades
      WHERE (buyer_id = ? OR seller_id = ?) AND status = 'settled'
      GROUP BY market
    `).bind(user.sub, user.sub, user.sub, user.sub, user.sub, user.sub, user.sub, user.sub).all();

    // Enrich with current market prices from KV
    const positions = await Promise.all(results.results.map(async (pos) => {
      const indexStr = await c.env.KV.get(`index:${pos.market}`);
      const index = indexStr ? JSON.parse(indexStr) : null;
      const currentPrice = index?.price || 0;
      const netVolume = pos.net_volume as number;
      const avgEntryPrice = netVolume !== 0
        ? ((pos.total_bought_cents as number) - (pos.total_sold_cents as number)) / Math.abs(netVolume)
        : 0;
      const unrealisedPnl = netVolume * (currentPrice - avgEntryPrice);

      return {
        ...pos,
        current_price_cents: currentPrice,
        avg_entry_price_cents: Math.round(avgEntryPrice),
        unrealised_pnl_cents: Math.round(unrealisedPnl),
      };
    }));

    return c.json({ success: true, data: positions });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /orderbook/:market — Current order book snapshot
trading.get('/orderbook/:market', optionalAuth(), async (c) => {
  try {
    const { market } = c.req.param();
    const validMarkets = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery', 'solar_ppa', 'wind_ppa', 'gas_spot'];
    if (!validMarkets.includes(market)) {
      return c.json({ success: false, error: 'Invalid market' }, 400);
    }

    const doId = c.env.ORDER_BOOK.idFromName(market);
    const stub = c.env.ORDER_BOOK.get(doId);
    const response = await stub.fetch(new Request('http://do/snapshot'));
    const snapshot = await response.json();

    return c.json({ success: true, data: snapshot });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /markets/indices — All market indices
trading.get('/markets/indices', optionalAuth(), async (c) => {
  try {
    const markets = ['solar', 'wind', 'gas', 'carbon', 'battery', 'hydro'];
    const indices: Record<string, unknown> = {};

    for (const market of markets) {
      const indexStr = await c.env.KV.get(`index:${market}`);
      indices[market] = indexStr ? JSON.parse(indexStr) : {
        price: 0,
        change_24h: 0,
        volume_24h: 0,
        last_trade: null,
      };
    }

    return c.json({ success: true, data: indices });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /markets/prices/:market — Historical price data
trading.get('/markets/prices/:market', optionalAuth(), async (c) => {
  try {
    const { market } = c.req.param();
    const { interval = '1h' } = c.req.query();

    // Return recent trades as price points
    const trades = await c.env.DB.prepare(`
      SELECT price_cents, volume, created_at FROM trades
      WHERE market = ? AND status IN ('pending', 'settled')
      ORDER BY created_at DESC LIMIT 100
    `).bind(market).all();

    return c.json({
      success: true,
      data: {
        market,
        interval,
        candles: trades.results.reverse().map((t) => ({
          time: t.created_at,
          open: t.price_cents,
          high: t.price_cents,
          low: t.price_cents,
          close: t.price_cents,
          volume: t.volume,
        })),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// Item 21: POST /admin/markets/:market/halt — Halt/resume market trading
trading.post('/admin/markets/:market/halt', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const { market } = c.req.param();
    const body = await c.req.json() as { halt: boolean; reason?: string };
    const user = c.get('user');

    if (body.halt) {
      await c.env.KV.put(`market_halt:${market}`, JSON.stringify({
        halted_by: user.sub,
        reason: body.reason || 'Administrative halt',
        halted_at: nowISO(),
      }));
    } else {
      await c.env.KV.delete(`market_halt:${market}`);
    }

    // Audit
    await c.env.DB.prepare(
      "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, 'market', ?, ?, ?)"
    ).bind(
      generateId(), user.sub, body.halt ? 'market.halted' : 'market.resumed',
      market, JSON.stringify({ reason: body.reason }), c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true, data: { market, halted: body.halt } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// Helper: Update market index in KV
async function updateMarketIndex(kv: KVNamespace, market: string, price: number, volume: number): Promise<void> {
  const key = `index:${market}`;
  const existing = await kv.get(key);
  const current = existing ? JSON.parse(existing) : { price: 0, volume_24h: 0 };

  const newIndex = {
    price,
    change_24h: current.price > 0 ? ((price - current.price) / current.price) * 100 : 0,
    volume_24h: current.volume_24h + volume,
    last_trade: nowISO(),
  };

  await kv.put(key, JSON.stringify(newIndex), { expirationTtl: 86400 });
}

export default trading;
