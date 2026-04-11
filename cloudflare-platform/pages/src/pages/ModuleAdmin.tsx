import React from 'react';
import { useModules } from '../hooks/useModules';
import { useTheme } from '../contexts/ThemeContext';

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  trading: 'Trading',
  carbon: 'Carbon & Environmental',
  ipp: 'IPP & Generation',
  compliance: 'Compliance & Settlement',
  advanced: 'Advanced Analytics',
  integration: 'Integrations',
};

const CATEGORY_ORDER = ['core', 'trading', 'carbon', 'ipp', 'compliance', 'advanced', 'integration'];

export default function ModuleAdmin() {
  const { moduleList, toggleModule, loading } = useModules();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Module Administration</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-16 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  const grouped: Record<string, typeof moduleList> = {};
  for (const mod of moduleList) {
    if (!grouped[mod.category]) grouped[mod.category] = [];
    grouped[mod.category].push(mod);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Module Administration</h1>
      <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Enable or disable platform modules. Core modules cannot be disabled.
      </p>

      {CATEGORY_ORDER.map(category => {
        const mods = grouped[category];
        if (!mods || mods.length === 0) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {CATEGORY_LABELS[category] || category}
            </h2>
            <div className="space-y-2">
              {mods.map(mod => (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {mod.display_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        mod.category === 'core'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {mod.min_subscription_tier}
                      </span>
                    </div>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {mod.description}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleModule(mod.id, !mod.enabled)}
                    disabled={mod.category === 'core'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      mod.enabled
                        ? 'bg-emerald-500 focus:ring-emerald-500'
                        : isDark ? 'bg-white/10 focus:ring-white/20' : 'bg-slate-300 focus:ring-slate-300'
                    } ${mod.category === 'core' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={`Toggle ${mod.display_name}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        mod.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
