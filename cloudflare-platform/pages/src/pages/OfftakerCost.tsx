import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiTrendingDown, FiZap, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { pricingAPI } from '../lib/api';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { useAuthStore } from '../lib/store';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface CostBreakdown {
  blended_cost_cents: number;
  grid_cost_cents: number;
  ppa_cost_cents: number;
  savings_pct: number;
  contracts: Array<{ name: string; type: string; price_cents: number; volume_mwh: number; share_pct: number }>;
  monthly_trend: Array<{ month: string; cost: number; grid: number }>;
}

export default function OfftakerCost() {
  const { isDark } = useTheme();
  const toast = useToast();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostBreakdown | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await pricingAPI.getOfftakerCost(user?.id || 'me');
      if (res.data?.data) setData(res.data.data);
      else setData(null);
    } catch { setError('Failed to load cost data. Please try again.'); }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const cardCls = `rounded-2xl p-5 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Offtaker cost dashboard">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Cost Dashboard</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Your blended energy cost analysis</p>
        </div>
        <button onClick={loadData} disabled={loading} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50" aria-label="Refresh cost data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Blended Cost', value: loading ? null : data ? formatZAR(data.blended_cost_cents) : 'N/A', icon: FiDollarSign, sub: '/MWh' },
          { label: 'Grid Equivalent', value: loading ? null : data ? formatZAR(data.grid_cost_cents) : 'N/A', icon: FiZap, sub: '/MWh' },
          { label: 'PPA Cost', value: loading ? null : data ? formatZAR(data.ppa_cost_cents) : 'N/A', icon: FiTrendingDown, sub: '/MWh' },
          { label: 'Savings', value: loading ? null : data ? `${data.savings_pct.toFixed(1)}%` : 'N/A', icon: FiTrendingDown, sub: 'vs grid' },
        ].map((kpi, i) => (
          <div key={kpi.label} className={cardCls} style={{ animation: `cardFadeUp 500ms ease ${i * 80}ms both` }}>
            <kpi.icon className="w-5 h-5 text-blue-500 mb-3" aria-hidden="true" />
            {loading ? <Skeleton className="w-24 h-7" /> : (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</span>
                <span className="text-xs text-slate-400">{kpi.sub}</span>
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Cost Trend</h3>
          {loading ? <Skeleton className="w-full h-[260px]" /> : data?.monthly_trend && data.monthly_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthly_trend}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={60} tickFormatter={(v: number) => formatZAR(v)} />
                <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [formatZAR(v), '']} />
                <Area type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} fill="url(#costGrad)" name="Blended" />
                <Area type="monotone" dataKey="grid" stroke="#EF4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="Grid" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No trend data" description="Cost trend will appear when you have active PPAs." />}
        </div>

        {/* PPA Breakdown */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">PPA Breakdown</h3>
          {loading ? <Skeleton className="w-full h-[260px]" /> : data?.contracts && data.contracts.length > 0 ? (<>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.contracts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="share_pct" paddingAngle={3} strokeWidth={0}>
                  {data.contracts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {data.contracts.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs">{c.volume_mwh.toLocaleString()} MWh</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mono">{formatZAR(c.price_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>) : <EmptyState title="No PPAs" description="PPA breakdown will appear when you have active contracts." />}
        </div>
      </div>

      {/* Contracts Table */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Active Contracts</h3>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-10" />)}</div>
        ) : data?.contracts && data.contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Active contracts">
              <thead>
                <tr className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <th className="text-left py-2 font-medium" scope="col">Contract</th>
                  <th className="text-left py-2 font-medium" scope="col">Type</th>
                  <th className="text-right py-2 font-medium" scope="col">Price</th>
                  <th className="text-right py-2 font-medium" scope="col">Volume</th>
                  <th className="text-right py-2 font-medium" scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {data.contracts.map(c => (
                  <tr key={c.name} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 capitalize">{c.type}</td>
                    <td className="py-3 text-right mono text-slate-600 dark:text-slate-400">{formatZAR(c.price_cents)}</td>
                    <td className="py-3 text-right mono text-slate-600 dark:text-slate-400">{c.volume_mwh.toLocaleString()} MWh</td>
                    <td className="py-3 text-right mono font-semibold text-slate-800 dark:text-slate-200">{c.share_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No contracts" description="Your active contracts will appear here." />}
      </div>
    </motion.div>
  );
}
