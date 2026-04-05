import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { CreateDocumentSchema, PhaseTransitionSchema, SignSchema } from '../utils/validation';
import { sha256 } from '../utils/hash';

const contracts = new Hono<HonoEnv>();

// Phase transition prerequisites
const PHASE_PREREQUISITES: Record<string, string[]> = {
  loi: ['draft'],
  term_sheet: ['loi'],
  hoa: ['term_sheet'],
  draft_agreement: ['hoa'],
  legal_review: ['draft_agreement'],
  statutory_check: ['legal_review'],
  execution: ['statutory_check'],
  active: ['execution'],
  amended: ['active'],
  terminated: ['active'],
};

// Document types requiring statutory checks
const STATUTORY_REQUIRED: Record<string, string[]> = {
  hoa: ['era', 'nersa', 'popia', 'fica', 'bbbee'],
  ppa_wheeling: ['era', 'nersa', 'popia', 'fica', 'bbbee', 'municipal_systems'],
  ppa_btm: ['era', 'nersa', 'popia', 'fica', 'bbbee'],
  carbon_purchase: ['fsca', 'fica', 'popia'],
  carbon_option_isda: ['fsca', 'fais', 'isda', 'fica'],
  forward: ['fsca', 'fica'],
  epc: ['cidb', 'ohs', 'fica'],
  wheeling_agreement: ['era', 'municipal_systems', 'fica'],
};

// POST /contracts/documents — Create new document
contracts.post('/documents', authMiddleware(), async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = CreateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const id = generateId();

  await c.env.DB.prepare(`
    INSERT INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id,
      commercial_terms, template_id, version)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, 'v1.0')
  `).bind(
    id, data.title, data.document_type, user.sub, data.counterparty_id,
    data.commercial_terms ? JSON.stringify(data.commercial_terms) : null,
    data.template_id || null
  ).run();

  // Add default signatories (creator and counterparty)
  for (const participantId of [user.sub, data.counterparty_id]) {
    const participant = await c.env.DB.prepare(
      'SELECT contact_person, role FROM participants WHERE id = ?'
    ).bind(participantId).first<{ contact_person: string; role: string }>();

    if (participant) {
      await c.env.DB.prepare(`
        INSERT INTO document_signatories (id, document_id, participant_id, signatory_name, signatory_designation)
        VALUES (?, ?, ?, ?, ?)
      `).bind(generateId(), id, participantId, participant.contact_person, participant.role).run();
    }
  }

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'create_document', 'contract_document', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ document_type: data.document_type, title: data.title }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, data: { id, phase: 'draft' } }, 201);
});

