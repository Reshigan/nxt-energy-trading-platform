import { Hono } from 'hono';
import { HonoEnv } from '../utils/types';
import { authMiddleware } from '../auth/middleware';

// ── Types ────────────────────────────────────────────────────
interface KPI {
  id: string;
  label: string;
  value: string;
  value_raw: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'flat';
  positive: boolean;
  period: string;
  source_endpoint: string;
}

interface ActionItem {
  id: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  action_url: string;
  deadline: string | null;
  created_at: string;
}

interface ModuleCard {
  module: string;
  title: string;
  summary: Record<string, unknown>;
  chart_data?: unknown[];
  chart_type?: 'sparkline' | 'bar' | 'pie' | 'gauge';
  action_count: number;
  link: string;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  actor: string;
}

interface CockpitData {
  kpis: KPI[];
  action_queue: ActionItem[];
  module_cards: ModuleCard[];
  alerts: Alert[];
  recent_activity: ActivityItem[];
}

// ── Helpers ──────────────────────────────────────────────────
function cnt(v: unknown): number {
  return (v as Record<string, number> | null)?.c ?? 0;
}
function sum(v: unknown): number {
  return (v as Record<string, number> | null)?.s ?? 0;
}
function formatZAR(cents: number): string {
  if (cents >= 100_000_000) return `R${(cents / 100_000_000).toFixed(1)}M`;
  if (cents >= 100_000) return `R${(cents / 100_000).toFixed(0)}K`;
  return `R${(cents / 100).toFixed(0)}`;
}

function sortActions(items: ActionItem[]): ActionItem[] {
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3));
}

type DB = { prepare: (q: string) => { bind: (...a: unknown[]) => { first: <T = Record<string, unknown>>() => Promise<T | null>; all: () => Promise<{ results: Record<string, unknown>[] }> }; first: <T = Record<string, unknown>>() => Promise<T | null>; all: () => Promise<{ results: Record<string, unknown>[] }> } };

// ── Shared: Alerts & Recent Activity ────────────────────────
async function fetchAlerts(pid: string, role: string, db: DB): Promise<Alert[]> {
  const alerts: Alert[] = [];
  try {
    // Licence expiry alerts — admin/regulator see all; IPP/generator see only their own
    if (['admin', 'regulator'].includes(role)) {
      const expiring = await db.prepare("SELECT l.id, l.type, l.expiry_date, p.company_name FROM licences l JOIN participants p ON l.participant_id = p.id WHERE l.expiry_date <= date('now','+30 days') AND l.status = 'active' LIMIT 5").all();
      for (const l of expiring.results) {
        alerts.push({ id: `alert-lic-${l.id}`, severity: 'warning', title: `Licence expiring: ${l.type}`, message: `${l.company_name} — expires ${l.expiry_date}`, created_at: String(l.expiry_date) });
      }
    } else if (['ipp', 'ipp_developer', 'generator'].includes(role)) {
      const expiring = await db.prepare("SELECT l.id, l.type, l.expiry_date, p.company_name FROM licences l JOIN participants p ON l.participant_id = p.id WHERE l.participant_id = ? AND l.expiry_date <= date('now','+30 days') AND l.status = 'active' LIMIT 5").bind(pid).all();
      for (const l of expiring.results) {
        alerts.push({ id: `alert-lic-${l.id}`, severity: 'warning', title: `Licence expiring: ${l.type}`, message: `${l.company_name} — expires ${l.expiry_date}`, created_at: String(l.expiry_date) });
      }
    }
    // Surveillance / AML alerts (admin, regulator)
    if (['admin', 'regulator'].includes(role)) {
      const aml = await db.prepare("SELECT id, alert_type, severity, description, created_at FROM aml_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT 5").all();
      for (const a of aml.results) {
        alerts.push({ id: `alert-aml-${a.id}`, severity: a.severity === 'high' ? 'critical' : 'warning', title: `AML Alert: ${a.alert_type}`, message: String(a.description), created_at: String(a.created_at) });
      }
    }
    // Overdue invoices — admin sees all; offtaker/trader see only their own
    if (role === 'admin') {
      const overdue = await db.prepare("SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE status = 'outstanding' AND due_date < date('now') LIMIT 3").all();
      for (const inv of overdue.results) {
        alerts.push({ id: `alert-inv-${inv.id}`, severity: 'critical', title: `Invoice overdue: ${inv.invoice_number}`, message: `R${((inv.total_cents as number) / 100).toFixed(0)} past due since ${inv.due_date}`, created_at: String(inv.due_date) });
      }
    } else if (['offtaker', 'trader'].includes(role)) {
      const overdue = await db.prepare("SELECT id, invoice_number, total_cents, due_date FROM invoices WHERE to_participant_id = ? AND status = 'outstanding' AND due_date < date('now') LIMIT 3").bind(pid).all();
      for (const inv of overdue.results) {
        alerts.push({ id: `alert-inv-${inv.id}`, severity: 'critical', title: `Invoice overdue: ${inv.invoice_number}`, message: `R${((inv.total_cents as number) / 100).toFixed(0)} past due since ${inv.due_date}`, created_at: String(inv.due_date) });
      }
    }
    // CP deadline approaching (IPP, lender)
    if (['ipp', 'ipp_developer', 'generator', 'lender'].includes(role)) {
      const cps = await db.prepare("SELECT cp.id, cp.description, cp.due_date, p.name as project_name FROM conditions_precedent cp JOIN projects p ON cp.project_id = p.id WHERE (p.developer_id = ? OR p.lender_id = ?) AND cp.status = 'outstanding' AND cp.due_date <= date('now','+7 days') LIMIT 3").bind(pid, pid).all();
      for (const cp of cps.results) {
        alerts.push({ id: `alert-cp-${cp.id}`, severity: 'warning', title: `CP deadline approaching: ${cp.description}`, message: `${cp.project_name} — due ${cp.due_date}`, created_at: String(cp.due_date) });
      }
    }
    // Pending settlements — admin sees all stale trades; trader sees their own
    if (role === 'admin') {
      const pending = await db.prepare("SELECT COUNT(*) as c FROM trades WHERE status = 'pending' AND created_at <= datetime('now','-1 day')").first<{ c: number }>();
      if (pending && pending.c > 0) {
        alerts.push({ id: 'alert-settle', severity: 'warning', title: `${pending.c} trade(s) awaiting settlement`, message: 'Trades older than 24h still pending settlement', created_at: new Date().toISOString() });
      }
    } else if (role === 'trader') {
      const pending = await db.prepare("SELECT COUNT(*) as c FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'pending' AND created_at <= datetime('now','-1 day')").bind(pid, pid).first<{ c: number }>();
      if (pending && pending.c > 0) {
        alerts.push({ id: 'alert-settle', severity: 'warning', title: `${pending.c} trade(s) awaiting settlement`, message: 'Trades older than 24h still pending settlement', created_at: new Date().toISOString() });
      }
    }
  } catch (e) {
    console.error('fetchAlerts error:', e);
  }
  return alerts;
}

