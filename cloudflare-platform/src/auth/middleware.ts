import { Context, Next } from 'hono';
import { verifyJwt } from './jwt';
import { Role, JwtPayload, HonoEnv } from '../utils/types';
import { hasPermission, Permission } from './permissions';

// Extend Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

/**
 * Auth middleware — validates JWT and optionally checks roles/permissions
 */
export function authMiddleware(options?: {
  roles?: Role[];
  permissions?: Permission[];
  requireKyc?: boolean;
}) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyJwt(token);
    if (!payload) {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    // Check KYC status for protected routes
    const requireKyc = options?.requireKyc !== false; // default true
    if (requireKyc && payload.kyc_status !== 'verified') {
      // Allow access to registration status check and document upload
      const path = c.req.path;
      const allowedPaths = ['/api/v1/register/status', '/api/v1/register/', '/api/v1/auth/'];
      const isAllowed = allowedPaths.some((p) => path.startsWith(p));
      if (!isAllowed) {
        return c.json({ success: false, error: 'KYC verification required' }, 403);
      }
    }

    // Check role
    if (options?.roles && !options.roles.includes(payload.role)) {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Check permissions
    if (options?.permissions) {
      const hasAll = options.permissions.every((p) => hasPermission(payload.role, p));
      if (!hasAll) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }
    }

    c.set('user', payload);
    await next();
  };
}

/**
 * Optional auth — sets user if token present, but doesn't require it
 */
export function optionalAuth() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyJwt(token);
      if (payload) {
        c.set('user', payload);
      }
    }
    await next();
  };
}

/**
 * Rate limiting middleware using KV
 */
export function rateLimiter(options: { maxRequests: number; windowSeconds: number }) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `ratelimit:${ip}:${Math.floor(Date.now() / (options.windowSeconds * 1000))}`;

    try {
      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= options.maxRequests) {
        return c.json({ success: false, error: 'Rate limit exceeded' }, 429);
      }

      await c.env.KV.put(key, String(count + 1), { expirationTtl: options.windowSeconds });
    } catch {
      // If KV fails, allow the request through
    }

    await next();
  };
}
