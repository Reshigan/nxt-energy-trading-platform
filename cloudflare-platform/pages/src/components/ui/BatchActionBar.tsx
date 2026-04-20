import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatZAR } from '../../lib/format';

interface BatchAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
}

interface BatchActionBarProps {
  selectedCount: number;
  actions: BatchAction[];
  totalValue?: number; // in cents
  currency?: boolean;
  className?: string;
}

export function BatchActionBar({ selectedCount, actions, totalValue, currency = true, className = '' }: BatchActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md
            bg-slate-900/90 border border-slate-700/50 ${className}`}
        >
          <div className="flex items-center gap-3">
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedCount} selected
            </span>
            {totalValue !== undefined && totalValue > 0 && (
              <span className="text-slate-400 text-sm font-mono">
                {formatZAR(totalValue / 100)}
              </span>
            )}
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex items-center gap-2">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  ${action.variant === 'danger' ? 'bg-red-600 hover:bg-red-500 text-white' :
                    action.variant === 'secondary' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' :
                    'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {action.icon && <span className="mr-1.5">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
