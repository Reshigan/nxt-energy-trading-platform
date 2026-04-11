import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { paymentsAPI } from '../lib/api';

interface Payment {
  id: string;
  participant_id: string;
  type: string;
  amount_cents: number;
  currency: string;
  provider: string;
  status: string;
  reference: string;
  provider_ref: string | null;
  created_at: string;
}

interface PaymentStats {
  total_count: number;
  total_amount_cents: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
}

interface CreditNote {
  id: string;
  invoice_id: string;
  amount_cents: number;
  reason: string;
  issued_by: string;
  created_at: string;
}

export default function PaymentsDashboard() {
  const { isDark } = useTheme();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'payments' | 'credit-notes'>('payments');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  // Credit note form
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditForm, setCreditForm] = useState({ invoice_id: '', amount_cents: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchPayments = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const [paymentsRes, statsRes] = await Promise.all([
        paymentsAPI.list(params),
        paymentsAPI.stats(),
      ]);
      setPayments(paymentsRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch {
      setError('Failed to load payments');
    }
  };

  const fetchCreditNotes = async () => {
    try {
      const res = await paymentsAPI.creditNotes();
      setCreditNotes(res.data.data || []);
    } catch {
      setError('Failed to load credit notes');
    }
  };

  useEffect(() => {
    Promise.all([fetchPayments(), fetchCreditNotes()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPayments(); }, [filter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await paymentsAPI.update(id, { status });
      fetchPayments();
    } catch {
      setError('Failed to update payment');
    }
  };

  const handleIssueCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await paymentsAPI.issueCreditNote({
        invoice_id: creditForm.invoice_id,
        amount_cents: parseInt(creditForm.amount_cents, 10),
        reason: creditForm.reason,
      });
      setShowCreditForm(false);
      setCreditForm({ invoice_id: '', amount_cents: '', reason: '' });
      fetchCreditNotes();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || 'Failed to issue credit note');
    } finally {
      setSaving(false);
    }
  };

  const formatZAR = (cents: number) => {
    return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'text-emerald-400 bg-emerald-500/10';
    if (status === 'pending') return 'text-amber-400 bg-amber-500/10';
    if (status === 'processing') return 'text-blue-400 bg-blue-500/10';
    if (status === 'failed') return 'text-red-400 bg-red-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Payments</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-20 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Payments</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Payment transactions, credit notes, and financial management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'payments' ? 'bg-emerald-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
          >
            Payments
          </button>
          <button
            onClick={() => setTab('credit-notes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'credit-notes' ? 'bg-emerald-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
          >
            Credit Notes ({creditNotes.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {tab === 'payments' && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Total', value: stats.total_count, color: 'text-white' },
                { label: 'Total Volume', value: formatZAR(stats.total_amount_cents), color: 'text-emerald-400' },
                { label: 'Pending', value: stats.pending_count, color: 'text-amber-400' },
                { label: 'Completed', value: stats.completed_count, color: 'text-emerald-400' },
                { label: 'Failed', value: stats.failed_count, color: 'text-red-400' },
              ].map(stat => (
                <div key={stat.label} className={`p-3 rounded-xl border text-center ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-2 mb-4">
            {['all', 'pending', 'processing', 'completed', 'failed', 'refunded'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Payment list */}
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No payments match this filter.</p>
            ) : (
              payments.map(payment => (
                <div
                  key={payment.id}
                  className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatZAR(payment.amount_cents)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {payment.type} &middot; {payment.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(payment.id, 'completed')}
                            className="px-2 py-1 text-xs rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(payment.id, 'failed')}
                            className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          >
                            Fail
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Ref: {payment.reference} &middot; {new Date(payment.created_at).toLocaleString()}
                    {payment.provider_ref && ` · Provider: ${payment.provider_ref}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'credit-notes' && (
        <>
          <button
            onClick={() => setShowCreditForm(true)}
            className="mb-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            + Issue Credit Note
          </button>

          {showCreditForm && (
            <form onSubmit={handleIssueCreditNote} className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Issue Credit Note</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text" required placeholder="Invoice ID"
                  value={creditForm.invoice_id} onChange={e => setCreditForm({ ...creditForm, invoice_id: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
                />
                <input
                  type="number" required placeholder="Amount (cents)"
                  value={creditForm.amount_cents} onChange={e => setCreditForm({ ...creditForm, amount_cents: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
                />
                <input
                  type="text" required placeholder="Reason"
                  value={creditForm.reason} onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })}
                  className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Issuing...' : 'Issue'}
                </button>
                <button type="button" onClick={() => setShowCreditForm(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {creditNotes.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No credit notes issued yet.</p>
            ) : (
              creditNotes.map(cn => (
                <div
                  key={cn.id}
                  className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatZAR(cn.amount_cents)}
                      </span>
                      <span className={`text-xs ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Invoice: {cn.invoice_id.slice(0, 12)}...
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(cn.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Reason: {cn.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
