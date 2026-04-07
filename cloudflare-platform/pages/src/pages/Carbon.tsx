import React, { useState, useEffect } from 'react';
import { FiGlobe, FiTrendingUp, FiAward, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { carbonAPI } from '../lib/api';

const tabs = ['Overview', 'Credits', 'Options', 'Tokens', 'RECs', 'Retirement'];
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

const creditsByType = [
  { name: 'VCS', value: 4200 }, { name: 'Gold Standard', value: 3100 },
  { name: 'CDM', value: 2800 }, { name: 'SA Carbon Tax', value: 1500 }, { name: 'Other', value: 850 },
];
const monthlyRetirements = [
  { month: 'Jan', retired: 1200, issued: 1800 }, { month: 'Feb', retired: 1400, issued: 1600 },
  { month: 'Mar', retired: 1800, issued: 2200 }, { month: 'Apr', retired: 2100, issued: 2400 },
  { month: 'May', retired: 1600, issued: 1900 }, { month: 'Jun', retired: 2400, issued: 2800 },
];
const carbonPriceHistory = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, price: 240 + i * 1.5 + Math.random() * 15 }));

const kpis = [
  { label: 'Total Holdings', value: '12,450 t', icon: FiGlobe, change: '+3.8%', positive: true },
  { label: 'Carbon Price', value: 'R285.00', icon: FiTrendingUp, change: '+12.4%', positive: true },
  { label: 'Retired YTD', value: '8,400 t', icon: FiAward, change: '+24%', positive: true },
  { label: 'Options Written', value: '6', icon: FiRefreshCw, change: '+2', positive: true },
];

export default function Carbon() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Overview');
  const [credits, setCredits] = useState(creditsByType);

  useEffect(() => {
    (async () => {
      try {
        const res = await carbonAPI.getCredits();
        if (res.data?.data?.length) {
          const grouped: Record<string, number> = {};
          for (const c of res.data.data) {
            const std = (c.standard as string) || 'Other';
            grouped[std] = (grouped[std] || 0) + (c.quantity as number || 0);
          }
          const mapped = Object.entries(grouped).map(([name, value]) => ({ name, value }));
          if (mapped.length) setCredits(mapped);
        }
      } catch { /* use demo data */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Carbon</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Credits, offsets, and carbon trading</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> New Transaction
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex items-center rounded-full p-1 w-fit ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === tab ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: `cardFadeUp 500ms ease ${200 + i * 80}ms both` }}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-5 h-5 text-emerald-500" />
              <span className={`text-xs font-semibold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>{kpi.change}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price History */}
        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Carbon Price (30D)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={carbonPriceHistory}>
              <defs>
                <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} fill="url(#carbonGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Credits by Type */}
        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Credits by Standard</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={credits} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {credits.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {credits.map((cr, i) => (
              <div key={cr.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-500 dark:text-slate-400">{cr.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retirements */}
      <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Issuance vs Retirement</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyRetirements}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="issued" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={20} name="Issued" />
            <Bar dataKey="retired" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} name="Retired" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
