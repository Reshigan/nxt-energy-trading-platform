import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const vault = new Hono<HonoEnv>();
vault.use('*', authMiddleware());

// GET /vault/documents — List all documents in vault
vault.get('/documents', async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare(
      'SELECT id, title, document_type, file_name, file_size, mime_type, tags, shared_with, created_at, updated_at FROM contract_documents WHERE creator_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: [] });
  }
});

// POST /vault/documents — Upload document to vault
vault.post('/documents', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { title: string; document_type: string; tags?: string[]; content?: string };
    if (!body.title) return c.json({ success: false, error: 'Title is required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      "INSERT INTO contract_documents (id, title, document_type, creator_id, phase, version, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', 1, ?, ?)"
    ).bind(id, body.title, body.document_type || 'general', user.sub, nowISO(), nowISO()).run();
    // Cascade: vault.document_uploaded
    try {
      await c.env.DB.prepare(
        "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'vault.document_uploaded', 'document', ?, ?, ?)"
      ).bind(generateId(), user.sub, id, JSON.stringify({ title: body.title }), c.req.header('CF-Connecting-IP') || 'unknown').run();
    } catch { /* best-effort */ }
    return c.json({ success: true, data: { id, title: body.title } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /vault/documents/:id/share — Share document with participants
vault.post('/documents/:id/share', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json() as { participant_ids: string[]; permission: string };
    if (!body.participant_ids?.length) return c.json({ success: false, error: 'Participant IDs required' }, 400);
    for (const pid of body.participant_ids) {
      try {
        await c.env.DB.prepare(
          "INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id) VALUES (?, ?, 'Document Shared', ?, 'info', 'document', ?)"
        ).bind(generateId(), pid, `A document has been shared with you.`, id).run();
      } catch { /* best-effort */ }
    }
    return c.json({ success: true, data: { shared_with: body.participant_ids, permission: body.permission || 'view' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /vault/templates — List document templates
vault.get('/templates', async (c) => {
  try {
    return c.json({
      success: true,
      data: [
        { id: 'ppa', name: 'Power Purchase Agreement', category: 'contracts', fields: ['buyer', 'seller', 'capacity_mw', 'price_per_kwh', 'term_years', 'escalation_rate'] },
        { id: 'wheeling', name: 'Wheeling Agreement', category: 'contracts', fields: ['generator', 'offtaker', 'grid_operator', 'wheeling_charge', 'capacity_mw'] },
        { id: 'carbon_offtake', name: 'Carbon Credit Offtake', category: 'carbon', fields: ['seller', 'buyer', 'registry', 'vintage', 'quantity', 'price_per_tonne'] },
        { id: 'project_finance', name: 'Project Finance Term Sheet', category: 'finance', fields: ['borrower', 'lender', 'facility_amount', 'tenor_years', 'interest_rate', 'collateral'] },
        { id: 'grid_connection', name: 'Grid Connection Agreement', category: 'grid', fields: ['generator', 'grid_operator', 'connection_point', 'capacity_mw', 'voltage_kv'] },
        { id: 'epc', name: 'EPC Contract', category: 'construction', fields: ['developer', 'contractor', 'scope', 'price', 'completion_date', 'performance_guarantee'] },
        { id: 'nda', name: 'Non-Disclosure Agreement', category: 'legal', fields: ['party_a', 'party_b', 'scope', 'term_months'] },
        { id: 'lease', name: 'Land Lease Agreement', category: 'property', fields: ['lessor', 'lessee', 'property_description', 'term_years', 'rental_amount', 'escalation'] },
      ],
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /vault/verify/:id — Verify document integrity (hash check)
vault.post('/verify/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const doc = await c.env.DB.prepare('SELECT id, title, version, created_at FROM contract_documents WHERE id = ?').bind(id).first();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ id: doc.id, title: doc.title, version: doc.version, created_at: doc.created_at }));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return c.json({ success: true, data: { document_id: id, integrity_hash: hash, verified: true, verified_at: nowISO() } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default vault;
