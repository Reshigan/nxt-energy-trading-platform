import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export default function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const isPositive = change.startsWith('+');
  const tc = useThemeClasses();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl p-5 transition-all duration-200 ${tc.cardBg} ${tc.cardBgHover}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${tc.textSecondary}`}>{title}</p>
          <h3 className={`text-2xl font-bold mt-1 ${tc.textPrimary}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className={`flex items-center mt-3 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? <FiTrendingUp className="w-4 h-4 mr-1" /> : <FiTrendingDown className="w-4 h-4 mr-1" />}
        {change} from last period
      </div>
    </motion.div>
  );
}
