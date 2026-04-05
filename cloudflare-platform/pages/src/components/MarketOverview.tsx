import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function MarketOverview() {
  const tc = useThemeClasses();
  const items = [
    { icon: FiBarChart2, color: 'text-blue-400', bg: 'bg-blue-500/10', title: 'National Grid Load', sub: 'Current demand vs forecast', val: '87.4 GW', change: '+2.1%', positive: true },
    { icon: FiTrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', title: 'Peak Demand Forecast', sub: "Today's projected peak", val: '92.1 GW', change: '6:45 PM EST', positive: false },
    { icon: FiDollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', title: 'Average Market Price', sub: 'Weighted national average', val: '$52.84/MWh', change: '+1.8%', positive: true },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      className={`rounded-2xl p-6 ${tc.cardBg}`}>
      <h2 className={`text-lg font-bold mb-5 ${tc.textPrimary}`}>Market Overview</h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bg}`}><item.icon className={`w-4 h-4 ${item.color}`} /></div>
              <div>
                <div className={`text-sm font-medium ${tc.textPrimary}`}>{item.title}</div>
                <div className={`text-xs ${tc.textMuted}`}>{item.sub}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-semibold ${tc.textPrimary}`}>{item.val}</div>
              <div className={`text-xs ${item.positive ? 'text-emerald-500' : tc.textMuted}`}>{item.change}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-5 pt-4 border-t ${tc.border}`}>
        <h3 className={`text-sm font-semibold mb-3 ${tc.textPrimary}`}>Regional Highlights</h3>
        <div className="grid grid-cols-2 gap-2">
          {[{ r: 'California ISO', v: '+3.2%' }, { r: 'ERCOT', v: '+1.8%' }, { r: 'PJM', v: '0.0%' }, { r: 'NYISO', v: '-0.9%' }].map(x => (
            <div key={x.r} className={`p-2.5 rounded-lg ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <div className={`text-xs ${tc.textMuted}`}>{x.r}</div>
              <div className={`text-sm font-medium ${tc.textPrimary}`}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