async function fetchRecentActivity(pid: string, role: string, db: DB): Promise<ActivityItem[]> {
  try {
    // Admin sees all activity; other roles see activity related to them
    const query = role === 'admin'
      ? "SELECT id, action, entity_type, entity_id, created_at as timestamp, actor_id as actor FROM audit_log ORDER BY created_at DESC LIMIT 10"
      : "SELECT id, action, entity_type, entity_id, created_at as timestamp, actor_id as actor FROM audit_log WHERE actor_id = ? ORDER BY created_at DESC LIMIT 10";
    const result = role === 'admin'
      ? await db.prepare(query).all()
      : await db.prepare(query).bind(pid).all();
    return result.results.map((r) => ({
      id: String(r.id), action: String(r.action || ''), entity_type: String(r.entity_type || ''),
      entity_id: String(r.entity_id || ''), timestamp: String(r.timestamp || ''), actor: String(r.actor || ''),
    }));
  } catch (e) {
    console.error('fetchRecentActivity error:', e);
    return [];
  }
}

// ── Route ────────────────────────────────────────────────────
const cockpit = new Hono<HonoEnv>();
cockpit.use('*', authMiddleware({ requireKyc: false }));

cockpit.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const role = user.role;
    const pid = user.sub;
    const db = c.env.DB as unknown as DB;

    const builders: Record<string, (pid: string, db: DB) => Promise<CockpitData>> = {
      admin: buildAdminCockpit,
      generator: buildIPPCockpit,
      ipp: buildIPPCockpit,
      ipp_developer: buildIPPCockpit,
      trader: buildTraderCockpit,
      carbon_fund: buildCarbonFundCockpit,
      offtaker: buildOfftakerCockpit,
      lender: buildLenderCockpit,
      grid: buildGridCockpit,
      regulator: buildRegulatorCockpit,
    };

    const builder = builders[role] || builders.trader;
    const [cockpitData, alerts, recent_activity] = await Promise.all([
      builder(pid, db),
      fetchAlerts(pid, role, db),
      fetchRecentActivity(pid, role, db),
    ]);

    // Merge shared alerts/activity with any builder-specific ones
    const mergedAlerts = [...(cockpitData.alerts || []), ...alerts];
    const mergedActivity = cockpitData.recent_activity.length > 0 ? cockpitData.recent_activity : recent_activity;

    return c.json({
      success: true,
      data: {
        role,
        participant: { id: pid, name: user.company_name || '' },
        ...cockpitData,
        alerts: mergedAlerts,
        recent_activity: mergedActivity,
      },
    });
  } catch (err) {
    console.error('Cockpit error:', err);
    return c.json({ success: false, error: 'Failed to load cockpit data' }, 500);
  }
});

