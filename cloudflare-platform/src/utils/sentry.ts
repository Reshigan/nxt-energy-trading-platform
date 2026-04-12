/**
 * Phase 5.1: Sentry error tracking for Cloudflare Workers backend.
 * Uses toucan-js (Sentry SDK for Cloudflare Workers).
 */
import { Toucan } from 'toucan-js';
import { Context } from 'hono';
import { HonoEnv } from './types';

/**
 * Create a Sentry instance for the current request context.
 * Pass the DSN via environment variable SENTRY_DSN.
 */
export function createSentry(c: Context<HonoEnv>): Toucan | null {
  const dsn = (c.env as Record<string, unknown>).SENTRY_DSN as string | undefined;
  if (!dsn) return null;

  return new Toucan({
    dsn,
    context: c.executionCtx,
    request: c.req.raw,
    environment: (c.env as Record<string, unknown>).ENVIRONMENT as string || 'production',
    release: 'nxt-energy-platform@2.0.0',
  });
}

/**
 * Capture an exception in Sentry if configured.
 */
export function captureException(c: Context<HonoEnv>, error: unknown): void {
  try {
    const sentry = createSentry(c);
    if (sentry) {
      sentry.setTag('requestId', c.get('requestId') || 'unknown');
      const user = c.get('user');
      if (user) {
        sentry.setUser({ id: user.sub, email: user.email });
      }
      sentry.captureException(error);
    }
  } catch (err) {
    console.error(err);
    // Don't let Sentry failures affect the request
  }
}
