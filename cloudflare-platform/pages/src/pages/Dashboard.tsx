import React, { useMemo, useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiArrowRight, FiMessageSquare, FiLoader } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import SemiGauge from '../components/SemiGauge';
import PortfolioPills from '../components/PortfolioPills';
import TransfersList from '../components/TransfersList';
import SpendingOverview from '../components/SpendingOverview';
import QuickActions from '../components/QuickActions';
import { useAuthStore } from '../lib/store';
import { getRoleConfig, type PlatformRole } from '../config/roles';
import { useTheme } from '../contexts/ThemeContext';
import { dashboardAPI, tradingAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

interface DashboardSummary {
  participants: number;
  projects: number;
  pending_trades: number;
  active_contracts: number;
  active_credits: number;
  open_disputes: number;
  total_traded_cents: number;
  my_open_orders: number;
  unread_notifications: number;
  role: string;
  participant_id: string;
}

const aiInsights = [
  { text: 'Solar spot prices expected to rise 5% this week due to reduced cloud cover forecast.', type: 'bullish' as const },
  { text: 'Consider hedging gas exposure \u2014 supply disruption risk elevated in Mpumalanga region.', type: 'warning' as const },
  { text: 'Carbon credit demand increasing ahead of Q2 compliance deadline. Good entry point.', type: 'bullish' as const },
];

export default function Dashboard() {
  const toast = useToast();
  const { activeRole } = useAuthStore();
  const { isDark } = useTheme();
  const role = (activeRole || 'trader') as PlatformRole;
  const config = getRoleConfig(role);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [priceData, setPriceData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [sumRes, priceRes] = await Promise.allSettled([
          dashboardAPI.summary(),
          tradingAPI.getPrices('solar', '1h'),
        ]);
        if (!cancelled) {
          if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.data);
          if (priceRes.status === 'fulfilled' && Array.isArray(priceRes.value.data?.data)) {
            setPriceData(priceRes.value.data.data);
          }
          if (sumRes.status === 'rejected' && priceRes.status === 'rejected') {
            toast.error('Failed to load dashboard data');
          }
        }
      } catch {
        toast.error('Failed to load dashboard data');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  // Derive gauge value from real data
  const gaugeValue = useMemo(() => {
    if (!summary) return 78;
    if (role === 'admin') return Math.min(99, 80 + summary.participants);
    if (role === 'trader') return Math.min(99, 60 + Math.min(summary.my_open_orders * 5, 30));
    return 78;
  }, [summary, role]);

  const gaugeConfigs: Record<string, { label: string; sublabel: string }> = {
    generator: { label: 'Plant Availability', sublabel: 'Across all generation assets' },
    trader: { label: 'Portfolio Health', sublabel: 'Risk-adjusted performance score' },
    offtaker: { label: 'Supply Reliability', sublabel: 'Weighted contract fulfilment' },
    ipp_developer: { label: 'Project Progress', sublabel: 'Weighted milestone completion' },
    regulator: { label: 'Compliance Rate', sublabel: 'Across all participants' },
    admin: { label: 'Platform Uptime', sublabel: 'Last 30 days SLA' },
  };
  const gauge = gaugeConfigs[role] || gaugeConfigs.trader;

  // Build KPI overrides from real data
  const kpis = useMemo(() => {
    if (!summary) return config.kpis;
    return config.kpis.map((kpi, i) => {
      if (i === 0 && summary.active_contracts > 0) return { ...kpi, value: String(summary.active_contracts) };
      if (i === 1 && summary.pending_trades > 0) return { ...kpi, value: String(summary.pending_trades) };
      if (i === 2 && summary.active_credits > 0) return { ...kpi, value: String(summary.active_credits) };
      if (i === 3 && summary.projects > 0) return { ...kpi, value: String(summary.projects) };
      return kpi;
    });
  }, [summary, config.kpis]);

  // Default price data fallback
  const chartData = priceData.length > 0 ? priceData : [
    { time: '06:00', solar: 680, wind: 520, gas: 410 },
    { time: '08:00', solar: 740, wind: 545, gas: 405 },
    { time: '10:00', solar: 820, wind: 560, gas: 415 },
    { time: '12:00', solar: 870, wind: 610, gas: 420 },
    { time: '14:00', solar: 850, wind: 630, gas: 412 },
    { time: '16:00', solar: 790, wind: 620, gas: 418 },
    { time: '18:00', solar: 650, wind: 580, gas: 425 },
    { time: '20:00', solar: 520, wind: 555, gas: 430 },
  ];

  const animKey = useMemo(() => `${role}-${Date.now()}`, [role]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      key={animKey} className="space-y-6">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <FiLoader className="w-4 h-4 animate-spin" /> Loading dashboard data...
        </div>
      )}

      {!loading && !summary && (
        <div className={`cp-card !p-12 text-center ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`}>
          <FiTrendingUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No dashboard data yet</h3>
          <p className="text-sm text-slate-400 mt-1">Get started by creating trades, contracts, or carbon credits.</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
            <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
              Here's your <span className="font-semibold capitalize" style={{ color: config.accentHex }}>{config.label}</span> overview for today
            </p>
          </div>

          <div className={`cp-card !p-6 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <SemiGauge
                value={gaugeValue}
                label={gauge.label}
                sublabel={gauge.sublabel}
                accentHex={config.accentHex}
              />
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {kpis.map((kpi, i) => (
                  <div key={kpi.label}
                    className={`p-3.5 rounded-2xl ${isDark ? 'bg-white/[0.03] border border-white/[0.04]' : 'bg-slate-50/80 border border-black/[0.03]'}`}
                    style={{ animation: `cardFadeUp 500ms ease ${200 + i * 100}ms both` }}>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 font-medium">{kpi.label}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.positive
                        ? <FiTrendingUp className="w-3 h-3 text-emerald-500" />
                        : <FiTrendingDown className="w-3 h-3 text-red-500" />
                      }
                      <span className={`text-xs font-semibold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>{kpi.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
            <PortfolioPills />
          </div>
        </div>

        {/* Right: Price Chart + AI Insights */}
        <div className="w-full lg:w-[420px] space-y-4">
          <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Energy Prices</h3>
              <span className="text-xs text-slate-400">Today</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                />
                <Area type="monotone" dataKey="solar" stroke="#F59E0B" strokeWidth={2} fill="url(#solarGrad)" />
                <Area type="monotone" dataKey="wind" stroke="#3B82F6" strokeWidth={2} fill="url(#windGrad)" />
                <Area type="monotone" dataKey="gas" stroke="#8B5CF6" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiMessageSquare className="w-4 h-4" style={{ color: config.accentHex }} />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Insights</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">LIVE</span>
            </div>
            <div className="space-y-2.5">
              {aiInsights.map((insight, i) => (
                <div key={i} className={`p-3 rounded-xl text-xs leading-relaxed ${
                  insight.type === 'bullish'
                    ? 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10'
                    : 'bg-amber-50 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/10'
                }`}>
                  {insight.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Quick Actions</h3>
            <span className="text-xs font-medium capitalize" style={{ color: config.accentHex }}>{config.label}</span>
          </div>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>

        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 800ms both' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recent Transfers</h3>
            <a href="/settlement" className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors">
              View all <FiArrowRight className="w-3 h-3" />
            </a>
          </div>
          <TransfersList />
        </div>

        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 900ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Portfolio Allocation</h3>
            <span className="text-xs text-slate-400">by value</span>
          </div>
          <SpendingOverview />
        </div>
      </div>
    </motion.div>
  );
}
