import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { sendEmail } from '../utils/email';

const onboarding = new Hono<HonoEnv>();

/**
 * Onboarding email sequence — fires on days 0, 1, 3, 7, 13 after registration.
 * Called by cron job; individual emails are idempotent (UNIQUE constraint on participant_id + day).
 */

interface OnboardingTemplate {
  day: number;
  subject: string;
  html: string;
}

const ONBOARDING_SEQUENCE: OnboardingTemplate[] = [
  {
    day: 0,
    subject: 'Welcome to NXT Energy Trading Platform',
    html: `<h2>Welcome to NXT Energy</h2>
<p>Thank you for registering on the NXT Energy Trading Platform. Your account is being verified and you'll be ready to trade soon.</p>
<p><strong>What's next?</strong></p>
<ul>
  <li>Complete your KYC verification</li>
  <li>Upload required documents</li>
  <li>Explore your role-specific cockpit</li>
</ul>
<p>Visit <a href="https://et.vantax.co.za">et.vantax.co.za</a> to get started.</p>`,
  },
  {
    day: 1,
    subject: 'Getting Started with NXT — Your First Steps',
    html: `<h2>Your First Day on NXT</h2>
<p>Here are a few things you can do right now:</p>
<ul>
  <li><strong>Your Cockpit</strong> — Your personalized command center shows KPIs, actions, and alerts specific to your role.</li>
  <li><strong>Explore Modules</strong> — Browse available platform modules from your sidebar.</li>
  <li><strong>Set Preferences</strong> — Configure your notification preferences in Settings.</li>
</ul>
<p>Need help? Click the Help icon in the top bar for 40+ help articles.</p>`,
  },
  {
    day: 3,
    subject: 'NXT Tip: Understanding Your Trading Dashboard',
    html: `<h2>Power Up Your Trading</h2>
<p>By now you should have access to the trading dashboard. Here's what you can do:</p>
<ul>
  <li><strong>Place Orders</strong> — Limit, market, stop-loss, and take-profit orders</li>
  <li><strong>Track Portfolio</strong> — AI-powered portfolio insights</li>
  <li><strong>Carbon Credits</strong> — Issue, trade, retire, and tokenize carbon credits</li>
  <li><strong>Smart Rules</strong> — Automate contract triggers and notifications</li>
</ul>`,
  },
  {
    day: 7,
    subject: 'One Week In — How Are You Finding NXT?',
    html: `<h2>Your First Week</h2>
<p>You've been on NXT for a week! Here are some advanced features to explore:</p>
<ul>
  <li><strong>P2P Trading</strong> — Trade directly with counterparties</li>
  <li><strong>Report Builder</strong> — Create custom reports and schedule delivery</li>
  <li><strong>Developer API</strong> — Integrate NXT with your systems via REST API</li>
  <li><strong>Risk Analytics</strong> — Monitor your risk exposure with VaR calculations</li>
</ul>
<p>We'd love your feedback — reply to this email anytime.</p>`,
  },
  {
    day: 13,
    subject: 'Two Weeks on NXT — You\'re a Pro!',
    html: `<h2>You're Getting the Hang of It</h2>
<p>After two weeks, here are some pro tips:</p>
<ul>
  <li><strong>Contract Templates</strong> — Use PPA, wheeling, and carbon purchase templates</li>
  <li><strong>Tokenization</strong> — Tokenize your carbon credits and RECs for blockchain-verified provenance</li>
  <li><strong>AI Insights</strong> — Get AI-powered recommendations for portfolio optimization</li>
  <li><strong>Surveillance</strong> — Admin/Regulators can monitor market integrity</li>
</ul>
<p>Thank you for being part of the NXT community!</p>`,
  },
];

/**
 * POST /onboarding/process — Called by cron to process onboarding emails.
 * Finds participants registered within the last 14 days and sends appropriate emails.
 */
onboarding.post('/process', authMiddleware({ roles: ['admin'] }), async (c) => {
  try {
  // Admin-only — also callable by scheduled cron with admin service token
  const now = new Date();
  let sent = 0;

  for (const template of ONBOARDING_SEQUENCE) {
    // Find participants who registered `template.day` days ago and haven't received this email
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - template.day);
    const dateStr = targetDate.toISOString().substring(0, 10); // YYYY-MM-DD

    const participants = await c.env.DB.prepare(`
      SELECT p.id, p.email, p.contact_person, p.company_name
      FROM participants p
      WHERE DATE(p.created_at) = ?
        AND p.id NOT IN (SELECT participant_id FROM onboarding_emails WHERE day = ?)
    `).bind(dateStr, template.day).all();

    for (const p of participants.results) {
      try {
        await sendEmail(c.env, {
          to: p.email as string,
          subject: template.subject,
          html: template.html.replace('{{name}}', (p.contact_person || p.company_name || 'there') as string),
        });

        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO onboarding_emails (id, participant_id, day, sent_at) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), p.id, template.day, nowISO()).run();

        sent++;
      } catch {
        // Non-critical: continue with next participant
      }
    }
  }

  return c.json({ success: true, data: { emails_sent: sent } });
  } catch (err) {
    console.error('Onboarding process error:', err);
    return c.json({ success: false, error: 'Failed to process onboarding emails' }, 500);
  }
});

// GET /onboarding/status — Check onboarding progress for current user
onboarding.get('/status', authMiddleware({ requireKyc: false }), async (c) => {
  try {
    const user = c.get('user');
    const emails = await c.env.DB.prepare(
      'SELECT day, sent_at FROM onboarding_emails WHERE participant_id = ? ORDER BY day'
    ).bind(user.sub).all();

    return c.json({
      success: true,
      data: {
        emails_sent: emails.results,
        total_sequence: ONBOARDING_SEQUENCE.length,
        completed: emails.results.length >= ONBOARDING_SEQUENCE.length,
      },
    });
  } catch (err) {
    console.error('Onboarding status error:', err);
    return c.json({ success: false, error: 'Failed to load onboarding status' }, 500);
  }
});

export default onboarding;
