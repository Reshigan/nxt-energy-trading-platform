import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';

const reporting = new Hono<HonoEnv>();

// POST /esg-report — Generate an automated ESG report for the participant
reporting.post('/esg-report', authMiddleware({ roles: ['offtaker', 'carbon_fund', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    
    // Aggregate energy data: Sum of green energy consumed vs total
    const energyData = await c.env.DB.prepare(
      `SELECT SUM(volume) as total_volume, SUM(CASE WHEN market IN ('solar', 'wind', 'hydro') THEN volume ELSE 0 END) as green_volume 
       FROM trades WHERE buyer_id = ? AND status = 'settled'`
    ).bind(user.sub).first<{ total_volume: number; green_volume: number }>();

    // Aggregate carbon credits retired
    const carbonData = await c.env.DB.prepare(
      `SELECT SUM(amount_tonnes) as retired_tonnes FROM carbon_credits WHERE owner_id = ? AND status = 'retired'`
    ).bind(user.sub).first<{ retired_tonnes: number }>();

    const total = energyData?.total_volume || 0;
    const green = energyData?.green_volume || 0;
    const carbon = carbonData?.retired_tonnes || 0;
    const greenPercentage = total > 0 ? (green / total) * 100 : 0;

    const reportId = generateId();
    const report = {
      id: reportId,
      generated_at: nowISO(),
      metrics: {
        total_energy_mwh: total,
        green_energy_mwh: green,
        renewable_percentage: greenPercentage.toFixed(2),
        co2_offset_tonnes: carbon,
        estimated_carbon_saved: (green * 0.4).toFixed(2), // Proxy: 0.4t per MWh
      },
      verdict: greenPercentage > 50 ? 'Gold Tier' : greenPercentage > 20 ? 'Silver Tier' : 'Bronze Tier'
    };

    // Store report in vault for permanence
    await c.env.DB.prepare(
      `INSERT INTO vault_documents (id, participant_id, type, content_json, status, created_at)
       VALUES (?, ?, 'ESG_REPORT', ?, 'verified', datetime('now'))`
    ).bind(reportId, user.sub, JSON.stringify(report)).run();

    return c.json({ success: true, report });
  } catch (err) {
    return c.json({ success: false, error: 'ESG report generation failed' }, 500);
  }
});

export default reporting;
