import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId } from '../utils/id';
import { captureException } from '../utils/sentry';

const calendar = new Hono<HonoEnv>();
calendar.use('*', authMiddleware());

// GET /calendar — All events for date range
calendar.get('/', async (c) => {
  try {
    const user = c.get('user');
    const from = c.req.query('from') || new Date().toISOString().substring(0, 10);
    const to = c.req.query('to') || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);
    const pid = user.sub;

    const events: Array<{ id: string; title: string; date: string; type: string; entity_type?: string; entity_id?: string; severity?: string }> = [];

    // CPs with deadlines
    try {
      const cps = await c.env.DB.prepare(
        "SELECT cp.id, cp.description, cp.target_date, cd.title as contract_title FROM conditions_precedent cp LEFT JOIN contract_documents cd ON cp.contract_id = cd.id WHERE cp.target_date BETWEEN ? AND ? AND (cd.creator_id = ? OR cd.counterparty_id = ?)"
      ).bind(from, to, pid, pid).all();
      for (const cp of (cps.results || [])) {
        const r = cp as Record<string, unknown>;
        events.push({ id: String(r.id), title: `CP: ${r.description}`, date: String(r.target_date), type: 'cp', entity_type: 'cp', entity_id: String(r.id), severity: 'warning' });
      }
    } catch { /* table may not exist */ }

    // Invoices due
    try {
      const invoices = await c.env.DB.prepare(
        "SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE due_date BETWEEN ? AND ? AND (payer_id = ? OR payee_id = ?)"
      ).bind(from, to, pid, pid).all();
      for (const inv of (invoices.results || [])) {
        const r = inv as Record<string, unknown>;
        events.push({ id: String(r.id), title: `Invoice ${r.invoice_number || r.id} R${((Number(r.total_cents) || 0) / 100).toFixed(0)} due`, date: String(r.due_date), type: 'invoice', entity_type: 'invoice', entity_id: String(r.id) });
      }
    } catch { /* */ }

    // Milestones
    try {
      const milestones = await c.env.DB.prepare(
        "SELECT m.id, m.name, m.target_date, p.name as project_name FROM milestones m LEFT JOIN projects p ON m.project_id = p.id WHERE m.target_date BETWEEN ? AND ? AND p.developer_id = ?"
      ).bind(from, to, pid).all();
      for (const ms of (milestones.results || [])) {
        const r = ms as Record<string, unknown>;
        events.push({ id: String(r.id), title: `Milestone: ${r.name}`, date: String(r.target_date), type: 'milestone', entity_type: 'milestone', entity_id: String(r.id) });
      }
    } catch { /* */ }

    // Custom calendar events
    try {
      const custom = await c.env.DB.prepare(
        'SELECT * FROM calendar_events WHERE participant_id = ? AND event_date BETWEEN ? AND ?'
      ).bind(pid, from, to).all();
      for (const ev of (custom.results || [])) {
        const r = ev as Record<string, unknown>;
        events.push({ id: String(r.id), title: String(r.title), date: String(r.event_date), type: String(r.event_type || 'custom'), entity_type: r.entity_type ? String(r.entity_type) : undefined, entity_id: r.entity_id ? String(r.entity_id) : undefined });
      }
    } catch { /* */ }

    // Licence expiries
    try {
      const licences = await c.env.DB.prepare(
        "SELECT id, licence_type, expiry_date FROM licences WHERE expiry_date BETWEEN ? AND ? AND participant_id = ?"
      ).bind(from, to, pid).all();
      for (const lic of (licences.results || [])) {
        const r = lic as Record<string, unknown>;
        events.push({ id: String(r.id), title: `Licence ${r.licence_type} expires`, date: String(r.expiry_date), type: 'licence', entity_type: 'licence', entity_id: String(r.id), severity: 'warning' });
      }
    } catch { /* */ }

    events.sort((a, b) => a.date.localeCompare(b.date));
    return c.json({ success: true, data: events });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// GET /calendar/today — Today's events
calendar.get('/today', async (c) => {
  const today = new Date().toISOString().substring(0, 10);
  const url = new URL(c.req.url);
  url.searchParams.set('from', today);
  url.searchParams.set('to', today);
  const newReq = new Request(url.toString(), c.req.raw);
  const calApp = new Hono<HonoEnv>();
  calApp.route('/', calendar);
  return calApp.fetch(newReq, c.env);
});

// GET /calendar/week — This week's events
calendar.get('/week', async (c) => {
  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const url = new URL(c.req.url);
  url.searchParams.set('from', today.toISOString().substring(0, 10));
  url.searchParams.set('to', weekEnd.toISOString().substring(0, 10));
  const newReq = new Request(url.toString(), c.req.raw);
  const calApp = new Hono<HonoEnv>();
  calApp.route('/', calendar);
  return calApp.fetch(newReq, c.env);
});

// GET /calendar/overdue — All past-due items not completed
calendar.get('/overdue', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const today = new Date().toISOString().substring(0, 10);
    const overdue: Array<Record<string, unknown>> = [];

    try {
      const cps = await c.env.DB.prepare(
        "SELECT cp.id, cp.description, cp.target_date, cp.status FROM conditions_precedent cp LEFT JOIN contract_documents cd ON cp.contract_id = cd.id WHERE cp.target_date < ? AND cp.status = 'outstanding' AND (cd.creator_id = ? OR cd.counterparty_id = ?)"
      ).bind(today, pid, pid).all();
      for (const cp of (cps.results || [])) overdue.push({ ...(cp as Record<string, unknown>), type: 'cp' });
    } catch { /* */ }

    try {
      const invoices = await c.env.DB.prepare(
        "SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE due_date < ? AND status = 'outstanding' AND (payer_id = ? OR payee_id = ?)"
      ).bind(today, pid, pid).all();
      for (const inv of (invoices.results || [])) overdue.push({ ...(inv as Record<string, unknown>), type: 'invoice' });
    } catch { /* */ }

    return c.json({ success: true, data: overdue });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// POST /calendar/custom — Create custom reminder/event
calendar.post('/custom', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { title: string; description?: string; event_date: string; event_type?: string; entity_type?: string; entity_id?: string };
    if (!body.title?.trim() || !body.event_date) return c.json({ success: false, error: 'Title and date required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO calendar_events (id, participant_id, title, description, event_date, event_type, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.title, body.description || null, body.event_date, body.event_type || 'custom', body.entity_type || null, body.entity_id || null).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed to create event' }, 500);
  }
});

export default calendar;
