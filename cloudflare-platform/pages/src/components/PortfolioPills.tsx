import React from 'react';

interface PillData {
  name: string;
  value: string;
  color: string;
  change: string;
  positive: boolean;
}

const pillData: PillData[] = [
  { name: 'Solar PPAs', value: 'R8.4M', color: '#F59E0B', change: '+12%', positive: true },
  { name: 'Wind Contracts', value: 'R6.2M', color: '#3B82F6', change: '+8%', positive: true },
  { name: 'Carbon Credits', value: 'R4.1M', color: '#10B981', change: '+15%', positive: true },
  { name: 'Gas Forwards', value: 'R3.8M', color: '#8B5CF6', change: '-3%', positive: false },
  { name: 'RECs', value: 'R2.3M', color: '#EC4899', change: '+6%', positive: true },
];

export default function PortfolioPills() {
  return (
    <div className="flex flex-wrap gap-2">
      {pillData.map((pill, i) => (
        <div key={pill.name}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#1A2640] border border-black/[0.06] dark:border-white/[0.06] transition-all hover:shadow-md cursor-default"
          style={{ animation: `pillSpring 400ms cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms both` }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pill.color }} />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{pill.name}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mono">{pill.value}</span>
          <span className={`text-[10px] font-bold ${pill.positive ? 'text-emerald-500' : 'text-red-500'}`}>{pill.change}</span>
        </div>
      ))}
    </div>
  );
}