// ══════════════════════════════════════════════════════════════
// COCKPIT 1: PLATFORM ADMIN
// ══════════════════════════════════════════════════════════════
async function buildAdminCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [participants, revenue, volume, kycQueue, activeContracts, disputes] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM participants WHERE kyc_status = 'verified'").first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(fee_cents),0) as s FROM trades WHERE created_at >= date('now','start of month')").first<{ s: number }>(),
    db.prepare("SELECT COALESCE(SUM(total_cents),0) as s FROM trades WHERE created_at >= datetime('now','-1 day')").first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM participants WHERE kyc_status = 'manual_review'").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM contract_documents WHERE phase = 'active'").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM disputes WHERE status NOT IN ('resolved','withdrawn')").first<{ c: number }>(),
  ]);

  // Action queue
  const [pendingApprovals, failedStatutory, expiringLicences] = await Promise.all([
    db.prepare("SELECT id, company_name, created_at FROM participants WHERE kyc_status = 'manual_review' ORDER BY created_at ASC LIMIT 20").all(),
    db.prepare("SELECT sc.id, sc.regulation, sc.created_at, p.company_name FROM statutory_checks sc JOIN participants p ON sc.entity_id = p.id WHERE sc.status = 'fail' AND sc.entity_type = 'participant' LIMIT 10").all(),
    db.prepare("SELECT l.id, l.type as licence_type, l.expiry_date, l.created_at, p.company_name FROM licences l JOIN participants p ON l.participant_id = p.id WHERE l.expiry_date <= date('now','+30 days') AND l.status = 'active' LIMIT 10").all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...pendingApprovals.results.map((p) => ({
      id: `approve-${p.id}`, urgency: 'high' as const, title: `Approve participant: ${p.company_name}`,
      description: `Registration submitted ${p.created_at}`, source_module: 'registration',
      entity_type: 'participant', entity_id: String(p.id), action_type: 'approve',
      action_url: `/admin?approve=${p.id}`, deadline: null, created_at: String(p.created_at),
    })),
    ...failedStatutory.results.map((sc) => ({
      id: `override-${sc.id}`, urgency: 'medium' as const, title: `Statutory check failed: ${sc.regulation}`,
      description: `${sc.company_name} — review required`, source_module: 'compliance',
      entity_type: 'statutory_check', entity_id: String(sc.id), action_type: 'override',
      action_url: `/compliance?check=${sc.id}`, deadline: null, created_at: String(sc.created_at),
    })),
    ...expiringLicences.results.map((l) => ({
      id: `licence-${l.id}`, urgency: 'medium' as const, title: `Licence expiring: ${l.licence_type}`,
      description: `${l.company_name} — expires ${l.expiry_date}`, source_module: 'compliance',
      entity_type: 'licence', entity_id: String(l.id), action_type: 'review',
      action_url: `/compliance?licence=${l.id}`, deadline: String(l.expiry_date), created_at: String(l.created_at),
    })),
  ]);

  // Module cards
  const [partStats, tradeStats, complianceStats] = await Promise.all([
    db.prepare("SELECT kyc_status, COUNT(*) as c FROM participants GROUP BY kyc_status").all(),
    db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(total_cents),0) as s FROM trades WHERE created_at >= datetime('now','-1 day')").first<{ c: number; s: number }>(),
    db.prepare("SELECT status, COUNT(*) as c FROM statutory_checks GROUP BY status").all(),
  ]);

  const module_cards: ModuleCard[] = [
    { module: 'participants', title: 'Participants', summary: { total: cnt(participants), verified: cnt(participants), pending: cnt(kycQueue), byStatus: partStats.results }, chart_type: 'pie', action_count: cnt(kycQueue), link: '/admin' },
    { module: 'trading', title: 'Trading', summary: { volume_24h: sum(volume), trades_24h: tradeStats?.c ?? 0 }, chart_type: 'sparkline', action_count: 0, link: '/trading' },
    { module: 'compliance', title: 'Compliance', summary: { byStatus: complianceStats.results }, chart_type: 'gauge', action_count: failedStatutory.results.length, link: '/compliance' },
    { module: 'revenue', title: 'Revenue', summary: { mtd: sum(revenue) }, chart_type: 'bar', action_count: 0, link: '/analytics' },
    { module: 'disputes', title: 'Disputes', summary: { open: cnt(disputes) }, action_count: cnt(disputes), link: '/disputes' },
    { module: 'system', title: 'System Health', summary: { status: 'operational' }, chart_type: 'sparkline', action_count: 0, link: '/system-health' },
  ];

  // Recent activity
  const recentActivity = await db.prepare("SELECT id, action, entity_type, entity_id, created_at as timestamp, actor_id as actor FROM audit_log ORDER BY created_at DESC LIMIT 10").all();

  return {
    kpis: [
      { id: 'participants', label: 'Active Participants', value: String(cnt(participants)), value_raw: cnt(participants), unit: 'count', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/participants' },
      { id: 'revenue', label: 'Platform Revenue MTD', value: formatZAR(sum(revenue)), value_raw: sum(revenue), unit: 'ZAR', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/admin' },
      { id: 'volume', label: '24h Trading Volume', value: formatZAR(sum(volume)), value_raw: sum(volume), unit: 'ZAR', change: 0, trend: 'up', positive: true, period: 'today', source_endpoint: '/trading' },
      { id: 'kyc_queue', label: 'KYC Queue', value: String(cnt(kycQueue)), value_raw: cnt(kycQueue), unit: 'count', change: 0, trend: 'flat', positive: cnt(kycQueue) === 0, period: 'current', source_endpoint: '/compliance' },
      { id: 'contracts', label: 'Active Contracts', value: String(cnt(activeContracts)), value_raw: cnt(activeContracts), unit: 'count', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/contracts' },
      { id: 'disputes', label: 'Open Disputes', value: String(cnt(disputes)), value_raw: cnt(disputes), unit: 'count', change: 0, trend: 'down', positive: cnt(disputes) === 0, period: 'current', source_endpoint: '/settlement' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: recentActivity.results.map((r) => ({
      id: String(r.id), action: String(r.action || ''), entity_type: String(r.entity_type || ''),
      entity_id: String(r.entity_id || ''), timestamp: String(r.timestamp || ''), actor: String(r.actor || ''),
    })),
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 2: IPP DEVELOPER / GENERATOR
// ══════════════════════════════════════════════════════════════
async function buildIPPCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [projects, capacity, cpsOutstanding, disbPending, generation, odseGenMTD, odseCapFactor, odseHourly, odseDailyTrend] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM projects WHERE developer_id = ?").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(capacity_mw),0) as s FROM projects WHERE developer_id = ?").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM conditions_precedent cp JOIN projects p ON cp.project_id = p.id WHERE p.developer_id = ? AND cp.status = 'outstanding'").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM disbursements d JOIN projects p ON d.project_id = p.id WHERE p.developer_id = ? AND d.status IN ('pending','pending_fc')").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(value_kwh),0) as s FROM meter_readings mr JOIN projects p ON mr.project_id = p.id WHERE p.developer_id = ? AND mr.timestamp >= date('now','start of month')").bind(pid).first<{ s: number }>(),
    // ODSE: Generation MTD from ODSE timeseries
    db.prepare("SELECT COALESCE(SUM(t.kwh),0) as s, COUNT(*) as c FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','start of month')").bind(pid).first<{ s: number; c: number }>(),
    // ODSE: Capacity factor (actual gen / theoretical max) — separate subquery for capacity to avoid inflation by reading count
    Promise.all([
      db.prepare("SELECT COALESCE(SUM(t.kwh),0) as gen_kwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','-30 days')").bind(pid).first<{ gen_kwh: number }>(),
      db.prepare("SELECT COALESCE(SUM(capacity_kw),0) as cap_kw FROM odse_assets WHERE participant_id = ?").bind(pid).first<{ cap_kw: number }>(),
    ]).then(([gen, cap]) => ({ gen_kwh: gen?.gen_kwh ?? 0, cap_kw: cap?.cap_kw ?? 0 })),
    // ODSE: Hourly generation profile (for chart)
    db.prepare("SELECT CAST(strftime('%H', t.timestamp) AS INTEGER) as hour, ROUND(AVG(t.kwh),2) as avg_kwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','-30 days') GROUP BY hour ORDER BY hour").bind(pid).all(),
    // ODSE: Daily generation trend (for chart)
    db.prepare("SELECT date(t.timestamp) as date, ROUND(SUM(t.kwh)/1000,2) as mwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','-30 days') GROUP BY date(t.timestamp) ORDER BY date DESC LIMIT 30").bind(pid).all(),
  ]);

  // ODSE capacity factor calculation
  const genKwh = (odseCapFactor as Record<string, number> | null)?.gen_kwh ?? 0;
  const theoreticalKwh = ((odseCapFactor as Record<string, number> | null)?.cap_kw ?? 0) * 30 * 24; // 30 days * 24 hours
  const capFactor = theoreticalKwh > 0 ? Math.round((genKwh / theoreticalKwh) * 10000) / 100 : 0;

  // Action queue
  const [outstandingCPs, pendingSignatures, projectList] = await Promise.all([
    db.prepare("SELECT cp.id, cp.description, p.name as project_name, cp.created_at FROM conditions_precedent cp JOIN projects p ON cp.project_id = p.id WHERE p.developer_id = ? AND cp.status = 'outstanding' ORDER BY cp.created_at ASC LIMIT 10").bind(pid).all(),
    db.prepare("SELECT cd.id, cd.title, cd.created_at FROM contract_documents cd JOIN document_signatories cs ON cd.id = cs.document_id WHERE cs.participant_id = ? AND cs.signed_at IS NULL LIMIT 10").bind(pid).all(),
    db.prepare("SELECT id, name, phase, capacity_mw FROM projects WHERE developer_id = ? ORDER BY created_at DESC").bind(pid).all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...outstandingCPs.results.map((cp) => ({
      id: `cp-${cp.id}`, urgency: 'high' as const, title: `Upload CP document: ${cp.description}`,
      description: `Project: ${cp.project_name}`, source_module: 'ipp',
      entity_type: 'condition_precedent', entity_id: String(cp.id), action_type: 'upload',
      action_url: `/ipp?cp=${cp.id}`, deadline: null, created_at: String(cp.created_at),
    })),
    ...pendingSignatures.results.map((cd) => ({
      id: `sign-${cd.id}`, urgency: 'medium' as const, title: `Sign contract: ${cd.title}`,
      description: 'Pending your signature', source_module: 'contracts',
      entity_type: 'contract', entity_id: String(cd.id), action_type: 'sign',
      action_url: `/contracts/${cd.id}`, deadline: null, created_at: String(cd.created_at),
    })),
  ]);

  // Module cards
  const phaseGroups = await db.prepare("SELECT phase, COUNT(*) as c FROM projects WHERE developer_id = ? GROUP BY phase").bind(pid).all();
  const disbursementStats = await db.prepare("SELECT status, COUNT(*) as c, COALESCE(SUM(amount_cents),0) as s FROM disbursements d JOIN projects p ON d.project_id = p.id WHERE p.developer_id = ? GROUP BY status").bind(pid).all();

  const module_cards: ModuleCard[] = [
    { module: 'pipeline', title: 'Project Pipeline', summary: { byPhase: phaseGroups.results, projects: projectList.results }, chart_type: 'bar', action_count: 0, link: '/ipp' },
    { module: 'cp_tracker', title: 'CP Tracker', summary: { outstanding: cnt(cpsOutstanding) }, action_count: cnt(cpsOutstanding), link: '/ipp' },
    { module: 'disbursements', title: 'Disbursements', summary: { byStatus: disbursementStats.results, pending: cnt(disbPending) }, action_count: cnt(disbPending), link: '/ipp' },
    { module: 'generation', title: 'Generation', summary: { mtd_kwh: sum(generation), mtd_mwh: Math.round(sum(generation) / 1000) }, chart_type: 'sparkline', action_count: 0, link: '/metering' },
    { module: 'odse_generation', title: 'ODSE Generation Analytics', summary: { mtd_kwh: sum(odseGenMTD), mtd_mwh: Math.round(sum(odseGenMTD) / 1000), capacity_factor_pct: capFactor, hourly_profile: odseHourly.results, daily_trend: odseDailyTrend.results }, chart_type: 'bar', chart_data: odseDailyTrend.results as unknown[], action_count: 0, link: '/metering-analytics' },
    { module: 'contracts', title: 'Contracts', summary: { pending_signatures: pendingSignatures.results.length }, action_count: pendingSignatures.results.length, link: '/contracts' },
  ];

  return {
    kpis: [
      { id: 'projects', label: 'Active Projects', value: String(cnt(projects)), value_raw: cnt(projects), unit: 'count', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/projects' },
      { id: 'capacity', label: 'Total Capacity', value: `${sum(capacity)} MW`, value_raw: sum(capacity), unit: 'MW', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/projects' },
      { id: 'cps', label: 'CPs Outstanding', value: String(cnt(cpsOutstanding)), value_raw: cnt(cpsOutstanding), unit: 'count', change: 0, trend: 'down', positive: cnt(cpsOutstanding) === 0, period: 'current', source_endpoint: '/projects' },
      { id: 'generation', label: 'Generation MTD', value: `${Math.round(sum(generation) / 1000)} MWh`, value_raw: sum(generation), unit: 'MWh', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/metering' },
      { id: 'odse_gen', label: 'ODSE Gen MTD', value: `${Math.round(sum(odseGenMTD) / 1000)} MWh`, value_raw: sum(odseGenMTD), unit: 'MWh', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/odse/analytics/summary' },
      { id: 'capacity_factor', label: 'Capacity Factor', value: `${capFactor}%`, value_raw: capFactor, unit: '%', change: 0, trend: 'up', positive: capFactor > 20, period: '30d', source_endpoint: '/odse/analytics/summary' },
      { id: 'disbursements', label: 'Disbursements Pending', value: String(cnt(disbPending)), value_raw: cnt(disbPending), unit: 'count', change: 0, trend: 'flat', positive: true, period: 'current', source_endpoint: '/projects' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 3: ENERGY TRADER
// ══════════════════════════════════════════════════════════════
async function buildTraderCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [openOrders, tradeCount, carbonPosition, settlements, odseGenTotal, odseConsTotal, odseDailyBalance, odseHourlyBalance] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE participant_id = ? AND status IN ('open','partial')").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND created_at >= date('now','-30 days')").bind(pid, pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM carbon_credits WHERE owner_id = ? AND status = 'active'").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'pending' AND created_at <= datetime('now','-1 day')").bind(pid, pid).first<{ c: number }>(),
    // ODSE: Total generation (30d) for energy balance — scoped to participant's assets
    db.prepare("SELECT COALESCE(SUM(t.kwh),0) as s FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','-30 days')").bind(pid).first<{ s: number }>(),
    // ODSE: Total consumption (30d) for energy balance — scoped to participant's assets
    db.prepare("SELECT COALESCE(SUM(t.kwh),0) as s FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.timestamp >= date('now','-30 days')").bind(pid).first<{ s: number }>(),
    // ODSE: Daily generation vs consumption for balance chart — scoped to participant's assets
    db.prepare("SELECT date(t.timestamp) as date, t.direction, ROUND(SUM(t.kwh)/1000,2) as mwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.timestamp >= date('now','-30 days') AND t.direction IN ('generation','consumption') GROUP BY date(t.timestamp), t.direction ORDER BY date DESC LIMIT 60").bind(pid).all(),
    // ODSE: Hourly energy balance profile — scoped to participant's assets
    db.prepare("SELECT CAST(strftime('%H', t.timestamp) AS INTEGER) as hour, t.direction, ROUND(AVG(t.kwh),2) as avg_kwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.timestamp >= date('now','-30 days') AND t.direction IN ('generation','consumption') GROUP BY hour, t.direction ORDER BY hour").bind(pid).all(),
  ]);

  // Filled vs total for fill rate
  const [filledOrders, totalOrders] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE participant_id = ? AND status = 'filled' AND created_at >= date('now','-30 days')").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE participant_id = ? AND created_at >= date('now','-30 days')").bind(pid).first<{ c: number }>(),
  ]);

  const fillRate = cnt(totalOrders) > 0 ? Math.round((cnt(filledOrders) / cnt(totalOrders)) * 100) : 0;

  // Action queue
  const [partialOrders, pendingSetts, pendingSignatures] = await Promise.all([
    db.prepare("SELECT id, market, filled_volume, volume, created_at FROM orders WHERE participant_id = ? AND status = 'partial' LIMIT 10").bind(pid).all(),
    db.prepare("SELECT t.id, t.created_at FROM trades t WHERE (t.buyer_id = ? OR t.seller_id = ?) AND t.status = 'pending' AND t.created_at <= datetime('now','-1 day') LIMIT 10").bind(pid, pid).all(),
    db.prepare("SELECT cd.id, cd.title, cd.created_at FROM contract_documents cd JOIN document_signatories cs ON cd.id = cs.document_id WHERE cs.participant_id = ? AND cs.signed_at IS NULL LIMIT 5").bind(pid).all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...partialOrders.results.map((o) => ({
      id: `partial-${o.id}`, urgency: 'medium' as const, title: `Order partially filled: ${o.market}`,
      description: `${o.filled_volume}/${o.volume} filled`, source_module: 'trading',
      entity_type: 'order', entity_id: String(o.id), action_type: 'review',
      action_url: `/trading?order=${o.id}`, deadline: null, created_at: String(o.created_at),
    })),
    ...pendingSetts.results.map((t) => ({
      id: `settle-${t.id}`, urgency: 'high' as const, title: `Settlement pending: ${t.id}`,
      description: 'Pending for >24h', source_module: 'settlement',
      entity_type: 'trade', entity_id: String(t.id), action_type: 'review',
      action_url: `/settlement?trade=${t.id}`, deadline: null, created_at: String(t.created_at),
    })),
    ...pendingSignatures.results.map((cd) => ({
      id: `sign-${cd.id}`, urgency: 'medium' as const, title: `Sign contract: ${cd.title}`,
      description: 'Pending your signature', source_module: 'contracts',
      entity_type: 'contract', entity_id: String(cd.id), action_type: 'sign',
      action_url: `/contracts/${cd.id}`, deadline: null, created_at: String(cd.created_at),
    })),
  ]);

  // Module cards
  const recentTrades = await db.prepare("SELECT id, market, price_cents, volume, CASE WHEN buyer_id = ? THEN 'buy' ELSE 'sell' END as side, created_at FROM trades WHERE (buyer_id = ? OR seller_id = ?) ORDER BY created_at DESC LIMIT 10").bind(pid, pid, pid).all();

  const netBalance = sum(odseGenTotal) - sum(odseConsTotal);

  const module_cards: ModuleCard[] = [
    { module: 'positions', title: 'Positions', summary: { open_orders: cnt(openOrders) }, chart_type: 'bar', action_count: 0, link: '/trading' },
    { module: 'orderbook', title: 'Order Book', summary: {}, chart_type: 'bar', action_count: partialOrders.results.length, link: '/trading' },
    { module: 'odse_energy_balance', title: 'Energy Balance (ODSE)', summary: { generation_mwh: Math.round(sum(odseGenTotal) / 1000), consumption_mwh: Math.round(sum(odseConsTotal) / 1000), net_mwh: Math.round(netBalance / 1000), daily_balance: odseDailyBalance.results, hourly_profile: odseHourlyBalance.results }, chart_type: 'bar', chart_data: odseDailyBalance.results as unknown[], action_count: 0, link: '/metering-analytics' },
    { module: 'risk', title: 'Risk', summary: {}, chart_type: 'gauge', action_count: 0, link: '/risk' },
    { module: 'carbon', title: 'Carbon Portfolio', summary: { position_tco2e: sum(carbonPosition) }, chart_type: 'pie', action_count: 0, link: '/carbon' },
    { module: 'recent_trades', title: 'Recent Trades', summary: { trades: recentTrades.results }, chart_type: 'sparkline', action_count: 0, link: '/trade-journal' },
  ];

  return {
    kpis: [
      { id: 'portfolio', label: 'Portfolio Value', value: 'R0', value_raw: 0, unit: 'ZAR', change: 0, trend: 'flat', positive: true, period: 'current', source_endpoint: '/trading' },
      { id: 'open_orders', label: 'Open Orders', value: String(cnt(openOrders)), value_raw: cnt(openOrders), unit: 'count', change: 0, trend: 'up', positive: true, period: 'current', source_endpoint: '/trading' },
      { id: 'fill_rate', label: 'Fill Rate (30d)', value: `${fillRate}%`, value_raw: fillRate, unit: '%', change: 0, trend: 'up', positive: fillRate > 50, period: '30d', source_endpoint: '/trading' },
      { id: 'energy_balance', label: 'Net Energy (30d)', value: `${Math.round(netBalance / 1000)} MWh`, value_raw: netBalance, unit: 'MWh', change: 0, trend: netBalance > 0 ? 'up' : 'down', positive: netBalance >= 0, period: '30d', source_endpoint: '/odse/analytics/summary' },
      { id: 'carbon', label: 'Carbon Position', value: `${sum(carbonPosition).toLocaleString()} tCO₂e`, value_raw: sum(carbonPosition), unit: 'tCO₂e', change: 0, trend: 'up', positive: true, period: 'current', source_endpoint: '/carbon' },
      { id: 'trades_30d', label: 'Trades (30d)', value: String(cnt(tradeCount)), value_raw: cnt(tradeCount), unit: 'count', change: 0, trend: 'up', positive: true, period: '30d', source_endpoint: '/trading' },
      { id: 'settlements', label: 'Pending Settlements', value: String(cnt(settlements)), value_raw: cnt(settlements), unit: 'count', change: 0, trend: 'down', positive: cnt(settlements) === 0, period: 'current', source_endpoint: '/settlement' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 4: CARBON FUND MANAGER
// ══════════════════════════════════════════════════════════════
async function buildCarbonFundCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [creditsAvailable, activeOptions, retiredYTD, odseAvoidedEmissions, odseCarbonTrend, odseCarbonByAsset] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM carbon_credits WHERE owner_id = ? AND status = 'active'").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM carbon_options WHERE (writer_id = ? OR holder_id = ?) AND status = 'active'").bind(pid, pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM carbon_credits WHERE owner_id = ? AND status = 'retired' AND retirement_date >= date('now','start of year')").bind(pid).first<{ s: number }>(),
    // ODSE: Avoided emissions from renewable generation — scoped to participant's assets
    db.prepare("SELECT COALESCE(SUM(t.kwh * (1000 - COALESCE(t.carbon_intensity_gco2_per_kwh, 0)) / 1000000),0) as avoided_tco2e FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'generation' AND t.timestamp >= date('now','start of year')").bind(pid).first<{ avoided_tco2e: number }>(),
    // ODSE: Daily carbon intensity trend — scoped to participant's assets
    db.prepare("SELECT date(t.timestamp) as date, ROUND(AVG(t.carbon_intensity_gco2_per_kwh),1) as avg_ci, ROUND(SUM(t.kwh * COALESCE(t.carbon_intensity_gco2_per_kwh,0) / 1000000),3) as emissions_tco2e FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.carbon_intensity_gco2_per_kwh IS NOT NULL AND t.timestamp >= date('now','-30 days') GROUP BY date(t.timestamp) ORDER BY date DESC LIMIT 30").bind(pid).all(),
    // ODSE: Carbon by asset type — scoped to participant's assets
    db.prepare("SELECT a.asset_type, ROUND(SUM(t.kwh),0) as total_kwh, ROUND(AVG(t.carbon_intensity_gco2_per_kwh),1) as avg_ci FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.carbon_intensity_gco2_per_kwh IS NOT NULL AND t.timestamp >= date('now','-30 days') GROUP BY a.asset_type").bind(pid).all(),
  ]);

  // Action queue
  const [expiringOptions, pendingTransfers] = await Promise.all([
    db.prepare("SELECT id, type as option_type, underlying_credit_id as underlying, expiry as expiry_date, created_at FROM carbon_options WHERE (writer_id = ? OR holder_id = ?) AND status = 'active' AND expiry <= date('now','+30 days') LIMIT 10").bind(pid, pid).all(),
    db.prepare("SELECT cd.id, cd.title, cd.created_at FROM contract_documents cd JOIN document_signatories cs ON cd.id = cs.document_id WHERE cs.participant_id = ? AND cs.signed_at IS NULL LIMIT 5").bind(pid).all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...expiringOptions.results.map((o) => ({
      id: `option-${o.id}`, urgency: 'high' as const, title: `Option expiring: ${o.option_type} ${o.underlying}`,
      description: `Expires ${o.expiry_date}`, source_module: 'carbon',
      entity_type: 'carbon_option', entity_id: String(o.id), action_type: 'review',
      action_url: `/carbon?option=${o.id}`, deadline: String(o.expiry_date), created_at: String(o.created_at),
    })),
    ...pendingTransfers.results.map((cd) => ({
      id: `sign-${cd.id}`, urgency: 'medium' as const, title: `Contract requires review: ${cd.title}`,
      description: 'Pending signatory', source_module: 'contracts',
      entity_type: 'contract', entity_id: String(cd.id), action_type: 'sign',
      action_url: `/contracts/${cd.id}`, deadline: null, created_at: String(cd.created_at),
    })),
  ]);

  const creditsByRegistry = await db.prepare("SELECT registry, COUNT(*) as c, COALESCE(SUM(quantity),0) as s FROM carbon_credits WHERE owner_id = ? AND status = 'active' GROUP BY registry").bind(pid).all();

  const avoidedTCO2e = Math.round(((odseAvoidedEmissions as Record<string, number> | null)?.avoided_tco2e ?? 0) * 100) / 100;

  const module_cards: ModuleCard[] = [
    { module: 'inventory', title: 'Credit Inventory', summary: { byRegistry: creditsByRegistry.results, total: sum(creditsAvailable) }, chart_type: 'pie', action_count: 0, link: '/carbon' },
    { module: 'options', title: 'Options Book', summary: { active: cnt(activeOptions) }, chart_type: 'bar', action_count: expiringOptions.results.length, link: '/carbon' },
    { module: 'odse_carbon', title: 'Carbon Analytics (ODSE)', summary: { avoided_emissions_tco2e: avoidedTCO2e, carbon_intensity_trend: odseCarbonTrend.results, by_asset_type: odseCarbonByAsset.results }, chart_type: 'bar', chart_data: odseCarbonTrend.results as unknown[], action_count: 0, link: '/metering-analytics' },
    { module: 'performance', title: 'Fund Performance', summary: {}, chart_type: 'sparkline', action_count: 0, link: '/portfolio' },
    { module: 'registry', title: 'Registry Status', summary: {}, action_count: 0, link: '/carbon' },
    { module: 'market', title: 'Market Prices', summary: {}, chart_type: 'sparkline', action_count: 0, link: '/markets' },
  ];

  return {
    kpis: [
      { id: 'credits', label: 'Credits Available', value: `${sum(creditsAvailable).toLocaleString()} tCO₂e`, value_raw: sum(creditsAvailable), unit: 'tCO₂e', change: 0, trend: 'up', positive: true, period: 'current', source_endpoint: '/carbon' },
      { id: 'avoided_emissions', label: 'Avoided Emissions YTD', value: `${avoidedTCO2e.toLocaleString()} tCO₂e`, value_raw: avoidedTCO2e, unit: 'tCO₂e', change: 0, trend: 'up', positive: true, period: 'ytd', source_endpoint: '/odse/analytics/carbon' },
      { id: 'options', label: 'Active Options', value: String(cnt(activeOptions)), value_raw: cnt(activeOptions), unit: 'count', change: 0, trend: 'flat', positive: true, period: 'current', source_endpoint: '/carbon' },
      { id: 'retired', label: 'Credits Retired YTD', value: `${sum(retiredYTD).toLocaleString()} tCO₂e`, value_raw: sum(retiredYTD), unit: 'tCO₂e', change: 0, trend: 'up', positive: true, period: 'ytd', source_endpoint: '/carbon' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 5: OFFTAKER / ENERGY CONSUMER
// ══════════════════════════════════════════════════════════════
async function buildOfftakerCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [consumptionMTD, outstandingInvoices, activePPAs, carbonOffset, odseConsMTD, odseTariffSplit, odseHourlyDemand, odseDailyConsumption, odseCarbonIntensity] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(value_kwh),0) as s FROM meter_readings mr JOIN projects p ON mr.project_id = p.id WHERE p.offtaker_id = ? AND mr.timestamp >= date('now','start of month')").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM invoices WHERE to_participant_id = ? AND status = 'outstanding'").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM contract_documents WHERE counterparty_id = ? AND phase = 'active'").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(quantity),0) as s FROM carbon_credits WHERE retirement_beneficiary = ? AND status = 'retired' AND retirement_date >= date('now','start of year')").bind(pid).first<{ s: number }>(),
    // ODSE: Consumption MTD
    db.prepare("SELECT COALESCE(SUM(t.kwh),0) as s FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.timestamp >= date('now','start of month')").bind(pid).first<{ s: number }>(),
    // ODSE: Peak vs off-peak tariff split
    db.prepare("SELECT t.tariff_period, ROUND(SUM(t.kwh),2) as kwh, ROUND(SUM(t.energy_charge_component),2) as cost FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.timestamp >= date('now','-30 days') AND t.tariff_period IS NOT NULL GROUP BY t.tariff_period").bind(pid).all(),
    // ODSE: Hourly demand profile
    db.prepare("SELECT CAST(strftime('%H', t.timestamp) AS INTEGER) as hour, ROUND(AVG(t.kwh),2) as avg_kwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.timestamp >= date('now','-30 days') GROUP BY hour ORDER BY hour").bind(pid).all(),
    // ODSE: Daily consumption trend
    db.prepare("SELECT date(t.timestamp) as date, ROUND(SUM(t.kwh)/1000,2) as mwh FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.timestamp >= date('now','-30 days') GROUP BY date(t.timestamp) ORDER BY date DESC LIMIT 30").bind(pid).all(),
    // ODSE: Average carbon intensity
    db.prepare("SELECT ROUND(AVG(t.carbon_intensity_gco2_per_kwh),1) as avg_ci FROM odse_timeseries t JOIN odse_assets a ON t.asset_id = a.asset_id WHERE a.participant_id = ? AND t.direction = 'consumption' AND t.carbon_intensity_gco2_per_kwh IS NOT NULL AND t.timestamp >= date('now','-30 days')").bind(pid).first<{ avg_ci: number }>(),
  ]);

  // Action queue
  const [dueInvoices, pendingSignatures] = await Promise.all([
    db.prepare("SELECT id, invoice_number, total_cents, due_date, created_at FROM invoices WHERE to_participant_id = ? AND status = 'outstanding' AND due_date <= date('now','+7 days') ORDER BY due_date ASC LIMIT 10").bind(pid).all(),
    db.prepare("SELECT cd.id, cd.title, cd.created_at FROM contract_documents cd JOIN document_signatories cs ON cd.id = cs.document_id WHERE cs.participant_id = ? AND cs.signed_at IS NULL LIMIT 5").bind(pid).all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...dueInvoices.results.map((inv) => ({
      id: `invoice-${inv.id}`, urgency: 'high' as const, title: `Invoice due: ${inv.invoice_number}`,
      description: `R${((inv.total_cents as number) / 100).toFixed(0)} — due ${inv.due_date}`, source_module: 'invoices',
      entity_type: 'invoice', entity_id: String(inv.id), action_type: 'pay',
      action_url: `/invoices?pay=${inv.id}`, deadline: String(inv.due_date), created_at: String(inv.created_at),
    })),
    ...pendingSignatures.results.map((cd) => ({
      id: `sign-${cd.id}`, urgency: 'medium' as const, title: `Sign contract: ${cd.title}`,
      description: 'PPA amendment pending signature', source_module: 'contracts',
      entity_type: 'contract', entity_id: String(cd.id), action_type: 'sign',
      action_url: `/contracts/${cd.id}`, deadline: null, created_at: String(cd.created_at),
    })),
  ]);

  const avgCI = (odseCarbonIntensity as Record<string, number> | null)?.avg_ci ?? 0;

  const module_cards: ModuleCard[] = [
    { module: 'consumption', title: 'Consumption', summary: { mtd_mwh: Math.round(sum(consumptionMTD) / 1000) }, chart_type: 'sparkline', action_count: 0, link: '/demand' },
    { module: 'odse_consumption', title: 'ODSE Consumption Analytics', summary: { mtd_kwh: sum(odseConsMTD), mtd_mwh: Math.round(sum(odseConsMTD) / 1000), tariff_breakdown: odseTariffSplit.results, hourly_demand: odseHourlyDemand.results, daily_trend: odseDailyConsumption.results, avg_carbon_intensity: avgCI }, chart_type: 'bar', chart_data: odseDailyConsumption.results as unknown[], action_count: 0, link: '/metering-analytics' },
    { module: 'cost', title: 'Cost Analysis', summary: {}, chart_type: 'bar', action_count: 0, link: '/offtaker-cost' },
    { module: 'carbon', title: 'Carbon Footprint', summary: { offset_tco2e: sum(carbonOffset), avg_carbon_intensity_gco2: avgCI }, chart_type: 'gauge', action_count: 0, link: '/carbon' },
    { module: 'invoices', title: 'Invoice Summary', summary: { outstanding: cnt(outstandingInvoices) }, action_count: cnt(outstandingInvoices), link: '/invoices' },
  ];

  return {
    kpis: [
      { id: 'consumption', label: 'Consumption MTD', value: `${Math.round(sum(consumptionMTD) / 1000)} MWh`, value_raw: sum(consumptionMTD), unit: 'MWh', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/metering' },
      { id: 'odse_consumption', label: 'ODSE Consumption MTD', value: `${Math.round(sum(odseConsMTD) / 1000)} MWh`, value_raw: sum(odseConsMTD), unit: 'MWh', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/odse/analytics/summary' },
      { id: 'carbon_intensity', label: 'Avg Carbon Intensity', value: `${avgCI} gCO₂/kWh`, value_raw: avgCI, unit: 'gCO₂/kWh', change: 0, trend: 'down', positive: avgCI < 500, period: '30d', source_endpoint: '/odse/analytics/carbon' },
      { id: 'invoices', label: 'Outstanding Invoices', value: String(cnt(outstandingInvoices)), value_raw: cnt(outstandingInvoices), unit: 'count', change: 0, trend: 'flat', positive: cnt(outstandingInvoices) === 0, period: 'current', source_endpoint: '/invoices' },
      { id: 'ppas', label: 'Active PPAs', value: String(cnt(activePPAs)), value_raw: cnt(activePPAs), unit: 'count', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/contracts' },
      { id: 'carbon', label: 'Carbon Offset YTD', value: `${sum(carbonOffset).toLocaleString()} tCO₂e`, value_raw: sum(carbonOffset), unit: 'tCO₂e', change: 0, trend: 'up', positive: true, period: 'ytd', source_endpoint: '/carbon' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 6: LENDER / INVESTOR
// ══════════════════════════════════════════════════════════════
async function buildLenderCockpit(pid: string, db: DB): Promise<CockpitData> {
  const [facilities, drawn, approvalsPending, cpRate] = await Promise.all([
    db.prepare("SELECT COALESCE(SUM(CAST(total_cost_cents * COALESCE(debt_ratio, 0) AS INTEGER)),0) as s FROM projects WHERE lender_id = ?").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COALESCE(SUM(d.amount_cents),0) as s FROM disbursements d JOIN projects p ON d.project_id = p.id WHERE p.lender_id = ? AND d.status = 'approved'").bind(pid).first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM disbursements d JOIN projects p ON d.project_id = p.id WHERE p.lender_id = ? AND d.status = 'ie_certified'").bind(pid).first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(CASE WHEN cp.status IN ('satisfied','waived') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*),0), 0) as s FROM conditions_precedent cp JOIN projects p ON cp.project_id = p.id WHERE p.lender_id = ?").bind(pid).first<{ s: number }>(),
  ]);

  const undrawn = sum(facilities) - sum(drawn);

  // Action queue
  const [pendingDisb, approachingCPs, pendingSignatures] = await Promise.all([
    db.prepare("SELECT d.id, d.amount_cents, p.name as project_name, d.created_at FROM disbursements d JOIN projects p ON d.project_id = p.id WHERE p.lender_id = ? AND d.status = 'ie_certified' LIMIT 10").bind(pid).all(),
    db.prepare("SELECT cp.id, cp.description, cp.due_date as target_date, p.name as project_name, cp.created_at FROM conditions_precedent cp JOIN projects p ON cp.project_id = p.id WHERE p.lender_id = ? AND cp.status = 'outstanding' AND cp.due_date <= date('now','+14 days') LIMIT 10").bind(pid).all(),
    db.prepare("SELECT cd.id, cd.title, cd.created_at FROM contract_documents cd JOIN document_signatories cs ON cd.id = cs.document_id WHERE cs.participant_id = ? AND cs.signed_at IS NULL LIMIT 5").bind(pid).all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...pendingDisb.results.map((d) => ({
      id: `disb-${d.id}`, urgency: 'high' as const, title: `Approve disbursement: ${formatZAR(d.amount_cents as number)}`,
      description: `Project: ${d.project_name} — IE certified`, source_module: 'ipp',
      entity_type: 'disbursement', entity_id: String(d.id), action_type: 'approve',
      action_url: `/lender?disbursement=${d.id}`, deadline: null, created_at: String(d.created_at),
    })),
    ...approachingCPs.results.map((cp) => ({
      id: `cp-${cp.id}`, urgency: 'medium' as const, title: `CP deadline: ${cp.description}`,
      description: `${cp.project_name} — due ${cp.target_date}`, source_module: 'ipp',
      entity_type: 'condition_precedent', entity_id: String(cp.id), action_type: 'review',
      action_url: `/ipp?cp=${cp.id}`, deadline: String(cp.target_date), created_at: String(cp.created_at),
    })),
    ...pendingSignatures.results.map((cd) => ({
      id: `sign-${cd.id}`, urgency: 'medium' as const, title: `Facility agreement review: ${cd.title}`,
      description: 'Pending signatory', source_module: 'contracts',
      entity_type: 'contract', entity_id: String(cd.id), action_type: 'sign',
      action_url: `/contracts/${cd.id}`, deadline: null, created_at: String(cd.created_at),
    })),
  ]);

  const projectsByPhase = await db.prepare("SELECT phase, COUNT(*) as c, COALESCE(SUM(CAST(total_cost_cents * COALESCE(debt_ratio, 0) AS INTEGER)),0) as s FROM projects WHERE lender_id = ? GROUP BY phase").bind(pid).all();

  const module_cards: ModuleCard[] = [
    { module: 'portfolio', title: 'Portfolio Overview', summary: { byPhase: projectsByPhase.results, total: sum(facilities), drawn: sum(drawn), undrawn }, chart_type: 'bar', action_count: 0, link: '/lender' },
    { module: 'cp_status', title: 'CP Status Matrix', summary: { completion_rate: Math.round(sum(cpRate)) }, chart_type: 'gauge', action_count: approachingCPs.results.length, link: '/ipp' },
    { module: 'disbursements', title: 'Disbursement Pipeline', summary: { pending: cnt(approvalsPending) }, action_count: cnt(approvalsPending), link: '/lender' },
    { module: 'covenants', title: 'Covenant Tracking', summary: {}, chart_type: 'gauge', action_count: 0, link: '/lender' },
  ];

  return {
    kpis: [
      { id: 'facilities', label: 'Total Facilities', value: formatZAR(sum(facilities)), value_raw: sum(facilities), unit: 'ZAR', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/lender' },
      { id: 'drawn', label: 'Drawn Amount', value: formatZAR(sum(drawn)), value_raw: sum(drawn), unit: 'ZAR', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/lender' },
      { id: 'undrawn', label: 'Undrawn', value: formatZAR(undrawn), value_raw: undrawn, unit: 'ZAR', change: 0, trend: 'flat', positive: true, period: 'all_time', source_endpoint: '/lender' },
      { id: 'cp_rate', label: 'CP Completion', value: `${Math.round(sum(cpRate))}%`, value_raw: sum(cpRate), unit: '%', change: 0, trend: 'up', positive: sum(cpRate) > 80, period: 'current', source_endpoint: '/ipp' },
      { id: 'approvals', label: 'Approvals Pending', value: String(cnt(approvalsPending)), value_raw: cnt(approvalsPending), unit: 'count', change: 0, trend: 'flat', positive: cnt(approvalsPending) === 0, period: 'current', source_endpoint: '/lender' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 7: GRID OPERATOR
// ══════════════════════════════════════════════════════════════
async function buildGridCockpit(_pid: string, db: DB): Promise<CockpitData> {
  const [activeConnections, wheeledMTD, pendingMeter] = await Promise.all([
    db.prepare("SELECT COUNT(DISTINCT project_id) as c FROM meter_readings WHERE source IN ('eskom_ami','grid_import','grid_export')").first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(value_kwh),0) as s FROM meter_readings WHERE meter_type = 'grid_export' AND timestamp >= date('now','start of month')").first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM meter_readings WHERE quality = 'estimated'").first<{ c: number }>(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...(cnt(pendingMeter) > 0 ? [{
      id: 'validate-meters', urgency: 'medium' as const, title: `${cnt(pendingMeter)} meter readings need validation`,
      description: 'Estimated readings pending review', source_module: 'metering',
      entity_type: 'meter_reading', entity_id: 'batch', action_type: 'review',
      action_url: '/metering?filter=estimated', deadline: null, created_at: new Date().toISOString(),
    }] : []),
  ]);

  const module_cards: ModuleCard[] = [
    { module: 'grid', title: 'Grid Status', summary: { connections: cnt(activeConnections) }, chart_type: 'bar', action_count: 0, link: '/metering' },
    { module: 'metering', title: 'Metering', summary: { pending_validation: cnt(pendingMeter) }, chart_type: 'sparkline', action_count: cnt(pendingMeter), link: '/metering' },
    { module: 'imbalance', title: 'Imbalance', summary: {}, action_count: 0, link: '/settlement' },
  ];

  return {
    kpis: [
      { id: 'connections', label: 'Active Connections', value: String(cnt(activeConnections)), value_raw: cnt(activeConnections), unit: 'count', change: 0, trend: 'up', positive: true, period: 'current', source_endpoint: '/metering' },
      { id: 'wheeled', label: 'Wheeled MTD', value: `${Math.round(sum(wheeledMTD) / 1000)} MWh`, value_raw: sum(wheeledMTD), unit: 'MWh', change: 0, trend: 'up', positive: true, period: 'mtd', source_endpoint: '/metering' },
      { id: 'pending_validation', label: 'Pending Validation', value: String(cnt(pendingMeter)), value_raw: cnt(pendingMeter), unit: 'count', change: 0, trend: 'flat', positive: cnt(pendingMeter) === 0, period: 'current', source_endpoint: '/metering' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

// ══════════════════════════════════════════════════════════════
// COCKPIT 8: REGULATOR
// ══════════════════════════════════════════════════════════════
async function buildRegulatorCockpit(_pid: string, db: DB): Promise<CockpitData> {
  const [registeredParticipants, tradesToday, complianceRate, amlFlags] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM participants WHERE kyc_status = 'verified'").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM trades WHERE created_at >= date('now')").first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*),0), 100) as s FROM statutory_checks").first<{ s: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM audit_log WHERE action LIKE '%aml%' OR action LIKE '%suspicious%'").first<{ c: number }>(),
  ]);

  // Action queue
  const [failedChecks, expiredLicences] = await Promise.all([
    db.prepare("SELECT sc.id, sc.regulation, sc.created_at, p.company_name FROM statutory_checks sc JOIN participants p ON sc.entity_id = p.id WHERE sc.status = 'fail' AND sc.entity_type = 'participant' LIMIT 10").all(),
    db.prepare("SELECT l.id, l.type as licence_type, l.expiry_date, l.created_at, p.company_name FROM licences l JOIN participants p ON l.participant_id = p.id WHERE l.expiry_date < date('now') AND l.status = 'active' LIMIT 10").all(),
  ]);

  const action_queue: ActionItem[] = sortActions([
    ...failedChecks.results.map((sc) => ({
      id: `aml-${sc.id}`, urgency: 'critical' as const, title: `Compliance failure: ${sc.regulation}`,
      description: `${sc.company_name}`, source_module: 'compliance',
      entity_type: 'statutory_check', entity_id: String(sc.id), action_type: 'review',
      action_url: `/compliance?check=${sc.id}`, deadline: null, created_at: String(sc.created_at),
    })),
    ...expiredLicences.results.map((l) => ({
      id: `expired-${l.id}`, urgency: 'high' as const, title: `NERSA licence expired: ${l.licence_type}`,
      description: `${l.company_name} — expired ${l.expiry_date}`, source_module: 'compliance',
      entity_type: 'licence', entity_id: String(l.id), action_type: 'review',
      action_url: `/compliance?licence=${l.id}`, deadline: null, created_at: String(l.created_at),
    })),
  ]);

  const complianceByStat = await db.prepare("SELECT status, COUNT(*) as c FROM statutory_checks GROUP BY status").all();

  const module_cards: ModuleCard[] = [
    { module: 'market', title: 'Market Overview', summary: { participants: cnt(registeredParticipants), trades_today: cnt(tradesToday) }, chart_type: 'bar', action_count: 0, link: '/surveillance' },
    { module: 'compliance', title: 'Compliance Dashboard', summary: { byStatus: complianceByStat.results, rate: Math.round(sum(complianceRate)) }, chart_type: 'gauge', action_count: failedChecks.results.length, link: '/compliance' },
    { module: 'audit', title: 'Audit Log', summary: {}, action_count: 0, link: '/audit-trail' },
  ];

  return {
    kpis: [
      { id: 'participants', label: 'Registered Participants', value: String(cnt(registeredParticipants)), value_raw: cnt(registeredParticipants), unit: 'count', change: 0, trend: 'up', positive: true, period: 'all_time', source_endpoint: '/participants' },
      { id: 'trades', label: 'Trades Today', value: String(cnt(tradesToday)), value_raw: cnt(tradesToday), unit: 'count', change: 0, trend: 'up', positive: true, period: 'today', source_endpoint: '/trading' },
      { id: 'compliance', label: 'Compliance Rate', value: `${Math.round(sum(complianceRate))}%`, value_raw: sum(complianceRate), unit: '%', change: 0, trend: 'up', positive: sum(complianceRate) > 95, period: 'all_time', source_endpoint: '/compliance' },
      { id: 'aml', label: 'AML Flags', value: String(cnt(amlFlags)), value_raw: cnt(amlFlags), unit: 'count', change: 0, trend: 'down', positive: cnt(amlFlags) === 0, period: 'all_time', source_endpoint: '/surveillance' },
    ],
    action_queue,
    module_cards,
    alerts: [],
    recent_activity: [],
  };
}

export default cockpit;
