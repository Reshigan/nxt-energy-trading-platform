import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { blacklistToken } from '../auth/jwt';

const sessions = new Hono<HonoEnv>();
sessions.use('*', authMiddleware());

// GET /auth/sessions — List active sessions for current user
sessions.get('/', async (c) => {
  try {
    const user = c.get('user');

    // List all sessions from KV (prefix scan not available in KV, so we track in DB via audit_log)
    // We approximate by looking at recent login audit events
    const logins = await c.env.DB.prepare(`
      SELECT id, details, ip_address, created_at
      FROM audit_log
      WHERE actor_id = ? AND action = 'login'
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(user.sub).all();

    const sessionList = logins.results.map((login) => {
      const details = login.details ? JSON.parse(login.details as string) : {};
      return {
        id: login.id,
        ip: login.ip_address,
        device: details.user_agent || 'Unknown',
        created_at: login.created_at,
        current: false,
      };
    });

    return c.json({ success: true, data: sessionList });
  } catch (err) {
    console.error('Sessions list error:', err);
    return c.json({ success: false, error: 'Failed to load sessions' }, 500);
  }
});

// DELETE /auth/sessions/:id — Revoke a specific session
sessions.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  // Look up the session in audit log
  const session = await c.env.DB.prepare(
    'SELECT id, actor_id, details FROM audit_log WHERE id = ? AND actor_id = ? AND action = ?'
  ).bind(id, user.sub, 'login').first();

  if (!session) {
    return c.json({ success: false, error: 'Session not found' }, 404);
  }

  // Blacklist the token associated with this session if stored
  const details = session.details ? JSON.parse(session.details as string) : {};
  if (details.token) {
    try {
      await blacklistToken(c.env.KV, details.token, 86400);
    } catch { /* best-effort */ }
  }

  return c.json({ success: true, message: 'Session revoked' });
});

// POST /auth/sessions/revoke-all — Revoke all sessions except current
sessions.post('/revoke-all', async (c) => {
  const user = c.get('user');
  const currentToken = c.req.header('Authorization')?.substring(7);

  // Get all recent login tokens from audit log
  const logins = await c.env.DB.prepare(
    "SELECT details FROM audit_log WHERE actor_id = ? AND action = 'login' ORDER BY created_at DESC LIMIT 20"
  ).bind(user.sub).all();

  let revoked = 0;
  for (const login of logins.results) {
    const details = login.details ? JSON.parse(login.details as string) : {};
    if (details.token && details.token !== currentToken) {
      try {
        await blacklistToken(c.env.KV, details.token, 86400);
        revoked++;
      } catch { /* best-effort */ }
    }
  }

  return c.json({ success: true, message: `${revoked} session(s) revoked` });
});

export default sessions;
