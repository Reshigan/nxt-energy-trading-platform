import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { initiatePayment } from '../integrations/payment-adapter';

const payments = new Hono<HonoEnv>();

// GET /payments — List payment transactions (admin sees all, others see own)
payments.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const isStaff = !!user.admin_level;

    let query: string;
    const binds: unknown[] = [];

    if (isStaff) {
      query = `SELECT pt.*, fp.email as from_email, tp.email as to_email
        FROM payment_transactions pt
        LEFT JOIN participants fp ON pt.from_participant_id = fp.id
        LEFT JOIN participants tp ON pt.to_participant_id = tp.id`;
      if (status) { query += ' WHERE pt.status = ?'; binds.push(status); }
    } else {
      query = 'SELECT * FROM payment_transactions WHERE (from_participant_id = ? OR to_participant_id = ?)';
      binds.push(user.sub, user.sub);
      if (status) { query += ' AND status = ?'; binds.push(status); }
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);

    const results = await c.env.DB.prepare(query).bind(...binds).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to list payments' }, 500);
  }
});

// GET /payments/stats — Payment statistics (admin only)
payments.get('/stats', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const [pending, processing, completed, failed, reversed, totalVolume] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_transactions WHERE status = 'pending'").first<{ c: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_transactions WHERE status = 'processing'").first<{ c: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_transactions WHERE status = 'completed'").first<{ c: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_transactions WHERE status = 'failed'").first<{ c: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_transactions WHERE status = 'reversed'").first<{ c: number }>(),
      c.env.DB.prepare("SELECT COALESCE(SUM(amount_cents),0) as total FROM payment_transactions WHERE status = 'completed'").first<{ total: number }>(),
    ]);

    const pendingCount = pending?.c ?? 0;
    const processingCount = processing?.c ?? 0;
    const completedCount = completed?.c ?? 0;
    const failedCount = failed?.c ?? 0;
    const reversedCount = reversed?.c ?? 0;
    const totalAmountCents = totalVolume?.total ?? 0;

    return c.json({
      success: true,
      data: {
        total_count: pendingCount + processingCount + completedCount + failedCount + reversedCount,
        total_amount_cents: totalAmountCents,
        pending_count: pendingCount,
        processing_count: processingCount,
        completed_count: completedCount,
        failed_count: failedCount,
        reversed_count: reversedCount,
        // Legacy field names for backward compatibility
        pending: pendingCount,
        completed: completedCount,
        failed: failedCount,
        total_volume_cents: totalAmountCents,
      },
    });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to fetch payment stats' }, 500);
  }
});

// POST /payments — Initiate a payment (admin only)
payments.post('/', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      trade_id?: string;
      invoice_id?: string;
      from_participant_id: string;
      to_participant_id: string;
      amount_cents: number;
      currency?: string;
      payment_method?: string;
      description?: string;
    };

    if (!body.from_participant_id || !body.to_participant_id || !body.amount_cents) {
      return c.json({ success: false, error: 'from_participant_id, to_participant_id, and amount_cents are required' }, 400);
    }
    if (body.amount_cents <= 0) {
      return c.json({ success: false, error: 'amount_cents must be positive' }, 400);
    }

    const id = generateId();
    const now = nowISO();
    const currency = body.currency ?? 'ZAR';
    const paymentMethod = body.payment_method ?? 'eft';

    const result = await initiatePayment(c.env, {
      amount_cents: body.amount_cents,
      currency,
      from_participant_id: body.from_participant_id,
      to_participant_id: body.to_participant_id,
      reference: id,
      description: body.description ?? 'Platform payment',
    });

    await c.env.DB.prepare(`
      INSERT INTO payment_transactions (id, trade_id, invoice_id, from_participant_id, to_participant_id, amount_cents, currency, payment_method, provider, provider_ref, status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, body.trade_id ?? null, body.invoice_id ?? null,
      body.from_participant_id, body.to_participant_id,
      body.amount_cents, currency, paymentMethod,
      result.provider, result.provider_ref, result.status, now, now
    ).run();

    // Audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?,?,'initiate_payment','payment_transaction',?,?,?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ amount_cents: body.amount_cents, from: body.from_participant_id, to: body.to_participant_id }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true, data: { id, status: result.status, provider_ref: result.provider_ref } }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to initiate payment' }, 500);
  }
});

// PATCH /payments/:id — Update payment status (admin only)
payments.patch('/:id', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { status?: string; bank_reference?: string; reconciled?: boolean };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.status) {
      if (!['pending', 'processing', 'completed', 'failed', 'reversed'].includes(body.status)) {
        return c.json({ success: false, error: 'Invalid status' }, 400);
      }
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.bank_reference !== undefined) {
      updates.push('bank_reference = ?');
      values.push(body.bank_reference);
    }
    if (body.reconciled !== undefined) {
      updates.push('reconciled = ?');
      values.push(body.reconciled ? 1 : 0);
      if (body.reconciled) {
        updates.push("reconciled_at = datetime('now')");
      }
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE payment_transactions SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?,?,'update_payment','payment_transaction',?,?,?)
    `).bind(
      generateId(), user.sub, id, JSON.stringify(body),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to update payment' }, 500);
  }
});

// POST /payments/credit-note — Issue a credit note (admin only)
payments.post('/credit-note', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      invoice_id: string;
      amount_cents: number;
      reason: string;
    };

    if (!body.invoice_id || !body.amount_cents || !body.reason) {
      return c.json({ success: false, error: 'invoice_id, amount_cents, and reason are required' }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO credit_notes (id, invoice_id, amount_cents, reason, issued_by, status, created_at)
      VALUES (?,?,?,?,?,'issued',datetime('now'))
    `).bind(id, body.invoice_id, body.amount_cents, body.reason, user.sub).run();

    return c.json({ success: true, data: { id } }, 201);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to issue credit note' }, 500);
  }
});

// GET /payments/credit-notes — List credit notes (admin only)
payments.get('/credit-notes', authMiddleware({ roles: ['admin'], adminLevel: 'admin' }), async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT cn.*, p.email as issued_by_email FROM credit_notes cn LEFT JOIN participants p ON cn.issued_by = p.id ORDER BY cn.created_at DESC LIMIT 100'
    ).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, error: 'Failed to list credit notes' }, 500);
  }
});

export default payments;
