import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';

const compliance = new Hono<HonoEnv>();

// GET /compliance/kyc — List KYC documents
compliance.get('/kyc', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { participant_id, verified, page = '1', limit = '20' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM kyc_documents';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === 'admin' && participant_id) {
    conditions.push('participant_id = ?');
    params.push(participant_id);
  } else if (user.role !== 'admin') {
    conditions.push('participant_id = ?');
    params.push(user.sub);
  }

  if (verified !== undefined) {
    conditions.push('verified = ?');
    params.push(verified === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// POST /compliance/kyc/:id/verify — Verify KYC document (admin)
compliance.post('/kyc/:id/verify', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  await c.env.DB.prepare(
    'UPDATE kyc_documents SET verified = 1, verified_by = ?, verified_at = ? WHERE id = ?'
  ).bind(user.sub, nowISO(), id).run();

  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, ip_address)
    VALUES (?, ?, 'verify_kyc_document', 'kyc_document', ?, ?)
  `).bind(generateId(), user.sub, id, c.req.header('CF-Connecting-IP') || 'unknown').run();

  return c.json({ success: true, message: 'KYC document verified' });
});

// GET /compliance/licences — List licences
compliance.get('/licences', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { participant_id, page = '1', limit = '20' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query: string;
  const params: unknown[] = [];

  if (user.role === 'admin') {
    query = participant_id
      ? 'SELECT * FROM licences WHERE participant_id = ?'
      : 'SELECT * FROM licences';
    if (participant_id) params.push(participant_id);
  } else {
    query = 'SELECT * FROM licences WHERE participant_id = ?';
    params.push(user.sub);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// GET /compliance/statutory — List statutory checks
compliance.get('/statutory', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { entity_type, entity_id, status, page = '1', limit = '50' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM statutory_checks';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (entity_type) { conditions.push('entity_type = ?'); params.push(entity_type); }
  if (entity_id) { conditions.push('entity_id = ?'); params.push(entity_id); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  // Non-admin can only see their own participant checks
  if (user.role !== 'admin') {
    conditions.push('(entity_type = \'participant\' AND entity_id = ?)');
    params.push(user.sub);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// POST /compliance/statutory/:id/override — Admin override
compliance.post('/statutory/:id/override', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as { reason: string };

  if (!body.reason) return c.json({ success: false, error: 'Override reason required' }, 400);

  const check = await c.env.DB.prepare('SELECT * FROM statutory_checks WHERE id = ?').bind(id).first();
  if (!check) return c.json({ success: false, error: 'Statutory check not found' }, 404);

  await c.env.DB.prepare(`
    UPDATE statutory_checks SET status = 'overridden', override_by = ?, override_reason = ?, override_at = ?
    WHERE id = ?
  `).bind(user.sub, body.reason, nowISO(), id).run();

  // Audit with original status
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'override_statutory', 'statutory_check', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ original_status: check.status, regulation: check.regulation, reason: body.reason }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, message: 'Statutory check overridden' });
});

// POST /compliance/statutory/:id/evidence — Upload manual evidence
compliance.post('/statutory/:id/evidence', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ success: false, error: 'File required' }, 400);

  const r2Key = `statutory/${id}/${Date.now()}_${file.name}`;
  await c.env.R2.put(r2Key, await file.arrayBuffer());

  await c.env.DB.prepare(
    'UPDATE statutory_checks SET evidence_r2_key = ? WHERE id = ?'
  ).bind(r2Key, id).run();

  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'upload_statutory_evidence', 'statutory_check', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ file_name: file.name }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, message: 'Evidence uploaded' });
});

// GET /compliance/audit — Audit log
compliance.get('/audit', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { entity_type, entity_id, actor_id, action, page = '1', limit = '50' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT * FROM audit_log';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (entity_type) { conditions.push('entity_type = ?'); params.push(entity_type); }
  if (entity_id) { conditions.push('entity_id = ?'); params.push(entity_id); }
  if (actor_id) { conditions.push('actor_id = ?'); params.push(actor_id); }
  if (action) { conditions.push('action = ?'); params.push(action); }

  // Non-admin can only see their own actions
  if (user.role !== 'admin') {
    conditions.push('actor_id = ?');
    params.push(user.sub);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// GET /compliance/reports — Regulatory reports (stub)
compliance.get('/reports', authMiddleware({ roles: ['admin'] }), async (c) => {
  return c.json({
    success: true,
    data: [
      { type: 'nersa_quarterly', period: 'Q1 2024', status: 'generated', due_date: '2024-04-30' },
      { type: 'sars_annual', period: '2023', status: 'submitted', due_date: '2024-02-28' },
      { type: 'fsca_monthly', period: 'March 2024', status: 'pending', due_date: '2024-04-15' },
    ],
  });
});

export default compliance;
