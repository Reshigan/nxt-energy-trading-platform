import React, { useMemo, useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiArrowRight, FiLoader, FiZap, FiSun, FiBarChart2, FiShield, FiAlertTriangle, FiCheckCircle, FiUsers, FiActivity, FiFileText, FiDollarSign, FiGlobe, FiClock, FiPercent, FiLayers, FiServer, FiPieChart } from '../lib/fi-icons-shim';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import SemiGauge from '../components/SemiGauge';
import QuickActions from '../components/QuickActions';
import { useAuthStore } from '../lib/store';
import { getRoleConfig, type PlatformRole } from '../config/roles';
import { useTheme } from '../contexts/ThemeContext';
import { dashboardAPI } from '../lib/api';
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

const cardClass = (isDark: boolean) => `cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`;
const tooltipStyle = (isDark: boolean) => ({ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 });
const gridStroke = (isDark: boolean) => isDark ? '#1e293b' : '#f1f5f9';
const axisTick = (isDark: boolean) => ({ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' });

function KPICard({ label, value, icon, change, positive, color, isDark, delay }: {
  label: string; value: string; icon: React.ReactNode; change: string; positive: boolean; color: string; isDark: boolean; delay: number;
}) {
  return (
    <div className={cardClass(isDark)} style={{ animation: `cardFadeUp 500ms ease ${delay}ms both` }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? <FiTrendingUp className="w-3 h-3 text-emerald-500" /> : <FiTrendingDown className="w-3 h-3 text-red-500" />}
        <span className={`text-xs font-semibold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>{change}</span>
      </div>
    </div>
  );
}

/* ---- GENERATOR DASHBOARD ---- */
function GeneratorDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const genData = [
    { hour: '06:00', solar: 12, wind: 28 }, { hour: '08:00', solar: 45, wind: 32 },
    { hour: '10:00', solar: 68, wind: 35 }, { hour: '12:00', solar: 75, wind: 30 },
    { hour: '14:00', solar: 71, wind: 33 }, { hour: '16:00', solar: 52, wind: 38 },
    { hour: '18:00', solar: 18, wind: 42 }, { hour: '20:00', solar: 0, wind: 45 },
  ];
  const plants = [
    { name: 'Limpopo Solar Farm', cap: '75 MW', st: 'online', out: '62.4 MW', av: 96.2 },
    { name: 'Northern Cape Wind', cap: '120 MW', st: 'online', out: '84.1 MW', av: 93.8 },
    { name: 'Hybrid Plant Mpumalanga', cap: '50 MW', st: 'maintenance', out: '0 MW', av: 0 },
    { name: 'Battery Storage KZN', cap: '25 MW', st: 'online', out: '12.3 MW', av: 99.1 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Generation Today" value="847 MWh" icon={<FiZap className="w-5 h-5" />} change="+12.3%" positive color="#16A34A" isDark={isDark} delay={0} />
        <KPICard label="Active PPAs" value={String(summary?.active_contracts || 14)} icon={<FiFileText className="w-5 h-5" />} change="+2" positive color="#3B82F6" isDark={isDark} delay={80} />
        <KPICard label="Revenue MTD" value="R4.2M" icon={<FiDollarSign className="w-5 h-5" />} change="+8.1%" positive color="#8B5CF6" isDark={isDark} delay={160} />
        <KPICard label="Avg Availability" value="94.7%" icon={<FiActivity className="w-5 h-5" />} change="-0.3%" positive={false} color="#F59E0B" isDark={isDark} delay={240} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass(isDark)} lg:col-span-2`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generation Output (MW)</h3>
            <div className="flex gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Solar</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Wind</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={genData}>
              <defs>
                <linearGradient id="solarGen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} /><stop offset="100%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                <linearGradient id="windGen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
              <XAxis dataKey="hour" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick(isDark)} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={tooltipStyle(isDark)} />
              <Area type="monotone" dataKey="solar" stroke="#F59E0B" strokeWidth={2} fill="url(#solarGen)" />
              <Area type="monotone" dataKey="wind" stroke="#3B82F6" strokeWidth={2} fill="url(#windGen)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Plant Status</h3>
          <div className="space-y-3">
            {plants.map(p => (
              <div key={p.name} className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.st === 'online' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.st}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400"><span>{p.out} / {p.cap}</span><span>{p.av}% avail</span></div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${p.av}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generator Actions</h3>
            <FiSun className="w-4 h-4" style={{ color: config.accentHex }} />
          </div>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">NERSA Compliance Status</h3>
          <div className="space-y-2">
            {[{ item: 'Generation Licence', status: 'valid', expiry: '2028-12-31' }, { item: 'Metering Certification', status: 'valid', expiry: '2027-06-30' }, { item: 'Grid Code Compliance', status: 'valid', expiry: '2026-12-31' }, { item: 'Environmental Authorisation', status: 'renewal', expiry: '2026-09-01' }].map(c => (
              <div key={c.item} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {c.status === 'valid' ? <FiCheckCircle className="w-4 h-4 text-emerald-500" /> : <FiClock className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm text-slate-700 dark:text-slate-300">{c.item}</span>
                </div>
                <span className="text-xs text-slate-400">Exp: {c.expiry}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- TRADER DASHBOARD ---- */
function TraderDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const pnlData = [
    { day: 'Mon', pnl: 180000 }, { day: 'Tue', pnl: -45000 }, { day: 'Wed', pnl: 320000 },
    { day: 'Thu', pnl: 125000 }, { day: 'Fri', pnl: -80000 }, { day: 'Sat', pnl: 50000 }, { day: 'Today', pnl: 240000 },
  ];
  const positions = [
    { market: 'Solar PPA', size: 'R4.2M', pnl: '+R320K', pnlPct: '+7.6%', pos: true },
    { market: 'Wind Forward', size: 'R2.8M', pnl: '+R145K', pnlPct: '+5.2%', pos: true },
    { market: 'Gas Spot', size: 'R1.5M', pnl: '-R82K', pnlPct: '-5.5%', pos: false },
    { market: 'Carbon Credits', size: 'R3.1M', pnl: '+R210K', pnlPct: '+6.8%', pos: true },
    { market: 'Battery Storage', size: 'R1.9M', pnl: '+R48K', pnlPct: '+2.5%', pos: true },
  ];
  const riskVal = summary ? Math.min(99, 60 + Math.min((summary.my_open_orders || 0) * 5, 30)) : 72;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Portfolio Value" value="R24.8M" icon={<FiPieChart className="w-5 h-5" />} change="+12.4%" positive color="#4F46E5" isDark={isDark} delay={0} />
        <KPICard label="Today's P&L" value="R1.24M" icon={<FiTrendingUp className="w-5 h-5" />} change="+8.2%" positive color="#10B981" isDark={isDark} delay={80} />
        <KPICard label="Open Positions" value={String(summary?.my_open_orders || 23)} icon={<FiLayers className="w-5 h-5" />} change="+3" positive color="#F59E0B" isDark={isDark} delay={160} />
        <KPICard label="Win Rate (7d)" value="68%" icon={<FiPercent className="w-5 h-5" />} change="+4%" positive color="#8B5CF6" isDark={isDark} delay={240} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass(isDark)} lg:col-span-2`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Weekly P&L (ZAR)</h3>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
              <XAxis dataKey="day" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick(isDark)} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle(isDark)} formatter={(v: number) => [`R${(v / 1000).toFixed(0)}K`, 'P&L']} />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                {pnlData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10B981' : '#EF4444'} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <SemiGauge value={riskVal} label="Portfolio Health" sublabel="Risk-adjusted score" accentHex={config.accentHex} size={180} />
          <div className="mt-4 space-y-2">
            {[{ l: 'VaR (95%)', v: 'R520K' }, { l: 'Sharpe Ratio', v: '2.15' }, { l: 'Max Drawdown', v: '-3.2%' }].map(m => (
              <div key={m.l} className="flex items-center justify-between text-xs"><span className="text-slate-400">{m.l}</span><span className="font-semibold text-slate-700 dark:text-slate-300 mono">{m.v}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Open Positions</h3>
            <a href="/trading" className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600">View all <FiArrowRight className="w-3 h-3" /></a>
          </div>
          <div className="space-y-1">
            {positions.map((p, i) => (
              <div key={p.market} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors" style={{ animation: `cardFadeUp 400ms ease ${500 + i * 60}ms both` }}>
                <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{p.market}</p><p className="text-[11px] text-slate-400">Size: {p.size}</p></div>
                <div className="text-right"><p className={`text-sm font-bold mono ${p.pos ? 'text-emerald-500' : 'text-red-500'}`}>{p.pnl}</p><p className={`text-[11px] font-medium ${p.pos ? 'text-emerald-400' : 'text-red-400'}`}>{p.pnlPct}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Trader Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- OFFTAKER DASHBOARD ---- */
function OfftakerDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const costData = [
    { month: 'Jan', eskom: 145, ppa: 89, blended: 112 }, { month: 'Feb', eskom: 148, ppa: 88, blended: 110 },
    { month: 'Mar', eskom: 152, ppa: 87, blended: 108 }, { month: 'Apr', eskom: 155, ppa: 86, blended: 106 },
  ];
  const mix = [
    { name: 'Solar PPA', value: 42, color: '#F59E0B' }, { name: 'Wind PPA', value: 28, color: '#3B82F6' },
    { name: 'Grid (Eskom)', value: 18, color: '#EF4444' }, { name: 'Battery', value: 12, color: '#8B5CF6' },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Energy Consumed MTD" value="1.2 GWh" icon={<FiZap className="w-5 h-5" />} change="+5.4%" positive color="#7C3AED" isDark={isDark} delay={0} />
        <KPICard label="Blended Cost" value="R0.89/kWh" icon={<FiDollarSign className="w-5 h-5" />} change="-2.1%" positive color="#10B981" isDark={isDark} delay={80} />
        <KPICard label="Carbon Offset" value="3,200 tCO2" icon={<FiGlobe className="w-5 h-5" />} change="+15%" positive color="#16A34A" isDark={isDark} delay={160} />
        <KPICard label="Savings vs Grid" value="R1.8M" icon={<FiTrendingDown className="w-5 h-5" />} change="+22%" positive color="#F59E0B" isDark={isDark} delay={240} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass(isDark)} lg:col-span-2`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cost Comparison (c/kWh)</h3>
            <div className="flex gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Eskom</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> PPA</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Blended</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
              <XAxis dataKey="month" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick(isDark)} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={tooltipStyle(isDark)} />
              <Line type="monotone" dataKey="eskom" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ppa" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="blended" stroke="#4F46E5" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Energy Mix</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={mix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {mix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {mix.map(e => (
              <div key={e.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <span className="text-slate-500 dark:text-slate-400 truncate">{e.name}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-auto">{e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Upcoming Invoices</h3>
          <div className="space-y-2">
            {[{ from: 'TerraVolt Energy', amount: 'R842,000', due: '15 Apr 2026', st: 'pending' }, { from: 'BevCo Power', amount: 'R1,240,000', due: '20 Apr 2026', st: 'pending' }, { from: 'Carbon Bridge', amount: 'R125,000', due: '30 Apr 2026', st: 'paid' }].map((inv, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                <div><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{inv.from}</p><p className="text-[11px] text-slate-400">Due: {inv.due}</p></div>
                <div className="text-right">
                  <p className="text-sm font-bold mono text-slate-800 dark:text-white">{inv.amount}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${inv.st === 'paid' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{inv.st}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Offtaker Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- IPP DEVELOPER DASHBOARD ---- */
function IPPDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const projects = [
    { name: 'Limpopo Solar 75MW', done: 3, total: 5, phase: 'Construction', disbursed: 'R62.5M', pct: 60 },
    { name: 'Northern Cape Wind 120MW', done: 2, total: 5, phase: 'Grid Connection', disbursed: 'R18M', pct: 40 },
    { name: 'Hybrid Plant 50MW', done: 1, total: 5, phase: 'Land Rights', disbursed: 'R5M', pct: 20 },
    { name: 'Battery Storage 25MW', done: 0, total: 4, phase: 'Feasibility', disbursed: 'R0', pct: 0 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Projects Active" value={String(summary?.projects || 4)} icon={<FiLayers className="w-5 h-5" />} change="+1" positive color="#D97706" isDark={isDark} delay={0} />
        <KPICard label="Total Capacity" value="270 MW" icon={<FiZap className="w-5 h-5" />} change="+25 MW" positive color="#16A34A" isDark={isDark} delay={80} />
        <KPICard label="Disbursed Amount" value="R85.5M" icon={<FiDollarSign className="w-5 h-5" />} change="+R25M" positive color="#3B82F6" isDark={isDark} delay={160} />
        <KPICard label="CPs Completed" value="7/10" icon={<FiCheckCircle className="w-5 h-5" />} change="+2" positive color="#8B5CF6" isDark={isDark} delay={240} />
      </div>
      <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Project Pipeline</h3>
          <a href="/ipp" className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600">View all <FiArrowRight className="w-3 h-3" /></a>
        </div>
        <div className="space-y-4">
          {projects.map((p, i) => (
            <div key={p.name} className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/[0.04]' : 'bg-slate-50/80 border border-black/[0.03]'}`} style={{ animation: `cardFadeUp 400ms ease ${300 + i * 80}ms both` }}>
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.name}</p><p className="text-[11px] text-slate-400 mt-0.5">Phase: {p.phase} &middot; Milestones: {p.done}/{p.total}</p></div>
                <div className="text-right"><p className="text-sm font-bold mono text-slate-700 dark:text-slate-300">{p.disbursed}</p><p className="text-[11px] text-slate-400">disbursed</p></div>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, backgroundColor: config.accentHex }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Conditions Precedent</h3>
          <div className="space-y-2">
            {[{ item: 'Insurance policies (Limpopo Solar)', st: 'outstanding' }, { item: 'Land lease (Northern Cape Wind)', st: 'outstanding' }, { item: 'Water Use Licence (Hybrid)', st: 'outstanding' }, { item: 'EPC Contract (Limpopo Solar)', st: 'satisfied' }, { item: 'Grid Connection (Limpopo Solar)', st: 'satisfied' }].map(c => (
              <div key={c.item} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {c.st === 'satisfied' ? <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <FiClock className="w-4 h-4 text-amber-500 shrink-0" />}
                  <span className="text-xs text-slate-700 dark:text-slate-300">{c.item}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.st === 'satisfied' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{c.st}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">IPP Developer Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- REGULATOR DASHBOARD ---- */
function RegulatorDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const compData = [
    { month: 'Jan', kyc: 95, licence: 98, aml: 97 }, { month: 'Feb', kyc: 96, licence: 97, aml: 98 },
    { month: 'Mar', kyc: 97, licence: 99, aml: 96 }, { month: 'Apr', kyc: 97.2, licence: 99, aml: 99 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Registered Participants" value={String(summary?.participants || 8)} icon={<FiUsers className="w-5 h-5" />} change="+3" positive color="#DC2626" isDark={isDark} delay={0} />
        <KPICard label="Trades Today" value={String(summary?.pending_trades || 47)} icon={<FiActivity className="w-5 h-5" />} change="+23%" positive color="#3B82F6" isDark={isDark} delay={80} />
        <KPICard label="Compliance Rate" value="97.2%" icon={<FiShield className="w-5 h-5" />} change="+0.4%" positive color="#10B981" isDark={isDark} delay={160} />
        <KPICard label="AML Flags" value="3" icon={<FiAlertTriangle className="w-5 h-5" />} change="-2" positive color="#F59E0B" isDark={isDark} delay={240} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass(isDark)} lg:col-span-2`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Compliance Trends (%)</h3>
            <div className="flex gap-3 text-[10px] font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> KYC</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Licences</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> AML</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={compData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
              <XAxis dataKey="month" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
              <YAxis domain={[90, 100]} tick={axisTick(isDark)} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={tooltipStyle(isDark)} />
              <Line type="monotone" dataKey="kyc" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="licence" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="aml" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <SemiGauge value={97} label="Compliance Rate" sublabel="Across all participants" accentHex={config.accentHex} size={180} />
          <div className="mt-4 space-y-2">
            {[{ l: 'KYC Pending', v: '2', w: true }, { l: 'Licences Expiring (90d)', v: '1', w: true }, { l: 'Statutory Overrides', v: '0', w: false }, { l: 'POPIA Requests', v: '0', w: false }].map(m => (
              <div key={m.l} className="flex items-center justify-between text-xs"><span className="text-slate-400">{m.l}</span><span className={`font-semibold mono ${m.w && Number(m.v) > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>{m.v}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Recent AML Alerts</h3>
          <div className="space-y-2">
            {[{ entity: 'Unknown Trader X', flag: 'High-volume wash trading pattern', sev: 'high', time: '2 hrs ago' }, { entity: 'BevCo Power', flag: 'Unusual cross-border transfer', sev: 'medium', time: '1 day ago' }, { entity: 'Carbon Bridge', flag: 'Rapid credit cycling', sev: 'low', time: '3 days ago' }].map((a, i) => (
              <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{a.entity}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.sev === 'high' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : a.sev === 'medium' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>{a.sev}</span>
                </div>
                <p className="text-[11px] text-slate-400">{a.flag}</p>
                <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Regulator Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- ADMIN DASHBOARD ---- */
function AdminDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const apiData = [
    { hour: '00', calls: 1200 }, { hour: '04', calls: 800 }, { hour: '08', calls: 4500 },
    { hour: '12', calls: 8200 }, { hour: '16', calls: 6100 }, { hour: '20', calls: 3200 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Platform Users" value={String(summary?.participants || 8)} icon={<FiUsers className="w-5 h-5" />} change="+3" positive color="#525252" isDark={isDark} delay={0} />
        <KPICard label="API Calls Today" value="48.2K" icon={<FiServer className="w-5 h-5" />} change="+18%" positive color="#3B82F6" isDark={isDark} delay={80} />
        <KPICard label="Uptime" value="99.97%" icon={<FiActivity className="w-5 h-5" />} change="+0.02%" positive color="#10B981" isDark={isDark} delay={160} />
        <KPICard label="Revenue MTD" value="R2.1M" icon={<FiDollarSign className="w-5 h-5" />} change="+14%" positive color="#8B5CF6" isDark={isDark} delay={240} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass(isDark)} lg:col-span-2`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">API Traffic (requests/hr)</h3>
            <span className="text-xs text-slate-400">Last 24h</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={apiData}>
              <defs><linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
              <XAxis dataKey="hour" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick(isDark)} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}K`} />
              <Tooltip contentStyle={tooltipStyle(isDark)} />
              <Area type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} fill="url(#apiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <SemiGauge value={99} label="Platform Uptime" sublabel="Last 30 days SLA" accentHex={config.accentHex} size={180} />
          <div className="mt-4 space-y-2">
            {[{ l: 'Active Sessions', v: '24' }, { l: 'DB Size', v: '1.2 GB' }, { l: 'Worker CPU (avg)', v: '12ms' }, { l: 'Error Rate (24h)', v: '0.03%' }].map(m => (
              <div key={m.l} className="flex items-center justify-between text-xs"><span className="text-slate-400">{m.l}</span><span className="font-semibold text-slate-700 dark:text-slate-300 mono">{m.v}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">System Status</h3>
          <div className="space-y-2">
            {[{ s: 'D1 Database', lat: '4ms' }, { s: 'R2 Storage', lat: '12ms' }, { s: 'KV Cache', lat: '2ms' }, { s: 'Durable Objects', lat: '8ms' }, { s: 'Cron Scheduler', lat: 'N/A' }].map(sv => (
              <div key={sv.s} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-slate-700 dark:text-slate-300">{sv.s}</span></div>
                <span className="text-xs text-slate-400 mono">{sv.lat}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Admin Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- LENDER DASHBOARD (carbon_fund / lender) ---- */
function LenderDashboard({ summary, isDark, config }: { summary: DashboardSummary | null; isDark: boolean; config: ReturnType<typeof getRoleConfig> }) {
  const portData = [
    { month: 'Jan', exposure: 180, disbursed: 62, collected: 45 }, { month: 'Feb', exposure: 195, disbursed: 85, collected: 58 },
    { month: 'Mar', exposure: 210, disbursed: 105, collected: 72 }, { month: 'Apr', exposure: 225, disbursed: 120, collected: 88 },
  ];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Exposure" value="R225M" icon={<FiDollarSign className="w-5 h-5" />} change="+7.1%" positive color="#3B82F6" isDark={isDark} delay={0} />
        <KPICard label="Active Facilities" value={String(summary?.projects || 4)} icon={<FiLayers className="w-5 h-5" />} change="+1" positive color="#10B981" isDark={isDark} delay={80} />
        <KPICard label="NPL Ratio" value="0.0%" icon={<FiShield className="w-5 h-5" />} change="0%" positive color="#16A34A" isDark={isDark} delay={160} />
        <KPICard label="Avg DSCR" value="1.45x" icon={<FiBarChart2 className="w-5 h-5" />} change="+0.05" positive color="#8B5CF6" isDark={isDark} delay={240} />
      </div>
      <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lending Portfolio (R millions)</h3>
          <div className="flex gap-3 text-[10px] font-medium">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Exposure</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Disbursed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Collected</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={portData}>
            <defs><linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(isDark)} />
            <XAxis dataKey="month" tick={axisTick(isDark)} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick(isDark)} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={tooltipStyle(isDark)} formatter={(v: number) => [`R${v}M`, '']} />
            <Area type="monotone" dataKey="exposure" stroke="#3B82F6" strokeWidth={2} fill="url(#expGrad)" />
            <Line type="monotone" dataKey="disbursed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="collected" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Disbursement Requests</h3>
          <div className="space-y-2">
            {[{ proj: 'Limpopo Solar 75MW', amt: 'R37.5M', ms: 'Equipment Procurement', st: 'approved' }, { proj: 'Northern Cape Wind', amt: 'R42M', ms: 'Foundation Construction', st: 'pending' }, { proj: 'Hybrid Plant', amt: 'R15M', ms: 'Land Acquisition', st: 'pending' }].map((d, i) => (
              <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.proj}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.st === 'approved' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{d.st}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400"><span>{d.ms}</span><span className="font-semibold text-slate-600 dark:text-slate-300 mono">{d.amt}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className={cardClass(isDark)} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Lender Actions</h3>
          <QuickActions actions={config.actions} accentHex={config.accentHex} />
        </div>
      </div>
    </>
  );
}

/* ---- MAIN DASHBOARD SHELL ---- */
export default function Dashboard() {
  const toast = useToast();
  const { activeRole } = useAuthStore();
  const { isDark } = useTheme();
  const role = (activeRole || 'trader') as PlatformRole;
  const config = getRoleConfig(role);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await dashboardAPI.summary();
        if (!cancelled && res.data?.data) setSummary(res.data.data);
      } catch {
        if (!cancelled) toast.error('Failed to load dashboard data');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [role]);

  const animKey = useMemo(() => `${role}-${Date.now()}`, [role]);
  const dashboardRole = (() => {
    const r = role as string;
    if (r === 'lender' || r === 'carbon_fund') return 'lender';
    if (r === 'grid_operator') return 'regulator';
    return r;
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={animKey} className="space-y-6">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400"><FiLoader className="w-4 h-4 animate-spin" /> Loading dashboard data...</div>
      )}
      {!loading && !summary && (
        <div className={`cp-card !p-12 text-center ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`}>
          <FiTrendingUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No dashboard data yet</h3>
          <p className="text-sm text-slate-400 mt-1">Get started by creating trades, contracts, or carbon credits.</p>
        </div>
      )}
      <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s your <span className="font-semibold capitalize" style={{ color: config.accentHex }}>{config.label}</span> dashboard
        </p>
      </div>
      {dashboardRole === 'generator' && <GeneratorDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'trader' && <TraderDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'offtaker' && <OfftakerDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'ipp_developer' && <IPPDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'regulator' && <RegulatorDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'admin' && <AdminDashboard summary={summary} isDark={isDark} config={config} />}
      {dashboardRole === 'lender' && <LenderDashboard summary={summary} isDark={isDark} config={config} />}
    </motion.div>
  );
}