// GET /contracts/documents — List documents
contracts.get('/documents', authMiddleware(), async (c) => {
  const user = c.get('user');
  const { page = '1', limit = '20', phase, document_type } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let query: string;
  const params: unknown[] = [];

  if (user.role === 'admin') {
    query = 'SELECT * FROM contract_documents';
  } else {
    query = 'SELECT * FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?)';
    params.push(user.sub, user.sub);
  }

  if (phase) {
    query += params.length > 0 ? ' AND phase = ?' : ' WHERE phase = ?';
    params.push(phase);
  }
  if (document_type) {
    query += params.length > 0 ? ' AND document_type = ?' : ' WHERE document_type = ?';
    params.push(document_type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// GET /contracts/documents/:id — Get document detail
contracts.get('/documents/:id', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const doc = await c.env.DB.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(id).first();
  if (!doc) {
    return c.json({ success: false, error: 'Document not found' }, 404);
  }

  // Access check
  if (user.role !== 'admin' && doc.creator_id !== user.sub && doc.counterparty_id !== user.sub) {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  const signatories = await c.env.DB.prepare(
    'SELECT * FROM document_signatories WHERE document_id = ?'
  ).bind(id).all();

  const statutoryChecks = await c.env.DB.prepare(
    'SELECT * FROM statutory_checks WHERE entity_type = \'document\' AND entity_id = ?'
  ).bind(id).all();

  return c.json({
    success: true,
    data: {
      ...doc,
      signatories: signatories.results,
      statutory_checks: statutoryChecks.results,
    },
  });
});

// PATCH /contracts/documents/:id/phase — Advance phase
contracts.patch('/documents/:id/phase', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = PhaseTransitionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { target_phase, notes } = parsed.data;

  const doc = await c.env.DB.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(id).first();
  if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

  // Validate transition
  const allowedFrom = PHASE_PREREQUISITES[target_phase];
  if (!allowedFrom || !allowedFrom.includes(doc.phase as string)) {
    return c.json({
      success: false,
      error: `Cannot transition from '${doc.phase}' to '${target_phase}'`,
    }, 400);
  }

  // Special checks for statutory_check → execution
  if (target_phase === 'execution') {
    const checks = await c.env.DB.prepare(
      'SELECT status FROM statutory_checks WHERE entity_type = \'document\' AND entity_id = ?'
    ).bind(id).all();

    const allPassed = checks.results.length > 0 && checks.results.every(
      (ch) => ch.status === 'pass' || ch.status === 'exempt' || ch.status === 'overridden'
    );
    if (!allPassed) {
      return c.json({ success: false, error: 'All statutory checks must pass before execution' }, 400);
    }
  }

  // Special checks for execution → active (all signed)
  if (target_phase === 'active') {
    const sigs = await c.env.DB.prepare(
      'SELECT signed FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();
    const allSigned = sigs.results.length > 0 && sigs.results.every((s) => s.signed === 1);
    if (!allSigned) {
      return c.json({ success: false, error: 'All signatories must sign before activation' }, 400);
    }
  }

  // If transitioning to statutory_check, create checks
  if (target_phase === 'statutory_check') {
    const docType = doc.document_type as string;
    const requiredChecks = STATUTORY_REQUIRED[docType] || [];
    for (const reg of requiredChecks) {
      await c.env.DB.prepare(`
        INSERT INTO statutory_checks (id, entity_type, entity_id, regulation, status, method)
        VALUES (?, 'document', ?, ?, 'pending', ?)
      `).bind(
        generateId(), id, reg,
        ['municipal_systems', 'ohs', 'eia', 'isda'].includes(reg) ? 'manual' : 'auto'
      ).run();
    }
  }

  await c.env.DB.prepare(
    'UPDATE contract_documents SET phase = ?, updated_at = ? WHERE id = ?'
  ).bind(target_phase, nowISO(), id).run();

  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'phase_transition', 'contract_document', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ from: doc.phase, to: target_phase, notes }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, data: { phase: target_phase } });
});

// POST /contracts/documents/:id/sign — Digital signature
contracts.post('/documents/:id/sign', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = SignSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { signatory_name, signatory_designation, signature_image } = parsed.data;

  // Verify caller is a listed signatory
  const signatory = await c.env.DB.prepare(
    'SELECT id, signed FROM document_signatories WHERE document_id = ? AND participant_id = ?'
  ).bind(id, user.sub).first<{ id: string; signed: number }>();

  if (!signatory) {
    return c.json({ success: false, error: 'You are not a signatory for this document' }, 403);
  }
  if (signatory.signed === 1) {
    return c.json({ success: false, error: 'Already signed' }, 400);
  }

  // Store signature image to R2
  const sigR2Key = `signatures/${id}/${user.sub}_${Date.now()}.png`;
  const sigBuffer = Uint8Array.from(atob(signature_image.replace(/^data:image\/\w+;base64,/, '')), (c) => c.charCodeAt(0));
  await c.env.R2.put(sigR2Key, sigBuffer);

  // Compute document hash
  let documentHash = 'no-document';
  const doc = await c.env.DB.prepare('SELECT r2_key FROM contract_documents WHERE id = ?').bind(id).first<{ r2_key: string | null }>();
  if (doc?.r2_key) {
    const obj = await c.env.R2.get(doc.r2_key);
    if (obj) {
      const buffer = await obj.arrayBuffer();
      documentHash = await sha256(buffer);
    }
  }

  // Update signatory record
  await c.env.DB.prepare(`
    UPDATE document_signatories
    SET signatory_name = ?, signatory_designation = ?, signed = 1, signed_at = ?,
      signature_r2_key = ?, ip_address = ?, document_hash_at_signing = ?
    WHERE id = ?
  `).bind(
    signatory_name, signatory_designation, nowISO(),
    sigR2Key, c.req.header('CF-Connecting-IP') || 'unknown', documentHash,
    signatory.id
  ).run();

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'sign_document', 'contract_document', ?, ?, ?)
  `).bind(
    generateId(), user.sub, id,
    JSON.stringify({ signatory_name, document_hash: documentHash }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  // Check if all signatories have signed → auto-advance to active
  const allSigs = await c.env.DB.prepare(
    'SELECT signed FROM document_signatories WHERE document_id = ?'
  ).bind(id).all();
  const allSigned = allSigs.results.every((s) => s.signed === 1);

  if (allSigned) {
    const currentDoc = await c.env.DB.prepare('SELECT phase FROM contract_documents WHERE id = ?').bind(id).first<{ phase: string }>();
    if (currentDoc?.phase === 'execution') {
      await c.env.DB.prepare(
        'UPDATE contract_documents SET phase = \'active\', updated_at = ? WHERE id = ?'
      ).bind(nowISO(), id).run();
    }
  }

  return c.json({ success: true, data: { signed: true, all_signed: allSigned } });
});

// GET /contracts/documents/:id/signatures — List signatories
contracts.get('/documents/:id/signatures', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const sigs = await c.env.DB.prepare(
    'SELECT * FROM document_signatories WHERE document_id = ?'
  ).bind(id).all();
  return c.json({ success: true, data: sigs.results });
});

// POST /contracts/documents/:id/amend — Create amendment version
contracts.post('/documents/:id/amend', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  const body = await c.req.json() as { reason: string; major?: boolean };

  const doc = await c.env.DB.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(id).first();
  if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);
  if (doc.phase !== 'active') {
    return c.json({ success: false, error: 'Only active documents can be amended' }, 400);
  }

  // Parse current version
  const currentVersion = doc.version as string;
  const [major, minor] = currentVersion.replace('v', '').split('.').map(Number);
  const newVersion = body.major ? `v${major + 1}.0` : `v${major}.${minor + 1}`;

  // Create new document version
  const newId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id,
      commercial_terms, template_id, version, previous_version_id, project_id)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    newId, doc.title, doc.document_type, doc.creator_id, doc.counterparty_id,
    doc.commercial_terms, doc.template_id, newVersion, id, doc.project_id
  ).run();

  // Mark original as amended
  await c.env.DB.prepare(
    'UPDATE contract_documents SET phase = \'amended\', updated_at = ? WHERE id = ?'
  ).bind(nowISO(), id).run();

  // Re-create signatories (all unsigned)
  const oldSigs = await c.env.DB.prepare(
    'SELECT participant_id, signatory_name, signatory_designation FROM document_signatories WHERE document_id = ?'
  ).bind(id).all();

  for (const sig of oldSigs.results) {
    await c.env.DB.prepare(`
      INSERT INTO document_signatories (id, document_id, participant_id, signatory_name, signatory_designation)
      VALUES (?, ?, ?, ?, ?)
    `).bind(generateId(), newId, sig.participant_id, sig.signatory_name, sig.signatory_designation).run();
  }

  // Audit
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, 'amend_document', 'contract_document', ?, ?, ?)
  `).bind(
    generateId(), user.sub, newId,
    JSON.stringify({ previous_id: id, reason: body.reason, new_version: newVersion }),
    c.req.header('CF-Connecting-IP') || 'unknown'
  ).run();

  return c.json({ success: true, data: { id: newId, version: newVersion } }, 201);
});

