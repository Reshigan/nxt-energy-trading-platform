import React, { useEffect, useState } from 'react';
import { intelligenceAPI } from '../lib/api';

type IntelItem = { id: string; category: string; severity: string; title: string; description: string; recommended_action: string; action_url: string; source_module: string; acknowledged: number; created_at: string };

export default function IntelligencePanel() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    Promise.all([
      intelligenceAPI.getItems({ acknowledged: '0', ...(filter ? { category: filter } : {}) }),
      intelligenceAPI.getSummary(),
    ]).then(([itemsRes, sumRes]) => {
      setItems(itemsRes.data?.data || []);
      setSummary(sumRes.data?.data || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  const handleAcknowledge = (id: string) => {
    intelligenceAPI.acknowledge(id).then(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }).catch(() => {});
  };

  const handleAcknowledgeAll = () => {
    intelligenceAPI.acknowledgeAll().then(() => setItems([])).catch(() => {});
  };

  const handleGenerate = () => {
    intelligenceAPI.generate().then(() => {
      intelligenceAPI.getItems({ acknowledged: '0' }).then((r) => setItems(r.data?.data || []));
    }).catch(() => {});
  };

  const severityColors: Record<string, string> = {
    critical: 'border-red-500/30 bg-red-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
    positive: 'border-green-500/30 bg-green-500/10',
    info: 'border-blue-500/30 bg-blue-500/10',
  };

  const severityText: Record<string, string> = {
    critical: 'text-red-400', warning: 'text-yellow-400', positive: 'text-green-400', info: 'text-blue-400',
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Intelligence Engine</h3>
          <span className="text-xs text-slate-400">{Number(summary.total_unacknowledged) || 0} unacknowledged items</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded">Scan Now</button>
          {items.length > 0 && <button onClick={handleAcknowledgeAll} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded">Clear All</button>}
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        <button onClick={() => setFilter('')} className={`px-2 py-1 rounded text-xs ${!filter ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>All</button>
        {['action', 'alert', 'insight', 'positive'].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-2 py-1 rounded text-xs capitalize ${filter === cat ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{cat}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">No intelligence items. Click &quot;Scan Now&quot; to generate.</div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className={`rounded-lg px-3 py-2.5 border ${severityColors[item.severity] || severityColors.info}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase ${severityText[item.severity] || 'text-blue-400'}`}>{item.severity}</span>
                    <span className="text-xs text-slate-500">{item.source_module}</span>
                  </div>
                  <div className="text-sm text-white font-medium mt-0.5">{item.title}</div>
                  {item.description && <div className="text-xs text-slate-300 mt-0.5">{item.description}</div>}
                  {item.recommended_action && (
                    <div className="text-xs text-blue-400 mt-1">→ {item.recommended_action}</div>
                  )}
                </div>
                <button onClick={() => handleAcknowledge(item.id)} className="text-slate-400 hover:text-white text-xs ml-2 shrink-0">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
