/**
 * ENTITY GRAPH ENDPOINT — Cross-module entity relationship resolver
 * Given any entity (trade, contract, project, credit, participant, invoice, escrow),
 * returns that entity PLUS all related entities from every connected module.
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';

const entity = new Hono<HonoEnv>();
entity.use('*', authMiddleware());

// ─── GET /entity/:type/:id ──────────────────────────────────────────────────
entity.get('/:type/:id', async (c) => {
  const { type, id } = c.req.param();
  const user = c.get('user');
  const db = c.env.DB;

  try {
    let data: unknown = null;
    switch (type) {
      case 'trade':
        data = await getTradeGraph(id, user, db);
        break;
      case 'contract':
        data = await getContractGraph(id, user, db);
        break;
      case 'project':
        data = await getProjectGraph(id, user, db);
        break;
      case 'credit':
        data = await getCreditGraph(id, user, db);
        break;
      case 'participant':
        data = await getParticipantGraph(id, user, db);
        break;
      case 'invoice':
        data = await getInvoiceGraph(id, user, db);
        break;
      case 'escrow':
        data = await getEscrowGraph(id, user, db);
        break;
      default:
        return c.json({ success: false, error: 'Unknown entity type. Valid types: trade, contract, project, credit, participant, invoice, escrow' }, 400);
    }

    if (!data) {
      return c.json({ success: false, error: 'Entity not found or access denied' }, 404);
    }

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Entity graph error:', err);
    return c.json({ success: false, error: 'Failed to load entity graph' }, 500);
  }
});

// ─── TRADE GRAPH ─────────────────────────────────────────────────────────────
async function getTradeGraph(tradeId: string, user: { sub: string; role: string }, db: D1Database) {
  const trade = await db.prepare('SELECT * FROM trades WHERE id = ?').bind(tradeId).first();
  if (!trade) return null;

  // Access check: user must be buyer, seller, or admin
  if (user.role !== 'admin' && trade.buyer_id !== user.sub && trade.seller_id !== user.sub) return null;

  const [buyer, seller, escrow, invoice, fees, dispute, audit, contract] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type, kyc_status FROM participants WHERE id = ?').bind(trade.buyer_id).first(),
    db.prepare('SELECT id, company_name, participant_type, kyc_status FROM participants WHERE id = ?').bind(trade.seller_id).first(),
    db.prepare('SELECT * FROM escrows WHERE trade_id = ?').bind(tradeId).first(),
    db.prepare('SELECT * FROM invoices WHERE trade_id = ?').bind(tradeId).first(),
    db.prepare("SELECT * FROM fees WHERE entity_type = 'trade' AND entity_id = ?").bind(tradeId).all(),
    db.prepare("SELECT * FROM disputes WHERE related_trade_id = ? AND status != 'withdrawn'").bind(tradeId).first(),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'trade' AND entity_id = ? ORDER BY created_at DESC LIMIT 20").bind(tradeId).all(),
    trade.contract_id
      ? db.prepare('SELECT id, title, doc_type, phase, created_at FROM contract_documents WHERE id = ?').bind(trade.contract_id).first()
      : db.prepare(
          "SELECT cd.id, cd.title, cd.doc_type, cd.phase, cd.created_at FROM contract_documents cd WHERE cd.phase = 'active' AND ((cd.creator_id = ? AND cd.counterparty_id = ?) OR (cd.creator_id = ? AND cd.counterparty_id = ?)) LIMIT 1"
        ).bind(trade.buyer_id, trade.seller_id, trade.seller_id, trade.buyer_id).first(),
  ]);

  return {
    entity: trade,
    entity_type: 'trade',
    related: {
      buyer,
      seller,
      escrow,
      invoice,
      fees: fees.results,
      dispute,
      contract,
      audit_trail: audit.results,
    },
    timeline: buildTradeTimeline(trade, escrow, invoice, dispute),
  };
}

// ─── CONTRACT GRAPH ──────────────────────────────────────────────────────────
async function getContractGraph(docId: string, user: { sub: string; role: string }, db: D1Database) {
  const doc = await db.prepare('SELECT * FROM contract_documents WHERE id = ?').bind(docId).first();
  if (!doc) return null;

  // Access check: user must be creator, counterparty, signatory, or admin
  if (user.role !== 'admin' && doc.creator_id !== user.sub && doc.counterparty_id !== user.sub) {
    const isSigner = await db.prepare('SELECT 1 FROM document_signatories WHERE document_id = ? AND participant_id = ?').bind(docId, user.sub).first();
    if (!isSigner) return null;
  }

  const counterpartyId = (doc.counterparty_id || '') as string;
  const creatorId = (doc.creator_id || '') as string;
  const parentId = (doc.parent_contract_id || docId) as string;
  const projectId = doc.related_project_id as string | null;

  const [creator, counterparty, signatories, checks, trades, invoices, escrows, rules, versions, project, audit] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(creatorId).first(),
    counterpartyId ? db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(counterpartyId).first() : Promise.resolve(null),
    db.prepare('SELECT * FROM document_signatories WHERE document_id = ?').bind(docId).all(),
    db.prepare("SELECT * FROM statutory_checks WHERE entity_type = 'document' AND entity_id = ?").bind(docId).all(),
    db.prepare('SELECT id, market, volume, price_cents, total_cents, status, created_at FROM trades WHERE contract_id = ? ORDER BY created_at DESC LIMIT 20').bind(docId).all(),
    db.prepare('SELECT * FROM invoices WHERE contract_doc_id = ? ORDER BY created_at DESC').bind(docId).all(),
    db.prepare("SELECT * FROM escrows WHERE trade_id IN (SELECT id FROM trades WHERE contract_id = ?)").bind(docId).all(),
    db.prepare('SELECT * FROM smart_contract_rules WHERE contract_doc_id = ?').bind(docId).all(),
    db.prepare('SELECT id, version, phase, created_at FROM contract_documents WHERE parent_contract_id = ? OR id = ? ORDER BY created_at').bind(parentId, docId).all(),
    projectId ? db.prepare('SELECT id, name, status, capacity_mw, technology FROM projects WHERE id = ?').bind(projectId).first() : Promise.resolve(null),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'contract' AND entity_id = ? ORDER BY created_at DESC LIMIT 30").bind(docId).all(),
  ]);

  // Aggregate financials
  const totalInvoicedCents = invoices.results.reduce((sum: number, inv: Record<string, unknown>) => sum + (Number(inv.total_cents) || 0), 0);
  const outstandingCents = invoices.results.filter((inv: Record<string, unknown>) => inv.status === 'outstanding' || inv.status === 'overdue')
    .reduce((sum: number, inv: Record<string, unknown>) => sum + (Number(inv.total_cents) || 0), 0);

  return {
    entity: doc,
    entity_type: 'contract',
    related: {
      creator,
      counterparty,
      signatories: signatories.results,
      statutory_checks: checks.results,
      trades: trades.results,
      invoices: invoices.results,
      escrows: escrows.results,
      smart_rules: rules.results,
      version_chain: versions.results,
      project,
      audit_trail: audit.results,
    },
    stats: {
      total_invoiced_cents: totalInvoicedCents,
      outstanding_cents: outstandingCents,
      trade_count: trades.results.length,
    },
    timeline: buildContractTimeline(doc, signatories.results, checks.results),
  };
}

// ─── PROJECT GRAPH ───────────────────────────────────────────────────────────
async function getProjectGraph(projectId: string, user: { sub: string; role: string }, db: D1Database) {
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first();
  if (!project) return null;

  // Access check: user must be associated with the project or admin
  if (user.role !== 'admin' && project.participant_id !== user.sub && project.lender_id !== user.sub
    && project.grid_operator_id !== user.sub && project.offtaker_id !== user.sub) return null;

  const participantId = (project.participant_id || '') as string;
  const lenderId = project.lender_id as string | null;
  const gridId = project.grid_operator_id as string | null;
  const offtakerId = project.offtaker_id as string | null;

  const [developer, lender, grid, offtaker, milestones, cps, disbursements, contracts, metering, recs, forecasts, audit] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(participantId).first(),
    lenderId ? db.prepare('SELECT id, company_name FROM participants WHERE id = ?').bind(lenderId).first() : Promise.resolve(null),
    gridId ? db.prepare('SELECT id, company_name FROM participants WHERE id = ?').bind(gridId).first() : Promise.resolve(null),
    offtakerId ? db.prepare('SELECT id, company_name FROM participants WHERE id = ?').bind(offtakerId).first() : Promise.resolve(null),
    db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY sequence').bind(projectId).all(),
    db.prepare('SELECT * FROM conditions_precedent WHERE project_id = ?').bind(projectId).all(),
    db.prepare('SELECT * FROM disbursements WHERE project_id = ? ORDER BY created_at').bind(projectId).all(),
    db.prepare("SELECT id, title, doc_type, phase, created_at FROM contract_documents WHERE related_project_id = ? ORDER BY created_at").bind(projectId).all(),
    db.prepare("SELECT * FROM meter_readings WHERE project_id = ? ORDER BY reading_timestamp DESC LIMIT 96").bind(projectId).all(),
    db.prepare('SELECT * FROM recs WHERE project_id = ? ORDER BY created_at DESC').bind(projectId).all(),
    db.prepare('SELECT * FROM generation_forecasts WHERE project_id = ? ORDER BY forecast_date DESC LIMIT 7').bind(projectId).all(),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'project' AND entity_id = ? ORDER BY created_at DESC LIMIT 30").bind(projectId).all(),
  ]);

  const cpSatisfied = cps.results.filter((cp: Record<string, unknown>) => cp.status === 'satisfied' || cp.status === 'waived').length;
  const totalDisbursedCents = disbursements.results.filter((d: Record<string, unknown>) => d.status === 'approved')
    .reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.amount_cents) || 0), 0);
  const totalGeneratedMwh = metering.results.reduce((sum: number, m: Record<string, unknown>) => sum + (Number(m.value_kwh || m.kwh_generated) || 0), 0) / 1000;

  return {
    entity: project,
    entity_type: 'project',
    related: {
      developer,
      lender,
      grid_operator: grid,
      offtaker,
      milestones: milestones.results,
      conditions_precedent: cps.results,
      disbursements: disbursements.results,
      contracts: contracts.results,
      meter_readings: metering.results,
      recs: recs.results,
      forecasts: forecasts.results,
      audit_trail: audit.results,
    },
    stats: {
      cp_progress: `${cpSatisfied}/${cps.results.length}`,
      total_disbursed_cents: totalDisbursedCents,
      total_generated_mwh: totalGeneratedMwh,
      recs_issued: recs.results.length,
    },
  };
}

// ─── CREDIT GRAPH ────────────────────────────────────────────────────────────
async function getCreditGraph(creditId: string, user: { sub: string; role: string }, db: D1Database) {
  const credit = await db.prepare('SELECT * FROM carbon_credits WHERE id = ?').bind(creditId).first();
  if (!credit) return null;

  if (user.role !== 'admin' && credit.owner_id !== user.sub) return null;

  const [owner, token, trades, retirement, project, audit] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(credit.owner_id).first(),
    db.prepare('SELECT * FROM tokens WHERE source_type = ? AND source_id = ?').bind('carbon_credit', creditId).first(),
    db.prepare("SELECT * FROM trades WHERE market = 'carbon' AND (buyer_id = ? OR seller_id = ?) ORDER BY created_at DESC LIMIT 10").bind(credit.owner_id, credit.owner_id).all(),
    credit.status === 'retired' ? db.prepare("SELECT * FROM audit_log WHERE entity_type = 'credit' AND entity_id = ? AND action = 'credit.retired' LIMIT 1").bind(creditId).first() : Promise.resolve(null),
    credit.project_id ? db.prepare('SELECT id, name, status, capacity_mw, technology FROM projects WHERE id = ?').bind(credit.project_id).first() : Promise.resolve(null),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'credit' AND entity_id = ? ORDER BY created_at DESC LIMIT 20").bind(creditId).all(),
  ]);

  return {
    entity: credit,
    entity_type: 'credit',
    related: {
      owner,
      token,
      trades: trades.results,
      retirement,
      project,
      audit_trail: audit.results,
    },
  };
}

// ─── PARTICIPANT GRAPH ───────────────────────────────────────────────────────
async function getParticipantGraph(participantId: string, user: { sub: string; role: string }, db: D1Database) {
  const participant = await db.prepare('SELECT * FROM participants WHERE id = ?').bind(participantId).first();
  if (!participant) return null;

  // Access check: user must be self or admin
  if (user.role !== 'admin' && participantId !== user.sub) return null;

  const [projects, contracts, tradesBuy, tradesSell, credits, invoicesPayable, invoicesReceivable, escrows, disputes, notifications, fees] = await Promise.all([
    db.prepare('SELECT id, name, status, capacity_mw, technology FROM projects WHERE participant_id = ? OR lender_id = ? OR grid_operator_id = ? OR offtaker_id = ?').bind(participantId, participantId, participantId, participantId).all(),
    db.prepare('SELECT id, title, doc_type, phase, created_at FROM contract_documents WHERE creator_id = ? OR counterparty_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId, participantId).all(),
    db.prepare('SELECT id, market, volume, price_cents, total_cents, status, created_at FROM trades WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
    db.prepare('SELECT id, market, volume, price_cents, total_cents, status, created_at FROM trades WHERE seller_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
    db.prepare('SELECT id, amount_tonnes, standard, status, created_at FROM carbon_credits WHERE owner_id = ?').bind(participantId).all(),
    db.prepare('SELECT id, invoice_number, total_cents, status, due_date FROM invoices WHERE to_participant_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
    db.prepare('SELECT id, invoice_number, total_cents, status, due_date FROM invoices WHERE from_participant_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
    db.prepare('SELECT * FROM escrows WHERE depositor_id = ? OR beneficiary_id = ? ORDER BY created_at DESC LIMIT 10').bind(participantId, participantId).all(),
    db.prepare("SELECT * FROM disputes WHERE filed_by = ? OR respondent_id = ? ORDER BY created_at DESC LIMIT 10").bind(participantId, participantId).all(),
    db.prepare('SELECT id, title, type, read, created_at FROM notifications WHERE participant_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
    db.prepare('SELECT * FROM fees WHERE participant_id = ? ORDER BY created_at DESC LIMIT 20').bind(participantId).all(),
  ]);

  return {
    entity: { ...participant, password_hash: undefined },
    entity_type: 'participant',
    related: {
      projects: projects.results,
      contracts: contracts.results,
      trades_as_buyer: tradesBuy.results,
      trades_as_seller: tradesSell.results,
      credits: credits.results,
      invoices_payable: invoicesPayable.results,
      invoices_receivable: invoicesReceivable.results,
      escrows: escrows.results,
      disputes: disputes.results,
      recent_notifications: notifications.results,
      fees: fees.results,
    },
    stats: {
      total_projects: projects.results.length,
      active_contracts: contracts.results.filter((c: Record<string, unknown>) => c.phase === 'active').length,
      total_trades: tradesBuy.results.length + tradesSell.results.length,
      total_credits_tonnes: credits.results.reduce((sum: number, cr: Record<string, unknown>) => sum + (Number(cr.amount_tonnes) || 0), 0),
    },
  };
}

// ─── INVOICE GRAPH ───────────────────────────────────────────────────────────
async function getInvoiceGraph(invoiceId: string, user: { sub: string; role: string }, db: D1Database) {
  const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').bind(invoiceId).first();
  if (!invoice) return null;

  if (user.role !== 'admin' && invoice.from_participant_id !== user.sub && invoice.to_participant_id !== user.sub) return null;

  const [from, to, trade, escrow, contract, fees, audit] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(invoice.from_participant_id).first(),
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(invoice.to_participant_id).first(),
    invoice.trade_id ? db.prepare('SELECT id, market, volume, price_cents, total_cents, status FROM trades WHERE id = ?').bind(invoice.trade_id).first() : Promise.resolve(null),
    invoice.trade_id ? db.prepare('SELECT * FROM escrows WHERE trade_id = ?').bind(invoice.trade_id).first() : Promise.resolve(null),
    invoice.contract_doc_id ? db.prepare('SELECT id, title, doc_type, phase FROM contract_documents WHERE id = ?').bind(invoice.contract_doc_id).first() : Promise.resolve(null),
    db.prepare("SELECT * FROM fees WHERE entity_type = 'invoice' AND entity_id = ?").bind(invoiceId).all(),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'invoice' AND entity_id = ? ORDER BY created_at DESC LIMIT 20").bind(invoiceId).all(),
  ]);

  return {
    entity: invoice,
    entity_type: 'invoice',
    related: {
      from_participant: from,
      to_participant: to,
      trade,
      escrow,
      contract,
      fees: fees.results,
      audit_trail: audit.results,
    },
    timeline: buildInvoiceTimeline(invoice, trade, escrow),
  };
}

// ─── ESCROW GRAPH ────────────────────────────────────────────────────────────
async function getEscrowGraph(escrowId: string, user: { sub: string; role: string }, db: D1Database) {
  const escrow = await db.prepare('SELECT * FROM escrows WHERE id = ?').bind(escrowId).first();
  if (!escrow) return null;

  if (user.role !== 'admin' && escrow.depositor_id !== user.sub && escrow.beneficiary_id !== user.sub) return null;

  const [depositor, beneficiary, trade, invoice, audit] = await Promise.all([
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(escrow.depositor_id).first(),
    db.prepare('SELECT id, company_name, participant_type FROM participants WHERE id = ?').bind(escrow.beneficiary_id).first(),
    escrow.trade_id ? db.prepare('SELECT id, market, volume, price_cents, total_cents, status FROM trades WHERE id = ?').bind(escrow.trade_id).first() : Promise.resolve(null),
    escrow.trade_id ? db.prepare('SELECT * FROM invoices WHERE trade_id = ?').bind(escrow.trade_id).first() : Promise.resolve(null),
    db.prepare("SELECT * FROM audit_log WHERE entity_type = 'escrow' AND entity_id = ? ORDER BY created_at DESC LIMIT 20").bind(escrowId).all(),
  ]);

  return {
    entity: escrow,
    entity_type: 'escrow',
    related: {
      depositor,
      beneficiary,
      trade,
      invoice,
      audit_trail: audit.results,
    },
  };
}

// ─── TIMELINE BUILDERS ──────────────────────────────────────────────────────

interface TimelineEvent {
  time: string;
  type: string;
  label: string;
  detail: string;
}

function buildTradeTimeline(
  trade: Record<string, unknown>,
  escrow: Record<string, unknown> | null,
  invoice: Record<string, unknown> | null,
  dispute: Record<string, unknown> | null,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const createdAt = (trade.created_at || '') as string;
  const updatedAt = (trade.updated_at || createdAt) as string;
  const volume = trade.volume ?? 0;
  const priceCents = Number(trade.price_cents) || 0;
  const feeCents = Number(trade.fee_cents) || 0;

  events.push({
    time: createdAt,
    type: 'trade_created',
    label: 'Trade Matched',
    detail: `${volume} MWh @ R${(priceCents / 100).toFixed(2)}`,
  });

  if (feeCents > 0) {
    events.push({
      time: createdAt,
      type: 'fee_charged',
      label: 'Platform Fee',
      detail: `R${(feeCents / 100).toFixed(2)}`,
    });
  }

  if (escrow) {
    events.push({
      time: (escrow.created_at || createdAt) as string,
      type: 'escrow_created',
      label: `Escrow ${(escrow.status || 'created') as string}`,
      detail: `R${(Number(escrow.amount_cents) / 100).toFixed(2)}`,
    });
  }

  if (invoice) {
    events.push({
      time: (invoice.created_at || createdAt) as string,
      type: 'invoice_generated',
      label: `Invoice ${(invoice.invoice_number || '') as string}`,
      detail: `R${(Number(invoice.total_cents) / 100).toFixed(2)} due ${(invoice.due_date || '') as string}`,
    });
  }

  if (dispute) {
    events.push({
      time: (dispute.created_at || createdAt) as string,
      type: 'dispute_filed',
      label: 'Dispute Filed',
      detail: (dispute.category || dispute.reason || '') as string,
    });
  }

  if (trade.status === 'settled') {
    events.push({ time: updatedAt, type: 'settled', label: 'Trade Settled', detail: '' });
  }

  return events.sort((a, b) => a.time.localeCompare(b.time));
}

function buildContractTimeline(
  doc: Record<string, unknown>,
  signatories: Record<string, unknown>[],
  checks: Record<string, unknown>[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const createdAt = (doc.created_at || '') as string;

  events.push({
    time: createdAt,
    type: 'contract_created',
    label: 'Contract Created',
    detail: `${(doc.doc_type || '') as string} — ${(doc.title || '') as string}`,
  });

  for (const sig of signatories) {
    if (sig.signed_at) {
      events.push({
        time: (sig.signed_at || createdAt) as string,
        type: 'signature',
        label: `Signed by ${(sig.signer_name || sig.participant_id || 'party') as string}`,
        detail: '',
      });
    }
  }

  for (const check of checks) {
    events.push({
      time: (check.checked_at || check.created_at || createdAt) as string,
      type: 'statutory_check',
      label: `${(check.check_type || 'Check') as string}: ${(check.status || 'pending') as string}`,
      detail: (check.reason || '') as string,
    });
  }

  if (doc.phase === 'active') {
    events.push({
      time: (doc.updated_at || createdAt) as string,
      type: 'contract_active',
      label: 'Contract Activated',
      detail: '',
    });
  }

  return events.sort((a, b) => a.time.localeCompare(b.time));
}

function buildInvoiceTimeline(
  invoice: Record<string, unknown>,
  trade: Record<string, unknown> | null,
  escrow: Record<string, unknown> | null,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const createdAt = (invoice.created_at || '') as string;

  if (trade) {
    events.push({
      time: (trade.created_at || createdAt) as string,
      type: 'trade_created',
      label: 'Originating Trade',
      detail: `${trade.volume ?? 0} MWh @ R${(Number(trade.price_cents) / 100).toFixed(2)}`,
    });
  }

  events.push({
    time: createdAt,
    type: 'invoice_generated',
    label: `Invoice ${(invoice.invoice_number || '') as string} Generated`,
    detail: `R${(Number(invoice.total_cents) / 100).toFixed(2)} due ${(invoice.due_date || '') as string}`,
  });

  if (escrow) {
    events.push({
      time: (escrow.created_at || createdAt) as string,
      type: 'escrow_status',
      label: `Escrow ${(escrow.status || '') as string}`,
      detail: `R${(Number(escrow.amount_cents) / 100).toFixed(2)}`,
    });
  }

  if (invoice.status === 'paid') {
    events.push({
      time: (invoice.updated_at || createdAt) as string,
      type: 'invoice_paid',
      label: 'Invoice Paid',
      detail: '',
    });
  }

  return events.sort((a, b) => a.time.localeCompare(b.time));
}

export default entity;
