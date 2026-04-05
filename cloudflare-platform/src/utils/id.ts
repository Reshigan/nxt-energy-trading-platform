/**
 * Generate a random hex ID using crypto.getRandomValues
 * Equivalent to lower(hex(randomblob(16))) in SQLite
 */
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get current timestamp in ISO 8601 UTC format
 */
export function nowISO(): string {
  return new Date().toISOString();
}
