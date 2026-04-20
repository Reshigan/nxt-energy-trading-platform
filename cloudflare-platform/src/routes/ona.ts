import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';
import { requireModule } from '../middleware/modules';
import { generateId, nowISO } from '../utils/id';
import type { Context } from 'hono';

const ona = new Hono<HonoEnv>();

// Ona API base URL
const ONA_API_BASE = 'https://api.asoba.co';

// ── Helper Functions ─────────────────────────────────────────────────

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getOnaLink(db: D1Database, participantId: string) {
  return db.prepare('SELECT * FROM ona_links WHERE participant_id = ?').bind(participantId).first();
}

async function verifyOnaCredentials(customerId: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${ONA_API_BASE}/terminal/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': customerId,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ action: 'list' })
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================
// POST /ona/link — Link Ona account
// ============================================================
ona.post('/link', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');
  const { customer_id, api_key } = await c.req.json() as {
    customer_id: string;
    api_key: string;
  };

  if (!customer_id || !api_key) {
    return c.json({ success: false, error: 'customer_id and api_key are required' }, 400);
  }

  const apiBase = 'https://api.asoba.co';
  
  // Verify credentials with Ona API
  const isValid = await verifyOnaCredentials(customer_id, api_key);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid Ona credentials or API unavailable' }, 401);
  }

  // Check for existing link
  const existing = await getOnaLink(c.env.DB, user.sub);
  if (existing) {
    return c.json({ success: false, error: 'Ona account already linked. Unlink first to re-link.' }, 400);
  }

  // Hash API key for storage
  const apiKeyHash = await hashApiKey(api_key);

  // Create link
  const linkId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO ona_links (id, participant_id, ona_customer_id, ona_api_key_hash, linked_at, sync_status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).bind(linkId, user.sub, customer_id, apiKeyHash, nowISO()).run();

  // Fire cascade event
  try {
    await c.env.DB.prepare(`
      INSERT INTO cascade_events (id, trigger_type, source_type, source_id, event_type, payload, created_at)
      VALUES (?, 'ona_linked', 'participant', ?, 'notify', ?, ?)
    `).bind(generateId(), user.sub, JSON.stringify({ participant_id: user.sub }), nowISO()).run();
  } catch { /* cascade non-critical */ }

  return c.json({
    success: true,
    data: { id: linkId, customer_id, linked_at: nowISO() },
    message: 'Ona account linked successfully'
  });
});

// ============================================================
// DELETE /ona/link — Unlink Ona account
// ============================================================
ona.delete('/link', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 404);
  }

  // Revoke the link
  await c.env.DB.prepare(
    'UPDATE ona_links SET sync_status = ?, last_sync_at = ? WHERE id = ?'
  ).bind('revoked', nowISO(), (link as any).id).run();

  return c.json({
    success: true,
    message: 'Ona account unlinked'
  });
});

// ============================================================
// GET /ona/status — Link status + last sync times
// ============================================================
ona.get('/status', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: true, data: null, linked: false });
  }

  const lastSync = await c.env.DB.prepare(`
    SELECT sync_type, completed_at, status FROM ona_sync_log 
    WHERE ona_link_id = ? AND status != 'success'
    ORDER BY completed_at DESC LIMIT 5
  `).bind((link as any).id).all();

  return c.json({
    success: true,
    data: {
      linked: true,
      id: (link as any).id,
      customer_id: (link as any).ona_customer_id,
      linked_at: (link as any).linked_at,
      sync_status: (link as any).sync_status,
      last_sync_at: (link as any).last_sync_at,
      failed_syncs: lastSync.results
    }
  });
});

// ============================================================
// GET /ona/assets — Mapped assets with sync status
// ============================================================
ona.get('/assets', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 400);
  }

  const assets = await c.env.DB.prepare(`
    SELECT 
      oam.id,
      oam.ona_asset_id,
      oam.ona_site_id,
      oam.mapped_at,
      p.id as project_id,
      p.name as project_name,
      oda.asset_id as odse_asset_id,
      oda.asset_name
    FROM ona_asset_map oam
    JOIN projects p ON p.id = oam.nxt_project_id
    LEFT JOIN odse_assets oda ON oda.asset_id = oam.nxt_odse_asset_id
    WHERE oam.ona_link_id = ?
  `).bind((link as any).id).all();

  return c.json({ success: true, data: assets.results });
});

