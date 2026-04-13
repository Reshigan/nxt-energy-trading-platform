/**
 * 2.4 ESG Scoring — 6-category weighted scoring with badges and leaderboard
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const esg = new Hono<HonoEnv>();
esg.use('*', authMiddleware());

const WEIGHTS = {
  renewable_energy: 0.25,
  carbon_offset: 0.20,
  bbbee: 0.15,
  governance: 0.15,
  community_impact: 0.15,
  transparency: 0.10,
};

function getTier(score: number): string {
  if (score >= 85) return 'platinum';
  if (score >= 70) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}

// POST /esg/calculate/:participantId — Calculate ESG score
esg.post('/calculate/:participantId', async (c) => {
  try {
    const pid = c.req.param('participantId');

    // 1. Renewable energy score: % of green trades
    const tradeData = await c.env.DB.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN market IN ('solar','wind','hydro') THEN 1 ELSE 0 END) as green
       FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'settled'`
    ).bind(pid, pid).first<{ total: number; green: number }>();
    const renewableScore = tradeData?.total ? Math.min(100, (tradeData.green / tradeData.total) * 100) : 0;

    // 2. Carbon offset score: tonnes retired
    const carbonData = await c.env.DB.prepare(
      "SELECT SUM(amount_tonnes) as tonnes FROM carbon_credits WHERE owner_id = ? AND status = 'retired'"
    ).bind(pid).first<{ tonnes: number }>();
    const carbonScore = Math.min(100, ((carbonData?.tonnes || 0) / 1000) * 100);

    // 3. BBBEE score from participant profile
    const participant = await c.env.DB.prepare('SELECT bbbee_level FROM participants WHERE id = ?').bind(pid).first<{ bbbee_level: number }>();
    const bbbeeScore = participant?.bbbee_level ? Math.max(0, (8 - participant.bbbee_level) / 7 * 100) : 0;

    // 4. Governance: KYC compliance + audit trail density
    const kycDocs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM kyc_documents WHERE participant_id = ?').bind(pid).first<{ count: number }>();
    const governanceScore = Math.min(100, ((kycDocs?.count || 0) / 5) * 100);

    // 5. Community impact: projects in SA
    const projects = await c.env.DB.prepare("SELECT COUNT(*) as count FROM projects WHERE developer_id = ? AND status = 'commercial_ops'").bind(pid).first<{ count: number }>();
    const communityScore = Math.min(100, ((projects?.count || 0) / 3) * 100);

    // 6. Transparency: vault documents + reporting
    const vaultDocs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM vault_documents WHERE participant_id = ?').bind(pid).first<{ count: number }>();
    const transparencyScore = Math.min(100, ((vaultDocs?.count || 0) / 10) * 100);

    const totalScore =
      renewableScore * WEIGHTS.renewable_energy +
      carbonScore * WEIGHTS.carbon_offset +
      bbbeeScore * WEIGHTS.bbbee +
      governanceScore * WEIGHTS.governance +
      communityScore * WEIGHTS.community_impact +
      transparencyScore * WEIGHTS.transparency;

    const tier = getTier(totalScore);

    // Upsert ESG score
    await c.env.DB.prepare(
      `INSERT INTO esg_scores (id, participant_id, renewable_energy_score, carbon_offset_score, bbbee_score, governance_score, community_impact_score, transparency_score, total_score, tier, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(participant_id) DO UPDATE SET
       renewable_energy_score=excluded.renewable_energy_score, carbon_offset_score=excluded.carbon_offset_score,
       bbbee_score=excluded.bbbee_score, governance_score=excluded.governance_score,
       community_impact_score=excluded.community_impact_score, transparency_score=excluded.transparency_score,
       total_score=excluded.total_score, tier=excluded.tier, calculated_at=excluded.calculated_at`
    ).bind(
      generateId(), pid,
      Math.round(renewableScore * 10) / 10, Math.round(carbonScore * 10) / 10,
      Math.round(bbbeeScore * 10) / 10, Math.round(governanceScore * 10) / 10,
      Math.round(communityScore * 10) / 10, Math.round(transparencyScore * 10) / 10,
      Math.round(totalScore * 10) / 10, tier, nowISO()
    ).run();

    return c.json({
      success: true,
      data: {
        participant_id: pid, tier,
        total_score: Math.round(totalScore * 10) / 10,
        breakdown: {
          renewable_energy: { score: Math.round(renewableScore * 10) / 10, weight: WEIGHTS.renewable_energy },
          carbon_offset: { score: Math.round(carbonScore * 10) / 10, weight: WEIGHTS.carbon_offset },
          bbbee: { score: Math.round(bbbeeScore * 10) / 10, weight: WEIGHTS.bbbee },
          governance: { score: Math.round(governanceScore * 10) / 10, weight: WEIGHTS.governance },
          community_impact: { score: Math.round(communityScore * 10) / 10, weight: WEIGHTS.community_impact },
          transparency: { score: Math.round(transparencyScore * 10) / 10, weight: WEIGHTS.transparency },
        },
        weights: WEIGHTS,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'ESG calculation failed'), 500);
  }
});

// GET /esg/score/:participantId — Get cached ESG score
esg.get('/score/:participantId', async (c) => {
  try {
    const pid = c.req.param('participantId');
    const score = await c.env.DB.prepare('SELECT * FROM esg_scores WHERE participant_id = ?').bind(pid).first();
    if (!score) return c.json({ success: true, data: null });
    return c.json({ success: true, data: score });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get ESG score'), 500);
  }
});

// GET /esg/leaderboard — ESG leaderboard
esg.get('/leaderboard', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const results = await c.env.DB.prepare(
      `SELECT e.*, p.company_name, p.role FROM esg_scores e
       JOIN participants p ON e.participant_id = p.id
       ORDER BY e.total_score DESC LIMIT ?`
    ).bind(limit).all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get leaderboard'), 500);
  }
});

// GET /esg/badges — Available ESG badges
esg.get('/badges', async (c) => {
  return c.json({
    success: true,
    data: [
      { id: 'platinum', name: 'Platinum', min_score: 85, color: '#E5E4E2', icon: '💎' },
      { id: 'gold', name: 'Gold', min_score: 70, color: '#FFD700', icon: '🥇' },
      { id: 'silver', name: 'Silver', min_score: 50, color: '#C0C0C0', icon: '🥈' },
      { id: 'bronze', name: 'Bronze', min_score: 0, color: '#CD7F32', icon: '🥉' },
    ],
  });
});

export default esg;
