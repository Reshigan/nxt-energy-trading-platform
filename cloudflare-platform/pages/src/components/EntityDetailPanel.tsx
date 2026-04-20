/**
 * EntityDetailPanel — Slide-out panel showing entity + all related entities + timeline.
 * Listens for 'open-entity-detail' custom events dispatched by EntityLink.
 * Supports navigation between related entities by clicking EntityLink chips inside the panel.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import EntityLink, { EntityType } from './EntityLink';
import { entityAPI } from '../lib/api';

interface TimelineEntry {
  date: string;
  action: string;
  actor?: string;
  details?: string;
}

interface RelatedEntity {
  type: EntityType;
  id: string;
  label: string;
  status?: string;
}

interface EntityGraph {
  entity: Record<string, unknown>;
  related: RelatedEntity[];
  timeline: TimelineEntry[];
  stats?: Record<string, unknown>;
}

export default function EntityDetailPanel() {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('trade');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<EntityGraph | null>(null);
  const [history, setHistory] = useState<Array<{ type: EntityType; id: string }>>([]);

  const loadEntity = useCallback(async (type: EntityType, id: string) => {
    setLoading(true);
    setError(null);
    setEntityType(type);
    setEntityId(id);
    setOpen(true);
    try {
      const res = await entityAPI.getGraph(type, id);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        // Normalize related entities from the graph response
        const related: RelatedEntity[] = [];
        const entity = data.entity || data;

        // Extract related entities from the response
        if (data.related && Array.isArray(data.related)) {
          related.push(...data.related);
        } else {
          // The backend returns related as an object with named fields.
          // Look in both data and data.related for entity references.
          const source = (data.related && typeof data.related === 'object' && !Array.isArray(data.related))
            ? { ...data, ...data.related } : data;

          // Build related entities from named fields
          const relatedFields: Array<{ key: string; type: EntityType; labelKey: string }> = [
            { key: 'buyer', type: 'participant', labelKey: 'company_name' },
            { key: 'seller', type: 'participant', labelKey: 'company_name' },
            { key: 'creator', type: 'participant', labelKey: 'company_name' },
            { key: 'counterparty', type: 'participant', labelKey: 'company_name' },
            { key: 'developer', type: 'participant', labelKey: 'company_name' },
            { key: 'lender', type: 'participant', labelKey: 'company_name' },
            { key: 'grid_operator', type: 'participant', labelKey: 'company_name' },
            { key: 'offtaker', type: 'participant', labelKey: 'company_name' },
            { key: 'owner', type: 'participant', labelKey: 'company_name' },
            { key: 'depositor', type: 'participant', labelKey: 'company_name' },
            { key: 'beneficiary', type: 'participant', labelKey: 'company_name' },
            { key: 'from_participant', type: 'participant', labelKey: 'company_name' },
            { key: 'to_participant', type: 'participant', labelKey: 'company_name' },
            { key: 'escrow', type: 'escrow', labelKey: 'status' },
            { key: 'invoice', type: 'invoice', labelKey: 'invoice_number' },
            { key: 'contract', type: 'contract', labelKey: 'title' },
            { key: 'project', type: 'project', labelKey: 'name' },
            { key: 'trade', type: 'trade', labelKey: 'market' },
          ];

          for (const field of relatedFields) {
            const val = source[field.key];
            if (val && typeof val === 'object' && (val as Record<string, unknown>).id) {
              const v = val as Record<string, unknown>;
              related.push({
                type: field.type,
                id: v.id as string,
                label: `${field.key.replace(/_/g, ' ')}: ${(v[field.labelKey] as string) || (v.id as string).substring(0, 8)}`,
                status: (v.status as string) || undefined,
              });
            }
          }

          // Handle arrays of related entities
          const arrayFields: Array<{ key: string; type: EntityType; labelKey: string }> = [
            { key: 'trades', type: 'trade', labelKey: 'market' },
            { key: 'invoices', type: 'invoice', labelKey: 'invoice_number' },
            { key: 'escrows', type: 'escrow', labelKey: 'status' },
            { key: 'contracts', type: 'contract', labelKey: 'title' },
            { key: 'projects', type: 'project', labelKey: 'name' },
            { key: 'credits', type: 'credit', labelKey: 'standard' },
            { key: 'milestones', type: 'project', labelKey: 'name' },
            { key: 'signatories', type: 'participant', labelKey: 'company_name' },
            { key: 'statutory_checks', type: 'contract', labelKey: 'check_name' },
            { key: 'version_chain', type: 'contract', labelKey: 'title' },
            { key: 'conditions_precedent', type: 'project', labelKey: 'description' },
            { key: 'disbursements', type: 'project', labelKey: 'status' },
            { key: 'trades_as_buyer', type: 'trade', labelKey: 'market' },
            { key: 'trades_as_seller', type: 'trade', labelKey: 'market' },
          ];

          for (const field of arrayFields) {
            const arr = source[field.key];
            if (Array.isArray(arr)) {
              for (const item of arr.slice(0, 5)) {
                if (item && typeof item === 'object' && item.id) {
                  related.push({
                    type: field.type,
                    id: item.id,
                    label: `${field.key.replace(/_/g, ' ')}: ${item[field.labelKey] || item.id.substring(0, 8)}`,
                    status: item.status || undefined,
                  });
                }
              }
            }
          }
        }

        // Extract timeline
        const timeline: TimelineEntry[] = [];
        if (data.timeline && Array.isArray(data.timeline)) {
          timeline.push(...data.timeline);
        } else if (data.audit_trail && Array.isArray(data.audit_trail)) {
          for (const entry of data.audit_trail) {
            timeline.push({
              date: entry.created_at || entry.timestamp || '',
              action: entry.action || entry.event || '',
              actor: entry.actor_id || entry.actor || '',
              details: entry.details || '',
            });
          }
        }

        setGraph({ entity, related, timeline, stats: data.stats || undefined });
      } else {
        setError(res.data?.error || 'Failed to load entity');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to load entity details');
    }
    setLoading(false);
  }, []);

  // Listen for custom events from EntityLink
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type && detail?.id) {
        if (entityId) setHistory(prev => [...prev, { type: entityType, id: entityId }]);
        loadEntity(detail.type, detail.id);
      }
    };
    window.addEventListener('open-entity-detail', handler);
    return () => window.removeEventListener('open-entity-detail', handler);
  }, [loadEntity, entityType, entityId]);

  const handleBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      loadEntity(prev.type, prev.id);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setGraph(null);
    setHistory([]);
    setError(null);
  };

  const handleNavigate = (type: EntityType, id: string) => {
    setHistory(prev => [...prev, { type: entityType, id: entityId }]);
    loadEntity(type, id);
  };

  if (!open) return null;

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      if (key.includes('cents') || key.includes('amount') || key.includes('price') || key.includes('total') || key.includes('cost')) {
        return `R ${(value / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
      }
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return String(value);
  };

  const entityFields = graph?.entity ? Object.entries(graph.entity).filter(
    ([k, v]) => typeof v !== 'object' && !k.endsWith('_id') && k !== 'id' && v !== null && v !== undefined
  ) : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998] transition-opacity"
        onClick={handleClose}
        aria-label="Close entity detail panel"
      />

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] md:w-[540px] z-[999] shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          isDark ? 'bg-[#0F1724] border-l border-white/[0.06]' : 'bg-white border-l border-slate-200'
        }`}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-label={`${entityType} detail panel`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 px-5 py-4 border-b ${isDark ? 'bg-[#0F1724] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button onClick={handleBack} className="text-slate-400 hover:text-blue-500 transition-colors text-sm" aria-label="Go back">
                  ← Back
                </button>
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {entityType} Details
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">{entityId}</p>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-400">Loading entity graph...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button onClick={() => loadEntity(entityType, entityId)} className="text-xs text-red-500 underline mt-2">Retry</button>
            </div>
          )}

          {graph && !loading && (
            <>
              {/* Entity Fields */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Entity Properties</h3>
                <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  {entityFields.map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-slate-900 dark:text-white font-medium text-right max-w-[60%] truncate">
                        {formatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Stats */}
              {graph.stats && Object.keys(graph.stats).length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(graph.stats).map(([key, value]) => (
                      <div key={key} className={`p-3 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-blue-50 border-blue-100'}`}>
                        <p className="text-xs text-slate-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatValue(key, value)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Related Entities */}
              {graph.related.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Related Entities ({graph.related.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {graph.related.map((rel, i) => (
                      <EntityLink
                        key={`${rel.type}-${rel.id}-${i}`}
                        type={rel.type}
                        id={rel.id}
                        label={rel.label}
                        onClick={handleNavigate}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Timeline */}
              {graph.timeline.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Timeline ({graph.timeline.length})
                  </h3>
                  <div className="space-y-0">
                    {graph.timeline.slice(0, 20).map((entry, i) => (
                      <div key={i} className="flex gap-3 relative">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-2 ${i === 0 ? 'bg-blue-500' : isDark ? 'bg-white/20' : 'bg-slate-300'}`} />
                          {i < graph.timeline.length - 1 && (
                            <div className={`w-px flex-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        <div className="pb-4 min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{entry.action}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {entry.date ? new Date(entry.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            {entry.actor ? ` · ${entry.actor.substring(0, 8)}` : ''}
                          </p>
                          {entry.details && typeof entry.details === 'string' && entry.details.length < 200 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
