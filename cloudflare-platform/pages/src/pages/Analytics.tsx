import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiBarChart2, FiDollarSign, FiActivity, FiPieChart } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { dashboardAPI } from '../lib/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const volumeData = [
  { month: 'Jan', solar: 4200, wind: 3100, gas: 2800, carbon: 1500 },
  { month: 'Feb', solar: 4800, wind: 3400, gas: 2600, carbon: 1800 },
  { month: 'Mar', solar: 5200, wind: 3800, gas: 2900, carbon: 2200 },
  { month: 'Apr', solar: 5800, wind: 4200, gas: 2700, carbon: 2600 },
  { month: 'May', solar: 6100, wind: 4500, gas: 3100, carbon: 2400 },
  { month: 'Jun', solar: 5400, wind: 4800, gas: 3300, carbon: 2900 },
];

const revenueBreakdown = [
  { name: 'Solar PPAs', value: 8400 }, { name: 'Wind Contracts', value: 6200 },
  { name: 'Carbon Trading', value: 4100 }, { name: 'Gas Forwards', value: 3800 }, { name: 'RECs', value: 2300 },
];

const marketShareData = [
  { month: 'Jan', share: 12.4 }, { month: 'Feb', share: 13.1 }, { month: 'Mar', share: 14.2 },
  { month: 'Apr', share: 15.8 }, { month: 'May', share: 16.4 }, { month: 'Jun', share: 17.2 },
];

const topAssets = [
  { name: 'Solar PPA Spot', volume: '24.8K MWh', revenue: 'R12.4M', growth: '+18%', positive: true },
  { name: 'Wind Forward H2', volume: '18.2K MWh', revenue: 'R8.7M', growth: '+12%', positive: true },
  { name: 'Carbon Credit VCS', volume: '32.1K t', revenue: 'R4.1M', growth: '+24%', positive: true },
  { name: 'Gas Spot', volume: '15.6K MWh', revenue: 'R6.2M', growth: '-3%', positive: false },
  { name: 'REC Certificate', volume: '28.6K', revenue: 'R1.9M', growth: '+8%', positive: true },
];

const iconMap: Record<string, React.FC<{className?: string}>> = { FiBarChart2, FiDollarSign, FiActivity, FiPieChart, FiTrendingUp };

const kpis = [
  { label: 'Total Volume', value: '142.8K MWh', change: '+14.2%', positive: true, icon: 'FiBarChart2' },
  { label: 'Revenue MTD', value: 'R24.8M', change: '+8.6%', positive: true, icon: 'FiDollarSign' },
  { label: 'Active Trades', value: '1,847', change: '+23%', positive: true, icon: 'FiActivity' },
  { label: 'Market Share', value: '17.2%', change: '+2.8%', positive: true, icon: 'FiPieChart' },
  { label: 'Avg Price', value: 'R682/MWh', change: '+5.4%', positive: true, icon: 'FiTrendingUp' },
];

export default function Analytics() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState('6M');
  const c = (d: string, l: string) => isDark ? d : l;
  const [kpiData, setKpiData] = useState(kpis);

  useEffect(() => {
    (async () => {
      try {
        const res = await dashboardAPI.summary();
        if (res.data?.data?.kpis?.length) setKpiData(res.data.data.kpis);
      } catch { /* use demo data */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Platform performance & market insights</p>
        </div>
        <div className={`flex items-center rounded-full p-1 ${c('bg-white/[0.04]', 'bg-slate-100')}`}>
          {['1M','3M','6M','1Y','ALL'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${period === p ? c('bg-white/[0.12] text-white', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400', 'text-slate-500')}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {kpiData.map((kpi, i) => {
          const Icon = iconMap[kpi.icon] || FiTrendingUp;
          return (
            <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
              <Icon className="w-4 h-4 text-blue-500 mb-2" />
              <p className="text-xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-slate-400">{kpi.label}</p>
                <span className={`text-[11px] font-bold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Trading Volume by Source</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="solar" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="wind" fill="#3B82F6" stackId="a" />
              <Bar dataKey="gas" fill="#8B5CF6" stackId="a" />
              <Bar dataKey="carbon" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {revenueBreakdown.map((r, i) => (
              <div key={r.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-slate-500 dark:text-slate-400">{r.name}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mono">R{(r.value / 1000).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Market Share Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={marketShareData}>
              <defs><linearGradient id="shareGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit="%" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="share" stroke="#3B82F6" strokeWidth={2} fill="url(#shareGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Top Assets by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
                <th className="text-left py-2 font-medium">Asset</th>
                <th className="text-right py-2 font-medium">Volume</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium">Growth</th>
              </tr></thead>
              <tbody>{topAssets.map(a => (
                <tr key={a.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                  <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{a.name}</td>
                  <td className="py-2.5 text-right text-slate-500 mono text-xs">{a.volume}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{a.revenue}</td>
                  <td className="py-2.5 text-right"><span className={`text-xs font-bold ${a.positive ? 'text-emerald-500' : 'text-red-500'}`}>{a.growth}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
