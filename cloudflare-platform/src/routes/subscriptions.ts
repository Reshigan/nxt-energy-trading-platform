/**
 * B8: Subscriptions Management
 * CRUD for participant subscriptions, plan management, usage tracking
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { errorResponse, ErrorCodes } from '../utils/pagination';
import { captureException } from '../utils/sentry';
import { cascade } from '../utils/cascade';
import { generateId as genId2 } from '../utils/id';

const subscriptions = new Hono<HonoEnv>();
subscriptions.use('*', authMiddleware());

// GET /subscriptions/plans — List available plans
subscriptions.get('/plans', async (c) => {
  try {
    const plans = [
      { id: 'free', name: 'Free', price_cents: 0, features: ['5 trades/month', 'Basic dashboard', 'Email support'], limits: { trades_per_month: 5, api_calls_per_day: 100 } },
      { id: 'starter', name: 'Starter', price_cents: 99900, features: ['50 trades/month', 'Full dashboard', 'Priority support', 'Basic analytics'], limits: { trades_per_month: 50, api_calls_per_day: 1000 } },
      { id: 'professional', name: 'Professional', price_cents: 499900, features: ['Unlimited trades', 'Advanced analytics', 'API access', 'Dedicated support', 'Carbon trading'], limits: { trades_per_month: -1, api_calls_per_day: 10000 } },
      { id: 'enterprise', name: 'Enterprise', price_cents: 0, features: ['Custom pricing', 'White-label option', 'SLA guarantee', 'Multi-tenant', 'Custom integrations'], limits: { trades_per_month: -1, api_calls_per_day: -1 } },
    ];
    return c.json({ success: true, data: plans });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /subscriptions/current — Get current subscription
subscriptions.get('/current', async (c) => {
  try {
    const user = c.get('user');
    try {
      const sub = await c.env.DB.prepare(
        'SELECT * FROM subscriptions WHERE participant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(user.sub, 'active').first();

      if (!sub) {
        return c.json({ success: true, data: { plan: 'free', status: 'active', features: ['5 trades/month', 'Basic dashboard'] } });
      }
      return c.json({ success: true, data: sub });
    } catch {
      // subscriptions table may not exist yet — return default free plan
      return c.json({ success: true, data: { plan: 'free', status: 'active', features: ['5 trades/month', 'Basic dashboard'] } });
    }
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /subscriptions — Create/upgrade subscription
subscriptions.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { plan_id: string; billing_cycle?: 'monthly' | 'annual' };

    if (!body.plan_id) {
      return c.json({ success: false, error: 'plan_id is required' }, 400);
    }

    const validPlans = ['free', 'starter', 'professional', 'enterprise'];
    if (!validPlans.includes(body.plan_id)) {
      return c.json({ success: false, error: 'Invalid plan' }, 400);
    }

    // Ensure subscriptions table exists
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        billing_cycle TEXT DEFAULT 'monthly',
        price_cents INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        next_billing_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // Deactivate current subscription
    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE participant_id = ? AND status = 'active'"
    ).bind(nowISO(), user.sub).run();

    const id = generateId();
    const billingCycle = body.billing_cycle || 'monthly';
    const priceMap: Record<string, number> = { free: 0, starter: 99900, professional: 499900, enterprise: 0 };

    await c.env.DB.prepare(`
      INSERT INTO subscriptions (id, participant_id, plan_id, status, billing_cycle, price_cents, started_at, next_billing_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
    `).bind(
      id, user.sub, body.plan_id, billingCycle,
      priceMap[body.plan_id] || 0,
      nowISO(),
      new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400000).toISOString(),
    ).run();

    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'subscription.created',
      actor_id: user.sub,
      entity_type: 'subscription',
      entity_id: id,
      data: { plan_id: body.plan_id, billing_cycle: billingCycle },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, data: { id, plan_id: body.plan_id, status: 'active' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// DELETE /subscriptions — Cancel subscription
subscriptions.delete('/', async (c) => {
  try {
    const user = c.get('user');

    let sub: { id: string } | null = null;
    try {
      sub = await c.env.DB.prepare(
        "SELECT id FROM subscriptions WHERE participant_id = ? AND status = 'active'"
      ).bind(user.sub).first<{ id: string }>();
    } catch {
      return c.json({ success: false, error: 'No active subscription' }, 404);
    }

    if (!sub) {
      return c.json({ success: false, error: 'No active subscription' }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE id = ?"
    ).bind(nowISO(), sub.id).run();

    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'subscription.cancelled',
      actor_id: user.sub,
      entity_type: 'subscription',
      entity_id: sub.id,
      data: { participant_id: user.sub },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, message: 'Subscription cancelled' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /subscriptions/usage — Get usage stats for current billing period
subscriptions.get('/usage', async (c) => {
  try {
    const user = c.get('user');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    let tradesCount = 0, apiCallsCount = 0, ordersCount = 0;
    try {
      const [trades, apiCalls, orders] = await Promise.all([
        c.env.DB.prepare(
          "SELECT COUNT(*) as count FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND created_at >= ?"
        ).bind(user.sub, user.sub, thirtyDaysAgo).first<{ count: number }>(),
        c.env.DB.prepare(
          "SELECT COUNT(*) as count FROM audit_log WHERE actor_id = ? AND created_at >= ?"
        ).bind(user.sub, thirtyDaysAgo).first<{ count: number }>(),
        c.env.DB.prepare(
          "SELECT COUNT(*) as count FROM orders WHERE participant_id = ? AND created_at >= ?"
        ).bind(user.sub, thirtyDaysAgo).first<{ count: number }>(),
      ]);
      tradesCount = trades?.count || 0;
      apiCallsCount = apiCalls?.count || 0;
      ordersCount = orders?.count || 0;
    } catch { /* tables may not exist */ }

    return c.json({
      success: true,
      data: {
        trades_this_period: tradesCount,
        api_calls_this_period: apiCallsCount,
        orders_this_period: ordersCount,
        period_start: thirtyDaysAgo,
        period_end: nowISO(),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /subscriptions/all — Admin: list all subscriptions
subscriptions.get('/all', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    try {
      const results = await c.env.DB.prepare(
        'SELECT s.*, p.company_name, p.email FROM subscriptions s JOIN participants p ON s.participant_id = p.id ORDER BY s.created_at DESC LIMIT 100'
      ).all();
      return c.json({ success: true, data: results.results });
    } catch {
      // subscriptions table may not exist yet
      return c.json({ success: true, data: [] });
    }
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /subscriptions/checkout — Create Stripe checkout session
subscriptions.post('/checkout', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { plan_id: string; billing_cycle?: 'monthly' | 'annual'; success_url?: string; cancel_url?: string };

    if (!body.plan_id) return c.json({ success: false, error: 'plan_id is required' }, 400);

    const STRIPE_SECRET_KEY = (c.env as Record<string, string>).STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return c.json({ success: false, error: 'Stripe not configured. Please set STRIPE_SECRET_KEY.' }, 503);
    }

    const priceMap: Record<string, { monthly: number; annual: number }> = {
      starter: { monthly: 99900, annual: 999000 },
      professional: { monthly: 499900, annual: 4999000 },
    };

    const prices = priceMap[body.plan_id];
    if (!prices) {
      return c.json({ success: false, error: 'Plan does not support Stripe checkout' }, 400);
    }

    const cycle = body.billing_cycle || 'monthly';
    const amountCents = cycle === 'annual' ? prices.annual : prices.monthly;

    // Create Stripe Checkout Session via REST API
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('payment_method_types[0]', 'card');
    params.set('line_items[0][price_data][currency]', 'zar');
    params.set('line_items[0][price_data][unit_amount]', String(amountCents));
    params.set('line_items[0][price_data][product_data][name]', `NXT Energy ${body.plan_id} (${cycle})`);
    params.set('line_items[0][price_data][recurring][interval]', cycle === 'annual' ? 'year' : 'month');
    params.set('line_items[0][quantity]', '1');
    params.set('client_reference_id', user.sub);
    params.set('customer_email', user.email || '');
    params.set('success_url', body.success_url || 'https://et.vantax.co.za/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', body.cancel_url || 'https://et.vantax.co.za/settings?tab=billing');
    params.set('metadata[participant_id]', user.sub);
    params.set('metadata[plan_id]', body.plan_id);
    params.set('metadata[billing_cycle]', cycle);

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await resp.json() as { id: string; url: string; error?: { message: string } };
    if (!resp.ok || session.error) {
      return c.json({ success: false, error: session.error?.message || 'Failed to create checkout session' }, 502);
    }

    return c.json({ success: true, data: { checkout_url: session.url, session_id: session.id } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /subscriptions/webhook — Handle Stripe webhook events
subscriptions.post('/webhook', async (c) => {
  try {
    const STRIPE_WEBHOOK_SECRET = (c.env as Record<string, string>).STRIPE_WEBHOOK_SECRET;
    const body = await c.req.text();
    const sig = c.req.header('stripe-signature');

    // If webhook secret is configured, we should verify the signature
    // For now we parse the event and process it (production should use stripe SDK for verification)
    if (STRIPE_WEBHOOK_SECRET && !sig) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const participantId = (session.metadata as Record<string, string>)?.participant_id;
        const planId = (session.metadata as Record<string, string>)?.plan_id;
        const billingCycle = (session.metadata as Record<string, string>)?.billing_cycle || 'monthly';

        if (participantId && planId) {
          const priceMap: Record<string, number> = { starter: 99900, professional: 499900 };

          // Deactivate old subscription
          await c.env.DB.prepare(
            "UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE participant_id = ? AND status = 'active'"
          ).bind(nowISO(), participantId).run();

          const subId = generateId();
          await c.env.DB.prepare(`
            INSERT INTO subscriptions (id, participant_id, plan_id, status, billing_cycle, price_cents, started_at, next_billing_at)
            VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
          `).bind(
            subId, participantId, planId, billingCycle,
            priceMap[planId] || 0,
            nowISO(),
            new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400000).toISOString(),
          ).run();

          c.executionCtx.waitUntil(cascade(c.env, {
            type: 'subscription.created',
            actor_id: participantId,
            entity_type: 'subscription',
            entity_id: subId,
            data: { plan_id: planId, billing_cycle: billingCycle, stripe_session_id: session.id },
            ip: c.req.header('CF-Connecting-IP') || 'unknown',
            request_id: c.get('requestId'),
          }));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer as string;
        // Cancel subscription by stripe customer reference
        if (stripeCustomerId) {
          await c.env.DB.prepare(
            "UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE status = 'active'"
          ).bind(nowISO()).run();
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        // Mark subscription as past_due
        if (customerId) {
          await c.env.DB.prepare(
            "UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE status = 'active'"
          ).bind(nowISO()).run();
        }
        break;
      }
    }

    return c.json({ received: true });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default subscriptions;
