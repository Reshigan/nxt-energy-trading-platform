import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';

const app = new Hono<HonoEnv>();
app.use('*', authMiddleware());

// Spec 13 Shift 6: Smart Auto-Scheduling — auto-nominate based on PPA terms

// POST /auto-scheduling/nominate — Auto-generate nominations based on PPA contract terms
app.post('/nominate', async (c) => {
  try {
    const { period, contract_id } = await c.req.json();
    const db = c.env.DB;
    const user = c.get('user');
    const participantId = user.sub;

    // Get active contracts with scheduling terms
    let contracts;
    if (contract_id) {
      contracts = await db.prepare(
        `SELECT cd.*, p.name as project_name FROM contract_documents cd
         LEFT JOIN projects p ON cd.project_id = p.id
         WHERE cd.id = ? AND cd.phase = 'active' AND (cd.creator_id = ? OR cd.counterparty_id = ?)`
      ).bind(contract_id, participantId, participantId).all();
    } else {
      contracts = await db.prepare(
        `SELECT cd.*, p.name as project_name FROM contract_documents cd
         LEFT JOIN projects p ON cd.project_id = p.id
         WHERE (cd.creator_id = ? OR cd.counterparty_id = ?) AND cd.phase = 'active'`
      ).bind(participantId, participantId).all();
    }

    const nominations: Array<Record<string, unknown>> = [];
    const today = new Date();
    const targetPeriod = period || today.toISOString().substring(0, 7);

    for (const contract of (contracts.results || [])) {
      const volumeMwh = Number(contract.volume_mwh) || 0;
      const daysInMonth = new Date(Number(targetPeriod.substring(0, 4)), Number(targetPeriod.substring(5, 7)), 0).getDate();

      // Calculate daily nomination based on contracted volume / days
      const dailyMwh = volumeMwh > 0 ? volumeMwh / 365 : 0;

      // Generate hourly profile based on technology
      const technology = String(contract.technology || 'solar').toLowerCase();
      const hourlyProfile = generateHourlyProfile(technology, dailyMwh);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${targetPeriod}-${String(day).padStart(2, '0')}`;
        nominations.push({
          contract_id: contract.id,
          project_name: contract.project_name || contract.title,
          date,
          technology,
          total_mwh: dailyMwh,
          hourly_profile: hourlyProfile,
          status: 'draft',
          auto_generated: true,
        });
      }
    }

    return c.json({
      success: true,
      data: {
        period: targetPeriod,
        total_nominations: nominations.length,
        total_volume_mwh: nominations.reduce((s, n) => s + Number(n.total_mwh), 0),
        nominations: nominations.slice(0, 31), // Return first month
        contracts_processed: (contracts.results || []).length,
      },
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /auto-scheduling/rules — Get auto-scheduling rules for a contract
app.get('/rules', async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    const participantId = user.sub;

    const contracts = await db.prepare(
      `SELECT id, title, technology, volume_mwh, tariff_cents_kwh, escalation_pct, contract_term_years
       FROM contract_documents
       WHERE (creator_id = ? OR counterparty_id = ?) AND phase = 'active'`
    ).bind(participantId, participantId).all();

    const rules = (contracts.results || []).map((contract) => ({
      contract_id: contract.id,
      contract_title: contract.title,
      technology: contract.technology,
      scheduling_rules: {
        volume_mwh_annual: Number(contract.volume_mwh) || 0,
        volume_mwh_daily: (Number(contract.volume_mwh) || 0) / 365,
        profile_type: getProfileType(String(contract.technology || 'solar')),
        min_nomination_pct: 80,
        max_nomination_pct: 110,
        ramp_rate_mw_per_min: contract.technology === 'wind' ? 5 : 10,
        curtailment_allowed: true,
        balancing_mechanism: 'day_ahead',
      },
    }));

    return c.json({ success: true, data: rules });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /auto-scheduling/submit — Submit auto-generated nominations
app.post('/submit', async (c) => {
  try {
    const { nominations } = await c.req.json();
    if (!Array.isArray(nominations) || nominations.length === 0) {
      return c.json({ success: false, error: 'nominations array required' }, 400);
    }

    // In production this would submit to the scheduling system
    return c.json({
      success: true,
      data: {
        submitted: nominations.length,
        status: 'submitted',
        confirmation_id: crypto.randomUUID(),
        submitted_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// Helper: generate hourly profile based on technology
function generateHourlyProfile(technology: string, dailyMwh: number): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  if (technology === 'solar') {
    // Solar profile: 06:00-18:00, peak at noon
    const solarProfile = [0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.6, 0.8, 0.95, 1.0, 1.0, 0.95, 0.8, 0.6, 0.3, 0.1, 0, 0, 0, 0, 0, 0];
    const totalFactor = solarProfile.reduce((s, v) => s + v, 0);
    for (let h = 0; h < 24; h++) {
      hours[h] = Math.round((solarProfile[h] / totalFactor) * dailyMwh * 1000) / 1000;
    }
  } else if (technology === 'wind') {
    // Wind profile: more evenly distributed with slight overnight bias
    const windProfile = [0.8, 0.85, 0.9, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.85, 0.8];
    const totalFactor = windProfile.reduce((s, v) => s + v, 0);
    for (let h = 0; h < 24; h++) {
      hours[h] = Math.round((windProfile[h] / totalFactor) * dailyMwh * 1000) / 1000;
    }
  } else {
    // Baseload: flat profile
    for (let h = 0; h < 24; h++) {
      hours[h] = Math.round((dailyMwh / 24) * 1000) / 1000;
    }
  }
  return hours;
}

function getProfileType(technology: string): string {
  switch (technology.toLowerCase()) {
    case 'solar': return 'solar_irradiance';
    case 'wind': return 'wind_speed';
    case 'hybrid': return 'hybrid_solar_wind';
    case 'biomass': return 'baseload';
    default: return 'baseload';
  }
}

export default app;
