import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { logger } from 'hono/logger';
import { AppBindings, HonoEnv } from './utils/types';
import { rateLimiter } from './auth/middleware';

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

// Durable Object exports
export { OrderBookDO } from './durable-objects/OrderBookDO';
export { EscrowManagerDO } from './durable-objects/EscrowManagerDO';
export { P2PMatcherDO } from './durable-objects/P2PMatcherDO';
export { SmartContractDO } from './durable-objects/SmartContractDO';
export { RiskEngineDO } from './durable-objects/RiskEngineDO';

const app = new Hono<HonoEnv>();

// Global middleware
app.use(logger());
app.use(prettyJSON());
app.use('*', cors({
  origin: ['https://et.vantax.co.za', 'http://localhost:5173', 'http://localhost:8788'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-Id'],
  maxAge: 86400,
}));

// Rate limiting: 300 req/min for trading, 100 req/min general
app.use('/api/v1/trading/*', rateLimiter({ maxRequests: 300, windowSeconds: 60 }));
app.use('/api/v1/*', rateLimiter({ maxRequests: 100, windowSeconds: 60 }));

// Welcome endpoint
app.get('/', (c) => {
  return c.json({
    message: 'NXT Energy Trading Platform API',
    version: '2.0.0',
    status: 'running',
    platform: 'Cloudflare Workers',
    docs: 'https://et.vantax.co.za/api/v1',
  });
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers Edge Network',
  });
});

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

// Participants
api.route('/participants', participants);

// Contracts
api.route('/contracts', contracts);

// Trading & Orders
api.route('/trading', trading);

// Carbon Credits & Options
api.route('/carbon', carbon);

// IPP Projects
api.route('/projects', projectsRoute);

// Settlement, Escrows, Invoices, Disputes
api.route('/settlement', settlement);

// Compliance, KYC, Audit
api.route('/compliance', compliance);

// Marketplace, Notifications
api.route('/marketplace', marketplace);

// Spec 7: AI Portfolio Optimisation & Weather
api.route('/ai', aiRoutes);

// Spec 7: Custom Report Builder
api.route('/reports', reports);

// Spec 7: Multi-Tenant White-Label
api.route('/tenants', tenantsRoute);

// Spec 7: Developer Portal & API Marketplace
api.route('/developer', developer);

// Spec 7: IoT Metering Ingestion
api.route('/metering', metering);

// Spec 7: P2P Energy Trading
api.route('/p2p', p2p);

// Dashboard summary
api.get('/dashboard/summary', async (c) => {
  const counts = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM participants').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM trades WHERE status = 'pending'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM contract_documents WHERE phase = 'active'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM carbon_credits WHERE status = 'active'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM disputes WHERE status NOT IN ('resolved', 'escalated')").first<{ count: number }>(),
    c.env.DB.prepare("SELECT SUM(total_cents) as total FROM trades WHERE status = 'settled'").first<{ total: number | null }>(),
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
    },
  });
});

// Legacy market insights (backward compatibility)
api.get('/market/insights', async (c) => {
  const markets = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];
  const indices: Record<string, unknown> = {};

  for (const market of markets) {
    const indexStr = await c.env.KV.get(`index:${market}`);
    indices[market] = indexStr ? JSON.parse(indexStr) : {
      price: 0, change_24h: 0, volume_24h: 0, last_trade: null,
    };
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

// Fee schedule
api.get('/fees', async (c) => {
  const fees = await c.env.DB.prepare('SELECT * FROM fee_schedule WHERE active = 1').all();
  return c.json({ success: true, data: fees.results });
});

// Mount API
app.route('/api/v1', api);

// Cron trigger handler (daily re-verification at 06:00 UTC)
const scheduled: ExportedHandler<AppBindings>['scheduled'] = async (_event, env) => {
  const { generateId } = await import('./utils/id');

  // Re-verify expiring licences
  const expiringLicences = await env.DB.prepare(`
    SELECT l.id, l.participant_id, l.type, l.expiry_date
    FROM licences l
    WHERE l.status = 'active'
    AND l.expiry_date <= date('now', '+90 days')
    AND l.expiry_date > date('now')
  `).all();

  for (const licence of expiringLicences.results) {
    await env.DB.prepare(`
      INSERT INTO notifications (id, participant_id, title, body, type, entity_type, entity_id)
      VALUES (?, ?, 'Licence Expiring Soon', ?, 'compliance', 'licence', ?)
    `).bind(
      generateId(), licence.participant_id,
      `Your ${licence.type} licence expires on ${licence.expiry_date}. Please renew.`,
      licence.id
    ).run();
  }

  // Check overdue invoices
  await env.DB.prepare(`
    UPDATE invoices SET status = 'overdue'
    WHERE status = 'outstanding' AND due_date < date('now')
  `).run();

  // Check expired marketplace listings
  await env.DB.prepare(`
    UPDATE marketplace_listings SET status = 'expired'
    WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < datetime('now')
  `).run();
};

export default {
  fetch: app.fetch,
  scheduled,
};
