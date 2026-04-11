import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { platformConfigAPI } from '../lib/api';

interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
  category: string | null;
  updated_by: string | null;
  updated_at: string;
}

export default function PlatformConfig() {
  const { isDark } = useTheme();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchConfigs = async () => {
    try {
      const res = await platformConfigAPI.list();
      setConfigs(res.data.data || []);
    } catch {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async (key: string) => {
    setSaving(true);
    setError('');
    try {
      await platformConfigAPI.update(key, { value: editValue });
      setEditing(null);
      fetchConfigs();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const grouped: Record<string, ConfigItem[]> = {};
  for (const cfg of configs) {
    const cat = cfg.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(cfg);
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform Configuration</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-16 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform Configuration</h1>
      <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Manage dynamic platform settings. Changes are cached for 5 minutes.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {category}
          </h2>
          <div className="space-y-2">
            {items.map(cfg => (
              <div
                key={cfg.key}
                className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <code className={`text-sm font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{cfg.key}</code>
                    {cfg.description && (
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{cfg.description}</p>
                    )}
                  </div>

                  {editing === cfg.key ? (
                    <div className="flex items-center gap-2 ml-4">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className={`px-2 py-1 rounded border text-sm w-40 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(cfg.key)}
                        disabled={saving}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className={`px-3 py-1 rounded text-xs ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{cfg.value}</span>
                      <button
                        onClick={() => { setEditing(cfg.key); setEditValue(cfg.value); }}
                        className={`text-xs px-2 py-1 rounded ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                {cfg.updated_at && (
                  <span className={`text-xs mt-2 block ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                    Last updated: {new Date(cfg.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
