// N11: Contract Deep Features — detail view, amendments, signatures, versions, audit trail
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiFileText, FiEdit3, FiCheckCircle, FiClock, FiDownload, FiArrowLeft, FiShield, FiRefreshCw, FiLoader, FiAlertTriangle, FiLayers, FiUsers, FiList } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { contractsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Modal } from '../components/ui/Modal';

interface ContractDetail {
  id: string;
  title: string;
  document_type: string;
  phase: string;
  creator_id: string;
  counterparty_id: string;
  project_id: string | null;
  commercial_terms: Record<string, unknown> | null;
  template_id: string | null;
  version: string;
  previous_version_id: string | null;
  sha256_hash: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
  signatories?: Array<{ id: string; signatory_name: string; signed: number }>;
  statutory_checks?: Array<{ id: string; regulation: string; status: string }>;
}

interface Signature {
  id: string;
  document_id: string;
  participant_id: string;
  signatory_name: string;
  signatory_designation: string;
  signed: number;
  signed_at: string | null;
  signature_r2_key: string | null;
  ip_address: string | null;
  document_hash_at_signing: string | null;
  created_at: string;
}

interface Amendment {
  id: string;
  version: string;
  phase: string;
  previous_version_id: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string | null;
  created_at: string;
}

const TABS = ['Details', 'Signatures', 'Versions', 'Audit Trail'] as const;

