import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';

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
      await c.env.DB.prepare(
        "UPDATE disbursements SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?"
      ).bind(user.sub, nowISO(), id).run();
      approved++;
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
      await c.env.DB.prepare(
        "UPDATE participants SET kyc_status = 'in_review' WHERE id = ?"
      ).bind(id).run();
      reverified++;
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
      await c.env.DB.prepare(
        "UPDATE carbon_credits SET status = 'retired', retired_by = ?, retired_at = ?, retirement_purpose = ?, retirement_beneficiary = ? WHERE id = ? AND owner_id = ?"
      ).bind(user.sub, nowISO(), body.purpose || 'voluntary', body.beneficiary || null, id, user.sub).run();
      retired++;
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
    for (const id of body.ids) {
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO document_signatories (id, document_id, participant_id, signed, signed_at, signature_hash, ip_address) VALUES (?, ?, ?, 1, ?, ?, ?)"
      ).bind(generateId(), id, user.sub, nowISO(), `sha256:batch-${Date.now()}`, c.req.header('CF-Connecting-IP') || 'unknown').run();
      signed++;
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
      await c.env.DB.prepare(
        "UPDATE invoices SET status = 'paid', paid_at = ?, payment_reference = ? WHERE id = ? AND (payer_id = ? OR ? IN (SELECT id FROM participants WHERE role = 'admin'))"
      ).bind(nowISO(), body.payment_ref || `BATCH-${Date.now()}`, id, user.sub, user.sub).run();
      paid++;
    }
    return c.json({ success: true, data: { paid } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Batch pay failed' }, 500);
  }
});

// POST /batch/export — Export selected data
batch.post('/export', async (c) => {
  try {
    const body = await c.req.json() as { entity_type: string; ids: string[]; format?: string };
    if (!body.entity_type || !body.ids?.length) return c.json({ success: false, error: 'entity_type and ids required' }, 400);
    const format = body.format || 'csv';
    // Generate CSV content
    let data: unknown[] = [];
    if (body.entity_type === 'contracts') {
      const placeholders = body.ids.map(() => '?').join(',');
      const result = await c.env.DB.prepare(
        `SELECT * FROM contract_documents WHERE id IN (${placeholders})`
      ).bind(...body.ids).all();
      data = result.results || [];
    } else if (body.entity_type === 'trades') {
      const placeholders = body.ids.map(() => '?').join(',');
      const result = await c.env.DB.prepare(
        `SELECT * FROM trades WHERE id IN (${placeholders})`
      ).bind(...body.ids).all();
      data = result.results || [];
    }

    if (format === 'csv' && data.length > 0) {
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const rows = data.map((row) => headers.map((h) => String((row as Record<string, unknown>)[h] || '')).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      return c.text(csv, 200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${body.entity_type}-export.csv"` });
    }

    return c.json({ success: true, data });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

export default batch;
