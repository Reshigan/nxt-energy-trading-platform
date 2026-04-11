import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export default function CockpitSkeleton() {
  const { isDark } = useTheme();
  const bar = isDark ? 'bg-slate-700/50' : 'bg-slate-200/80';

  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}
          >
            <div className={`h-3 ${bar} rounded w-2/3 mb-3`} />
            <div className={`h-6 ${bar} rounded w-1/2 mb-2`} />
            <div className={`h-2.5 ${bar} rounded w-1/3`} />
          </div>
        ))}
      </div>

      {/* Action Queue + Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
          <div className={`h-4 ${bar} rounded w-1/3 mb-4`} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${bar}`} />
              <div className="flex-1">
                <div className={`h-3 ${bar} rounded w-3/4 mb-1`} />
                <div className={`h-2.5 ${bar} rounded w-1/2`} />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${bar}`} />
                <div className={`h-4 ${bar} rounded w-1/2`} />
              </div>
              <div className={`h-3 ${bar} rounded w-3/4 mb-2`} />
              <div className={`h-3 ${bar} rounded w-1/2`} />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
        <div className={`h-4 ${bar} rounded w-1/4 mb-4`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 mb-3">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${bar}`} />
            <div className="flex-1">
              <div className={`h-3 ${bar} rounded w-2/3 mb-1`} />
              <div className={`h-2.5 ${bar} rounded w-1/3`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
