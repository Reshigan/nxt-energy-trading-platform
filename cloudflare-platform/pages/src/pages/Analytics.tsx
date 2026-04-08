import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiBarChart2, FiDollarSign, FiActivity, FiPieChart, FiRefreshCw } from '../lib/fi-icons-shim';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { dashboardAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface VolumePoint { month: string; solar: number; wind: number; gas: number; carbon: number; }
interface RevenueEntry { name: string; value: number; }
interface MarketSharePoint { month: string; share: number; }
interface TopAsset { name: string; volume: string; revenue: string; growth: string; positive: boolean; }
interface KPI { label: string; value: string; change: string; positive: boolean; icon: string; }

const iconMap: Record<string, React.FC<{className?: string}>> = { FiBarChart2, FiDollarSign, FiActivity, FiPieChart, FiTrendingUp };

export default function Analytics() {
  const toast = useToast();
  const { isDark } = useTheme();
  const [period, setPeriod] = useState('6M');
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPI[]>([]);
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueEntry[]>([]);
  const [marketShareData, setMarketShareData] = useState<MarketSharePoint[]>([]);
  const [topAssets, setTopAssets] = useState<TopAsset[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await dashboardAPI.summary();
      const d = res.data?.data;
      if (d?.kpis) setKpiData(d.kpis);
      if (d?.volume) setVolumeData(d.volume);
      if (d?.revenue_breakdown) setRevenueBreakdown(d.revenue_breakdown);
      if (d?.market_share) setMarketShareData(d.market_share);
      if (d?.top_assets) setTopAssets(d.top_assets);
    } catch { setError('Failed to load analytics data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Analytics page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Platform performance & market insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-full p-1 ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Time period">
            {['1M','3M','6M','1Y','ALL'].map(p => (
              <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${period === p ? c('bg-white/[0.12] text-white', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400', 'text-slate-500')}`}>{p}</button>
            ))}
          </div>
          <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors" aria-label="Refresh analytics">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (<div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>) : (<>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {kpiData.length === 0 ? <div className="col-span-full"><EmptyState title="No analytics data" description="Analytics will populate as trading activity occurs." /></div> : kpiData.map((kpi, i) => {
          const Icon = iconMap[kpi.icon] || FiTrendingUp;
          return (
            <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
              <Icon className="w-4 h-4 text-blue-500 mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-slate-400">{kpi.label}</p>
                <span className={`text-[11px] font-bold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Trading Volume by Source</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="solar" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="wind" fill="#3B82F6" stackId="a" />
              <Bar dataKey="gas" fill="#8B5CF6" stackId="a" />
              <Bar dataKey="carbon" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {revenueBreakdown.map((r, i) => (
              <div key={r.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-slate-500 dark:text-slate-400">{r.name}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mono">R{(r.value / 1000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Market Share Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={marketShareData}>
              <defs><linearGradient id="shareGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit="%" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="share" stroke="#3B82F6" strokeWidth={2} fill="url(#shareGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Top Assets by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
                <th className="text-left py-2 font-medium">Asset</th>
                <th className="text-right py-2 font-medium">Volume</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium">Growth</th>
              </tr></thead>
              <tbody>{topAssets.map(a => (
                <tr key={a.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                  <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{a.name}</td>
                  <td className="py-2.5 text-right text-slate-500 mono text-xs">{a.volume}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{a.revenue}</td>
                  <td className="py-2.5 text-right"><span className={`text-xs font-bold ${a.positive ? 'text-emerald-500' : 'text-red-500'}`}>{a.growth}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      </>)}
    </motion.div>
  );
}
