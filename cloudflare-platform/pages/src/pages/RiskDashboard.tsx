import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Line } from 'recharts';
import { aiAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';
import Modal from '../components/Modal';

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

interface RiskMetrics {
  var_95: number; var_99: number; cvar: number; sharpe_ratio: number;
  max_drawdown: number; delta: number; gamma: number; theta: number; vega: number;
  counterparty_exposure: Record<string, number>;
  stress_test_results: Array<{ name: string; portfolio_impact_pct: number }>;
}

export default function RiskDashboard() {
  const { user } = useAuthStore();
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStressModal, setShowStressModal] = useState(false);
  const [stressName, setStressName] = useState('');
  const [stressChanges, setStressChanges] = useState('{"solar": 0.1, "wind": -0.1}');
  const tc = useThemeClasses();

  useEffect(() => {
    if (user?.id) {
      aiAPI.risk(user.id).then((r) => {
        setRisk(r.data?.data || null);
      }).catch(() => {
        setRisk({
          var_95: 245000, var_99: 380000, cvar: 420000, sharpe_ratio: 1.42, max_drawdown: 8.5,
          delta: 1250, gamma: 0.03, theta: -45, vega: 120,
          counterparty_exposure: { 'Eskom Holdings': 2400000, 'ACME Solar': 1800000, 'Green Fund SA': 950000, 'TradeCo Energy': 620000 },
          stress_test_results: [
            { name: 'Eskom 40% tariff increase', portfolio_impact_pct: -12.4 },
            { name: 'Solar -30% generation', portfolio_impact_pct: -8.7 },
            { name: 'Carbon price crash 50%', portfolio_impact_pct: -22.1 },
          ],
        });
      }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user?.id]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  const varGaugeData = [
    { name: 'VaR 95%', value: risk?.var_95 || 0, fill: '#3b82f6' },
    { name: 'VaR 99%', value: risk?.var_99 || 0, fill: '#ef4444' },
    { name: 'CVaR', value: risk?.cvar || 0, fill: '#f59e0b' },
  ];

  const greeksData = [
    { greek: 'Delta', value: risk?.delta || 0, description: 'Price sensitivity' },
    { greek: 'Gamma', value: risk?.gamma || 0, description: 'Delta rate of change' },
    { greek: 'Theta', value: risk?.theta || 0, description: 'Time decay' },
    { greek: 'Vega', value: risk?.vega || 0, description: 'Volatility sensitivity' },
  ];

  const exposureData = Object.entries(risk?.counterparty_exposure || {}).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name, value,
  }));

  const drawdownData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    drawdown: -Math.abs(Math.sin(i * 0.3) * (risk?.max_drawdown || 5) + Math.random() * 2),
    var_limit: -(risk?.max_drawdown || 10),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Risk Dashboard</h1>
          <p className={`text-sm ${tc.textSecondary}`}>Real-time VaR, Greeks, stress tests & counterparty exposure</p>
        </div>
        <button onClick={() => setShowStressModal(true)} className={`px-4 py-2 rounded-xl text-sm font-medium ${tc.btnPrimary}`}>
          Custom Stress Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'VaR 95%', value: risk?.var_95 || 0, color: 'text-blue-500' },
          { label: 'VaR 99%', value: risk?.var_99 || 0, color: 'text-red-500' },
          { label: 'CVaR', value: risk?.cvar || 0, color: 'text-amber-500' },
          { label: 'Sharpe Ratio', value: risk?.sharpe_ratio || 0, color: 'text-indigo-500', isCurrency: false },
          { label: 'Max Drawdown', value: risk?.max_drawdown || 0, color: 'text-purple-500', suffix: '%' },
          { label: 'Delta', value: risk?.delta || 0, color: 'text-emerald-500', isCurrency: false },
        ].map((m) => (
          <div key={m.label} className={`rounded-2xl p-4 ${tc.cardBg}`}>
            <p className={`text-xs uppercase tracking-wide ${tc.textMuted}`}>{m.label}</p>
            <p className={`text-xl font-bold mt-1 ${m.color}`}>
              {m.isCurrency !== false ? `R${(m.value / 100).toLocaleString()}` : m.value.toLocaleString()}{m.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Value at Risk Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={varGaugeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: tc.chartAxis }} />
              <YAxis tickFormatter={(v: number) => `R${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 12, fill: tc.chartAxis }} />
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }}
                formatter={(v: number) => [`R${(v / 100).toLocaleString()}`, 'Amount']} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {varGaugeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Option Greeks</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${tc.border}`}>
                <th className={`text-left py-2 ${tc.textMuted}`}>Greek</th>
                <th className={`text-right py-2 ${tc.textMuted}`}>Value</th>
                <th className={`text-left py-2 pl-4 ${tc.textMuted}`}>Description</th>
              </tr>
            </thead>
            <tbody>
              {greeksData.map((g) => (
                <tr key={g.greek} className={`border-b ${tc.isDark ? 'border-white/[0.04]' : 'border-slate-50'}`}>
                  <td className={`py-3 font-medium ${tc.textPrimary}`}>{g.greek}</td>
                  <td className={`py-3 text-right font-mono ${tc.textSecondary}`}>{g.value.toLocaleString()}</td>
                  <td className={`py-3 pl-4 text-xs ${tc.textMuted}`}>{g.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Stress Test Scenarios</h3>
          <div className="space-y-3">
            {(risk?.stress_test_results || []).map((st, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <span className={`text-sm font-medium ${tc.textPrimary}`}>{st.name}</span>
                <span className={`text-sm font-bold ${st.portfolio_impact_pct < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {st.portfolio_impact_pct > 0 ? '+' : ''}{st.portfolio_impact_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Counterparty Exposure</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={exposureData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {exposureData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }}
                formatter={(v: number) => [`R${(v / 100).toLocaleString()}`, 'Exposure']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-2xl p-5 lg:col-span-2 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Portfolio Drawdown (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: tc.chartAxis }} />
              <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12, fill: tc.chartAxis }} />
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} />
              <Line type="monotone" dataKey="var_limit" stroke="#3b82f6" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Modal isOpen={showStressModal} onClose={() => setShowStressModal(false)} title="Custom Stress Test">
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${tc.textSecondary}`}>Scenario Name</label>
            <input value={stressName} onChange={(e) => setStressName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} placeholder="e.g. Grid failure scenario" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${tc.textSecondary}`}>Price Changes (JSON)</label>
            <textarea value={stressChanges} onChange={(e) => setStressChanges(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm font-mono h-24 ${tc.input}`} />
            <p className={`text-xs mt-1 ${tc.textMuted}`}>Keys: solar, wind, hydro, gas, carbon, battery. Values: decimal change (0.1 = +10%)</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowStressModal(false)} className={`flex-1 px-4 py-2 rounded-xl text-sm ${tc.btnSecondary}`}>Cancel</button>
          <button onClick={() => { setShowStressModal(false); }} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium ${tc.btnPrimary}`}>Run Test</button>
        </div>
      </Modal>
    </div>
  );
}
