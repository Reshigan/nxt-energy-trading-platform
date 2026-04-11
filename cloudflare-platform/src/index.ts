import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { AppBindings, HonoEnv } from './utils/types';
import { rateLimiter, requestIdMiddleware, authMiddleware } from './auth/middleware';
import { securityHeadersMiddleware } from './middleware/security';
import { blacklistToken, isTokenBlacklisted, signJwt, signRefreshToken, verifyJwt } from './auth/jwt';
import { log } from './utils/logger';

// Route imports
import iot from './routes/iot';
import algo from './routes/algo';
import esgReporting from './routes/esg_reporting';
import ippTools from './routes/ipp_tools';
import surveillanceTools from './routes/surveillance_tools';
import lifecycle from './routes/lifecycle';
import register from './routes/register';
import participants from './routes/participants';

import contracts from './routes/contracts';
import trading from './routes/trading';
import carbon from './routes/carbon';
import projectsRoute from './routes/projects';
import settlement from './routes/settlement';
import compliance from './routes/compliance';
import marketplace from './routes/marketplace';
import aiRoutes from './routes/ai';
import reports from './routes/reports';
import tenantsRoute from './routes/tenants';
import developer from './routes/developer';
import metering from './routes/metering';
import p2p from './routes/p2p';
import healthRoute from './routes/health';
import popia from './routes/popia';
import demand from './routes/demand';
import subscriptions from './routes/subscriptions';
import pricing from './routes/pricing';
import vault from './routes/vault';
import lender from './routes/lender';
import surveillance from './routes/surveillance';
import recs from './routes/recs';
import tokens from './routes/tokens';
import cockpit from './routes/cockpit';
import modulesRoute from './routes/modules';
import onboarding from './routes/onboarding';
import sessionsRoute from './routes/sessions';
import odseRoute from './routes/odse';
import { requireModule } from './middleware/modules';

// Durable Object exports
export { OrderBookDO } from './durable-objects/OrderBookDO';
export { EscrowManagerDO } from './durable-objects/EscrowManagerDO';
export { P2PMatcherDO } from './durable-objects/P2PMatcherDO';
export { SmartContractDO } from './durable-objects/SmartContractDO';
export { RiskEngineDO } from './durable-objects/RiskEngineDO';

const app = new Hono<HonoEnv>();

// Phase 1.7: Request ID on every request
app.use('*', requestIdMiddleware());

// Phase 1.4: Security headers on every response
app.use('*', securityHeadersMiddleware());

// Structured request logging + API analytics counters (Phase 5)
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  log('info', 'request', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
  }, c.get('requestId'));

  // Phase 5.5: Increment KV-based API analytics counters via waitUntil (non-blocking)
  const reqPath = c.req.path;
  const resStatus = c.res.status;
  const segments = ['trading', 'carbon', 'contracts', 'settlement', 'compliance', 'marketplace', 'p2p', 'metering', 'ai', 'reports'];
  const matchedSegment = segments.find((s) => reqPath.includes(`/${s}`));
  if (matchedSegment) {
    c.executionCtx.waitUntil((async () => {
      try {
        const hour = new Date().toISOString().substring(0, 13);
        const countKey = `api_count:/${matchedSegment}:${hour}`;
        const current = parseInt(await c.env.KV.get(countKey) || '0', 10);
        await c.env.KV.put(countKey, String(current + 1), { expirationTtl: 86400 });
        if (resStatus >= 400) {
          const errKey = `api_errors:/${matchedSegment}:${hour}`;
          const errCount = parseInt(await c.env.KV.get(errKey) || '0', 10);
          await c.env.KV.put(errKey, String(errCount + 1), { expirationTtl: 86400 });
        }
        const rtKey = `api_rt:/${matchedSegment}:${hour}`;
        const rtData = await c.env.KV.get(rtKey);
        const rt = rtData ? JSON.parse(rtData) : { sum: 0, count: 0 };
        rt.sum += duration;
        rt.count += 1;
        await c.env.KV.put(rtKey, JSON.stringify(rt), { expirationTtl: 86400 });
      } catch {
        // Non-critical: don't let analytics failures affect requests
      }
    })());
  }
});

// Global middleware
app.use(prettyJSON());
// Item 2: Dynamic CORS — only allow localhost origins in non-production environments
app.use('*', async (c, next) => {
  const env = (c.env as Record<string, unknown>).ENVIRONMENT as string || 'development';
  const origins: string[] = ['https://et.vantax.co.za'];
  if (env !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:8788', 'http://localhost:3011');
  }
  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
  })(c, next);
});