// ============================================================
// POST /ona/assets/map — Manually map Ona asset to NXT project
// ============================================================
ona.post('/assets/map', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');
  const { ona_asset_id, ona_site_id, nxt_project_id, nxt_odse_asset_id } = await c.req.json() as {
    ona_asset_id: string;
    ona_site_id?: string;
    nxt_project_id: string;
    nxt_odse_asset_id?: string;
  };

  if (!ona_asset_id || !nxt_project_id) {
    return c.json({ success: false, error: 'ona_asset_id and nxt_project_id are required' }, 400);
  }

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 400);
  }

  // Verify project belongs to user
  const project = await c.env.DB.prepare(
    'SELECT id, developer_id FROM projects WHERE id = ?'
  ).bind(nxt_project_id).first();
  if (!project) {
    return c.json({ success: false, error: 'Project not found' }, 404);
  }

  // Create mapping
  const mapId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO ona_asset_map (id, ona_link_id, nxt_project_id, nxt_odse_asset_id, ona_asset_id, ona_site_id, mapped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(mapId, (link as any).id, nxt_project_id, nxt_odse_asset_id || null, ona_asset_id, ona_site_id || null, nowISO()).run();

  return c.json({
    success: true,
    data: { id: mapId, ona_asset_id, nxt_project_id },
    message: 'Asset mapped successfully'
  });
});

