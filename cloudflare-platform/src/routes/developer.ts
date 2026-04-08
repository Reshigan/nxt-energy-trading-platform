import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';

const developer = new Hono<HonoEnv>();
developer.use('*', authMiddleware());

/**
 * Generate a random API key (shown once, like Stripe)
 */
async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = 'nxt_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const prefix = key.substring(0, 12);

  // Hash with SHA-256 for storage
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key));
  const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return { key, hash, prefix };
}

/**
 * Generate HMAC secret for webhook signing
 */
function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// POST /developer/keys — Create API key
developer.post('/keys', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      name: string;
      permissions: string[];
      rate_limit_per_minute?: number;
      expires_at?: string;
    };

    const { key, hash, prefix } = await generateApiKey();
    const id = generateId();

    await c.env.DB.prepare(`
      INSERT INTO api_keys (id, participant_id, name, key_hash, key_prefix, permissions, rate_limit_per_minute, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.sub, body.name, hash, prefix,
      JSON.stringify(body.permissions),
      body.rate_limit_per_minute || 60,
      body.expires_at || null,
    ).run();

    // Return the key ONCE — it won't be shown again
    return c.json({
      success: true,
      data: {
        id,
        key, // shown only once
        prefix,
        name: body.name,
        permissions: body.permissions,
        rate_limit_per_minute: body.rate_limit_per_minute || 60,
        warning: 'Store this key securely. It will not be shown again.',
      },
    }, 201);
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /developer/keys — List API keys (no key values, only prefixes)
developer.get('/keys', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT id, name, key_prefix, permissions, rate_limit_per_minute, last_used_at, expires_at, revoked, created_at FROM api_keys WHERE participant_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();

    return c.json({
      success: true,
      data: results.results.map((k) => ({
        ...k,
        permissions: k.permissions ? JSON.parse(k.permissions as string) : [],
      })),
    });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /developer/keys/:id — Revoke API key
developer.delete('/keys/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare(
      'UPDATE api_keys SET revoked = 1, revoked_at = ? WHERE id = ? AND participant_id = ?'
    ).bind(nowISO(), id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /developer/webhooks — Create webhook subscription
developer.post('/webhooks', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      url: string;
      events: string[];
    };

    const secret = generateWebhookSecret();
    const id = generateId();

    await c.env.DB.prepare(`
      INSERT INTO webhooks (id, participant_id, url, events, secret)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, user.sub, body.url, JSON.stringify(body.events), secret).run();

    return c.json({
      success: true,
      data: {
        id,
        url: body.url,
        events: body.events,
        secret, // shown once for HMAC verification
        warning: 'Store this secret securely for HMAC signature verification.',
      },
    }, 201);
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /developer/webhooks — List webhooks
developer.get('/webhooks', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT id, url, events, active, last_triggered_at, failure_count, created_at FROM webhooks WHERE participant_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();

    return c.json({
      success: true,
      data: results.results.map((w) => ({
        ...w,
        events: w.events ? JSON.parse(w.events as string) : [],
      })),
    });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /developer/webhooks/:id — Delete webhook
developer.delete('/webhooks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare(
      'DELETE FROM webhooks WHERE id = ? AND participant_id = ?'
    ).bind(id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /developer/webhooks/:id — Toggle webhook
developer.patch('/webhooks/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const { active } = await c.req.json() as { active: boolean };
    await c.env.DB.prepare(
      'UPDATE webhooks SET active = ? WHERE id = ? AND participant_id = ?'
    ).bind(active ? 1 : 0, id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /developer/usage — API usage stats
developer.get('/usage', async (c) => {
  try {
    const user = c.get('user');
    const keys = await c.env.DB.prepare(
      'SELECT id, name, key_prefix, last_used_at FROM api_keys WHERE participant_id = ? AND revoked = 0'
    ).bind(user.sub).all();

    // Get usage from KV (sliding window counters)
    const usage: Array<{ key_prefix: string; name: string; requests_today: number; requests_this_month: number }> = [];
    for (const key of keys.results) {
      const prefix = key.key_prefix as string;
      const todayKey = `apiusage:${prefix}:${new Date().toISOString().split('T')[0]}`;
      const todayCount = await c.env.KV.get(todayKey);
      usage.push({
        key_prefix: prefix,
        name: key.name as string,
        requests_today: todayCount ? parseInt(todayCount, 10) : 0,
        requests_this_month: 0, // aggregated from daily
      });
    }

    return c.json({ success: true, data: usage });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /developer/docs — OpenAPI spec summary
developer.get('/docs', async (c) => {
  try {
    return c.json({
      success: true,
      data: {
        openapi: '3.1.0',
        info: {
          title: 'NXT Energy Trading Platform API',
          version: '2.0.0',
          description: 'Converged energy trading marketplace for South Africa',
        },
        servers: [{ url: 'https://et.vantax.co.za/api/v1' }],
        paths: {
          '/trading/orders': { post: { summary: 'Place order', tags: ['Trading'] } },
          '/trading/orderbook/{market}': { get: { summary: 'Get order book', tags: ['Trading'] } },
          '/carbon/credits': { get: { summary: 'List carbon credits', tags: ['Carbon'] } },
          '/carbon/options': { get: { summary: 'List carbon options', tags: ['Carbon'] } },
          '/contracts/documents': { get: { summary: 'List contracts', tags: ['Contracts'] } },
          '/settlement/invoices': { get: { summary: 'List invoices', tags: ['Settlement'] } },
          '/ai/optimise': { post: { summary: 'Run AI portfolio optimisation', tags: ['AI'] } },
          '/ai/chat': { post: { summary: 'AI chat assistant', tags: ['AI'] } },
          '/metering/readings': { get: { summary: 'Get meter readings', tags: ['Metering'] } },
          '/metering/ingest': { post: { summary: 'Ingest meter readings', tags: ['Metering'] } },
          '/p2p/offers': { get: { summary: 'List P2P offers', tags: ['P2P'] } },
          '/reports': { get: { summary: 'List reports', tags: ['Reports'] } },
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          },
        },
        webhookEvents: [
          'trade.executed', 'order.filled', 'order.cancelled',
          'credit.retired', 'credit.transferred',
          'contract.signed', 'contract.phase_changed',
          'settlement.completed', 'escrow.released',
          'invoice.generated', 'invoice.paid',
          'alert.price', 'alert.risk',
        ],
      },
    });
  } catch (err) {
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default developer;
