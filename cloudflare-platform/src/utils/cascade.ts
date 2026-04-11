/**
 * CASCADE ENGINE — The single most important file in the platform.
 * Every route calls cascade() after its primary DB operation.
 * Handles: notifications, webhooks, emails, fees, KV writes, DO calls, cross-module effects.
 */
import { log } from './logger';
import { deliverWebhook } from './webhooks';
import { sendEmail } from './email';
import { AppBindings } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CascadeEvent {
  type: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  data: Record<string, unknown>;
  ip: string;
  request_id?: string;
}

type ActionType = 'notify' | 'webhook' | 'email' | 'fee' | 'kv_write' | 'do_call' | 'cross_module' | 'db_update';

interface CascadeAction {
  type: ActionType;
  execute: (env: AppBindings, event: CascadeEvent) => Promise<void>;
}

// ─── Helper: insert notification ─────────────────────────────────────────────

async function notifyParticipant(
  db: D1Database,
  participantId: string,
  title: string,
  body: string,
  type: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(id, participantId, title, body, type, entityType, entityId).run();
}

// ─── Helper: compute fee from fee_schedule ───────────────────────────────────

async function computeFee(
  db: D1Database,
  feeType: string,
  amountCents: number,
  participantId: string,
  entityType: string,
  entityId: string,
): Promise<number> {
  const schedule = await db.prepare(
    "SELECT rate as rate_bps, minimum_cents as min_cents, maximum_cents as max_cents FROM fee_schedule WHERE fee_type = ? AND active = 1"
  ).bind(feeType).first<{ rate_bps: number; min_cents: number | null; max_cents: number | null }>();

  if (!schedule) return 0;

  let feeCents = Math.round(amountCents * schedule.rate_bps / 10000);
  if (schedule.min_cents && feeCents < schedule.min_cents) feeCents = schedule.min_cents;
  if (schedule.max_cents && feeCents > schedule.max_cents) feeCents = schedule.max_cents;

  // Record the fee
  const feeId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO fees (id, participant_id, fee_type, amount_cents, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(feeId, participantId, feeType, feeCents, entityType, entityId).run();

  return feeCents;
}

// ─── Helper: get participant email ───────────────────────────────────────────

async function getParticipantEmail(db: D1Database, participantId: string): Promise<string | null> {
  const p = await db.prepare('SELECT email FROM participants WHERE id = ?').bind(participantId).first<{ email: string }>();
  return p?.email ?? null;
}

// ─── CASCADE MAP ─────────────────────────────────────────────────────────────

const CASCADE_MAP: Record<string, CascadeAction[]> = {

  // ── Trading ──────────────────────────────────────────────────────────────

  'trade.matched': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { buyer_id, seller_id, market, volume, price_cents } = event.data;
        const msg = `Trade matched: ${volume} MWh ${market} at R${(Number(price_cents) / 100).toFixed(2)}`;
        await notifyParticipant(env.DB, buyer_id as string, 'Trade Matched', msg, 'trading', 'trade', event.entity_id);
        await notifyParticipant(env.DB, seller_id as string, 'Trade Matched', msg, 'trading', 'trade', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'trade.executed', { trade_id: event.entity_id, ...event.data });
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { buyer_id, seller_id, market, volume, price_cents } = event.data;
        for (const pid of [buyer_id as string, seller_id as string]) {
          const email = await getParticipantEmail(env.DB, pid);
          if (email) {
            await sendEmail(env, {
              to: email,
              subject: `Trade Confirmed: ${volume} MWh ${market}`,
              html: `<p>Your trade for ${volume} MWh of ${market} energy at R${(Number(price_cents) / 100).toFixed(2)}/MWh has been matched and confirmed.</p>`,
            });
          }
        }
      },
    },
    {
      type: 'fee',
      execute: async (env, event) => {
        const { buyer_id, total_cents } = event.data;
        await computeFee(env.DB, 'trading', Number(total_cents), buyer_id as string, 'trade', event.entity_id);
      },
    },
    {
      type: 'kv_write',
      execute: async (env, event) => {
        const { market, price_cents, volume } = event.data;
        const indexData = {
          price: Number(price_cents) / 100,
          change_24h: 0,
          volume_24h: Number(volume),
          last_trade: new Date().toISOString(),
        };
        await env.KV.put(`index:${market}`, JSON.stringify(indexData), { expirationTtl: 86400 });
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const riskId = env.RISK_ENGINE.idFromName('global');
        const riskStub = env.RISK_ENGINE.get(riskId);
        await riskStub.fetch(new Request('https://do/update-positions', {
          method: 'POST',
          body: JSON.stringify({ trade_id: event.entity_id, ...event.data }),
        }));
      },
    },
    {
      type: 'cross_module',
      execute: async (env, event) => {
        const { buyer_id, seller_id, market, volume, price_cents } = event.data;
        const totalCents = Math.round(Number(volume) * Number(price_cents));
        
        // Auto-issue carbon credits for renewable energy trades (solar, wind, hydro)
        const renewableMarkets = ['solar', 'wind', 'hydro'];
        if (renewableMarkets.includes(market as string)) {
          const carbonTonnage = (Number(volume) * 0.4) / 1000; // Proxy: 0.4t CO2 offset per MWh
          const creditId = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO carbon_credits (id, owner_id, amount_tonnes, standard, status, created_at)
             VALUES (?, ?, ?, 'NXT-GOLD', 'issued', datetime('now'))`
          ).bind(creditId, seller_id as string, carbonTonnage).run();
          
          await notifyParticipant(env.DB, seller_id as string, 'Carbon Credits Issued', `You received ${carbonTonnage.toFixed(2)}t carbon credits for your ${market} trade.`, 'carbon', 'credit', creditId);
        }
      },
    },
  ],


  'order.placed': [
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { market } = event.data;
        const obId = env.ORDER_BOOK.idFromName(market as string);
        const obStub = env.ORDER_BOOK.get(obId);
        await obStub.fetch(new Request('https://do/place-order', {
          method: 'POST',
          body: JSON.stringify({ order_id: event.entity_id, ...event.data }),
        }));
      },
    },
  ],

  'order.cancelled': [
    {
      type: 'notify',
      execute: async (env, event) => {
        await notifyParticipant(env.DB, event.actor_id, 'Order Cancelled', `Your order ${event.entity_id} has been cancelled.`, 'trading', 'order', event.entity_id);
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { market } = event.data;
        const obId = env.ORDER_BOOK.idFromName(market as string);
        const obStub = env.ORDER_BOOK.get(obId);
        await obStub.fetch(new Request('https://do/cancel-order', {
          method: 'POST',
          body: JSON.stringify({ order_id: event.entity_id }),
        }));
      },
    },
  ],

  // ── Carbon ───────────────────────────────────────────────────────────────

  'credit.retired': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { owner_id, tonnes, standard } = event.data;
        await notifyParticipant(env.DB, owner_id as string, 'Carbon Credit Retired', `${tonnes}t of ${standard} credits retired.`, 'carbon', 'credit', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'credit.retired', { credit_id: event.entity_id, ...event.data });
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { owner_id, tonnes, standard } = event.data;
        const email = await getParticipantEmail(env.DB, owner_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `Carbon Credit Retired: ${tonnes}t ${standard}`, html: `<p>${tonnes} tonnes of ${standard} carbon credits have been retired from your account.</p>` });
        }
      },
    },
    {
      type: 'fee',
      execute: async (env, event) => {
        const { owner_id, value_cents } = event.data;
        await computeFee(env.DB, 'carbon_retirement', Number(value_cents || 0), owner_id as string, 'credit', event.entity_id);
      },
    },
  ],

  'credit.transferred': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { from_id, to_id, tonnes } = event.data;
        await notifyParticipant(env.DB, from_id as string, 'Credit Transferred', `${tonnes}t transferred out.`, 'carbon', 'credit', event.entity_id);
        await notifyParticipant(env.DB, to_id as string, 'Credit Received', `${tonnes}t received.`, 'carbon', 'credit', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'credit.transferred', event.data);
      },
    },
  ],

  'option.exercised': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { writer_id, holder_id, option_type } = event.data;
        await notifyParticipant(env.DB, writer_id as string, 'Option Exercised', `Your ${option_type} option has been exercised.`, 'carbon', 'option', event.entity_id);
        await notifyParticipant(env.DB, holder_id as string, 'Option Exercised', `You exercised your ${option_type} option.`, 'carbon', 'option', event.entity_id);
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const escrowId = env.ESCROW_MGR.idFromName('global');
        const stub = env.ESCROW_MGR.get(escrowId);
        await stub.fetch(new Request('https://do/release', {
          method: 'POST',
          body: JSON.stringify({ entity_id: event.entity_id, ...event.data }),
        }));
      },
    },
  ],

  // ── Contracts ────────────────────────────────────────────────────────────

  'contract.signed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { signatories, title } = event.data;
        for (const pid of (signatories as string[])) {
          await notifyParticipant(env.DB, pid, 'Contract Signed', `"${title}" has been signed by all parties.`, 'contract', 'document', event.entity_id);
        }
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'contract.signed', { document_id: event.entity_id, ...event.data });
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { signatories, title } = event.data;
        for (const pid of (signatories as string[])) {
          const email = await getParticipantEmail(env.DB, pid);
          if (email) {
            await sendEmail(env, { to: email, subject: `Contract Signed: ${title}`, html: `<p>The contract "${title}" has been fully signed. A certificate of signing is available in the platform.</p>` });
          }
        }
      },
    },
    {
      type: 'fee',
      execute: async (env, event) => {
        const { creator_id, value_cents } = event.data;
        await computeFee(env.DB, 'document_generation', Number(value_cents || 0), creator_id as string, 'document', event.entity_id);
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { doc_type } = event.data;
        if (doc_type === 'ppa_wheeling' || doc_type === 'ppa_btm') {
          const scId = env.SMART_CONTRACT.idFromName(event.entity_id);
          const stub = env.SMART_CONTRACT.get(scId);
          await stub.fetch(new Request('https://do/create-rule', {
            method: 'POST',
            body: JSON.stringify({ rule_type: 'auto_invoice', document_id: event.entity_id, ...event.data }),
          }));
        }
      },
    },
  ],

  'contract.phase_changed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { parties, title, new_phase } = event.data;
        for (const pid of (parties as string[] || [])) {
          await notifyParticipant(env.DB, pid, 'Contract Phase Changed', `"${title}" moved to ${new_phase}.`, 'contract', 'document', event.entity_id);
        }
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { parties, title, new_phase } = event.data;
        if (new_phase === 'execution') {
          for (const pid of (parties as string[] || [])) {
            const email = await getParticipantEmail(env.DB, pid);
            if (email) {
              await sendEmail(env, { to: email, subject: `Contract Now in Execution: ${title}`, html: `<p>"${title}" has moved to the execution phase.</p>` });
            }
          }
        }
      },
    },
  ],

  'loi.created': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { ipp_id, offtaker_name } = event.data;
        await notifyParticipant(env.DB, ipp_id as string, 'New LOI Received', `${offtaker_name} has expressed interest in your project.`, 'contract', 'loi', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { ipp_id, offtaker_name } = event.data;
        const email = await getParticipantEmail(env.DB, ipp_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `New Letter of Intent from ${offtaker_name}`, html: `<p>${offtaker_name} has submitted a Letter of Intent for your energy project. Review it in the Contracts section.</p>` });
        }
      },
    },
  ],

  // ── Settlement ───────────────────────────────────────────────────────────

  'invoice.generated': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { buyer_id, invoice_number, total_cents } = event.data;
        await notifyParticipant(env.DB, buyer_id as string, 'Invoice Generated', `Invoice ${invoice_number} for R${(Number(total_cents) / 100).toFixed(2)} is due.`, 'settlement', 'invoice', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'invoice.generated', event.data);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { buyer_id, invoice_number, total_cents, due_date } = event.data;
        const email = await getParticipantEmail(env.DB, buyer_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `Invoice ${invoice_number} — R${(Number(total_cents) / 100).toFixed(2)} Due`, html: `<p>Invoice ${invoice_number} has been generated. Amount: R${(Number(total_cents) / 100).toFixed(2)}. Due: ${due_date}.</p>` });
        }
      },
    },
    {
      type: 'fee',
      execute: async (env, event) => {
        const { seller_id, total_cents } = event.data;
        await computeFee(env.DB, 'settlement', Number(total_cents), seller_id as string, 'invoice', event.entity_id);
      },
    },
  ],

  'invoice.paid': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { seller_id, invoice_number, total_cents } = event.data;
        await notifyParticipant(env.DB, seller_id as string, 'Invoice Paid', `Invoice ${invoice_number} (R${(Number(total_cents) / 100).toFixed(2)}) has been paid.`, 'settlement', 'invoice', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'invoice.paid', event.data);
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { escrow_id } = event.data;
        if (escrow_id) {
          const eid = env.ESCROW_MGR.idFromName('global');
          const stub = env.ESCROW_MGR.get(eid);
          await stub.fetch(new Request('https://do/release', { method: 'POST', body: JSON.stringify({ escrow_id }) }));
        }
      },
    },
  ],

  'dispute.filed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { respondent_id, reason } = event.data;
        await notifyParticipant(env.DB, respondent_id as string, 'Dispute Filed Against You', `A dispute has been filed: ${reason}`, 'settlement', 'dispute', event.entity_id);
        // Notify admin
        const admins = await env.DB.prepare("SELECT id FROM participants WHERE role = 'admin'").all();
        for (const admin of admins.results) {
          await notifyParticipant(env.DB, admin.id as string, 'New Dispute Filed', `Dispute ${event.entity_id}: ${reason}`, 'settlement', 'dispute', event.entity_id);
        }
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'dispute.filed', event.data);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { respondent_id, reason } = event.data;
        const email = await getParticipantEmail(env.DB, respondent_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: 'Dispute Filed Against You', html: `<p>A dispute has been filed: ${reason}. Please respond within 5 business days.</p>` });
        }
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { escrow_id } = event.data;
        if (escrow_id) {
          const eid = env.ESCROW_MGR.idFromName('global');
          const stub = env.ESCROW_MGR.get(eid);
          await stub.fetch(new Request('https://do/hold', { method: 'POST', body: JSON.stringify({ escrow_id, reason: 'dispute' }) }));
        }
      },
    },
  ],

  // ── Projects ─────────────────────────────────────────────────────────────

  'project.phase_changed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { party_ids, project_name, new_phase } = event.data;
        for (const pid of (party_ids as string[] || [])) {
          await notifyParticipant(env.DB, pid, 'Project Phase Changed', `${project_name} moved to ${new_phase}.`, 'project', 'project', event.entity_id);
        }
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'project.updated', event.data);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { party_ids, project_name, new_phase } = event.data;
        for (const pid of (party_ids as string[] || [])) {
          const email = await getParticipantEmail(env.DB, pid);
          if (email) {
            await sendEmail(env, { to: email, subject: `Project ${project_name} — Phase: ${new_phase}`, html: `<p>${project_name} has moved to the ${new_phase} phase.</p>` });
          }
        }
      },
    },
    {
      type: 'cross_module',
      execute: async (env, event) => {
        const { new_phase, project_id } = event.data;
        if (new_phase === 'commercial_ops') {
          // COD: auto-create meters, link PPA, enable auto-invoice
          log('info', 'cascade_cod_reached', { project_id: event.entity_id });
          // Create meter entries for the project
          const meterId = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO metering_readings (id, project_id, meter_id, timestamp, kwh_delivered, kwh_generated, performance_ratio, validated, created_at)
             VALUES (?, ?, ?, datetime('now'), 0, 0, 1.0, 0, datetime('now'))`
          ).bind(meterId, project_id || event.entity_id, `meter-${event.entity_id.substring(0, 8)}`, ).run();
        }
      },
    },
  ],

  'project.milestone_completed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { party_ids, project_name, milestone_name } = event.data;
        for (const pid of (party_ids as string[] || [])) {
          await notifyParticipant(env.DB, pid, 'Milestone Completed', `${project_name}: ${milestone_name} complete.`, 'project', 'milestone', event.entity_id);
        }
      },
    },
  ],

  'project.cp_satisfied': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { party_ids, project_name, cp_name } = event.data;
        for (const pid of (party_ids as string[] || [])) {
          await notifyParticipant(env.DB, pid, 'Condition Precedent Satisfied', `${project_name}: ${cp_name} satisfied.`, 'project', 'condition', event.entity_id);
        }
      },
    },
  ],

  'disbursement.approved': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { ipp_id, amount_cents } = event.data;
        await notifyParticipant(env.DB, ipp_id as string, 'Disbursement Approved', `Disbursement of R${(Number(amount_cents) / 100).toFixed(2)} approved.`, 'project', 'disbursement', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { ipp_id, amount_cents } = event.data;
        const email = await getParticipantEmail(env.DB, ipp_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `Disbursement Approved: R${(Number(amount_cents) / 100).toFixed(2)}`, html: `<p>Your disbursement request has been approved.</p>` });
        }
      },
    },
  ],

  // ── Registration ────────────────────────────────────────────────────────

  'participant.registered': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { participant_id, company_name } = event.data;
        await notifyParticipant(env.DB, participant_id as string, 'Welcome to NXT Energy', `Registration successful for ${company_name}. Your KYC verification is in progress.`, 'info', 'participant', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'participant.registered', event.data);
      },
    },
  ],

  // ── KYC / Compliance ─────────────────────────────────────────────────────

  'kyc.approved': [
    {
      type: 'notify',
      execute: async (env, event) => {
        await notifyParticipant(env.DB, event.data.participant_id as string, 'KYC Approved', 'Your identity verification is complete. You can now trade.', 'compliance', 'kyc', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const email = await getParticipantEmail(env.DB, event.data.participant_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: 'Welcome to NXT Energy — KYC Approved', html: '<p>Your identity verification is complete. You can now place orders and trade on the platform.</p>' });
        }
      },
    },
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare("UPDATE participants SET trading_enabled = 1, kyc_status = 'verified' WHERE id = ?").bind(event.data.participant_id).run();
      },
    },
  ],

  'kyc.rejected': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { participant_id, reason } = event.data;
        await notifyParticipant(env.DB, participant_id as string, 'KYC Rejected', `Verification rejected: ${reason}`, 'compliance', 'kyc', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { participant_id, reason } = event.data;
        const email = await getParticipantEmail(env.DB, participant_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: 'KYC Verification Rejected', html: `<p>Your verification was rejected: ${reason}. Please re-submit your documents.</p>` });
        }
      },
    },
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare("UPDATE participants SET trading_enabled = 0, kyc_status = 'rejected' WHERE id = ?").bind(event.data.participant_id).run();
      },
    },
  ],

  // ── Metering ─────────────────────────────────────────────────────────────

  'meter.ingested': [
    {
      type: 'do_call',
      execute: async (env, event) => {
        const { contract_id } = event.data;
        if (contract_id) {
          const scId = env.SMART_CONTRACT.idFromName(contract_id as string);
          const stub = env.SMART_CONTRACT.get(scId);
          await stub.fetch(new Request('https://do/evaluate', {
            method: 'POST',
            body: JSON.stringify({ meter_reading_id: event.entity_id, ...event.data }),
          }));
        }
      },
    },
  ],

  // ── P2P ──────────────────────────────────────────────────────────────────

  'p2p.offer_created': [
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'p2p.offer_created', event.data);
      },
    },
  ],

  'p2p.accepted': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { seller_id, buyer_id, volume } = event.data;
        await notifyParticipant(env.DB, seller_id as string, 'P2P Offer Accepted', `Your offer for ${volume} MWh has been accepted.`, 'p2p', 'trade', event.entity_id);
        await notifyParticipant(env.DB, buyer_id as string, 'P2P Trade Confirmed', `You accepted an offer for ${volume} MWh.`, 'p2p', 'trade', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'p2p.accepted', event.data);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { seller_id, buyer_id, volume } = event.data;
        for (const pid of [seller_id as string, buyer_id as string]) {
          const email = await getParticipantEmail(env.DB, pid);
          if (email) {
            await sendEmail(env, { to: email, subject: `P2P Trade Accepted: ${volume} MWh`, html: `<p>A P2P trade for ${volume} MWh has been accepted.</p>` });
          }
        }
      },
    },
    {
      type: 'do_call',
      execute: async (env, event) => {
        const p2pId = env.P2P_MATCHER.idFromName('global');
        const stub = env.P2P_MATCHER.get(p2pId);
        await stub.fetch(new Request('https://do/update', { method: 'POST', body: JSON.stringify(event.data) }));
      },
    },
  ],

  'p2p.settled': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { seller_id, buyer_id } = event.data;
        await notifyParticipant(env.DB, seller_id as string, 'P2P Trade Settled', 'Your P2P trade has been settled.', 'p2p', 'trade', event.entity_id);
        await notifyParticipant(env.DB, buyer_id as string, 'P2P Trade Settled', 'Your P2P trade has been settled.', 'p2p', 'trade', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'p2p.settled', event.data);
      },
    },
    {
      type: 'fee',
      execute: async (env, event) => {
        const { buyer_id, total_cents } = event.data;
        await computeFee(env.DB, 'settlement', Number(total_cents || 0), buyer_id as string, 'p2p_trade', event.entity_id);
      },
    },
  ],

  // ── Marketplace ──────────────────────────────────────────────────────────

  'marketplace.bid': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { seller_id, bidder_name, listing_title } = event.data;
        await notifyParticipant(env.DB, seller_id as string, 'New Bid Received', `${bidder_name} bid on "${listing_title}".`, 'marketplace', 'listing', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { seller_id, bidder_name, listing_title } = event.data;
        const email = await getParticipantEmail(env.DB, seller_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `New Bid on "${listing_title}"`, html: `<p>${bidder_name} has placed a bid on your listing "${listing_title}". Review it in the Marketplace.</p>` });
        }
      },
    },
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare('UPDATE marketplace_listings SET bid_count = bid_count + 1 WHERE id = ?').bind(event.entity_id).run();
      },
    },
  ],

  // ── Demand ───────────────────────────────────────────────────────────────

  'demand.matched': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { offtaker_id, match_count } = event.data;
        await notifyParticipant(env.DB, offtaker_id as string, 'AI Match Results', `Found ${match_count} energy sources matching your demand profile.`, 'demand', 'profile', event.entity_id);
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { offtaker_id, match_count } = event.data;
        const email = await getParticipantEmail(env.DB, offtaker_id as string);
        if (email) {
          await sendEmail(env, { to: email, subject: `AI Matched ${match_count} Energy Sources`, html: `<p>Our AI found ${match_count} energy sources matching your demand profile. Express interest to start negotiations.</p>` });
        }
      },
    },
  ],

  // ── POPIA ────────────────────────────────────────────────────────────────

  'popia.consent_changed': [
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
           VALUES (?, ?, 'popia_consent_changed', 'participant', ?, ?, ?, datetime('now'))`
        ).bind(crypto.randomUUID(), event.actor_id, event.actor_id, JSON.stringify(event.data), event.ip).run();
      },
    },
  ],

  'popia.data_exported': [
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
           VALUES (?, ?, 'popia_data_export', 'participant', ?, ?, ?, datetime('now'))`
        ).bind(crypto.randomUUID(), event.actor_id, event.actor_id, JSON.stringify(event.data), event.ip).run();
      },
    },
  ],

  'popia.erasure': [
    {
      type: 'db_update',
      execute: async (env, event) => {
        await env.DB.prepare(
          `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
           VALUES (?, ?, 'popia_erasure_request', 'participant', ?, ?, ?, datetime('now'))`
        ).bind(crypto.randomUUID(), event.actor_id, event.actor_id, JSON.stringify(event.data), event.ip).run();
      },
    },
  ],

  // ── RECs ─────────────────────────────────────────────────────────────────

  'rec.transferred': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { to_participant_id, volume_mwh } = event.data;
        await notifyParticipant(env.DB, event.actor_id, 'REC Transferred', `${volume_mwh} MWh REC transferred.`, 'rec', 'rec', event.entity_id);
        await notifyParticipant(env.DB, to_participant_id as string, 'REC Received', `${volume_mwh} MWh REC received.`, 'rec', 'rec', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'rec.transferred', { rec_id: event.entity_id, ...event.data });
      },
    },
  ],

  'rec.redeemed': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { volume_mwh, purpose, beneficiary } = event.data;
        await notifyParticipant(env.DB, event.actor_id, 'REC Redeemed', `${volume_mwh} MWh redeemed for ${purpose} (${beneficiary}).`, 'rec', 'rec', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'rec.redeemed', { rec_id: event.entity_id, ...event.data });
      },
    },
  ],

  // ── Tokens ──────────────────────────────────────────────────────────────

  'token.minted': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { token_id, source_type, quantity, unit } = event.data;
        await notifyParticipant(env.DB, event.actor_id, 'Token Minted', `Token ${token_id} minted: ${quantity} ${unit} from ${source_type}.`, 'token', 'token', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'token.minted', { token_id: event.entity_id, ...event.data });
      },
    },
  ],

  // ── Projects ────────────────────────────────────────────────────────────

  'project.financial_close': [
    {
      type: 'notify',
      execute: async (env, event) => {
        const { project_name } = event.data;
        await notifyParticipant(env.DB, event.actor_id, 'Financial Close Declared', `Project "${project_name}" has reached financial close and moved to construction.`, 'project', 'project', event.entity_id);
      },
    },
    {
      type: 'webhook',
      execute: async (env, event) => {
        await deliverWebhook(env.DB, 'project.financial_close', { project_id: event.entity_id, ...event.data });
      },
    },
    {
      type: 'email',
      execute: async (env, event) => {
        const { project_name } = event.data;
        const email = await getParticipantEmail(env.DB, event.actor_id);
        if (email) {
          await sendEmail(env, { to: email, subject: `Financial Close: ${project_name}`, html: `<p>Congratulations! Project "${project_name}" has achieved financial close and is now in the construction phase.</p>` });
        }
      },
    },
  ],
};

// ─── MAIN CASCADE FUNCTION ───────────────────────────────────────────────────

export async function cascade(env: AppBindings, event: CascadeEvent): Promise<void> {
  const actions = CASCADE_MAP[event.type];
  if (!actions || actions.length === 0) {
    log('warn', 'cascade_no_actions', { event_type: event.type, entity_id: event.entity_id }, event.request_id);
    return;
  }

  // Always write audit log for every cascade event
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      event.actor_id,
      event.type,
      event.entity_type,
      event.entity_id,
      JSON.stringify(event.data),
      event.ip,
    ).run();
  } catch (err) {
    log('error', 'cascade_audit_failed', { event_type: event.type, error: String(err) }, event.request_id);
  }

  // Execute all cascade actions — each wrapped in try/catch so one failure doesn't block others
  for (const action of actions) {
    try {
      await action.execute(env, event);
      log('info', 'cascade_action_ok', { event_type: event.type, action_type: action.type }, event.request_id);
    } catch (err) {
      log('error', 'cascade_action_failed', {
        event_type: event.type,
        action_type: action.type,
        error: err instanceof Error ? err.message : String(err),
      }, event.request_id);
      // Continue to next action — don't let one failure block others
    }
  }
}
