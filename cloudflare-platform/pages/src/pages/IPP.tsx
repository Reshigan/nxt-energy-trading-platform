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
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';
import EntityLink from '../components/EntityLink';

interface RawProject {
  id: string; name: string; technology?: string; tech?: string; capacity_mw?: number; capacity?: string;
  phase: string; location: string; total_cost_cents?: number; progress?: number;
  disbursed?: string; total?: string; milestones?: number; completed?: number;
  cps?: { total: number; met: number };
}
interface Project {
  id: string; name: string; tech: string; capacity: string; phase: string;
  location: string; progress: number; disbursed: string; total: string;
  milestones: number; completed: number; cps: { total: number; met: number };
}
interface DisbursementPoint { name: string; disbursed: number; remaining: number; }

function normalizeProject(raw: RawProject): Project {
  const totalCents = raw.total_cost_cents || 0;
  const totalStr = raw.total || (totalCents > 0 ? `R${(totalCents / 100).toLocaleString()}` : 'R0');
  const disbursedStr = raw.disbursed || 'R0';
  const phaseMap: Record<string, string> = {
    development: 'Development', permitting: 'Permitting',
    financial_close: 'Financial Close', construction: 'Construction',
    commissioning: 'Operations', commercial_ops: 'Operations',
  };
  return {
    id: raw.id,
    name: raw.name,
    tech: raw.tech || raw.technology || 'Solar PV',
    capacity: raw.capacity || (raw.capacity_mw ? `${raw.capacity_mw} MW` : '0 MW'),
    phase: phaseMap[raw.phase] || raw.phase || 'Development',
    location: raw.location || 'South Africa',
    progress: raw.progress ?? 0,
    disbursed: disbursedStr,
    total: totalStr,
    milestones: raw.milestones ?? 0,
    completed: raw.completed ?? 0,
    cps: raw.cps || { total: 0, met: 0 },
  };
}

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
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', tech: 'Solar PV', capacity: '', location: '' });
  const [creating, setCreating] = useState(false);
  const [disbursementProject, setDisbursementProject] = useState<string | null>(null);
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [disbursementReason, setDisbursementReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await projectsAPI.list();
      if (Array.isArray(res.data?.data)) setProjectData(res.data.data.map(normalizeProject));
      else setProjectData([]);
    } catch { setError('Failed to load IPP projects.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateProject = async () => {
    if (!createForm.name.trim() || !createForm.capacity) { toast.error('Name and capacity are required'); return; }
    setCreating(true);
    try {
      const res = await projectsAPI.create({ name: createForm.name, technology: createForm.tech, capacity_mw: Number(createForm.capacity), location: createForm.location });
      if (res.data?.success || res.data?.data) { toast.success('Project created'); setShowCreate(false); setCreateForm({ name: '', tech: 'Solar PV', capacity: '', location: '' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to create project');
    } catch { toast.error('Failed to create project'); }
    setCreating(false);
  };

  const handleRequestDisbursement = async () => {
    if (!disbursementProject || !disbursementAmount) { toast.error('Amount is required'); return; }
    setRequesting(true);
    try {
      const res = await projectsAPI.requestDisbursement(disbursementProject, { amount_cents: Math.round(Number(disbursementAmount) * 100), reason: disbursementReason });
      if (res.data?.success) { toast.success('Disbursement requested'); setDisbursementProject(null); setDisbursementAmount(''); setDisbursementReason(''); loadData(); }
      else toast.error(res.data?.error || 'Request failed');
    } catch { toast.error('Disbursement request failed'); }
    setRequesting(false);
  };

  const filtered = activePhase === 'All' ? projectData : projectData.filter(p => p.phase === activePhase);
  const disbursementData: DisbursementPoint[] = projectData.map(p => {
    const disbursedVal = parseInt((p.disbursed || 'R0').replace(/[^0-9]/g, '')) || 0;
    const totalVal = parseInt((p.total || 'R0').replace(/[^0-9]/g, '')) || 0;
    return { name: p.name.split(' ')[0], disbursed: disbursedVal, remaining: Math.max(0, totalVal - disbursedVal) };
  });

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
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Create new project"><FiPlus className="w-4 h-4" /> New Project</button>
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
                  <p className="text-xs text-slate-400"><EntityLink type="project" id={p.id} label={p.id.substring(0, 8)} /> &middot; {p.capacity}</p>
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
              <div><p className="text-xs text-slate-400">CPs Met</p><p className="text-sm font-bold text-slate-800 dark:text-slate-200 mono"><EntityLink type="project" id={p.id} label={`${p.cps.met}/${p.cps.total}`} /></p></div>
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New IPP Project">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Project Name</label>
            <input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Karoo Solar Farm" className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Technology</label>
              <select value={createForm.tech} onChange={e => setCreateForm(p => ({ ...p, tech: e.target.value }))} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`}>
                <option>Solar PV</option><option>Wind</option><option>Hybrid</option><option>Battery Storage</option><option>Gas</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Capacity (MW)</label>
              <input type="number" value={createForm.capacity} onChange={e => setCreateForm(p => ({ ...p, capacity: e.target.value }))} placeholder="100" className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Location</label>
            <input value={createForm.location} onChange={e => setCreateForm(p => ({ ...p, location: e.target.value }))} placeholder="Northern Cape, SA" className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProject} loading={creating}>Create Project</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!disbursementProject} onClose={() => setDisbursementProject(null)} title="Request Disbursement">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Amount (R)</label>
            <input type="number" value={disbursementAmount} onChange={e => setDisbursementAmount(e.target.value)} placeholder="0.00" className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Reason</label>
            <textarea value={disbursementReason} onChange={e => setDisbursementReason(e.target.value)} placeholder="Reason for disbursement request..." rows={3} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDisbursementProject(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleRequestDisbursement} loading={requesting} disabled={!disbursementAmount}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
