/**
 * NOTIFICATIONS WebSocket / Polling endpoint
 * Provides real-time notification delivery for cockpit updates.
 * 
 * GET /notifications/poll — Long-poll for new notifications + action queue items
 * GET /notifications/stream — SSE stream for real-time updates
 * GET /notifications/action-queue — Get pending action queue items for cockpit
 * POST /notifications/action-queue/:id/complete — Mark action queue item as completed
 * POST /notifications/action-queue/:id/dismiss — Dismiss action queue item
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';

const notificationsWs = new Hono<HonoEnv>();
notificationsWs.use('*', authMiddleware());

// ─── POLL for new notifications + action queue + KPI updates ─────────────────
notificationsWs.get('/poll', async (c) => {
  const user = c.get('user');
  const since = c.req.query('since') || new Date(Date.now() - 30000).toISOString();

  const [notifications, actionQueue, kpis] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM notifications WHERE participant_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 20'
    ).bind(user.sub, since).all(),
    c.env.DB.prepare(
      "SELECT * FROM action_queue WHERE participant_id = ? AND status = 'pending' ORDER BY priority DESC, created_at ASC"
    ).bind(user.sub).all(),
    getKpiSnapshot(c.env.DB, user.sub, user.role),
  ]);

  return c.json({
    success: true,
    data: {
      notifications: notifications.results,
      action_queue: actionQueue.results,
      kpis,
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── SSE stream for real-time updates ────────────────────────────────────────
notificationsWs.get('/stream', async (c) => {
  const user = c.get('user');

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial data
  const initial = await getKpiSnapshot(c.env.DB, user.sub, user.role);
  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'kpi_update', data: initial })}\n\n`));

  // Send action queue
  const aq = await c.env.DB.prepare(
    "SELECT * FROM action_queue WHERE participant_id = ? AND status = 'pending' ORDER BY priority DESC, created_at ASC"
  ).bind(user.sub).all();
  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'action_queue_update', data: aq.results })}\n\n`));

  // Keep-alive for 25 seconds then close (Cloudflare Workers have 30s limit)
  const keepAlive = setInterval(async () => {
    try {
      const fresh = await c.env.DB.prepare(
        'SELECT * FROM notifications WHERE participant_id = ? AND read = 0 ORDER BY created_at DESC LIMIT 5'
      ).bind(user.sub).all();
      const freshAq = await c.env.DB.prepare(
        "SELECT * FROM action_queue WHERE participant_id = ? AND status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 10"
      ).bind(user.sub).all();
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'entity_update', data: { notifications: fresh.results, action_queue: freshAq.results } })}\n\n`));
    } catch {
      clearInterval(keepAlive);
    }
  }, 5000);

  // Close after 25 seconds
  setTimeout(async () => {
    clearInterval(keepAlive);
    try { await writer.close(); } catch { /* already closed */ }
  }, 25000);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// ─── Action Queue endpoints ──────────────────────────────────────────────────

notificationsWs.get('/action-queue', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status') || 'pending';

  const items = await c.env.DB.prepare(
    'SELECT * FROM action_queue WHERE participant_id = ? AND status = ? ORDER BY priority DESC, created_at ASC'
  ).bind(user.sub, status).all();

  return c.json({ success: true, data: items.results });
});

notificationsWs.post('/action-queue/:id/complete', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  await c.env.DB.prepare(
    "UPDATE action_queue SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND participant_id = ?"
  ).bind(id, user.sub).run();

  return c.json({ success: true });
});

notificationsWs.post('/action-queue/:id/dismiss', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  await c.env.DB.prepare(
    "UPDATE action_queue SET status = 'dismissed', updated_at = datetime('now') WHERE id = ? AND participant_id = ?"
  ).bind(id, user.sub).run();

  return c.json({ success: true });
});

// ─── KPI Snapshot helper ─────────────────────────────────────────────────────
async function getKpiSnapshot(db: D1Database, participantId: string, role: string) {
  const kpis: Record<string, unknown> = {};

  if (role === 'admin') {
    const [trades, contracts, participants, revenue] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM trades').first(),
      db.prepare("SELECT COUNT(*) as count FROM contract_documents WHERE phase = 'active'").first(),
      db.prepare('SELECT COUNT(*) as count FROM participants').first(),
      db.prepare("SELECT SUM(amount_cents) as total FROM fees WHERE status = 'paid'").first(),
    ]);
    kpis.total_trades = Number(trades?.count) || 0;
    kpis.active_contracts = Number(contracts?.count) || 0;
    kpis.total_participants = Number(participants?.count) || 0;
    kpis.total_revenue_cents = Number(revenue?.total) || 0;
  } else if (role === 'trader' || role === 'offtaker') {
    const [buys, sells, pending] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count, SUM(total_cents) as total FROM trades WHERE buyer_id = ? AND status != 'cancelled'").bind(participantId).first(),
      db.prepare("SELECT COUNT(*) as count, SUM(total_cents) as total FROM trades WHERE seller_id = ? AND status != 'cancelled'").bind(participantId).first(),
      db.prepare("SELECT COUNT(*) as count FROM invoices WHERE to_participant_id = ? AND status = 'outstanding'").bind(participantId).first(),
    ]);
    kpis.buy_trades = Number(buys?.count) || 0;
    kpis.sell_trades = Number(sells?.count) || 0;
    kpis.buy_volume_cents = Number(buys?.total) || 0;
    kpis.sell_volume_cents = Number(sells?.total) || 0;
    kpis.pending_invoices = Number(pending?.count) || 0;
  } else if (role === 'ipp' || role === 'ipp_developer' || role === 'generator') {
    const [projects, generation, recs] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM projects WHERE participant_id = ?').bind(participantId).first(),
      db.prepare('SELECT SUM(value_kwh) as total FROM meter_readings WHERE project_id IN (SELECT id FROM projects WHERE participant_id = ?)').bind(participantId).first(),
      db.prepare('SELECT COUNT(*) as count FROM recs WHERE project_id IN (SELECT id FROM projects WHERE participant_id = ?)').bind(participantId).first(),
    ]);
    kpis.total_projects = Number(projects?.count) || 0;
    kpis.total_generation_kwh = Number(generation?.total) || 0;
    kpis.recs_issued = Number(recs?.count) || 0;
  } else if (role === 'lender') {
    const [disbursements, pending] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count, SUM(amount_cents) as total FROM disbursements WHERE status = 'approved'").first(),
      db.prepare("SELECT COUNT(*) as count FROM disbursements WHERE status IN ('pending', 'ready')").first(),
    ]);
    kpis.approved_disbursements = Number(disbursements?.count) || 0;
    kpis.total_disbursed_cents = Number(disbursements?.total) || 0;
    kpis.pending_disbursements = Number(pending?.count) || 0;
  } else if (role === 'carbon_fund') {
    const [credits, retired] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count, SUM(amount_tonnes) as total FROM carbon_credits WHERE owner_id = ? AND status = 'active'").bind(participantId).first(),
      db.prepare("SELECT COUNT(*) as count, SUM(amount_tonnes) as total FROM carbon_credits WHERE owner_id = ? AND status = 'retired'").bind(participantId).first(),
    ]);
    kpis.active_credits = Number(credits?.count) || 0;
    kpis.active_tonnes = Number(credits?.total) || 0;
    kpis.retired_credits = Number(retired?.count) || 0;
    kpis.retired_tonnes = Number(retired?.total) || 0;
  }

  return kpis;
}

export default notificationsWs;
