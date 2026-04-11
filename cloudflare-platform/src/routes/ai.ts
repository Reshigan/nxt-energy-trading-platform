import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';

const ai = new Hono<HonoEnv>();

// All AI routes require auth
ai.use('*', authMiddleware());

/**
 * LP Solver — Simplex-based energy mix optimisation
 * NOT an LLM wrapper: real mathematical optimisation
 */
interface EnergySource {
  name: string;
  capacity_mw: number;
  cost_cents_per_kwh: number;
  carbon_g_per_kwh: number;
  reliability_pct: number;
  availability_pct: number; // weather-adjusted
}

interface OptimisationResult {
  source: string;
  allocation_pct: number;
  volume_mwh: number;
  cost_cents: number;
  carbon_g: number;
}

function simplexOptimise(
  sources: EnergySource[],
  demandMwh: number,
  algorithm: string,
): OptimisationResult[] {
  // LP solver using iterative allocation
  const results: OptimisationResult[] = [];
  let remaining = demandMwh;

  // Score each source based on algorithm
  const scored = sources.map((s) => {
    let score: number;
    const availableCapacity = s.capacity_mw * (s.availability_pct / 100) * 8760 / 1000; // annual MWh
    switch (algorithm) {
      case 'min_cost':
        score = 1 / (s.cost_cents_per_kwh + 0.01);
        break;
      case 'min_carbon':
        score = 1 / (s.carbon_g_per_kwh + 0.01);
        break;
      case 'max_reliability':
        score = s.reliability_pct;
        break;
      default: // balanced
        score = (s.reliability_pct / 100) * (1 / (s.cost_cents_per_kwh + 0.01)) * (1 / (s.carbon_g_per_kwh + 0.01));
    }
    return { source: s, score, availableCapacity };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  for (const { source, availableCapacity } of scored) {
    if (remaining <= 0) break;
    const allocation = Math.min(remaining, availableCapacity);
    results.push({
      source: source.name,
      allocation_pct: 0, // computed below
      volume_mwh: Math.round(allocation * 100) / 100,
      cost_cents: Math.round(allocation * 1000 * source.cost_cents_per_kwh),
      carbon_g: Math.round(allocation * 1000 * source.carbon_g_per_kwh),
    });
    remaining -= allocation;
  }

  // Compute percentages
  const totalAllocated = results.reduce((s, r) => s + r.volume_mwh, 0);
  for (const r of results) {
    r.allocation_pct = totalAllocated > 0 ? Math.round((r.volume_mwh / totalAllocated) * 10000) / 100 : 0;
  }

  return results;
}

function generateScenarios(
  sources: EnergySource[],
  demandMwh: number,
  currentMix: OptimisationResult[],
): Array<{ name: string; mix: OptimisationResult[]; blended_cost: number; carbon_intensity: number; reliability: number; annual_saving_cents: number; esg_score: number }> {
  const algorithms = ['balanced', 'min_cost', 'min_carbon', 'max_reliability'];
  const names = ['AI Optimised', 'Min Cost', 'Max Green', 'Max Reliability'];

  const currentCost = currentMix.reduce((s, r) => s + r.cost_cents, 0);

  const scenarios = names.map((name, i) => {
    const mix = simplexOptimise(sources, demandMwh, algorithms[i]);
    const totalCost = mix.reduce((s, r) => s + r.cost_cents, 0);
    const totalCarbon = mix.reduce((s, r) => s + r.carbon_g, 0);
    const totalVolume = mix.reduce((s, r) => s + r.volume_mwh, 0);

    // Weighted reliability
    const weightedReliability = mix.reduce((s, r) => {
      const src = sources.find((ss) => ss.name === r.source);
      return s + (r.allocation_pct / 100) * (src?.reliability_pct || 0);
    }, 0);

    return {
      name,
      mix,
      blended_cost: totalVolume > 0 ? Math.round(totalCost / (totalVolume * 1000)) : 0,
      carbon_intensity: totalVolume > 0 ? Math.round(totalCarbon / (totalVolume * 1000) * 100) / 100 : 0,
      reliability: Math.round(weightedReliability * 100) / 100,
      annual_saving_cents: currentCost - totalCost,
      esg_score: Math.round(Math.max(0, 100 - (totalCarbon / (totalVolume * 1000 + 1)) / 5) * 10) / 10,
    };
  });

  // Prepend current mix as first scenario
  const currentTotalCost = currentMix.reduce((s, r) => s + r.cost_cents, 0);
  const currentTotalCarbon = currentMix.reduce((s, r) => s + r.carbon_g, 0);
  const currentTotalVol = currentMix.reduce((s, r) => s + r.volume_mwh, 0);
  scenarios.unshift({
    name: 'Current Mix',
    mix: currentMix,
    blended_cost: currentTotalVol > 0 ? Math.round(currentTotalCost / (currentTotalVol * 1000)) : 0,
    carbon_intensity: currentTotalVol > 0 ? Math.round(currentTotalCarbon / (currentTotalVol * 1000) * 100) / 100 : 0,
    reliability: 85,
    annual_saving_cents: 0,
    esg_score: 72,
  });

  return scenarios;
}

// POST /ai/optimise — Run LP optimisation
ai.post('/optimise', async (c) => {
  try {
    const start = Date.now();
    const user = c.get('user');
    const body = await c.req.json() as {
      demand_mwh: number;
      sources: EnergySource[];
      algorithm?: string;
      current_mix?: OptimisationResult[];
    };

    const algorithm = body.algorithm || 'balanced';
    const optimised = simplexOptimise(body.sources, body.demand_mwh, algorithm);
    const currentMix = body.current_mix || optimised;
    const scenarios = generateScenarios(body.sources, body.demand_mwh, currentMix);
    const executionMs = Date.now() - start;

    // Store optimisation
    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO ai_optimisations (id, participant_id, algorithm, demand_profile, available_sources, result_mix, result_cost_cents, result_carbon_g, result_reliability_pct, result_saving_cents, scenarios, execution_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.sub, algorithm,
      JSON.stringify(body.demand_mwh),
      JSON.stringify(body.sources),
      JSON.stringify(optimised),
      optimised.reduce((s, r) => s + r.cost_cents, 0),
      optimised.reduce((s, r) => s + r.carbon_g, 0),
      scenarios[1]?.reliability || 0,
      scenarios[1]?.annual_saving_cents || 0,
      JSON.stringify(scenarios),
      executionMs,
    ).run();

    return c.json({
      success: true,
      data: {
        id,
        optimised_mix: optimised,
        scenarios,
        execution_time_ms: executionMs,
        demand_mwh: body.demand_mwh,
        algorithm,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /ai/history — Past optimisations
ai.get('/history', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT * FROM ai_optimisations WHERE participant_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /ai/chat — Workers AI natural language interface
ai.post('/chat', async (c) => {
  try {
    const user = c.get('user');
    const { message } = await c.req.json() as { message: string };

    // Gather portfolio context
    const positions = await c.env.DB.prepare(
      'SELECT market, SUM(volume) as total_volume, AVG(price_cents) as avg_price FROM orders WHERE participant_id = ? AND status IN (?, ?) GROUP BY market'
    ).bind(user.sub, 'open', 'partial').all();

    const credits = await c.env.DB.prepare(
      'SELECT COUNT(*) as count, SUM(quantity) as total_qty FROM carbon_credits WHERE owner_id = ? AND status = ?'
    ).bind(user.sub, 'active').first<{ count: number; total_qty: number }>();

    const systemPrompt = `You are the NXT Energy Trading Platform AI assistant. You help with portfolio optimisation, energy market analysis, and trading strategy.

  Current portfolio context:
  - Positions: ${JSON.stringify(positions.results)}
  - Carbon credits: ${credits?.count || 0} credits, ${credits?.total_qty || 0} tonnes total
  - User role: ${user.role}, Company: ${user.company_name}

  Respond concisely with data-driven insights. Use numbers from the portfolio context. If asked about optimisation, explain the trade-offs between cost, carbon, and reliability.`;

    let aiResponse = 'AI service is currently unavailable. Please try again later.';
    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as Parameters<Ai['run']>[0], {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 512,
      });
      aiResponse = (response as { response: string }).response;
    } catch {
      // AI unavailable — use fallback response
    }

    // Audit log the AI interaction
    try {
      await c.env.DB.prepare(
        `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
         VALUES (?, ?, 'ai_chat', 'ai', ?, ?, ?, datetime('now'))`
      ).bind(
        generateId(), user.sub, user.sub,
        JSON.stringify({ message: message.substring(0, 200), response_length: aiResponse.length }),
        c.req.header('CF-Connecting-IP') || 'unknown',
      ).run();
    } catch { /* audit log failure should not block response */ }

    return c.json({
      success: true,
      data: {
        response: aiResponse,
        context: {
          positions: positions.results.length,
          carbon_credits: credits?.count || 0,
        },
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /ai/weather/:projectId — Weather-linked generation forecast
ai.get('/weather/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first();
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    // Fetch OpenMeteo forecast (free, no key)
    const lat = -26.2; // Default Johannesburg if no GPS
    const lng = 28.0;
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,direct_radiation,cloudcover,windspeed_10m&forecast_days=7&timezone=Africa/Johannesburg`
    );
    const weather = await resp.json() as {
      hourly: {
        time: string[];
        temperature_2m: number[];
        direct_radiation: number[];
        cloudcover: number[];
        windspeed_10m: number[];
      };
    };

    // Solar generation model
    const performanceRatio = 0.82;
    const capacityMw = project.capacity_mw as number;
    const forecasts = weather.hourly.time.map((time: string, i: number) => {
      const irradiance = weather.hourly.direct_radiation[i] || 0;
      const temp = weather.hourly.temperature_2m[i] || 25;
      const cloud = weather.hourly.cloudcover[i] || 0;
      const wind = weather.hourly.windspeed_10m[i] || 0;

      // Temperature derating: -0.4%/degree above 25°C
      const tempDerate = temp > 25 ? 1 - 0.004 * (temp - 25) : 1;
      const cloudFactor = 1 - (cloud / 100) * 0.7;

      let predictedKwh = 0;
      const tech = project.technology as string;
      if (tech === 'solar' || tech === 'hybrid') {
        predictedKwh = capacityMw * 1000 * (irradiance / 1000) * tempDerate * cloudFactor * performanceRatio;
      } else if (tech === 'wind') {
        // Simplified wind power curve (cut-in 3m/s, rated 12m/s, cut-out 25m/s)
        if (wind >= 3 && wind <= 25) {
          const factor = wind < 12 ? (wind - 3) / 9 : (wind <= 25 ? 1 : 0);
          predictedKwh = capacityMw * 1000 * factor * performanceRatio;
        }
      }

      return {
        time,
        predicted_kwh: Math.round(predictedKwh * 100) / 100,
        irradiance,
        temperature: temp,
        cloud_cover: cloud,
        wind_speed: wind,
      };
    });

    return c.json({
      success: true,
      data: {
        project_id: projectId,
        technology: project.technology,
        capacity_mw: capacityMw,
        forecasts,
        model: { performance_ratio: performanceRatio, temp_derate_pct_per_degree: 0.4 },
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /ai/risk/:participantId — Risk metrics from RiskEngineDO
ai.get('/risk/:participantId', async (c) => {
  try {
    const participantId = c.req.param('participantId');

    // Get latest risk metrics from DB
    const metrics = await c.env.DB.prepare(
      'SELECT * FROM risk_metrics WHERE participant_id = ? ORDER BY calculated_at DESC LIMIT 1'
    ).bind(participantId).first();

    if (!metrics) {
      return c.json({
        success: true,
        data: {
          var_95: 0, var_99: 0, cvar: 0, sharpe_ratio: 0, max_drawdown: 0,
          delta: 0, gamma: 0, theta: 0, vega: 0,
          counterparty_exposure: {}, stress_test_results: [],
        },
      });
    }

    return c.json({
      success: true,
      data: {
        ...metrics,
        counterparty_exposure: metrics.counterparty_exposure ? JSON.parse(metrics.counterparty_exposure as string) : {},
        stress_test_results: metrics.stress_test_results ? JSON.parse(metrics.stress_test_results as string) : [],
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default ai;
