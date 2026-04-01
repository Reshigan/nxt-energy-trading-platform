import React from 'react';
import { motion } from 'framer-motion';
import { FiPieChart, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

export default function PortfolioSummary() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="chart-glass p-6"
    >
      <h2 className="text-xl font-bold mb-6">Portfolio Summary</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Total Portfolio Value</div>
            <div className="text-2xl font-bold mt-1">$24.8M</div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-emerald-400">
              <FiTrendingUp className="w-4 h-4 mr-1" />
              <span>12.4%</span>
            </div>
            <div className="text-sm text-slate-400">vs last month</div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-700">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Asset Allocation</span>
            <span>% of Portfolio</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>
                  Solar Assets
                </span>
                <span>35%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  Wind Assets
                </span>
                <span>28%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                  Hydro Assets
                </span>
                <span>12%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                  Fossil Fuels
                </span>
                <span>25%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-700">
          <h3 className="font-medium mb-3">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="text-sm text-slate-400">Avg. Yield</div>
              <div className="font-medium">8.7%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="text-sm text-slate-400">Carbon Intensity</div>
              <div className="font-medium">125 gCO2/kWh</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="text-sm text-slate-400">Renewable Ratio</div>
              <div className="font-medium">75%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30">
              <div className="text-sm text-slate-400">Risk Score</div>
              <div className="font-medium">B+</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}