import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

export default function MarketOverview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="chart-glass p-6"
    >
      <h2 className="text-xl font-bold mb-6">Market Overview</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-cyan-500/20 mr-3">
              <FiBarChart2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-medium">National Grid Load</div>
              <div className="text-sm text-slate-400">Current demand vs forecast</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">87.4 GW</div>
            <div className="text-sm text-emerald-400">+2.1%</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-emerald-500/20 mr-3">
              <FiTrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-medium">Peak Demand Forecast</div>
              <div className="text-sm text-slate-400">Today's projected peak</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">92.1 GW</div>
            <div className="text-sm text-slate-400">6:45 PM EST</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-amber-500/20 mr-3">
              <FiDollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-medium">Average Market Price</div>
              <div className="text-sm text-slate-400">Weighted national average</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">$52.84/MWh</div>
            <div className="text-sm text-emerald-400">+1.8%</div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-700">
        <h3 className="font-medium mb-3">Regional Highlights</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-800/30">
            <div className="text-sm text-slate-400">California ISO</div>
            <div className="font-medium">↑ 3.2%</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30">
            <div className="text-sm text-slate-400">ERCOT</div>
            <div className="font-medium">↑ 1.8%</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30">
            <div className="text-sm text-slate-400">PJM</div>
            <div className="font-medium">↔ 0.0%</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/30">
            <div className="text-sm text-slate-400">NYISO</div>
            <div className="font-medium">↓ 0.9%</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}