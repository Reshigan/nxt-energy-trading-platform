import { Context, Next } from 'hono';
import { verifyJwt, isTokenBlacklisted } from './jwt';
import { Role, JwtPayload, HonoEnv } from '../utils/types';
import { hasPermission, Permission } from './permissions';

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
    requestId: string;
  }
}

/** Request ID middleware */
export function requestIdMiddleware() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);
    await next();
  };
}

/** Auth middleware with blacklist check */
export function authMiddleware(options?: {
  roles?: Role[];
  permissions?: Permission[];
  requireKyc?: boolean;
}) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing or invalid Authorization header', code: 'AUTH_FAILED' }, 401);
    }

    const token = authHeader.substring(7);

    try {
      const blacklisted = await isTokenBlacklisted(c.env.KV, token);
      if (blacklisted) {
        return c.json({ success: false, error: 'Token has been revoked', code: 'AUTH_FAILED' }, 401);
      }
    } catch {
      // If KV fails, allow through
    }

    const secret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;
    const payload = await verifyJwt(token, secret);
    if (!payload) {
      return c.json({ success: false, error: 'Invalid or expired token', code: 'AUTH_FAILED' }, 401);
    }

    // Check if password was changed after this token was issued (invalidates all pre-reset tokens)
    try {
      const pwChanged = await c.env.KV.get(`pw_changed:${payload.sub}`);
      if (pwChanged && payload.iat < Math.floor(new Date(pwChanged).getTime() / 1000)) {
        return c.json({ success: false, error: 'Token invalidated by password reset. Please login again.', code: 'AUTH_FAILED' }, 401);
      }
    } catch {
      // If KV fails, allow through
    }

    const requireKyc = options?.requireKyc !== false;
    if (requireKyc && payload.kyc_status !== 'verified') {
      const path = c.req.path;
      const allowedPaths = ['/api/v1/register/status', '/api/v1/register/', '/api/v1/auth/'];
      const isAllowed = allowedPaths.some((p) => path.startsWith(p));
      if (!isAllowed) {
        return c.json({ success: false, error: 'KYC verification required', code: 'AUTH_FAILED' }, 403);
      }
    }

    if (options?.roles && !options.roles.includes(payload.role)) {
      return c.json({ success: false, error: 'Insufficient permissions', code: 'AUTH_FAILED' }, 403);
    }

    if (options?.permissions) {
      const hasAll = options.permissions.every((p) => hasPermission(payload.role, p));
      if (!hasAll) {
        return c.json({ success: false, error: 'Insufficient permissions', code: 'AUTH_FAILED' }, 403);
      }
    }

    c.set('user', payload);
    await next();
  };
}

/** Optional auth */
export function optionalAuth() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;
      const payload = await verifyJwt(token, secret);
      if (payload) {
        c.set('user', payload);
      }
    }
    await next();
  };
}

/** Rate limiter with stricter auth limits (5 req/15min for login/register) */
export function rateLimiter(options: { maxRequests: number; windowSeconds: number }) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const path = c.req.path;

    let max = options.maxRequests;
    let window = options.windowSeconds;
    if (path.includes('/auth/login') || path.endsWith('/register')) {
      max = 5;
      window = 900;
    }

    const key = `ratelimit:${ip}:${path.split('/').slice(0, 5).join('/')}:${Math.floor(Date.now() / (window * 1000))}`;

    try {
      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= max) {
        const retryAfter = window - (Math.floor(Date.now() / 1000) % window);
        c.header('Retry-After', String(retryAfter));
        return c.json({ success: false, error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, 429);
      }

      await c.env.KV.put(key, String(count + 1), { expirationTtl: window });
    } catch {
      // If KV fails, allow through
    }

    await next();
  };
}
