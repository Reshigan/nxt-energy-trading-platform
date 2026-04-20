/**
 * 1.1 TOU Pricing Engine — Time-of-Use tariff management for SA energy market
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const tou = new Hono<HonoEnv>();
tou.use('*', authMiddleware());

// Determine TOU period for a given hour
function getTouPeriod(hour: number, peakHours: string[], standardHours: string[], _offpeakHours: string[]): 'peak' | 'standard' | 'offpeak' {
  const hStr = `${String(hour).padStart(2, '0')}:00`;
  for (const range of peakHours) {
    const [start, end] = range.split('-');
    if (isInRange(hStr, start, end)) return 'peak';
  }
  for (const range of standardHours) {
    const [start, end] = range.split('-');
    if (isInRange(hStr, start, end)) return 'standard';
  }
  return 'offpeak';
}

function isInRange(time: string, start: string, end: string): boolean {
  if (start <= end) return time >= start && time < end;
  return time >= start || time < end; // overnight range
}

// GET /tou/profiles — List active TOU profiles
tou.get('/profiles', async (c) => {
  try {
    const results = await c.env.DB.prepare('SELECT * FROM tou_profiles ORDER BY effective_date DESC').all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch TOU profiles'), 500);
  }
});

// POST /tou/profiles — Admin creates TOU profile
tou.post('/profiles', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const body = await c.req.json<{
      name: string; provider?: string; effective_date: string;
      peak_hours: string[]; standard_hours: string[]; offpeak_hours: string[];
      peak_rate_cents: number; standard_rate_cents: number; offpeak_rate_cents: number;
      season?: string; demand_charge_cents_kva?: number;
    }>();
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO tou_profiles (id, name, provider, effective_date, peak_hours, standard_hours, offpeak_hours, peak_rate_cents, standard_rate_cents, offpeak_rate_cents, season, demand_charge_cents_kva)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, body.name, body.provider || 'eskom', body.effective_date,
      JSON.stringify(body.peak_hours), JSON.stringify(body.standard_hours), JSON.stringify(body.offpeak_hours),
      body.peak_rate_cents, body.standard_rate_cents, body.offpeak_rate_cents,
      body.season || 'summer', body.demand_charge_cents_kva || 0
    ).run();
    return c.json({ success: true, data: { id } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create TOU profile'), 500);
  }
});

// GET /tou/current-period — What TOU period is it RIGHT NOW
tou.get('/current-period', async (c) => {
  try {
    const now = new Date();
    // SA is UTC+2
    const saHour = (now.getUTCHours() + 2) % 24;
    const month = now.getMonth() + 1;
    const season = (month >= 6 && month <= 8) ? 'winter' : 'summer';

    const profile = await c.env.DB.prepare(
      "SELECT * FROM tou_profiles WHERE provider = 'eskom' AND season = ? ORDER BY effective_date DESC LIMIT 1"
    ).bind(season).first();

    if (!profile) {
      return c.json({ success: true, data: { period: saHour >= 6 && saHour < 22 ? 'standard' : 'offpeak', hour: saHour, season, profile: null } });
    }

    const peakHours = JSON.parse(profile.peak_hours as string) as string[];
    const standardHours = JSON.parse(profile.standard_hours as string) as string[];
    const offpeakHours = JSON.parse(profile.offpeak_hours as string) as string[];
    const period = getTouPeriod(saHour, peakHours, standardHours, offpeakHours);

    const rateMap = { peak: profile.peak_rate_cents, standard: profile.standard_rate_cents, offpeak: profile.offpeak_rate_cents };
    return c.json({
      success: true,
      data: {
        period, hour: saHour, season,
        rate_cents: rateMap[period],
        profile_name: profile.name,
        peak_rate_cents: profile.peak_rate_cents,
        standard_rate_cents: profile.standard_rate_cents,
        offpeak_rate_cents: profile.offpeak_rate_cents,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to determine current TOU period'), 500);
  }
});

// POST /tou/split-trade/:tradeId — Split trade volume into TOU periods
tou.post('/split-trade/:tradeId', async (c) => {
  try {
    const tradeId = c.req.param('tradeId');
    const trade = await c.env.DB.prepare('SELECT * FROM trades WHERE id = ?').bind(tradeId).first();
    if (!trade) return c.json({ success: false, error: 'Trade not found' }, 404);

    const month = new Date().getMonth() + 1;
    const season = (month >= 6 && month <= 8) ? 'winter' : 'summer';
    const profile = await c.env.DB.prepare(
      "SELECT * FROM tou_profiles WHERE provider = 'eskom' AND season = ? ORDER BY effective_date DESC LIMIT 1"
    ).bind(season).first();

    if (!profile) return c.json({ success: false, error: 'No TOU profile found' }, 404);

    const peakHours = JSON.parse(profile.peak_hours as string) as string[];
    const standardHours = JSON.parse(profile.standard_hours as string) as string[];
    const offpeakHours = JSON.parse(profile.offpeak_hours as string) as string[];

    // Count hours in each period for a 24h day
    const periodCounts = { peak: 0, standard: 0, offpeak: 0 };
    for (let h = 0; h < 24; h++) {
      const p = getTouPeriod(h, peakHours, standardHours, offpeakHours);
      periodCounts[p]++;
    }
    const totalHours = 24;
    const totalVolume = (trade.volume as number) || 0;

    const periods: Array<{ id: string; period: string; volume_kwh: number; rate_cents: number; value_cents: number }> = [];
    for (const [period, hours] of Object.entries(periodCounts)) {
      if (hours === 0) continue;
      const volumeKwh = totalVolume * (hours / totalHours) * 1000; // MWh → kWh
      const rateCents = period === 'peak' ? profile.peak_rate_cents as number : period === 'standard' ? profile.standard_rate_cents as number : profile.offpeak_rate_cents as number;
      const valueCents = Math.round(volumeKwh * rateCents / 100);
      const id = generateId();
      await c.env.DB.prepare(
        'INSERT INTO tou_trade_periods (id, trade_id, period, volume_kwh, rate_cents, value_cents) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, tradeId, period, volumeKwh, rateCents, valueCents).run();
      periods.push({ id, period, volume_kwh: volumeKwh, rate_cents: rateCents, value_cents: valueCents });
    }

    return c.json({ success: true, data: { trade_id: tradeId, periods, profile: profile.name } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to split trade by TOU'), 500);
  }
});

// GET /tou/cost-comparison — Compare TOU cost: PPA vs grid
tou.get('/cost-comparison', async (c) => {
  try {
    const annualMwh = parseFloat(c.req.query('annual_mwh') || '1000');
    const ppaTariffCents = parseFloat(c.req.query('ppa_tariff_cents') || '140');

    const month = new Date().getMonth() + 1;
    const season = (month >= 6 && month <= 8) ? 'winter' : 'summer';
    const profile = await c.env.DB.prepare(
      "SELECT * FROM tou_profiles WHERE provider = 'eskom' AND season = ? ORDER BY effective_date DESC LIMIT 1"
    ).bind(season).first();

    if (!profile) return c.json({ success: false, error: 'No TOU profile found' }, 404);

    const peakHours = JSON.parse(profile.peak_hours as string) as string[];
    const standardHours = JSON.parse(profile.standard_hours as string) as string[];
    const offpeakHours = JSON.parse(profile.offpeak_hours as string) as string[];

    const periodCounts = { peak: 0, standard: 0, offpeak: 0 };
    for (let h = 0; h < 24; h++) periodCounts[getTouPeriod(h, peakHours, standardHours, offpeakHours)]++;

    const annualKwh = annualMwh * 1000;
    let gridCostCents = 0;
    for (const [period, hours] of Object.entries(periodCounts)) {
      const volumeKwh = annualKwh * (hours / 24);
      const rate = period === 'peak' ? profile.peak_rate_cents as number : period === 'standard' ? profile.standard_rate_cents as number : profile.offpeak_rate_cents as number;
      gridCostCents += volumeKwh * rate;
    }

    const ppaCostCents = annualKwh * ppaTariffCents;
    const savingCents = gridCostCents - ppaCostCents;

    return c.json({
      success: true,
      data: {
        annual_mwh: annualMwh,
        ppa_tariff_cents: ppaTariffCents,
        grid_cost_rands: Math.round(gridCostCents) / 100,
        ppa_cost_rands: Math.round(ppaCostCents) / 100,
        annual_saving_rands: Math.round(savingCents) / 100,
        saving_pct: gridCostCents > 0 ? Math.round(savingCents / gridCostCents * 10000) / 100 : 0,
        grid_profile: profile.name,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to compare TOU costs'), 500);
  }
});

export default tou;
