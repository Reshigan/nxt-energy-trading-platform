/**
 * 4.3 Mobile Trade Alerts — Push notification subscriptions + price alerts
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const alerts = new Hono<HonoEnv>();
alerts.use('*', authMiddleware());

// POST /alerts/subscribe — Register push subscription
alerts.post('/subscribe', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      endpoint: string; keys: { p256dh: string; auth: string };
    }>();

    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO push_subscriptions (id, participant_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.endpoint, body.keys.p256dh, body.keys.auth).run();

    return c.json({ success: true, data: { id, subscribed: true } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to subscribe'), 500);
  }
});

// DELETE /alerts/subscribe — Unsubscribe
alerts.delete('/subscribe', async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE participant_id = ?').bind(user.sub).run();
    return c.json({ success: true, data: { subscribed: false } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to unsubscribe'), 500);
  }
});

// POST /alerts/price — Create a price alert
alerts.post('/price', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      market: string; target_price_cents: number; direction: string;
    }>();

    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO price_alerts (id, participant_id, market, target_price_cents, direction) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.market, body.target_price_cents, body.direction).run();

    return c.json({ success: true, data: { id, market: body.market, target_price_cents: body.target_price_cents, direction: body.direction } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create alert'), 500);
  }
});

// GET /alerts/price — List my price alerts
alerts.get('/price', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT * FROM price_alerts WHERE participant_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get alerts'), 500);
  }
});

// DELETE /alerts/price/:id — Delete a price alert
alerts.delete('/price/:id', async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    await c.env.DB.prepare('DELETE FROM price_alerts WHERE id = ? AND participant_id = ?').bind(id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete alert'), 500);
  }
});

// POST /alerts/check — Check and trigger price alerts (called by cron)
alerts.post('/check', async (c) => {
  try {
    const untriggered = await c.env.DB.prepare(
      'SELECT * FROM price_alerts WHERE triggered = 0'
    ).all();

    let triggeredCount = 0;
    for (const alert of untriggered.results) {
      const market = alert.market as string;
      const targetPrice = alert.target_price_cents as number;
      const direction = alert.direction as string;

      const latestTrade = await c.env.DB.prepare(
        "SELECT price_cents FROM trades WHERE market = ? AND status = 'settled' ORDER BY created_at DESC LIMIT 1"
      ).bind(market).first<{ price_cents: number }>();

      if (!latestTrade) continue;

      const currentPrice = latestTrade.price_cents;
      const shouldTrigger = (direction === 'above' && currentPrice >= targetPrice) ||
                           (direction === 'below' && currentPrice <= targetPrice);

      if (shouldTrigger) {
        await c.env.DB.prepare(
          'UPDATE price_alerts SET triggered = 1, triggered_at = ? WHERE id = ?'
        ).bind(nowISO(), alert.id).run();

        // Create notification
        await c.env.DB.prepare(
          `INSERT INTO notifications (id, participant_id, type, title, message, read, created_at)
           VALUES (?, ?, 'price_alert', ?, ?, 0, datetime('now'))`
        ).bind(
          generateId(), alert.participant_id,
          `Price Alert: ${market}`,
          `${market} price is now R${(currentPrice / 100).toFixed(2)}/kWh (target: R${(targetPrice / 100).toFixed(2)}/kWh ${direction})`
        ).run();

        triggeredCount++;
      }
    }

    return c.json({ success: true, data: { checked: untriggered.results.length, triggered: triggeredCount } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Alert check failed'), 500);
  }
});

// GET /alerts/subscriptions — Check subscription status
alerts.get('/subscriptions', async (c) => {
  try {
    const user = c.get('user');
    const sub = await c.env.DB.prepare(
      'SELECT id, created_at FROM push_subscriptions WHERE participant_id = ?'
    ).bind(user.sub).first();
    return c.json({ success: true, data: { subscribed: !!sub, subscription: sub } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to check subscriptions'), 500);
  }
});

export default alerts;