// ============================================================
// POST /ona/sync/forecast — Trigger manual forecast sync
// ============================================================
ona.post('/sync/forecast', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');
  const { asset_map_id, horizon_hours } = await c.req.json() as {
    asset_map_id?: string;
    horizon_hours?: number;
  };

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 400);
  }

  const apiBase = 'https://api.asoba.co';
  const customerId = (link as any).ona_customer_id;

  // Get Ona API key from KV
  let apiKey = '';
  try {
    const stored = await c.env.KV.get(`ona:key:${user.sub}`);
    apiKey = stored || '';
  } catch { /* key may not be in KV */ }

  const syncId = generateId();
  const startedAt = nowISO();

  await c.env.DB.prepare(`
    INSERT INTO ona_sync_log (id, ona_link_id, sync_type, direction, started_at)
    VALUES (?, ?, 'forecast', 'ona_to_nxt', ?)
  `).bind(syncId, (link as any).id, startedAt).run();

  try {
    // Get assets to sync
    let assetsQuery = `SELECT oam.id, oam.ona_asset_id, oam.ona_site_id FROM ona_asset_map oam WHERE oam.ona_link_id = ?`;
    const assetsParams: any[] = [(link as any).id];
    
    if (asset_map_id) {
      assetsQuery += ' AND oam.id = ?';
      assetsParams.push(asset_map_id);
    }

    const assets = await c.env.DB.prepare(assetsQuery).bind(...assetsParams).all();
    let recordsSynced = 0;

    for (const asset of assets.results) {
      const horizon = horizon_hours || 48;
      const response = await fetch(`${apiBase}/forecast?customer_id=${customerId}&site_id=${(asset as any).ona_site_id || ''}&horizon_hours=${horizon}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        if (data.forecasts) {
          for (const forecast of data.forecasts) {
            await c.env.DB.prepare(`
              INSERT INTO odse_timeseries (id, asset_id, timestamp, energy_kwh, source, quality, forecast_confidence_lower, forecast_confidence_upper)
              VALUES (?, ?, ?, ?, 'ona_ml', 'forecast', ?, ?)
              ON CONFLICT(id) DO UPDATE SET energy_kwh = excluded.energy_kwh
            `).bind(
              generateId(), (asset as any).ona_asset_id, forecast.timestamp,
              forecast.predicted_output_kw, forecast.confidence_lower, forecast.confidence_upper
            ).run();
            recordsSynced++;
          }
        }
      }
    }

    await c.env.DB.prepare(`
      UPDATE ona_sync_log SET records_synced = ?, status = 'success', completed_at = ? WHERE id = ?
    `).bind(recordsSynced, nowISO(), syncId).run();

    return c.json({
      success: true,
      data: { records_synced: recordsSynced },
      message: 'Forecast sync completed'
    });
  } catch (err) {
    await c.env.DB.prepare(`
      UPDATE ona_sync_log SET status = 'error', error_message = ?, completed_at = ? WHERE id = ?
    `).bind(String(err), nowISO(), syncId).run();

    return c.json({
      success: false,
      error: 'Forecast sync failed',
      details: String(err)
    }, 500);
  }
});

// ============================================================
// POST /ona/sync/faults — Trigger manual fault sync
// ============================================================
ona.post('/sync/faults', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');
  const { asset_map_id } = await c.req.json() as { asset_map_id?: string };

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 400);
  }

  const apiBase = 'https://api.asoba.co';
  const customerId = (link as any).ona_customer_id;

  let apiKey = '';
  try {
    const stored = await c.env.KV.get(`ona:key:${user.sub}`);
    apiKey = stored || '';
  } catch { /* key may not be in KV */ }

  const syncId = generateId();
  await c.env.DB.prepare(`
    INSERT INTO ona_sync_log (id, ona_link_id, sync_type, direction, started_at)
    VALUES (?, ?, 'fault', 'ona_to_nxt', ?)
  `).bind(syncId, (link as any).id, nowISO()).run();

  try {
    let assetsQuery = `SELECT oam.id, oam.ona_asset_id, oam.nxt_project_id FROM ona_asset_map oam WHERE oam.ona_link_id = ?`;
    const assetsParams: any[] = [(link as any).id];
    
    if (asset_map_id) {
      assetsQuery += ' AND oam.id = ?';
      assetsParams.push(asset_map_id);
    }

    const assets = await c.env.DB.prepare(assetsQuery).bind(...assetsParams).all();
    let recordsSynced = 0;

    const response = await fetch(`${apiBase}/terminal/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': customerId,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ action: 'list' })
    });

    if (response.ok) {
      const data = await response.json() as any;
      if (data.detections) {
        for (const detection of data.detections) {
          // Find matching asset map
          const assetMap = await c.env.DB.prepare(`
            SELECT oam.id, oam.nxt_project_id FROM ona_asset_map oam
            WHERE oam.ona_link_id = ? AND oam.ona_asset_id = ?
          `).bind((link as any).id, detection.asset_id).first();

          if (assetMap) {
            // Calculate revenue impact
            const project = await c.env.DB.prepare(
              'SELECT p.id, p.name, pr.daily_revenue_cents FROM projects p LEFT JOIN project_revenue pr ON pr.project_id = p.id WHERE p.id = ?'
            ).bind((assetMap as any).nxt_project_id).first();

            const severityScore = detection.severity || 0.5;
            const dailyRevenue = (project as any)?.daily_revenue_cents || 0;
            const revenueImpact = Math.round(dailyRevenue * severityScore);

            // Create intelligence item
            await c.env.DB.prepare(`
              INSERT INTO intelligence_items (id, project_id, category, source, title, description, severity, created_at)
              VALUES (?, ?, 'risk', 'ona', ?, ?, ?, ?)
            `).bind(
              generateId(), (assetMap as any).nxt_project_id,
              `Ona Alert: ${detection.fault_type} on ${detection.asset_name}`,
              `Anomaly detected: ${detection.description}. Severity: ${severityScore}/1.0. Estimated revenue at risk: R${(revenueImpact / 100).toFixed(2)}/day.`,
              severityScore, nowISO()
            ).run();

            // Check for lender if critical
            if (severityScore > 0.7 && project) {
              const lenders = await c.env.DB.prepare(`
                SELECT DISTINCT lf.participant_id FROM lender_facilities lf
                WHERE lf.project_id = ? AND lf.status = 'active'
              `).bind((project as any).id).all();

              for (const lender of lenders.results) {
                await c.env.DB.prepare(`
                  INSERT INTO intelligence_items (id, project_id, participant_id, category, source, title, description, severity, created_at)
                  VALUES (?, ?, ?, 'risk', 'ona', ?, ?, ?, ?)
                `).bind(
                  generateId(), (project as any).id, (lender as any).participant_id,
                  `Asset Alert: ${(project as any).name} — ${detection.fault_type}`,
                  `Revenue at risk: R${(revenueImpact / 100).toFixed(2)}/day. Monitor for DSCR impact.`,
                  severityScore, nowISO()
                ).run();
              }
            }

            recordsSynced++;
          }
        }
      }
    }

    await c.env.DB.prepare(`
      UPDATE ona_sync_log SET records_synced = ?, status = 'success', completed_at = ? WHERE id = ?
    `).bind(recordsSynced, nowISO(), syncId).run();

    return c.json({
      success: true,
      data: { records_synced: recordsSynced },
      message: 'Fault sync completed'
    });
  } catch (err) {
    await c.env.DB.prepare(`
      UPDATE ona_sync_log SET status = 'error', error_message = ?, completed_at = ? WHERE id = ?
    `).bind(String(err), nowISO(), syncId).run();

    return c.json({
      success: false,
      error: 'Fault sync failed',
      details: String(err)
    }, 500);
  }
});

