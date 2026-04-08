import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { CreditRetireSchema, CreditTransferSchema, OptionCreateSchema } from '../utils/validation';
import { parsePagination, paginatedResponse, errorResponse, ErrorCodes } from '../utils/pagination';
import { deliverWebhook } from '../utils/webhooks';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';

const carbon = new Hono<HonoEnv>();

// GET /credits — List carbon credits
carbon.get('/credits', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { owner, registry, status, page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query = 'SELECT * FROM carbon_credits';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (user.role !== 'admin') {
      conditions.push('owner_id = ?');
      params.push(user.sub);
    } else if (owner) {
      conditions.push('owner_id = ?');
      params.push(owner);
    }

    if (registry) { conditions.push('registry = ?'); params.push(registry); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /credits/:id/retire — Retire credits
carbon.post('/credits/:id/retire', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = CreditRetireSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const { quantity, retirement_purpose, retirement_beneficiary } = parsed.data;

    const credit = await c.env.DB.prepare(
      'SELECT * FROM carbon_credits WHERE id = ? AND owner_id = ?'
    ).bind(id, user.sub).first();

    if (!credit) return c.json({ success: false, error: 'Credit not found' }, 404);
    if (credit.status !== 'active') {
      return c.json({ success: false, error: 'Only active credits can be retired' }, 400);
    }
    if (quantity > (credit.available_quantity as number)) {
      return c.json({ success: false, error: 'Insufficient quantity' }, 400);
    }

    const newAvailable = (credit.available_quantity as number) - quantity;
    const newStatus = newAvailable === 0 ? 'retired' : 'active';

    await c.env.DB.prepare(`
      UPDATE carbon_credits SET available_quantity = ?, status = ?,
        retirement_purpose = ?, retirement_beneficiary = ?, retirement_date = ?, updated_at = ?
      WHERE id = ?
    `).bind(newAvailable, newStatus, retirement_purpose, retirement_beneficiary, nowISO(), nowISO(), id).run();

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'retire_credits', 'carbon_credit', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ quantity, purpose: retirement_purpose, beneficiary: retirement_beneficiary }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for credit retirement
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'credit.retired',
      actor_id: user.sub,
      entity_type: 'carbon_credit',
      entity_id: id,
      data: { owner_id: user.sub, tonnes: quantity, standard: credit.registry, value_cents: quantity * ((credit.price_cents as number) || 0) },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { retired_quantity: quantity, remaining: newAvailable } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /credits/:id/transfer — Transfer credits
carbon.post('/credits/:id/transfer', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = CreditTransferSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const { quantity, to_participant_id } = parsed.data;

    const credit = await c.env.DB.prepare(
      'SELECT * FROM carbon_credits WHERE id = ? AND owner_id = ?'
    ).bind(id, user.sub).first();

    if (!credit) return c.json({ success: false, error: 'Credit not found' }, 404);
    if (quantity > (credit.available_quantity as number)) {
      return c.json({ success: false, error: 'Insufficient quantity' }, 400);
    }

    // Verify recipient exists
    const recipient = await c.env.DB.prepare('SELECT id FROM participants WHERE id = ?').bind(to_participant_id).first();
    if (!recipient) return c.json({ success: false, error: 'Recipient not found' }, 404);

    if (quantity === (credit.available_quantity as number)) {
      // Transfer entire credit
      await c.env.DB.prepare(
        'UPDATE carbon_credits SET owner_id = ?, status = \'transferred\', updated_at = ? WHERE id = ?'
      ).bind(to_participant_id, nowISO(), id).run();
    } else {
      // Split: reduce original, create new credit for recipient
      await c.env.DB.prepare(
        'UPDATE carbon_credits SET available_quantity = available_quantity - ?, updated_at = ? WHERE id = ?'
      ).bind(quantity, nowISO(), id).run();

      const newCreditId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO carbon_credits (id, serial_number, project_name, registry, vintage, quantity,
          available_quantity, price_cents, status, owner_id, sdg_goals, methodology, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `).bind(
        newCreditId, `${credit.serial_number}-T${Date.now()}`,
        credit.project_name, credit.registry, credit.vintage,
        quantity, quantity, credit.price_cents, to_participant_id,
        credit.sdg_goals, credit.methodology, credit.country
      ).run();
    }

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'transfer_credits', 'carbon_credit', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ quantity, to: to_participant_id }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for credit transfer
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'credit.transferred',
      actor_id: user.sub,
      entity_type: 'carbon_credit',
      entity_id: id,
      data: { from_id: user.sub, to_id: to_participant_id, tonnes: quantity },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { transferred_quantity: quantity, to: to_participant_id } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /credits/:id/list — List on marketplace
carbon.post('/credits/:id/list', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { price_cents: number; quantity: number };

    const credit = await c.env.DB.prepare(
      'SELECT * FROM carbon_credits WHERE id = ? AND owner_id = ?'
    ).bind(id, user.sub).first();
    if (!credit) return c.json({ success: false, error: 'Credit not found' }, 404);

    if (body.quantity > (credit.available_quantity as number)) {
      return c.json({ success: false, error: 'Insufficient quantity' }, 400);
    }

    // Create marketplace listing
    const listingId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO marketplace_listings (id, seller_id, type, technology, volume, price_cents, description, status)
      VALUES (?, ?, 'carbon', ?, ?, ?, ?, 'active')
    `).bind(
      listingId, user.sub, credit.registry,
      body.quantity, body.price_cents,
      `${credit.project_name} - ${credit.vintage} vintage - ${credit.registry}`
    ).run();

    await c.env.DB.prepare(
      'UPDATE carbon_credits SET status = \'listed\', updated_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    return c.json({ success: true, data: { listing_id: listingId } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /options — List carbon options
carbon.get('/options', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { page = '1', limit = '20' } = c.req.query();
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin') {
      query = 'SELECT * FROM carbon_options ORDER BY created_at DESC LIMIT ? OFFSET ?';
    } else {
      query = 'SELECT * FROM carbon_options WHERE writer_id = ? OR holder_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(user.sub, user.sub);
    }
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /options — Write new option
carbon.post('/options', authMiddleware({ roles: ['admin', 'trader', 'carbon_fund'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const parsed = OptionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, 400);
    }

    const data = parsed.data;
    const optionId = generateId();

    // Create collateral escrow via DO
    const escrowId = generateId();
    const doId = c.env.ESCROW_MGR.idFromName(escrowId);
    const stub = c.env.ESCROW_MGR.get(doId);

    await stub.fetch(new Request('http://do/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: escrowId,
        optionId,
        depositorId: user.sub,
        amountCents: data.premium_cents,
        conditions: { type: 'option_collateral', optionType: data.type },
        expiresAt: data.expiry,
      }),
    }));

    // Create escrow record in D1
    await c.env.DB.prepare(`
      INSERT INTO escrows (id, option_id, depositor_id, amount_cents, conditions, status, expires_at)
      VALUES (?, ?, ?, ?, ?, 'created', ?)
    `).bind(escrowId, optionId, user.sub, data.premium_cents,
      JSON.stringify({ type: 'option_collateral' }), data.expiry
    ).run();

    await c.env.DB.prepare(`
      INSERT INTO carbon_options (id, type, underlying_credit_id, strike_price_cents, premium_cents,
        quantity, expiry, exercise_style, settlement_type, writer_id, status, collateral_escrow_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      optionId, data.type, data.underlying_credit_id, data.strike_price_cents,
      data.premium_cents, data.quantity, data.expiry, data.exercise_style,
      data.settlement_type, user.sub, escrowId
    ).run();

    return c.json({ success: true, data: { id: optionId, escrow_id: escrowId } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /options/:id/exercise — Exercise option
carbon.post('/options/:id/exercise', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const option = await c.env.DB.prepare(
      'SELECT * FROM carbon_options WHERE id = ? AND holder_id = ?'
    ).bind(id, user.sub).first();

    if (!option) return c.json({ success: false, error: 'Option not found or not holder' }, 404);
    if (option.status !== 'active') return c.json({ success: false, error: 'Option not active' }, 400);

    // Check expiry
    const now = new Date();
    const expiry = new Date(option.expiry as string);
    if (now > expiry) return c.json({ success: false, error: 'Option expired' }, 400);

    // European: only on expiry date
    if (option.exercise_style === 'european') {
      const today = now.toISOString().split('T')[0];
      const expiryDate = expiry.toISOString().split('T')[0];
      if (today !== expiryDate) {
        return c.json({ success: false, error: 'European options can only be exercised on expiry date' }, 400);
      }
    }

    // Calculate intrinsic value
    const marketPriceStr = await c.env.KV.get('index:carbon');
    const marketPrice = marketPriceStr ? JSON.parse(marketPriceStr).price : 0;
    const strikeCents = option.strike_price_cents as number;
    const quantity = option.quantity as number;

    let intrinsicValue = 0;
    if (option.type === 'call') {
      intrinsicValue = Math.max(0, (marketPrice - strikeCents) * quantity);
    } else if (option.type === 'put') {
      intrinsicValue = Math.max(0, (strikeCents - marketPrice) * quantity);
    }

    // Update option
    await c.env.DB.prepare(
      'UPDATE carbon_options SET status = \'exercised\', exercised_at = ? WHERE id = ?'
    ).bind(nowISO(), id).run();

    // Release collateral escrow
    if (option.collateral_escrow_id) {
      const doId = c.env.ESCROW_MGR.idFromName(option.collateral_escrow_id as string);
      const stub = c.env.ESCROW_MGR.get(doId);
      await stub.fetch(new Request('http://do/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: user.sub, reason: 'Option exercised' }),
      }));

      await c.env.DB.prepare(
        'UPDATE escrows SET status = \'released\', released_at = ? WHERE id = ?'
      ).bind(nowISO(), option.collateral_escrow_id).run();
    }

    // Audit
    await c.env.DB.prepare(`
      INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, 'exercise_option', 'carbon_option', ?, ?, ?)
    `).bind(
      generateId(), user.sub, id,
      JSON.stringify({ intrinsic_value: intrinsicValue, market_price: marketPrice }),
      c.req.header('CF-Connecting-IP') || 'unknown'
    ).run();

    // Fire cascade for option exercise
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'option.exercised',
      actor_id: user.sub,
      entity_type: 'carbon_option',
      entity_id: id,
      data: { writer_id: option.writer_id, holder_id: user.sub, option_type: option.type, intrinsic_value: intrinsicValue },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({
      success: true,
      data: { exercised: true, intrinsic_value_cents: intrinsicValue, settlement_type: option.settlement_type },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /fund/nav — Calculate fund NAV
carbon.get('/fund/nav', authMiddleware({ roles: ['admin', 'carbon_fund'] }), async (c) => {
  try {
    const user = c.get('user');

    // Get all active credits for this fund
    const credits = await c.env.DB.prepare(
      'SELECT * FROM carbon_credits WHERE owner_id = ? AND status = \'active\''
    ).bind(user.sub).all();

    let totalValue = 0;
    for (const credit of credits.results) {
      totalValue += (credit.available_quantity as number) * ((credit.price_cents as number) || 0);
    }

    // Get active options
    const options = await c.env.DB.prepare(
      'SELECT * FROM carbon_options WHERE (writer_id = ? OR holder_id = ?) AND status = \'active\''
    ).bind(user.sub, user.sub).all();

    let optionsValue = 0;
    for (const opt of options.results) {
      optionsValue += (opt.premium_cents as number) * (opt.quantity as number);
    }

    return c.json({
      success: true,
      data: {
        total_credits: credits.results.length,
        credits_value_cents: totalValue,
        active_options: options.results.length,
        options_value_cents: optionsValue,
        nav_cents: totalValue + optionsValue,
        calculated_at: nowISO(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /registry/sync/:registry — Sync with registry (stub)
carbon.post('/registry/sync/:registry', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const { registry } = c.req.param();
    // Stub: simulate registry sync
    return c.json({
      success: true,
      data: {
        registry,
        synced_at: nowISO(),
        message: `Registry sync with ${registry} simulated (stub)`,
        credits_updated: 0,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default carbon;
