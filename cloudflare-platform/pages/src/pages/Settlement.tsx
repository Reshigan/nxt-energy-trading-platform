import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiShield, FiAlertTriangle, FiRefreshCw, FiLoader } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { settlementAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import EntityLink from '../components/EntityLink';

const TABS = ['Invoices', 'Escrows', 'Disputes'] as const;

interface Invoice { id: string; counterparty: string; amount: number; status: string; due_date: string; type: string; }
interface Escrow { id: string; parties: string; amount: number; status: string; conditions_met: number; conditions_total: number; created_at: string; }
interface Dispute { id: string; parties: string; type: string; amount: number; status: string; filed_at: string; }

const sc: Record<string, { bg: string; text: string }> = {
  Paid: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Overdue: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  Draft: { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
  Funded: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  Released: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Disputed: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  'Under Review': { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Mediation: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  Resolved: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
};

function Badge({ status }: { status: string }) {
  const s = sc[status] || sc['Draft'];
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${s.bg} ${s.text}`}>{status}</span>;
}

export default function Settlement() {
  const toast = useToast();
  const { isDark } = useTheme();
  const cv = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Invoices');
  const [invoiceData, setInvoiceData] = useState<Invoice[]>([]);
  const [escrowData, setEscrowData] = useState<Escrow[]>([]);
  const [disputeData, setDisputeData] = useState<Dispute[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [showGenInvoice, setShowGenInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ counterparty: '', amount: '', type: 'Energy Trade', due_date: '' });
  const [generating, setGenerating] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [invRes, escRes, dspRes] = await Promise.allSettled([
        settlementAPI.getInvoices(), settlementAPI.getEscrows(), settlementAPI.getDisputes(),
      ]);
      if (invRes.status === 'fulfilled') setInvoiceData(Array.isArray(invRes.value.data?.data) ? invRes.value.data.data : []);
      if (escRes.status === 'fulfilled') setEscrowData(Array.isArray(escRes.value.data?.data) ? escRes.value.data.data : []);
      if (dspRes.status === 'fulfilled') setDisputeData(Array.isArray(dspRes.value.data?.data) ? dspRes.value.data.data : []);
      if (invRes.status === 'rejected' && escRes.status === 'rejected' && dspRes.status === 'rejected') setError('Failed to load settlement data.');
    } catch { setError('Failed to load settlement data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateInvoice = async () => {
    if (!invoiceForm.counterparty.trim() || !invoiceForm.amount) { toast.error('Counterparty and amount required'); return; }
    setGenerating(true);
    try {
      const res = await settlementAPI.generateInvoice({ counterparty: invoiceForm.counterparty, amount: Math.round(Number(invoiceForm.amount) * 100), type: invoiceForm.type, due_date: invoiceForm.due_date || undefined });
      if (res.data?.success) { toast.success('Invoice generated'); setShowGenInvoice(false); setInvoiceForm({ counterparty: '', amount: '', type: 'Energy Trade', due_date: '' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to generate invoice');
    } catch { toast.error('Failed to generate invoice'); }
    setGenerating(false);
  };

  const handleConfirmSettlement = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      const res = await settlementAPI.confirmSettlement(confirmTarget);
      if (res.data?.success) { toast.success('Settlement confirmed'); setConfirmTarget(null); loadData(); }
      else toast.error(res.data?.error || 'Confirmation failed');
    } catch { toast.error('Settlement confirmation failed'); }
    setConfirming(false);
  };

  const handlePayInvoice = async (id: string) => {
    setPaying(id);
    try {
      const res = await settlementAPI.payInvoice(id);
      if (res.data?.success) { toast.success('Invoice payment processed'); loadData(); }
      else toast.error(res.data?.error || 'Payment failed');
    } catch { toast.error('Failed to process payment'); }
    setPaying(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Settlement management page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Settlement</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Invoices, escrows & dispute resolution</p>
        </div>
        <button onClick={() => setShowGenInvoice(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2" aria-label="Generate invoice"><FiFileText className="w-4 h-4" /> Generate Invoice</button>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh settlement data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit ${cv('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Settlement sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${activeTab === tab ? cv('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : cv('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'Invoices' && <FiFileText className="w-3.5 h-3.5" />}
            {tab === 'Escrows' && <FiShield className="w-3.5 h-3.5" />}
            {tab === 'Disputes' && <FiAlertTriangle className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (<div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>) : (
      <div className={`cp-card !p-0 overflow-hidden ${cv('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        <div className="overflow-x-auto">
          {activeTab === 'Invoices' && (
            invoiceData.length === 0 ? <div className="p-8"><EmptyState title="No invoices" description="Invoices will appear here once generated from settled trades." /></div> : (
            <table className="w-full text-sm" role="table" aria-label="Invoices">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium" scope="col">Invoice</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Counterparty</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Type</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Status</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Due</th>
                <th className="text-right py-3.5 px-5 font-medium" scope="col">Action</th>
              </tr></thead>
              <tbody>{invoiceData.map(inv => (
                <tr key={inv.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5"><EntityLink type="invoice" id={inv.id} label={inv.id.substring(0, 12)} /></td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300"><EntityLink type="participant" id={inv.counterparty || inv.id} label={inv.counterparty || 'N/A'} /></td>
                  <td className="py-3.5 px-4 text-slate-500">{inv.type}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{formatZAR((inv.amount || 0) / 100)}</td>
                  <td className="py-3.5 px-4"><Badge status={inv.status} /></td>
                  <td className="py-3.5 px-4 text-right text-slate-400 text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-3.5 px-5 text-right">{inv.status === 'pending' && <button onClick={() => handlePayInvoice(inv.id)} disabled={paying === inv.id} className="text-xs font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 ml-auto" aria-label={`Pay invoice ${inv.id}`}>{paying === inv.id && <FiLoader className="w-3 h-3 animate-spin" />} Pay</button>}</td>
                </tr>
              ))}</tbody>
            </table>)
          )}
          {activeTab === 'Escrows' && (
            escrowData.length === 0 ? <div className="p-8"><EmptyState title="No escrows" description="Escrow accounts will appear once created for active trades." /></div> : (
            <table className="w-full text-sm" role="table" aria-label="Escrows">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium" scope="col">Escrow</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Parties</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Status</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Conditions</th>
                <th className="text-right py-3.5 px-5 font-medium" scope="col">Created</th>
              </tr></thead>
              <tbody>{escrowData.map(e => (
                <tr key={e.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5"><EntityLink type="escrow" id={e.id} label={e.id.substring(0, 12)} /></td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{e.parties}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{formatZAR((e.amount || 0) / 100)}</td>
                  <td className="py-3.5 px-4"><Badge status={e.status} /></td>
                  <td className="py-3.5 px-4 text-slate-500">{e.conditions_met ?? 0}/{e.conditions_total ?? 0} met</td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{e.created_at ? new Date(e.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}</tbody>
            </table>)
          )}
          {activeTab === 'Disputes' && (
            disputeData.length === 0 ? <div className="p-8"><EmptyState title="No disputes" description="Disputes will appear once filed between counterparties." /></div> : (
            <table className="w-full text-sm" role="table" aria-label="Disputes">
              <thead><tr className={`text-xs border-b ${cv('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium" scope="col">Dispute</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Parties</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Type</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Amount</th>
                <th className="text-left py-3.5 px-4 font-medium" scope="col">Status</th>
                <th className="text-right py-3.5 px-5 font-medium" scope="col">Filed</th>
              </tr></thead>
              <tbody>{disputeData.map(d => (
                <tr key={d.id} className={`border-t ${cv('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{d.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{d.parties}</td>
                  <td className="py-3.5 px-4 text-slate-500">{d.type}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{formatZAR((d.amount || 0) / 100)}</td>
                  <td className="py-3.5 px-4"><Badge status={d.status} /></td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{d.filed_at ? new Date(d.filed_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}</tbody>
            </table>)
          )}
        </div>
      </div>
      )}

      <Modal isOpen={showGenInvoice} onClose={() => setShowGenInvoice(false)} title="Generate Invoice">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Counterparty</label>
            <input value={invoiceForm.counterparty} onChange={e => setInvoiceForm(p => ({ ...p, counterparty: e.target.value }))} placeholder="Participant name or ID" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Amount (R)</label>
              <input type="number" value={invoiceForm.amount} onChange={e => setInvoiceForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
              <select value={invoiceForm.type} onChange={e => setInvoiceForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
                <option>Energy Trade</option><option>Carbon Credit</option><option>PPA Settlement</option><option>Platform Fee</option>
              </select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
            <input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(p => ({ ...p, due_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowGenInvoice(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleGenerateInvoice} loading={generating}>Generate</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleConfirmSettlement} title="Confirm Settlement" description="Are you sure you want to confirm this settlement? Funds will be released from escrow." confirmLabel="Confirm Settlement" variant="info" loading={confirming} />
    </motion.div>
  );
}