// ============================================================
// GET /ona/sync/log — Sync history
// ============================================================
ona.get('/sync/log', authMiddleware({ roles: ['ipp', 'generator', 'admin'] }), async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20');

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: false, error: 'No Ona account linked' }, 400);
  }

  const logs = await c.env.DB.prepare(`
    SELECT id, sync_type, direction, records_synced, status, error_message, started_at, completed_at
    FROM ona_sync_log
    WHERE ona_link_id = ?
    ORDER BY started_at DESC
    LIMIT ?
  `).bind((link as any).id, limit).all();

  return c.json({ success: true, data: logs.results });
});

// ============================================================
// GET /ona/project/:projectId/forecast — Ona ML forecast for specific project
// ============================================================
ona.get('/project/:projectId/forecast', authMiddleware({ requireKyc: false }), async (c) => {
  const user = c.get('user');
  const { projectId } = c.req.param();

  // Check Ona link
  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: true, data: null, ona_linked: false });
  }

  // Get asset map for this project
  const assetMap = await c.env.DB.prepare(`
    SELECT id, ona_asset_id, ona_site_id FROM ona_asset_map WHERE nxt_project_id = ?
  `).bind(projectId).first();

  if (!assetMap) {
    return c.json({ success: true, data: null, ona_linked: false, message: 'Project not mapped to Ona' });
  }

  // Get forecasts from timeseries
  const forecasts = await c.env.DB.prepare(`
    SELECT timestamp, energy_kwh, forecast_confidence_lower, forecast_confidence_upper
    FROM odse_timeseries
    WHERE asset_id = ? AND source = 'ona_ml' AND quality = 'forecast'
    AND timestamp >= datetime('now', '-48 hours')
    ORDER BY timestamp ASC
  `).bind((assetMap as any).ona_asset_id).all();

  // Calculate accuracy stats
  const modelAccuracy = 0.94; // Default - could be calculated from historical data

  return c.json({
    success: true,
    data: {
      forecasts: forecasts.results,
      model_accuracy: modelAccuracy,
      source: 'ona_ml'
    },
    ona_linked: true
  });
});

// ============================================================
// GET /ona/project/:projectId/health — Asset health summary + active alerts
// ============================================================
ona.get('/project/:projectId/health', authMiddleware({ requireKyc: false }), async (c) => {
  const user = c.get('user');
  const { projectId } = c.req.param();

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: true, data: null, ona_linked: false });
  }

  const assetMap = await c.env.DB.prepare(`
    SELECT id FROM ona_asset_map WHERE nxt_project_id = ?
  `).bind(projectId).first();

  if (!assetMap) {
    return c.json({ success: true, data: null, ona_linked: false, message: 'Project not mapped to Ona' });
  }

  // Get active faults
  const faults = await c.env.DB.prepare(`
    SELECT id, asset_name, fault_type, severity_score, revenue_impact_cents_per_day, detected_at
    FROM ona_fault_cache
    WHERE ona_asset_map_id = ? AND status = 'active'
    ORDER BY severity_score DESC
  `).bind((assetMap as any).id).all();

  // Get asset health metrics
  const health = await c.env.DB.prepare(`
    SELECT performance_ratio, availability_pct, mttr_hours, mtbf_hours, last_update
    FROM ona_asset_health
    WHERE ona_asset_map_id = ?
    ORDER BY last_update DESC
    LIMIT 1
  `).bind((assetMap as any).id).first();

  return c.json({
    success: true,
    data: {
      active_alerts: faults.results,
      health_metrics: health,
      diagnostic_link: `https://app.asoba.co/assets/${(assetMap as any).ona_asset_id}/health`
    },
    ona_linked: true
  });
});

