/**
 * 4.1 WhatsApp Bot — Receive and respond to WhatsApp Business API messages
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const whatsapp = new Hono<HonoEnv>();

// POST /whatsapp/link — Link WhatsApp number to participant account
whatsapp.post('/link', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{ phone_number: string }>();

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const id = generateId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO whatsapp_links (id, participant_id, phone_number, verified, otp_code, otp_expires_at)
       VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(id) DO UPDATE SET otp_code=excluded.otp_code, otp_expires_at=excluded.otp_expires_at`
    ).bind(id, user.sub, body.phone_number, otp, expiresAt).run();

    return c.json({ success: true, data: { id, phone_number: body.phone_number, otp_sent: true, message: `Verification OTP: ${otp}` } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to link WhatsApp'), 500);
  }
});

// POST /whatsapp/verify — Verify OTP
whatsapp.post('/verify', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{ otp: string }>();

    const link = await c.env.DB.prepare(
      'SELECT * FROM whatsapp_links WHERE participant_id = ? AND otp_code = ? AND otp_expires_at > datetime(?)'
    ).bind(user.sub, body.otp, nowISO()).first();

    if (!link) return c.json({ success: false, error: 'Invalid or expired OTP' }, 400);

    await c.env.DB.prepare('UPDATE whatsapp_links SET verified = 1, otp_code = NULL WHERE id = ?').bind(link.id).run();
    return c.json({ success: true, data: { verified: true, phone_number: link.phone_number } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Verification failed'), 500);
  }
});

// POST /whatsapp/webhook — Incoming WhatsApp message handler
whatsapp.post('/webhook', async (c) => {
  try {
    const body = await c.req.json<{
      from: string; text: string; message_id?: string;
    }>();

    // Find linked participant
    const link = await c.env.DB.prepare(
      'SELECT wl.*, p.id as pid, p.role, p.company_name FROM whatsapp_links wl JOIN participants p ON wl.participant_id = p.id WHERE wl.phone_number = ? AND wl.verified = 1'
    ).bind(body.from).first<{
      pid: string; role: string; company_name: string;
    }>();

    if (!link) {
      return c.json({ success: true, data: { reply: 'Your number is not linked to an Ionvex account. Please link your number at https://et.vantax.co.za/settings' } });
    }

    // Parse command
    const command = body.text.trim().toLowerCase();
    let reply = '';

    if (command === 'prices' || command === 'price') {
      const markets = ['solar', 'wind', 'carbon', 'gas'];
      const prices: string[] = [];
      for (const m of markets) {
        const latest = await c.env.DB.prepare(
          "SELECT AVG(price_cents) as price FROM trades WHERE market = ? AND status = 'settled' AND created_at > datetime('now', '-24 hours')"
        ).bind(m).first<{ price: number }>();
        prices.push(`${m.charAt(0).toUpperCase() + m.slice(1)}: R${((latest?.price || 0) / 100).toFixed(2)}/kWh`);
      }
      reply = `Current Prices:\n${prices.join('\n')}`;
    } else if (command === 'positions' || command === 'pos') {
      const orders = await c.env.DB.prepare(
        "SELECT market, direction, SUM(volume) as vol FROM orders WHERE participant_id = ? AND status IN ('open','partial') GROUP BY market, direction"
      ).bind(link.pid).all();
      if (orders.results.length === 0) {
        reply = 'No open positions.';
      } else {
        reply = 'Open Positions:\n' + orders.results.map((o: Record<string, unknown>) => `${o.market} ${o.direction}: ${o.vol} MWh`).join('\n');
      }
    } else if (command === 'invoices' || command === 'inv') {
      const invoices = await c.env.DB.prepare(
        "SELECT id, total_cents, status FROM invoices WHERE participant_id = ? AND status IN ('outstanding','overdue') ORDER BY created_at DESC LIMIT 5"
      ).bind(link.pid).all();
      if (invoices.results.length === 0) {
        reply = 'No outstanding invoices.';
      } else {
        reply = 'Outstanding Invoices:\n' + invoices.results.map((i: Record<string, unknown>) =>
          `#${(i.id as string).substring(0, 8)} - R${((i.total_cents as number) / 100).toFixed(2)} (${i.status})`
        ).join('\n');
      }
    } else if (command.startsWith('approve ')) {
      const itemId = command.substring(8).trim();
      reply = `Approval request for ${itemId} received. Please confirm on the web platform for security.`;
    } else if (command === 'help') {
      reply = 'Ionvex Commands:\n- prices: Latest market prices\n- positions: Your open positions\n- invoices: Outstanding invoices\n- approve [id]: Approve a pending item\n- help: This message';
    } else {
      reply = `Unknown command. Type "help" for available commands.`;
    }

    return c.json({ success: true, data: { reply, from: body.from, participant_id: link.pid } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Webhook processing failed'), 500);
  }
});

// GET /whatsapp/status — Check link status
whatsapp.get('/status', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const link = await c.env.DB.prepare(
      'SELECT id, phone_number, verified, created_at FROM whatsapp_links WHERE participant_id = ?'
    ).bind(user.sub).first();
    return c.json({ success: true, data: link || { linked: false } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get status'), 500);
  }
});

export default whatsapp;
