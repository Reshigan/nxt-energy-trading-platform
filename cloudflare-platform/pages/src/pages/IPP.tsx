import React, { useState, useEffect, useCallback } from 'react';
import { FiSun, FiWind, FiMapPin, FiCheckCircle, FiPlus, FiDollarSign, FiRefreshCw } from '../lib/fi-icons-shim';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { projectsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { formatZAR } from '../lib/format';

interface Project { id: string; name: string; tech: string; capacity: string; phase: string; location: string; progress: number; disbursed: string; total: string; milestones: number; completed: number; cps: { total: number; met: number }; }
interface DisbursementPoint { name: string; disbursed: number; remaining: number; }

const PHASES = ['All', 'Development', 'Permitting', 'Financial Close', 'Construction', 'Operations'] as const;

const phaseColors: Record<string, string> = {
  Development: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Permitting: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Financial Close': 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Construction: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Operations: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
};

export default function IPP() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState('All');
  const [projectData, setProjectData] = useState<Project[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await projectsAPI.list();
      if (Array.isArray(res.data?.data)) setProjectData(res.data.data);
      else setProjectData([]);
    } catch { setError('Failed to load IPP projects.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = activePhase === 'All' ? projectData : projectData.filter(p => p.phase === activePhase);
  const disbursementData: DisbursementPoint[] = projectData.map(p => ({
    name: p.name.split(' ')[0],
    disbursed: parseInt(p.disbursed.replace(/[^0-9]/g, '')) || 0,
    remaining: (parseInt(p.total.replace(/[^0-9]/g, '')) || 0) - (parseInt(p.disbursed.replace(/[^0-9]/g, '')) || 0),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="IPP Projects page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">IPP Projects</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Independent Power Producer project tracking</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600 transition-all flex items-center gap-2" aria-label="Refresh projects">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Project phase filter" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {PHASES.map(p => (
          <button key={p} role="tab" aria-selected={activePhase === p} onClick={() => setActivePhase(p)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activePhase === p ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{p}</button>
        ))}
      </div>

      {loading ? (<div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>) : projectData.length === 0 ? <EmptyState title="No IPP projects" description="No projects found. Projects will appear as they are added." /> : (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 150ms both' }}>
        {[
          { label: 'Active Projects', value: String(projectData.length), icon: FiCheckCircle },
          { label: 'Total Capacity', value: '400 MW', icon: FiSun },
          { label: 'Total Disbursed', value: 'R252M', icon: FiDollarSign },
          { label: 'CPs Completed', value: `${projectData.reduce((s, p) => s + (p.cps?.met || 0), 0)}/${projectData.reduce((s, p) => s + (p.cps?.total || 0), 0)}`, icon: FiCheckCircle },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${150 + i * 60}ms both` }}>
            <kpi.icon className="w-4 h-4 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p, i) => (
          <div key={p.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${300 + i * 80}ms both` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {p.tech.includes('Wind') ? <FiWind className="w-4 h-4 text-blue-500" /> : <FiSun className="w-4 h-4 text-amber-500" />}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</h3>
                  <p className="text-xs text-slate-400">{p.id} &middot; {p.capacity}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${phaseColors[p.phase] || ''}`}>{p.phase}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <FiMapPin className="w-3 h-3" /> {p.location} &middot; {p.tech}
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{p.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/30 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-slate-400">Milestones</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200 mono">{p.completed}/{p.milestones}</p></div>
              <div><p className="text-xs text-slate-400">CPs Met</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200 mono">{p.cps.met}/{p.cps.total}</p></div>
              <div><p className="text-xs text-slate-400">Disbursed</p><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mono">{p.disbursed}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 800ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Disbursement Overview</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={disbursementData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
            <XAxis type="number" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="disbursed" fill="#F59E0B" radius={[0, 4, 4, 0]} stackId="a" name="Disbursed (RM)" />
            <Bar dataKey="remaining" fill={c('rgba(255,255,255,0.06)', 'rgba(0,0,0,0.04)')} radius={[0, 4, 4, 0]} stackId="a" name="Remaining (RM)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </>)}
    </motion.div>
  );
}
