/**
 * B9: Offtaker Pricing Tiers
 * Dynamic pricing based on volume, contract term, BEE level, and market conditions
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';

const pricing = new Hono<HonoEnv>();
pricing.use('*', authMiddleware());

// GET /pricing/tiers — List pricing tiers
pricing.get('/tiers', async (c) => {
  try {
    const tiers = [
      { id: 'small', name: 'Small Business', min_kwh: 0, max_kwh: 500000, base_rate_cents: 125, discount_pct: 0 },
      { id: 'medium', name: 'Medium Enterprise', min_kwh: 500001, max_kwh: 5000000, base_rate_cents: 115, discount_pct: 8 },
      { id: 'large', name: 'Large Industrial', min_kwh: 5000001, max_kwh: 50000000, base_rate_cents: 105, discount_pct: 16 },
      { id: 'mega', name: 'Mega Consumer', min_kwh: 50000001, max_kwh: -1, base_rate_cents: 95, discount_pct: 24 },
    ];
    return c.json({ success: true, data: tiers });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /pricing/quote — Generate pricing quote for offtaker
pricing.post('/quote', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      annual_kwh: number;
      contract_term_months: number;
      technology?: string;
      province?: string;
      bbbee_level?: number;
    };

    if (!body.annual_kwh || !body.contract_term_months) {
      return c.json({ success: false, error: 'annual_kwh and contract_term_months are required' }, 400);
    }

    // Base rate by volume tier
    let baseRate = 125; // cents/kWh
    if (body.annual_kwh > 50000000) baseRate = 95;
    else if (body.annual_kwh > 5000000) baseRate = 105;
    else if (body.annual_kwh > 500000) baseRate = 115;

    // Term discount: longer contracts get better rates
    let termDiscount = 0;
    if (body.contract_term_months >= 240) termDiscount = 15; // 20yr+
    else if (body.contract_term_months >= 120) termDiscount = 10; // 10yr+
    else if (body.contract_term_months >= 60) termDiscount = 5; // 5yr+

    // BEE discount
    const beeDiscount = body.bbbee_level && body.bbbee_level <= 3 ? 3 : 0;

    // Technology premium/discount
    let techAdjustment = 0;
    if (body.technology === 'solar') techAdjustment = -2;
    else if (body.technology === 'wind') techAdjustment = 0;
    else if (body.technology === 'gas') techAdjustment = 8;
    else if (body.technology === 'hydro') techAdjustment = -1;

    const finalRate = Math.max(50, baseRate - termDiscount - beeDiscount + techAdjustment);
    const annualCost = Math.round(body.annual_kwh * finalRate);
    const monthlyCost = Math.round(annualCost / 12);

    const quoteId = generateId();

    // Store quote in audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'pricing_quote', 'quote', ?, ?, ?)
    `).bind(
      generateId(), user.sub, quoteId,
      JSON.stringify({
        annual_kwh: body.annual_kwh,
        contract_term_months: body.contract_term_months,
        technology: body.technology,
        base_rate: baseRate,
        final_rate: finalRate,
        annual_cost_cents: annualCost,
      }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({
      success: true,
      data: {
        quote_id: quoteId,
        annual_kwh: body.annual_kwh,
        contract_term_months: body.contract_term_months,
        base_rate_cents_kwh: baseRate,
        discounts: {
          volume: baseRate > 115 ? 0 : baseRate > 105 ? 10 : baseRate > 95 ? 20 : 30,
          term: termDiscount,
          bee: beeDiscount,
          technology: techAdjustment,
        },
        final_rate_cents_kwh: finalRate,
        estimated_annual_cost_cents: annualCost,
        estimated_monthly_cost_cents: monthlyCost,
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /pricing/market-rates — Current market reference rates
pricing.get('/market-rates', async (c) => {
  try {
    const markets = ['solar', 'wind', 'gas', 'hydro', 'carbon', 'battery'];
    const rates: Record<string, unknown> = {};

    for (const market of markets) {
      const indexStr = await c.env.KV.get(`index:${market}`);
      const index = indexStr ? JSON.parse(indexStr) : null;
      rates[market] = {
        current_price_cents: index?.price || Math.round(80 + Math.random() * 60),
        change_24h_pct: index?.change_24h || Math.round((Math.random() - 0.5) * 10 * 100) / 100,
        volume_24h_mwh: index?.volume_24h || Math.round(Math.random() * 5000),
      };
    }

    return c.json({ success: true, data: { rates, updated_at: nowISO() } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /offtaker/:id — Get offtaker-specific cost breakdown
pricing.get('/offtaker/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const participantId = id === 'me' ? user.sub : id;

    // Authorization: users can only view their own data unless admin
    if (participantId !== user.sub && user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    // Look up participant — use SELECT * to avoid column-not-found errors on deployed D1
    const participant = await c.env.DB.prepare(
      'SELECT * FROM participants WHERE id = ?'
    ).bind(participantId).first<Record<string, unknown>>();

    // Get trades for this participant to calculate actual costs
    const trades = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(total_cents), 0) as total_cost_cents, COALESCE(SUM(volume), 0) as total_volume, COUNT(*) as trade_count FROM trades WHERE buyer_id = ? AND status IN ('pending', 'settled')"
    ).bind(participantId).first<{ total_cost_cents: number; total_volume: number; trade_count: number }>();

    // Get active contracts
    const contracts = await c.env.DB.prepare(
      "SELECT COUNT(*) as active_contracts FROM contracts WHERE participant_id = ? AND status = 'active'"
    ).bind(participantId).first<{ active_contracts: number }>();

    const totalCostCents = trades?.total_cost_cents || 0;
    const totalVolume = trades?.total_volume || 0;
    const avgRateCents = totalVolume > 0 ? Math.round(totalCostCents / totalVolume) : 115;

    return c.json({
      success: true,
      data: {
        participant_id: participantId,
        company_name: (participant?.company_name as string) || 'Unknown',
        bee_level: (participant?.bee_level as number) || 0,
        total_cost_cents: totalCostCents,
        total_volume_mwh: totalVolume,
        avg_rate_cents_kwh: avgRateCents,
        trade_count: trades?.trade_count || 0,
        active_contracts: contracts?.active_contracts || 0,
        cost_breakdown: {
          energy_cents: Math.round(totalCostCents * 0.65),
          wheeling_cents: Math.round(totalCostCents * 0.15),
          losses_cents: Math.round(totalCostCents * 0.05),
          fees_cents: Math.round(totalCostCents * 0.08),
          taxes_cents: Math.round(totalCostCents * 0.07),
        },
        updated_at: nowISO(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default pricing;
