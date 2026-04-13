/**
 * 1.5 PPA Valuation Engine — NPV, IRR, LCOE, payback for power purchase agreements
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const valuation = new Hono<HonoEnv>();
valuation.use('*', authMiddleware());

function calculateNPV(cashflows: number[], discountRate: number): number {
  return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + discountRate, t + 1), 0);
}

function calculateIRR(cashflows: number[], initialInvestment: number, maxIter = 100): number {
  let lo = -0.5, hi = 5.0;
  const allCf = [-initialInvestment, ...cashflows];
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const npv = allCf.reduce((s, cf, t) => s + cf / Math.pow(1 + mid, t), 0);
    if (Math.abs(npv) < 0.01) return mid;
    if (npv > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function calculateLCOE(totalCostCents: number, totalGenerationKwh: number): number {
  return totalGenerationKwh > 0 ? totalCostCents / totalGenerationKwh : 0;
}

function calculatePayback(initialInvestment: number, annualCashflow: number): number {
  return annualCashflow > 0 ? initialInvestment / annualCashflow : Infinity;
}

// POST /valuation/ppa — Full PPA financial model
valuation.post('/ppa', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      ppa_tariff_cents: number;
      escalation_pct: number;
      capacity_mw: number;
      capacity_factor_pct: number;
      capex_rands: number;
      opex_annual_rands: number;
      opex_escalation_pct: number;
      tenure_years: number;
      discount_rate: number;
      grid_tariff_cents?: number;
      grid_escalation_pct?: number;
      degradation_pct?: number;
      currency?: string;
    }>();

    const years = body.tenure_years || 20;
    const degradation = body.degradation_pct || 0.5;
    const gridTariff = body.grid_tariff_cents || 350;
    const gridEscalation = body.grid_escalation_pct || 12;
    const annualGenBase = body.capacity_mw * 1000 * (body.capacity_factor_pct / 100) * 8760;

    const cashflows: number[] = [];
    const yearlyBreakdown: Array<{
      year: number; generation_kwh: number; ppa_tariff_cents: number;
      grid_tariff_cents: number; revenue_rands: number; opex_rands: number;
      net_cashflow_rands: number; cumulative_rands: number;
    }> = [];

    let cumulative = -body.capex_rands;
    let paybackYear: number | null = null;
    let totalGenKwh = 0;
    let totalCostRands = body.capex_rands;

    for (let y = 1; y <= years; y++) {
      const genKwh = annualGenBase * Math.pow(1 - degradation / 100, y - 1);
      const ppaTariff = body.ppa_tariff_cents * Math.pow(1 + body.escalation_pct / 100, y - 1);
      const gridTariffY = gridTariff * Math.pow(1 + gridEscalation / 100, y - 1);
      const revenueRands = (genKwh * ppaTariff) / 10000;
      const opexRands = body.opex_annual_rands * Math.pow(1 + body.opex_escalation_pct / 100, y - 1);
      const netCf = revenueRands - opexRands;
      cumulative += netCf;
      totalGenKwh += genKwh;
      totalCostRands += opexRands;

      cashflows.push(netCf);

      if (paybackYear === null && cumulative >= 0) paybackYear = y;

      yearlyBreakdown.push({
        year: y,
        generation_kwh: Math.round(genKwh),
        ppa_tariff_cents: Math.round(ppaTariff * 100) / 100,
        grid_tariff_cents: Math.round(gridTariffY * 100) / 100,
        revenue_rands: Math.round(revenueRands),
        opex_rands: Math.round(opexRands),
        net_cashflow_rands: Math.round(netCf),
        cumulative_rands: Math.round(cumulative),
      });
    }

    const npv = calculateNPV(cashflows, body.discount_rate / 100);
    const irr = calculateIRR(cashflows, body.capex_rands);
    const lcoe = calculateLCOE(totalCostRands * 100, totalGenKwh);
    const payback = paybackYear || calculatePayback(body.capex_rands, cashflows.length > 0 ? cashflows.reduce((s, c) => s + c, 0) / cashflows.length : 0);

    // Grid savings
    const gridSavingsRands = yearlyBreakdown.reduce((s, yr) => {
      const gridCost = (yr.generation_kwh * yr.grid_tariff_cents) / 10000;
      return s + (gridCost - yr.revenue_rands);
    }, 0);

    const result = {
      id: generateId(),
      npv_rands: Math.round(npv),
      irr_pct: Math.round(irr * 10000) / 100,
      lcoe_cents_kwh: Math.round(lcoe * 100) / 100,
      payback_years: typeof payback === 'number' && isFinite(payback) ? Math.round(payback * 10) / 10 : null,
      total_generation_mwh: Math.round(totalGenKwh / 1000),
      grid_savings_rands: Math.round(gridSavingsRands),
      capex_rands: body.capex_rands,
      tenure_years: years,
      currency: body.currency || 'ZAR',
      yearly_breakdown: yearlyBreakdown,
      recommendation: npv > 0 && irr > body.discount_rate / 100 ? 'PROCEED' : npv > 0 ? 'MARGINAL' : 'REJECT',
    };

    // Store valuation
    try {
      await c.env.DB.prepare(
        `INSERT INTO vault_documents (id, participant_id, type, content_json, status, created_at)
         VALUES (?, ?, 'PPA_VALUATION', ?, 'verified', datetime('now'))`
      ).bind(result.id, user.sub, JSON.stringify(result)).run();
    } catch { /* non-critical */ }

    return c.json({ success: true, data: result });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to calculate PPA valuation'), 500);
  }
});

// POST /valuation/sensitivity — Run sensitivity analysis
valuation.post('/sensitivity', async (c) => {
  try {
    const body = await c.req.json<{
      base_npv_rands: number; capex_rands: number; ppa_tariff_cents: number;
      capacity_factor_pct: number; discount_rate: number;
    }>();

    const vars = [
      { name: 'PPA Tariff', base: body.ppa_tariff_cents, unit: 'c/kWh' },
      { name: 'Capacity Factor', base: body.capacity_factor_pct, unit: '%' },
      { name: 'CAPEX', base: body.capex_rands, unit: 'ZAR' },
      { name: 'Discount Rate', base: body.discount_rate, unit: '%' },
    ];

    const results = vars.map(v => {
      const sensitivities = [-20, -10, -5, 0, 5, 10, 20].map(pctChange => {
        const factor = 1 + pctChange / 100;
        const npvImpact = v.name === 'PPA Tariff' || v.name === 'Capacity Factor'
          ? body.base_npv_rands * factor
          : v.name === 'CAPEX'
            ? body.base_npv_rands - (body.capex_rands * (factor - 1))
            : body.base_npv_rands / factor;
        return { pct_change: pctChange, npv_rands: Math.round(npvImpact) };
      });
      return { variable: v.name, base_value: v.base, unit: v.unit, sensitivities };
    });

    return c.json({ success: true, data: results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Sensitivity analysis failed'), 500);
  }
});

// GET /valuation/history — Past valuations
valuation.get('/history', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      "SELECT * FROM vault_documents WHERE participant_id = ? AND type = 'PPA_VALUATION' ORDER BY created_at DESC LIMIT 20"
    ).bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get valuation history'), 500);
  }
});

export default valuation;
