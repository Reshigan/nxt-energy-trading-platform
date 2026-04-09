import React from 'react';

interface AllocationItem {
  name: string;
  pct: number;
  color: string;
  value: string;
}

const allocations: AllocationItem[] = [
  { name: 'Solar PPAs', pct: 34, color: '#F59E0B', value: 'R8.4M' },
  { name: 'Wind Contracts', pct: 25, color: '#3B82F6', value: 'R6.2M' },
  { name: 'Carbon Credits', pct: 17, color: '#10B981', value: 'R4.1M' },
  { name: 'Gas Forwards', pct: 15, color: '#8B5CF6', value: 'R3.8M' },
  { name: 'RECs', pct: 9, color: '#EC4899', value: 'R2.3M' },
];

export default function SpendingOverview() {
  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700/30">
        {allocations.map((a, i) => (
          <div key={a.name} style={{ width: `${a.pct}%`, backgroundColor: a.color, animation: `barGrow 800ms ease ${i * 100}ms both` }}
            className="first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {allocations.map(a => (
          <div key={a.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-sm text-slate-600 dark:text-slate-400">{a.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mono">{a.value}</span>
              <span className="text-xs text-slate-400 w-8 text-right">{a.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
