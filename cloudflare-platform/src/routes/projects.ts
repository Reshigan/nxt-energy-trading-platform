import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';

const projects = new Hono<HonoEnv>();

const STANDARD_MILESTONES = [
  'Environmental Authorisation',
  'Grid Connection Agreement',
  'Generation Licence (NERSA)',
  'PPA Execution',
  'Financial Close — All CPs',
  'Construction Commencement',
  'Commissioning & Testing',
  'COD Declaration',
];

const STANDARD_CPS = [
  { description: 'Signed PPA or equivalent offtake', category: 'legal', responsible: 'ipp' },
  { description: 'Environmental Authorisation (EIA approved)', category: 'environmental', responsible: 'ipp' },
  { description: 'Generation Licence issued by NERSA', category: 'regulatory', responsible: 'ipp' },
  { description: 'Grid Connection Agreement signed', category: 'technical', responsible: 'grid' },
  { description: 'EPC Contract executed', category: 'legal', responsible: 'ipp' },
  { description: 'Insurance policies in place', category: 'insurance', responsible: 'ipp' },
  { description: 'Land rights secured (lease/ownership)', category: 'legal', responsible: 'ipp' },
  { description: 'Equity contribution confirmed', category: 'financial', responsible: 'ipp' },
  { description: 'Legal opinions delivered', category: 'legal', responsible: 'lender' },
  { description: 'Independent Engineer appointed', category: 'technical', responsible: 'lender' },
];

// GET /projects — List projects
projects.get('/', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { phase, page = '1', limit = '20' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query: string;
  const params: unknown[] = [];

  if (user.role === 'admin') {
    query = 'SELECT * FROM projects';
  } else if (user.role === 'ipp') {
    query = 'SELECT * FROM projects WHERE developer_id = ?';
    params.push(user.sub);
  } else if (user.role === 'lender') {
    query = 'SELECT * FROM projects WHERE lender_id = ?';
    params.push(user.sub);
  } else {
    query = 'SELECT * FROM projects WHERE offtaker_id = ? OR grid_operator_id = ? OR developer_id = ?';
    params.push(user.sub, user.sub, user.sub);
  }

  if (phase) {
    query += params.length > 0 ? ' AND phase = ?' : ' WHERE phase = ?';
    params.push(phase);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// POST /projects — Create project
projects.post('/', authMiddleware({ roles: ['admin', 'ipp'] }), async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as {
    name: string; technology: string; capacity_mw: number; location: string;
    province?: string; estimated_cod?: string; total_cost_cents?: number;
    offtaker_id?: string; lender_id?: string; grid_operator_id?: string;
  };

  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO projects (id, name, developer_id, technology, capacity_mw, location, province,
      phase, estimated_cod, total_cost_cents, offtaker_id, lender_id, grid_operator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'development', ?, ?, ?, ?, ?)
  `).bind(
    id, body.name, user.sub, body.technology, body.capacity_mw, body.location,
    body.province || null, body.estimated_cod || null, body.total_cost_cents || null,
    body.offtaker_id || null, body.lender_id || null, body.grid_operator_id || null
  ).run();

  // Create standard milestones
  for (let i = 0; i < STANDARD_MILESTONES.length; i++) {
    await c.env.DB.prepare(`
      INSERT INTO milestones (id, project_id, name, sequence, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(generateId(), id, STANDARD_MILESTONES[i], i + 1).run();
  }

  // Create standard CPs
  for (const cp of STANDARD_CPS) {
    await c.env.DB.prepare(`
      INSERT INTO conditions_precedent (id, project_id, description, category, status, responsible_party)
      VALUES (?, ?, ?, ?, 'outstanding', ?)
    `).bind(generateId(), id, cp.description, cp.category, cp.responsible).run();
  }

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'create_project', 'project', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ name: body.name, technology: body.technology }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, data: { id } }, 201);
});

// GET /projects/:id — Get project detail
projects.get('/:id', authMiddleware(), async (c) => {
  const { id } = c.req.param();

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

  const milestones = await c.env.DB.prepare(
    'SELECT * FROM milestones WHERE project_id = ? ORDER BY sequence'
  ).bind(id).all();

  const cps = await c.env.DB.prepare(
    'SELECT * FROM conditions_precedent WHERE project_id = ? ORDER BY created_at'
  ).bind(id).all();

  const disbursements = await c.env.DB.prepare(
    'SELECT * FROM disbursements WHERE project_id = ? ORDER BY created_at'
  ).bind(id).all();

  return c.json({
    success: true,
    data: {
      ...project,
      milestones: milestones.results,
      conditions_precedent: cps.results,
      disbursements: disbursements.results,
    },
  });
});

