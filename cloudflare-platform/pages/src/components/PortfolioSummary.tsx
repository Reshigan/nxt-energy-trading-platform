import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function PortfolioSummary() {
  const tc = useThemeClasses();
  const assets = [
    { name: 'Solar Assets', pct: 35, color: 'from-blue-500 to-cyan-500', dot: 'bg-blue-500' },
    { name: 'Wind Assets', pct: 28, color: 'from-purple-500 to-violet-500', dot: 'bg-purple-500' },
    { name: 'Hydro Assets', pct: 12, color: 'from-emerald-500 to-teal-500', dot: 'bg-emerald-500' },
    { name: 'Fossil Fuels', pct: 25, color: 'from-amber-500 to-orange-500', dot: 'bg-amber-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      className={`rounded-2xl p-6 ${tc.cardBg}`}>
      <h2 className={`text-lg font-bold mb-5 ${tc.textPrimary}`}>Portfolio Summary</h2>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className={`text-sm ${tc.textSecondary}`}>Total Portfolio Value</div>
          <div className={`text-2xl font-bold mt-0.5 ${tc.textPrimary}`}>$24.8M</div>
        </div>
        <div className="flex items-center text-emerald-500 text-sm font-medium">
          <FiTrendingUp className="w-4 h-4 mr-1" />12.4% <span className={`ml-1 ${tc.textMuted}`}>vs last month</span>
        </div>
      </div>
      <div className={`pt-4 border-t ${tc.border} space-y-3`}>
        {assets.map(a => (
          <div key={a.name}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className={`flex items-center gap-2 ${tc.textPrimary}`}><span className={`w-2.5 h-2.5 rounded-full ${a.dot}`} />{a.name}</span>
              <span className={tc.textSecondary}>{a.pct}%</span>
            </div>
            <div className={`w-full rounded-full h-1.5 ${tc.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
              <div className={`bg-gradient-to-r ${a.color} h-1.5 rounded-full`} style={{ width: `${a.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-5 pt-4 border-t ${tc.border}`}>
        <h3 className={`text-sm font-semibold mb-3 ${tc.textPrimary}`}>Key Metrics</h3>
        <div className="grid grid-cols-2 gap-2">
          {[{ l: 'Avg. Yield', v: '8.7%' }, { l: 'Carbon Intensity', v: '125 gCO2/kWh' }, { l: 'Renewable Ratio', v: '75%' }, { l: 'Risk Score', v: 'B+' }].map(m => (
            <div key={m.l} className={`p-2.5 rounded-lg ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
              <div className={`text-xs ${tc.textMuted}`}>{m.l}</div>
              <div className={`text-sm font-medium ${tc.textPrimary}`}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
