import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  verified: 'bg-emerald-500/20 text-emerald-400',
  pass: 'bg-emerald-500/20 text-emerald-400',
  settled: 'bg-emerald-500/20 text-emerald-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
  filled: 'bg-emerald-500/20 text-emerald-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  in_review: 'bg-yellow-500/20 text-yellow-400',
  running: 'bg-yellow-500/20 text-yellow-400',
  open: 'bg-blue-500/20 text-blue-400',
  partial: 'bg-blue-500/20 text-blue-400',
  draft: 'bg-slate-500/20 text-slate-400',
  outstanding: 'bg-orange-500/20 text-orange-400',
  overdue: 'bg-red-500/20 text-red-400',
  fail: 'bg-red-500/20 text-red-400',
  rejected: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-red-500/20 text-red-400',
  disputed: 'bg-red-500/20 text-red-400',
  expired: 'bg-slate-500/20 text-slate-400',
  retired: 'bg-purple-500/20 text-purple-400',
  exercised: 'bg-purple-500/20 text-purple-400',
  overridden: 'bg-amber-500/20 text-amber-400',
  exempt: 'bg-slate-500/20 text-slate-400',
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
