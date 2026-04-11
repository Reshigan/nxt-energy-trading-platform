import React from 'react';
import { FiClock } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  actor: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntity(type: string, id: string): string {
  const shortId = id.length > 12 ? `${id.slice(0, 8)}...` : id;
  return `${type.replace(/_/g, ' ')} ${shortId}`;
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const { isDark } = useTheme();

  if (items.length === 0) {
    return (
      <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
        <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Recent Activity
        </h3>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No recent activity</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
      <div className={`px-4 py-3 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-black/[0.06]'}`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
        {items.map((item, i) => (
          <div key={item.id || i} className="px-4 py-3 flex items-start gap-3">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="font-medium">{formatAction(item.action)}</span>
                {item.entity_type && (
                  <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {' '}&mdash; {formatEntity(item.entity_type, item.entity_id)}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <FiClock className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400">
                  {item.timestamp ? timeAgo(item.timestamp) : ''}
                </span>
                {item.actor && (
                  <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    by {item.actor.length > 16 ? `${item.actor.slice(0, 12)}...` : item.actor}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
