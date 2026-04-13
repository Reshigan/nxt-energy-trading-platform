import React, { useEffect, useState } from 'react';
import { briefingAPI } from '../lib/api';

export default function MorningBriefing() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    briefingAPI.get().then((r) => setData(r.data?.data || null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-slate-800/50 rounded-xl h-32 animate-pulse mb-6" />;
  if (!data) return null;

  const portfolio = (data.portfolio || {}) as Record<string, unknown>;
  const markets = (data.markets || {}) as Record<string, Record<string, unknown>>;
  const priorities = (data.priorities || []) as Array<Record<string, unknown>>;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700 rounded-xl mb-6 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-3">
          <span className="text-lg">☀️</span>
          <div>
            <span className="text-white font-semibold text-sm">{String(data.greeting || 'Good morning')}</span>
            <span className="text-slate-400 text-xs ml-2">{String(data.date || '')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {Number(data.unread_threads) > 0 && (
            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{String(data.unread_threads)} unread</span>
          )}
          <span className="text-slate-400 text-sm">{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Markets */}
          {Object.keys(markets).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Markets</h4>
              <div className="flex gap-3">
                {Object.entries(markets).map(([market, info]) => (
                  <div key={market} className="bg-slate-900/50 rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-300 capitalize">{market}</span>
                    <span className="text-white font-medium ml-2">R{((Number(info?.price_cents) || 0) / 100).toFixed(2)}</span>
                    <span className={`ml-1 ${Number(info?.change_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(info?.change_pct) >= 0 ? '+' : ''}{Number(info?.change_pct || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Your Portfolio</h4>
            <div className="flex gap-3 text-xs">
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-400">Active Contracts:</span> <span className="text-white ml-1">{Number(portfolio.active_contracts) || 0}</span>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-400">Active Value:</span> <span className="text-green-400 ml-1">R{((Number(portfolio.active_value_cents) || 0) / 100).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-400">Pipeline:</span> <span className="text-blue-400 ml-1">R{((Number(portfolio.pipeline_value_cents) || 0) / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Priorities */}
          {priorities.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Today&apos;s Priorities</h4>
              <div className="space-y-1">
                {priorities.slice(0, 3).map((p, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${p.severity === 'critical' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'}`}>
                    <span>{String(p.title)}</span>
                    {p.recommended_action ? <span className="text-[10px] opacity-70">{String(p.recommended_action)}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