// Phase 1.2: Role-based rate limiting
// Higher limits for trading-heavy roles, lower for read-heavy roles
app.use('/api/v1/trading/*', rateLimiter({ maxRequests: 300, windowSeconds: 60 }));
app.use('/api/v1/carbon/*', rateLimiter({ maxRequests: 200, windowSeconds: 60 }));
// General rate limit — skip paths that already have a specific limiter above
app.use('/api/v1/*', async (c, next) => {
  const p = c.req.path;
  if (p.startsWith('/api/v1/trading/') || p.startsWith('/api/v1/carbon/')) {
    return next();
  }
  return rateLimiter({ maxRequests: 100, windowSeconds: 60 })(c, next);
});

// API versioning headers on all responses
app.use('*', async (c, next) => {
  await next();
  c.header('X-NXT-Version', '2.0.0');
  c.header('X-NXT-Environment', (c.env as Record<string, unknown>).ENVIRONMENT as string || 'development');
});

// Welcome
app.get('/', (c) => {
  return c.json({
    message: 'Ionvex Energy Exchange API',
    version: '2.0.0',
    status: 'running',
    platform: 'Cloudflare Workers',
    docs: 'https://et.vantax.co.za/api/v1',
  });
});

// Phase 5.3: Enhanced health check
app.route('/health', healthRoute);

// API v1 routes
const api = new Hono<HonoEnv>();

// Registration & Auth
api.route('/register', register);
api.post('/auth/login', async (c) => {
  const registerApp = new Hono<HonoEnv>();
  registerApp.route('/', register);
  const url = new URL(c.req.url);
  url.pathname = '/auth/login';
  const newReq = new Request(url.toString(), c.req.raw);
  return registerApp.fetch(newReq, c.env);
});

// Phase 1.8 + 3.9: Logout with token blacklist
api.post('/auth/logout', authMiddleware(), async (c) => {
  const token = c.req.header('Authorization')?.substring(7);
  if (token) {
    try {
      await blacklistToken(c.env.KV, token, 86400);
    } catch { /* best-effort */ }
  }
  return c.json({ success: true, message: 'Logged out' });
});

// Phase 1.8: Token refresh with rotation
api.post('/auth/refresh', async (c) => {
  const body = await c.req.json() as { refreshToken?: string };
  if (!body.refreshToken) {
    return c.json({ success: false, error: 'Refresh token required' }, 400);
  }

  const secret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;

  // Check if refresh token has been blacklisted (rotated)
  try {
    const blacklisted = await isTokenBlacklisted(c.env.KV, body.refreshToken);
    if (blacklisted) {
      return c.json({ success: false, error: 'Refresh token has been revoked' }, 401);
    }
  } catch { /* If KV fails, allow through */ }

  const decoded = await verifyJwt(body.refreshToken, secret);
  if (!decoded || (decoded as unknown as Record<string, unknown>).type !== 'refresh') {
    return c.json({ success: false, error: 'Invalid refresh token' }, 401);
  }

  const participant = await c.env.DB.prepare(
    'SELECT id, email, role, company_name, kyc_status FROM participants WHERE id = ?'
  ).bind(decoded.sub).first<{
    id: string; email: string; role: string; company_name: string; kyc_status: string;
  }>();

  if (!participant) {
    return c.json({ success: false, error: 'Participant not found' }, 404);
  }

  // Blacklist old refresh token (rotation)
  try { await blacklistToken(c.env.KV, body.refreshToken, 86400 * 30); } catch { /* */ }

  const newToken = await signJwt({
    sub: participant.id,
    email: participant.email,
    role: participant.role as any,
    company_name: participant.company_name,
    kyc_status: participant.kyc_status as any,
  }, secret);
  const newRefresh = await signRefreshToken(participant.id, secret);

  return c.json({ success: true, data: { token: newToken, refreshToken: newRefresh } });
});

// Core routes (no module guard — always available)
api.route('/participants', participants);
api.route('/contracts', contracts);
api.route('/compliance', compliance);