// GET /contracts/documents/:id/versions — List all versions
contracts.get('/documents/:id/versions', authMiddleware(), async (c) => {
  const { id } = c.req.param();

  // Walk the version chain
  const versions: unknown[] = [];
  let currentId: string | null = id;

  while (currentId) {
    const doc: { id: string; version: string; phase: string; previous_version_id: string | null; created_at: string } | null = await c.env.DB.prepare(
      'SELECT id, version, phase, previous_version_id, created_at FROM contract_documents WHERE id = ?'
    ).bind(currentId).first<{ id: string; version: string; phase: string; previous_version_id: string | null; created_at: string }>();

    if (!doc) break;
    versions.unshift(doc);
    currentId = doc.previous_version_id;
  }

  // Also get newer versions
  let nextDoc = await c.env.DB.prepare(
    'SELECT id FROM contract_documents WHERE previous_version_id = ?'
  ).bind(id).first<{ id: string }>();

  while (nextDoc) {
    const doc: { id: string; version: string; phase: string; previous_version_id: string | null; created_at: string } | null = await c.env.DB.prepare(
      'SELECT id, version, phase, previous_version_id, created_at FROM contract_documents WHERE id = ?'
    ).bind(nextDoc.id).first<{ id: string; version: string; phase: string; previous_version_id: string | null; created_at: string }>();

    if (!doc) break;
    versions.push(doc);
    nextDoc = await c.env.DB.prepare(
      'SELECT id FROM contract_documents WHERE previous_version_id = ?'
    ).bind(doc.id).first<{ id: string }>();
  }

  return c.json({ success: true, data: versions });
});

// GET /contracts/documents/:id/audit-trail — Document audit trail
contracts.get('/documents/:id/audit-trail', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const logs = await c.env.DB.prepare(
    'SELECT * FROM audit_log WHERE entity_type = \'contract_document\' AND entity_id = ? ORDER BY created_at'
  ).bind(id).all();
  return c.json({ success: true, data: logs.results });
});

export default contracts;
