import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';

const surveillance = new Hono<HonoEnv>();

// GET /alerts — Fetch active market surveillance alerts
surveillance.get('/alerts', authMiddleware({ roles: ['regulator', 'admin'] }), async (c) => {
  try {
    const results = await c.env.DB.prepare(
      `SELECT * FROM surveillance_alerts WHERE status = 'active' ORDER BY severity DESC, created_at DESC`
    ).all();
    
    return c.json({ success: true, data: results.results });
  } catch (err) {
    return c.json({ success: false, error: 'Failed to fetch alerts' }, 500);
  }
});

// POST /analyze-volatility — Manually trigger a market volatility scan
surveillance.post('/analyze-volatility', authMiddleware({ roles: ['regulator', 'admin'] }), async (c) => {
  try {
    const { market } = await c.req.json();
    if (!market) return c.json({ success: false, error: 'Market required' }, 400);

    // Simulation: Scan recent trades for price spikes > 20% in 1 hour
    const trades = await c.env.DB.prepare(
      `SELECT price_cents, created_at FROM trades WHERE market = ? AND created_at > datetime('now', '-1 hour')`
    ).bind(market).all();

    if (trades.results.length < 2) return c.json({ success: true, data: { alert: false, message: 'Insufficient data' } });

    const prices = trades.results.map(t => Number(t.price_cents));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spike = (maxPrice - minPrice) / minPrice;

    if (spike > 0.2) {
      const alertId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO surveillance_alerts (id, market, alert_type, severity, details, status, created_at)
        VALUES (?, ?, 'price_spike', 'high', ?, 'active', ?)
      `).bind(alertId, market, `Price spike detected: ${(spike * 100).toFixed(2)}% fluctuation in 1h`, nowISO()).run();
      
      return c.json({ success: true, alert: true, alertId, severity: 'high' });
    }

    return c.json({ success: true, alert: false, message: 'No abnormal volatility detected' });
  } catch (err) {
    return c.json({ success: false, error: 'Volatility analysis failed' }, 500);
  }
});

export default surveillance;
