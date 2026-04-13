import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiRefreshCw, FiCheck, FiAlertTriangle } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { schedulingAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';
import Modal from '../components/Modal';

interface Nomination { id: string; trade_id: string; generator_id: string; offtaker_id: string; delivery_date: string; volume_mwh: number; status: string; generator_name?: string; offtaker_name?: string; }

export default function Scheduling() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [imbalance, setImbalance] = useState<Record<string, unknown> | null>(null);
  const [showNominate, setShowNominate] = useState(false);
  const [nomForm, setNomForm] = useState({ trade_id: '', volume_mwh: 0, delivery_date: '' });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nomRes, imbRes] = await Promise.all([schedulingAPI.getNominations(), schedulingAPI.getImbalance()]);
      setNominations(nomRes.data?.data || []);
      setImbalance(imbRes.data?.data || null);
    } catch { setError('Failed to load scheduling data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNominate = async () => {
    try {
      await schedulingAPI.nominate(nomForm);
      toast.success('Nomination submitted for D+1 delivery');
      setShowNominate(false);
      loadData();
    } catch { toast.error('Nomination failed'); }
  };

  const handleConfirm = async (id: string) => {
    try {
      await schedulingAPI.confirm(id);
      toast.success('Nomination confirmed');
      loadData();
    } catch { toast.error('Confirmation failed'); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'nominated': return 'bg-amber-500/10 text-amber-500';
      case 'confirmed': return 'bg-blue-500/10 text-blue-500';
      case 'grid_confirmed': return 'bg-emerald-500/10 text-emerald-500';
      case 'delivered': return 'bg-green-500/10 text-green-500';
      case 'settled': return 'bg-purple-500/10 text-purple-500';
      default: return 'bg-slate-500/10 text-slate-500';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Scheduling & Nominations</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">D-1/D/D+1 delivery scheduling and imbalance settlement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowNominate(true)}>Nominate Delivery</Button>
          <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Imbalance summary */}
      {imbalance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">Total Nominated</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mono">{String(imbalance.total_nominated_mwh ?? 0)} MWh</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">Total Delivered</p>
            <p className="text-xl font-bold text-emerald-500 mono">{String(imbalance.total_delivered_mwh ?? 0)} MWh</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">Imbalance</p>
            <p className={`text-xl font-bold mono ${(imbalance.total_imbalance_mwh as number) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{String(imbalance.total_imbalance_mwh ?? 0)} MWh</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">Imbalance Cost</p>
            <p className="text-xl font-bold text-red-500 mono">R{((imbalance.total_imbalance_cost_rands as number) || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Nominations list */}
      {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> :
        nominations.length === 0 ? <EmptyState title="No nominations" description="Submit a delivery nomination to get started." /> : (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Nominations</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-left py-2 font-medium">Generator</th>
              <th className="text-left py-2 font-medium">Offtaker</th>
              <th className="text-right py-2 font-medium">Volume</th>
              <th className="text-center py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Actions</th>
            </tr></thead>
            <tbody>{nominations.map(n => (
              <tr key={n.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 text-slate-800 dark:text-slate-200">{new Date(n.delivery_date).toLocaleDateString()}</td>
                <td className="py-2.5 text-slate-500">{n.generator_name || n.generator_id?.substring(0, 8)}</td>
                <td className="py-2.5 text-slate-500">{n.offtaker_name || n.offtaker_id?.substring(0, 8)}</td>
                <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{n.volume_mwh} MWh</td>
                <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(n.status)}`}>{n.status}</span></td>
                <td className="py-2.5 text-right">
                  {n.status === 'nominated' && <Button variant="ghost" onClick={() => handleConfirm(n.id)} className="text-xs"><FiCheck className="w-3 h-3" /> Confirm</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showNominate} onClose={() => setShowNominate(false)} title="Nominate Delivery">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Trade ID</label>
            <input value={nomForm.trade_id} onChange={e => setNomForm(p => ({ ...p, trade_id: e.target.value }))} placeholder="Enter trade ID" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Volume (MWh)</label>
            <input type="number" value={nomForm.volume_mwh} onChange={e => setNomForm(p => ({ ...p, volume_mwh: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Delivery Date</label>
            <input type="date" value={nomForm.delivery_date} onChange={e => setNomForm(p => ({ ...p, delivery_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowNominate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleNominate}>Submit Nomination</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
