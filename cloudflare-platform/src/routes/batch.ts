import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { sha256 } from '../utils/hash';
import { computeChainHash } from '../utils/signing-certificate';

const batch = new Hono<HonoEnv>();
batch.use('*', authMiddleware());

// POST /batch/disbursements/approve — Batch approve disbursements
batch.post('/disbursements/approve', authMiddleware({ roles: ['lender', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { ids: string[] };
    if (!body.ids?.length) return c.json({ success: false, error: 'ids required' }, 400);
    let approved = 0;
    for (const id of body.ids) {
      const result = await c.env.DB.prepare(
        "UPDATE disbursements SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ? AND status = 'pending'"
      ).bind(user.sub, nowISO(), id).run();
      if (result.meta.changes > 0) approved++;
    }
    return c.json({ success: true, data: { approved } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch approve failed' }, 500);
  }
});

// POST /batch/kyc/reverify — Batch re-verify KYC
batch.post('/kyc/reverify', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const body = await c.req.json() as { ids: string[] };
    if (!body.ids?.length) return c.json({ success: false, error: 'ids required' }, 400);
    let reverified = 0;
    for (const id of body.ids) {
      const result = await c.env.DB.prepare(
        "UPDATE participants SET kyc_status = 'in_review' WHERE id = ?"
      ).bind(id).run();
      if (result.meta.changes > 0) reverified++;
    }
    return c.json({ success: true, data: { reverified } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch reverify failed' }, 500);
  }
});

// POST /batch/credits/retire — Batch retire carbon credits
batch.post('/credits/retire', authMiddleware({ roles: ['carbon_fund', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { ids: string[]; purpose?: string; beneficiary?: string };
    if (!body.ids?.length) return c.json({ success: false, error: 'ids required' }, 400);
    let retired = 0;
    for (const id of body.ids) {
      const result = await c.env.DB.prepare(
        "UPDATE carbon_credits SET status = 'retired', retired_by = ?, retired_at = ?, retirement_purpose = ?, retirement_beneficiary = ? WHERE id = ? AND owner_id = ?"
      ).bind(user.sub, nowISO(), body.purpose || 'voluntary', body.beneficiary || null, id, user.sub).run();
      if (result.meta.changes > 0) retired++;
    }
    return c.json({ success: true, data: { retired } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch retire failed' }, 500);
  }
});

// POST /batch/documents/sign — Batch sign contract documents
batch.post('/documents/sign', authMiddleware({ roles: ['ipp', 'generator', 'offtaker', 'lender', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { ids: string[] };
    if (!body.ids?.length) return c.json({ success: false, error: 'ids required' }, 400);
    let signed = 0;
    const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
    for (const id of body.ids) {
      // Compute real document hash from R2
      let documentHash = 'no-document';
      const doc = await c.env.DB.prepare('SELECT id, title, r2_key FROM contract_documents WHERE id = ?').bind(id).first<{ id: string; title: string; r2_key: string | null }>();
      if (doc?.r2_key) {
        try {
          const obj = await c.env.R2.get(doc.r2_key);
          if (obj) {
            const buffer = await obj.arrayBuffer();
            documentHash = await sha256(buffer);
          }
        } catch { /* best-effort hash */ }
      }

      // Get previous chain hash for hash chain integrity
      const lastSigned = await c.env.DB.prepare(
        'SELECT chain_hash FROM document_signatories WHERE document_id = ? AND signed = 1 ORDER BY signed_at DESC LIMIT 1'
      ).bind(id).first<{ chain_hash: string | null }>();

      const signedAt = nowISO();
      const chainHash = await computeChainHash(lastSigned?.chain_hash || null, documentHash, user.sub, signedAt, ipAddress);

      const result = await c.env.DB.prepare(
        "UPDATE document_signatories SET signed = 1, signed_at = ?, ip_address = ?, document_hash_at_signing = ?, chain_hash = ? WHERE document_id = ? AND participant_id = ? AND signed = 0"
      ).bind(signedAt, ipAddress, documentHash, chainHash, id, user.sub).run();
      if (result.meta.changes > 0) {
        signed++;
        // Audit log
        try {
          await c.env.DB.prepare(
            "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'sign_document', 'contract_document', ?, ?, ?)"
          ).bind(generateId(), user.sub, id, JSON.stringify({ batch: true, document_hash: documentHash, chain_hash: chainHash }), ipAddress).run();
        } catch { /* best-effort */ }
      }
    }
    return c.json({ success: true, data: { signed } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch sign failed' }, 500);
  }
});

// POST /batch/invoices/pay — Batch pay invoices
batch.post('/invoices/pay', authMiddleware({ roles: ['offtaker', 'lender', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { ids: string[]; payment_ref?: string };
    if (!body.ids?.length) return c.json({ success: false, error: 'ids required' }, 400);
    let paid = 0;
    for (const id of body.ids) {
      const result = await c.env.DB.prepare(
        "UPDATE invoices SET status = 'paid', paid_at = ?, payment_reference = ? WHERE id = ? AND status = 'outstanding' AND (payer_id = ? OR ? IN (SELECT id FROM participants WHERE role = 'admin'))"
      ).bind(nowISO(), body.payment_ref || `BATCH-${Date.now()}`, id, user.sub, user.sub).run();
      if (result.meta.changes > 0) paid++;
    }
    return c.json({ success: true, data: { paid } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch pay failed' }, 500);
  }
});

// POST /batch/export — Export selected data
batch.post('/export', authMiddleware({ roles: ['admin', 'ipp', 'generator', 'offtaker', 'lender', 'carbon_fund'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { entity_type: string; ids: string[]; format?: string };
    if (!body.entity_type || !body.ids?.length) return c.json({ success: false, error: 'entity_type and ids required' }, 400);
    const format = body.format || 'csv';
    // Generate CSV content with ownership checks
    const isAdmin = user.role === 'admin';
    let data: unknown[] = [];
    if (body.entity_type === 'contracts') {
      const placeholders = body.ids.map(() => '?').join(',');
      if (isAdmin) {
        const result = await c.env.DB.prepare(
          `SELECT * FROM contract_documents WHERE id IN (${placeholders})`
        ).bind(...body.ids).all();
        data = result.results || [];
      } else {
        const result = await c.env.DB.prepare(
          `SELECT * FROM contract_documents WHERE id IN (${placeholders}) AND (creator_id = ? OR counterparty_id = ?)`
        ).bind(...body.ids, user.sub, user.sub).all();
        data = result.results || [];
      }
    } else if (body.entity_type === 'trades') {
      const placeholders = body.ids.map(() => '?').join(',');
      if (isAdmin) {
        const result = await c.env.DB.prepare(
          `SELECT * FROM trades WHERE id IN (${placeholders})`
        ).bind(...body.ids).all();
        data = result.results || [];
      } else {
        const result = await c.env.DB.prepare(
          `SELECT * FROM trades WHERE id IN (${placeholders}) AND (buyer_id = ? OR seller_id = ?)`
        ).bind(...body.ids, user.sub, user.sub).all();
        data = result.results || [];
      }
    }

    if (format === 'csv' && data.length > 0) {
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const escCsv = (v: string) => /[,"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      const rows = data.map((row) => headers.map((h) => escCsv(String((row as Record<string, unknown>)[h] || ''))).join(','));
      const csv = [headers.map(escCsv).join(','), ...rows].join('\n');
      return c.text(csv, 200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${body.entity_type}-export.csv"` });
    }

    return c.json({ success: true, data });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

export default batch;
