import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiDollarSign, FiZap, FiGlobe, FiBarChart2 } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import MetricCard from '../components/MetricCard';
import MarketOverview from '../components/MarketOverview';
import PortfolioSummary from '../components/PortfolioSummary';
import AIPoweredInsights from '../components/AIPoweredInsights';

// Mock data for charts
const marketData = [
  { time: '00:00', price: 45.2 },
  { time: '04:00', price: 42.8 },
  { time: '08:00', price: 52.3 },
  { time: '12:00', price: 68.7 },
  { time: '16:00', price: 72.1 },
  { time: '20:00', price: 61.4 },
  { time: '24:00', price: 55.9 },
];

const energyMixData = [
  { name: 'Solar', value: 35 },
  { name: 'Wind', value: 28 },
  { name: 'Hydro', value: 12 },
  { name: 'Natural Gas', value: 18 },
  { name: 'Coal', value: 7 },
];

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Energy Trading Dashboard</h1>
          <p className="text-slate-400 mt-1">AI-powered insights for optimal energy trading decisions</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
            Live Market Data
          </div>
          <div className="text-xs text-slate-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Portfolio Value"
          value="$24.8M"
          change="+12.4%"
          icon={<FiDollarSign className="w-6 h-6" />}
          color="from-green-500 to-emerald-500"
        />
        <MetricCard
          title="Today's P&L"
          value="$1.24M"
          change="+8.2%"
          icon={<FiTrendingUp className="w-6 h-6" />}
          color="from-cyan-500 to-blue-500"
        />
        <MetricCard
          title="Energy Traded"
          value="2.4 TWh"
          change="+15.7%"
          icon={<FiZap className="w-6 h-6" />}
          color="from-purple-500 to-violet-500"
        />
        <MetricCard
          title="Carbon Credits"
          value="12,450 t"
          change="+3.8%"
          icon={<FiGlobe className="w-6 h-6" />}
          color="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Price Chart */}
        <div className="lg:col-span-2 chart-glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Market Price Trend</h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-300">Real-time</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(12px)',
                }}
                itemStyle={{ color: '#f1f5f9' }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ stroke: '#0ea5e9', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#0ea5e9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Energy Mix */}
        <div className="chart-glass p-6">
          <h2 className="text-xl font-bold mb-6">Energy Portfolio Mix</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={energyMixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {energyMixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(12px)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {energyMixData.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-sm text-slate-300">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <AIPoweredInsights />

      {/* Market Overview and Portfolio Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketOverview />
        <PortfolioSummary />
      </div>

      {/* Recent Activity */}
      <div className="chart-glass p-6">
        <h2 className="text-xl font-bold mb-6">Recent Trading Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <FiBarChart2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-medium">Solar Energy Trade</div>
                  <div className="text-sm text-slate-400">250 MWh • California ISO</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-emerald-400">+$42,500</div>
                <div className="text-sm text-slate-400">2 hours ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
