import React, { useEffect, useState } from 'react';
import { pipelineAPI } from '../lib/api';

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  prospect: { label: 'Prospect', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  interested: { label: 'Interested', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/30' },
  loi: { label: 'LOI', color: 'text-indigo-400', bg: 'bg-indigo-500/20 border-indigo-500/30' },
  negotiating: { label: 'Negotiating', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  legal: { label: 'Legal Review', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  statutory: { label: 'Statutory', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
  execution: { label: 'Execution', color: 'text-pink-400', bg: 'bg-pink-500/20 border-pink-500/30' },
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  amended: { label: 'Amended', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' },
  terminated: { label: 'Terminated', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
};

export default function Pipeline() {
  const [stages, setStages] = useState<Record<string, unknown[]>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([pipelineAPI.getDeals(), pipelineAPI.getStats()]).then(([dealsRes, statsRes]) => {
      setStages(dealsRes.data?.data?.stages || {});
      setStats(statsRes.data?.data || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalDeals = Object.values(stages).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">Track all deals from prospect to active — Kanban view</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <span className="text-slate-400">Total Deals:</span> <span className="text-white font-semibold ml-1">{totalDeals}</span>
          </div>
          <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <span className="text-slate-400">Conversion:</span> <span className="text-green-400 font-semibold ml-1">{Number(stats.conversion_rate) || 0}%</span>
          </div>
          <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <span className="text-slate-400">Avg Days:</span> <span className="text-blue-400 font-semibold ml-1">{Number(stats.avg_days_to_close) || 0}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="min-w-[280px] h-96 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(STAGE_CONFIG).map(([key, config]) => {
            const deals = stages[key] || [];
            return (
              <div key={key} className="min-w-[280px] max-w-[300px] flex-shrink-0">
                <div className={`rounded-t-lg px-3 py-2 border ${config.bg} flex items-center justify-between`}>
                  <span className={`font-semibold text-sm ${config.color}`}>{config.label}</span>
                  <span className="bg-slate-900/50 text-white text-xs px-2 py-0.5 rounded-full">{deals.length}</span>
                </div>
                <div className="bg-slate-800/30 border border-t-0 border-slate-700/50 rounded-b-lg p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                  {deals.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-8">No deals</div>
                  )}
                  {deals.map((rawDeal: unknown, idx: number) => {
                    const deal = rawDeal as Record<string, unknown>;
                    return (
                    <div key={String(deal.id || idx)} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer">
                      <div className="font-medium text-sm text-white truncate">{String(deal.title || deal.project_name || `Deal ${idx + 1}`)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {deal.counterparty_name ? String(deal.counterparty_name) : deal.company_name ? String(deal.company_name) : ''}
                      </div>
                      {deal.value_cents ? (
                        <div className="text-xs text-green-400 mt-1">R{(Number(deal.value_cents) / 100).toLocaleString()}</div>
                      ) : null}
                      {Number(deal.days_in_stage) > 0 && (
                        <div className={`text-xs mt-1 ${Number(deal.days_in_stage) > 14 ? 'text-red-400' : 'text-slate-500'}`}>
                          {String(deal.days_in_stage)}d in stage
                        </div>
                      )}
                      {Array.isArray(deal.blockers) && (deal.blockers as Array<Record<string, unknown>>).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(deal.blockers as Array<Record<string, unknown>>).map((b, bi) => (
                            <div key={bi} className="text-xs bg-red-500/10 text-red-400 rounded px-2 py-0.5">{String(b.detail)}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
