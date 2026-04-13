/**
 * Spec 12 — 5.1 Query Optimisation
 * KV-backed caching layer + pagination helpers for high-traffic endpoints.
 * Uses Cloudflare KV for distributed caching with configurable TTL.
 */

// ── Cache Key Builder ─────────────────────────────────
export function cacheKey(prefix: string, params: Record<string, string | number | undefined>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `cache:${prefix}:${sorted || '_all'}`;
}

// ── KV Cache Wrapper ──────────────────────────────────
interface CacheOptions {
  /** TTL in seconds (default 300 = 5 minutes) */
  ttl?: number;
  /** If true, always bypass cache and fetch fresh */
  bypass?: boolean;
}

/**
 * Fetches from KV cache or executes the fetcher and stores the result.
 * Falls back gracefully if KV is unavailable.
 */
export async function withCache<T>(
  kv: KVNamespace | undefined,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, bypass = false } = options;

  // If KV unavailable or bypass requested, just fetch
  if (!kv || bypass) {
    return fetcher();
  }

  try {
    // Try to read from cache
    const cached = await kv.get(key, 'json');
    if (cached !== null) {
      return cached as T;
    }
  } catch {
    // KV read failed, continue to fetch
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (fire-and-forget)
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch {
    // KV write failed, no-op
  }

  return data;
}

/**
 * Invalidate a cache key or prefix pattern.
 */
export async function invalidateCache(
  kv: KVNamespace | undefined,
  keyOrPrefix: string
): Promise<void> {
  if (!kv) return;

  try {
    // Try exact key deletion first
    await kv.delete(keyOrPrefix);

    // If it's a prefix, list and delete matching keys
    if (keyOrPrefix.endsWith('*')) {
      const prefix = keyOrPrefix.slice(0, -1);
      const listed = await kv.list({ prefix, limit: 100 });
      await Promise.all(listed.keys.map(k => kv.delete(k.name)));
    }
  } catch {
    // KV operation failed, no-op
  }
}

// ── Pagination Helpers ────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse pagination parameters from query string with defaults and bounds.
 */
export function parsePagination(query: Record<string, string | undefined>, defaults?: PaginationParams): { page: number; limit: number; offset: number } {
  const maxLimit = defaults?.maxLimit || 100;
  const defaultLimit = defaults?.limit || 20;
  const defaultPage = defaults?.page || 1;

  let page = parseInt(query.page || String(defaultPage), 10);
  let limit = parseInt(query.limit || String(defaultLimit), 10);

  // Clamp values
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Build paginated response from total count and data array.
 */
export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ── SQL Pagination Builder ────────────────────────────
/**
 * Append LIMIT/OFFSET to a SQL query string.
 */
export function paginateSQL(baseQuery: string, offset: number, limit: number): string {
  return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Build a COUNT(*) query from a base query (strips ORDER BY if present).
 */
export function countSQL(baseQuery: string): string {
  // Remove ORDER BY clause for count
  const withoutOrder = baseQuery.replace(/\s+ORDER\s+BY\s+[\w.,\s]+$/i, '');
  return `SELECT COUNT(*) as total FROM (${withoutOrder})`;
}

// ── Response Time Header ──────────────────────────────
/**
 * Measure and return execution time for a handler.
 */
export async function withTiming<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}
