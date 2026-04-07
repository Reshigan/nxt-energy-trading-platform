// Security headers middleware — Spec 8 Section 8.1
export function securityHeaders(response: Response, origin?: string): Response {
  const headers = new Headers(response.headers);

  // CORS — strict origin
  const allowedOrigins = ['https://et.vantax.co.za', 'https://demo.et.vantax.co.za'];
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  headers.set('Access-Control-Max-Age', '86400');

  // CSP
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.stripe.com; font-src 'self'; frame-ancestors 'none'");

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Error response format — Spec 8 Section 7.1
export function errorResponse(code: string, message: string, status: number, details?: any): Response {
  return new Response(JSON.stringify({
    error: { code, message, ...(details ? { details } : {}) }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Rate limit check (uses KV)
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
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
