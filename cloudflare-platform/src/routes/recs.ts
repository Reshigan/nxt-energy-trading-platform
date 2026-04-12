import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { cascade } from '../utils/cascade';

const recs = new Hono<HonoEnv>();
recs.use('*', authMiddleware());

// GET /recs — List RECs with filters
recs.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { project_id, status, standard, page = '1', limit = '20' } = c.req.query();

    let query = 'SELECT r.*, p.name as project_name FROM recs r LEFT JOIN projects p ON r.project_id = p.id WHERE 1=1';
    const params: unknown[] = [];

    if (user.role !== 'admin') {
      query += ' AND r.owner_id = ?';
      params.push(user.sub);
    }
    if (project_id) { query += ' AND r.project_id = ?'; params.push(project_id); }
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (standard) { query += ' AND r.standard = ?'; params.push(standard); }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error('REC list error:', err);
    return c.json({ success: false, error: 'Failed to list RECs' }, 500);
  }
});

// GET /recs/summary — Portfolio summary by year and standard
recs.get('/summary', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const ownerFilter = user.role !== 'admin' ? 'AND r.owner_id = ?' : '';
    const params = user.role !== 'admin' ? [user.sub] : [];

    const summary = await c.env.DB.prepare(`
      SELECT r.standard, r.vintage_year as year,
             COUNT(*) as cert_count, SUM(r.volume_mwh) as total_mwh,
             SUM(CASE WHEN r.status = 'active' THEN r.volume_mwh ELSE 0 END) as active_mwh,
             SUM(CASE WHEN r.status = 'redeemed' THEN r.volume_mwh ELSE 0 END) as redeemed_mwh
      FROM recs r LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1 ${ownerFilter}
      GROUP BY r.standard, r.vintage_year ORDER BY year DESC
    `).bind(...params).all();

    return c.json({ success: true, data: summary.results });
  } catch (err) {
    console.error('REC summary error:', err);
    return c.json({ success: false, error: 'Failed to get REC summary' }, 500);
  }
});

// POST /recs/:id/transfer — Transfer REC
recs.post('/:id/transfer', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json() as { to_participant_id: string; notes?: string };

    const rec = await c.env.DB.prepare('SELECT * FROM recs WHERE id = ? AND owner_id = ?').bind(id, user.sub).first();
    if (!rec) return c.json({ success: false, error: 'REC not found or not owned by you' }, 404);
    if (rec.status !== 'active') return c.json({ success: false, error: 'Only active RECs can be transferred' }, 400);

    const recipient = await c.env.DB.prepare('SELECT id FROM participants WHERE id = ?').bind(body.to_participant_id).first();
    if (!recipient) return c.json({ success: false, error: 'Recipient not found' }, 404);

    // Keep original owner_id on the transferred record to preserve audit trail / provenance
    await c.env.DB.prepare(
      "UPDATE recs SET status = 'transferred' WHERE id = ?"
    ).bind(id).run();

    // Create new active REC for recipient with matching attributes
    const newId = generateId();
    await c.env.DB.prepare(
      `INSERT INTO recs (id, project_id, owner_id, certificate_number, standard, volume_mwh, vintage_year, status)
       SELECT ?, project_id, ?, certificate_number || '-T', standard, volume_mwh, vintage_year, 'active'
       FROM recs WHERE id = ?`
    ).bind(newId, body.to_participant_id, id).run();

    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'rec.transferred', actor_id: user.sub, entity_type: 'rec', entity_id: id,
      data: { to_participant_id: body.to_participant_id, volume_mwh: rec.volume_mwh }, ip: c.req.header('x-forwarded-for') || '',
    }));

    return c.json({ success: true, message: 'REC transferred', data: { new_rec_id: newId } });
  } catch (err) {
    console.error('REC transfer error:', err);
    return c.json({ success: false, error: 'Failed to transfer REC' }, 500);
  }
});

// POST /recs/:id/redeem — Redeem REC for ESG reporting
recs.post('/:id/redeem', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json() as { purpose: string; beneficiary: string };

    const rec = await c.env.DB.prepare('SELECT * FROM recs WHERE id = ? AND owner_id = ?').bind(id, user.sub).first();
    if (!rec) return c.json({ success: false, error: 'REC not found' }, 404);
    if (rec.status !== 'active') return c.json({ success: false, error: 'Only active RECs can be redeemed' }, 400);

    await c.env.DB.prepare(
      "UPDATE recs SET status = 'redeemed', beneficiary = ?, purpose = ?, redeemed_at = ? WHERE id = ?"
    ).bind(body.beneficiary, body.purpose, nowISO(), id).run();

    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'rec.redeemed', actor_id: user.sub, entity_type: 'rec', entity_id: id,
      data: { volume_mwh: rec.volume_mwh, purpose: body.purpose, beneficiary: body.beneficiary }, ip: c.req.header('x-forwarded-for') || '',
    }));

    return c.json({ success: true, message: 'REC redeemed for ESG reporting' });
  } catch (err) {
    console.error('REC redeem error:', err);
    return c.json({ success: false, error: 'Failed to redeem REC' }, 500);
  }
});

// POST /recs/issue — Admin manual issuance from validated meter readings
recs.post('/issue', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const body = await c.req.json() as { project_id: string; period_start: string; period_end: string };

    const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(body.project_id).first();
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    // Sum validated meter readings for the period
    const generation = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(value_kwh), 0) as total FROM meter_readings WHERE project_id = ? AND timestamp BETWEEN ? AND ? AND quality IN ('actual', 'validated')"
    ).bind(body.project_id, body.period_start, body.period_end).first<{ total: number }>();

    const mwh = (generation?.total || 0) / 1000;
    if (mwh < 1) return c.json({ success: false, error: `Only ${mwh.toFixed(2)} MWh generated — minimum 1 MWh for REC issuance` }, 400);

    // Generate certificate number using vintage year from period start
    // Include a random suffix to prevent race condition duplicates under concurrent requests
    const vintageYear = new Date(body.period_start).getFullYear();
    const seqResult = await c.env.DB.prepare("SELECT COUNT(*) as c FROM recs WHERE certificate_number LIKE ?").bind(`ZA-IREC-${vintageYear}-%`).first<{ c: number }>();
    const seq = String((seqResult?.c || 0) + 1).padStart(5, '0');
    const suffix = generateId().slice(0, 6).toUpperCase();
    const certNumber = `ZA-IREC-${vintageYear}-${seq}-${suffix}`;

    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO recs (id, project_id, owner_id, certificate_number, standard, volume_mwh, vintage_year, status)
       VALUES (?, ?, ?, ?, 'i_rec', ?, ?, 'active')`
    ).bind(id, body.project_id, project.participant_id, certNumber, Math.round(mwh * 100) / 100, vintageYear).run();

    return c.json({ success: true, data: { id, certificate_number: certNumber, volume_mwh: mwh } }, 201);
  } catch (err) {
    console.error('REC issue error:', err);
    return c.json({ success: false, error: 'Failed to issue REC' }, 500);
  }
});

export default recs;
