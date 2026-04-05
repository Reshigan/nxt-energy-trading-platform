import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiPlus, FiCheckCircle, FiAlertTriangle, FiEdit } from 'react-icons/fi';
import { contractsAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

const PHASES = ['draft', 'loi', 'term_sheet', 'hoa', 'draft_agreement', 'legal_review', 'statutory_check', 'execution', 'active', 'amended', 'terminated'];
const DOC_TYPES = ['LOI', 'term_sheet', 'hoa', 'draft_agreement', 'definitive', 'side_letter', 'amendment', 'nda', 'ppa', 'offtake', 'wheeling', 'connection'];

export default function Contracts() {
  const tc = useThemeClasses();
  const { activeRole } = useAuthStore();
  const [tab, setTab] = useState<'registry' | 'flow' | 'templates' | 'statutory' | 'smart_rules'>('registry');
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null);
  const [signatures, setSignatures] = useState<Array<Record<string, unknown>>>([]);
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [createForm, setCreateForm] = useState({ title: '', document_type: 'ppa', counterparty_id: '', pricing_mechanism: 'fixed', pricing_value: '', volume: '', tenor: '', delivery_point: '' });
  const [signForm, setSignForm] = useState({ signatory_name: '', signatory_designation: '' });
  const [amendForm, setAmendForm] = useState({ reason: '', major: false });
  const [targetPhase, setTargetPhase] = useState('');

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    try {
      const res = await contractsAPI.list();
      setDocuments(res.data.data || []);
    } catch { /* ignore */ }
  };

  const loadDocDetail = async (doc: Record<string, unknown>) => {
    setSelectedDoc(doc);
    try {
      const [sigRes, verRes] = await Promise.all([
        contractsAPI.getSignatures(doc.id as string),
        contractsAPI.getVersions(doc.id as string),
      ]);
      setSignatures(sigRes.data.data || []);
      setVersions(verRes.data.data || []);
    } catch { /* ignore */ }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await contractsAPI.create(createForm);
      setShowCreateModal(false);
      loadDocuments();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setLoading(true);
    try {
      await contractsAPI.sign(selectedDoc.id as string, signForm);
      setShowSignModal(false);
      loadDocDetail(selectedDoc);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAmend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setLoading(true);
    try {
      await contractsAPI.amend(selectedDoc.id as string, amendForm);
      setShowAmendModal(false);
      loadDocuments();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAdvancePhase = async () => {
    if (!selectedDoc || !targetPhase) return;
    setLoading(true);
    try {
      await contractsAPI.advancePhase(selectedDoc.id as string, { target_phase: targetPhase });
      setShowPhaseModal(false);
      loadDocuments();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const inputClass = `w-full px-3 py-2 ${tc.input} rounded-lg text-sm`;

  const tabs = [
    { id: 'registry' as const, label: 'Registry' },
    { id: 'flow' as const, label: 'Contract Flow' },
    { id: 'templates' as const, label: 'Templates' },
    { id: 'statutory' as const, label: 'Statutory Rules' },
    { id: 'smart_rules' as const, label: 'Smart Rules' },
  ];

  // Statutory rules data
  const statutoryRules = [
    { regulation: 'ERA — Electricity Regulation Act', method: 'Auto', source: 'NERSA API', frequency: 'Per contract', blocking: true, override: false },
    { regulation: 'NERSA Generation Licence', method: 'Auto', source: 'NERSA Registry', frequency: 'Annual', blocking: true, override: false },
    { regulation: 'POPIA Data Protection', method: 'Auto', source: 'Template check', frequency: 'Per contract', blocking: true, override: true },
    { regulation: 'FICA KYC/AML', method: 'Auto', source: 'KYC Module', frequency: 'Ongoing', blocking: true, override: true },
    { regulation: 'BBBEE Certificate', method: 'Auto', source: 'CIPC/DTI', frequency: 'Annual', blocking: false, override: true },
    { regulation: 'Carbon Tax Act', method: 'Auto', source: 'SARS eFiling', frequency: 'Annual', blocking: false, override: true },
    { regulation: 'FSCA OTC Derivatives', method: 'Auto', source: 'FSCA Registry', frequency: 'Per instrument', blocking: true, override: false },
    { regulation: 'FAIS Financial Advisory', method: 'Auto', source: 'FSCA Registry', frequency: 'Per engagement', blocking: true, override: false },
    { regulation: 'Municipal Systems Act', method: 'Manual', source: 'Council resolution', frequency: 'Per connection', blocking: true, override: true },
    { regulation: 'OHS Act — Construction', method: 'Manual', source: 'DoEL certificate', frequency: 'Per project', blocking: true, override: true },
    { regulation: 'Environmental Impact Assessment', method: 'Manual', source: 'DFFE ROD upload', frequency: 'Per project', blocking: true, override: false },
    { regulation: 'ISDA Master Agreement', method: 'Manual', source: 'Legal opinion', frequency: 'Per counterparty', blocking: true, override: true },
    { regulation: 'CIDB Contractor Registration', method: 'Auto', source: 'CIDB Registry', frequency: 'Annual', blocking: true, override: false },
    { regulation: 'Section 12B Tax Incentive', method: 'Auto', source: 'SARS submission', frequency: 'Per installation', blocking: false, override: true },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Digital Contracts</h1>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg text-sm font-medium">
          <FiPlus className="w-4 h-4" /> New Document
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Registry Tab */}
      {tab === 'registry' && (
        <div className="space-y-4">
          {selectedDoc ? (
            <div className={`${tc.cardBg} p-6 space-y-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <button onClick={() => setSelectedDoc(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2">&larr; Back to list</button>
                  <h2 className="text-lg font-bold">{selectedDoc.title as string}</h2>
                  <div className="flex gap-2 mt-1">
                    <StatusBadge status={selectedDoc.phase as string} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">v{selectedDoc.version as string}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedDoc.phase !== 'terminated' && (
                    <button onClick={() => setShowPhaseModal(true)} className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-lg">Advance Phase</button>
                  )}
                  {(selectedDoc.phase === 'execution' || selectedDoc.phase === 'statutory_check') && (
                    <button onClick={() => setShowSignModal(true)} className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg">Sign</button>
                  )}
                  {selectedDoc.phase === 'active' && (
                    <button onClick={() => setShowAmendModal(true)} className="px-3 py-1.5 text-xs bg-orange-500/20 text-orange-400 rounded-lg">Amend</button>
                  )}
                </div>
              </div>

              {/* Phase Bar */}
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {PHASES.map((p, i) => {
                    const currentIdx = PHASES.indexOf(selectedDoc.phase as string);
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={p} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium ${isCurrent ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : isPast ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-slate-500'}`}>
                        {isPast && <FiCheckCircle className="w-3 h-3" />}
                        {p.replace('_', ' ')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Type', selectedDoc.document_type],
                  ['Pricing', selectedDoc.pricing_mechanism],
                  ['Volume', selectedDoc.volume],
                  ['Tenor', selectedDoc.tenor],
                  ['Delivery', selectedDoc.delivery_point],
                  ['Created', selectedDoc.created_at],
                  ['Hash', (selectedDoc.document_hash as string)?.slice(0, 16) + '...'],
                  ['Statutory', selectedDoc.statutory_status],
                ].map(([label, value]) => (
                  <div key={label as string} className={`p-2 rounded ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{label as string}</div>
                    <div className="text-sm font-medium truncate">{(value as string) || '-'}</div>
                  </div>
                ))}
              </div>

              {/* Signatories */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Signatories</h3>
                {signatures.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No signatories</p> : (
                  <div className="space-y-2">
                    {signatures.map((s) => (
                      <div key={s.id as string} className={`flex items-center justify-between p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                        <div>
                          <div className="text-sm font-medium">{s.signatory_name as string}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{s.signatory_designation as string}</div>
                        </div>
                        {s.signed ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><FiCheckCircle /> Signed {s.signed_at as string}</span>
                        ) : (
                          <span className="text-xs text-orange-400">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Versions */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Version History</h3>
                {versions.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No versions</p> : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id as string} className={`flex items-center justify-between p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                        <div className="text-sm">v{v.version as string} — {v.title as string}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{v.created_at as string}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`${tc.cardBg} p-6`}>
              {documents.length === 0 ? <p className="text-sm text-slate-400">No documents found</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                      <th className="text-left py-2">Title</th><th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Phase</th><th className="text-left py-2">Version</th>
                      <th className="text-left py-2">Statutory</th><th className="text-left py-2">Created</th>
                      <th className="text-right py-2">Action</th>
                    </tr></thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id as string} className="border-t border-slate-200 dark:border-white/[0.06] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]" onClick={() => loadDocDetail(d)}>
                          <td className="py-2 font-medium">{d.title as string}</td>
                          <td className="capitalize">{(d.document_type as string).replace('_', ' ')}</td>
                          <td><StatusBadge status={d.phase as string} /></td>
                          <td className="text-xs">{d.version as string}</td>
                          <td><StatusBadge status={d.statutory_status as string} /></td>
                          <td className="text-xs text-slate-500 dark:text-slate-400">{(d.created_at as string)?.slice(0, 10)}</td>
                          <td className="text-right"><button className="text-xs text-blue-400">View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contract Flow Tab */}
      {tab === 'flow' && (
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">Phase Transition Rules</h3>
          <div className="space-y-3">
            {[
              { from: 'draft', to: 'loi', prereq: 'Title, counterparty, key terms filled' },
              { from: 'loi', to: 'term_sheet', prereq: 'Both parties acknowledge LOI' },
              { from: 'term_sheet', to: 'hoa', prereq: 'Term sheet signed by all parties' },
              { from: 'hoa', to: 'draft_agreement', prereq: 'HOA signed, template selected or custom document uploaded' },
              { from: 'draft_agreement', to: 'legal_review', prereq: 'Full agreement uploaded, all schedules attached' },
              { from: 'legal_review', to: 'statutory_check', prereq: 'Legal review flagged as complete by both parties' },
              { from: 'statutory_check', to: 'execution', prereq: 'All statutory checks PASS or EXEMPT or OVERRIDDEN' },
              { from: 'execution', to: 'active', prereq: 'All signatories have digitally signed' },
              { from: 'active', to: 'amended', prereq: 'Amendment submitted, new version created' },
              { from: 'active', to: 'terminated', prereq: 'Termination notice served per contract terms' },
            ].map((rule, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <span className="px-2 py-1 rounded text-xs bg-slate-700 font-mono">{rule.from}</span>
                <FiFileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="px-2 py-1 rounded text-xs bg-slate-700 font-mono">{rule.to}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{rule.prereq}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">Document Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DOC_TYPES.map((t) => (
              <div key={t} className={`p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}               ${tc.isDark ? "hover:bg-white/[0.08]" : "hover:bg-slate-100"} transition-colors cursor-pointer`}>
                              <FiFileText className="w-8 h-8 text-blue-400 mb-2" />
                <div className="font-medium capitalize">{t.replace('_', ' ')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Standard template</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statutory Rules Tab */}
      {tab === 'statutory' && (
        <div className={`${tc.cardBg} p-6`}>
          <h3 className="text-sm font-semibold mb-4">14 SA Statutory Rules</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                <th className="text-left py-2">#</th><th className="text-left py-2">Regulation</th>
                <th className="text-left py-2">Method</th><th className="text-left py-2">Source</th>
                <th className="text-left py-2">Frequency</th><th className="text-left py-2">Blocking</th>
                <th className="text-left py-2">Override</th>
              </tr></thead>
              <tbody>
                {statutoryRules.map((r, i) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-white/[0.06]">
                    <td className="py-2 text-slate-400">{i + 1}</td>
                    <td className="font-medium">{r.regulation}</td>
                    <td><span className={`px-2 py-0.5 rounded text-xs ${r.method === 'Auto' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{r.method}</span></td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">{r.source}</td>
                    <td className="text-xs">{r.frequency}</td>
                    <td>{r.blocking ? <FiAlertTriangle className="w-4 h-4 text-red-400" /> : <span className="text-xs text-slate-500">No</span>}</td>
                    <td>{r.override ? <span className="text-xs text-emerald-400">Yes</span> : <span className="text-xs text-red-400">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smart Rules Tab */}
      {tab === 'smart_rules' && (
        <div className="space-y-6">
          <div className={`${tc.cardBg} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Smart Contract Rules</h3>
              <button className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium">Add Rule</button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Automated rules that trigger actions based on metering data, payments, and contract events via the SmartContractDO.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                  <th className="text-left py-2">Rule</th><th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Condition</th><th className="text-left py-2">Action</th>
                  <th className="text-left py-2">Status</th><th className="text-right py-2">Triggers</th>
                </tr></thead>
                <tbody>
                  {[
                    { name: 'Auto-Invoice on Delivery', type: 'metering_trigger', condition: 'metering_validated && volume > 0', action: 'Generate invoice with VAT', status: 'enabled', triggers: 142 },
                    { name: 'Payment Settlement', type: 'payment_trigger', condition: 'payment_confirmed', action: 'Release escrow to seller', status: 'enabled', triggers: 98 },
                    { name: 'Generation Threshold Alert', type: 'threshold_alert', condition: 'generation < 80% contracted', action: 'Notify offtaker + log shortfall', status: 'enabled', triggers: 7 },
                    { name: 'Auto-Penalty Calculation', type: 'auto_penalty', condition: 'shortfall > 5% for 3 consecutive months', action: 'Calculate penalty per PPA terms', status: 'enabled', triggers: 2 },
                    { name: 'Contract Auto-Renewal', type: 'auto_renewal', condition: '90 days before expiry && no termination notice', action: 'Extend contract by 1 year', status: 'disabled', triggers: 0 },
                    { name: 'Escalation Trigger', type: 'auto_escalation', condition: 'dispute unresolved > 30 days', action: 'Escalate to senior management', status: 'enabled', triggers: 1 },
                    { name: 'Auto-Settle P2P', type: 'auto_settle', condition: 'metering_validated && payment_confirmed', action: 'Mark trade as settled', status: 'enabled', triggers: 45 },
                  ].map((r, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-white/[0.06]">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td><span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">{r.type}</span></td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[200px] truncate">{r.condition}</td>
                      <td className="text-xs text-slate-300">{r.action}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'enabled' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right font-mono text-xs">{r.triggers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={`${tc.cardBg} p-6`}>
            <h3 className="text-sm font-semibold mb-3">Rule Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'metering_trigger', desc: 'Fires when meter readings are validated', count: 2 },
                { type: 'payment_trigger', desc: 'Fires on payment confirmation', count: 1 },
                { type: 'threshold_alert', desc: 'Fires when value crosses threshold', count: 1 },
                { type: 'auto_invoice', desc: 'Auto-generates invoices', count: 1 },
                { type: 'auto_settle', desc: 'Auto-settles matched trades', count: 1 },
                { type: 'auto_penalty', desc: 'Calculates contractual penalties', count: 1 },
                { type: 'auto_escalation', desc: 'Escalates unresolved disputes', count: 1 },
                { type: 'auto_renewal', desc: 'Renews contracts before expiry', count: 1 },
              ].map((rt) => (
                <div key={rt.type} className={`p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                  <div className="text-xs font-mono text-blue-400">{rt.type}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{rt.desc}</div>
                  <div className="text-xs text-slate-500 mt-1">{rt.count} active</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Document" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Title *</label>
            <input className={inputClass} required value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Document Type *</label>
              <select className={inputClass} value={createForm.document_type} onChange={(e) => setCreateForm({ ...createForm, document_type: e.target.value })}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Counterparty ID</label>
              <input className={inputClass} value={createForm.counterparty_id} onChange={(e) => setCreateForm({ ...createForm, counterparty_id: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Pricing Mechanism</label>
              <select className={inputClass} value={createForm.pricing_mechanism} onChange={(e) => setCreateForm({ ...createForm, pricing_mechanism: e.target.value })}>
                {['fixed', 'indexed', 'escalating', 'hybrid', 'market'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Pricing Value</label>
              <input className={inputClass} value={createForm.pricing_value} onChange={(e) => setCreateForm({ ...createForm, pricing_value: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Volume</label>
              <input className={inputClass} value={createForm.volume} onChange={(e) => setCreateForm({ ...createForm, volume: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Tenor</label>
              <input className={inputClass} value={createForm.tenor} onChange={(e) => setCreateForm({ ...createForm, tenor: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Delivery Point</label>
            <input className={inputClass} value={createForm.delivery_point} onChange={(e) => setCreateForm({ ...createForm, delivery_point: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Document'}
          </button>
        </form>
      </Modal>

      {/* Sign Modal */}
      <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title="Digital Signature">
        <form onSubmit={handleSign} className="space-y-4">
          <div className={`p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-sm`}>
            Signing: <strong>{selectedDoc?.title as string}</strong> (v{selectedDoc?.version as string})
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Full Name *</label>
            <input className={inputClass} required value={signForm.signatory_name} onChange={(e) => setSignForm({ ...signForm, signatory_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Designation *</label>
            <input className={inputClass} required value={signForm.signatory_designation} onChange={(e) => setSignForm({ ...signForm, signatory_designation: e.target.value })} />
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs">
            By signing, you confirm the document hash will be recorded and the signature is legally binding.
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Signing...' : 'Apply Digital Signature'}
          </button>
        </form>
      </Modal>

      {/* Amend Modal */}
      <Modal isOpen={showAmendModal} onClose={() => setShowAmendModal(false)} title="Create Amendment">
        <form onSubmit={handleAmend} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Reason for Amendment *</label>
            <textarea className={inputClass} rows={3} required value={amendForm.reason} onChange={(e) => setAmendForm({ ...amendForm, reason: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={amendForm.major} onChange={(e) => setAmendForm({ ...amendForm, major: e.target.checked })} className="rounded" />
            Major version change (requires re-signing)
          </label>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Amendment'}
          </button>
        </form>
      </Modal>

      {/* Advance Phase Modal */}
      <Modal isOpen={showPhaseModal} onClose={() => setShowPhaseModal(false)} title="Advance Phase">
        <div className="space-y-4">
          <div className={`p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-sm`}>
            Current phase: <strong className="capitalize">{(selectedDoc?.phase as string)?.replace('_', ' ')}</strong>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Target Phase *</label>
            <select className={inputClass} value={targetPhase} onChange={(e) => setTargetPhase(e.target.value)}>
              <option value="">Select phase...</option>
              {PHASES.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button onClick={handleAdvancePhase} disabled={loading || !targetPhase} className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Advancing...' : 'Advance Phase'}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