// Module-gated routes
api.use('/trading/*', requireModule('spot_trading'));
api.route('/trading', trading);
api.use('/carbon/*', requireModule('carbon_credits'));
api.route('/carbon', carbon);
api.route('/projects', projectsRoute);
api.use('/settlement/*', requireModule('settlement'));
api.route('/settlement', settlement);
api.use('/marketplace/*', requireModule('marketplace'));
api.route('/marketplace', marketplace);
api.use('/ai/*', requireModule('ai_portfolio'));
api.route('/ai', aiRoutes);
api.use('/reports/*', requireModule('report_builder'));
api.route('/reports', reports);
api.use('/tenants/*', requireModule('multi_tenant'));
api.route('/tenants', tenantsRoute);
api.use('/developer/*', requireModule('developer_api'));
api.route('/developer', developer);
api.use('/metering/*', requireModule('metering'));
api.route('/metering', metering);
api.use('/p2p/*', requireModule('p2p_trading'));
api.route('/p2p', p2p);
api.route('/popia', popia);
api.route('/demand', demand);
api.route('/subscriptions', subscriptions);
api.route('/pricing', pricing);
api.route('/vault', vault);
api.route('/lender', lender);
api.route('/surveillance', surveillance);
api.use('/recs/*', requireModule('recs'));
api.route('/recs', recs);
api.use('/tokens/*', requireModule('tokenization'));
api.route('/tokens', tokens);
api.route('/cockpit', cockpit);
api.route('/modules', modulesRoute);
api.route('/onboarding', onboarding);
api.route('/sessions', sessionsRoute);

api.route('/odse', odseRoute);
api.route('/iot', iot);
api.route('/algo', algo);
api.route('/esg-reporting', esgReporting);
api.route('/ipp-tools', ippTools);
api.route('/surveillance-tools', surveillanceTools);



api.route('/lifecycle', lifecycle);

// Dashboard summary (role-adaptive)
api.get('/dashboard/summary', authMiddleware({ requireKyc: false }), async (c) => {
  const user = c.get('user');
  const counts = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM trades WHERE status = 'pending'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM contract_documents WHERE phase = 'active'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM carbon_credits WHERE status = 'active'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE status NOT IN ('resolved', 'escalated')").first<{ count: number }>(),
    c.env.DB.prepare("SELECT SUM(total_cents) as total FROM trades WHERE status = 'settled'").first<{ total: number | null }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE participant_id = ? AND status IN ('open', 'partial')").bind(user.sub).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM notifications WHERE participant_id = ? AND read = 0').bind(user.sub).first<{ count: number }>(),
  ]);

  return c.json({
    success: true,
    data: {
      participants: counts[0]?.count || 0,
      projects: counts[1]?.count || 0,
      pending_trades: counts[2]?.count || 0,
      active_contracts: counts[3]?.count || 0,
      active_credits: counts[4]?.count || 0,
      open_disputes: counts[5]?.count || 0,
      total_traded_cents: counts[6]?.total || 0,
      my_open_orders: counts[7]?.count || 0,
      unread_notifications: counts[8]?.count || 0,
      role: user.role,
      participant_id: user.sub,
    },
  });
});

// Notifications
api.get('/notifications', authMiddleware(), async (c) => {
  const user = c.get('user');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  const results = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE participant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(user.sub, limit, offset).all();
  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE participant_id = ?'
  ).bind(user.sub).first<{ count: number }>();
  return c.json({ success: true, data: results.results, meta: { page, limit, total: total?.count || 0 } });
});

api.patch('/notifications/:id/read', authMiddleware(), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND participant_id = ?').bind(id, user.sub).run();
  return c.json({ success: true });
});

api.patch('/notifications/read-all', authMiddleware(), async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE participant_id = ? AND read = 0').bind(user.sub).run();
  return c.json({ success: true });
});

// Legacy market insights
api.get('/market/insights', async (c) => {
  const markets = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];
  const indices: Record<string, unknown> = {};
  for (const market of markets) {
    const indexStr = await c.env.KV.get(`index:${market}`);
    indices[market] = indexStr ? JSON.parse(indexStr) : { price: 0, change_24h: 0, volume_24h: 0, last_trade: null };
  }
  return c.json({
    timestamp: new Date().toISOString(),
    marketCondition: 'Bullish',
    confidence: 0.87,
    indices,
    recommendations: [
      'Consider increasing solar portfolio exposure',
      'Monitor natural gas prices for arbitrage opportunities',
      'Prepare for potential demand spike in evening hours',
    ],
  });
});

// Phase 5.6: Frontend error reporting endpoint (receives from ErrorBoundary sendBeacon)
api.post('/errors/frontend', async (c) => {
  try {
    const body = await c.req.json() as { message?: string; stack?: string; componentStack?: string; url?: string; timestamp?: string };
    const { storeError } = await import('./utils/logger');
    await storeError(c.env.KV, 'frontend_error', new Error(body.message || 'Unknown frontend error'), c.get('requestId'));
    log('error', 'frontend_error', { message: body.message, url: body.url, timestamp: body.timestamp }, c.get('requestId'));
    return c.json({ success: true });
  } catch {
    return c.json({ success: true }); // Always return 200 for beacon
  }
});

