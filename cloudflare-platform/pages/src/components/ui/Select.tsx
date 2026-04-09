import React from 'react';
import { FiChevronDown } from '../../lib/fi-icons-shim';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-label={label || props['aria-label']}
          aria-invalid={!!error}
          className={`
            w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none transition-all border appearance-none
            bg-slate-50 dark:bg-white/[0.04]
            border-black/[0.06] dark:border-white/[0.06]
            text-slate-800 dark:text-white
            focus:border-blue-500 dark:focus:border-blue-500/50
            focus:ring-1 focus:ring-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-rose-400 dark:border-rose-500/50' : ''}
            ${className}
          `.trim()}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <p className="text-xs text-rose-500" role="alert">{error}</p>
      )}
    </div>
  );
}
