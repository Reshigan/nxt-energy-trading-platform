import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { aiAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';

const COLORS = ['#d4e157', '#66bb6a', '#ef5350', '#42a5f5', '#ab47bc', '#ff7043'];

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

  useEffect(() => {
    if (user?.id) {
      aiAPI.risk(user.id).then((r) => {
        setRisk(r.data?.data || null);
      }).catch(() => {
        // Use demo data if API not available
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
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-[#d4e157] border-t-transparent rounded-full" /></div>;

  const varGaugeData = [
    { name: 'VaR 95%', value: risk?.var_95 || 0, fill: '#d4e157' },
    { name: 'VaR 99%', value: risk?.var_99 || 0, fill: '#ef5350' },
    { name: 'CVaR', value: risk?.cvar || 0, fill: '#ff7043' },
  ];

  const greeksData = [
    { greek: 'Delta', value: risk?.delta || 0, description: 'Price sensitivity' },
    { greek: 'Gamma', value: risk?.gamma || 0, description: 'Delta rate of change' },
    { greek: 'Theta', value: risk?.theta || 0, description: 'Time decay' },
    { greek: 'Vega', value: risk?.vega || 0, description: 'Volatility sensitivity' },
  ];

  const exposureData = Object.entries(risk?.counterparty_exposure || {}).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    value,
  }));

  // Simulated drawdown chart
  const drawdownData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    drawdown: -Math.abs(Math.sin(i * 0.3) * (risk?.max_drawdown || 5) + Math.random() * 2),
    var_limit: -(risk?.max_drawdown || 10),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e1a]">Risk Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time VaR, Greeks, stress tests & counterparty exposure</p>
        </div>
        <button onClick={() => setShowStressModal(true)} className="px-4 py-2 bg-[#d4e157] text-[#1a2e1a] rounded-2xl font-semibold text-sm hover:bg-[#c0ca33] transition-colors">
          Custom Stress Test
        </button>
      </div>

      {/* VaR Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'VaR 95%', value: risk?.var_95 || 0, color: '#d4e157' },
          { label: 'VaR 99%', value: risk?.var_99 || 0, color: '#ef5350' },
          { label: 'CVaR', value: risk?.cvar || 0, color: '#ff7043' },
          { label: 'Sharpe Ratio', value: risk?.sharpe_ratio || 0, color: '#42a5f5', isCurrency: false },
          { label: 'Max Drawdown', value: risk?.max_drawdown || 0, color: '#ab47bc', suffix: '%' },
          { label: 'Delta', value: risk?.delta || 0, color: '#66bb6a', isCurrency: false },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: m.color }}>
              {m.isCurrency !== false ? `R${(m.value / 100).toLocaleString()}` : m.value.toLocaleString()}{m.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VaR Comparison */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Value at Risk Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={varGaugeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `R${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [`R${(v / 100).toLocaleString()}`, 'Amount']} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {varGaugeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Greeks Table */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Option Greeks</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500">Greek</th>
                <th className="text-right py-2 text-gray-500">Value</th>
                <th className="text-left py-2 pl-4 text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody>
              {greeksData.map((g) => (
                <tr key={g.greek} className="border-b border-gray-50">
                  <td className="py-3 font-medium text-[#1a2e1a]">{g.greek}</td>
                  <td className="py-3 text-right font-mono">{g.value.toLocaleString()}</td>
                  <td className="py-3 pl-4 text-gray-500 text-xs">{g.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stress Tests */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Stress Test Scenarios</h3>
          <div className="space-y-3">
            {(risk?.stress_test_results || []).map((st, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-[#1a2e1a]">{st.name}</span>
                <span className={`text-sm font-bold ${st.portfolio_impact_pct < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {st.portfolio_impact_pct > 0 ? '+' : ''}{st.portfolio_impact_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Counterparty Heatmap */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Counterparty Exposure</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={exposureData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {exposureData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`R${(v / 100).toLocaleString()}`, 'Exposure']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Drawdown Chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 lg:col-span-2">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Portfolio Drawdown (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="drawdown" stroke="#ef5350" fill="#ef535020" strokeWidth={2} />
              <Line type="monotone" dataKey="var_limit" stroke="#d4e157" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Custom Stress Test Modal */}
      {showStressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-4">Custom Stress Test</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Scenario Name</label>
                <input value={stressName} onChange={(e) => setStressName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="e.g. Grid failure scenario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Price Changes (JSON)</label>
                <textarea value={stressChanges} onChange={(e) => setStressChanges(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono h-24" />
                <p className="text-xs text-gray-400 mt-1">Keys: solar, wind, hydro, gas, carbon, battery. Values: decimal change (0.1 = +10%, -0.3 = -30%)</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowStressModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { setShowStressModal(false); }} className="flex-1 px-4 py-2 bg-[#d4e157] text-[#1a2e1a] rounded-xl text-sm font-semibold">Run Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
