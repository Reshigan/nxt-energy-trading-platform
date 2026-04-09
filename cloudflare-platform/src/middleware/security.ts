import { Context, Next } from 'hono';
import { HonoEnv } from '../utils/types';

/** Security headers middleware */
export function securityHeadersMiddleware() {
  return async (c: Context<HonoEnv>, next: Next) => {
    await next();
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.vantax.co.za wss://*.vantax.co.za; font-src 'self'; frame-ancestors 'none'");
  };
}

/** Standardised error response helper */
export function errorJson(code: string, message: string, details?: unknown, requestId?: string) {
  return {
    success: false,
    error: message,
    code,
    ...(details ? { details } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

/** Rate limit check (uses KV) */
export async function checkRateLimit(
  kv: KVNamespace, key: string, limit: number, windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;
  const current = parseInt(await kv.get(windowKey) || '0');
  if (current >= limit) {
    return { allowed: false, remaining: 0, retryAfter: windowSeconds - (now % windowSeconds) };
  }
  await kv.put(windowKey, String(current + 1), { expirationTtl: windowSeconds * 2 });
  return { allowed: true, remaining: limit - current - 1 };
}

/** Input sanitisation — trim strings and enforce max length */
export function sanitiseInput(obj: Record<string, unknown>, maxLength = 1000): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value.trim().substring(0, maxLength);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitiseInput(value as Record<string, unknown>, maxLength);
    } else {
      result[key] = value;
    }
  }
  return result;
}