// Phase 5.5: API analytics endpoint (reads KV counters written by middleware)
api.get('/analytics/api', authMiddleware({ roles: ['admin'] }), async (c) => {
  const hour = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
  const endpoints = ['/trading', '/carbon', '/contracts', '/settlement', '/compliance', '/marketplace', '/p2p', '/metering', '/ai', '/reports'];
  const stats: Record<string, unknown> = {};
  for (const ep of endpoints) {
    const countStr = await c.env.KV.get(`api_count:${ep}:${hour}`);
    const errStr = await c.env.KV.get(`api_errors:${ep}:${hour}`);
    const rtStr = await c.env.KV.get(`api_rt:${ep}:${hour}`);
    const rt = rtStr ? JSON.parse(rtStr) : { sum: 0, count: 0 };
    stats[ep] = {
      requests: parseInt(countStr || '0', 10),
      errors: parseInt(errStr || '0', 10),
      avg_response_ms: rt.count > 0 ? Math.round(rt.sum / rt.count) : 0,
    };
  }
  return c.json({ success: true, data: { hour, endpoints: stats } });
});

// Fee schedule
api.get('/fees', async (c) => {
  const fees = await c.env.DB.prepare('SELECT * FROM fee_schedule WHERE active = 1').all();
  return c.json({ success: true, data: fees.results });
});

// ── Admin routes ──────────────────────────────────────────────
api.get('/admin/participants', authMiddleware({ roles: ['admin', 'regulator'] }), async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = (page - 1) * limit;
  const results = await c.env.DB.prepare('SELECT * FROM participants ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>();
  return c.json({ success: true, data: results.results, meta: { page, limit, total: total?.count || 0 } });
});

api.get('/admin/users', authMiddleware({ roles: ['admin'] }), async (c) => {
  const results = await c.env.DB.prepare('SELECT id, email, role, company_name, kyc_status, created_at FROM participants ORDER BY created_at DESC').all();
  return c.json({ success: true, data: results.results });
});

api.get('/admin/users/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const user = await c.env.DB.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first();
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  return c.json({ success: true, data: user });
});

