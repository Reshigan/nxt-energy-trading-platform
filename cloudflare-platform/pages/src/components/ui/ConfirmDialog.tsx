import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const iconColor = {
    danger: 'text-rose-400 bg-rose-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    info: 'text-blue-400 bg-blue-500/10',
  }[variant];

  const btnVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md rounded-2xl p-6 bg-white dark:bg-[#151F32] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]" aria-label="Close">
              <FiX className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${iconColor}`}>
                <FiAlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
              <Button variant={btnVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
