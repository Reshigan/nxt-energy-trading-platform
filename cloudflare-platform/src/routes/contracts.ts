import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { CreateDocumentSchema, PhaseTransitionSchema, SignSchema } from '../utils/validation';
import { sha256 } from '../utils/hash';
import { generateSigningCertificate, computeIntegritySeal, computeChainHash } from '../utils/signing-certificate';
import { getTemplate, MANDATORY_CLAUSES } from '../templates/contract-templates';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';
import { generateContractPDF } from '../utils/pdf';

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
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = CreateDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;
    const id = generateId();
    const counterpartyId = data.counterparty_id || user.sub;

    await c.env.DB.prepare(`
      INSERT INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id,
        commercial_terms, template_id, version)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, 'v1.0')
    `).bind(
      id, data.title, data.document_type, user.sub, counterpartyId,
      data.commercial_terms ? JSON.stringify(data.commercial_terms) : null,
      data.template_id || null
    ).run();

    // Add default signatories (creator, and counterparty if different)
    const signatoryIds = data.counterparty_id ? [user.sub, data.counterparty_id] : [user.sub];
    for (const participantId of signatoryIds) {
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
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents — List documents
contracts.get('/documents', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { page = '1', limit = '20', phase, document_type } = c.req.query();
    const pg = parsePagination(c.req.query());

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
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id — Get document detail
contracts.get('/documents/:id', authMiddleware(), async (c) => {
  try {
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
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /contracts/documents/:id/phase — Advance phase
contracts.patch('/documents/:id/phase', authMiddleware(), async (c) => {
  try {
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

    // Fire cascade for phase change
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'contract.phase_changed',
      actor_id: user.sub,
      entity_type: 'contract_document',
      entity_id: id,
      data: { parties: [doc.creator_id, doc.counterparty_id], title: doc.title, new_phase: target_phase, old_phase: doc.phase },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { phase: target_phase } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/sign — Digital signature
contracts.post('/documents/:id/sign', authMiddleware(), async (c) => {
  try {
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
    const sigBuffer = Uint8Array.from(atob(signature_image.replace(/^data:image\/\w+;base64,/, '')), (ch) => ch.charCodeAt(0));
    await c.env.R2.put(sigR2Key, sigBuffer);

    // Compute document hash
    let documentHash = 'no-document';
    const doc = await c.env.DB.prepare('SELECT id, title, r2_key FROM contract_documents WHERE id = ?').bind(id).first<{ id: string; title: string; r2_key: string | null }>();
    if (doc?.r2_key) {
      const obj = await c.env.R2.get(doc.r2_key);
      if (obj) {
        const buffer = await obj.arrayBuffer();
        documentHash = await sha256(buffer);
      }
    }

    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';

    // Get previous chain hash for hash chain integrity
    const lastSigned = await c.env.DB.prepare(
      'SELECT chain_hash FROM document_signatories WHERE document_id = ? AND signed = 1 ORDER BY signed_at DESC LIMIT 1'
    ).bind(id).first<{ chain_hash: string | null }>();

    // Generate ECT Act signing certificate
    const certificate = await generateSigningCertificate({
      documentId: id,
      documentTitle: doc?.title || 'Untitled',
      documentHash,
      signatoryId: user.sub,
      signatoryName: signatory_name,
      signatoryDesignation: signatory_designation,
      ipAddress,
      signatureImageBuffer: sigBuffer.buffer as ArrayBuffer,
      previousChainHash: lastSigned?.chain_hash || null,
    });

    // Store certificate to R2
    const certR2Key = `certificates/${id}/${user.sub}_${Date.now()}.json`;
    await c.env.R2.put(certR2Key, JSON.stringify(certificate, null, 2));

    // Update signatory record with certificate and chain hash
    await c.env.DB.prepare(`
      UPDATE document_signatories
      SET signatory_name = ?, signatory_designation = ?, signed = 1, signed_at = ?,
        signature_r2_key = ?, ip_address = ?, document_hash_at_signing = ?,
        certificate_serial = ?, certificate_r2_key = ?, chain_hash = ?
      WHERE id = ?
    `).bind(
      signatory_name, signatory_designation, nowISO(),
      sigR2Key, ipAddress, documentHash,
      certificate.certificate_serial, certR2Key, certificate.chain_hash,
      signatory.id
    ).run();

    // Audit with ECT Act notice
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'sign_document', 'contract_document', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({
        signatory_name,
        document_hash: documentHash,
        certificate_serial: certificate.certificate_serial,
        chain_hash: certificate.chain_hash,
        ect_act_compliance: true,
      }),
      ipAddress
    ).run();

    // Check if all signatories have signed → compute integrity seal and auto-advance
    const allSigs = await c.env.DB.prepare(
      'SELECT signed, chain_hash, signed_at FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();
    const allSigned = allSigs.results.every((s) => s.signed === 1);

    if (allSigned) {
      // Compute integrity seal over all signatures
      const signatureHashes = allSigs.results
        .filter((s) => s.chain_hash && s.signed_at)
        .map((s) => ({ hash: s.chain_hash as string, timestamp: s.signed_at as string }));
      const seal = await computeIntegritySeal(documentHash, signatureHashes);

      await c.env.DB.prepare(
        'UPDATE contract_documents SET integrity_seal = ?, updated_at = ? WHERE id = ?'
      ).bind(seal, nowISO(), id).run();

      const currentDoc = await c.env.DB.prepare('SELECT phase FROM contract_documents WHERE id = ?').bind(id).first<{ phase: string }>();
      if (currentDoc?.phase === 'execution') {
        await c.env.DB.prepare(
          'UPDATE contract_documents SET phase = \'active\', updated_at = ? WHERE id = ?'
        ).bind(nowISO(), id).run();
      }
    }

    return c.json({
      success: true,
      data: {
        signed: true,
        all_signed: allSigned,
        certificate_serial: certificate.certificate_serial,
        ect_act_notice: certificate.ect_act_notice,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/signatures — List signatories
contracts.get('/documents/:id/signatures', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const sigs = await c.env.DB.prepare(
      'SELECT * FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();
    return c.json({ success: true, data: sigs.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/amend — Create amendment version
contracts.post('/documents/:id/amend', authMiddleware(), async (c) => {
  try {
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
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/versions — List all versions
contracts.get('/documents/:id/versions', authMiddleware(), async (c) => {
  try {
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
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/pdf — Download document PDF (or cover page with metadata)
contracts.get('/documents/:id/pdf', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const doc = await c.env.DB.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(id).first();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    // Access check
    if (user.role !== 'admin' && doc.creator_id !== user.sub && doc.counterparty_id !== user.sub) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const sigs = await c.env.DB.prepare(
      'SELECT signatory_name, signatory_designation, signed, signed_at FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();

    const checks = await c.env.DB.prepare(
      "SELECT regulation, status FROM statutory_checks WHERE entity_type = 'document' AND entity_id = ?"
    ).bind(id).all();

    // If document has R2 key, return the actual document
    if (doc.r2_key) {
      const obj = await c.env.R2.get(doc.r2_key as string);
      if (obj) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="${(doc.title as string).replace(/["\r\n]/g, '_')}.pdf"`);
        return new Response(obj.body, { headers });
      }
    }

    // Otherwise return metadata cover page as JSON (for MVP)
    return c.json({
      success: true,
      data: {
        cover_page: {
          document_id: doc.id,
          title: doc.title,
          document_type: doc.document_type,
          version: doc.version,
          phase: doc.phase,
          created_at: doc.created_at,
          parties: sigs.results.map((s) => ({
            name: s.signatory_name,
            designation: s.signatory_designation,
            signed: s.signed === 1,
            signed_at: s.signed_at,
          })),
          statutory_compliance: checks.results.map((ch) => ({
            regulation: ch.regulation,
            status: ch.status,
          })),
          document_hash: 'N/A',
        },
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/audit-trail — Document audit trail
contracts.get('/documents/:id/audit-trail', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const logs = await c.env.DB.prepare(
      'SELECT * FROM audit_log WHERE entity_type = \'contract_document\' AND entity_id = ? ORDER BY created_at'
    ).bind(id).all();
    return c.json({ success: true, data: logs.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/verify — Verify document signature integrity
contracts.get('/documents/:id/verify', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();

    const doc = await c.env.DB.prepare(
      'SELECT id, title, sha256_hash, integrity_seal, phase FROM contract_documents WHERE id = ?'
    ).bind(id).first<{ id: string; title: string; sha256_hash: string | null; integrity_seal: string | null; phase: string }>();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    const signatories = await c.env.DB.prepare(
      'SELECT participant_id, signatory_name, signatory_designation, signed, signed_at, document_hash_at_signing, certificate_serial, chain_hash, ip_address FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();

    // Verify hash chain integrity by recomputing each link
    const signedSigs = signatories.results
      .filter((s) => s.signed === 1)
      .sort((a, b) => ((a.signed_at as string) || '').localeCompare((b.signed_at as string) || ''));

    let chainValid = true;
    if (signedSigs.length > 0) {
      let previousHash: string | null = null;
      for (const sig of signedSigs) {
        if (!sig.chain_hash || !sig.document_hash_at_signing || !sig.signed_at) {
          chainValid = false;
          break;
        }
        const expected = await computeChainHash(
          previousHash,
          sig.document_hash_at_signing as string,
          sig.participant_id as string,
          sig.signed_at as string,
          (sig.ip_address as string) || '',
        );
        if (expected !== sig.chain_hash) {
          chainValid = false;
          break;
        }
        previousHash = sig.chain_hash as string;
      }
    }

    // Check that all signed signatories have consistent document hashes
    const hashes = new Set(signedSigs.map((s) => s.document_hash_at_signing));
    const hashConsistent = hashes.size <= 1;

    // Verify integrity seal if present
    let sealValid = false;
    if (doc.integrity_seal && signedSigs.length > 0) {
      const docHash = signedSigs[0]?.document_hash_at_signing as string || 'no-document';
      const signatureHashes = signedSigs
        .filter((s) => s.chain_hash && s.signed_at)
        .map((s) => ({ hash: s.chain_hash as string, timestamp: s.signed_at as string }));
      const computedSeal = await computeIntegritySeal(docHash, signatureHashes);
      sealValid = computedSeal === doc.integrity_seal;
    }

    const allSigned = signatories.results.length > 0 && signatories.results.every((s) => s.signed === 1);

    return c.json({
      success: true,
      data: {
        document_id: doc.id,
        title: doc.title,
        phase: doc.phase,
        verification: {
          all_signed: allSigned,
          chain_valid: chainValid,
          hash_consistent: hashConsistent,
          integrity_seal_valid: sealValid,
          integrity_seal: doc.integrity_seal,
          overall_status: allSigned && chainValid && hashConsistent && (doc.integrity_seal ? sealValid : true) ? 'verified' : 'incomplete',
        },
        signatories: signatories.results.map((s) => ({
          name: s.signatory_name,
          designation: s.signatory_designation,
          signed: s.signed === 1,
          signed_at: s.signed_at,
          certificate_serial: s.certificate_serial,
          document_hash: s.document_hash_at_signing,
          ip_address: s.ip_address,
        })),
        ect_act_notice: 'Verification performed in accordance with the Electronic Communications and Transactions Act 25 of 2002, Section 13.',
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/certificate/:participantId — Download signing certificate
contracts.get('/documents/:id/certificate/:participantId', authMiddleware(), async (c) => {
  try {
    const { id, participantId } = c.req.param();

    const signatory = await c.env.DB.prepare(
      'SELECT certificate_r2_key, certificate_serial FROM document_signatories WHERE document_id = ? AND participant_id = ? AND signed = 1'
    ).bind(id, participantId).first<{ certificate_r2_key: string | null; certificate_serial: string | null }>();

    if (!signatory?.certificate_r2_key) {
      return c.json({ success: false, error: 'No signing certificate found' }, 404);
    }

    const obj = await c.env.R2.get(signatory.certificate_r2_key);
    if (!obj) {
      return c.json({ success: false, error: 'Certificate file not found' }, 404);
    }

    const cert = await obj.text();
    return c.json({ success: true, data: JSON.parse(cert) });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/templates — List available contract templates
contracts.get('/templates', authMiddleware(), async (c) => {
  try {
    const templates = await c.env.DB.prepare(
      'SELECT id, name, document_type, version, page_count, fields, active FROM document_templates WHERE active = 1'
    ).all();

    return c.json({
      success: true,
      data: {
        templates: templates.results,
        mandatory_clauses: MANDATORY_CLAUSES,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/templates/:type — Get template detail with clauses
contracts.get('/templates/:type', authMiddleware(), async (c) => {
  try {
    const { type } = c.req.param();
    const template = getTemplate(type);

    if (!template) {
      return c.json({ success: false, error: 'Template not found for document type' }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...template,
        mandatory_clauses: MANDATORY_CLAUSES,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/cooling-off — CPA cooling-off period (5 business days)
contracts.post('/documents/:id/cooling-off', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const doc = await c.env.DB.prepare(
      'SELECT id, phase, created_at FROM contract_documents WHERE id = ?'
    ).bind(id).first<{ id: string; phase: string; created_at: string }>();

    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    // Can only cancel within 5 business days of signing
    const signatory = await c.env.DB.prepare(
      'SELECT signed_at FROM document_signatories WHERE document_id = ? AND participant_id = ? AND signed = 1'
    ).bind(id, user.sub).first<{ signed_at: string | null }>();

    if (!signatory?.signed_at) {
      return c.json({ success: false, error: 'You have not signed this document' }, 400);
    }

    const signedDate = new Date(signatory.signed_at);
    const now = new Date();
    // Count only business days (Mon-Fri), excluding weekends
    let businessDays = 0;
    const cursor = new Date(signedDate);
    cursor.setDate(cursor.getDate() + 1); // start counting from the day after signing
    while (cursor <= now) {
      const day = cursor.getDay(); // 0=Sun, 6=Sat
      if (day !== 0 && day !== 6) businessDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    if (businessDays > 5) {
      return c.json({
        success: false,
        error: 'CPA cooling-off period has expired. Cancellation must occur within 5 business days of signing per the Consumer Protection Act 68 of 2008, Section 16.',
      }, 400);
    }

    // Revoke signature
    await c.env.DB.prepare(
      'UPDATE document_signatories SET signed = 0, signed_at = NULL, signature_r2_key = NULL, certificate_serial = NULL, certificate_r2_key = NULL, chain_hash = NULL WHERE document_id = ? AND participant_id = ?'
    ).bind(id, user.sub).run();

    // If document was active, revert to execution
    if (doc.phase === 'active') {
      await c.env.DB.prepare(
        'UPDATE contract_documents SET phase = \'execution\', integrity_seal = NULL, updated_at = ? WHERE id = ?'
      ).bind(nowISO(), id).run();
    }

    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'cpa_cooling_off', 'contract_document', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ reason: 'CPA cooling-off period cancellation', business_days_elapsed: businessDays }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({
      success: true,
      data: {
        message: 'Signature revoked under CPA cooling-off period (Consumer Protection Act 68 of 2008, Section 16).',
        business_days_remaining: Math.max(0, 5 - businessDays),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/request-2fa — Request 2FA OTP for high-value signings
contracts.post('/documents/:id/request-2fa', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const doc = await c.env.DB.prepare(
      'SELECT id, commercial_terms FROM contract_documents WHERE id = ?'
    ).bind(id).first<{ id: string; commercial_terms: string | null }>();

    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    // Generate 6-digit OTP using cryptographically secure random
    const otpBytes = new Uint32Array(1);
    crypto.getRandomValues(otpBytes);
    const otp = String(100000 + (otpBytes[0] % 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

    // Store OTP in KV with TTL
    await c.env.KV.put(`signing_otp:${id}:${user.sub}`, JSON.stringify({ otp, expires: otpExpiry }), { expirationTtl: 600 });

    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'request_signing_otp', 'contract_document', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ email: user.email }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // In production, send via email. For now store in KV and return success.
    const isDev = (c.env as Record<string, unknown>).ENVIRONMENT !== 'production';
    return c.json({
      success: true,
      data: {
        message: `OTP sent to ${user.email}. Valid for 10 minutes.`,
        expires_at: otpExpiry,
        ...(isDev ? { dev_otp: otp } : {}),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/verify-2fa — Verify OTP for high-value signing
contracts.post('/documents/:id/verify-2fa', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { otp: string };

    if (!body.otp || body.otp.length !== 6) {
      return c.json({ success: false, error: 'Invalid OTP format' }, 400);
    }

    const stored = await c.env.KV.get(`signing_otp:${id}:${user.sub}`);
    if (!stored) {
      return c.json({ success: false, error: 'No OTP found. Please request a new one.' }, 400);
    }

    const { otp, expires } = JSON.parse(stored) as { otp: string; expires: string };

    if (new Date() > new Date(expires)) {
      await c.env.KV.delete(`signing_otp:${id}:${user.sub}`);
      return c.json({ success: false, error: 'OTP has expired. Please request a new one.' }, 400);
    }

    if (body.otp !== otp) {
      return c.json({ success: false, error: 'Invalid OTP' }, 400);
    }

    // Mark OTP as used
    await c.env.KV.delete(`signing_otp:${id}:${user.sub}`);

    // Store 2FA verification in KV (valid for 15 min to complete signing)
    await c.env.KV.put(`signing_2fa:${id}:${user.sub}`, 'verified', { expirationTtl: 900 });

    return c.json({ success: true, data: { verified: true, valid_for_minutes: 15 } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/documents/:id/pdf — Generate contract PDF (HTML-based)
contracts.get('/documents/:id/pdf', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();

    const doc = await c.env.DB.prepare(
      'SELECT * FROM contract_documents WHERE id = ?'
    ).bind(id).first();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    // Authorization: non-admin users can only view documents where they are creator or counterparty
    const user = c.get('user');
    if (user.role !== 'admin') {
      const pid = user.sub;
      if (doc.creator_id !== pid && doc.counterparty_id !== pid) {
        return c.json({ success: false, error: 'Not authorized to view this document' }, 403);
      }
    }

    const sigs = await c.env.DB.prepare(
      'SELECT * FROM document_signatories WHERE document_id = ?'
    ).bind(id).all();

    const checks = await c.env.DB.prepare(
      "SELECT * FROM statutory_checks WHERE entity_type = 'document' AND entity_id = ?"
    ).bind(id).all();

    const html = generateContractPDF(
      doc as unknown as Parameters<typeof generateContractPDF>[0],
      sigs.results as unknown as Parameters<typeof generateContractPDF>[1],
      checks.results as unknown as Parameters<typeof generateContractPDF>[2],
    );

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contract-${id}.html"`,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// Contract Agreements — CRUD + Digital Signature Workflow + Activity Feed
// Uses the `contracts`, `contract_signers`, `contract_field_values`,
// and `contract_activity` tables from migration 010.
// ═══════════════════════════════════════════════════════════════════════

// POST /contracts/agreements — Create a new contract agreement
contracts.post('/agreements', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      contract_type: string;
      counterparty_id: string;
      title: string;
      project_id?: string;
      document_id?: string;
      start_date?: string;
      end_date?: string;
      value_cents?: number;
      term_months?: number;
      notes?: string;
      commercial_terms?: string;
      nersa_licence_ref?: string;
      era_registration_ref?: string;
      bbbee_level_required?: number;
    };

    if (!body.contract_type || !body.counterparty_id || !body.title) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'contract_type, counterparty_id, and title are required'), 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO contracts (id, contract_type, participant_id, counterparty_id, project_id,
        document_id, title, status, start_date, end_date, value_cents, term_months,
        notes, commercial_terms, nersa_licence_ref, era_registration_ref, bbbee_level_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.contract_type, user.sub, body.counterparty_id,
      body.project_id ?? null, body.document_id ?? null,
      body.title, body.start_date ?? null, body.end_date ?? null,
      body.value_cents ?? null, body.term_months ?? null,
      body.notes ?? null, body.commercial_terms ?? null,
      body.nersa_licence_ref ?? null, body.era_registration_ref ?? null,
      body.bbbee_level_required ?? null
    ).run();

    // Add creator and counterparty as default signers
    const creatorP = await c.env.DB.prepare(
      'SELECT contact_person, email FROM participants WHERE id = ?'
    ).bind(user.sub).first<{ contact_person: string; email: string }>();
    const counterP = await c.env.DB.prepare(
      'SELECT contact_person, email FROM participants WHERE id = ?'
    ).bind(body.counterparty_id).first<{ contact_person: string; email: string }>();

    if (creatorP) {
      await c.env.DB.prepare(`
        INSERT INTO contract_signers (id, contract_id, participant_id, signer_name, signer_email, signer_role, signing_order)
        VALUES (?, ?, ?, ?, ?, 'signatory', 1)
      `).bind(generateId(), id, user.sub, creatorP.contact_person || user.email, creatorP.email || user.email).run();
    }
    if (counterP) {
      await c.env.DB.prepare(`
        INSERT INTO contract_signers (id, contract_id, participant_id, signer_name, signer_email, signer_role, signing_order)
        VALUES (?, ?, ?, ?, ?, 'signatory', 2)
      `).bind(generateId(), id, body.counterparty_id, counterP.contact_person, counterP.email).run();
    }

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
      VALUES (?, ?, ?, ?, 'created', ?, 'all_parties')
    `).bind(generateId(), id, user.sub, user.email, JSON.stringify({ contract_type: body.contract_type, title: body.title })).run();

    return c.json({ success: true, data: { id, status: 'draft' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/agreements — List contract agreements
contracts.get('/agreements', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { status, contract_type } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin' || user.role === 'regulator') {
      query = 'SELECT * FROM contracts';
    } else {
      query = 'SELECT * FROM contracts WHERE (participant_id = ? OR counterparty_id = ?)';
      params.push(user.sub, user.sub);
    }

    if (status) {
      query += params.length > 0 ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
    }
    if (contract_type) {
      query += params.length > 0 ? ' AND contract_type = ?' : ' WHERE contract_type = ?';
      params.push(contract_type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/agreements/:id — Get contract detail with signers, fields, and activity
contracts.get('/agreements/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);

    // Access check
    if (user.role !== 'admin' && user.role !== 'regulator' &&
        contract.participant_id !== user.sub && contract.counterparty_id !== user.sub) {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Access denied'), 403);
    }

    const [signers, fields, activity] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM contract_signers WHERE contract_id = ? ORDER BY signing_order').bind(id).all(),
      c.env.DB.prepare('SELECT * FROM contract_field_values WHERE contract_id = ? ORDER BY section, field_key').bind(id).all(),
      c.env.DB.prepare('SELECT * FROM contract_activity WHERE contract_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all(),
    ]);

    // Get template info
    const template = getTemplate(contract.contract_type as string);

    return c.json({
      success: true,
      data: {
        ...contract,
        signers: signers.results,
        field_values: fields.results,
        activity: activity.results,
        template: template ? {
          name: template.name,
          type_specific_clauses: template.type_specific_clauses,
          fields: template.fields,
          mandatory_clauses: template.mandatory_clauses,
        } : null,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /contracts/agreements/:id — Update contract fields
contracts.patch('/agreements/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as Record<string, unknown>;

    const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);
    if (contract.participant_id !== user.sub && user.role !== 'admin') {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Only the creator can update this contract'), 403);
    }
    if (contract.status !== 'draft') {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Only draft contracts can be updated'), 400);
    }

    const allowed = ['title', 'start_date', 'end_date', 'value_cents', 'term_months', 'notes', 'commercial_terms',
      'nersa_licence_ref', 'era_registration_ref', 'bbbee_level_required', 'auto_renew'];
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }
    if (sets.length === 0) return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'No valid fields to update'), 400);

    sets.push('updated_at = ?');
    vals.push(nowISO());
    vals.push(id);

    await c.env.DB.prepare(`UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
      VALUES (?, ?, ?, ?, 'updated', ?, 'all_parties')
    `).bind(generateId(), id, user.sub, user.email, JSON.stringify({ fields: Object.keys(body).filter(k => allowed.includes(k)) })).run();

    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/agreements/:id/fields — Save form field values
contracts.post('/agreements/:id/fields', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { fields: Array<{ field_key: string; field_value: string; field_type?: string; section?: string }> };

    const contract = await c.env.DB.prepare('SELECT participant_id, counterparty_id, status FROM contracts WHERE id = ?').bind(id).first<{ participant_id: string; counterparty_id: string; status: string }>();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);
    if (contract.participant_id !== user.sub && user.role !== 'admin') {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Access denied'), 403);
    }

    if (!body.fields || !Array.isArray(body.fields)) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'fields array is required'), 400);
    }

    const stmts = body.fields.map(f =>
      c.env.DB.prepare(`
        INSERT INTO contract_field_values (id, contract_id, field_key, field_value, field_type, section, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(contract_id, field_key) DO UPDATE SET field_value = ?, field_type = ?, section = ?, updated_at = ?
      `).bind(
        generateId(), id, f.field_key, f.field_value || null, f.field_type || 'text', f.section || null, nowISO(),
        f.field_value || null, f.field_type || 'text', f.section || null, nowISO()
      )
    );
    await c.env.DB.batch(stmts);

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
      VALUES (?, ?, ?, ?, 'field_updated', ?, 'all_parties')
    `).bind(generateId(), id, user.sub, user.email, JSON.stringify({ fields_count: body.fields.length })).run();

    return c.json({ success: true, data: { saved: body.fields.length } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/agreements/:id/signers — Add signers
contracts.post('/agreements/:id/signers', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as {
      signers: Array<{ participant_id: string; signer_name: string; signer_email: string; signer_role?: string; signing_order?: number }>;
    };

    const contract = await c.env.DB.prepare('SELECT participant_id, status FROM contracts WHERE id = ?').bind(id).first<{ participant_id: string; status: string }>();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);
    if (contract.participant_id !== user.sub && user.role !== 'admin') {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Only the creator can add signers'), 403);
    }

    if (!body.signers || !Array.isArray(body.signers)) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'signers array is required'), 400);
    }

    const stmts = body.signers.map((s, i) =>
      c.env.DB.prepare(`
        INSERT INTO contract_signers (id, contract_id, participant_id, signer_name, signer_email, signer_role, signing_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(generateId(), id, s.participant_id, s.signer_name, s.signer_email, s.signer_role || 'signatory', s.signing_order || (i + 1))
    );
    await c.env.DB.batch(stmts);

    return c.json({ success: true, data: { added: body.signers.length } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/agreements/:id/send — Send contract for signing
contracts.post('/agreements/:id/send', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);
    if (contract.participant_id !== user.sub && user.role !== 'admin') {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Only the creator can send for signing'), 403);
    }
    if (contract.status !== 'draft') {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Only draft contracts can be sent for signing'), 400);
    }

    // Mark all signers as 'sent'
    await c.env.DB.prepare(
      "UPDATE contract_signers SET status = 'sent', updated_at = ? WHERE contract_id = ? AND status = 'pending'"
    ).bind(nowISO(), id).run();

    // Update contract status to 'pending' (pending signatures)
    await c.env.DB.prepare(
      "UPDATE contracts SET status = 'pending', updated_at = ? WHERE id = ?"
    ).bind(nowISO(), id).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
      VALUES (?, ?, ?, ?, 'sent_for_signing', ?, 'all_parties')
    `).bind(generateId(), id, user.sub, user.email, JSON.stringify({ title: contract.title })).run();

    // Notify signers via cascade
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'contract.sent_for_signing',
      actor_id: user.sub,
      entity_type: 'contract',
      entity_id: id,
      data: { parties: [contract.participant_id, contract.counterparty_id], title: contract.title },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { status: 'pending' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/agreements/:id/sign — Sign a contract agreement
contracts.post('/agreements/:id/sign', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);

    // Verify the caller is a listed signer
    const signer = await c.env.DB.prepare(
      "SELECT id, status, signing_order FROM contract_signers WHERE contract_id = ? AND participant_id = ?"
    ).bind(id, user.sub).first<{ id: string; status: string; signing_order: number }>();

    if (!signer) return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'You are not a signer for this contract'), 403);
    if (signer.status === 'signed') return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Already signed'), 400);

    // Check signing order — ensure all lower-order signers have signed
    const pendingBefore = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM contract_signers WHERE contract_id = ? AND signing_order < ? AND status != 'signed'"
    ).bind(id, signer.signing_order).first<{ cnt: number }>();
    if (pendingBefore && pendingBefore.cnt > 0) {
      return c.json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Waiting for prior signers to complete'), 400);
    }

    // Compute signature hash
    const signData = `${id}:${user.sub}:${nowISO()}:${ipAddress}`;
    const signatureHash = await sha256(new TextEncoder().encode(signData).buffer as ArrayBuffer);

    // Update signer record
    await c.env.DB.prepare(`
      UPDATE contract_signers SET status = 'signed', signed_at = ?, signature_hash = ?, ip_address = ?, user_agent = ?, updated_at = ?
      WHERE id = ?
    `).bind(nowISO(), signatureHash, ipAddress, userAgent, nowISO(), signer.id).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
      VALUES (?, ?, ?, ?, 'signed', ?, 'all_parties')
    `).bind(generateId(), id, user.sub, user.email, JSON.stringify({ ip: ipAddress, signature_hash: signatureHash })).run();

    // Check if all signers have signed → activate contract
    const allSigners = await c.env.DB.prepare(
      'SELECT status FROM contract_signers WHERE contract_id = ?'
    ).bind(id).all();
    const allSigned = allSigners.results.length > 0 && allSigners.results.every(s => s.status === 'signed');

    if (allSigned) {
      await c.env.DB.prepare(
        "UPDATE contracts SET status = 'active', updated_at = ? WHERE id = ?"
      ).bind(nowISO(), id).run();

      await c.env.DB.prepare(`
        INSERT INTO contract_activity (id, contract_id, actor_id, actor_name, action, details, visibility)
        VALUES (?, ?, ?, ?, 'activated', ?, 'all_parties')
      `).bind(generateId(), id, 'system', 'System', JSON.stringify({ reason: 'All parties have signed' })).run();
    }

    return c.json({
      success: true,
      data: {
        signed: true,
        all_signed: allSigned,
        contract_status: allSigned ? 'active' : 'pending',
        ect_act_notice: 'Signed in accordance with the Electronic Communications and Transactions Act 25 of 2002, Section 13.',
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/agreements/:id/activity — Get contract activity feed
contracts.get('/agreements/:id/activity', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const contract = await c.env.DB.prepare('SELECT participant_id, counterparty_id FROM contracts WHERE id = ?').bind(id).first<{ participant_id: string; counterparty_id: string }>();
    if (!contract) return c.json(errorResponse(ErrorCodes.NOT_FOUND, 'Contract not found'), 404);

    // Access check
    if (user.role !== 'admin' && user.role !== 'regulator' &&
        contract.participant_id !== user.sub && contract.counterparty_id !== user.sub) {
      return c.json(errorResponse(ErrorCodes.FORBIDDEN, 'Access denied'), 403);
    }

    // Filter by visibility based on user role
    let visFilter = '';
    if (contract.participant_id === user.sub) {
      visFilter = "AND visibility IN ('all_parties', 'creator_only')";
    } else if (user.role !== 'admin') {
      visFilter = "AND visibility = 'all_parties'";
    }

    const activity = await c.env.DB.prepare(`
      SELECT * FROM contract_activity WHERE contract_id = ? ${visFilter} ORDER BY created_at DESC LIMIT 100
    `).bind(id).all();

    return c.json({ success: true, data: activity.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /contracts/activity/feed — Cross-platform activity feed for all contracts
contracts.get('/activity/feed', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin' || user.role === 'regulator') {
      query = `
        SELECT ca.*, c.title as contract_title, c.contract_type, c.status as contract_status
        FROM contract_activity ca
        JOIN contracts c ON ca.contract_id = c.id
        WHERE ca.visibility = 'all_parties'
        ORDER BY ca.created_at DESC LIMIT ? OFFSET ?
      `;
      params.push(pg.per_page, pg.offset);
    } else {
      query = `
        SELECT ca.*, c.title as contract_title, c.contract_type, c.status as contract_status
        FROM contract_activity ca
        JOIN contracts c ON ca.contract_id = c.id
        WHERE (c.participant_id = ? OR c.counterparty_id = ?)
          AND ca.visibility IN ('all_parties', CASE WHEN c.participant_id = ? THEN 'creator_only' ELSE 'none' END)
        ORDER BY ca.created_at DESC LIMIT ? OFFSET ?
      `;
      params.push(user.sub, user.sub, user.sub, pg.per_page, pg.offset);
    }

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ─── Contract-scoped smart rules CRUD ───

// GET /contracts/:contractId/rules — List rules for a specific contract document
contracts.get('/:contractId/rules', authMiddleware(), async (c) => {
  try {
    const { contractId } = c.req.param();
    const user = c.get('user');

    // Verify access
    const doc = await c.env.DB.prepare(
      'SELECT id FROM contract_documents WHERE id = ? AND (creator_id = ? OR counterparty_id = ? OR ? IN (SELECT id FROM participants WHERE role = \'admin\'))'
    ).bind(contractId, user.sub, user.sub, user.sub).first();
    if (!doc && user.role !== 'admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const results = await c.env.DB.prepare(
      'SELECT * FROM smart_contract_rules WHERE contract_doc_id = ? ORDER BY created_at DESC'
    ).bind(contractId).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/:contractId/rules — Create rule for a contract
contracts.post('/:contractId/rules', authMiddleware(), async (c) => {
  try {
    const { contractId } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { rule_type: string; trigger_condition: string; action: string };

    if (!body.rule_type || !body.trigger_condition || !body.action) {
      return c.json({ success: false, error: 'rule_type, trigger_condition, and action are required' }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO smart_contract_rules (id, contract_doc_id, rule_type, trigger_condition, action, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, contractId, body.rule_type, body.trigger_condition, body.action, nowISO()).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PATCH /contracts/:contractId/rules/:ruleId — Update a rule
contracts.patch('/:contractId/rules/:ruleId', authMiddleware(), async (c) => {
  try {
    const { contractId, ruleId } = c.req.param();
    const body = await c.req.json() as Record<string, unknown>;

    const updates: string[] = [];
    const values: unknown[] = [];
    for (const key of ['rule_type', 'trigger_condition', 'action', 'active']) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400);
    }

    values.push(ruleId, contractId);
    await c.env.DB.prepare(
      `UPDATE smart_contract_rules SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ? AND contract_doc_id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /contracts/:contractId/rules/:ruleId — Delete a rule
contracts.delete('/:contractId/rules/:ruleId', authMiddleware(), async (c) => {
  try {
    const { contractId, ruleId } = c.req.param();
    await c.env.DB.prepare(
      'DELETE FROM smart_contract_rules WHERE id = ? AND contract_doc_id = ?'
    ).bind(ruleId, contractId).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/:contractId/rules/:ruleId/pause — Toggle pause on a rule
contracts.post('/:contractId/rules/:ruleId/pause', authMiddleware(), async (c) => {
  try {
    const { contractId, ruleId } = c.req.param();
    const rule = await c.env.DB.prepare(
      'SELECT active FROM smart_contract_rules WHERE id = ? AND contract_doc_id = ?'
    ).bind(ruleId, contractId).first<{ active: number }>();
    if (!rule) return c.json({ success: false, error: 'Rule not found' }, 404);

    const newActive = rule.active === 1 ? 0 : 1;
    await c.env.DB.prepare(
      "UPDATE smart_contract_rules SET active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newActive, ruleId).run();

    return c.json({ success: true, data: { active: newActive === 1 } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// ─── Document attachments ───

// GET /contracts/documents/:id/attachments — List document attachments
contracts.get('/documents/:id/attachments', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const results = await c.env.DB.prepare(
      'SELECT id, document_id, filename, r2_key, uploaded_by, created_at FROM contract_attachments WHERE document_id = ? ORDER BY created_at DESC'
    ).bind(id).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /contracts/documents/:id/attachments — Upload attachment
contracts.post('/documents/:id/attachments', authMiddleware(), async (c) => {
  try {
    const { id: docId } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { filename: string; content_base64?: string };

    if (!body.filename) {
      return c.json({ success: false, error: 'filename is required' }, 400);
    }

    const attachId = generateId();
    const r2Key = `attachments/${docId}/${attachId}_${body.filename}`;

    if (body.content_base64) {
      const buffer = Uint8Array.from(atob(body.content_base64), (ch) => ch.charCodeAt(0));
      await c.env.R2.put(r2Key, buffer);
    }

    await c.env.DB.prepare(
      'INSERT INTO contract_attachments (id, document_id, filename, r2_key, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(attachId, docId, body.filename, r2Key, user.sub, nowISO()).run();

    return c.json({ success: true, data: { id: attachId, r2_key: r2Key } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default contracts;