// PATCH /projects/:id/phase — Advance project phase
projects.patch('/:id/phase', authMiddleware({ roles: ['admin', 'ipp'] }), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as { target_phase: string; notes?: string };

  const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

  const phaseOrder = ['development', 'financial_close', 'construction', 'commissioning', 'commercial_ops'];
  const currentIdx = phaseOrder.indexOf(project.phase as string);
  const targetIdx = phaseOrder.indexOf(body.target_phase);

  if (targetIdx <= currentIdx) {
    return c.json({ success: false, error: 'Can only advance to the next phase' }, 400);
  }

  // Financial close requires all CPs satisfied/waived
  if (body.target_phase === 'construction') {
    const cps = await c.env.DB.prepare(
      'SELECT status FROM conditions_precedent WHERE project_id = ?'
    ).bind(id).all();
    const allDone = cps.results.every((cp) => cp.status === 'satisfied' || cp.status === 'waived');
    if (!allDone) {
      return c.json({ success: false, error: 'All conditions precedent must be satisfied or waived' }, 400);
    }
  }

  await c.env.DB.prepare(
    'UPDATE projects SET phase = ?, updated_at = ? WHERE id = ?'
  ).bind(body.target_phase, nowISO(), id).run();

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'project_phase_change', 'project', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ from: project.phase, to: body.target_phase, notes: body.notes }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, data: { phase: body.target_phase } });
});

// POST /projects/:id/milestones/:milestoneId/complete — Complete milestone
projects.post('/:id/milestones/:milestoneId/complete', authMiddleware(), async (c) => {
  const { id, milestoneId } = c.req.param();
  const user = c.get('user');

  const milestone = await c.env.DB.prepare(
    'SELECT * FROM milestones WHERE id = ? AND project_id = ?'
  ).bind(milestoneId, id).first();

  if (!milestone) return c.json({ success: false, error: 'Milestone not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE milestones SET status = \'completed\', completed_date = ?, completed_by = ? WHERE id = ?'
  ).bind(nowISO(), user.sub, milestoneId).run();

  return c.json({ success: true, message: 'Milestone completed' });
});

// POST /projects/:id/cps/:cpId/satisfy — Satisfy CP
projects.post('/:id/cps/:cpId/satisfy', authMiddleware(), async (c) => {
  const { id, cpId } = c.req.param();
  const user = c.get('user');

  const cp = await c.env.DB.prepare(
    'SELECT * FROM conditions_precedent WHERE id = ? AND project_id = ?'
  ).bind(cpId, id).first();

  if (!cp) return c.json({ success: false, error: 'CP not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE conditions_precedent SET status = \'satisfied\', satisfied_date = ?, satisfied_by = ? WHERE id = ?'
  ).bind(nowISO(), user.sub, cpId).run();

  return c.json({ success: true, message: 'CP satisfied' });
});

// POST /projects/:id/cps/:cpId/waive — Waive CP (lender/admin)
projects.post('/:id/cps/:cpId/waive', authMiddleware({ roles: ['admin', 'lender'] }), async (c) => {
  const { id, cpId } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as { reason: string };

  if (!body.reason) return c.json({ success: false, error: 'Waiver reason required' }, 400);

  await c.env.DB.prepare(
    'UPDATE conditions_precedent SET status = \'waived\', waived_by = ?, waive_reason = ? WHERE id = ?'
  ).bind(user.sub, body.reason, cpId).run();

  return c.json({ success: true, message: 'CP waived' });
});

// POST /projects/:id/disbursements — Request disbursement
projects.post('/:id/disbursements', authMiddleware({ roles: ['admin', 'ipp'] }), async (c) => {
  const { id: projectId } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as {
    amount_cents: number; purpose: string; milestone_id?: string;
  };

  const disbursementId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO disbursements (id, project_id, amount_cents, purpose, milestone_id, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).bind(disbursementId, projectId, body.amount_cents, body.purpose, body.milestone_id || null).run();

  return c.json({ success: true, data: { id: disbursementId } }, 201);
});

// POST /projects/:id/disbursements/:disbursementId/certify — IE certification
projects.post('/:id/disbursements/:disbursementId/certify', authMiddleware(), async (c) => {
  const { disbursementId } = c.req.param();
  const user = c.get('user');

  await c.env.DB.prepare(
    'UPDATE disbursements SET ie_certification = 1, ie_certified_by = ?, ie_certified_at = ?, status = \'ie_certified\' WHERE id = ?'
  ).bind(user.sub, nowISO(), disbursementId).run();

  return c.json({ success: true, message: 'Disbursement certified by IE' });
});

// POST /projects/:id/disbursements/:disbursementId/approve — Lender approval
projects.post('/:id/disbursements/:disbursementId/approve', authMiddleware({ roles: ['admin', 'lender'] }), async (c) => {
  const { disbursementId } = c.req.param();
  const user = c.get('user');

  const d = await c.env.DB.prepare('SELECT * FROM disbursements WHERE id = ?').bind(disbursementId).first();
  if (!d) return c.json({ success: false, error: 'Disbursement not found' }, 404);
  if (!d.ie_certification) return c.json({ success: false, error: 'IE certification required first' }, 400);

  await c.env.DB.prepare(
    'UPDATE disbursements SET lender_approval = 1, lender_approved_by = ?, lender_approved_at = ?, status = \'approved\' WHERE id = ?'
  ).bind(user.sub, nowISO(), disbursementId).run();

  return c.json({ success: true, message: 'Disbursement approved' });
});

export default projects;