export default function ContractDeep() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [versions, setVersions] = useState<Amendment[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Details');
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [amendMajor, setAmendMajor] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadContract = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, sigRes, verRes, auditRes] = await Promise.allSettled([
        contractsAPI.get(id),
        contractsAPI.getSignatures(id),
        contractsAPI.getVersions(id),
        contractsAPI.getAuditTrail(id),
      ]);
      if (detailRes.status === 'fulfilled' && detailRes.value.data?.data) {
        const d = detailRes.value.data.data;
        setContract(d);
        // Also populate signatures from the detail response if the signatures endpoint didn't return data
        if (d.signatories && Array.isArray(d.signatories)) {
          setSignatures(d.signatories);
        }
      } else if (detailRes.status === 'rejected') setError('Failed to load contract details');
      if (sigRes.status === 'fulfilled' && Array.isArray(sigRes.value.data?.data)) setSignatures(sigRes.value.data.data);
      if (verRes.status === 'fulfilled' && Array.isArray(verRes.value.data?.data)) setVersions(verRes.value.data.data);
      if (auditRes.status === 'fulfilled' && Array.isArray(auditRes.value.data?.data)) setAuditTrail(auditRes.value.data.data);
    } catch {
      setError('Failed to load contract data. Please try again.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadContract(); }, [loadContract]);

  const handleAmend = async () => {
    if (!id || !amendReason.trim()) { toast.error('Please provide a reason for the amendment'); return; }
    setSubmitting(true);
    try {
      const res = await contractsAPI.amend(id, { reason: amendReason, major: amendMajor });
      if (res.data?.success) {
        toast.success('Amendment created successfully');
        setShowAmendModal(false);
        setAmendReason('');
        setAmendMajor(false);
        loadContract();
      } else {
        toast.error(res.data?.error || 'Failed to create amendment');
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create amendment');
    }
    setSubmitting(false);
  };

  const handleSign = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await contractsAPI.sign(id, { method: 'electronic' });
      if (res.data?.success) {
        toast.success('Contract signed successfully');
        setShowSignModal(false);
        loadContract();
      } else {
        toast.error(res.data?.error || 'Failed to sign contract');
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to sign contract');
    }
    setSubmitting(false);
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const res = await contractsAPI.getPdf(id);
      if (res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded');
      }
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleAdvancePhase = async (targetPhase: string) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await contractsAPI.advancePhase(id, { target_phase: targetPhase });
      if (res.data?.success) {
        toast.success(`Phase advanced to ${targetPhase}`);
        loadContract();
      } else {
        toast.error(res.data?.error || 'Failed to advance phase');
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to advance phase');
    }
    setSubmitting(false);
  };

  const statusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active': case 'signed': case 'completed': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'draft': case 'pending': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'expired': case 'cancelled': return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
      default: return 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Contract details page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/contracts')} className={`p-2 rounded-xl transition-all ${c('bg-white/[0.04] hover:bg-white/[0.08] text-slate-400', 'bg-slate-100 hover:bg-slate-200 text-slate-500')}`} aria-label="Back to contracts">
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {loading ? <Skeleton className="w-64 h-8" /> : contract?.title || 'Contract Details'}
            </h1>
            {!loading && contract && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(contract.phase)}`}>{contract.phase}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Type: {contract.document_type?.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        </div>
        {!loading && contract && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownloadPdf} className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${c('bg-white/[0.04] hover:bg-white/[0.08] text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`} aria-label="Download PDF">
              <FiDownload className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => setShowAmendModal(true)} className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${c('bg-white/[0.04] hover:bg-white/[0.08] text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`} aria-label="Amend contract">
              <FiEdit3 className="w-3.5 h-3.5" /> Amend
            </button>
            <button onClick={() => setShowSignModal(true)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-1.5" aria-label="Sign contract">
              <FiCheckCircle className="w-3.5 h-3.5" /> Sign
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadContract} />}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Contract sections">
        {TABS.map(tab => {
          const icons: Record<string, React.ReactNode> = {
            Details: <FiFileText className="w-3.5 h-3.5" />,
            Signatures: <FiUsers className="w-3.5 h-3.5" />,
            Versions: <FiLayers className="w-3.5 h-3.5" />,
            'Audit Trail': <FiList className="w-3.5 h-3.5" />,
          };
          return (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')
              }`}>
              {icons[tab]} {tab}
            </button>
          );
        })}
      </div>

      {/* Details Tab */}
      {activeTab === 'Details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><FiFileText className="w-4 h-4 text-blue-500" /> Contract Information</h3>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-full h-6" />)}</div>
            ) : contract ? (
              <div className="space-y-3">
                {[
                  ['Document Type', contract.document_type?.replace(/_/g, ' ') || 'N/A'],
                  ['Version', contract.version || 'v1.0'],
                  ['Creator', contract.creator_id],
                  ['Counterparty', contract.counterparty_id],
                  ['Project', contract.project_id || 'N/A'],
                  ['Created', new Date(contract.created_at).toLocaleDateString('en-ZA')],
                  ['Last Updated', new Date(contract.updated_at).toLocaleDateString('en-ZA')],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No contract found" description="This contract may have been deleted or you may not have access." />}
          </div>

          <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><FiShield className="w-4 h-4 text-emerald-500" /> Phase Management</h3>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-10" />)}</div>
            ) : contract ? (
              <div className="space-y-3">
                {['negotiation', 'review', 'signing', 'active', 'completed'].map(phase => (
                  <div key={phase} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    contract.phase === phase
                      ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                      : c('bg-white/[0.02]', 'bg-slate-50')
                  }`}>
                    <div className="flex items-center gap-2">
                      {contract.phase === phase ? <FiCheckCircle className="w-4 h-4 text-blue-500" /> : <FiClock className="w-4 h-4 text-slate-400" />}
                      <span className={`text-sm font-medium capitalize ${contract.phase === phase ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{phase}</span>
                    </div>
                    {contract.phase !== phase && contract.phase !== 'completed' && (
                      <button onClick={() => handleAdvancePhase(phase)} disabled={submitting}
                        className="text-xs text-blue-500 hover:text-blue-600 font-medium" aria-label={`Advance to ${phase}`}>
                        Move here
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Signatures Tab */}
      {activeTab === 'Signatures' && (
        <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><FiUsers className="w-4 h-4 text-blue-500" /> Signatures</h3>
            <button onClick={loadContract} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1" aria-label="Refresh signatures"><FiRefreshCw className="w-3 h-3" /> Refresh</button>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>
          ) : signatures.length > 0 ? (
            <div className="space-y-3">
              {signatures.map(sig => (
                <div key={sig.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${c('bg-white/[0.02]', 'bg-slate-50')}`}>
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{sig.signatory_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{sig.signatory_designation || sig.participant_id}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      sig.signed ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>{sig.signed ? 'signed' : 'pending'}</span>
                    {sig.signed_at && <div className="text-[10px] text-slate-400 mt-1">{new Date(sig.signed_at).toLocaleString('en-ZA')}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No signatures yet" description="Signatures will appear when parties sign this contract." />}
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === 'Versions' && (
        <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><FiLayers className="w-4 h-4 text-blue-500" /> Version History</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>
          ) : versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map(ver => (
                <div key={ver.id} className={`px-4 py-3 rounded-xl ${c('bg-white/[0.02]', 'bg-slate-50')}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {ver.version}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(ver.phase)}`}>{ver.phase}</span>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(ver.created_at).toLocaleDateString('en-ZA')}</span>
                  </div>
                  {ver.previous_version_id && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Previous: {ver.previous_version_id}</div>}
                </div>
              ))}
            </div>
          ) : <EmptyState title="No amendments yet" description="Version history will appear after contract amendments." />}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'Audit Trail' && (
        <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><FiList className="w-4 h-4 text-blue-500" /> Audit Trail</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div>
          ) : auditTrail.length > 0 ? (
            <div className="space-y-2">
              {auditTrail.map(entry => (
                <div key={entry.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl ${c('bg-white/[0.02]', 'bg-slate-50')}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        (entry.action || '').includes('sign') ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                                        (entry.action || '').includes('amend') ? 'bg-amber-50 dark:bg-amber-500/10' :
                    'bg-blue-50 dark:bg-blue-500/10'
                  }`}>
                                        {(entry.action || '').includes('sign') ? <FiCheckCircle className="w-4 h-4 text-emerald-500" /> :
                                         (entry.action || '').includes('amend') ? <FiEdit3 className="w-4 h-4 text-amber-500" /> :
                     <FiFileText className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{(entry.action || '').replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-400">{new Date(entry.created_at).toLocaleString('en-ZA')}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.actor_id}{entry.details ? ` — ${entry.details}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No audit entries" description="Audit trail will be populated as actions are taken on this contract." />}
        </div>
      )}

      {/* Amend Modal */}
      <Modal isOpen={showAmendModal} onClose={() => setShowAmendModal(false)} title="Create Amendment" size="md">
        <div className="space-y-4">
          <div>
            <label htmlFor="amend-reason" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Reason for Amendment</label>
            <textarea id="amend-reason" value={amendReason} onChange={e => setAmendReason(e.target.value)} rows={3} placeholder="Describe the changes being made..."
              className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500 focus:border-blue-500/50', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400 focus:border-blue-500')}`} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAmendMajor(!amendMajor)} role="switch" aria-checked={amendMajor} aria-label="Major amendment"
              className={`relative w-10 h-6 rounded-full transition-colors ${amendMajor ? 'bg-red-500' : c('bg-white/[0.08]', 'bg-slate-200')}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${amendMajor ? 'left-5' : 'left-1'}`} />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">Major amendment (resets signatures)</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAmendModal(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${c('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-700')}`}>Cancel</button>
            <button onClick={handleAmend} disabled={submitting || !amendReason.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2">
              {submitting && <FiLoader className="w-4 h-4 animate-spin" />} Create Amendment
            </button>
          </div>
        </div>
      </Modal>

      {/* Sign Modal */}
      <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title="Sign Contract" size="sm">
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${c('bg-amber-500/10', 'bg-amber-50')}`}>
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Legal Notice</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              By signing this contract, you agree to be legally bound by its terms. This constitutes an electronic signature under the Electronic Communications and Transactions Act 25 of 2002 (ECT Act).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowSignModal(false)} className={`px-4 py-2 rounded-xl text-sm font-medium ${c('text-slate-400 hover:text-white', 'text-slate-500 hover:text-slate-700')}`}>Cancel</button>
            <button onClick={handleSign} disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2">
              {submitting && <FiLoader className="w-4 h-4 animate-spin" />} Sign Electronically
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
