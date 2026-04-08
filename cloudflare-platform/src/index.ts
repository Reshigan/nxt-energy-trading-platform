import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { AppBindings, HonoEnv } from './utils/types';
import { rateLimiter, requestIdMiddleware, authMiddleware } from './auth/middleware';
import { securityHeadersMiddleware } from './middleware/security';
import { blacklistToken, isTokenBlacklisted, signJwt, signRefreshToken, verifyJwt } from './auth/jwt';
import { log } from './utils/logger';

// Route imports
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
app.use('*', cors({
  origin: ['https://et.vantax.co.za', 'http://localhost:5173', 'http://localhost:8788'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposeHeaders: ['X-Request-Id'],
  maxAge: 86400,
}));

// Phase 1.2: Rate limiting
app.use('/api/v1/trading/*', rateLimiter({ maxRequests: 300, windowSeconds: 60 }));
app.use('/api/v1/*', rateLimiter({ maxRequests: 100, windowSeconds: 60 }));

// Welcome
app.get('/', (c) => {
  return c.json({
    message: 'NXT Energy Trading Platform API',
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

// Core routes
api.route('/participants', participants);
api.route('/contracts', contracts);
api.route('/trading', trading);
api.route('/carbon', carbon);
api.route('/projects', projectsRoute);
api.route('/settlement', settlement);
api.route('/compliance', compliance);
api.route('/marketplace', marketplace);
api.route('/ai', aiRoutes);
api.route('/reports', reports);
api.route('/tenants', tenantsRoute);
api.route('/developer', developer);
api.route('/metering', metering);
api.route('/p2p', p2p);
api.route('/popia', popia);
api.route('/demand', demand);

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
};
