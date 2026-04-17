import React, { useEffect, useState } from 'react';
import { fundAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie } from 'recharts';
import { formatZAR } from '../lib/format';

type Tab = 'performance' | 'options' | 'registry' | 'vintage' | 'reporting';

export default function FundDashboard() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [tab, setTab] = useState<Tab>('performance');
  const [perf, setPerf] = useState<Record<string, unknown>>({});
  const [options, setOptions] = useState<Record<string, unknown>[]>([]);
  const [registry, setRegistry] = useState<Record<string, unknown>[]>([]);
  const [vintage, setVintage] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<Tab, () => Promise<void>> = {
      performance: () => fundAPI.getPerformance().then((r) => setPerf(r.data?.data || {})),
      options: () => fundAPI.getOptionsBook().then((r) => setOptions(r.data?.data || [])),
      registry: () => fundAPI.getRegistryReconciliation().then((r) => setRegistry(r.data?.data || [])),
      vintage: () => fundAPI.getVintageLadder().then((r) => setVintage(r.data?.data || [])),
      reporting: () => Promise.resolve(),
    };
    fetchers[tab]().catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'performance', label: 'Performance' },
    { key: 'options', label: 'Options Book' },
    { key: 'registry', label: 'Registry' },
    { key: 'vintage', label: 'Vintage Ladder' },
    { key: 'reporting', label: 'Investor Reporting' },
  ];

  // NAV history data for chart
  const navHistoryData = Array.isArray(perf.nav_history) 
    ? (perf.nav_history as Array<Record<string, unknown>>).map(h => ({
        month: String(h.month || ''),
        nav: (Number(h.nav) || 0) / 100,
        returns: Number(h.returns_pct) || 0,
      }))
    : [];

  // Portfolio allocation pie data
  const allocationData = Array.isArray(perf.allocation) 
    ? (perf.allocation as Array<Record<string, unknown>>).map((a, i) => ({
        name: String(a.type || 'Other'),
        value: Number(a.value_cents) / 100,
        color: ['#0891b2', '#22c55e', '#a855f7', '#f97316', '#ef4444'][i % 5],
      }))
    : [];

  // Returns distribution data
  const returnsData = Array.isArray(perf.returns_distribution)
    ? (perf.returns_distribution as Array<Record<string, unknown>>).map(r => ({
        bucket: String(r.bucket || ''),
        count: Number(r.count) || 0,
      }))
    : [];

  // Vintage ladder data (credits by vintage year)
  const vintageData = vintage.map(v => ({
    year: String(v.vintage_year || v.year || ''),
    credits: Number(v.credits) || 0,
    value: (Number(v.value_cents) || 0) / 100,
  }));

  // Options book data
  const optionsByType = options.reduce((acc: Record<string, number>, o) => {
    const type = String(o.type || 'Other');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const handleGenerateReport = (type: string) => {
    fundAPI.generateReport(type).then(() => alert(`${type} report generated`)).catch(() => {});
  };

  const handleExportReport = (type: 'quarterly' | 'annual' | 'tax') => {
    const data = type === 'quarterly' ? perf.quarterly_report : type === 'annual' ? perf.annual_report : perf.tax_statement;
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `fund_${type}_report.json`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Carbon Fund Manager</h1>
        <p className="text-slate-400 text-sm mt-1">Portfolio performance, options, registry reconciliation &amp; investor reporting</p>
      </div>

      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {tab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'NAV', value: `R${((Number(perf.current_nav) || 0) / 100).toLocaleString()}`, color: 'text-white' },
                  { label: 'YTD Return', value: `${Number(perf.ytd_return_pct) || 0}%`, color: Number(perf.ytd_return_pct) >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'Total Credits', value: String(Number(perf.total_credits) || 0), color: 'text-cyan-400' },
                  { label: 'Active Options', value: String(Number(perf.active_options) || 0), color: 'text-purple-400' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="text-slate-400 text-sm">{kpi.label}</div>
                    <div className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              {Array.isArray(perf.nav_history) && (perf.nav_history as Array<Record<string, unknown>>).length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-semibold text-sm">Net Asset Value (NAV) Evolution</h3>
                    <div className="text-xs text-slate-400">Currency: ZAR</div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(perf.nav_history as Array<Record<string, unknown>>).map(h => ({
                        month: String(h.month || ''),
                        nav: (Number(h.nav) || 0) / 100
                      }))}>
                        <defs>
                          <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          tickFormatter={(v) => `R${(v / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip 
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }} 
                          formatter={(v) => [formatZAR(v as number), 'NAV']} 
                        />
                        <Area type="monotone" dataKey="nav" stroke="#0891b2" fillOpacity={1} fill="url(#colorNav)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'options' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                  <th className="px-4 py-3">Option</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Strike</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">MTM</th><th className="px-4 py-3">Delta</th><th className="px-4 py-3">ITM</th>
                </tr></thead>
                <tbody>{options.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">No options in book</td></tr>
                ) : options.map((opt, i) => (
                  <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-white">{String(opt.vintage_year || '')} {String(opt.standard || '')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${String(opt.option_type) === 'call' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{String(opt.option_type || '').toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-slate-300">R{((Number(opt.strike_price_cents) || 0) / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-300">{String(opt.expiry_date || '').substring(0, 10)}</td>
                    <td className="px-4 py-3 text-green-400">R{((Number(opt.mtm_cents) || 0) / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-300">{Number((opt.greeks as Record<string, unknown>)?.delta) || 0}</td>
                    <td className="px-4 py-3">{opt.in_the_money ? <span className="text-green-400 text-xs">Yes</span> : <span className="text-slate-500 text-xs">No</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === 'registry' && (
            <div className="space-y-4">
              {registry.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No registry data</div>
              ) : registry.map((r, i) => (
                <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{String(r.registry)}</div>
                    <div className="text-xs text-slate-400 mt-1">Last sync: {String(r.last_sync || '').substring(0, 16)}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm"><span className="text-slate-400">Platform:</span> <span className="text-white">{Number(r.platform_balance)}</span></div>
                    <div className="text-sm"><span className="text-slate-400">Registry:</span> <span className="text-white">{Number(r.registry_balance)}</span></div>
                    {Number(r.discrepancy) !== 0 && <div className="text-xs text-red-400">Discrepancy: {Number(r.discrepancy)}</div>}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${r.status === 'synced' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{String(r.status)}</span>
                    <button onClick={() => fundAPI.syncRegistry(String(r.registry))} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs">Sync</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'vintage' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-semibold text-sm">Vintage Distribution (Quantity)</h3>
                  <div className="text-xs text-slate-400">Total Credits: {vintage.reduce((s, v) => s + (Number(v.quantity) || 0), 0).toLocaleString()}</div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vintage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="vintage_year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }} 
                        formatter={(v) => [`${v} Credits`, 'Quantity']} 
                      />
                      <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                        {vintage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Number(entry.vintage_year) < 2020 ? '#6366f1' : '#06b6d4'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/50 text-slate-400 text-left">
                    <tr>
                      <th className="px-4 py-3">Vintage</th><th className="px-4 py-3">Standard</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Fair Value</th><th className="px-4 py-3">Total Value</th><th className="px-4 py-3">Age Discount</th>
                    </tr>
                  </thead>
                  <tbody>{vintage.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">No vintage data</td></tr>
                  ) : vintage.map((v, i) => (
                    <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-white font-medium">{Number(v.vintage_year)}</td>
                      <td className="px-4 py-3 text-slate-300">{String(v.standard)}</td>
                      <td className="px-4 py-3 text-slate-300">{Number(v.quantity).toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-400">{formatZAR((Number(v.fair_value_cents) || 0) / 100)}</td>
                      <td className="px-4 py-3 text-green-400">{formatZAR((Number(v.total_value_cents) || 0) / 100)}</td>
                      <td className="px-4 py-3 text-yellow-400">{Number(v.age_discount_pct)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'reporting' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'monthly', title: 'Monthly Performance Report', desc: 'NAV, returns, attribution analysis' },
                { type: 'quarterly', title: 'Quarterly Investor Report', desc: 'Full fund performance with commentary' },
                { type: 'annual', title: 'Annual Report', desc: 'Comprehensive year-end report with audited figures' },
                { type: 'carbon_impact', title: 'Carbon Impact Report', desc: 'Tonnes retired, offset value, climate impact' },
                { type: 'risk', title: 'Risk Report', desc: 'VaR, drawdown analysis, stress tests' },
                { type: 'esg', title: 'ESG Report', desc: 'ESG scoring, sustainability metrics' },
              ].map((report) => (
                <div key={report.type} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <h3 className="text-white font-medium">{report.title}</h3>
                  <p className="text-slate-400 text-xs mt-1">{report.desc}</p>
                  <button onClick={() => handleGenerateReport(report.type)} className="mt-3 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium">Generate</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
