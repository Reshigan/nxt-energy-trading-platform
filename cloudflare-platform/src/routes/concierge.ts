import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';

const concierge = new Hono<HonoEnv>();
concierge.use('*', authMiddleware());

const FIRST_DEAL_STEPS = [
  { step: 1, title: "Let's find you an energy match", description: 'Tell us about your energy needs and we\'ll find the best generators', action: 'create_demand_profile', page: '/demand', complete_when: 'demand_profile_created' },
  { step: 2, title: 'We found matches for you', description: 'Review the matched generators and express interest', action: 'review_matches', page: '/demand', complete_when: 'interest_expressed' },
  { step: 3, title: 'Your LOI has been created', description: 'Review the Letter of Intent and share it with the generator', action: 'review_loi', page: '/contracts', complete_when: 'loi_acknowledged' },
  { step: 4, title: 'Negotiate the terms', description: 'Use the Deal Room to agree on tariff, volume, and tenor', action: 'open_dealroom', page: '/deal-room', complete_when: 'terms_agreed' },
  { step: 5, title: 'Legal review and statutory checks', description: 'Upload the signed agreement. We\'ll run 14 statutory checks automatically.', action: 'upload_document', page: '/contracts', complete_when: 'statutory_passed' },
  { step: 6, title: 'Sign your first contract!', description: 'Both parties sign digitally. We\'ll generate your signing certificate.', action: 'sign_contract', page: '/contracts', complete_when: 'contract_active' },
];

// GET /concierge/status — Get first-deal concierge status
concierge.get('/status', async (c) => {
  try {
    const user = c.get('user');
    let progress = await c.env.DB.prepare(
      'SELECT * FROM concierge_progress WHERE participant_id = ?'
    ).bind(user.sub).first<{ current_step: number; completed_steps: string; dismissed: number; first_contract_id: string | null }>();

    if (!progress) {
      // Check if they already have contracts (not a new user)
      const contractCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM contract_documents WHERE (creator_id = ? OR counterparty_id = ?) AND phase = 'active'"
      ).bind(user.sub, user.sub).first<{ count: number }>();
      if ((contractCount?.count || 0) > 0) {
        return c.json({ success: true, data: { active: false, reason: 'has_active_contracts' } });
      }
      // Create progress entry
      const id = generateId();
      await c.env.DB.prepare(
        'INSERT INTO concierge_progress (id, participant_id) VALUES (?, ?)'
      ).bind(id, user.sub).run();
      progress = { current_step: 1, completed_steps: '[]', dismissed: 0, first_contract_id: null };
    }

    if (progress.dismissed) {
      return c.json({ success: true, data: { active: false, reason: 'dismissed' } });
    }

    const completedSteps: number[] = JSON.parse(progress.completed_steps || '[]');
    const currentStepDef = FIRST_DEAL_STEPS.find((s) => s.step === progress.current_step) || FIRST_DEAL_STEPS[0];

    return c.json({
      success: true,
      data: {
        active: progress.current_step <= 6,
        current_step: progress.current_step,
        total_steps: 6,
        completed_steps: completedSteps,
        step_definition: currentStepDef,
        all_steps: FIRST_DEAL_STEPS,
      },
    });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: true, data: { active: false } });
  }
});

// POST /concierge/complete-step — Mark a step as complete
concierge.post('/complete-step', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json() as { step: number };
    const progress = await c.env.DB.prepare(
      'SELECT * FROM concierge_progress WHERE participant_id = ?'
    ).bind(user.sub).first<{ completed_steps: string; current_step: number }>();
    if (!progress) return c.json({ success: false, error: 'No concierge session' }, 404);

    const completedSteps: number[] = JSON.parse(progress.completed_steps || '[]');
    if (!completedSteps.includes(body.step)) {
      completedSteps.push(body.step);
    }
    const nextStep = Math.min(body.step + 1, 7);
    await c.env.DB.prepare(
      'UPDATE concierge_progress SET completed_steps = ?, current_step = ?, updated_at = ? WHERE participant_id = ?'
    ).bind(JSON.stringify(completedSteps), nextStep, nowISO(), user.sub).run();

    return c.json({ success: true, data: { next_step: nextStep, celebration: body.step === 6 } });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

// POST /concierge/dismiss — Dismiss concierge
concierge.post('/dismiss', async (c) => {
  try {
    const user = c.get('user');
    await c.env.DB.prepare(
      'UPDATE concierge_progress SET dismissed = 1, updated_at = ? WHERE participant_id = ?'
    ).bind(nowISO(), user.sub).run();
    return c.json({ success: true });
  } catch (err) {
    captureException(c, err);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

export default concierge;
