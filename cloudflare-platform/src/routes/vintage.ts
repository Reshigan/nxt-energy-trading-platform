/**
 * 3.1 Carbon Vintage Analysis — Auto-pricing model + fair value by vintage year
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const vintage = new Hono<HonoEnv>();
vintage.use('*', authMiddleware());

function calculateVintageDiscount(vintageYear: number, currentYear: number): number {
  const age = currentYear - vintageYear;
  if (age <= 0) return 0;
  if (age <= 2) return 0.05 * age;
  if (age <= 5) return 0.10 + 0.03 * (age - 2);
  return Math.min(0.40, 0.19 + 0.04 * (age - 5));
}

function getStandardMultiplier(standard: string): number {
  const multipliers: Record<string, number> = {
    VCS: 1.0, 'Gold Standard': 1.15, CDM: 0.85, 'SA Carbon Tax': 1.10, IREC: 0.95,
  };
  return multipliers[standard] || 1.0;
}

// GET /vintage/analysis — Analyze all carbon credits by vintage
vintage.get('/analysis', async (c) => {
  try {
    const credits = await c.env.DB.prepare(
      "SELECT * FROM carbon_credits WHERE status IN ('active', 'listed') ORDER BY vintage_year ASC"
    ).all();

    const currentYear = new Date().getFullYear();
    const basePriceRow = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as avg_price FROM trades WHERE market = 'carbon' AND status = 'settled' AND created_at > datetime('now', '-90 days')"
    ).first<{ avg_price: number | null }>();
    const basePrice = basePriceRow?.avg_price || 19000;

    const analysis = credits.results.map((credit: Record<string, unknown>) => {
      const vintageYear = (credit.vintage_year as number) || currentYear;
      const standard = (credit.standard as string) || 'VCS';
      const discount = calculateVintageDiscount(vintageYear, currentYear);
      const standardMultiplier = getStandardMultiplier(standard);
      const fairValueCents = Math.round(basePrice * (1 - discount) * standardMultiplier);
      const currentPriceCents = (credit.price_cents as number) || 0;
      const overvalued = currentPriceCents > fairValueCents * 1.1;
      const undervalued = currentPriceCents < fairValueCents * 0.9;

      return {
        credit_id: credit.id,
        project_name: credit.project_name,
        standard,
        vintage_year: vintageYear,
        age_years: currentYear - vintageYear,
        discount_pct: Math.round(discount * 100),
        standard_multiplier: standardMultiplier,
        current_price_cents: currentPriceCents,
        fair_value_cents: fairValueCents,
        valuation: overvalued ? 'overvalued' : undervalued ? 'undervalued' : 'fair',
        amount_tonnes: credit.amount_tonnes,
      };
    });

    // Summary by vintage
    const vintageGroups: Record<number, { count: number; total_tonnes: number; avg_fair_value: number }> = {};
    for (const a of analysis) {
      if (!vintageGroups[a.vintage_year]) {
        vintageGroups[a.vintage_year] = { count: 0, total_tonnes: 0, avg_fair_value: 0 };
      }
      vintageGroups[a.vintage_year].count++;
      vintageGroups[a.vintage_year].total_tonnes += (a.amount_tonnes as number) || 0;
      vintageGroups[a.vintage_year].avg_fair_value += a.fair_value_cents;
    }
    for (const year of Object.keys(vintageGroups)) {
      const g = vintageGroups[parseInt(year)];
      g.avg_fair_value = g.count > 0 ? Math.round(g.avg_fair_value / g.count) : 0;
    }

    return c.json({ success: true, data: { base_price_cents: basePrice, credits: analysis, vintage_summary: vintageGroups } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Vintage analysis failed'), 500);
  }
});

// GET /vintage/fair-value — Get fair value for a specific vintage/standard
vintage.get('/fair-value', async (c) => {
  try {
    const year = parseInt(c.req.query('year') || String(new Date().getFullYear()), 10);
    const standard = c.req.query('standard') || 'VCS';

    const currentYear = new Date().getFullYear();
    const basePriceRow = await c.env.DB.prepare(
      "SELECT AVG(price_cents) as avg_price FROM trades WHERE market = 'carbon' AND status = 'settled' AND created_at > datetime('now', '-90 days')"
    ).first<{ avg_price: number | null }>();
    const basePrice = basePriceRow?.avg_price || 19000;

    const discount = calculateVintageDiscount(year, currentYear);
    const standardMultiplier = getStandardMultiplier(standard);
    const fairValueCents = Math.round(basePrice * (1 - discount) * standardMultiplier);

    return c.json({
      success: true,
      data: {
        vintage_year: year, standard, base_price_cents: basePrice,
        discount_pct: Math.round(discount * 100), standard_multiplier: standardMultiplier,
        fair_value_cents: fairValueCents,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Fair value calculation failed'), 500);
  }
});

export default vintage;
