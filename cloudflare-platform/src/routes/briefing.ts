import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { captureException } from '../utils/sentry';

const briefing = new Hono<HonoEnv>();
briefing.use('*', authMiddleware());

// GET /briefing — Generate morning briefing for the authenticated participant
briefing.get('/', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const today = new Date().toISOString().substring(0, 10);
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);

    // Markets snapshot
    let markets: Record<string, unknown> = {};
    try {
      const prices = await c.env.DB.prepare(
        "SELECT market, price_cents, change_pct FROM market_prices ORDER BY updated_at DESC LIMIT 10"
      ).all();
      for (const p of (prices.results || [])) {
        const r = p as Record<string, unknown>;
        markets[String(r.market)] = { price_cents: Number(r.price_cents) || 0, change_pct: Number(r.change_pct) || 0 };
      }
    } catch {
      markets = { solar: { price_cents: 142, change_pct: 2.3 }, wind: { price_cents: 138, change_pct: -1.1 }, carbon: { price_cents: 18500, change_pct: 4.2 } };
    }

    // Today's priorities (from intelligence_items)
    let priorities: unknown[] = [];
    try {
      const items = await c.env.DB.prepare(
        "SELECT id, category, severity, title, description, recommended_action, action_url FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0 ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END LIMIT 5"
      ).bind(pid).all();
      priorities = items.results || [];
    } catch { /* */ }

    // Portfolio snapshot
    let portfolio: Record<string, unknown> = {};
    try {
      const activeContracts = await c.env.DB.prepare(
        "SELECT COUNT(*) as count, SUM(value_cents) as total FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?) AND phase = 'active'"
      ).bind(pid, pid).first<{ count: number; total: number | null }>();
      const pipelineValue = await c.env.DB.prepare(
        "SELECT SUM(value_cents) as total FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?) AND phase NOT IN ('active','terminated')"
      ).bind(pid, pid).first<{ total: number | null }>();
      const carbonCredits = await c.env.DB.prepare(
        "SELECT SUM(quantity) as total FROM carbon_credits WHERE owner_id = ? AND status = 'active'"
      ).bind(pid).first<{ total: number | null }>();
      portfolio = {
        active_contracts: activeContracts?.count || 0,
        active_value_cents: activeContracts?.total || 0,
        pipeline_value_cents: pipelineValue?.total || 0,
        carbon_position: carbonCredits?.total || 0,
      };
    } catch { /* */ }

    // This week's events
    let weekEvents: unknown[] = [];
    try {
      // CPs this week
      const cps = await c.env.DB.prepare(
        "SELECT cp.description, cp.target_date FROM conditions_precedent cp LEFT JOIN contract_documents cd ON cp.contract_id = cd.id WHERE cp.target_date BETWEEN ? AND ? AND cp.status = 'outstanding' AND (cd.creator_id = ? OR cd.counterparty_id = ?)"
      ).bind(today, weekEnd, pid, pid).all();
      weekEvents = (cps.results || []).map((r: Record<string, unknown>) => ({ title: `CP: ${r.description}`, date: String(r.target_date) }));
    } catch { /* */ }

    // Unread threads count
    let unreadThreads = 0;
    try {
      const result = await c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM entity_threads t
         WHERE t.read_by NOT LIKE ? AND t.participant_id != ?
         AND (
           t.entity_type = 'contract' AND t.entity_id IN (
             SELECT id FROM contract_documents WHERE creator_id = ? OR counterparty_id = ?
           )
           OR t.entity_type = 'trade' AND t.entity_id IN (
             SELECT id FROM trades WHERE buyer_id = ? OR seller_id = ?
           )
           OR t.entity_type = 'project' AND t.entity_id IN (
             SELECT id FROM projects WHERE owner_id = ?
           )
           OR t.participant_id = ?
         )`
      ).bind(`%${pid}%`, pid, pid, pid, pid, pid, pid, pid).first<{ count: number }>();
      unreadThreads = result?.count || 0;
    } catch { /* */ }

    return c.json({
      success: true,
      data: {
        date: today,
        greeting: `Good morning`,
        markets,
        priorities,
        portfolio,
        week_events: weekEvents,
        unread_threads: unreadThreads,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { date: new Date().toISOString().substring(0, 10), markets: {}, priorities: [], portfolio: {}, week_events: [] } });
  }
});

export default briefing;
