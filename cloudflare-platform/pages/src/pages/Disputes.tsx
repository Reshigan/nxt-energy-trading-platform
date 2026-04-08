import React, { useState, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiPlus, FiClock, FiCheck, FiX, FiLoader, FiRefreshCw, FiMessageSquare } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { settlementAPI } from '../lib/api';
import { formatZAR, formatDate } from '../lib/format';
import { DataTable, Button, Modal, Input, Select, Tabs } from '../components/ui';
import type { Column } from '../components/ui';

interface Dispute {
  id: string;
  trade_id: string;
  type: string;
  status: string;
  amount_cents: number;
  description: string;
  created_at: string;
  updated_at: string;
  counterparty: string;
  resolution?: string;
  [key: string]: unknown;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Disputes() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showFile, setShowFile] = useState(false);
  const [filing, setFiling] = useState(false);
  const [form, setForm] = useState({ trade_id: '', type: 'pricing', description: '', amount_cents: '' });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await settlementAPI.getDisputes(activeTab !== 'all' ? { status: activeTab } : undefined);
      setDisputes(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load disputes'); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFile = async () => {
    if (!form.trade_id.trim()) { toast.error('Trade ID is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setFiling(true);
    try {
      const res = await settlementAPI.fileDispute({
        trade_id: form.trade_id,
        type: form.type,
        description: form.description,
        amount_cents: form.amount_cents ? Number(form.amount_cents) * 100 : 0,
      });
      if (res.data?.success) {
        toast.success('Dispute filed successfully');
        setShowFile(false);
        setForm({ trade_id: '', type: 'pricing', description: '', amount_cents: '' });
        loadData();
      } else toast.error(res.data?.error || 'Failed to file dispute');
    } catch (err: unknown) { toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to file dispute'); }
    setFiling(false);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      open: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      investigating: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      resolved: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      rejected: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    };
    return map[s] || 'bg-slate-100 dark:bg-white/[0.04] text-slate-500';
  };

  const columns: Column<Dispute>[] = [
    { key: 'id', header: 'ID', sortable: true, render: (r) => <span className="mono text-xs">{r.id.slice(0, 8)}</span> },
    { key: 'trade_id', header: 'Trade', sortable: true, render: (r) => <span className="mono text-xs">{r.trade_id?.slice(0, 8) || 'N/A'}</span> },
    { key: 'type', header: 'Type', sortable: true, render: (r) => <span className="capitalize">{r.type}</span> },
    { key: 'counterparty', header: 'Counterparty', sortable: true },
    { key: 'amount_cents', header: 'Amount', sortable: true, render: (r) => <span className="mono">{formatZAR(r.amount_cents)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(r.status)}`}>{r.status}</span> },
    { key: 'created_at', header: 'Filed', sortable: true, render: (r) => <span className="text-xs">{r.created_at ? formatDate(r.created_at) : 'N/A'}</span> },
  ];

  const filtered = activeTab === 'all' ? disputes : disputes.filter(d => d.status === activeTab);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Disputes page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Disputes</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage trade disputes and resolutions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh disputes">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => setShowFile(true)} icon={<FiPlus className="w-4 h-4" />}>File Dispute</Button>
        </div>
      </div>

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} variant="pill" />

      <DataTable
        columns={columns}
        data={filtered as (Dispute & Record<string, unknown>)[]}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No disputes found"
        emptyDescription={activeTab === 'all' ? 'No disputes have been filed yet.' : `No ${activeTab} disputes.`}
        searchable
        searchPlaceholder="Search disputes..."
        pageSize={10}
      />

      {/* File Dispute Modal */}
      <Modal isOpen={showFile} onClose={() => setShowFile(false)} title="File a Dispute" description="Submit a dispute for a trade or settlement issue.">
        <div className="space-y-4 mt-2">
          <Input label="Trade ID" value={form.trade_id} onChange={e => setForm(p => ({ ...p, trade_id: e.target.value }))} placeholder="Enter trade ID" required />
          <Select label="Dispute Type" options={[
            { value: 'pricing', label: 'Pricing Discrepancy' },
            { value: 'volume', label: 'Volume Mismatch' },
            { value: 'quality', label: 'Quality Issue' },
            { value: 'delivery', label: 'Delivery Failure' },
            { value: 'billing', label: 'Billing Error' },
            { value: 'other', label: 'Other' },
          ]} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} />
          <Input label="Disputed Amount (R)" type="number" min="0" step="0.01" value={form.amount_cents} onChange={e => setForm(p => ({ ...p, amount_cents: e.target.value }))} placeholder="0.00" helpText="Amount in ZAR" />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} required
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50' : 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500'}`}
              placeholder="Describe the dispute in detail..." aria-label="Dispute description" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowFile(false)}>Cancel</Button>
            <Button onClick={handleFile} loading={filing} icon={<FiAlertTriangle className="w-4 h-4" />}>File Dispute</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
