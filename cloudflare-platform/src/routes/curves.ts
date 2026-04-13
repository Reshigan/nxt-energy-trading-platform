/**
 * 1.2 Forward Price Curves — Plot expected energy prices 1 month to 10 years forward
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const curves = new Hono<HonoEnv>();
curves.use('*', authMiddleware());

const TENORS = [1, 3, 6, 12, 24, 36, 60, 120, 180];

function getSeasonalFactor(market: string, tenorMonths: number): number {
  const futureMonth = ((new Date().getMonth() + tenorMonths) % 12) + 1;
  if (market === 'solar') {
    // SA summer (Oct-Mar) = higher solar, winter = lower
    return [1.0, 1.05, 1.02, 0.95, 0.85, 0.78, 0.75, 0.80, 0.88, 0.95, 1.02, 1.05][futureMonth - 1];
  }
  if (market === 'wind') {
    return [0.90, 0.85, 0.88, 0.95, 1.05, 1.10, 1.12, 1.08, 1.00, 0.92, 0.88, 0.85][futureMonth - 1];
  }
  if (market === 'carbon') {
    // Carbon prices trend upward with SA carbon tax trajectory
    return 1.0 + (tenorMonths / 120) * 0.3;
  }
  return 1.0; // gas/other
}

function getTrend(historicalPrices: Array<{ price_cents: number }>, tenorMonths: number): number {
  if (historicalPrices.length < 2) return 1.0;
  const first = historicalPrices[0].price_cents;
  const last = historicalPrices[historicalPrices.length - 1].price_cents;
  const monthlyGrowth = last > 0 ? Math.pow(first / last, 1 / Math.max(historicalPrices.length, 1)) : 1.0;
  return Math.pow(monthlyGrowth, tenorMonths);
}

function buildForwardCurve(
  market: string,
  basePrice: number,
  historicalPrices: Array<{ price_cents: number }>,
): Array<{ tenor_months: number; price_cents: number; confidence_lower_cents: number; confidence_upper_cents: number }> {
  return TENORS.map(t => {
    const seasonal = getSeasonalFactor(market, t);
    const trend = getTrend(historicalPrices, t);
    // SA-specific: Eskom tariff increases ~12%/yr, carbon tax R190→R236/t from 2027
    const eskomFactor = market === 'solar' || market === 'wind' ? 1.0 + (t / 12) * 0.12 : 1.0;
    const carbonTaxFactor = market === 'carbon' ? 1.0 + (t / 12) * 0.08 : 1.0;
    const price = basePrice * seasonal * trend * eskomFactor * carbonTaxFactor;
    const priceCents = Math.round(price);
    return {
      tenor_months: t,
      price_cents: priceCents,
      confidence_lower_cents: Math.round(priceCents * 0.85),
      confidence_upper_cents: Math.round(priceCents * 1.15),
    };
  });
}

// GET /curves/:market — Current forward curve (all tenors)
curves.get('/:market', async (c) => {
  try {
    const market = c.req.param('market');
    const today = new Date().toISOString().substring(0, 10);

    // Check cached curve
    const cached = await c.env.DB.prepare(
      'SELECT * FROM forward_curves WHERE market = ? AND curve_date = ? ORDER BY tenor_months ASC'
    ).bind(market, today).all();

    if (cached.results.length > 0) {
      return c.json({ success: true, data: { market, curve_date: today, points: cached.results } });
    }

    // Build from historical data
    const historical = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as price_cents FROM trades WHERE market = ? AND status = 'settled' GROUP BY strftime('%Y-%m', created_at) ORDER BY created_at DESC LIMIT 24"
    ).bind(market).all();

    const basePriceRow = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as avg_price FROM trades WHERE market = ? AND status = 'settled' AND created_at > datetime('now', '-30 days')"
    ).bind(market).first<{ avg_price: number | null }>();

    const basePrice = basePriceRow?.avg_price || (market === 'solar' ? 14500 : market === 'wind' ? 13200 : market === 'carbon' ? 19000 : 18000);
    const points = buildForwardCurve(market, basePrice, historical.results as Array<{ price_cents: number }>);

    return c.json({ success: true, data: { market, curve_date: today, points, base_price_cents: basePrice } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get forward curve'), 500);
  }
});

// GET /curves/:market/:tenor — Specific tenor point
curves.get('/:market/:tenor', async (c) => {
  try {
    const market = c.req.param('market');
    const tenor = parseInt(c.req.param('tenor'), 10);
    const today = new Date().toISOString().substring(0, 10);

    const point = await c.env.DB.prepare(
      'SELECT * FROM forward_curves WHERE market = ? AND curve_date = ? AND tenor_months = ?'
    ).bind(market, today, tenor).first();

    if (point) return c.json({ success: true, data: point });

    // Calculate on the fly
    const basePriceRow = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as avg_price FROM trades WHERE market = ? AND status = 'settled' AND created_at > datetime('now', '-30 days')"
    ).bind(market).first<{ avg_price: number | null }>();
    const basePrice = basePriceRow?.avg_price || 14500;
    const seasonal = getSeasonalFactor(market, tenor);
    const priceCents = Math.round(basePrice * seasonal);

    return c.json({
      success: true,
      data: { market, curve_date: today, tenor_months: tenor, price_cents: priceCents, confidence_lower_cents: Math.round(priceCents * 0.85), confidence_upper_cents: Math.round(priceCents * 1.15) },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get tenor point'), 500);
  }
});

// POST /curves/build/:market — Rebuild curve from historical data
curves.post('/build/:market', authMiddleware({ roles: ['admin', 'trader'] }), async (c) => {
  try {
    const market = c.req.param('market');
    const today = new Date().toISOString().substring(0, 10);

    const historical = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as price_cents FROM trades WHERE market = ? AND status = 'settled' GROUP BY strftime('%Y-%m', created_at) ORDER BY created_at DESC LIMIT 24"
    ).bind(market).all();

    const basePriceRow = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as avg_price FROM trades WHERE market = ? AND status = 'settled' AND created_at > datetime('now', '-30 days')"
    ).bind(market).first<{ avg_price: number | null }>();

    const basePrice = basePriceRow?.avg_price || 14500;
    const points = buildForwardCurve(market, basePrice, historical.results as Array<{ price_cents: number }>);

    // Delete old curves for today
    await c.env.DB.prepare('DELETE FROM forward_curves WHERE market = ? AND curve_date = ?').bind(market, today).run();

    // Insert new
    for (const p of points) {
      await c.env.DB.prepare(
        'INSERT INTO forward_curves (id, market, curve_date, tenor_months, price_cents, confidence_lower_cents, confidence_upper_cents, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(generateId(), market, today, p.tenor_months, p.price_cents, p.confidence_lower_cents, p.confidence_upper_cents, 'regression').run();
    }

    return c.json({ success: true, data: { market, curve_date: today, points, base_price_cents: basePrice } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to build forward curve'), 500);
  }
});

// GET /curves/history/:market — Historical curve evolution
curves.get('/history/:market', async (c) => {
  try {
    const market = c.req.param('market');
    const months = Math.max(1, Math.min(120, parseInt(c.req.query('months') || '12', 10) || 12));
    const results = await c.env.DB.prepare(
      `SELECT * FROM forward_curves WHERE market = ? AND curve_date > datetime('now', '-' || ? || ' months') ORDER BY curve_date DESC, tenor_months ASC`
    ).bind(market, months).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get curve history'), 500);
  }
});

export default curves;
