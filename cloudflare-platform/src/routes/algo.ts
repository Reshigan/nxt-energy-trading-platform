import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';

const algo = new Hono<HonoEnv>();

// POST /rules — Create a simple trading rule (Algo-Trading)
algo.post('/rules', authMiddleware({ roles: ['trader', 'carbon_fund', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    
    // Validation: { market: string, condition: 'below'|'above', threshold: number, action: 'buy'|'sell', volume: number }
    const { market, condition, threshold, action, volume } = body;
    if (!market || !condition || threshold === undefined || !action || !volume) {
      return c.json({ success: false, error: 'Missing rule parameters' }, 400);
    }

    const ruleId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO trading_rules (id, participant_id, market, condition, threshold, action, volume, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(ruleId, user.sub, market, condition, threshold, action, volume).run();

    return c.json({ success: true, ruleId }, 201);
  } catch (err) {
    return c.json({ success: false, error: 'Algo rule creation failed' }, 500);
  }
});

// GET /rules — List user's active rules
algo.get('/rules', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare('SELECT * FROM trading_rules WHERE participant_id = ?').bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    return c.json({ success: false, error: 'Failed to fetch rules' }, 500);
  }
});

// Internal: Process rules against current market price
export async function processTradingRules(env: any, market: string, currentPrice: number) {
  const activeRules = await env.DB.prepare(
    'SELECT * FROM trading_rules WHERE market = ? AND status = \'active\''
  ).bind(market).all();

  for (const rule of activeRules.results) {
    const trigger = rule.condition === 'below' ? currentPrice < rule.threshold : currentPrice > rule.threshold;
    if (trigger) {
      // In a real system, this would call the OrderBookDO and place the order
      // For simulation, we log the auto-trade
      console.log(`[ALGO-TRADE] Triggered rule ${rule.id} for ${rule.participant_id}: ${rule.action} ${rule.volume} MWh at ${currentPrice}`);
      
      // Mark rule as executed or update it
      await env.DB.prepare('UPDATE trading_rules SET status = \'executed\', executed_at = ? WHERE id = ?')
        .bind(nowISO(), rule.id).run();
    }
  }
}

export default algo;
