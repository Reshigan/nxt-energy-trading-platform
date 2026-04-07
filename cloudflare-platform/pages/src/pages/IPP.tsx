import React, { useState, useEffect } from 'react';
import { FiSun, FiWind, FiMapPin, FiCheckCircle, FiPlus, FiDollarSign } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { projectsAPI } from '../lib/api';

const projects = [
  { id: 'NXT-SOL-001', name: 'Limpopo Solar Farm', tech: 'Solar PV', capacity: '100 MW', phase: 'Construction', location: 'Limpopo', progress: 72, disbursed: 'R120M', total: 'R180M', milestones: 8, completed: 6, cps: { total: 14, met: 11 } },
  { id: 'NXT-WND-002', name: 'Eastern Cape Wind', tech: 'Onshore Wind', capacity: '75 MW', phase: 'Financial Close', location: 'Eastern Cape', progress: 45, disbursed: 'R35M', total: 'R140M', milestones: 8, completed: 3, cps: { total: 12, met: 5 } },
  { id: 'NXT-SOL-003', name: 'Northern Cape CSP', tech: 'CSP', capacity: '50 MW', phase: 'Development', location: 'Northern Cape', progress: 28, disbursed: 'R0', total: 'R220M', milestones: 10, completed: 2, cps: { total: 16, met: 4 } },
  { id: 'NXT-BIO-004', name: 'KZN Biogas Plant', tech: 'Biomass', capacity: '25 MW', phase: 'Operations', location: 'KwaZulu-Natal', progress: 95, disbursed: 'R85M', total: 'R90M', milestones: 8, completed: 8, cps: { total: 10, met: 10 } },
  { id: 'NXT-WND-005', name: 'Karoo Wind Farm', tech: 'Onshore Wind', capacity: '120 MW', phase: 'Permitting', location: 'Northern Cape', progress: 15, disbursed: 'R0', total: 'R280M', milestones: 12, completed: 1, cps: { total: 18, met: 2 } },
  { id: 'NXT-HYD-006', name: 'Drakensberg Hydro', tech: 'Small Hydro', capacity: '30 MW', phase: 'Development', location: 'Free State', progress: 35, disbursed: 'R12M', total: 'R95M', milestones: 8, completed: 3, cps: { total: 12, met: 4 } },
];

const phases = ['All', 'Development', 'Permitting', 'Financial Close', 'Construction', 'Operations'];

const disbursementData = projects.map(p => ({
  name: p.name.split(' ')[0],
  disbursed: parseInt(p.disbursed.replace(/[^0-9]/g, '')) || 0,
  remaining: (parseInt(p.total.replace(/[^0-9]/g, '')) || 0) - (parseInt(p.disbursed.replace(/[^0-9]/g, '')) || 0),
}));

const phaseColors: Record<string, string> = {
  Development: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Permitting: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Financial Close': 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  Construction: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Operations: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
};

export default function IPP() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activePhase, setActivePhase] = useState('All');
  const [projectData, setProjectData] = useState(projects);

  useEffect(() => {
    (async () => {
      try {
        const res = await projectsAPI.list();
        if (res.data?.data?.length) setProjectData(res.data.data);
      } catch { /* use demo data */ }
    })();
  }, []);

  const filtered = activePhase === 'All' ? projectData : projectData.filter(p => p.phase === activePhase);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">IPP Projects</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Independent Power Producer project tracking</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600 transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {phases.map(p => (
          <button key={p} onClick={() => setActivePhase(p)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activePhase === p ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{p}</button>
        ))}
      </div>

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
    </div>
  );
}
