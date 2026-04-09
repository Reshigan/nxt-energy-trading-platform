import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiAlertTriangle, FiCheckCircle } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function AIPoweredInsights() {
  const tc = useThemeClasses();
  const insights = [
    { id: 1, title: "Market Opportunity", description: "Solar prices 12% below 30-day average. Recommended BUY position.", confidence: 87, impact: "High", type: "opportunity" },
    { id: 2, title: "Risk Alert", description: "Natural gas volatility expected to increase due to geopolitical tensions.", confidence: 92, impact: "Medium", type: "risk" },
    { id: 3, title: "Portfolio Optimization", description: "Your wind portfolio underperforming by 8%. Rebalancing strategy available.", confidence: 78, impact: "Medium", type: "optimization" },
  ];

  const getIcon = (t: string) => {
    if (t === 'opportunity') return <FiBarChart2 className="w-4 h-4 text-emerald-400" />;
    if (t === 'risk') return <FiAlertTriangle className="w-4 h-4 text-amber-400" />;
    return <FiCheckCircle className="w-4 h-4 text-blue-400" />;
  };

  const getBorder = (t: string) => {
    if (t === 'opportunity') return tc.isDark ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-emerald-200 bg-emerald-50/50';
    if (t === 'risk') return tc.isDark ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-amber-200 bg-amber-50/50';
    return tc.isDark ? 'border-blue-500/20 bg-blue-500/[0.04]' : 'border-blue-200 bg-blue-50/50';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      className={`rounded-2xl p-6 ${tc.cardBg}`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className={`text-lg font-bold ${tc.textPrimary}`}>AI-Powered Insights</h2>
        <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">Updated 2 min ago</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map(i => (
          <motion.div key={i.id} whileHover={{ scale: 1.01 }}
            className={`border rounded-xl p-4 transition-all ${getBorder(i.type)}`}>
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${tc.isDark ? 'bg-white/[0.06]' : 'bg-white'}`}>{getIcon(i.type)}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tc.isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{i.confidence}%</div>
            </div>
            <h3 className={`font-semibold mt-3 text-sm ${tc.textPrimary}`}>{i.title}</h3>
            <p className={`text-xs mt-1.5 leading-relaxed ${tc.textSecondary}`}>{i.description}</p>
            <div className={`mt-3 text-[10px] px-2 py-0.5 rounded-full inline-block font-medium ${tc.isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              Impact: {i.impact}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
