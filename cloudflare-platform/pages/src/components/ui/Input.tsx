import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helpText?: string;
}

export function Input({
  label,
  error,
  icon,
  helpText,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-label={label || props['aria-label']}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          className={`
            w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border
            bg-slate-50 dark:bg-white/[0.04]
            border-black/[0.06] dark:border-white/[0.06]
            text-slate-800 dark:text-white
            placeholder-slate-400 dark:placeholder-slate-500
            focus:border-blue-500 dark:focus:border-blue-500/50
            focus:ring-1 focus:ring-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-rose-400 dark:border-rose-500/50 focus:border-rose-500' : ''}
            ${className}
          `.trim()}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-rose-500" role="alert">{error}</p>
      )}
      {helpText && !error && (
        <p id={`${inputId}-help`} className="text-xs text-slate-400">{helpText}</p>
      )}
    </div>
  );
}
