import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiDownload, FiRefreshCw, FiEye, FiSend, FiCheck, FiClock, FiAlertCircle } from '../lib/fi-icons-shim';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { settlementAPI } from '../lib/api';
import { formatZAR, formatDate } from '../lib/format';
import { DataTable, Button, Modal, Tabs } from '../components/ui';
import type { Column } from '../components/ui';

interface Invoice {
  id: string;
  invoice_number: string;
  counterparty: string;
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  status: string;
  due_date: string;
  issued_date: string;
  period_start: string;
  period_end: string;
  line_items: Array<{ description: string; quantity: number; unit_price_cents: number; total_cents: number }>;
  [key: string]: unknown;
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

export default function Invoices() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await settlementAPI.getInvoices(activeTab !== 'all' ? { status: activeTab } : undefined);
      setInvoices(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load invoices'); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const period_start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const period_end = now.toISOString().split('T')[0];
      const res = await settlementAPI.generateNetInvoice({ period_start, period_end, execute: true });
      if (res.data?.success) { toast.success('Invoice generated successfully'); loadData(); }
      else toast.error(res.data?.error || 'Failed to generate invoice');
    } catch { toast.error('Failed to generate invoice'); }
    setGenerating(false);
  };

  const handleDownload = (invoice: Invoice) => {
    const csv = [
      `Invoice: ${invoice.invoice_number}`,
      `Counterparty: ${invoice.counterparty}`,
      `Issued: ${invoice.issued_date}`,
      `Due: ${invoice.due_date}`,
      '',
      'Description,Quantity,Unit Price,Total',
      ...(invoice.line_items || []).map(li => `"${li.description}",${li.quantity},${formatZAR(li.unit_price_cents)},${formatZAR(li.total_cents)}`),
      '',
      `Subtotal,,${formatZAR(invoice.amount_cents)}`,
      `VAT (15%),,${formatZAR(invoice.tax_cents)}`,
      `Total,,${formatZAR(invoice.total_cents)}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${invoice.invoice_number || 'invoice'}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Invoice downloaded');
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 dark:bg-white/[0.04] text-slate-500',
      sent: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      paid: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      overdue: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      cancelled: 'bg-slate-100 dark:bg-white/[0.04] text-slate-400',
    };
    return map[s] || 'bg-slate-100 dark:bg-white/[0.04] text-slate-500';
  };

  const statusIcon = (s: string) => {
    if (s === 'paid') return <FiCheck className="w-3 h-3" />;
    if (s === 'overdue') return <FiAlertCircle className="w-3 h-3" />;
    if (s === 'sent') return <FiSend className="w-3 h-3" />;
    return <FiClock className="w-3 h-3" />;
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoice_number', header: 'Invoice #', sortable: true, render: (r) => <span className="mono text-xs font-semibold">{r.invoice_number || r.id.slice(0, 8)}</span> },
    { key: 'counterparty', header: 'Counterparty', sortable: true },
    { key: 'issued_date', header: 'Issued', sortable: true, render: (r) => <span className="text-xs">{r.issued_date ? formatDate(r.issued_date) : 'N/A'}</span> },
    { key: 'due_date', header: 'Due', sortable: true, render: (r) => <span className="text-xs">{r.due_date ? formatDate(r.due_date) : 'N/A'}</span> },
    { key: 'total_cents', header: 'Amount', sortable: true, render: (r) => <span className="mono font-semibold">{formatZAR(r.total_cents)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(r.status)}`}>
        {statusIcon(r.status)} {r.status}
      </span>
    )},
    { key: 'id', header: '', render: (r) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setSelected(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" aria-label={`View invoice ${r.invoice_number}`}>
          <FiEye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => handleDownload(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" aria-label={`Download invoice ${r.invoice_number}`}>
          <FiDownload className="w-3.5 h-3.5" />
        </button>
      </div>
    )},
  ];

  const filtered = activeTab === 'all' ? invoices : invoices.filter(inv => inv.status === activeTab);
  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + (i.total_cents || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_cents || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Invoices">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage settlement invoices and payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={handleGenerate} loading={generating} icon={<FiFileText className="w-4 h-4" />}>Generate Invoice</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length.toString() },
          { label: 'Outstanding', value: formatZAR(totalOutstanding) },
          { label: 'Total Paid', value: formatZAR(totalPaid) },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length.toString() },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`}>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{kpi.label}</p>
            {loading ? <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>}
          </div>
        ))}
      </div>

      <Tabs tabs={STATUS_TABS} active={activeTab} onChange={setActiveTab} variant="pill" />

      <DataTable
        columns={columns}
        data={filtered as (Invoice & Record<string, unknown>)[]}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No invoices"
        emptyDescription={activeTab === 'all' ? 'Invoices will appear after settlement periods.' : `No ${activeTab} invoices.`}
        searchable
        searchPlaceholder="Search invoices..."
        pageSize={10}
      />

      {/* Invoice Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Invoice ${selected?.invoice_number || ''}`} description={`${selected?.counterparty || ''}`} size="lg">
        {selected && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1">Issued</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selected.issued_date ? formatDate(selected.issued_date) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Due Date</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selected.due_date ? formatDate(selected.due_date) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Period</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selected.period_start ? `${formatDate(selected.period_start)} - ${formatDate(selected.period_end)}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(selected.status)}`}>{selected.status}</span>
              </div>
            </div>

            {selected.line_items && selected.line_items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Line items">
                  <thead><tr className="text-xs text-slate-400">
                    <th className="text-left py-2" scope="col">Description</th>
                    <th className="text-right py-2" scope="col">Qty</th>
                    <th className="text-right py-2" scope="col">Unit Price</th>
                    <th className="text-right py-2" scope="col">Total</th>
                  </tr></thead>
                  <tbody>
                    {selected.line_items.map((li, i) => (
                      <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
                        <td className="py-2 text-slate-700 dark:text-slate-300">{li.description}</td>
                        <td className="py-2 text-right mono">{li.quantity}</td>
                        <td className="py-2 text-right mono">{formatZAR(li.unit_price_cents)}</td>
                        <td className="py-2 text-right mono font-medium">{formatZAR(li.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                      <td colSpan={3} className="py-2 text-right text-slate-500">Subtotal</td>
                      <td className="py-2 text-right mono">{formatZAR(selected.amount_cents)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-slate-500">VAT (15%)</td>
                      <td className="py-1 text-right mono">{formatZAR(selected.tax_cents)}</td>
                    </tr>
                    <tr className={`border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                      <td colSpan={3} className="py-2 text-right font-bold text-slate-800 dark:text-white">Total</td>
                      <td className="py-2 text-right mono font-bold text-slate-800 dark:text-white">{formatZAR(selected.total_cents)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => handleDownload(selected)} icon={<FiDownload className="w-4 h-4" />}>Download</Button>
              <Button onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
