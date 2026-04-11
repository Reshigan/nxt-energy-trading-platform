import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiClock } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

export interface ActionItem {
  id: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  action_url: string;
  deadline: string | null;
  created_at: string;
}

const urgencyConfig: Record<string, { bg: string; border: string; dot: string; label: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500', label: 'Critical' },
  high: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500', label: 'High' },
  medium: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500', label: 'Medium' },
  low: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-400', label: 'Low' },
};

const actionLabels: Record<string, string> = {
  approve: 'Approve',
  sign: 'Sign',
  review: 'Review',
  upload: 'Upload',
  pay: 'Pay',
  override: 'Override',
};

interface ActionQueueProps {
  items: ActionItem[];
  onAction?: (item: ActionItem) => void;
}

export default function ActionQueue({ items, onAction }: ActionQueueProps) {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleAction = (item: ActionItem) => {
    if (onAction) {
      onAction(item);
    } else {
      navigate(item.action_url);
    }
  };

  if (items.length === 0) {
    return (
      <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <FiAlertCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>All caught up — no pending actions</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-black/[0.06]'}`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Action Queue
        </h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          {items.length} pending
        </span>
      </div>
      <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
        {items.map((item) => {
          const cfg = urgencyConfig[item.urgency] || urgencyConfig.low;
          return (
            <div
              key={item.id}
              className={`px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer`}
              onClick={() => handleAction(item)}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.title}
                </p>
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {item.description}
                </p>
              </div>
              {item.deadline && (
                <div className="flex items-center gap-1 shrink-0">
                  <FiClock className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-400">{item.deadline}</span>
                </div>
              )}
              <button
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${cfg.bg} ${cfg.border} border hover:opacity-80`}
                onClick={(e) => { e.stopPropagation(); handleAction(item); }}
              >
                {actionLabels[item.action_type] || 'View'}
                <FiArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
