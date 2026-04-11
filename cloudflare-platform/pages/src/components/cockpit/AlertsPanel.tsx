import React from 'react';
import { FiAlertTriangle, FiInfo, FiAlertCircle, FiX } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  created_at: string;
}

const severityConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  critical: {
    icon: <FiAlertCircle className="w-4 h-4 text-red-500" />,
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    text: 'text-red-500',
  },
  warning: {
    icon: <FiAlertTriangle className="w-4 h-4 text-amber-500" />,
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
  },
  info: {
    icon: <FiInfo className="w-4 h-4 text-blue-500" />,
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
  },
};

interface AlertsPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

export default function AlertsPanel({ alerts, onDismiss }: AlertsPanelProps) {
  const { isDark } = useTheme();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const cfg = severityConfig[alert.severity] || severityConfig.info;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
          >
            <div className="mt-0.5 shrink-0">{cfg.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {alert.title}
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {alert.message}
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className={`shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
              >
                <FiX className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
