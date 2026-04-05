import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiSend, FiCpu } from 'react-icons/fi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../lib/store';
import { aiAPI } from '../lib/api';

const CHART_COLORS = ['#d4e157', '#4caf50', '#42a5f5', '#ff9800', '#ef5350', '#ab47bc'];

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Portfolio() {
  const { activeRole } = useAuthStore();
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I\'m your AI portfolio advisor. Ask me about your energy mix, optimisation strategies, risk metrics, or carbon impact. Try: "What\'s my current carbon intensity?" or "How can I reduce cost by 10%?"' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [optimising, setOptimising] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await aiAPI.chat(userMsg);
      const reply = res.data?.data?.response || res.data?.data?.reply || 'I can help you optimise your energy portfolio. Try asking about cost reduction, carbon targets, or supply reliability.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Based on your current portfolio: Solar (35%), Wind (25%), Carbon (15%), Gas (10%), Battery (10%), Hydro (5%). Your blended cost is R0.85/kWh with 142g CO2/kWh carbon intensity. I recommend increasing wind allocation to 30% to reduce cost by ~8% while maintaining reliability above 95%.' }]);
    }
    setChatLoading(false);
  };

  const handleOptimise = async () => {
    setOptimising(true);
    try {
      await aiAPI.optimise({
        demand_mwh: 1000,
        sources: mixData.map((m) => ({
          name: m.name.toLowerCase(),
          available_mwh: m.value * 10,
          cost_per_mwh_cents: Math.floor(Math.random() * 5000 + 3000),
          carbon_intensity: Math.floor(Math.random() * 200),
          reliability_pct: Math.floor(Math.random() * 20 + 80),
        })),
        algorithm: scenarios[selectedScenario].name.toLowerCase().replace(' ', '_'),
      });
    } catch { /* demo mode */ }
    setOptimising(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">AI Portfolio Optimiser</h1>
        <div className="flex gap-2">
          <button onClick={handleOptimise} disabled={optimising}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4e157] to-[#b8c43a] text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50">
            <FiCpu className="w-4 h-4" /> {optimising ? 'Optimising...' : 'Run AI Optimisation'}
          </button>
          <button onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showChat ? 'bg-[#d4e157]/20 text-[#d4e157] border border-[#d4e157]/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            <FiSend className="w-4 h-4" /> AI Chat
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showChat ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Main Content */}
        <div className={`space-y-6 ${showChat ? 'lg:col-span-2' : ''}`}>
          {/* 6 Accent Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: 'Portfolio Value', value: 'R4.2M', color: 'text-[#d4e157]' },
              { label: 'YTD Return', value: '+12.4%', color: 'text-emerald-400' },
              { label: 'Sharpe Ratio', value: '1.42', color: 'text-blue-400' },
              { label: 'Max Drawdown', value: '-3.2%', color: 'text-red-400' },
              { label: 'ESG Score', value: '87/100', color: 'text-cyan-400' },
              { label: 'Active Positions', value: '14', color: 'text-orange-400' },
            ].map((m) => (
              <div key={m.label} className="chart-glass p-3 text-center">
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-slate-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="chart-glass p-6">
              <h3 className="text-sm font-semibold mb-4">Energy Mix</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={mixData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-glass p-6">
              <h3 className="text-sm font-semibold mb-4">Portfolio Score</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={scoreData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Score" dataKey="value" stroke="#d4e157" fill="#d4e157" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-glass p-6">
              <h3 className="text-sm font-semibold mb-4">12-Month Forecast</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#777" fontSize={11} />
                  <YAxis stroke="#777" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="conservative" stroke="#42a5f5" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="moderate" stroke="#d4e157" dot={false} />
                  <Line type="monotone" dataKey="aggressive" stroke="#ef5350" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="#4caf50" strokeWidth={2} dot={{ fill: '#4caf50', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-[10px] text-slate-400 justify-center">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> Conservative</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#d4e157] inline-block" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" /> Aggressive</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Actual</span>
              </div>
            </div>
          </div>

          {/* 4-Scenario Comparison */}
          <div className="chart-glass p-6">
            <h3 className="text-sm font-semibold mb-4">AI Optimisation Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {scenarios.map((s, i) => (
                <div key={s.name}
                  onClick={() => setSelectedScenario(i)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${selectedScenario === i ? 'bg-[#d4e157]/10 border border-[#d4e157]/30' : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'}`}>
                  <div className="font-semibold text-sm mb-2">{s.name}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Return</span><span className="text-emerald-400 font-medium">{s.return}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Risk</span><span>{s.risk}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Sharpe</span><span className="text-[#d4e157] font-medium">{s.sharpe}</span></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        {showChat && (
          <div className="chart-glass flex flex-col h-[calc(100vh-12rem)]">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <FiCpu className="w-4 h-4 text-[#d4e157]" />
              <span className="text-sm font-semibold">AI Portfolio Advisor</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#d4e157]/20 text-[#d4e157]' : 'bg-slate-800/50 text-slate-300'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 px-3 py-2 rounded-xl text-sm text-slate-400">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleChat(); }}
                  className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-[#d4e157]"
                  placeholder="Ask about your portfolio..."
                />
                <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-[#d4e157] text-slate-900 rounded-lg disabled:opacity-50">
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {['What\'s my carbon intensity?', 'Reduce cost by 10%', 'Compare min_cost vs balanced'].map((q) => (
                  <button key={q} onClick={() => { setChatInput(q); }}
                    className="px-2 py-1 rounded text-[10px] bg-slate-800/50 text-slate-400 hover:text-white whitespace-nowrap">
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
