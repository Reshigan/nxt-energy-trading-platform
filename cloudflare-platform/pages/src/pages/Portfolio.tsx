import React, { useState, useEffect, useCallback } from 'react';
import { FiCpu, FiTrendingUp, FiShield, FiZap, FiSend, FiRefreshCw, FiLoader } from '../lib/fi-icons-shim';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { aiAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface RadarPoint { metric: string; current: number; optimal: number; }
interface Scenario { name: string; ret: string; risk: string; carbon: string; color: string; best: boolean; }
interface ForecastPoint { month: string; current: number; optimised: number; }
interface Allocation { name: string; value: number; }

export default function Portfolio() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [showOptimise, setShowOptimise] = useState(false);
  const [optimiseStrategy, setOptimiseStrategy] = useState('balanced');
  const [optimising, setOptimising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [scenarioData, setScenarioData] = useState<Scenario[]>([]);
  const [radarData, setRadarData] = useState<RadarPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [allocationData, setAllocationData] = useState<Allocation[]>([]);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await aiAPI.history();
      const d = res.data?.data;
      if (d?.scenarios) setScenarioData(d.scenarios);
      if (d?.radar) setRadarData(d.radar);
      if (d?.forecast) setForecastData(d.forecast);
      if (d?.allocation) setAllocationData(d.allocation);
      if (d?.portfolio_value) setPortfolioValue(d.portfolio_value);
      if (d?.messages) setMessages(d.messages);
    } catch { setError('Failed to load portfolio data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOptimise = async () => {
    setOptimising(true);
    try {
      const res = await aiAPI.optimise({ strategy: optimiseStrategy });
      if (res.data?.success) { toast.success('Portfolio optimised with ' + optimiseStrategy + ' strategy'); setShowOptimise(false); loadData(); }
      else toast.error(res.data?.error || 'Optimisation failed');
    } catch { toast.error('Optimisation failed'); }
    setOptimising(false);
  };

  const send = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages(p => [...p, { role: 'user', text: userMsg }]);
    setChatInput('');
    setSending(true);
    try {
      const res = await aiAPI.chat(userMsg);
      if (res.data?.data?.reply) setMessages(p => [...p, { role: 'assistant', text: res.data.data.reply }]);
      else setMessages(p => [...p, { role: 'assistant', text: 'Sorry, I could not process that request.' }]);
    } catch { toast.error('AI chat failed'); setMessages(p => [...p, { role: 'assistant', text: 'Connection error. Please try again.' }]); }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="AI Portfolio page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">AI Portfolio</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">AI-powered portfolio optimisation & analysis</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-all flex items-center gap-2" aria-label="Refresh portfolio data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (<div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>) : !scenarioData.length && !allocationData.length && !radarData.length && !forecastData.length && portfolioValue === 0 ? (
        <div className={`cp-card !p-12 text-center ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <FiCpu className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No portfolio data yet</h3>
          <p className="text-sm text-slate-400 mt-1">Use the AI Assistant below to start optimising your portfolio.</p>
        </div>
      ) : (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Portfolio Value', value: portfolioValue > 0 ? formatZAR(portfolioValue) : '--', icon: FiTrendingUp },
          { label: 'Scenarios', value: `${scenarioData.length}`, icon: FiCpu },
          { label: 'Allocations', value: `${allocationData.length}`, icon: FiShield },
          { label: 'Forecast Points', value: `${forecastData.length}`, icon: FiZap },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
            <kpi.icon className="w-5 h-5 text-indigo-500 mb-2" aria-hidden="true" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
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
              <button onClick={send} disabled={sending || !chatInput.trim()} className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50" aria-label="Send message">{sending ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}</button>
            </div>
          </div>
        </div>
      </div>
      </>)}

      <Modal isOpen={showOptimise} onClose={() => setShowOptimise(false)} title="Optimise Portfolio">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Run AI-powered portfolio optimisation to rebalance your positions.</p>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Strategy</label>
            <select value={optimiseStrategy} onChange={e => setOptimiseStrategy(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
              <option value="balanced">Balanced</option><option value="aggressive">Aggressive Growth</option><option value="conservative">Conservative</option><option value="green">Green Focus</option>
            </select></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowOptimise(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleOptimise} loading={optimising}>Optimise</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
