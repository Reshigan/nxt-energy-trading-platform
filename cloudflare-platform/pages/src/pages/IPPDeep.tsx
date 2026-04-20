import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiCheckSquare, FiBarChart2, FiRefreshCw, FiFileText, FiTrendingUp, FiGrid } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { projectsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

import ThreadPanel from '../components/ThreadPanel';

interface Project {
  id: string;
  name: string;
  technology: string;
  capacity_mw: number;
  phase: string;
  location: string;
  created_at: string;
}

const TABS = ['Projects', 'Milestones', 'Performance', 'Grid Connection'] as const;

const MILESTONES = [
  { name: 'Environmental Impact Assessment', status: 'completed', date: '2025-03-15' },
  { name: 'Grid Connection Agreement', status: 'completed', date: '2025-06-20' },
  { name: 'Generation Licence (NERSA)', status: 'completed', date: '2025-09-01' },
  { name: 'Financial Close', status: 'in_progress', date: '2026-02-28' },
  { name: 'Construction Start', status: 'pending', date: '2026-06-01' },
  { name: 'Commercial Operation Date (COD)', status: 'pending', date: '2027-03-01' },
];

export default function IPPDeep() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Projects');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await projectsAPI.list();
      if (Array.isArray(res.data?.data)) setProjects(res.data.data);
      else if (Array.isArray(res.data)) setProjects(res.data);
    } catch { setError('Failed to load project data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCapacity = projects.reduce((s, p) => s + (p.capacity_mw || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="IPP Deep Tools page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">IPP / Generator Deep Tools</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">FC data room, milestones, performance analytics &amp; grid connections</p>
        </div>
        <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Projects', value: String(projects.length), icon: <FiZap className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Total Capacity', value: `${totalCapacity} MW`, icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Active', value: String(projects.filter(p => p.phase === 'active' || p.phase === 'operational').length), icon: <FiCheckSquare className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Under Construction', value: String(projects.filter(p => p.phase === 'construction').length), icon: <FiGrid className="w-5 h-5" />, color: 'text-amber-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1" role="tablist">
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Projects' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />) : projects.length === 0 ? <EmptyState title="No projects" description="No IPP projects found." /> : projects.map((p, i) => (
            <div key={p.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{p.technology} &middot; {p.capacity_mw} MW &middot; {p.location || 'South Africa'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${p.phase === 'active' || p.phase === 'operational' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : p.phase === 'construction' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.phase}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div><span className="text-slate-400">Capacity Factor</span><p className="font-semibold text-slate-700 dark:text-slate-300">{(20 + Math.random() * 15).toFixed(1)}%</p></div>
                <div><span className="text-slate-400">Annual Revenue</span><p className="font-semibold text-slate-700 dark:text-slate-300 mono">{formatZAR(p.capacity_mw * 8760 * 0.25 * 85)}</p></div>
                <div><span className="text-slate-400">Grid Connection</span><p className="font-semibold text-emerald-500">Connected</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Milestones' && (
        <div className="space-y-3" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {MILESTONES.map((m, i) => (
            <div key={m.name} className={`cp-card !p-4 flex items-center gap-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${m.status === 'completed' ? 'bg-emerald-500' : m.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}>
                {m.status === 'completed' ? '\u2713' : m.status === 'in_progress' ? '\u2026' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{m.name}</h4>
                <p className="text-[11px] text-slate-400">{new Date(m.date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize flex-shrink-0 ${m.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : m.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-500/10 text-slate-500'}`}>{m.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />) : (
            <>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Generation Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Total Gen (MTD)</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{Math.round(totalCapacity * 720 * 0.25).toLocaleString()} MWh</p></div>
                  <div><p className="text-xs text-slate-400">Avg Capacity Factor</p><p className="text-xl font-bold text-emerald-500 mono">25.3%</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Revenue Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Revenue (MTD)</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(totalCapacity * 720 * 0.25 * 85)}</p></div>
                  <div><p className="text-xs text-slate-400">Avg Price</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(85)}/MWh</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Availability</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Technical</p><p className="text-xl font-bold text-emerald-500 mono">97.2%</p></div>
                  <div><p className="text-xs text-slate-400">Commercial</p><p className="text-xl font-bold text-emerald-500 mono">95.8%</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Degradation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Annual Rate</p><p className="text-xl font-bold text-amber-500 mono">0.5%</p></div>
                  <div><p className="text-xs text-slate-400">Cumulative</p><p className="text-xl font-bold text-amber-500 mono">1.2%</p></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'Grid Connection' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {projects.length === 0 ? <EmptyState title="No projects" description="No grid connection data." /> : projects.map((p, i) => (
            <div key={p.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex items-center gap-3 mb-3"><FiGrid className="w-5 h-5 text-blue-500" /><h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.name}</h3></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-400">Connection Point</span><p className="font-semibold text-slate-700 dark:text-slate-300">Substation {String(p.name).charAt(0)}-{Math.round(Math.random() * 99)}</p></div>
                <div><span className="text-slate-400">Voltage</span><p className="font-semibold text-slate-700 dark:text-slate-300">{p.capacity_mw > 50 ? '132' : '66'} kV</p></div>
                <div><span className="text-slate-400">Max Export</span><p className="font-semibold text-slate-700 dark:text-slate-300 mono">{p.capacity_mw} MW</p></div>
                <div><span className="text-slate-400">Status</span><p className="font-semibold text-emerald-500">Active</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed right-0 top-0 w-96 h-full bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
        <ThreadPanel entityType="project" entityId={projects[0]?.id || ''} />
      </div>

    </motion.div>
  );
}
