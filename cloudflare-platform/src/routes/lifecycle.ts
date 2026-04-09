import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { cascade } from '../utils/cascade';

const lifecycle = new Hono<HonoEnv>();

// POST /request-disbursement — Triggered when CPs are met
lifecycle.post('/request-disbursement', authMiddleware({ roles: ['ipp_developer', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const { project_id, tranche_id, amount } = await c.req.json();

    // 1. Verify all mandatory CPs are 'verified'
    const cps = await c.env.DB.prepare(
      `SELECT cp_id FROM project_cps WHERE project_id = ? AND status = 'verified'`
    ).bind(project_id).all();

    // In a real system, we'd check this against the CP_LIBRARY in ipp_tools.ts
    if (cps.results.length < 3) { // Simulation: requires at least 3 verified CPs
      return c.json({ success: false, error: 'Insufficient CPs verified for disbursement' }, 400);
    }

    const disbursementId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO lender_disbursements (id, project_id, tranche_id, amount, status, created_at)
      VALUES (?, ?, ?, ?, 'pending_approval', ?)
    `).bind(disbursementId, project_id, tranche_id, amount, nowISO()).run();

    // Notify Lender
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'disbursement.requested',
      actor_id: user.sub,
      entity_type: 'disbursement',
      entity_id: disbursementId,
      data: { project_id, amount },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ success: true, disbursementId });
  } catch (err) {
    return c.json({ success: false, error: 'Disbursement request failed' }, 500);
  }
});

// POST /declare-cod — Commercial Operation Date declaration
lifecycle.post('/declare-cod', authMiddleware({ roles: ['ipp_developer', 'admin'] }), async (c) => {
  try {
    const user = c.get('user');
    const { project_id, grid_cert_id } = await c.req.json();

    // 1. Verify Grid Certificate existence
    const cert = await c.env.DB.prepare('SELECT id FROM vault_documents WHERE id = ?').bind(grid_cert_id).first();
    if (!cert) {
      return c.json({ success: false, error: 'Valid Grid Connection Certificate required' }, 400);
    }

    // 2. The "Magic Transition": Flip role to Generator and enable trading
    await c.env.DB.prepare(`
      UPDATE participants 
      SET role = 'generator', 
          trading_enabled = 1, 
          kyc_status = 'verified', 
          updated_at = ? 
      WHERE id = ?
    `).bind(nowISO(), user.sub).run();

    // 3. Mark project as operational
    await c.env.DB.prepare(`
      UPDATE projects SET status = 'operational', cod = ? WHERE id = ?
    `).bind(nowISO(), project_id).run();

    // Cascade the transition
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'ipp.cod_reached',
      actor_id: user.sub,
      entity_type: 'project',
      entity_id: project_id,
      data: { project_id, status: 'operational' },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({ 
      success: true, 
      message: 'COD verified. Your account has been upgraded to Generator. Trading and Metering are now active.' 
    });
  } catch (err) {
    return c.json({ success: false, error: 'COD transition failed' }, 500);
  }
});

// GET /lcoe-tracker — Real-time Financial performance
lifecycle.get('/lcoe-tracker', authMiddleware({ roles: ['ipp_developer', 'generator', 'lender'] }), async (c) => {
  try {
    const user = c.get('user');
    
    // 1. Get total generation (MWh) from IoT route
    const genData = await c.env.DB.prepare(
      `SELECT SUM(value_mwh) as total_mwh FROM metering_readings WHERE participant_id = ?`
    ).bind(user.sub).first<{ total_mwh: number }>();

    // 2. Get total loan cost (Principal + Interest)
    const loanData = await c.env.DB.prepare(
      `SELECT SUM(amount) as total_cost FROM lender_disbursements WHERE project_id IN 
       (SELECT id FROM projects WHERE participant_id = ?) AND status = 'disbursed'`
    ).bind(user.sub).first<{ total_cost: number }>();

    const mwh = genData?.total_mwh || 0;
    const cost = loanData?.total_cost || 0;
    const lcoe = mwh > 0 ? cost / mwh : 0;

    return c.json({ 
      success: true, 
      data: {
        total_generation_mwh: mwh,
        total_capital_deployed: cost,
        current_lcoe: lcoe,
        benchmark_lcoe: 450, // Simulation: R450/MWh benchmark
        performance_gap: mwh > 0 ? ((lcoe - 450) / 450) * 100 : 0
      }
    });
  } catch (err) {
    return c.json({ success: false, error: 'LCOE calculation failed' }, 500);
  }
});

export default lifecycle;
