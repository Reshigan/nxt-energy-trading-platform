import { log } from './logger';

interface WebhookPayload {
  event: string;
  data: unknown;
  timestamp: string;
  id: string;
}

/**
 * Phase 3.5: Webhook delivery with HMAC-SHA256 signing and retry.
 * Delivers webhook events to registered subscriber URLs.
 */
export async function deliverWebhook(
  db: D1Database,
  kv: KVNamespace,
  event: string,
  data: unknown,
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const webhooks = await db.prepare(
    "SELECT id, url, secret, events, failure_count FROM webhooks WHERE active = 1"
  ).all();

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  };

  const body = JSON.stringify(payload);

  for (const wh of webhooks.results) {
    const events: string[] = wh.events ? JSON.parse(wh.events as string) : [];
    if (!events.includes(event) && !events.includes('*')) continue;

    try {
      await deliverWithRetry(
        wh.url as string,
        wh.secret as string,
        body,
        wh.id as string,
        db,
      );
    } catch (err) {
      // Increment failure count
      const newCount = ((wh.failure_count as number) || 0) + 1;
      await db.prepare(
        'UPDATE webhooks SET failure_count = ?, last_triggered_at = datetime(\'now\') WHERE id = ?'
      ).bind(newCount, wh.id).run();

      // Disable webhook after 10 consecutive failures
      if (newCount >= 10) {
        await db.prepare('UPDATE webhooks SET active = 0 WHERE id = ?').bind(wh.id).run();
        log('warn', 'webhook_disabled', { webhook_id: wh.id, url: wh.url, failures: newCount });
      }

      log('error', 'webhook_delivery_failed', {
        webhook_id: wh.id,
        event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Deliver a webhook with HMAC-SHA256 signature and exponential backoff retry (3 attempts).
 */
async function deliverWithRetry(
  url: string,
  secret: string,
  body: string,
  webhookId: string,
  db: D1Database,
): Promise<void> {
  const signature = await signPayload(body, secret);
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NXT-Signature': `sha256=${signature}`,
          'X-NXT-Event': 'webhook',
          'X-NXT-Delivery': crypto.randomUUID(),
          'User-Agent': 'NXT-Energy-Webhook/2.0',
        },
        body,
      });

      if (response.ok) {
        // Reset failure count on success
        await db.prepare(
          "UPDATE webhooks SET failure_count = 0, last_triggered_at = datetime('now') WHERE id = ?"
        ).bind(webhookId).run();
        return;
      }

      // Non-2xx response — retry if not the last attempt
      if (attempt === maxRetries) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }

    // Exponential backoff: 1s, 4s, 9s
    await new Promise((r) => setTimeout(r, attempt * attempt * 1000));
  }
}

/**
 * HMAC-SHA256 sign a payload with the webhook secret.
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
