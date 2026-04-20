/**
 * 2.3 Data Retention — Cron-driven archival to R2 + retention policies
 */
import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { generateId, nowISO } from '../utils/id';
import { captureException } from '../utils/sentry';
import { errorResponse, ErrorCodes } from '../utils/pagination';

const retention = new Hono<HonoEnv>();
retention.use('*', authMiddleware({ roles: ['admin'] }));

const RETENTION_POLICIES: Record<string, { table: string; retention_days: number; archive_column: string }> = {
  trades: { table: 'trades', retention_days: 365 * 5, archive_column: 'created_at' },
  audit_log: { table: 'audit_log', retention_days: 365 * 7, archive_column: 'created_at' },
  notifications: { table: 'notifications', retention_days: 90, archive_column: 'created_at' },
  surveillance_alerts: { table: 'surveillance_alerts', retention_days: 365 * 5, archive_column: 'created_at' },
  metering_data: { table: 'metering_data', retention_days: 365 * 10, archive_column: 'timestamp' },
};

// GET /retention/policies — List retention policies
retention.get('/policies', async (c) => {
  try {
    return c.json({ success: true, data: Object.entries(RETENTION_POLICIES).map(([key, v]) => ({ key, ...v })) });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get policies'), 500);
  }
});

// POST /retention/archive/:table — Archive old records to R2
retention.post('/archive/:table', async (c) => {
  try {
    const tableName = c.req.param('table');
    const policy = RETENTION_POLICIES[tableName];
    if (!policy) return c.json({ success: false, error: 'No retention policy for this table' }, 404);

    const cutoff = new Date(Date.now() - policy.retention_days * 86400000).toISOString();

    // Count records to archive
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${policy.archive_column} < ?`
    ).bind(cutoff).first<{ count: number }>();

    const recordCount = countResult?.count || 0;
    if (recordCount === 0) {
      return c.json({ success: true, data: { table: tableName, records_archived: 0, message: 'No records to archive' } });
    }

    // Fetch records
    const records = await c.env.DB.prepare(
      `SELECT * FROM ${policy.table} WHERE ${policy.archive_column} < ? LIMIT 10000`
    ).bind(cutoff).all();

    // Store in R2
    const r2Key = `archives/${tableName}/${new Date().toISOString().substring(0, 10)}_${generateId().substring(0, 8)}.json`;
    await c.env.R2.put(r2Key, JSON.stringify(records.results), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { table: tableName, archived_at: nowISO(), record_count: String(records.results.length) },
    });

    // Delete archived records
    await c.env.DB.prepare(
      `DELETE FROM ${policy.table} WHERE ${policy.archive_column} < ? AND rowid IN (SELECT rowid FROM ${policy.table} WHERE ${policy.archive_column} < ? LIMIT 10000)`
    ).bind(cutoff, cutoff).run();

    // Log
    await c.env.DB.prepare(
      'INSERT INTO archival_log (id, table_name, records_archived, r2_key, archived_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), tableName, records.results.length, r2Key, nowISO()).run();

    return c.json({ success: true, data: { table: tableName, records_archived: records.results.length, r2_key: r2Key } });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Archive failed'), 500);
  }
});

// GET /retention/log — Archival history
retention.get('/log', async (c) => {
  try {
    const results = await c.env.DB.prepare('SELECT * FROM archival_log ORDER BY archived_at DESC LIMIT 100').all();
    return c.json({ success: true, data: results.results });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get archival log'), 500);
  }
});

// GET /retention/stats — Storage statistics
retention.get('/stats', async (c) => {
  try {
    const tables = Object.keys(RETENTION_POLICIES);
    const stats = await Promise.all(
      tables.map(async (t) => {
        const policy = RETENTION_POLICIES[t];
        const count = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${policy.table}`).first<{ count: number }>();
        const oldest = await c.env.DB.prepare(`SELECT MIN(${policy.archive_column}) as oldest FROM ${policy.table}`).first<{ oldest: string }>();
        return { table: t, record_count: count?.count || 0, oldest_record: oldest?.oldest || null, retention_days: policy.retention_days };
      })
    );
    return c.json({ success: true, data: stats });
  } catch (err) {
    captureException(c, err);
    return c.json(errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to get stats'), 500);
  }
});

export default retention;
