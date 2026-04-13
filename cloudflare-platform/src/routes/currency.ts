/**
 * 1.4 Multi-Currency Support — Exchange rates and currency conversion
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const currency = new Hono<HonoEnv>();
currency.use('*', authMiddleware());

// GET /currency/rates — Current exchange rates
currency.get('/rates', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM exchange_rates ORDER BY effective_date DESC'
    ).all();

    // Group by target currency, take latest
    const latest: Record<string, unknown> = {};
    for (const r of results.results) {
      const key = `${r.base_currency}_${r.target_currency}`;
      if (!latest[key]) latest[key] = r;
    }

    return c.json({ success: true, data: Object.values(latest) });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch rates'), 500);
  }
});

// POST /currency/rates — Admin updates rates
currency.post('/rates', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const body = await c.req.json<{
      rates: Array<{ base_currency?: string; target_currency: string; rate: number }>;
    }>();

    const today = new Date().toISOString().substring(0, 10);
    const inserted: Array<{ id: string; target_currency: string; rate: number }> = [];

    for (const r of body.rates) {
      const id = generateId();
      await c.env.DB.prepare(
        'INSERT INTO exchange_rates (id, base_currency, target_currency, rate, source, effective_date) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, r.base_currency || 'ZAR', r.target_currency, r.rate, 'manual', today).run();
      inserted.push({ id, target_currency: r.target_currency, rate: r.rate });
    }

    return c.json({ success: true, data: inserted }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update rates'), 500);
  }
});

// POST /currency/convert — Convert amount between currencies
currency.post('/convert', async (c) => {
  try {
    const body = await c.req.json<{ amount: number; from: string; to: string }>();

    if (body.from === body.to) {
      return c.json({ success: true, data: { amount: body.amount, from: body.from, to: body.to, converted: body.amount, rate: 1 } });
    }

    // Try direct rate
    let rate = await c.env.DB.prepare(
      'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? ORDER BY effective_date DESC LIMIT 1'
    ).bind(body.from, body.to).first<{ rate: number }>();

    if (!rate) {
      // Try inverse
      const inverse = await c.env.DB.prepare(
        'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? ORDER BY effective_date DESC LIMIT 1'
      ).bind(body.to, body.from).first<{ rate: number }>();
      if (inverse) {
        rate = { rate: 1 / inverse.rate };
      }
    }

    if (!rate) {
      // Try through ZAR
      const fromZar = await c.env.DB.prepare(
        'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? ORDER BY effective_date DESC LIMIT 1'
      ).bind('ZAR', body.from).first<{ rate: number }>();
      const toZar = await c.env.DB.prepare(
        'SELECT rate FROM exchange_rates WHERE base_currency = ? AND target_currency = ? ORDER BY effective_date DESC LIMIT 1'
      ).bind('ZAR', body.to).first<{ rate: number }>();

      if (fromZar && toZar) {
        rate = { rate: toZar.rate / fromZar.rate };
      }
    }

    if (!rate) return c.json({ success: false, error: `No exchange rate found for ${body.from}/${body.to}` }, 404);

    return c.json({
      success: true,
      data: { amount: body.amount, from: body.from, to: body.to, converted: Math.round(body.amount * rate.rate * 100) / 100, rate: rate.rate },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to convert currency'), 500);
  }
});

export default currency;
