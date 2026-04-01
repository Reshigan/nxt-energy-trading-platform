import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export default function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const isPositive = change.startsWith('+');
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="metric-card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-r ${color}`}>
          {icon}
        </div>
      </div>
      <div className={`flex items-center mt-4 text-sm ${
        isPositive ? 'text-emerald-400' : 'text-rose-400'
      }`}>
        {isPositive ? (
          <FiTrendingUp className="w-4 h-4 mr-1" />
        ) : (
          <FiTrendingDown className="w-4 h-4 mr-1" />
        )}
        {change} from last period
      </div>
    </motion.div>
  );
}