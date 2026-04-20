import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { cockpitAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import KPIRow, { KPI } from '../components/cockpit/KPIRow';
import ActionQueue, { ActionItem } from '../components/cockpit/ActionQueue';
import ModuleCard, { ModuleCardData } from '../components/cockpit/ModuleCard';
import AlertsPanel, { Alert } from '../components/cockpit/AlertsPanel';
import IntelligencePanel from '../components/IntelligencePanel';

import ActivityFeed, { ActivityItem } from '../components/cockpit/ActivityFeed';
import CockpitSkeleton from '../components/cockpit/CockpitSkeleton';
import { FiRefreshCw } from '../lib/fi-icons-shim';
import { useWebSocket } from '../hooks/useWebSocket';
import { useModules } from '../hooks/useModules';

// Maps quick-link hrefs to module feature-flag names (same as DashboardLayout)
const HREF_TO_MODULE: Record<string, string> = {
  '/trading': 'spot_trading',
  '/carbon': 'carbon_credits',
  '/p2p': 'p2p_trading',
  '/settlement': 'settlement',
  '/marketplace': 'marketplace',
  '/metering': 'metering',
  '/developer': 'developer_api',
  '/reports': 'report_builder',
  '/ai': 'ai_portfolio',
  '/recs': 'recs',
  '/tokens': 'tokenization',
};

// Role display names, accent colors, descriptions, and quick-access links
interface RoleMeta {
  label: string;
  accent: string;
  description: string;
  quickLinks: { name: string; href: string; description: string }[];
}

const ROLE_META: Record<string, RoleMeta> = {
  admin: {
    label: 'Platform Admin',
    accent: '#d4e157',
    description: 'Platform administration, participant management, compliance oversight and system monitoring.',
    quickLinks: [
      { name: 'Admin Panel', href: '/admin', description: 'Manage participants & KYC queue' },
      { name: 'System Health', href: '/system-health', description: 'Monitor platform status' },
      { name: 'AML Monitoring', href: '/aml-dashboard', description: 'Anti-money laundering alerts' },
      { name: 'Staff Management', href: '/staff', description: 'Manage platform staff' },
      { name: 'Audit Trail', href: '/audit-trail', description: 'View all platform activity' },
      { name: 'Platform Config', href: '/platform-config', description: 'Configure platform settings' },
    ],
  },
  generator: {
    label: 'IPP / Generator',
    accent: '#66bb6a',
    description: 'Manage renewable energy projects, track generation output, PPA contracts and grid scheduling.',
    quickLinks: [
      { name: 'IPP Projects', href: '/ipp', description: 'View & manage your projects' },
      { name: 'Metering', href: '/metering', description: 'Submit generation data' },
      { name: 'ODSE Analytics', href: '/metering-analytics', description: 'Generation analytics (ODSE)' },
      { name: 'Trading', href: '/trading', description: 'Trade energy & carbon' },
      { name: 'Contracts', href: '/contracts', description: 'View PPA contracts' },
      { name: 'Deal Pipeline', href: '/pipeline', description: 'Track project pipeline' },
    ],
  },
  ipp: {
    label: 'IPP Developer',
    accent: '#66bb6a',
    description: 'Manage renewable energy projects, track generation output, PPA contracts and grid scheduling.',
    quickLinks: [
      { name: 'IPP Projects', href: '/ipp', description: 'View & manage your projects' },
      { name: 'Metering', href: '/metering', description: 'Submit generation data' },
      { name: 'ODSE Analytics', href: '/metering-analytics', description: 'Generation analytics (ODSE)' },
      { name: 'Trading', href: '/trading', description: 'Trade energy & carbon' },
      { name: 'Contracts', href: '/contracts', description: 'View PPA contracts' },
      { name: 'Deal Pipeline', href: '/pipeline', description: 'Track project pipeline' },
    ],
  },
  ipp_developer: {
    label: 'IPP Developer',
    accent: '#66bb6a',
    description: 'Project development lifecycle — milestones, conditions precedent, disbursements and compliance.',
    quickLinks: [
      { name: 'IPP Projects', href: '/ipp', description: 'View & manage your projects' },
      { name: 'Metering', href: '/metering', description: 'Submit & review meter readings' },
      { name: 'ODSE Analytics', href: '/metering-analytics', description: 'Generation analytics (ODSE)' },
      { name: 'Contracts', href: '/contracts', description: 'View & sign contracts' },
      { name: 'Compliance', href: '/compliance', description: 'Check compliance status' },
      { name: 'Deal Pipeline', href: '/pipeline', description: 'Track project pipeline' },
    ],
  },
  trader: {
    label: 'Energy Trader',
    accent: '#42a5f5',
    description: 'Energy and carbon trading — order book, portfolio management, risk analytics and forward curves.',
    quickLinks: [
      { name: 'Trading', href: '/trading', description: 'Place & manage orders' },
      { name: 'Markets', href: '/markets', description: 'Live market data' },
      { name: 'Portfolio', href: '/portfolio', description: 'AI portfolio analytics' },
      { name: 'Risk Dashboard', href: '/risk', description: 'Risk exposure & VaR' },
      { name: 'Forward Curves', href: '/forward-curves', description: 'Price curves & forecasts' },
      { name: 'Deal Room', href: '/deal-room', description: 'Negotiate bilateral deals' },
    ],
  },
  carbon_fund: {
    label: 'Carbon Fund Manager',
    accent: '#26a69a',
    description: 'Carbon credit portfolio — options book, vintage analysis, registry reconciliation and ESG reporting.',
    quickLinks: [
      { name: 'Fund Dashboard', href: '/fund-dashboard', description: 'Portfolio performance & NAV' },
      { name: 'Carbon Credits', href: '/carbon', description: 'View & trade credits' },
      { name: 'Vintage Analysis', href: '/carbon-deep', description: 'Vintage ladder & pricing' },
      { name: 'ESG Scoring', href: '/esg', description: 'ESG impact metrics' },
      { name: 'Deal Room', href: '/deal-room', description: 'Negotiate carbon deals' },
      { name: 'Deal Pipeline', href: '/pipeline', description: 'Track fund pipeline' },
    ],
  },
  offtaker: {
    label: 'Offtaker',
    accent: '#ffa726',
    description: 'Energy procurement — RFP management, consumption tracking, sustainability metrics and cost analysis.',
    quickLinks: [
      { name: 'Procurement Hub', href: '/procurement', description: 'RFPs, bids & contracts' },
      { name: 'Demand Profile', href: '/demand', description: 'View consumption patterns' },
      { name: 'Consumption Analytics', href: '/metering-analytics', description: 'ODSE consumption analytics' },
      { name: 'Offtaker Cost', href: '/offtaker-cost', description: 'Cost breakdown & trends' },
      { name: 'Marketplace', href: '/marketplace', description: 'Browse energy offers' },
      { name: 'PPA Valuation', href: '/ppa-valuation', description: 'Evaluate PPA pricing' },
    ],
  },
  lender: {
    label: 'Lender / Investor',
    accent: '#ab47bc',
    description: 'Project finance — facility management, CP tracking, disbursements, covenants and portfolio monitoring.',
    quickLinks: [
      { name: 'Lender Dashboard', href: '/lender', description: 'Portfolio & CP matrix' },
      { name: 'IPP Projects', href: '/ipp', description: 'Monitor financed projects' },
      { name: 'Contracts', href: '/contracts', description: 'View facility agreements' },
      { name: 'Deal Pipeline', href: '/pipeline', description: 'Track deal pipeline' },
      { name: 'Network Map', href: '/network', description: 'Counterparty relationships' },
      { name: 'Settlement', href: '/settlement', description: 'Disbursement settlements' },
    ],
  },
  grid: {
    label: 'Grid Operator',
    accent: '#ef5350',
    description: 'Grid management — connections, wheeling, metering validation, imbalance settlement and capacity.',
    quickLinks: [
      { name: 'Grid Dashboard', href: '/grid-dashboard', description: 'Connections & wheeling' },
      { name: 'Metering', href: '/metering', description: 'Validate meter readings' },
      { name: 'Metering Analytics', href: '/metering-analytics', description: 'Grid analytics (ODSE)' },
      { name: 'Scheduling', href: '/scheduling', description: 'Energy scheduling' },
      { name: 'VPP', href: '/vpp', description: 'Virtual power plant dispatch' },
      { name: 'Network Map', href: '/network', description: 'Grid network topology' },
    ],
  },
  regulator: {
    label: 'Regulator',
    accent: '#78909c',
    description: 'Market oversight — surveillance, compliance monitoring, audit trail and ESG scoring review.',
    quickLinks: [
      { name: 'Surveillance', href: '/surveillance', description: 'Market surveillance' },
      { name: 'Enhanced Surveillance', href: '/surveillance-enhanced', description: 'Advanced market monitoring' },
      { name: 'Compliance', href: '/compliance', description: 'Compliance checks & KYC' },
      { name: 'Audit Trail', href: '/audit-trail', description: 'Full activity audit log' },
      { name: 'ESG Scoring', href: '/esg', description: 'Participant ESG scores' },
      { name: 'Reports', href: '/reports', description: 'Regulatory reports' },
    ],
  },
};

interface CockpitResponse {
  success: boolean;
  data: {
    role: string;
    participant: { id: string; name: string };
    kpis: KPI[];
    action_queue: ActionItem[];
    module_cards: ModuleCardData[];
    alerts: Alert[];
    recent_activity: ActivityItem[];
  };
}

export default function Cockpit() {
  const { isDark } = useTheme();
  const { activeRole, user } = useAuthStore();
  const [data, setData] = useState<CockpitResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const role = activeRole || user?.role || 'trader';
  const meta = ROLE_META[role] || ROLE_META.trader;
  const { isEnabled } = useModules();

  // Filter quick links by module feature flags — hide links whose module is disabled
  const visibleQuickLinks = meta.quickLinks.filter(
    link => !HREF_TO_MODULE[link.href] || isEnabled(HREF_TO_MODULE[link.href])
  );

  // Spec 11: Real-time cockpit updates via WebSocket + polling
  const { actionQueue: wsActionQueue, status: wsStatus } = useWebSocket('cockpit');

  const fetchCockpit = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const res = await cockpitAPI.get(role);
      const json = res.data as CockpitResponse;
      if (json.success && json.data) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        setError('Failed to load cockpit data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    fetchCockpit();
  }, [fetchCockpit, role]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchCockpit(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchCockpit]);

  // Spec 11: Merge WS action queue items into cockpit data
  useEffect(() => {
    if (wsActionQueue.length > 0 && data) {
      setData(prev => prev ? {
        ...prev,
        action_queue: wsActionQueue.map(a => ({
          id: a.id,
          urgency: (a.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
          title: a.title,
          description: a.description,
          source_module: a.entity_type || 'system',
          entity_type: a.entity_type,
          entity_id: a.entity_id,
          action_type: a.action_type || 'review',
          action_url: `/${a.entity_type}s/${a.entity_id}`,
          deadline: a.due_date || null,
          created_at: a.created_at,
        })),
      } : prev);
    }
  }, [wsActionQueue]);

  if (loading) return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <CockpitSkeleton />
    </div>
  );

  if (error) return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error}</p>
        <button onClick={() => fetchCockpit()} className="mt-3 text-sm font-semibold text-[#d4e157] hover:underline">
          Retry
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.accent }} />
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {meta.label} Cockpit
            </h1>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {data.participant.name || 'Ionvex'}
            {' — '}
            {meta.description}
          </p>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
            Last updated {lastRefresh.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => fetchCockpit(true)}
          disabled={refreshing}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
            isDark
              ? 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          } ${refreshing ? 'animate-spin-slow' : ''}`}
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
          {wsStatus === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" title="Real-time connected" />}
        </button>
      </div>

      {/* ── Intelligence Panel ────────────────────────────────── */}
      <IntelligencePanel />

      {/* ── Alerts (top, if any) ─────────────────────────── */}
      <AlertsPanel alerts={data.alerts} />

      {/* ── KPI Row ──────────────────────────────────────── */}
      <KPIRow kpis={data.kpis} accentHex={meta.accent} />

      {/* ── Role Quick-Access Links ──────────────────────── */}
      <div>
        <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {visibleQuickLinks.map((link, i) => (
            <Link
              key={link.href}
              to={link.href}
              className={`group rounded-xl p-3.5 transition-all border ${
                isDark
                  ? 'bg-[#151F32] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#1a2744]'
                  : 'bg-white border-black/[0.06] hover:border-black/[0.1] hover:shadow-sm'
              }`}
              style={{ animation: `cardFadeUp 400ms ease ${i * 50}ms both` }}
            >
              <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'} transition-colors`}>
                {link.name}
              </div>
              <div className={`text-[11px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {link.description}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Action Queue + Module Cards ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActionQueue items={data.action_queue} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.module_cards.map((card) => (
            <ModuleCard key={card.module} card={card} accentHex={meta.accent} />
          ))}
        </div>
      </div>

      {/* ── Activity Feed ────────────────────────────────── */}
      <ActivityFeed items={data.recent_activity} />

      {/* ── CSS animation ────────────────────────────────── */}
      <style>{`
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
