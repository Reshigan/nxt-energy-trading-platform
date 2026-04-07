import React, { useState, useEffect } from 'react';
import { FiCpu, FiTrendingUp, FiShield, FiZap, FiSend } from 'react-icons/fi';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { aiAPI } from '../lib/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const radarData = [
  { metric: 'Return', current: 82, optimal: 91 }, { metric: 'Risk', current: 68, optimal: 45 },
  { metric: 'Liquidity', current: 75, optimal: 88 }, { metric: 'Diversification', current: 71, optimal: 85 },
  { metric: 'Carbon Score', current: 88, optimal: 95 }, { metric: 'Compliance', current: 96, optimal: 98 },
];
const scenarios = [
  { name: 'Min Cost', ret: '+14.2%', risk: 'Medium', carbon: '-8%', color: '#3B82F6', best: false },
  { name: 'Min Carbon', ret: '+11.8%', risk: 'Low', carbon: '-32%', color: '#10B981', best: true },
  { name: 'Max Reliability', ret: '+12.6%', risk: 'Low', carbon: '-12%', color: '#F59E0B', best: false },
  { name: 'Balanced', ret: '+13.1%', risk: 'Medium', carbon: '-18%', color: '#8B5CF6', best: false },
];
const forecastData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  current: 24.8 + i * 0.8 + (i % 3) * 0.5,
  optimised: 24.8 + i * 1.2 + (i % 2) * 0.4,
}));
const allocationData = [
  { name: 'Solar PPAs', value: 34 }, { name: 'Wind', value: 25 },
  { name: 'Carbon', value: 17 }, { name: 'Gas', value: 15 }, { name: 'RECs', value: 9 },
];

export default function Portfolio() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hello! I can help optimise your energy portfolio. Ask about rebalancing strategies or carbon reduction scenarios.' },
  ]);
  const [scenarioData, setScenarioData] = useState(scenarios);

  useEffect(() => {
    (async () => {
      try {
        const res = await aiAPI.history();
        if (res.data?.data?.scenarios?.length) setScenarioData(res.data.data.scenarios);
      } catch { /* use demo data */ }
    })();
  }, []);

  const send = () => {
    if (!chatInput.trim()) return;
    setMessages(p => [...p, { role: 'user', text: chatInput },
      { role: 'assistant', text: 'Based on current market conditions, I recommend shifting 8% from gas forwards to solar PPAs. This would improve your carbon score by 12 points while maintaining similar returns.' }]);
    setChatInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">AI Portfolio</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">AI-powered portfolio optimisation & analysis</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-all flex items-center gap-2">
          <FiCpu className="w-4 h-4" /> Run AI Optimisation
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Portfolio Value', value: 'R24.8M', change: '+12.4%', icon: FiTrendingUp },
          { label: 'AI Score', value: '78/100', change: '+5', icon: FiCpu },
          { label: 'Risk Rating', value: 'Medium', change: 'Stable', icon: FiShield },
          { label: 'Carbon Intensity', value: '0.42 t/MWh', change: '-8%', icon: FiZap },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
            <kpi.icon className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-400">{kpi.label}</p>
              <span className="text-xs font-bold text-emerald-500">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Portfolio Score</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={c('#1e293b', '#e2e8f0')} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} />
                  <Radar name="Current" dataKey="current" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Optimal" dataKey="optimal" stroke="#10B981" fill="#10B981" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Current Allocation</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart><Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie><Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {allocationData.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-slate-500 dark:text-slate-400">{a.name} {a.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
            {scenarioData.map((s, i) => (
              <div key={s.name} className={`cp-card !p-4 relative ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${s.best ? 'ring-2 ring-emerald-500/30' : ''}`}
                style={{ animation: `cardFadeUp 400ms ease ${500 + i * 60}ms both` }}>
                {s.best && <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">BEST</span>}
                <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                <p className="text-lg font-bold text-emerald-500 mono mt-1">{s.ret}</p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                  <span>Risk: {s.risk}</span><span>CO2: {s.carbon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">12-Month Forecast</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="current" stroke="#3B82F6" strokeWidth={2} dot={false} name="Current" />
                <Line type="monotone" dataKey="optimised" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Optimised" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`cp-card !p-0 flex flex-col h-fit ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <div className={`px-5 py-4 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <div className="flex items-center gap-2">
              <FiCpu className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Assistant</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">Workers AI</span>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-md'
                    : c('bg-white/[0.04] text-slate-300 rounded-bl-md', 'bg-slate-100 text-slate-700 rounded-bl-md')
                }`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className={`p-3 border-t ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about your portfolio..."
                className={`flex-1 px-3.5 py-2 rounded-xl text-sm outline-none ${c('bg-white/[0.04] text-white placeholder-slate-500 border border-white/[0.06]', 'bg-slate-50 text-slate-800 placeholder-slate-400 border border-black/[0.06]')}`} />
              <button onClick={send} className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"><FiSend className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