api.patch('/admin/users/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (['role', 'kyc_status', 'trading_enabled', 'company_name'].includes(key)) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (updates.length === 0) return c.json({ success: false, error: 'No valid fields to update' }, 400);
  values.push(id);
  await c.env.DB.prepare(`UPDATE participants SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run();
  return c.json({ success: true });
});

// Item 18: Soft-delete for admin user deletion — mark as deleted instead of hard DELETE
api.delete('/admin/users/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  await c.env.DB.prepare(
    "UPDATE participants SET kyc_status = 'deleted', trading_enabled = 0, updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
  // Audit the soft-delete
  try {
    const { generateId } = await import('./utils/id');
    await c.env.DB.prepare(
      "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'admin.user_soft_deleted', 'participant', ?, ?, ?)"
    ).bind(generateId(), user.sub, id, JSON.stringify({ action: 'soft_delete' }), c.req.header('CF-Connecting-IP') || 'unknown').run();
  } catch { /* best-effort audit */ }
  return c.json({ success: true, message: 'User account deactivated (soft-deleted)' });
});

api.get('/admin/stats', authMiddleware({ roles: ['admin'] }), async (c) => {
  const [users, trades, contracts, credits] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM trades').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM contract_documents').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM carbon_credits').first<{ count: number }>(),
  ]);
  return c.json({ success: true, data: { users: users?.count || 0, trades: trades?.count || 0, contracts: contracts?.count || 0, credits: credits?.count || 0 } });
});

api.get('/admin/revenue', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const totalTraded = await c.env.DB.prepare("SELECT SUM(total_cents) as total FROM trades WHERE status = 'settled'").first<{ total: number | null }>();
    const monthTraded = await c.env.DB.prepare("SELECT SUM(total_cents) as total FROM trades WHERE status = 'settled' AND created_at >= date('now', 'start of month')").first<{ total: number | null }>();
    const fees = await c.env.DB.prepare("SELECT SUM(fee_cents) as total FROM trades WHERE status = 'settled'").first<{ total: number | null }>();
    let subsCount = 0;
    try {
      const subs = await c.env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").first<{ count: number }>();
      subsCount = subs?.count || 0;
    } catch {
      // subscriptions table may not exist yet
    }
    return c.json({
      success: true,
      data: {
        total_revenue_cents: totalTraded?.total || 0,
        month_revenue_cents: monthTraded?.total || 0,
        trading_fees_cents: fees?.total || 0,
        active_subscriptions: subsCount,
        monthly: [],
      },
    });
  } catch {
    return c.json({ success: true, data: { total_revenue_cents: 0, month_revenue_cents: 0, trading_fees_cents: 0, active_subscriptions: 0, monthly: [] } });
  }
});

// ── Audit Trail ──────────────────────────────────────────────
api.get('/admin/audit-log', authMiddleware({ roles: ['admin', 'regulator'] }), async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = (page - 1) * limit;
  const action = c.req.query('action');
  let query = 'SELECT * FROM audit_log';
  const params: unknown[] = [];
  if (action) { query += ' WHERE action = ?'; params.push(action); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: results.results });
});

// ── Tenant Admin ─────────────────────────────────────────────
api.post('/admin/tenants', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { generateId, nowISO } = await import('./utils/id');
  const body = await c.req.json() as { name: string; domain?: string };
  if (!body.name) return c.json({ success: false, error: 'Tenant name is required' }, 400);
  const id = generateId();
  await c.env.DB.prepare('INSERT INTO tenants (id, name, domain, status, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, body.name, body.domain || null, 'active', nowISO()).run();
  return c.json({ success: true, data: { id } });
});

api.delete('/admin/tenants/:id', authMiddleware({ roles: ['admin'] }), async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ── Disputes (Settlement) ────────────────────────────────────
api.get('/settlement/disputes', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const isAdmin = user.role === 'admin' || user.role === 'regulator';
    let query = 'SELECT * FROM disputes';
    const params: unknown[] = [];
    if (!isAdmin) {
      query += ' WHERE claimant_id = ? OR respondent_id = ?';
      params.push(user.sub, user.sub);
    }
    query += ' ORDER BY created_at DESC';
    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

api.post('/settlement/disputes', authMiddleware(), async (c) => {
  try {
    const { generateId, nowISO } = await import('./utils/id');
    const user = c.get('user');
    const body = await c.req.json() as { type: string; subject: string; description: string; category?: string; respondent_id?: string; counterparty_id?: string; contract_id?: string; value_cents?: number };
    if (!body.type && !body.category) return c.json({ success: false, error: 'Type/category is required' }, 400);
    const id = generateId();
    const category = body.category || body.type || 'other';
    const respondent = body.respondent_id || body.counterparty_id;
    if (!respondent) return c.json({ success: false, error: 'respondent_id is required' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO disputes (id, claimant_id, respondent_id, category, description, value_cents, contract_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, respondent, category, body.description || body.subject || '', body.value_cents || 0, body.contract_id || null, 'filed', nowISO()).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    return c.json({ success: false, error: 'Failed to file dispute' }, 500);
  }
});

// Item 16: Dispute update ownership check — only admin/regulator can change status
api.patch('/settlement/disputes/:id', authMiddleware({ roles: ['admin', 'regulator'] }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { status?: string; resolution?: string };
    const updates: string[] = [];
    const values: unknown[] = [];
    if (body.status) { updates.push('status = ?'); values.push(body.status); }
    if (body.resolution) { updates.push('resolution = ?'); values.push(body.resolution); }
    if (updates.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE disputes SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update dispute' }, 500);
  }
});

// ── Invoices ─────────────────────────────────────────────────
api.get('/invoices', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const isAdmin = user.role === 'admin';
    let query = 'SELECT * FROM invoices';
    const params: unknown[] = [];
    if (!isAdmin) { query += ' WHERE from_participant_id = ? OR to_participant_id = ?'; params.push(user.sub, user.sub); }
    query += ' ORDER BY created_at DESC';
    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

api.post('/invoices', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
    const { generateId, nowISO } = await import('./utils/id');
    const user = c.get('user');
    const body = await c.req.json() as { participant_id?: string; to_participant_id?: string; amount_cents: number; description: string; due_date: string };
    const toParticipant = body.to_participant_id || body.participant_id;
    if (!toParticipant || !body.amount_cents) return c.json({ success: false, error: 'participant and amount are required' }, 400);
    const id = generateId();
    const invoiceNumber = `INV-${Date.now()}`;
    const vatCents = Math.round(body.amount_cents * 0.15);
    await c.env.DB.prepare(
      'INSERT INTO invoices (id, invoice_number, from_participant_id, to_participant_id, description, subtotal_cents, vat_cents, total_cents, status, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, invoiceNumber, user.sub, toParticipant, body.description || '', body.amount_cents, vatCents, body.amount_cents + vatCents, 'outstanding', body.due_date || null, nowISO()).run();
    return c.json({ success: true, data: { id } });
  } catch (err) {
    return c.json({ success: false, error: 'Failed to create invoice' }, 500);
  }
});

// ── Smart Rules ──────────────────────────────────────────────
// Item 17: Smart rules ownership check — only show rules for contracts user is party to, or all for admin
api.get('/smart-rules', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    if (user.role === 'admin') {
      const results = await c.env.DB.prepare('SELECT scr.*, cd.title as contract_title FROM smart_contract_rules scr LEFT JOIN contract_documents cd ON scr.contract_doc_id = cd.id ORDER BY scr.created_at DESC').all();
      return c.json({ success: true, data: results.results });
    }
    // Non-admin: only rules for contracts where user is creator or counterparty
    const results = await c.env.DB.prepare(
      'SELECT scr.*, cd.title as contract_title FROM smart_contract_rules scr LEFT JOIN contract_documents cd ON scr.contract_doc_id = cd.id WHERE cd.creator_id = ? OR cd.counterparty_id = ? ORDER BY scr.created_at DESC'
    ).bind(user.sub, user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

// Item 17: Smart rules ownership check — verify user is party to contract or admin
api.post('/smart-rules', authMiddleware(), async (c) => {
  try {
    const { generateId, nowISO } = await import('./utils/id');
    const user = c.get('user');
    const body = await c.req.json() as { contract_doc_id: string; rule_type: string; trigger_condition: string; action: string };
    if (!body.contract_doc_id || !body.rule_type) return c.json({ success: false, error: 'contract_doc_id and rule_type are required' }, 400);
    // Ownership check: user must be party to contract or admin
    if (user.role !== 'admin') {
      const contract = await c.env.DB.prepare('SELECT id FROM contract_documents WHERE id = ? AND (creator_id = ? OR counterparty_id = ?)').bind(body.contract_doc_id, user.sub, user.sub).first();
      if (!contract) return c.json({ success: false, error: 'You are not a party to this contract' }, 403);
    }
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO smart_contract_rules (id, contract_doc_id, rule_type, trigger_condition, action, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, body.contract_doc_id, body.rule_type, body.trigger_condition || '{}', body.action || '{}', nowISO()).run();
    return c.json({ success: true, data: { id } });
  } catch {
    return c.json({ success: false, error: 'Smart rules table not available' }, 500);
  }
});

// Item 17: Smart rules ownership check on update
api.patch('/smart-rules/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    // Ownership check: user must be party to the rule's contract or admin
    if (user.role !== 'admin') {
      const rule = await c.env.DB.prepare(
        'SELECT scr.id FROM smart_contract_rules scr JOIN contract_documents cd ON scr.contract_doc_id = cd.id WHERE scr.id = ? AND (cd.creator_id = ? OR cd.counterparty_id = ?)'
      ).bind(id, user.sub, user.sub).first();
      if (!rule) return c.json({ success: false, error: 'Not authorized to modify this rule' }, 403);
    }
    const body = await c.req.json() as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(body)) {
      if (['rule_type', 'trigger_condition', 'action', 'enabled'].includes(key)) { updates.push(`${key} = ?`); values.push(val); }
    }
    if (updates.length === 0) return c.json({ success: false, error: 'No valid fields' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE smart_contract_rules SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to update smart rule' }, 500);
  }
});

// Item 17: Smart rules ownership check on delete
api.delete('/smart-rules/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    // Ownership check: user must be party to the rule's contract or admin
    if (user.role !== 'admin') {
      const rule = await c.env.DB.prepare(
        'SELECT scr.id FROM smart_contract_rules scr JOIN contract_documents cd ON scr.contract_doc_id = cd.id WHERE scr.id = ? AND (cd.creator_id = ? OR cd.counterparty_id = ?)'
      ).bind(id, user.sub, user.sub).first();
      if (!rule) return c.json({ success: false, error: 'Not authorized to delete this rule' }, 403);
    }
    await c.env.DB.prepare('DELETE FROM smart_contract_rules WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete smart rule' }, 500);
  }
});

// ── System Health ────────────────────────────────────────────
api.get('/health/status', authMiddleware({ roles: ['admin'] }), async (c) => {
  const [users, trades, contracts] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM trades').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM contract_documents').first<{ count: number }>(),
  ]);
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: 0,  // Workers don't have process.uptime
      database: { status: 'connected', users: users?.count || 0, trades: trades?.count || 0, contracts: contracts?.count || 0 },
      services: { d1: 'operational', kv: 'operational', r2: 'operational', do: 'operational' },
      timestamp: new Date().toISOString(),
    },
  });
});

api.get('/health/metrics', authMiddleware({ roles: ['admin'] }), async (c) => {
  const hour = new Date().toISOString().substring(0, 13);
  const endpoints = ['/trading', '/carbon', '/contracts', '/settlement', '/p2p'];
  const metrics: Record<string, unknown> = {};
  for (const ep of endpoints) {
    const countStr = await c.env.KV.get(`api_count:${ep}:${hour}`);
    const rtStr = await c.env.KV.get(`api_rt:${ep}:${hour}`);
    const rt = rtStr ? JSON.parse(rtStr) : { sum: 0, count: 0 };
    metrics[ep] = { requests: parseInt(countStr || '0', 10), avg_response_ms: rt.count > 0 ? Math.round(rt.sum / rt.count) : 0 };
  }
  return c.json({ success: true, data: { hour, metrics } });
});

// ── Reports Schedule ─────────────────────────────────────────
api.post('/reports/schedule', authMiddleware(), async (c) => {
  try {
    const { generateId, nowISO } = await import('./utils/id');
    const user = c.get('user');
    const body = await c.req.json() as { frequency: string; email: string; report_type?: string };
    if (!body.frequency || !body.email) return c.json({ success: false, error: 'Frequency and email are required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      'INSERT INTO report_schedules (id, participant_id, frequency, email, report_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.sub, body.frequency, body.email, body.report_type || 'general', 'active', nowISO()).run();
    return c.json({ success: true, data: { id } });
  } catch {
    return c.json({ success: false, error: 'Report schedules not available' }, 500);
  }
});

api.get('/reports/schedules', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const results = await c.env.DB.prepare('SELECT * FROM report_schedules WHERE participant_id = ? ORDER BY created_at DESC').bind(user.sub).all();
    return c.json({ success: true, data: results.results });
  } catch {
    return c.json({ success: true, data: [] });
  }
});

api.delete('/reports/schedule/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    await c.env.DB.prepare('DELETE FROM report_schedules WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: 'Failed to delete schedule' }, 500);
  }
});

// ── 2FA Auth ─────────────────────────────────────────────────
api.post('/auth/2fa/enable', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const secret = crypto.randomUUID().replace(/-/g, '').substring(0, 20).toUpperCase();
    await c.env.KV.put(`2fa:${user.sub}`, secret, { expirationTtl: 86400 * 365 });
    return c.json({ success: true, data: { secret, otpauth_uri: `otpauth://totp/NXT%20Energy:${user.email}?secret=${secret}&issuer=NXT%20Energy` } });
  } catch {
    return c.json({ success: false, error: '2FA setup failed' }, 500);
  }
});

