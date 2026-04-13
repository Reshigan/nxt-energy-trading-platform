import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../lib/store';
import { cockpitAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import KPIRow, { KPI } from '../components/cockpit/KPIRow';
import ActionQueue, { ActionItem } from '../components/cockpit/ActionQueue';
import ModuleCard, { ModuleCardData } from '../components/cockpit/ModuleCard';
import AlertsPanel, { Alert } from '../components/cockpit/AlertsPanel';
import ActivityFeed, { ActivityItem } from '../components/cockpit/ActivityFeed';
import CockpitSkeleton from '../components/cockpit/CockpitSkeleton';
import { FiRefreshCw } from '../lib/fi-icons-shim';

// Role display names and accent colors
const ROLE_META: Record<string, { label: string; accent: string }> = {
  admin: { label: 'Platform Admin', accent: '#d4e157' },
  generator: { label: 'IPP Developer', accent: '#66bb6a' },
  ipp: { label: 'IPP Developer', accent: '#66bb6a' },
  ipp_developer: { label: 'IPP Developer', accent: '#66bb6a' },
  trader: { label: 'Energy Trader', accent: '#42a5f5' },
  carbon_fund: { label: 'Carbon Fund Manager', accent: '#26a69a' },
  offtaker: { label: 'Offtaker', accent: '#ffa726' },
  lender: { label: 'Lender / Investor', accent: '#ab47bc' },
  grid: { label: 'Grid Operator', accent: '#ef5350' },
  regulator: { label: 'Regulator', accent: '#78909c' },
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
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {meta.label} Cockpit
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {data.participant.name || 'Ionvex'}
            {' — '}
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
        </button>
      </div>

      {/* ── Alerts (top, if any) ─────────────────────────── */}
      <AlertsPanel alerts={data.alerts} />

      {/* ── KPI Row ──────────────────────────────────────── */}
      <KPIRow kpis={data.kpis} accentHex={meta.accent} />

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
