import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from '../../lib/fi-icons-shim';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Error state banner for failed API calls (Rule 3) */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const tc = useThemeClasses();
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border ${tc.isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}
      role="alert"
    >
      <FiAlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
      <p className={`text-sm flex-1 ${tc.isDark ? 'text-rose-300' : 'text-rose-700'}`}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
          aria-label="Retry loading data"
        >
          <FiRefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
