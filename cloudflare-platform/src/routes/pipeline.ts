import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { captureException } from '../utils/sentry';

const pipeline = new Hono<HonoEnv>();
pipeline.use('*', authMiddleware());

// GET /pipeline — All deals grouped by stage for this participant
pipeline.get('/', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const contracts = await c.env.DB.prepare(`
      SELECT cd.*,
        creator.company_name as creator_name,
        counter.company_name as counterparty_name,
        (SELECT COUNT(*) FROM document_signatories WHERE document_id = cd.id AND signed = 0) as unsigned_count,
        (SELECT COUNT(*) FROM statutory_checks WHERE entity_type = 'document' AND entity_id = cd.id AND status = 'fail') as failed_checks
      FROM contract_documents cd
      LEFT JOIN participants creator ON cd.creator_id = creator.id
      LEFT JOIN participants counter ON cd.counterparty_id = counter.id
      WHERE cd.creator_id = ? OR cd.counterparty_id = ?
      ORDER BY cd.updated_at DESC
    `).bind(pid, pid).all();

    const matches = await c.env.DB.prepare(`
      SELECT dm.*, dp.company_name, p.name as project_name
      FROM demand_matches dm
      JOIN demand_profiles dp ON dm.profile_id = dp.id
      LEFT JOIN projects p ON dm.project_id = p.id
      WHERE dp.participant_id = ? AND dm.status IN ('matched', 'interested')
    `).bind(pid).all();

    const stages: Record<string, unknown[]> = {
      prospect: matches.results?.filter((m: Record<string, unknown>) => m.status === 'matched') || [],
      interested: matches.results?.filter((m: Record<string, unknown>) => m.status === 'interested') || [],
      loi: [],
      negotiating: [],
      legal: [],
      statutory: [],
      execution: [],
      active: [],
      amended: [],
      terminated: [],
    };

    for (const contract of (contracts.results || [])) {
      const c2 = contract as Record<string, unknown>;
      const phase = String(c2.phase || '');
      c2.blockers = [];
      const blockers = c2.blockers as Array<{ type: string; detail: string }>;
      if (Number(c2.unsigned_count) > 0) blockers.push({ type: 'unsigned', detail: `${c2.unsigned_count} unsigned signatories` });
      if (Number(c2.failed_checks) > 0) blockers.push({ type: 'statutory', detail: `${c2.failed_checks} failed statutory checks` });
      c2.days_in_stage = Math.floor((Date.now() - new Date(String(c2.updated_at || '')).getTime()) / 86400000);

      if (phase === 'loi') stages.loi.push(c2);
      else if (['term_sheet', 'hoa'].includes(phase)) stages.negotiating.push(c2);
      else if (['draft_agreement', 'legal_review'].includes(phase)) stages.legal.push(c2);
      else if (phase === 'statutory_check') stages.statutory.push(c2);
      else if (phase === 'execution') stages.execution.push(c2);
      else if (phase === 'active') stages.active.push(c2);
      else if (phase === 'amended') stages.amended.push(c2);
      else if (phase === 'terminated') stages.terminated.push(c2);
      else stages.loi.push(c2);
    }

    const totalValueCents = (contracts.results || []).reduce((s: number, c2: Record<string, unknown>) => s + (Number(c2.value_cents) || 0), 0);
    return c.json({ success: true, data: { stages, total_value_cents: totalValueCents, total_deals: (contracts.results?.length || 0) + (matches.results?.length || 0) } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { stages: {}, total_value_cents: 0, total_deals: 0 } });
  }
});

// GET /pipeline/stats — Pipeline conversion stats
pipeline.get('/stats', async (c) => {
  try {
    const user = c.get('user');
    const pid = user.sub;
    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM contract_documents WHERE creator_id = ? OR counterparty_id = ?'
    ).bind(pid, pid).first<{ count: number }>();
    const active = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?) AND phase = 'active'"
    ).bind(pid, pid).first<{ count: number }>();
    const avgDays = await c.env.DB.prepare(
      "SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?) AND phase = 'active'"
    ).bind(pid, pid).first<{ avg_days: number | null }>();
    return c.json({
      success: true,
      data: {
        total_deals: total?.count || 0,
        active_deals: active?.count || 0,
        conversion_rate: (total?.count || 0) > 0 ? Math.round(((active?.count || 0) / (total?.count || 1)) * 100) : 0,
        avg_days_to_close: Math.round(avgDays?.avg_days || 0),
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { total_deals: 0, active_deals: 0, conversion_rate: 0, avg_days_to_close: 0 } });
  }
});

export default pipeline;
