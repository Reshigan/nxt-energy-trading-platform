/**
 * Platform Configuration Utility
 * Reads from KV cache (5-min TTL) with D1 fallback.
 */

/**
 * Get a platform config value with KV caching.
 * @param db - D1 database binding
 * @param kv - KV namespace binding
 * @param key - Config key name
 * @param defaultValue - Fallback if key not found
 * @returns The config value as a string
 */
export async function getConfig(
  db: D1Database,
  kv: KVNamespace,
  key: string,
  defaultValue: string
): Promise<string> {
  const cacheKey = `config:${key}`;

  // Try KV cache first
  try {
    const cached = await kv.get(cacheKey);
    if (cached !== null) return cached;
  } catch {
    // KV failure — fall through to D1
  }

  // Fall back to D1
  try {
    const row = await db.prepare(
      'SELECT value FROM platform_config WHERE key = ?'
    ).bind(key).first<{ value: string }>();

    if (row) {
      // Cache in KV for 5 minutes
      try {
        await kv.put(cacheKey, row.value, { expirationTtl: 300 });
      } catch {
        // KV write failure — non-fatal
      }
      return row.value;
    }
  } catch {
    // D1 failure — return default
  }

  return defaultValue;
}

/**
 * Get a numeric config value.
 */
export async function getConfigNumber(
  db: D1Database,
  kv: KVNamespace,
  key: string,
  defaultValue: number
): Promise<number> {
  const val = await getConfig(db, kv, key, String(defaultValue));
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}
