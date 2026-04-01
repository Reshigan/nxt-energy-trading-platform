import React from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export default function AIPoweredInsights() {
  const insights = [
    {
      id: 1,
      title: "Market Opportunity",
      description: "Solar prices 12% below 30-day average. Recommended BUY position for California solar projects.",
      confidence: 87,
      impact: "High",
      type: "opportunity"
    },
    {
      id: 2,
      title: "Risk Alert",
      description: "Natural gas volatility expected to increase due to geopolitical tensions.",
      confidence: 92,
      impact: "Medium",
      type: "risk"
    },
    {
      id: 3,
      title: "Portfolio Optimization",
      description: "Your wind portfolio underperforming by 8%. Suggested rebalancing strategy available.",
      confidence: 78,
      impact: "Medium",
      type: "optimization"
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <FiBarChart2 className="w-5 h-5 text-emerald-400" />;
      case 'risk': return <FiAlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'optimization': return <FiCheckCircle className="w-5 h-5 text-cyan-400" />;
      default: return <FiBarChart2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'risk': return 'bg-amber-500/10 border-amber-500/30';
      case 'optimization': return 'bg-cyan-500/10 border-cyan-500/30';
      default: return 'bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="chart-glass p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">AI-Powered Insights</h2>
        <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium">
          Updated 2 min ago
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <motion.div
            key={insight.id}
            whileHover={{ scale: 1.02 }}
            className={`border rounded-lg p-4 ${getBgColor(insight.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-slate-800/50">
                {getIcon(insight.type)}
              </div>
              <div className="text-xs px-2 py-1 rounded bg-slate-800/50">
                {insight.confidence}% confident
              </div>
            </div>
            <h3 className="font-medium mt-3">{insight.title}</h3>
            <p className="text-sm text-slate-300 mt-2">{insight.description}</p>
            <div className="flex items-center mt-3 text-xs">
              <span className="px-2 py-1 rounded bg-slate-800/50 mr-2">
                Impact: {insight.impact}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}