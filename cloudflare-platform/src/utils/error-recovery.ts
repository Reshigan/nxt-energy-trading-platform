/**
 * 5.2 Error Recovery — Exponential backoff, dead letter queue, circuit breaker pattern
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000 };

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < opts.maxRetries) {
        const delay = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
        const jitter = delay * 0.1 * Math.random();
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}

// Circuit breaker states
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  successesSinceHalfOpen: number;
}

const circuits = new Map<string, CircuitBreakerState>();

export function getCircuitBreaker(name: string, failureThreshold = 5, resetTimeMs = 60000): {
  canExecute: () => boolean;
  recordSuccess: () => void;
  recordFailure: () => void;
  getState: () => CircuitState;
} {
  if (!circuits.has(name)) {
    circuits.set(name, { state: 'closed', failures: 0, lastFailure: 0, successesSinceHalfOpen: 0 });
  }

  const circuit = circuits.get(name)!;

  return {
    canExecute: () => {
      if (circuit.state === 'closed') return true;
      if (circuit.state === 'open') {
        if (Date.now() - circuit.lastFailure > resetTimeMs) {
          circuit.state = 'half-open';
          circuit.successesSinceHalfOpen = 0;
          return true;
        }
        return false;
      }
      // half-open: allow one request through
      return true;
    },
    recordSuccess: () => {
      if (circuit.state === 'half-open') {
        circuit.successesSinceHalfOpen++;
        if (circuit.successesSinceHalfOpen >= 3) {
          circuit.state = 'closed';
          circuit.failures = 0;
        }
      } else {
        circuit.failures = 0;
      }
    },
    recordFailure: () => {
      circuit.failures++;
      circuit.lastFailure = Date.now();
      if (circuit.failures >= failureThreshold) {
        circuit.state = 'open';
      }
    },
    getState: () => circuit.state,
  };
}

// Dead letter queue helpers
export async function enqueueDeadLetter(
  db: D1Database,
  actionType: string,
  payload: Record<string, unknown>,
  errorMessage: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const nextRetry = new Date(Date.now() + 60000).toISOString();
  await db.prepare(
    `INSERT INTO dead_letter_queue (id, action_type, payload, error_message, retries, max_retries, next_retry_at, status)
     VALUES (?, ?, ?, ?, 0, 3, ?, 'pending')`
  ).bind(id, actionType, JSON.stringify(payload), errorMessage, nextRetry).run();
  return id;
}

export async function processDeadLetterQueue(
  db: D1Database,
  processor: (actionType: string, payload: Record<string, unknown>) => Promise<void>,
): Promise<{ processed: number; failed: number }> {
  const pending = await db.prepare(
    "SELECT * FROM dead_letter_queue WHERE status IN ('pending', 'retrying') AND next_retry_at <= datetime('now') LIMIT 10"
  ).all();

  let processed = 0;
  let failed = 0;

  for (const item of pending.results) {
    try {
      const payload = JSON.parse(item.payload as string) as Record<string, unknown>;
      await processor(item.action_type as string, payload);
      await db.prepare("UPDATE dead_letter_queue SET status = 'completed' WHERE id = ?").bind(item.id).run();
      processed++;
    } catch (err) {
      const retries = (item.retries as number) + 1;
      const maxRetries = item.max_retries as number;
      if (retries >= maxRetries) {
        await db.prepare("UPDATE dead_letter_queue SET status = 'failed', retries = ? WHERE id = ?").bind(retries, item.id).run();
        failed++;
      } else {
        const nextRetry = new Date(Date.now() + Math.pow(2, retries) * 60000).toISOString();
        await db.prepare(
          "UPDATE dead_letter_queue SET status = 'retrying', retries = ?, next_retry_at = ?, error_message = ? WHERE id = ?"
        ).bind(retries, nextRetry, err instanceof Error ? err.message : String(err), item.id).run();
      }
    }
  }

  return { processed, failed };
}
