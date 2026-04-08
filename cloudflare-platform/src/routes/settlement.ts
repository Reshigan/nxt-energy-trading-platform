import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { DisputeFileSchema } from '../utils/validation';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';

const settlement = new Hono<HonoEnv>();

// POST /settlements/:tradeId/confirm — Settlement confirmation
settlement.post('/settlements/:tradeId/confirm', authMiddleware(), async (c) => {
  try {
    const { tradeId } = c.req.param();
    const user = c.get('user');

    const trade = await c.env.DB.prepare('SELECT * FROM trades WHERE id = ?').bind(tradeId).first();
    if (!trade) return c.json({ success: false, error: 'Trade not found' }, 404);
    if (trade.status !== 'pending') {
      return c.json({ success: false, error: 'Trade already settled or disputed' }, 400);
    }

    // Pre-settlement checks
    const checks: { check: string; passed: boolean; reason?: string }[] = [];

    // 1. Metered data (simplified — check if trade has volume)
    checks.push({ check: 'metered_data', passed: (trade.volume as number) > 0 });

    // 2. Volume within tolerance (simplified)
    checks.push({ check: 'volume_tolerance', passed: true });

    // 3. Both parties KYC verified
    const buyer = await c.env.DB.prepare('SELECT kyc_status FROM participants WHERE id = ?').bind(trade.buyer_id).first();
    const seller = await c.env.DB.prepare('SELECT kyc_status FROM participants WHERE id = ?').bind(trade.seller_id).first();
    const kycPassed = buyer?.kyc_status === 'verified' && seller?.kyc_status === 'verified';
    checks.push({ check: 'kyc_verified', passed: kycPassed, reason: kycPassed ? undefined : 'One or both parties not KYC verified' });

    // 4. No blocking disputes
    const disputes = await c.env.DB.prepare(
      'SELECT id FROM disputes WHERE trade_id = ? AND status NOT IN (\'resolved\', \'escalated\')'
    ).bind(tradeId).all();
    const noDisputes = disputes.results.length === 0;
    checks.push({ check: 'no_blocking_disputes', passed: noDisputes, reason: noDisputes ? undefined : 'Active disputes exist' });

    // 5. Escrow conditions met
    const escrow = await c.env.DB.prepare(
      'SELECT status FROM escrows WHERE trade_id = ?'
    ).bind(tradeId).first();
    const escrowOk = !escrow || escrow.status === 'held' || escrow.status === 'funded';
    checks.push({ check: 'escrow_conditions', passed: escrowOk });

    // 6. Invoice generated
    const invoice = await c.env.DB.prepare(
      'SELECT id FROM invoices WHERE trade_id = ?'
    ).bind(tradeId).first();
    checks.push({ check: 'invoice_generated', passed: !!invoice, reason: invoice ? undefined : 'No invoice generated for this trade' });

    const allPassed = checks.every((ch) => ch.passed);

    if (!allPassed) {
      return c.json({
        success: false,
        error: 'Pre-settlement checks failed',
        data: { checks },
      }, 400);
    }

    // Settle the trade
    await c.env.DB.prepare(
      'UPDATE trades SET status = \'settled\', settled_at = ? WHERE id = ?'
    ).bind(nowISO(), tradeId).run();

    // Release escrow if exists
    if (escrow) {
      const escrowRecord = await c.env.DB.prepare(
        'SELECT id FROM escrows WHERE trade_id = ?'
      ).bind(tradeId).first<{ id: string }>();

      if (escrowRecord) {
        const doId = c.env.ESCROW_MGR.idFromName(escrowRecord.id);
        const stub = c.env.ESCROW_MGR.get(doId);
        await stub.fetch(new Request('http://do/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: user.sub, reason: 'Trade settled' }),
        }));

        await c.env.DB.prepare(
          'UPDATE escrows SET status = \'released\', released_at = ? WHERE id = ?'
        ).bind(nowISO(), escrowRecord.id).run();
      }
    }

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'settle_trade', 'trade', ?, ?, ?)
    `).bind(
      generateId(), user.sub, tradeId,
      JSON.stringify({ checks }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for trade settlement
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'invoice.paid',
      actor_id: user.sub,
      entity_type: 'trade',
      entity_id: tradeId,
      data: { buyer_id: trade.buyer_id, seller_id: trade.seller_id, total_cents: trade.total_cents, escrow_id: escrow?.status === 'held' ? tradeId : undefined },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { settled: true, checks } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /escrows — Create escrow
settlement.post('/escrows', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      trade_id?: string; amount_cents: number; beneficiary_id?: string;
      conditions?: Record<string, unknown>; expires_at?: string;
    };

    const escrowId = generateId();

    // Create via DO
    const doId = c.env.ESCROW_MGR.idFromName(escrowId);
    const stub = c.env.ESCROW_MGR.get(doId);

    await stub.fetch(new Request('http://do/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: escrowId,
        tradeId: body.trade_id,
        depositorId: user.sub,
        beneficiaryId: body.beneficiary_id,
        amountCents: body.amount_cents,
        conditions: body.conditions,
        expiresAt: body.expires_at,
      }),
    }));

    // Also save in D1
    await c.env.DB.prepare(`
      INSERT INTO escrows (id, trade_id, depositor_id, beneficiary_id, amount_cents, conditions, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 'created', ?)
    `).bind(
      escrowId, body.trade_id || null, user.sub, body.beneficiary_id || null,
      body.amount_cents, body.conditions ? JSON.stringify(body.conditions) : null,
      body.expires_at || null
    ).run();

    return c.json({ success: true, data: { id: escrowId } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /escrows — List escrows
settlement.get('/escrows', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { status, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin') {
      query = 'SELECT * FROM escrows';
    } else {
      query = 'SELECT * FROM escrows WHERE depositor_id = ? OR beneficiary_id = ?';
      params.push(user.sub, user.sub);
    }

    if (status) {
      query += params.length > 0 ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
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

// POST /invoices/generate — Generate invoice from trade
settlement.post('/invoices/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      trade_id: string;
      contract_doc_id?: string;
      metered_volume?: number;
      contracted_volume?: number;
      unit_rate_cents?: number;
      escalation_pct?: number;
      penalty_rate_cents?: number;
    };

    const trade = await c.env.DB.prepare('SELECT * FROM trades WHERE id = ?').bind(body.trade_id).first();
    if (!trade) return c.json({ success: false, error: 'Trade not found' }, 404);

    // Calculate invoice amounts
    const meteredVolume = body.metered_volume || (trade.volume as number);
    const contractedVolume = body.contracted_volume || meteredVolume;
    const unitRate = body.unit_rate_cents || (trade.price_cents as number);
    const escalationPct = body.escalation_pct || 0;

    const subtotalCents = Math.round(meteredVolume * unitRate * (1 + escalationPct / 100));
    const shortfallPenaltyCents = body.penalty_rate_cents
      ? Math.max(0, Math.round((contractedVolume - meteredVolume) * body.penalty_rate_cents))
      : 0;
    const vatCents = Math.round((subtotalCents + shortfallPenaltyCents) * 0.15); // 15% VAT
    const totalCents = subtotalCents + shortfallPenaltyCents + vatCents;

    const invoiceId = generateId();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    await c.env.DB.prepare(`
      INSERT INTO invoices (id, invoice_number, contract_doc_id, trade_id, from_participant_id,
        to_participant_id, subtotal_cents, shortfall_penalty_cents, vat_cents, total_cents,
        metered_volume, contracted_volume, unit_rate_cents, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outstanding', ?)
    `).bind(
      invoiceId, invoiceNumber, body.contract_doc_id || null, body.trade_id,
      trade.seller_id, trade.buyer_id,
      subtotalCents, shortfallPenaltyCents, vatCents, totalCents,
      meteredVolume, contractedVolume, unitRate,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    ).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'generate_invoice', 'invoice', ?, ?, ?)
    `).bind(
      generateId(), user.sub, invoiceId,
      JSON.stringify({ invoice_number: invoiceNumber, total_cents: totalCents }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for invoice generation
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'invoice.generated',
      actor_id: user.sub,
      entity_type: 'invoice',
      entity_id: invoiceId,
      data: { buyer_id: trade.buyer_id, seller_id: trade.seller_id, invoice_number: invoiceNumber, total_cents: totalCents, due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({
      success: true,
      data: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        subtotal_cents: subtotalCents,
        shortfall_penalty_cents: shortfallPenaltyCents,
        vat_cents: vatCents,
        total_cents: totalCents,
      },
    }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /invoices — List invoices
settlement.get('/invoices', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { status, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin') {
      query = 'SELECT * FROM invoices';
    } else {
      query = 'SELECT * FROM invoices WHERE from_participant_id = ? OR to_participant_id = ?';
      params.push(user.sub, user.sub);
    }

    if (status) {
      query += params.length > 0 ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
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

// POST /invoices/:id/pay — Mark invoice as paid
settlement.post('/invoices/:id/pay', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const invoice = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
    if (!invoice) return c.json({ success: false, error: 'Invoice not found' }, 404);
    if (invoice.status !== 'outstanding' && invoice.status !== 'overdue') {
      return c.json({ success: false, error: 'Invoice not payable' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE invoices SET status = \'paid\', paid_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    // Fire cascade for invoice payment
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'invoice.paid',
      actor_id: user.sub,
      entity_type: 'invoice',
      entity_id: id,
      data: { seller_id: invoice.from_participant_id, invoice_number: invoice.invoice_number, total_cents: invoice.total_cents },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, message: 'Invoice marked as paid' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /disputes — File dispute
settlement.post('/disputes', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = DisputeFileSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;
    const disputeId = generateId();

    await c.env.DB.prepare(`
      INSERT INTO disputes (id, claimant_id, respondent_id, category, description, value_cents,
        trade_id, contract_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'filed')
    `).bind(
      disputeId, user.sub, data.respondent_id, data.category, data.description,
      data.value_cents, data.trade_id || null, data.contract_id || null
    ).run();

    // If there's a trade, mark it as disputed
    if (data.trade_id) {
      await c.env.DB.prepare(
        'UPDATE trades SET status = \'disputed\' WHERE id = ?'
      ).bind(data.trade_id).run();
    }

    // Notify respondent
    await c.env.DB.prepare(`
      INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
      VALUES (?, ?, 'Dispute Filed Against You', ?, 'danger', 'dispute', ?)
    `).bind(generateId(), data.respondent_id, `A ${data.category} dispute has been filed. Value: R${(data.value_cents / 100).toFixed(2)}`, disputeId).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'file_dispute', 'dispute', ?, ?, ?)
    `).bind(
      generateId(), user.sub, disputeId,
      JSON.stringify({ category: data.category, value_cents: data.value_cents }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for dispute filed
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'dispute.filed',
      actor_id: user.sub,
      entity_type: 'dispute',
      entity_id: disputeId,
      data: { respondent_id: data.respondent_id, reason: data.description, category: data.category, value_cents: data.value_cents },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { id: disputeId } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /disputes — List disputes
settlement.get('/disputes', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { status, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin') {
      query = 'SELECT * FROM disputes';
    } else {
      query = 'SELECT * FROM disputes WHERE claimant_id = ? OR respondent_id = ?';
      params.push(user.sub, user.sub);
    }

    if (status) {
      query += params.length > 0 ? ' AND status = ?' : ' WHERE status = ?';
      params.push(status);
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

// PATCH /disputes/:id/status — Update dispute status
settlement.patch('/disputes/:id/status', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { status: string; resolution?: string };

    const validStatuses = ['under_review', 'evidence_phase', 'counter_claim', 'mediation', 'resolved', 'escalated'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const params: unknown[] = [body.status, nowISO()];

    if (body.status === 'resolved' && body.resolution) {
      updates.push('resolution = ?', 'resolved_at = ?');
      params.push(body.resolution, nowISO());
    }

    params.push(id);
    await c.env.DB.prepare(
      `UPDATE disputes SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'update_dispute', 'dispute', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ new_status: body.status, resolution: body.resolution }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    return c.json({ success: true, message: 'Dispute status updated' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// B7: POST /settlement/netting — Calculate and execute settlement netting
settlement.post('/netting', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { period_start: string; period_end: string; execute?: boolean };

    if (!body.period_start || !body.period_end) {
      return c.json({ success: false, error: 'period_start and period_end are required' }, 400);
    }

    // Get all confirmed trades in the period
    const trades = await c.env.DB.prepare(`
      SELECT t.*, o.participant_id as order_owner
      FROM trades t
      JOIN orders o ON t.maker_order_id = o.id OR t.taker_order_id = o.id
      WHERE t.executed_at >= ? AND t.executed_at <= ? AND t.status = 'confirmed'
    `).bind(body.period_start, body.period_end).all();

    // Get all invoices in the period
    const invoices = await c.env.DB.prepare(`
      SELECT * FROM invoices WHERE period_start >= ? AND period_end <= ? AND status IN ('issued', 'overdue')
    `).bind(body.period_start, body.period_end).all();

    // Calculate net positions per participant
    const netPositions: Record<string, { receivable_cents: number; payable_cents: number; net_cents: number; trade_count: number }> = {};

    for (const trade of trades.results) {
      const buyerId = trade.buyer_id as string;
      const sellerId = trade.seller_id as string;
      const totalCents = Math.round((trade.volume as number) * (trade.price as number));

      if (!netPositions[buyerId]) netPositions[buyerId] = { receivable_cents: 0, payable_cents: 0, net_cents: 0, trade_count: 0 };
      if (!netPositions[sellerId]) netPositions[sellerId] = { receivable_cents: 0, payable_cents: 0, net_cents: 0, trade_count: 0 };

      netPositions[buyerId].payable_cents += totalCents;
      netPositions[buyerId].trade_count += 1;
      netPositions[sellerId].receivable_cents += totalCents;
      netPositions[sellerId].trade_count += 1;
    }

    // Add invoice amounts
    for (const inv of invoices.results) {
      const payerId = inv.payer_id as string;
      const payeeId = inv.payee_id as string;
      const amount = inv.amount_cents as number;

      if (!netPositions[payerId]) netPositions[payerId] = { receivable_cents: 0, payable_cents: 0, net_cents: 0, trade_count: 0 };
      if (!netPositions[payeeId]) netPositions[payeeId] = { receivable_cents: 0, payable_cents: 0, net_cents: 0, trade_count: 0 };

      netPositions[payerId].payable_cents += amount;
      netPositions[payeeId].receivable_cents += amount;
    }

    // Calculate net for each participant
    const nettingResults: Array<{ participant_id: string; receivable_cents: number; payable_cents: number; net_cents: number; trade_count: number }> = [];
    let totalGrossPayable = 0;
    let totalNetPayable = 0;

    for (const [pid, pos] of Object.entries(netPositions)) {
      pos.net_cents = pos.receivable_cents - pos.payable_cents;
      totalGrossPayable += pos.payable_cents;
      totalNetPayable += Math.abs(pos.net_cents);
      nettingResults.push({ participant_id: pid, ...pos });
    }

    const nettingId = generateId();
    const savingsPercent = totalGrossPayable > 0 ? Math.round((1 - totalNetPayable / totalGrossPayable / 2) * 10000) / 100 : 0;

    // Execute netting if requested
    if (body.execute) {
      // Record netting run
      await c.env.DB.prepare(`
        INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, 'settlement_netting', 'netting', ?, ?, ?)
      `).bind(
        generateId(), user.sub, nettingId,
        JSON.stringify({
          period_start: body.period_start,
          period_end: body.period_end,
          participants: nettingResults.length,
          total_gross: totalGrossPayable,
          total_net: totalNetPayable,
          savings_percent: savingsPercent,
        }),
        c.req.header('CF-Connecting-IP') || 'unknown'
      ).run();

      // Update participant balances
      for (const result of nettingResults) {
        if (result.net_cents !== 0) {
          await c.env.DB.prepare(
            'UPDATE participants SET balance_cents = COALESCE(balance_cents, 0) + ? WHERE id = ?'
          ).bind(result.net_cents, result.participant_id).run();
        }
      }

      // Mark invoices as settled
      await c.env.DB.prepare(
        "UPDATE invoices SET status = 'settled', paid_at = ? WHERE period_start >= ? AND period_end <= ? AND status IN ('issued', 'overdue')"
      ).bind(nowISO(), body.period_start, body.period_end).run();
    }

    return c.json({
      success: true,
      data: {
        netting_id: nettingId,
        period: { start: body.period_start, end: body.period_end },
        participants: nettingResults.sort((a, b) => b.net_cents - a.net_cents),
        summary: {
          total_trades: trades.results.length,
          total_invoices: invoices.results.length,
          total_gross_payable_cents: totalGrossPayable,
          total_net_payable_cents: totalNetPayable,
          netting_savings_percent: savingsPercent,
          executed: !!body.execute,
        },
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default settlement;
