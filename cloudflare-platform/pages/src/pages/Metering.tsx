import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiRefreshCw, FiCheck, FiClock, FiZap } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { meteringAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface MeterReading { time: string; solar: number; wind: number; demand: number; }
interface MonthlyData { month: string; generation: number; consumption: number; }
interface Meter { id: string; project: string; type: string; reading: string; status: string; quality: string; lastReading: string; }

export default function Metering() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meterData, setMeterData] = useState<Meter[]>([]);
  const [readingsData, setReadingsData] = useState<MeterReading[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [mtrRes, rdRes, moRes] = await Promise.allSettled([
        meteringAPI.getMeters('default'), meteringAPI.getReadings({ project_id: 'default' }), meteringAPI.getSummary('default'),
      ]);
      if (mtrRes.status === 'fulfilled') setMeterData(Array.isArray(mtrRes.value.data?.data) ? mtrRes.value.data.data : []);
      if (rdRes.status === 'fulfilled') setReadingsData(Array.isArray(rdRes.value.data?.data) ? rdRes.value.data.data : []);
      if (moRes.status === 'fulfilled') setMonthlyData(Array.isArray(moRes.value.data?.data) ? moRes.value.data.data : []);
      if (mtrRes.status === 'rejected' && rdRes.status === 'rejected' && moRes.status === 'rejected') setError('Failed to load metering data.');
    } catch { setError('Failed to load metering data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeCount = meterData.filter(m => m.status === 'Online' || m.status === 'online').length;
  const totalCount = meterData.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Metering & IoT page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Metering & IoT</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Real-time meter readings & generation data</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-600 transition-all flex items-center gap-2" aria-label="Refresh metering data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-20" />)}</div>) : (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Active Meters', value: `${activeCount}/${totalCount}`, icon: FiActivity, color: 'text-cyan-500' },
          { label: 'Total Meters', value: `${totalCount}`, icon: FiZap, color: 'text-amber-500' },
          { label: 'Online', value: `${activeCount}`, icon: FiActivity, color: 'text-blue-500' },
          { label: 'Offline', value: `${totalCount - activeCount}`, icon: FiCheck, color: 'text-emerald-500' },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <kpi.icon className={`w-4 h-4 ${kpi.color} mb-2`} aria-hidden="true" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Today&apos;s Generation & Demand (15-min intervals)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={readingsData}>
              <defs>
                <linearGradient id="solGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} /><stop offset="100%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                <linearGradient id="wndGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit=" MW" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="solar" stroke="#F59E0B" strokeWidth={2} fill="url(#solGrad)" name="Solar" />
              <Area type="monotone" dataKey="wind" stroke="#3B82F6" strokeWidth={2} fill="url(#wndGrad)" name="Wind" />
              <Area type="monotone" dataKey="demand" stroke="#EF4444" strokeWidth={1.5} fill="none" strokeDasharray="4 3" name="Demand" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Generation vs Consumption</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="generation" fill="#10B981" radius={[4, 4, 0, 0]} name="Generation (MWh)" />
              <Bar dataKey="consumption" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Consumption (MWh)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
        <div className={`px-5 py-3.5 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Connected Meters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
              <th className="text-left py-3 px-5 font-medium">Meter ID</th>
              <th className="text-left py-3 px-4 font-medium">Project</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-right py-3 px-4 font-medium">Reading</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Quality</th>
              <th className="text-right py-3 px-5 font-medium">Last</th>
            </tr></thead>
            <tbody>{meterData.map(m => (
              <tr key={m.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                <td className="py-3 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{m.id}</td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{m.project}</td>
                <td className="py-3 px-4 text-slate-500">{m.type}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white mono">{m.reading}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'Online' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{m.status}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-500 mono text-xs">{m.quality}</td>
                <td className="py-3 px-5 text-right text-slate-400 text-xs flex items-center justify-end gap-1"><FiClock className="w-3 h-3" />{m.lastReading}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      </>)}
    </motion.div>
  );
}