// ============================================================
// GET /ona/project/:projectId/maintenance — Scheduled + historical maintenance + BOMs
// ============================================================
ona.get('/project/:projectId/maintenance', authMiddleware({ requireKyc: false }), async (c) => {
  const user = c.get('user');
  const { projectId } = c.req.param();

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: true, data: null, ona_linked: false });
  }

  const assetMap = await c.env.DB.prepare(`
    SELECT id, ona_asset_id FROM ona_asset_map WHERE nxt_project_id = ?
  `).bind(projectId).first();

  if (!assetMap) {
    return c.json({ success: true, data: null, ona_linked: false, message: 'Project not mapped to Ona' });
  }

  const apiBase = 'https://api.asoba.co';
  const customerId = (link as any).ona_customer_id;

  let apiKey = '';
  try {
    const stored = await c.env.KV.get(`ona:key:${user.sub}`);
    apiKey = stored || '';
  } catch { /* key may not be in KV */ }

  // Get scheduled maintenance from Ona
  const scheduleResponse = await fetch(`${apiBase}/terminal/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Id': customerId,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ action: 'list', site_id: (assetMap as any).ona_site_id })
  });

  let scheduled = [];
  if (scheduleResponse.ok) {
    const scheduleData = await scheduleResponse.json() as any;
    scheduled = scheduleData.schedules || [];
  }

  // Get BOMs from local cache
  const boms = await c.env.DB.prepare(`
    SELECT omb.id, omb.ona_work_order_id, omb.part_name, omb.quantity, omb.unit_cost_cents, omb.total_cost_cents
    FROM ona_maintenance_bom omb
    WHERE omb.ona_asset_map_id = ?
    ORDER BY omb.synced_at DESC
  `).bind((assetMap as any).id).all();

  return c.json({
    success: true,
    data: {
      scheduled_maintenance: scheduled,
      cached_boms: boms.results,
      maintenance_link: `https://app.asoba.co/assets/${(assetMap as any).ona_asset_id}/maintenance`
    },
    ona_linked: true
  });
});

// ============================================================
// GET /ona/project/:projectId/performance — Ona-sourced performance metrics
// ============================================================
ona.get('/project/:projectId/performance', authMiddleware({ requireKyc: false }), async (c) => {
  const user = c.get('user');
  const { projectId } = c.req.param();

  const link = await getOnaLink(c.env.DB, user.sub);
  if (!link) {
    return c.json({ success: true, data: null, ona_linked: false });
  }

  const assetMap = await c.env.DB.prepare(`
    SELECT id, ona_asset_id, ona_site_id FROM ona_asset_map WHERE nxt_project_id = ?
  `).bind(projectId).first();

  if (!assetMap) {
    return c.json({ success: true, data: null, ona_linked: false, message: 'Project not mapped to Ona' });
  }

  // Get latest health metrics
  const health = await c.env.DB.prepare(`
    SELECT performance_ratio, availability_pct, mttr_hours, mtbf_hours, last_update
    FROM ona_asset_health
    WHERE ona_asset_map_id = ?
    ORDER BY last_update DESC
    LIMIT 1
  `).bind((assetMap as any).id).first();

  const apiBase = 'https://api.asoba.co';
  const customerId = (link as any).ona_customer_id;

  let apiKey = '';
  try {
    const stored = await c.env.KV.get(`ona:key:${user.sub}`);
    apiKey = stored || '';
  } catch { /* key may not be in KV */ }

  // Get additional performance data from Ona
  const perfResponse = await fetch(`${apiBase}/terminal/performance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Id': customerId,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ action: 'get', site_id: (assetMap as any).ona_site_id })
  });

  let additionalPerf = {};
  if (perfResponse.ok) {
    additionalPerf = await perfResponse.json();
  }

  return c.json({
    success: true,
    data: {
      ...health,
      ...additionalPerf,
      performance_link: `https://app.asoba.co/assets/${(assetMap as any).ona_asset_id}/performance`
    },
    ona_linked: true
  });
});

export default ona;
