import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiCpu } from 'react-icons/fi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../lib/store';
import { aiAPI } from '../lib/api';
import { useThemeClasses } from '../hooks/useThemeClasses';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const mixData = [
  { name: 'Solar', value: 35 }, { name: 'Wind', value: 25 },
  { name: 'Carbon', value: 15 }, { name: 'Gas', value: 10 },
  { name: 'Battery', value: 10 }, { name: 'Hydro', value: 5 },
];

const scoreData = [
  { metric: 'Return', value: 78 }, { metric: 'Risk', value: 65 },
  { metric: 'Diversification', value: 82 }, { metric: 'Liquidity', value: 70 },
  { metric: 'ESG Score', value: 90 }, { metric: 'Volatility', value: 55 },
];

const forecastData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  conservative: 100 + i * 2 + Math.random() * 3,
  moderate: 100 + i * 3.5 + Math.random() * 5,
  aggressive: 100 + i * 5 + Math.random() * 8,
  actual: i < 4 ? 100 + i * 3.2 + Math.random() * 4 : undefined,
}));

const scenarios = [
  { name: 'Min Cost', return: '12.4%', risk: 'Medium', sharpe: '1.42', description: 'Optimise for lowest blended cost' },
  { name: 'Min Carbon', return: '10.8%', risk: 'Medium-High', sharpe: '1.25', description: 'Minimise carbon intensity' },
  { name: 'Max Reliability', return: '11.2%', risk: 'Low-Medium', sharpe: '1.55', description: 'Maximise supply reliability' },
  { name: 'Balanced', return: '13.1%', risk: 'Low', sharpe: '1.68', description: 'Weighted balance of all factors' },
];

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export default function Portfolio() {
  const { activeRole } = useAuthStore();
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "I'm your AI portfolio advisor. Ask me about your energy mix, optimisation strategies, risk metrics, or carbon impact." },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [optimising, setOptimising] = useState(false);
  const tc = useThemeClasses();

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await aiAPI.chat(userMsg);
      const reply = res.data?.data?.response || res.data?.data?.reply || 'I can help you optimise your energy portfolio.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Based on your current portfolio: Solar (35%), Wind (25%), Carbon (15%), Gas (10%), Battery (10%), Hydro (5%). Your blended cost is R0.85/kWh with 142g CO2/kWh carbon intensity.' }]);
    }
    setChatLoading(false);
  };

  const handleOptimise = async () => {
    setOptimising(true);
    try {
      await aiAPI.optimise({
        demand_mwh: 1000,
        sources: mixData.map((m) => ({ name: m.name.toLowerCase(), available_mwh: m.value * 10, cost_per_mwh_cents: Math.floor(Math.random() * 5000 + 3000), carbon_intensity: Math.floor(Math.random() * 200), reliability_pct: Math.floor(Math.random() * 20 + 80) })),
        algorithm: scenarios[selectedScenario].name.toLowerCase().replace(' ', '_'),
      });
    } catch { /* demo mode */ }
    setOptimising(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>AI Portfolio Optimiser</h1>
        <div className="flex gap-2">
          <button onClick={handleOptimise} disabled={optimising}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${tc.btnPrimary} disabled:opacity-50`}>
            <FiCpu className="w-4 h-4" /> {optimising ? 'Optimising...' : 'Run AI Optimisation'}
          </button>
          <button onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showChat ? tc.tabActive : tc.btnSecondary}`}>
            <FiSend className="w-4 h-4" /> AI Chat
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showChat ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={`space-y-6 ${showChat ? 'lg:col-span-2' : ''}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: 'Portfolio Value', value: 'R4.2M', color: 'text-blue-500' },
              { label: 'YTD Return', value: '+12.4%', color: 'text-emerald-500' },
              { label: 'Sharpe Ratio', value: '1.42', color: 'text-indigo-500' },
              { label: 'Max Drawdown', value: '-3.2%', color: 'text-red-500' },
              { label: 'ESG Score', value: '87/100', color: 'text-cyan-500' },
              { label: 'Active Positions', value: '14', color: 'text-amber-500' },
            ].map((m) => (
              <div key={m.label} className={`rounded-2xl p-3 text-center ${tc.cardBg}`}>
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className={`text-[10px] mt-1 ${tc.textMuted}`}>{m.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
              <h3 className={`text-sm font-semibold mb-4 ${tc.textPrimary}`}>Energy Mix</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={mixData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
              <h3 className={`text-sm font-semibold mb-4 ${tc.textPrimary}`}>Portfolio Score</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={scoreData}>
                  <PolarGrid stroke={tc.chartGrid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: tc.chartAxis, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
              <h3 className={`text-sm font-semibold mb-4 ${tc.textPrimary}`}>12-Month Forecast</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
                  <XAxis dataKey="month" stroke={tc.chartAxis} fontSize={11} />
                  <YAxis stroke={tc.chartAxis} fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="conservative" stroke="#3b82f6" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="moderate" stroke="#8b5cf6" dot={false} />
                  <Line type="monotone" dataKey="aggressive" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className={`flex gap-4 mt-2 text-[10px] justify-center ${tc.textMuted}`}>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Conservative</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> Aggressive</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actual</span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
            <h3 className={`text-sm font-semibold mb-4 ${tc.textPrimary}`}>AI Optimisation Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {scenarios.map((s, i) => (
                <div key={s.name} onClick={() => setSelectedScenario(i)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedScenario === i
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : tc.isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div className={`font-semibold text-sm mb-2 ${tc.textPrimary}`}>{s.name}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className={tc.textMuted}>Return</span><span className="text-emerald-500 font-medium">{s.return}</span></div>
                    <div className="flex justify-between"><span className={tc.textMuted}>Risk</span><span className={tc.textSecondary}>{s.risk}</span></div>
                    <div className="flex justify-between"><span className={tc.textMuted}>Sharpe</span><span className="text-blue-500 font-medium">{s.sharpe}</span></div>
                  </div>
                  <p className={`text-[10px] mt-2 ${tc.textMuted}`}>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showChat && (
          <div className={`rounded-2xl flex flex-col h-[calc(100vh-12rem)] ${tc.cardBg}`}>
            <div className={`px-4 py-3 border-b flex items-center gap-2 ${tc.border}`}>
              <FiCpu className="w-4 h-4 text-blue-500" />
              <span className={`text-sm font-semibold ${tc.textPrimary}`}>AI Portfolio Advisor</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : tc.isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className={`px-3 py-2 rounded-xl text-sm ${tc.isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
            <div className={`p-3 border-t ${tc.border}`}>
              <div className="flex gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChat(); }}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm ${tc.input}`}
                  placeholder="Ask about your portfolio..." />
                <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50">
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {["What's my carbon intensity?", 'Reduce cost by 10%', 'Compare min_cost vs balanced'].map((q) => (
                  <button key={q} onClick={() => { setChatInput(q); }}
                    className={`px-2 py-1 rounded text-[10px] whitespace-nowrap ${tc.btnSecondary}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
