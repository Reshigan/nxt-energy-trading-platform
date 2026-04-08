/**
 * Phase 1.15-1.16: Demand Profile Management
 * 5 endpoints: profile CRUD, bill upload, AI analysis, matching, express interest
 * Cascade events: demand.matched, loi.created
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { generateId, nowISO } from '../utils/id';
import { authMiddleware } from '../auth/middleware';
import { parsePagination, errorResponse, ErrorCodes } from '../utils/pagination';
import { cascade } from '../utils/cascade';
import { captureException } from '../utils/sentry';

const demand = new Hono<HonoEnv>();

// POST /demand/profiles — Create demand profile
demand.post('/profiles', authMiddleware({ roles: ['admin', 'offtaker'] }), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as {
      company_name: string;
      annual_kwh: number;
      peak_kw: number;
      monthly_spend_cents: number;
      load_factor?: number;
      supply_type?: string;
      province?: string;
      municipality?: string;
      grid_connection?: string;
      renewable_preference?: number;
      contract_term_months?: number;
      max_price_cents_kwh?: number;
      notes?: string;
    };

    if (!body.company_name || !body.annual_kwh || !body.peak_kw) {
      return c.json({ success: false, error: 'company_name, annual_kwh, and peak_kw are required' }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO demand_profiles (id, participant_id, company_name, annual_kwh, peak_kw,
        monthly_spend_cents, load_factor, supply_type, province, municipality,
        grid_connection, renewable_preference, contract_term_months, max_price_cents_kwh, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).bind(
      id, user.sub, body.company_name, body.annual_kwh, body.peak_kw,
      body.monthly_spend_cents || 0,
      body.load_factor || 0,
      body.supply_type || 'grid',
      body.province || 'Gauteng',
      body.municipality || null,
      body.grid_connection || 'medium_voltage',
      body.renewable_preference || 0.5,
      body.contract_term_months || 120,
      body.max_price_cents_kwh || null,
      body.notes || null,
    ).run();

    return c.json({ success: true, data: { id, status: 'draft' } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /demand/profiles — List profiles
demand.get('/profiles', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const pg = parsePagination(c.req.query());

    let query: string;
    const params: unknown[] = [];

    if (user.role === 'admin') {
      query = 'SELECT * FROM demand_profiles ORDER BY created_at DESC LIMIT ? OFFSET ?';
    } else {
      query = 'SELECT * FROM demand_profiles WHERE participant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(user.sub);
    }
    params.push(pg.per_page, pg.offset);

    const results = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /demand/profiles/:id — Get single profile
demand.get('/profiles/:id', authMiddleware(), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');

    const profile = await c.env.DB.prepare('SELECT * FROM demand_profiles WHERE id = ?').bind(id).first();
    if (!profile) return c.json({ success: false, error: 'Profile not found' }, 404);
    if (user.role !== 'admin' && profile.participant_id !== user.sub) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    // Get associated bills
    const bills = await c.env.DB.prepare(
      'SELECT * FROM bill_uploads WHERE profile_id = ? ORDER BY month DESC'
    ).bind(id).all();

    // Get matches
    const matches = await c.env.DB.prepare(
      'SELECT * FROM demand_matches WHERE profile_id = ? ORDER BY match_score DESC'
    ).bind(id).all();

    return c.json({
      success: true,
      data: { ...profile, bills: bills.results, matches: matches.results },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// PUT /demand/profiles/:id — Update profile
demand.put('/profiles/:id', authMiddleware({ roles: ['admin', 'offtaker'] }), async (c) => {
  try {
    const { id } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as Record<string, unknown>;

    const profile = await c.env.DB.prepare('SELECT * FROM demand_profiles WHERE id = ?').bind(id).first();
    if (!profile) return c.json({ success: false, error: 'Profile not found' }, 404);
    if (user.role !== 'admin' && profile.participant_id !== user.sub) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const allowed = [
      'company_name', 'annual_kwh', 'peak_kw', 'monthly_spend_cents', 'load_factor',
      'supply_type', 'province', 'municipality', 'grid_connection', 'renewable_preference',
      'contract_term_months', 'max_price_cents_kwh', 'notes', 'status',
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }
    if (sets.length === 0) return c.json({ success: false, error: 'No fields to update' }, 400);

    sets.push('updated_at = ?');
    vals.push(nowISO());
    vals.push(id);

    await c.env.DB.prepare(`UPDATE demand_profiles SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return c.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /demand/profiles/:id/bills — Upload bill
demand.post('/profiles/:id/bills', authMiddleware({ roles: ['admin', 'offtaker'] }), async (c) => {
  try {
    const { id: profileId } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as {
      month: string;
      kwh_usage: number;
      peak_kw: number;
      amount_cents: number;
      tariff_category?: string;
      filename?: string;
    };

    if (!body.month || !body.kwh_usage || !body.amount_cents) {
      return c.json({ success: false, error: 'month, kwh_usage, and amount_cents are required' }, 400);
    }

    const profile = await c.env.DB.prepare('SELECT * FROM demand_profiles WHERE id = ?').bind(profileId).first();
    if (!profile) return c.json({ success: false, error: 'Profile not found' }, 404);
    if (user.role !== 'admin' && profile.participant_id !== user.sub) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const billId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO bill_uploads (id, profile_id, participant_id, filename, month, kwh_usage, peak_kw, amount_cents, tariff_category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      billId, profileId, user.sub,
      body.filename || `bill-${body.month}.pdf`,
      body.month, body.kwh_usage, body.peak_kw || 0, body.amount_cents,
      body.tariff_category || null,
    ).run();

    // Auto-update profile stats from bills
    const bills = await c.env.DB.prepare(
      'SELECT SUM(kwh_usage) as total_kwh, AVG(peak_kw) as avg_peak, AVG(amount_cents) as avg_spend FROM bill_uploads WHERE profile_id = ?'
    ).bind(profileId).first<{ total_kwh: number; avg_peak: number; avg_spend: number }>();

    if (bills) {
      await c.env.DB.prepare(
        'UPDATE demand_profiles SET annual_kwh = ?, peak_kw = ?, monthly_spend_cents = ?, updated_at = ? WHERE id = ?'
      ).bind(
        Math.round((bills.total_kwh || 0) * 12 / Math.max(1, (await c.env.DB.prepare('SELECT COUNT(*) as c FROM bill_uploads WHERE profile_id = ?').bind(profileId).first<{ c: number }>())?.c || 1)),
        Math.round(bills.avg_peak || 0),
        Math.round(bills.avg_spend || 0),
        nowISO(), profileId,
      ).run();
    }

    return c.json({ success: true, data: { id: billId } }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /demand/profiles/:id/analyze — AI analysis + matching
demand.post('/profiles/:id/analyze', authMiddleware({ roles: ['admin', 'offtaker'] }), async (c) => {
  try {
    const { id: profileId } = c.req.param();
    const user = c.get('user');

    const profile = await c.env.DB.prepare('SELECT * FROM demand_profiles WHERE id = ?').bind(profileId).first();
    if (!profile) return c.json({ success: false, error: 'Profile not found' }, 404);

    // Find matching projects based on profile criteria
    const projects = await c.env.DB.prepare(`
      SELECT p.*, pt.company_name as developer_name
      FROM projects p
      JOIN participants pt ON p.participant_id = pt.id
      WHERE p.phase IN ('commercial_ops', 'commissioning', 'construction')
      ORDER BY p.capacity_mw DESC
    `).all();

    const matches: Array<{ project_id: string; score: number; price_cents_kwh: number; volume_kwh: number }> = [];
    const annualKwh = profile.annual_kwh as number;
    const province = profile.province as string;
    const renewPref = (profile.renewable_preference as number) || 0.5;
    const maxPrice = profile.max_price_cents_kwh as number | null;

    for (const proj of projects.results) {
      let score = 0;
      const projCapacityKwh = ((proj.capacity_mw as number) || 0) * 8760 * 1000 * 0.25; // 25% CF
      const priceCentsKwh = Math.round(85 + Math.random() * 40); // simulated price from market

      // Province match
      if ((proj.province as string || '').toLowerCase() === province.toLowerCase()) score += 30;
      // Capacity match
      if (projCapacityKwh >= annualKwh * 0.5) score += 25;
      // Price match
      if (maxPrice && priceCentsKwh <= maxPrice) score += 25;
      // Renewable preference
      if (renewPref > 0.5) score += 20;

      if (score >= 30) {
        const matchId = generateId();
        await c.env.DB.prepare(`
          INSERT INTO demand_matches (id, profile_id, project_id, match_score, match_type, price_cents_kwh, volume_kwh, status)
          VALUES (?, ?, ?, ?, 'ai', ?, ?, 'suggested')
        `).bind(matchId, profileId, proj.id, score / 100, priceCentsKwh, Math.min(annualKwh, projCapacityKwh)).run();

        matches.push({ project_id: proj.id as string, score: score / 100, price_cents_kwh: priceCentsKwh, volume_kwh: Math.min(annualKwh, projCapacityKwh) });
      }
    }

    // Update profile status
    await c.env.DB.prepare("UPDATE demand_profiles SET status = 'complete', updated_at = ? WHERE id = ?").bind(nowISO(), profileId).run();

    // Fire cascade
    if (matches.length > 0) {
      c.executionCtx.waitUntil(cascade(c.env, {
        type: 'demand.matched',
        actor_id: user.sub,
        entity_type: 'demand_profile',
        entity_id: profileId,
        data: { offtaker_id: user.sub, match_count: matches.length },
        ip: c.req.header('CF-Connecting-IP') || 'unknown',
        request_id: c.get('requestId'),
      }));
    }

    return c.json({ success: true, data: { matches, profile_status: 'complete' } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// POST /demand/profiles/:id/express-interest — Express interest in a match (auto-creates LOI)
demand.post('/profiles/:id/express-interest', authMiddleware({ roles: ['admin', 'offtaker'] }), async (c) => {
  try {
    const { id: profileId } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json() as { match_id: string; message?: string };

    if (!body.match_id) {
      return c.json({ success: false, error: 'match_id is required' }, 400);
    }

    const match = await c.env.DB.prepare(
      'SELECT * FROM demand_matches WHERE id = ? AND profile_id = ?'
    ).bind(body.match_id, profileId).first();

    if (!match) return c.json({ success: false, error: 'Match not found' }, 404);
    if (match.status !== 'suggested') {
      return c.json({ success: false, error: 'Interest already expressed for this match' }, 400);
    }

    // Get project details
    const project = await c.env.DB.prepare(
      'SELECT p.*, pt.company_name as developer_name FROM projects p JOIN participants pt ON p.participant_id = pt.id WHERE p.id = ?'
    ).bind(match.project_id).first();

    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    // Get offtaker company name
    const offtaker = await c.env.DB.prepare('SELECT company_name FROM participants WHERE id = ?').bind(user.sub).first<{ company_name: string }>();

    // Update match status
    await c.env.DB.prepare("UPDATE demand_matches SET status = 'interested', updated_at = datetime('now') WHERE id = ?").bind(body.match_id).run();

    // Auto-create LOI document
    const loiId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO contract_documents (id, title, document_type, phase, creator_id, counterparty_id,
        commercial_terms, version)
      VALUES (?, ?, 'loi', 'draft', ?, ?, ?, 'v1.0')
    `).bind(
      loiId,
      `LOI: ${offtaker?.company_name || 'Offtaker'} → ${project.name || 'Project'}`,
      user.sub,
      project.participant_id,
      JSON.stringify({
        demand_profile_id: profileId,
        match_id: body.match_id,
        project_id: match.project_id,
        volume_kwh: match.volume_kwh,
        price_cents_kwh: match.price_cents_kwh,
        message: body.message || null,
      }),
    ).run();

    // Update match with LOI status
    await c.env.DB.prepare("UPDATE demand_matches SET status = 'loi_sent' WHERE id = ?").bind(body.match_id).run();

    // Fire cascade for LOI creation
    c.executionCtx.waitUntil(cascade(c.env, {
      type: 'loi.created',
      actor_id: user.sub,
      entity_type: 'contract_document',
      entity_id: loiId,
      data: {
        ipp_id: project.participant_id as string,
        offtaker_name: offtaker?.company_name || 'Offtaker',
        project_name: project.name as string,
        volume_kwh: match.volume_kwh,
      },
      ip: c.req.header('CF-Connecting-IP') || 'unknown',
      request_id: c.get('requestId'),
    }));

    return c.json({
      success: true,
      data: { loi_id: loiId, match_status: 'loi_sent' },
    }, 201);
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

// GET /demand/matches — Get all matches for user
demand.get('/matches', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const pg = parsePagination(c.req.query());

    const results = await c.env.DB.prepare(`
      SELECT dm.*, dp.company_name, dp.annual_kwh, dp.province
      FROM demand_matches dm
      JOIN demand_profiles dp ON dm.profile_id = dp.id
      WHERE dp.participant_id = ?
      ORDER BY dm.match_score DESC
      LIMIT ? OFFSET ?
    `).bind(user.sub, pg.per_page, pg.offset).all();

    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'), 500);
  }
});

export default demand;
