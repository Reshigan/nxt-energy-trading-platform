import React, { useState, useEffect } from 'react';
import { FiShield, FiAlertTriangle, FiTrendingDown } from 'react-icons/fi';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { aiAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const exposureData = [
  { name: 'Eskom', exposure: 4200, limit: 5000 },
  { name: 'BevCo', exposure: 2800, limit: 4000 },
  { name: 'TerraVolt', exposure: 1900, limit: 3000 },
  { name: 'GreenFund', exposure: 1200, limit: 2500 },
  { name: 'Carbon Bridge', exposure: 800, limit: 2000 },
];

const drawdownData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  drawdown: -(2 + (i % 5) * 0.8 + (i > 15 && i < 22 ? 5 : 0)),
}));

const stressScenarios = [
  { name: 'Load Shedding Stage 6', impact: '-R2.4M', probability: '15%', severity: 'High' },
  { name: 'Carbon Tax +50%', impact: '+R1.8M', probability: '20%', severity: 'Medium' },
  { name: 'Rand Devaluation 20%', impact: '-R3.1M', probability: '10%', severity: 'Critical' },
  { name: 'Solar Oversupply', impact: '-R890K', probability: '35%', severity: 'Low' },
  { name: 'NERSA Tariff Freeze', impact: '-R1.2M', probability: '25%', severity: 'Medium' },
];

const greeks = [
  { name: 'Delta', value: '0.65', desc: 'Portfolio sensitivity to price', change: '+0.03' },
  { name: 'Gamma', value: '0.12', desc: 'Rate of delta change', change: '-0.01' },
  { name: 'Theta', value: '-R42K/day', desc: 'Time decay exposure', change: '-R3K' },
  { name: 'Vega', value: 'R180K/1%', desc: 'Volatility sensitivity', change: '+R12K' },
];

const severityColors: Record<string, string> = {
  Critical: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  High: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Low: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export default function RiskDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const { user } = useAuthStore();
  const [riskMetrics, setRiskMetrics] = useState(greeks);

  useEffect(() => {
    (async () => {
      try {
        const pid = user?.id || 'default';
        const res = await aiAPI.risk(pid);
        if (res.data?.data?.greeks?.length) setRiskMetrics(res.data.data.greeks);
      } catch {
      toast.error('Failed to load data');
    }
    })();
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Risk Dashboard</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">VaR, Greeks, stress tests & exposure monitoring</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all flex items-center gap-2" aria-label="Alert Triangle">
          <FiAlertTriangle className="w-4 h-4" /> Run Stress Test
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Value at Risk (95%)', value: '-R1.24M', sub: '1-day holding period', icon: FiShield, color: 'text-blue-500' },
          { label: 'Value at Risk (99%)', value: '-R2.18M', sub: '1-day holding period', icon: FiShield, color: 'text-purple-500' },
          { label: 'Conditional VaR', value: '-R3.42M', sub: 'Expected shortfall beyond VaR', icon: FiTrendingDown, color: 'text-orange-500' },
        ].map((v, i) => (
          <div key={v.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
            <div className="flex items-center gap-2 mb-3"><v.icon className={`w-4 h-4 ${v.color}`} /><span className="text-xs text-slate-400">{v.label}</span></div>
            <p className="text-2xl font-bold text-red-500 mono">{v.value}</p>
            <p className="text-xs text-slate-400 mt-1">{v.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {riskMetrics.map((g, i) => (
          <div key={g.name} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 60}ms both` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{g.name}</span>
              <span className="text-[11px] font-semibold text-blue-500">{g.change}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mono">{g.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{g.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Counterparty Exposure</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={exposureData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis type="number" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="exposure" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Exposure (R'000)" />
              <Bar dataKey="limit" fill={c('rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)')} radius={[0, 6, 6, 0]} name="Limit (R'000)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Portfolio Drawdown (30D)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={drawdownData}>
              <defs><linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit="%" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={2} fill="url(#ddGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Stress Test Scenarios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Scenario</th>
              <th className="text-right py-2 font-medium">Portfolio Impact</th>
              <th className="text-right py-2 font-medium">Probability</th>
              <th className="text-left py-2 font-medium">Severity</th>
            </tr></thead>
            <tbody>{stressScenarios.map(s => (
              <tr key={s.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{s.name}</td>
                <td className={`py-3 text-right font-bold mono ${s.impact.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{s.impact}</td>
                <td className="py-3 text-right text-slate-500 mono">{s.probability}</td>
                <td className="py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${severityColors[s.severity]}`}>{s.severity}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
