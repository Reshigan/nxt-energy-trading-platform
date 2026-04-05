import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiDownload } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
  PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

const CHART_COLORS = ['#3b82f6', '#4caf50', '#42a5f5', '#ff9800', '#ef5350', '#ab47bc'];

const revenueData = [
  { month: 'Jan', revenue: 420000, profit: 180000 }, { month: 'Feb', revenue: 510000, profit: 220000 },
  { month: 'Mar', revenue: 480000, profit: 195000 }, { month: 'Apr', revenue: 620000, profit: 280000 },
  { month: 'May', revenue: 570000, profit: 250000 }, { month: 'Jun', revenue: 690000, profit: 310000 },
];

const volumeData = [
  { month: 'Jan', solar: 120, wind: 85, carbon: 45, gas: 30 },
  { month: 'Feb', solar: 140, wind: 92, carbon: 52, gas: 28 },
  { month: 'Mar', solar: 135, wind: 110, carbon: 48, gas: 35 },
  { month: 'Apr', solar: 160, wind: 105, carbon: 55, gas: 32 },
  { month: 'May', solar: 155, wind: 120, carbon: 60, gas: 38 },
  { month: 'Jun', solar: 175, wind: 115, carbon: 65, gas: 40 },
];

const marketShare = [
  { name: 'Solar', value: 38 }, { name: 'Wind', value: 28 },
  { name: 'Carbon', value: 18 }, { name: 'Gas', value: 10 }, { name: 'Other', value: 6 },
];

const priceHistory = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  solar: 850 + Math.sin(i / 5) * 50 + Math.random() * 30,
  wind: 720 + Math.cos(i / 4) * 40 + Math.random() * 25,
  carbon: 180 + Math.sin(i / 3) * 15 + Math.random() * 10,
}));

export default function Analytics() {
  const tc = useThemeClasses();
  const { activeRole } = useAuthStore();
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Analytics</h1>
        <div className="flex items-center gap-2">
          {(['1M', '3M', '6M', '1Y'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium ${period === p ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800/50 text-slate-400'}`}>
              {p}
            </button>
          ))}
          <button className={`flex items-center gap-1 px-3 py-1.5 ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-slate-400 rounded-lg text-xs hover:text-slate-900 dark:hover:text-white`}>
            <FiDownload className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: 'R3.29M', change: '+18.4%', up: true },
          { label: 'Total Profit', value: 'R1.44M', change: '+22.1%', up: true },
          { label: 'Trading Volume', value: '1,842 MWh', change: '+12.7%', up: true },
          { label: 'Avg Trade Size', value: 'R178K', change: '-3.2%', up: false },
          { label: 'Active Contracts', value: '47', change: '+5', up: true },
        ].map((m) => (
          <div key={m.label} className={`${tc.cardBg} p-4`}>
            <div className="text-xs text-slate-500 dark:text-slate-400">{m.label}</div>
            <div className="text-xl font-bold mt-1">{m.value}</div>
            <div className={`text-xs mt-1 ${m.up ? 'text-emerald-400' : 'text-red-400'}`}>{m.change}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue & Profit Bar Chart */}
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">Revenue & Profit</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <XAxis dataKey="month" stroke={tc.chartAxis} fontSize={12} />
              <YAxis stroke={tc.chartAxis} fontSize={12} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }}
                formatter={(value: number) => [`R${(value / 1000).toFixed(0)}K`]} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#4caf50" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trading Volume Area Chart */}
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">Trading Volume by Market</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="month" stroke={tc.chartAxis} fontSize={12} />
              <YAxis stroke={tc.chartAxis} fontSize={12} />
              <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }} />
              <Area type="monotone" dataKey="solar" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="wind" stackId="1" stroke="#42a5f5" fill="#42a5f5" fillOpacity={0.3} />
              <Area type="monotone" dataKey="carbon" stackId="1" stroke="#4caf50" fill="#4caf50" fillOpacity={0.3} />
              <Area type="monotone" dataKey="gas" stackId="1" stroke="#ff9800" fill="#ff9800" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Market Share Pie */}
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">Market Share</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={marketShare} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Price History Line Chart */}
        <div className={`${tc.cardBg} p-6 col-span-2`}>
          <h3 className="text-sm font-semibold mb-4">30-Day Price History (R/MWh)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="day" stroke={tc.chartAxis} fontSize={11} />
              <YAxis stroke={tc.chartAxis} fontSize={11} />
              <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }} />
              <Line type="monotone" dataKey="solar" stroke="#3b82f6" dot={false} strokeWidth={2} name="Solar" />
              <Line type="monotone" dataKey="wind" stroke="#42a5f5" dot={false} strokeWidth={2} name="Wind" />
              <Line type="monotone" dataKey="carbon" stroke="#4caf50" dot={false} strokeWidth={2} name="Carbon" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`${tc.cardBg} p-6`}>
        <h3 className="text-sm font-semibold mb-4">Top Performing Assets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
              <th className="text-left py-2">Asset</th><th className="text-left py-2">Market</th>
              <th className="text-right py-2">Volume</th><th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Return</th><th className="text-right py-2">Sharpe</th>
            </tr></thead>
            <tbody>
              {[
                { asset: 'Solar PPA Bundle', market: 'Solar', volume: '450 MWh', revenue: 'R382K', return: '+15.2%', sharpe: '1.65' },
                { asset: 'Wind Forward Q3', market: 'Wind', volume: '280 MWh', revenue: 'R201K', return: '+11.8%', sharpe: '1.42' },
                { asset: 'Carbon VCS Credits', market: 'Carbon', volume: '1,200 tCO2e', revenue: 'R216K', return: '+22.4%', sharpe: '1.88' },
                { asset: 'Gas Spot Trades', market: 'Gas', volume: '150 MWh', revenue: 'R127K', return: '+8.1%', sharpe: '1.15' },
                { asset: 'Battery Storage', market: 'Battery', volume: '90 MWh', revenue: 'R95K', return: '+19.6%', sharpe: '1.72' },
              ].map((a) => (
                <tr key={a.asset} className="border-t border-slate-200 dark:border-white/[0.06]">
                  <td className="py-2 font-medium">{a.asset}</td>
                  <td>{a.market}</td>
                  <td className="text-right">{a.volume}</td>
                  <td className="text-right text-blue-400">{a.revenue}</td>
                  <td className="text-right text-emerald-400">{a.return}</td>
                  <td className="text-right">{a.sharpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
