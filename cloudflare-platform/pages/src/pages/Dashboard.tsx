import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiDollarSign, FiZap, FiGlobe, FiBarChart2 } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MetricCard from '../components/MetricCard';
import MarketOverview from '../components/MarketOverview';
import PortfolioSummary from '../components/PortfolioSummary';
import AIPoweredInsights from '../components/AIPoweredInsights';
import { useThemeClasses } from '../hooks/useThemeClasses';

const marketData = [
  { time: '00:00', price: 45.2 }, { time: '04:00', price: 42.8 }, { time: '08:00', price: 52.3 },
  { time: '12:00', price: 68.7 }, { time: '16:00', price: 72.1 }, { time: '20:00', price: 61.4 }, { time: '24:00', price: 55.9 },
];

const energyMixData = [
  { name: 'Solar', value: 35 }, { name: 'Wind', value: 28 }, { name: 'Hydro', value: 12 },
  { name: 'Natural Gas', value: 18 }, { name: 'Coal', value: 7 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const tc = useThemeClasses();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${tc.textPrimary}`}>Energy Trading Dashboard</h1>
          <p className={`mt-1 ${tc.textSecondary}`}>AI-powered insights for optimal energy trading decisions</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${tc.statusGreen}`}>Live Market Data</div>
          <div className={`text-xs ${tc.textMuted}`}>Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Portfolio Value" value="$24.8M" change="+12.4%" icon={<FiDollarSign className="w-6 h-6 text-white" />} color="from-emerald-500 to-teal-500" />
        <MetricCard title="Today's P&L" value="$1.24M" change="+8.2%" icon={<FiTrendingUp className="w-6 h-6 text-white" />} color="from-blue-500 to-cyan-500" />
        <MetricCard title="Energy Traded" value="2.4 TWh" change="+15.7%" icon={<FiZap className="w-6 h-6 text-white" />} color="from-purple-500 to-violet-500" />
        <MetricCard title="Carbon Credits" value="12,450 t" change="+3.8%" icon={<FiGlobe className="w-6 h-6 text-white" />} color="from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 ${tc.cardBg}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-lg font-bold ${tc.textPrimary}`}>Market Price Trend</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span className={`text-sm ${tc.textSecondary}`}>Real-time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="time" stroke={tc.chartAxis} />
              <YAxis stroke={tc.chartAxis} />
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
          <h2 className={`text-lg font-bold mb-6 ${tc.textPrimary}`}>Energy Portfolio Mix</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={energyMixData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {energyMixData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {energyMixData.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className={`text-sm ${tc.textSecondary}`}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIPoweredInsights />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketOverview />
        <PortfolioSummary />
      </div>

      <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
        <h2 className={`text-lg font-bold mb-5 ${tc.textPrimary}`}>Recent Trading Activity</h2>
        <div className="space-y-3">
          {[{ t: 'Solar Energy Trade', sub: '250 MWh \u2022 California ISO', val: '+$42,500', ago: '2 hours ago' },
            { t: 'Wind Energy Trade', sub: '180 MWh \u2022 ERCOT Texas', val: '+$31,200', ago: '4 hours ago' },
            { t: 'Carbon Credit Sale', sub: '500 t \u2022 VCS Registry', val: '+$18,750', ago: '6 hours ago' },
            { t: 'Gas Forward', sub: '100 MWh \u2022 PJM', val: '-$8,400', ago: '8 hours ago' }].map((item, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${tc.isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-slate-50 hover:bg-slate-100'}`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${tc.isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                  <FiBarChart2 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className={`font-medium text-sm ${tc.textPrimary}`}>{item.t}</div>
                  <div className={`text-xs ${tc.textMuted}`}>{item.sub}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium text-sm ${item.val.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{item.val}</div>
                <div className={`text-xs ${tc.textMuted}`}>{item.ago}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
