import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
}

export function Tabs({ tabs, active, onChange, variant = 'pill' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className="flex border-b border-black/[0.06] dark:border-white/[0.06] gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              active === tab.key
                ? 'text-blue-500'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.count != null && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active === tab.key ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
            {active === tab.key && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04]" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
            active === tab.key
              ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
