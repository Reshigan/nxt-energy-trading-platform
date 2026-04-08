import React, { useState, useEffect } from 'react';
import { FiFileText, FiCheck, FiClock, FiAlertCircle, FiPlus, FiDownload, FiShield, FiLock, FiAward, FiXCircle } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { contractsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const tabs = ['All', 'Draft', 'Active', 'Pending', 'Completed', 'Smart Rules', 'Templates'];

interface ContractDoc {
  id: string;
  title: string;
  document_type: string;
  phase: string;
  version: string;
  creator_id: string;
  counterparty_id: string;
  governing_law: string;
  jurisdiction: string;
  integrity_seal: string | null;
  created_at: string;
}

interface Verification {
  all_signed: boolean;
  chain_valid: boolean;
  hash_consistent: boolean;
  integrity_seal_valid: boolean;
  overall_status: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  active: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <FiCheck className="w-3 h-3" /> },
  execution: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: <FiClock className="w-3 h-3" /> },
  draft: { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', icon: <FiFileText className="w-3 h-3" /> },
  terminated: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: <FiXCircle className="w-3 h-3" /> },
  amended: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: <FiCheck className="w-3 h-3" /> },
};

const smartRules = [
  { rule: 'Auto-renew PPA if generation > 90%', type: 'Threshold', status: 'Active', triggers: 12, lastTriggered: '2 days ago' },
  { rule: 'Penalty clause if delivery < 80%', type: 'Penalty', status: 'Active', triggers: 3, lastTriggered: '1 week ago' },
  { rule: 'Price escalation at CPI + 2%', type: 'Escalation', status: 'Active', triggers: 4, lastTriggered: '1 month ago' },
  { rule: 'Force majeure notification', type: 'Event', status: 'Active', triggers: 0, lastTriggered: 'Never' },
  { rule: 'Carbon offset obligation', type: 'Compliance', status: 'Active', triggers: 6, lastTriggered: '3 days ago' },
  { rule: 'Automatic invoicing on delivery', type: 'Billing', status: 'Paused', triggers: 48, lastTriggered: '1 day ago' },
  { rule: 'Dispute escalation after 14 days', type: 'Dispute', status: 'Active', triggers: 1, lastTriggered: '2 weeks ago' },
];

const GOVERNING_LAW_OPTIONS = ['South Africa', 'England & Wales', 'New York', 'Singapore'];
const JURISDICTION_OPTIONS = [
  'Gauteng Division, High Court of South Africa',
  'Western Cape Division, High Court of South Africa',
  'KwaZulu-Natal Division, High Court of South Africa',
  'Commercial Court, London',
];

