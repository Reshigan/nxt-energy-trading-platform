import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiAlertTriangle, FiPlus, FiFileText } from 'react-icons/fi';
import { settlementAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Settlement() {
  const [tab, setTab] = useState<'invoices' | 'escrows' | 'disputes'>('invoices');
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [escrows, setEscrows] = useState<Array<Record<string, unknown>>>([]);
  const [disputes, setDisputes] = useState<Array<Record<string, unknown>>>([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ respondent_id: '', category: 'billing', description: '', value_cents: '', trade_id: '' });
  const [invoiceForm, setInvoiceForm] = useState({ trade_id: '', metered_volume: '', unit_rate_cents: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'invoices') { const r = await settlementAPI.getInvoices(); setInvoices(r.data.data); }
      else if (tab === 'escrows') { const r = await settlementAPI.getEscrows(); setEscrows(r.data.data); }
      else { const r = await settlementAPI.getDisputes(); setDisputes(r.data.data); }
    } catch { /* ignore */ }
  };

  const fileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settlementAPI.fileDispute({
        respondent_id: disputeForm.respondent_id,
        category: disputeForm.category,
        description: disputeForm.description,
        value_cents: parseInt(disputeForm.value_cents, 10),
        trade_id: disputeForm.trade_id || undefined,
      });
      setShowDisputeModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const generateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settlementAPI.generateInvoice({
        trade_id: invoiceForm.trade_id,
        metered_volume: invoiceForm.metered_volume ? parseFloat(invoiceForm.metered_volume) : undefined,
        unit_rate_cents: invoiceForm.unit_rate_cents ? parseInt(invoiceForm.unit_rate_cents, 10) : undefined,
      });
      setShowInvoiceModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const payInvoice = async (id: string) => {
    try { await settlementAPI.payInvoice(id); loadData(); } catch { /* ignore */ }
  };

  const inputClass = 'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Settlement & Disputes</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors">
            <FiFileText className="w-4 h-4" /> Generate Invoice
          </button>
          <button onClick={() => setShowDisputeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition-colors">
            <FiAlertTriangle className="w-4 h-4" /> File Dispute
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['invoices', 'escrows', 'disputes'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Invoices</h3>
          {invoices.length === 0 ? <p className="text-sm text-slate-400">No invoices</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Invoice #</th>
                  <th className="text-right py-2">Subtotal</th>
                  <th className="text-right py-2">VAT</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-left py-2">Due Date</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Action</th>
                </tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id as string} className="border-t border-slate-800">
                      <td className="py-2 font-medium">{inv.invoice_number as string}</td>
                      <td className="text-right">R{((inv.subtotal_cents as number) / 100).toFixed(2)}</td>
                      <td className="text-right">R{((inv.vat_cents as number) / 100).toFixed(2)}</td>
                      <td className="text-right font-medium">R{((inv.total_cents as number) / 100).toFixed(2)}</td>
                      <td>{(inv.due_date as string || '').split('T')[0]}</td>
                      <td><StatusBadge status={inv.status as string} /></td>
                      <td className="text-right">
                        {(inv.status === 'outstanding' || inv.status === 'overdue') && (
                          <button onClick={() => payInvoice(inv.id as string)} className="text-xs text-emerald-400 hover:text-emerald-300">Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'escrows' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Escrows</h3>
          {escrows.length === 0 ? <p className="text-sm text-slate-400">No escrows</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">ID</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Expires</th>
                </tr></thead>
                <tbody>
                  {escrows.map((e) => (
                    <tr key={e.id as string} className="border-t border-slate-800">
                      <td className="py-2 font-mono text-xs">{(e.id as string).slice(0, 8)}...</td>
                      <td className="text-right">R{((e.amount_cents as number) / 100).toFixed(2)}</td>
                      <td><StatusBadge status={e.status as string} /></td>
                      <td className="text-xs text-slate-400">{e.expires_at as string || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Disputes</h3>
          {disputes.length === 0 ? <p className="text-sm text-slate-400">No disputes</p> : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id as string} className="p-4 rounded-lg bg-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{d.category as string}</span>
                    <StatusBadge status={d.status as string} />
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{d.description as string}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Value: R{((d.value_cents as number) / 100).toFixed(2)}</span>
                    <span>{d.created_at as string}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Dispute Modal */}
      <Modal isOpen={showDisputeModal} onClose={() => setShowDisputeModal(false)} title="File Dispute">
        <form onSubmit={fileDispute} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Respondent ID *</label>
            <input className={inputClass} value={disputeForm.respondent_id} onChange={(e) => setDisputeForm({ ...disputeForm, respondent_id: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category *</label>
            <select className={inputClass} value={disputeForm.category} onChange={(e) => setDisputeForm({ ...disputeForm, category: e.target.value })}>
              <option value="billing">Billing</option>
              <option value="delivery">Delivery</option>
              <option value="quality">Quality</option>
              <option value="metering">Metering</option>
              <option value="contract_breach">Contract Breach</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description *</label>
            <textarea className={inputClass} rows={3} value={disputeForm.description} onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Value (cents) *</label>
              <input className={inputClass} type="number" value={disputeForm.value_cents} onChange={(e) => setDisputeForm({ ...disputeForm, value_cents: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Trade ID</label>
              <input className={inputClass} value={disputeForm.trade_id} onChange={(e) => setDisputeForm({ ...disputeForm, trade_id: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50">
            {loading ? 'Filing...' : 'File Dispute'}
          </button>
        </form>
      </Modal>

      {/* Generate Invoice Modal */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Generate Invoice">
        <form onSubmit={generateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Trade ID *</label>
            <input className={inputClass} value={invoiceForm.trade_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, trade_id: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Metered Volume</label>
              <input className={inputClass} type="number" step="0.01" value={invoiceForm.metered_volume} onChange={(e) => setInvoiceForm({ ...invoiceForm, metered_volume: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unit Rate (cents)</label>
              <input className={inputClass} type="number" value={invoiceForm.unit_rate_cents} onChange={(e) => setInvoiceForm({ ...invoiceForm, unit_rate_cents: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
