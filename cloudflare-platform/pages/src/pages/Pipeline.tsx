import React, { useEffect, useState, useCallback } from 'react';
import { pipelineAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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

type Deal = {
  id: string; title?: string; project_name?: string; counterparty_name?: string; company_name?: string;
  value_cents?: number; days_in_stage?: number; blockers?: Array<{ detail?: string }>;
  deal_type?: string; stage?: string;
};

function DealCard({ deal, isDragging = false }: { deal: Deal; isDragging?: boolean }) {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const dealValue = deal.value_cents ? formatZAR(Number(deal.value_cents) / 100) : null;
  const isBlocked = deal.blockers && deal.blockers.length > 0;
  const daysInStage = Number(deal.days_in_stage) || 0;
  return (
    <div className={`bg-slate-800 rounded-lg p-3 border transition-all cursor-grab active:cursor-grabbing
      ${isDragging ? 'opacity-50 scale-105 shadow-xl border-blue-500/50' : c('hover:border-slate-600', 'hover:border-slate-400')}
      ${isBlocked ? 'border-red-500/40' : c('border-slate-700/50', 'border-slate-200')}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate">{deal.title || deal.project_name || `Deal`}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {deal.counterparty_name || deal.company_name || 'No counterparty'}
          </div>
        </div>
        {deal.deal_type && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${c('bg-slate-700 text-slate-300', 'bg-slate-100 text-slate-600')} capitalize`}>
            {deal.deal_type}
          </span>
        )}
      </div>
      {dealValue && <div className="text-xs text-green-400 mt-1.5 font-mono">{dealValue}</div>}
      <div className="flex items-center justify-between mt-1.5">
        {daysInStage > 0 && (
          <span className={`text-xs ${daysInStage > 14 ? 'text-red-400' : 'text-slate-500'}`}>
            {daysInStage}d
          </span>
        )}
        {isBlocked && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Blocked
          </span>
        )}
      </div>
      {isBlocked && deal.blockers!.length > 0 && (
        <div className="mt-2 space-y-1">
          {deal.blockers!.slice(0, 2).map((b, bi) => (
            <div key={bi} className="text-xs bg-red-500/10 text-red-400 rounded px-2 py-1 truncate">
              {String(b.detail || 'Blocker')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableDeal({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, data: { deal } });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <DealCard deal={deal} isDragging={isDragging} />
    </div>
  );
}

function StageColumn({ stageKey, config, deals }: { stageKey: string; config: typeof STAGE_CONFIG[string]; deals: Deal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  const stageValue = deals.reduce((s, d) => s + (Number(d.value_cents) || 0) / 100, 0);
  return (
    <div className="min-w-[280px] max-w-[300px] flex-shrink-0 flex flex-col">
      <div className={`rounded-t-lg px-3 py-2 border ${config.bg} flex items-center justify-between`}>
        <span className={`font-semibold text-sm ${config.color}`}>{config.label}</span>
        <div className="flex items-center gap-2">
          <span className="bg-slate-900/50 text-white text-xs px-2 py-0.5 rounded-full">{deals.length}</span>
        </div>
      </div>
      <div ref={setNodeRef} className={`flex-1 bg-slate-800/20 border border-t-0 border-slate-700/50 rounded-b-lg p-2 space-y-2 min-h-[180px] max-h-[500px] overflow-y-auto transition-colors ${isOver ? 'bg-blue-500/10 border-blue-500/30' : ''}`}>
        {deals.length === 0 && (
          <div className={`text-center text-xs py-6 ${isOver ? 'text-blue-400' : 'text-slate-500'}`}>
            {isOver ? 'Drop here' : 'No deals'}
          </div>
        )}
        <AnimatePresence>
          {deals.map((deal) => (
            <motion.div key={deal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <DraggableDeal deal={deal} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {stageValue > 0 && (
        <div className="text-xs text-slate-500 text-right px-1 mt-1">
          {formatZAR(stageValue)}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const toast = useToast();
  const [stages, setStages] = useState<Record<string, Deal[]>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, statsRes] = await Promise.all([pipelineAPI.getDeals(), pipelineAPI.getStats()]);
      setStages(dealsRes.data?.data?.stages || {});
      setStats(statsRes.data?.data || {});
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as Deal;
    setActiveDeal(deal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;
    const dealId = active.id as string;
    const newStage = over.id as string;
    const deal = active.data.current?.deal as Deal;
    if (deal.stage === newStage) return;
    moveDeal(dealId, newStage);
  };

  const moveDeal = async (dealId: string, newStage: string) => {
    try {
      await pipelineAPI.updateStage(dealId, { stage: newStage });
      toast.success(`Moved to ${STAGE_CONFIG[newStage]?.label || newStage}`);
      loadPipeline();
    } catch { toast.error('Failed to move deal'); }
  };

  const allDeals = Object.values(stages).flat();
  const filteredDeals = allDeals.filter((d: Deal) => {
    const matchSearch = !searchTerm || (d.title || d.project_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || d.deal_type === filterType;
    return matchSearch && matchType;
  });

  const filteredStages: Record<string, Deal[]> = {};
  for (const [stage, deals] of Object.entries(stages)) {
    filteredStages[stage] = (deals as Deal[]).filter((d: Deal) => {
      const matchSearch = !searchTerm || (d.title || d.project_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || d.deal_type === filterType;
      return matchSearch && matchType;
    });
  }

  const totalValue = filteredDeals.reduce((s, d) => s + (Number(d.value_cents) || 0) / 100, 0);
  const activeDeals = filteredStages.active?.length || 0;
  const avgDays = Number(stats.avg_days_to_close) || 0;
  const conversion = Number(stats.conversion_rate) || 0;

  const dealTypes = [...new Set(filteredDeals.map((d: Deal) => d.deal_type).filter(Boolean))];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Deal Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1">Track all deals from prospect to active — Kanban drag-drop</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <span className="text-slate-400">Pipeline:</span> <span className="text-white font-semibold ml-1">{formatZAR(totalValue)}</span>
          </div>
          <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <span className="text-slate-400">Active:</span> <span className="text-green-400 font-semibold ml-1">{activeDeals}</span>
          </div>
          <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <span className="text-slate-400">Avg Days:</span> <span className="text-blue-400 font-semibold ml-1">{avgDays}</span>
          </div>
          <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <span className="text-slate-400">Conversion:</span> <span className="text-amber-400 font-semibold ml-1">{conversion}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <input type="text" placeholder="Search deals..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">All Types</option>
          {dealTypes.map(t => <option key={t} value={String(t)}>{String(t)}</option>)}
        </select>
        <span className="text-sm text-slate-400">{filteredDeals.length} deals</span>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="min-w-[280px] h-96 bg-slate-800/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(STAGE_CONFIG).map(([key, config]) => (
              <StageColumn key={key} stageKey={key} config={config} deals={filteredStages[key] || []} />
            ))}
          </div>
          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} isDragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
