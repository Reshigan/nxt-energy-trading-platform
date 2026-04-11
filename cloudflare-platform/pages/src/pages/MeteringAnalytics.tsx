import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiRefreshCw, FiZap, FiTrendingUp, FiSun, FiWind } from '../lib/fi-icons-shim';
import { BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { odseAPI } from '../lib/api';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface SummaryData {
  period_days: number;
  generation: { total_kwh: number; readings: number; avg_kwh: number; peak_kwh: number };
  consumption: { total_kwh: number; readings: number; avg_kwh: number; peak_kwh: number; avg_carbon_intensity_gco2: number; estimated_emissions_kgco2: number };
  net_kwh: number;
  by_tariff_period: Array<{ tariff_period: string; total_kwh: number; readings: number }>;
  by_direction: Array<{ direction: string; total_kwh: number; readings: number }>;
  avg_power_factor: number;
}

interface HourlyData { hour: number; generation: number; consumption: number }
interface DailyData { date: string; generation: number; consumption: number }
interface CarbonData { date: string; avg_intensity: number; total_emissions_tco2e: number; avoided_emissions_tco2e: number }
interface TariffData { tariff_period: string; total_kwh: number; total_cost: number; readings: number }

const TARIFF_COLORS: Record<string, string> = { peak: '#ef4444', standard: '#f59e0b', off_peak: '#10b981', critical_peak: '#8b5cf6' };
const DIRECTION_COLORS: Record<string, string> = { generation: '#10b981', consumption: '#3b82f6', net: '#f59e0b' };

export default function MeteringAnalytics() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [hourly, setHourly] = useState<HourlyData[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [carbon, setCarbon] = useState<CarbonData[]>([]);
  const [tariff, setTariff] = useState<TariffData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [sumRes, hrRes, dyRes, cbRes, tfRes] = await Promise.allSettled([
        odseAPI.summary({ days }),
        odseAPI.hourly({ days }),
        odseAPI.daily({ days }),
        odseAPI.carbon({ days }),
        odseAPI.tariff({ days }),
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.data ?? null);
      if (hrRes.status === 'fulfilled') setHourly(Array.isArray(hrRes.value.data?.data) ? hrRes.value.data.data : []);
      if (dyRes.status === 'fulfilled') setDaily(Array.isArray(dyRes.value.data?.data) ? dyRes.value.data.data : []);
      if (cbRes.status === 'fulfilled') setCarbon(Array.isArray(cbRes.value.data?.data?.daily_trend) ? cbRes.value.data.data.daily_trend : []);
      if (tfRes.status === 'fulfilled') setTariff(Array.isArray(tfRes.value.data?.data?.breakdown) ? tfRes.value.data.data.breakdown : []);
      if ([sumRes, hrRes, dyRes, cbRes, tfRes].every(r => r.status === 'rejected')) setError('Failed to load ODSE analytics data.');
    } catch { setError('Failed to load analytics data.'); }
    setLoading(false);
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  const genMWh = summary ? Math.round(summary.generation.total_kwh / 1000) : 0;
  const conMWh = summary ? Math.round(summary.consumption.total_kwh / 1000) : 0;
  const netMWh = summary ? Math.round(summary.net_kwh / 1000) : 0;
  const avgCI = summary ? Math.round(summary.consumption.avg_carbon_intensity_gco2) : 0;
  const avoidedTCO2 = summary ? Math.round(summary.consumption.estimated_emissions_kgco2 / 1000 * 10) / 10 : 0;
  const avgPF = summary ? summary.avg_power_factor : 0;

  const pieData = summary?.by_direction?.map(d => ({ name: d.direction, value: Math.round(d.total_kwh / 1000) })) ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="ODSE Metering Analytics">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Metering Analytics</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">ODSE-compliant energy consumption & generation insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className={`px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-white border-black/[0.06] text-slate-800')}`}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-600 transition-all flex items-center gap-2" aria-label="Refresh analytics">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>
      ) : (<>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          {[
            { label: 'Generation', value: `${genMWh} MWh`, icon: FiSun, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Consumption', value: `${conMWh} MWh`, icon: FiZap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Net Energy', value: `${netMWh} MWh`, icon: FiTrendingUp, color: netMWh >= 0 ? 'text-emerald-500' : 'text-red-500', bg: netMWh >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
            { label: 'Carbon Intensity', value: `${avgCI} gCO₂`, icon: FiWind, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Avoided CO₂', value: `${avoidedTCO2} t`, icon: FiActivity, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Power Factor', value: `${avgPF}`, icon: FiActivity, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          ].map((kpi, i) => (
            <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1: Daily Trend + Hourly Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Daily Generation vs Consumption (MWh)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Legend />
                <Bar dataKey="generation" fill="#10B981" radius={[3, 3, 0, 0]} name="Generation" />
                <Bar dataKey="consumption" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Consumption" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">24-Hour Load Profile (avg kWh)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourly}>
                <defs>
                  <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="conGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} tickFormatter={v => `${v}:00`} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Legend />
                <Area type="monotone" dataKey="generation" stroke="#10B981" strokeWidth={2} fill="url(#genGrad)" name="Generation" />
                <Area type="monotone" dataKey="consumption" stroke="#3B82F6" strokeWidth={2} fill="url(#conGrad)" name="Consumption" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Carbon + Tariff + Energy Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Carbon Intensity Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={carbon}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit=" g" />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="avg_intensity" stroke="#f59e0b" strokeWidth={2} dot={false} name="gCO₂/kWh" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Tariff Period Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tariff} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis type="number" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tariff_period" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="total_kwh" name="kWh" radius={[0, 4, 4, 0]}>
                  {tariff.map((entry, idx) => <Cell key={idx} fill={TARIFF_COLORS[entry.tariff_period] || '#6b7280'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Energy Mix (MWh)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, idx) => <Cell key={idx} fill={DIRECTION_COLORS[entry.name] || '#6b7280'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ODSE Schema Badge */}
        <div className={`cp-card !p-4 flex items-center gap-3 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 800ms both' }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <FiActivity className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">ODSE Compliant</p>
            <p className="text-xs text-slate-400">Data follows the Open Data Schema for Energy (ODSE) specification — timestamp, kWh, error_type, direction, end_use, tariff_period, carbon_intensity</p>
          </div>
        </div>
      </>)}
    </motion.div>
  );
}
