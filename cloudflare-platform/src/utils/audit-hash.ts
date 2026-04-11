export async function computeAuditHash(
  entry: { id: string; actor_id: string; action: string; entity_type: string; entity_id: string },
  prevHash: string | null,
): Promise<string> {
  const payload = JSON.stringify({
    id: entry.id,
    actor_id: entry.actor_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    prev_hash: prevHash ?? 'GENESIS',
  });
  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getLastAuditHash(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare('SELECT entry_hash FROM audit_log WHERE entry_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1')
    .first<{ entry_hash: string }>();
  return row?.entry_hash ?? null;
}
