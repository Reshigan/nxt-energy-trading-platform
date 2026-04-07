export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  action: string;
  userId?: string;
  details?: unknown;
  duration_ms?: number;
}

export function log(level: LogLevel, action: string, details?: unknown, requestId?: string, userId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    action,
    ...(requestId ? { requestId } : {}),
    ...(userId ? { userId } : {}),
    ...(details ? { details } : {}),
  };
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
}

/** Store recent errors in KV for admin dashboard */
export async function storeError(kv: KVNamespace, action: string, error: unknown, requestId?: string): Promise<void> {
  try {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    };
    const key = `error:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
    await kv.put(key, JSON.stringify(entry), { expirationTtl: 86400 * 7 });
  } catch {
    // Don't let logging failures affect the request
  }
}
