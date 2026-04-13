import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { captureException } from '../utils/sentry';

const intelligence = new Hono<HonoEnv>();
intelligence.use('*', authMiddleware());

// GET /intelligence — Get intelligence items for participant
intelligence.get('/', async (c) => {
  try {
    const user = c.get('user');
    const acknowledged = c.req.query('acknowledged');
    const category = c.req.query('category');
    let sql = 'SELECT * FROM intelligence_items WHERE participant_id = ?';
    const params: unknown[] = [user.sub];
    if (acknowledged === '0' || acknowledged === '1') {
      sql += ' AND acknowledged = ?';
      params.push(Number(acknowledged));
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY CASE severity WHEN \'critical\' THEN 0 WHEN \'warning\' THEN 1 WHEN \'positive\' THEN 2 ELSE 3 END, created_at DESC LIMIT 50';
    const results = await c.env.DB.prepare(sql).bind(...params).all();
    return c.json({ success: true, data: results.results || [] });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// GET /intelligence/summary — Counts by category
intelligence.get('/summary', async (c) => {
  try {
    const user = c.get('user');
    const counts = await c.env.DB.prepare(
      'SELECT category, COUNT(*) as count FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0 GROUP BY category'
    ).bind(user.sub).all();
    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0'
    ).bind(user.sub).first<{ count: number }>();
    return c.json({ success: true, data: { counts: counts.results || [], total_unacknowledged: total?.count || 0 } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { counts: [], total_unacknowledged: 0 } });
  }
});

// POST /intelligence/:id/acknowledge — Acknowledge an item
intelligence.post('/:id/acknowledge', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    await c.env.DB.prepare('UPDATE intelligence_items SET acknowledged = 1 WHERE id = ? AND participant_id = ?').bind(id, user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to acknowledge' }, 500);
  }
});

// POST /intelligence/acknowledge-all — Acknowledge all
intelligence.post('/acknowledge-all', async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare('UPDATE intelligence_items SET acknowledged = 1 WHERE participant_id = ? AND acknowledged = 0').bind(user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to acknowledge all' }, 500);
  }
});

// POST /intelligence/generate — Run intelligence rules for this participant (manual trigger)
intelligence.post('/generate', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const generated: string[] = [];

    // Clear existing unacknowledged auto-generated items to prevent duplicates (preserve manually-created items)
    await c.env.DB.prepare(
      "DELETE FROM intelligence_items WHERE participant_id = ? AND acknowledged = 0 AND auto_generated = 1"
    ).bind(pid).run();

    // Rule: CP deadline approaching (within 7 days, still outstanding)
    try {
      const soon = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);
      const today = new Date().toISOString().substring(0, 10);
      const cps = await c.env.DB.prepare(
        "SELECT cp.id, cp.description, cp.target_date FROM conditions_precedent cp LEFT JOIN contract_documents cd ON cp.contract_id = cd.id WHERE cp.target_date BETWEEN ? AND ? AND cp.status = 'outstanding' AND (cd.creator_id = ? OR cd.counterparty_id = ?)"
      ).bind(today, soon, pid, pid).all();
      for (const cp of (cps.results || [])) {
        const r = cp as Record<string, unknown>;
        const daysLeft = Math.ceil((new Date(String(r.target_date)).getTime() - Date.now()) / 86400000);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'action', 'warning', ?, ?, ?, ?, 'contracts')"
        ).bind(id, pid, `CP deadline in ${daysLeft} days`, `${r.description} is due on ${r.target_date}`, 'Upload required document', `/contracts`, 'contracts').run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Invoice overdue > 7 days
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().substring(0, 10);
      const invoices = await c.env.DB.prepare(
        "SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE due_date < ? AND status = 'outstanding' AND (payer_id = ? OR payee_id = ?)"
      ).bind(weekAgo, pid, pid).all();
      for (const inv of (invoices.results || [])) {
        const r = inv as Record<string, unknown>;
        const daysOverdue = Math.floor((Date.now() - new Date(String(r.due_date)).getTime()) / 86400000);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'action', 'critical', ?, ?, ?, ?, 'settlement')"
        ).bind(id, pid, `Invoice ${r.invoice_number || ''} overdue`, `R${((Number(r.total_cents) || 0) / 100).toFixed(0)} is ${daysOverdue} days overdue`, 'Process payment', `/invoices`, 'settlement').run();
        generated.push(id);
      }
    } catch { /* */ }

    // Rule: Licence expiry within 60 days
    try {
      const sixtyDays = new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10);
      const today = new Date().toISOString().substring(0, 10);
      const licences = await c.env.DB.prepare(
        "SELECT id, licence_type, expiry_date FROM licences WHERE expiry_date BETWEEN ? AND ? AND participant_id = ?"
      ).bind(today, sixtyDays, pid).all();
      for (const lic of (licences.results || [])) {
        const r = lic as Record<string, unknown>;
        const daysLeft = Math.ceil((new Date(String(r.expiry_date)).getTime() - Date.now()) / 86400000);
        const id = generateId();
        await c.env.DB.prepare(
          "INSERT INTO intelligence_items (id, participant_id, category, severity, title, description, recommended_action, action_url, source_module) VALUES (?, ?, 'action', 'warning', ?, ?, ?, ?, 'compliance')"
        ).bind(id, pid, `Licence expires in ${daysLeft} days`, `Your ${r.licence_type} licence expires on ${r.expiry_date}`, 'Initiate renewal', `/compliance`, 'compliance').run();
        generated.push(id);
      }
    } catch { /* */ }

    return c.json({ success: true, data: { generated: generated.length, ids: generated } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to generate intelligence' }, 500);
  }
});

export default intelligence;
