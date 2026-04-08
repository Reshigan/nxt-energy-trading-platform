import React from 'react';
import { FiInbox } from 'react-icons/fi';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Empty state placeholder when API returns no data (Rule 3) */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const tc = useThemeClasses();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="status">
      <div className={`p-4 rounded-2xl mb-4 ${tc.isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
        {icon || <FiInbox className={`w-8 h-8 ${tc.textMuted}`} />}
      </div>
      <h3 className={`text-lg font-semibold mb-1 ${tc.textPrimary}`}>{title}</h3>
      {description && (
        <p className={`text-sm max-w-sm ${tc.textSecondary}`}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