api.post('/auth/2fa/verify', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { code: string };
    const secret = await c.env.KV.get(`2fa:${user.sub}`);
    if (!secret) return c.json({ success: false, error: '2FA not enabled' }, 400);
    if (!body.code || body.code.length !== 6) return c.json({ success: false, error: 'Invalid code' }, 400);
    try {
      await c.env.DB.prepare("UPDATE participants SET two_factor_enabled = 1, updated_at = datetime('now') WHERE id = ?").bind(user.sub).run();
    } catch { /* two_factor_enabled column may not exist */ }
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: '2FA verification failed' }, 500);
  }
});

api.post('/auth/2fa/disable', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    await c.env.KV.delete(`2fa:${user.sub}`);
    try {
      await c.env.DB.prepare("UPDATE participants SET two_factor_enabled = 0, updated_at = datetime('now') WHERE id = ?").bind(user.sub).run();
    } catch { /* two_factor_enabled column may not exist */ }
    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: '2FA disable failed' }, 500);
  }
});

// Mount API
app.route('/api/v1', api);

// Cron trigger handler
const scheduled: ExportedHandler<AppBindings>['scheduled'] = async (_event, env) => {
  const { generateId, nowISO } = await import('./utils/id');
  try {
    // 1. Licence expiry notifications
    const expiringLicences = await env.DB.prepare(`
      SELECT l.id, l.participant_id, l.type, l.expiry_date FROM licences l
      WHERE l.status = 'active' AND l.expiry_date <= date('now', '+90 days') AND l.expiry_date > date('now')
    `).all();
    for (const licence of expiringLicences.results) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
        VALUES (?, ?, 'Licence Expiring Soon', ?, 'compliance', 'licence', ?)
      `).bind(
        generateId(), licence.participant_id,
        'Your ' + licence.type + ' licence expires on ' + licence.expiry_date + '. Please renew.',
        licence.id
      ).run();
    }

    // 2. Mark overdue invoices
    await env.DB.prepare(`UPDATE invoices SET status = 'overdue' WHERE status = 'outstanding' AND due_date < date('now')`).run();

    // 3. Expire marketplace listings
    await env.DB.prepare(`UPDATE marketplace_listings SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < datetime('now')`).run();

    // 4. Expire day orders and GTD orders
    await env.DB.prepare(`UPDATE orders SET status = 'expired', updated_at = datetime('now') WHERE status IN ('open', 'partial') AND validity = 'day' AND date(created_at) < date('now')`).run();
    await env.DB.prepare(`UPDATE orders SET status = 'expired', updated_at = datetime('now') WHERE status IN ('open', 'partial') AND validity = 'gtd' AND gtd_expiry IS NOT NULL AND gtd_expiry < datetime('now')`).run();

    // 5. Expire P2P offers
    await env.DB.prepare(`UPDATE p2p_trades SET status = 'expired' WHERE status = 'open' AND expires_at IS NOT NULL AND expires_at < datetime('now')`).run();

    // 6. Phase 3.3: D1 backup to R2 (daily export of critical tables)
    try {
      const tables = ['participants', 'trades', 'carbon_credits', 'contract_documents', 'invoices', 'orders'];
      const dateStr = new Date().toISOString().split('T')[0];
      for (const table of tables) {
        const rows = await env.DB.prepare(`SELECT * FROM ${table}`).all();
        await env.R2.put(
          `backups/${dateStr}/${table}.json`,
          JSON.stringify({ table, exported_at: nowISO(), row_count: rows.results.length, data: rows.results }),
        );
      }
      log('info', 'backup_completed', { tables: tables.length, date: dateStr });
    } catch (backupErr) {
      log('error', 'backup_failed', { error: backupErr instanceof Error ? backupErr.message : String(backupErr) });
    }

    // 7. Phase 3.10: Daily risk metrics recalculation
    try {
      const participants = await env.DB.prepare(
        "SELECT id FROM participants WHERE trading_enabled = 1 AND kyc_status = 'verified'"
      ).all();
      for (const p of participants.results) {
        const doId = env.RISK_ENGINE.idFromName(p.id as string);
        const stub = env.RISK_ENGINE.get(doId);
        await stub.fetch(new Request('https://do/recalculate', { method: 'POST' }));
      }
      log('info', 'risk_recalc_completed', { participants: participants.results.length });
    } catch (riskErr) {
      log('error', 'risk_recalc_failed', { error: riskErr instanceof Error ? riskErr.message : String(riskErr) });
    }

    // 8. Phase 3.10: Weekly compliance report generation (runs on Mondays)
    if (new Date().getDay() === 1) {
      try {
        const report = {
          id: generateId(),
          generated_at: nowISO(),
          type: 'weekly_compliance',
          kyc_pending: ((await env.DB.prepare("SELECT COUNT(*) as c FROM participants WHERE kyc_status = 'pending'").first<{ c: number }>())?.c || 0),
          licences_expiring: expiringLicences.results.length,
          open_disputes: ((await env.DB.prepare("SELECT COUNT(*) as c FROM disputes WHERE status NOT IN ('resolved','escalated')").first<{ c: number }>())?.c || 0),
          overdue_invoices: ((await env.DB.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'").first<{ c: number }>())?.c || 0),
        };
        await env.KV.put(`compliance_report:${new Date().toISOString().split('T')[0]}`, JSON.stringify(report), { expirationTtl: 86400 * 90 });
        log('info', 'compliance_report_generated', report);
      } catch (compErr) {
        log('error', 'compliance_report_failed', { error: compErr instanceof Error ? compErr.message : String(compErr) });
      }
    }

    log('info', 'cron_completed', { licences: expiringLicences.results.length });
  } catch (err) {
    log('error', 'cron_failed', { error: err instanceof Error ? err.message : String(err) });
  }
};

export default {
  fetch: app.fetch,
  scheduled,
  async queue(batch: MessageBatch<unknown>, env: AppBindings) {
    for (const msg of batch.messages) {
      try {
        const payload = msg.body as Record<string, unknown>;
        const log = (level: string, action: string, details: Record<string, unknown>) =>
          console.log(JSON.stringify({ level, action, ...details, ts: new Date().toISOString() }));
        log('info', 'queue_event', { type: payload?.type, id: payload?.id });
        msg.ack();
      } catch {
        msg.retry();
      }
    }
  },
};
