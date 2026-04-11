import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

export interface KPI {
  id: string;
  label: string;
  value: string;
  value_raw: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'flat';
  positive: boolean;
  period: string;
  source_endpoint: string;
}

const trendIcon = (trend: string, positive: boolean) => {
  const color = positive ? 'text-emerald-500' : 'text-red-500';
  if (trend === 'up') return <FiTrendingUp className={`w-3.5 h-3.5 ${color}`} />;
  if (trend === 'down') return <FiTrendingDown className={`w-3.5 h-3.5 ${color}`} />;
  return <FiMinus className="w-3.5 h-3.5 text-slate-400" />;
};

const periodLabel: Record<string, string> = {
  today: 'Today',
  mtd: 'Month to date',
  ytd: 'Year to date',
  '30d': 'Last 30 days',
  current: 'Current',
  all_time: 'All time',
};

export default function KPIRow({ kpis, accentHex }: { kpis: KPI[]; accentHex: string }) {
  const { isDark } = useTheme();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.slice(0, 6).map((kpi, i) => (
        <div
          key={kpi.id}
          className={`rounded-2xl p-4 transition-all hover:scale-[1.02] ${
            isDark
              ? 'bg-[#151F32] border border-white/[0.06]'
              : 'bg-white border border-black/[0.06] shadow-sm'
          }`}
          style={{ animation: `cardFadeUp 400ms ease ${i * 60}ms both` }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {kpi.label}
            </p>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentHex }}
            />
          </div>
          <p className={`text-xl font-bold mono leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {kpi.value}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {trendIcon(kpi.trend, kpi.positive)}
            {kpi.change !== 0 && (
              <span className={`text-[11px] font-semibold ${kpi.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
            )}
            <span className={`text-[10px] ml-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {periodLabel[kpi.period] || kpi.period}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