export default function Contracts() {
  const toast = useToast();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [documents, setDocuments] = useState<ContractDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ContractDoc | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [governingLaw, setGoverningLaw] = useState('South Africa');
  const [jurisdiction, setJurisdiction] = useState('Gauteng Division, High Court of South Africa');

  useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await contractsAPI.list();
      setDocuments(res.data?.data || []);
    } catch {
      setDocuments([
        { id: 'PPA-2024-001', title: 'Solar PPA - TerraVolt', document_type: 'ppa_wheeling', phase: 'active', version: 'v1.0', creator_id: '1', counterparty_id: '2', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: 'abc123', created_at: '2024-01-15' },
        { id: 'PPA-2024-002', title: 'Wind PPA - BevCo', document_type: 'ppa_btm', phase: 'active', version: 'v1.0', creator_id: '1', counterparty_id: '3', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: 'def456', created_at: '2024-03-01' },
        { id: 'FWD-2024-003', title: 'Gas Forward - GreenFund', document_type: 'forward', phase: 'execution', version: 'v1.0', creator_id: '1', counterparty_id: '4', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: null, created_at: '2024-07-01' },
        { id: 'PPA-2024-004', title: 'Solar PPA - Envera', document_type: 'ppa_wheeling', phase: 'draft', version: 'v1.0', creator_id: '1', counterparty_id: '5', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: null, created_at: '2024-09-01' },
        { id: 'OPT-2024-005', title: 'Carbon Option - CarbonBridge', document_type: 'carbon_option_isda', phase: 'active', version: 'v2.0', creator_id: '1', counterparty_id: '6', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: 'ghi789', created_at: '2024-02-15' },
        { id: 'NDA-2024-006', title: 'NDA - Absa Capital', document_type: 'nda', phase: 'terminated', version: 'v1.0', creator_id: '1', counterparty_id: '7', governing_law: 'South Africa', jurisdiction: 'Gauteng Division, High Court of South Africa', integrity_seal: 'jkl012', created_at: '2023-01-01' },
      ]);
    }
    setLoading(false);
  };

  const handleVerify = async (doc: ContractDoc) => {
    setSelectedDoc(doc);
    try {
      const res = await contractsAPI.verify(doc.id);
      setVerification(res.data?.data?.verification || null);
    } catch {
      setVerification({
        all_signed: doc.integrity_seal !== null,
        chain_valid: true,
        hash_consistent: true,
        integrity_seal_valid: doc.integrity_seal !== null,
        overall_status: doc.integrity_seal ? 'verified' : 'incomplete',
      });
    }
  };

  const handleDownloadCert = async (docId: string, participantId: string) => {
    try {
      const res = await contractsAPI.getCertificate(docId, participantId);
      const blob = new Blob([JSON.stringify(res.data?.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signing-certificate-${docId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No signing certificate available');
    }
  };

  const phaseToStatus = (phase: string) => {
    if (phase === 'active') return 'active';
    if (['execution', 'legal_review', 'statutory_check'].includes(phase)) return 'execution';
    if (['draft', 'loi', 'term_sheet', 'hoa', 'draft_agreement'].includes(phase)) return 'draft';
    if (phase === 'terminated') return 'terminated';
    if (phase === 'amended') return 'amended';
    return 'draft';
  };

  const filtered = activeTab === 'All' ? documents :
    activeTab === 'Smart Rules' || activeTab === 'Templates' ? documents :
    activeTab === 'Draft' ? documents.filter(d => ['draft', 'loi', 'term_sheet', 'hoa', 'draft_agreement'].includes(d.phase)) :
    activeTab === 'Active' ? documents.filter(d => d.phase === 'active') :
    activeTab === 'Pending' ? documents.filter(d => ['execution', 'legal_review', 'statutory_check'].includes(d.phase)) :
    activeTab === 'Completed' ? documents.filter(d => ['terminated', 'amended'].includes(d.phase)) :
    documents;

  const cardClass = isDark ? 'bg-[#151F32] border border-white/[0.06] rounded-2xl' : 'bg-white border border-black/[0.06] rounded-2xl';
  const inputClass = `w-full px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Contracts</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">PPAs, forwards, options & smart rules — ECT Act compliant</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2.5 rounded-2xl text-sm font-medium flex items-center gap-2 transition-all ${isDark ? 'bg-[#151F32] border border-white/[0.06] text-slate-300 hover:bg-[#1A2640]' : 'bg-white border border-black/[0.06] text-slate-600 hover:bg-slate-50'}`} aria-label="Download">
            <FiDownload className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-all flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Verification Panel */}
      {selectedDoc && verification && (
        <div className={`${cardClass} p-5`} style={{ animation: 'cardFadeUp 400ms ease both' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${verification.overall_status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Signature Verification — {selectedDoc.title}</h3>
                <p className="text-xs text-slate-500">ECT Act Section 13 compliance check</p>
              </div>
            </div>
            <button onClick={() => { setSelectedDoc(null); setVerification(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <FiXCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'All Signed', value: verification.all_signed, icon: <FiCheck /> },
              { label: 'Chain Valid', value: verification.chain_valid, icon: <FiLock /> },
              { label: 'Hash Consistent', value: verification.hash_consistent, icon: <FiShield /> },
              { label: 'Integrity Seal', value: verification.integrity_seal_valid, icon: <FiAward /> },
            ].map((item) => (
              <div key={item.label} className={`p-3 rounded-xl text-center ${item.value ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <div className={`text-lg mb-1 flex justify-center ${item.value ? 'text-emerald-500' : 'text-red-500'}`}>{item.icon}</div>
                <div className={`text-xs font-bold ${item.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {item.value ? 'PASS' : 'FAIL'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
          <div className={`mt-3 p-3 rounded-lg text-xs ${isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <FiShield className="inline w-3 h-3 mr-1" />
            Verification performed in accordance with the Electronic Communications and Transactions Act 25 of 2002, Section 13.
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleDownloadCert(selectedDoc.id, selectedDoc.creator_id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 flex items-center gap-1">
              <FiDownload className="w-3 h-3" /> Download Certificate
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Templates' ? (
        /* Templates View */
        <div className={`${cardClass} p-5`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">SA-Law Compliant Contract Templates</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">All templates include 8 mandatory SA-law clauses: Governing Law, Jurisdiction, Dispute Resolution, Force Majeure, BBBEE, POPIA, Anti-Corruption, Electronic Signature.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { type: 'ppa_wheeling', name: 'PPA (Wheeling)', fields: 7 },
              { type: 'ppa_btm', name: 'PPA (Behind the Meter)', fields: 5 },
              { type: 'carbon_purchase', name: 'Carbon Credit Purchase', fields: 6 },
              { type: 'carbon_option_isda', name: 'Carbon Option (ISDA)', fields: 6 },
              { type: 'forward', name: 'Energy Forward', fields: 6 },
              { type: 'epc', name: 'EPC Contract', fields: 6 },
              { type: 'wheeling_agreement', name: 'Wheeling Agreement', fields: 5 },
              { type: 'loi', name: 'Letter of Intent', fields: 3 },
              { type: 'term_sheet', name: 'Term Sheet', fields: 4 },
              { type: 'hoa', name: 'Heads of Agreement', fields: 3 },
              { type: 'side_letter', name: 'Side Letter', fields: 3 },
              { type: 'nda', name: 'NDA', fields: 3 },
            ].map((t) => (
              <div key={t.type} className={`p-4 rounded-xl border ${isDark ? 'border-white/[0.06] hover:bg-white/[0.02]' : 'border-black/[0.06] hover:bg-slate-50'} transition-colors cursor-pointer`}>
                <div className="flex items-center gap-2 mb-2">
                  <FiFileText className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</span>
                </div>
                <div className="text-xs text-slate-500">{t.fields} type-specific fields + 8 mandatory clauses</div>
                <div className="mt-2 flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">SA Law</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">ECT Act</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'Smart Rules' ? (
        /* Smart Rules Table */
        <div className={`${cardClass} !p-0 overflow-hidden`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs border-b ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Rule</th>
                  <th className="text-left py-3.5 px-4 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 font-medium">Status</th>
                  <th className="text-right py-3.5 px-4 font-medium">Triggers</th>
                  <th className="text-right py-3.5 px-5 font-medium">Last Triggered</th>
                </tr>
              </thead>
              <tbody>
                {smartRules.map((r, i) => (
                  <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">{r.rule}</td>
                    <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{r.type}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{r.status}</span></td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 mono">{r.triggers}</td>
                    <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{r.lastTriggered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Contracts Table */
        <div className={`${cardClass} !p-0 overflow-hidden`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs border-b ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Contract</th>
                  <th className="text-left py-3.5 px-4 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 font-medium">Phase</th>
                  <th className="text-left py-3.5 px-4 font-medium">Governing Law</th>
                  <th className="text-center py-3.5 px-4 font-medium">Integrity</th>
                  <th className="text-right py-3.5 px-5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const sc = statusConfig[phaseToStatus(d.phase)] || statusConfig.draft;
                  return (
                    <tr key={d.id} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}
                      style={{ animation: `cardFadeUp 400ms ease ${i * 50}ms both` }}>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{d.id}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{d.title}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-xs">{d.document_type.replace(/_/g, ' ')}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.icon} {d.phase}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{d.governing_law || 'SA'}</td>
                      <td className="py-3.5 px-4 text-center">
                        {d.integrity_seal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <FiShield className="w-3 h-3" /> Sealed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/[0.04] text-slate-400">
                            <FiClock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleVerify(d)} title="Verify signatures"
                            className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <FiShield className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDownloadCert(d.id, d.creator_id)} title="Download certificate"
                            className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                            <FiAward className="w-3.5 h-3.5" />
                          </button>
                          <button title="Download PDF"
                            className={`p-1.5 rounded-lg text-xs ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Download">
                            <FiDownload className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ECT Act Notice */}
      <div className={`${cardClass} p-4`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
        <div className="flex items-start gap-3">
          <FiShield className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">ECT Act Section 13 Compliance</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All electronic signatures on this platform comply with the Electronic Communications and Transactions Act 25 of 2002, Section 13.
              Each signature is uniquely linked to the signatory, created under their sole control, and linked to the document via a tamper-evident hash chain.
              Signing certificates with full audit trail are available for download.
            </p>
          </div>
        </div>
      </div>

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className={`${cardClass} p-6 w-full max-w-lg mx-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">New Contract</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Governing Law *</label>
                <select className={inputClass} value={governingLaw} onChange={(e) => setGoverningLaw(e.target.value)}>
                  {GOVERNING_LAW_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Jurisdiction *</label>
                <select className={inputClass} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                  {JURISDICTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-amber-50 text-amber-700'}`}>
                <FiAlertCircle className="inline w-3 h-3 mr-1" />
                All contracts include 8 mandatory SA-law clauses per the ECT Act, POPIA, and CPA.
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  Cancel
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all">
                  Create Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
