import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiCheck, FiX, FiUpload, FiFileText } from 'react-icons/fi';
import { complianceAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Compliance() {
  const [tab, setTab] = useState<'statutory' | 'kyc' | 'licences' | 'audit'>('statutory');
  const [statutory, setStatutory] = useState<Array<Record<string, unknown>>>([]);
  const [kyc, setKyc] = useState<Array<Record<string, unknown>>>([]);
  const [licences, setLicences] = useState<Array<Record<string, unknown>>>([]);
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<Record<string, unknown> | null>(null);
  const [reviewForm, setReviewForm] = useState({ decision: 'pass' as 'pass' | 'fail', notes: '' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'statutory') {
        const res = await complianceAPI.getStatutory();
        setStatutory(res.data.data);
      } else if (tab === 'kyc') {
        const res = await complianceAPI.getKYC();
        setKyc(res.data.data);
      } else if (tab === 'licences') {
        const res = await complianceAPI.getLicences();
        setLicences(res.data.data);
      } else {
        const res = await complianceAPI.getAudit();
        setAudit(res.data.data);
      }
    } catch { /* ignore */ }
  };

  const handleReview = async () => {
    if (!selectedCheck) return;
    try {
      await complianceAPI.reviewStatutory(selectedCheck.id as string, reviewForm);
      setShowReviewModal(false);
      loadData();
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: 'statutory' as const, label: 'Statutory Checks', icon: FiShield },
    { id: 'kyc' as const, label: 'KYC Documents', icon: FiFileText },
    { id: 'licences' as const, label: 'Licences', icon: FiCheck },
    { id: 'audit' as const, label: 'Audit Log', icon: FiFileText },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Compliance & Regulatory</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Statutory Checks */}
      {tab === 'statutory' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Statutory Checks</h3>
          {statutory.length === 0 ? (
            <p className="text-sm text-slate-400">No statutory checks found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Regulation</th>
                  <th className="text-left py-2">Entity</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Source</th>
                  <th className="text-right py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {statutory.map((ch) => (
                    <tr key={ch.id as string} className="border-t border-slate-800">
                      <td className="py-2 font-medium">{ch.regulation as string}</td>
                      <td className="text-slate-400">{ch.entity_type as string}</td>
                      <td>{ch.method as string}</td>
                      <td><StatusBadge status={ch.status as string} /></td>
                      <td className="text-xs text-slate-400 max-w-[200px] truncate">{ch.source as string || '-'}</td>
                      <td className="text-right">
                        {(ch.status === 'pending' || ch.status === 'running') && ch.method === 'manual' && (
                          <button onClick={() => { setSelectedCheck(ch); setShowReviewModal(true); }}
                            className="text-xs text-cyan-400 hover:text-cyan-300">Review</button>
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

      {/* KYC Documents */}
      {tab === 'kyc' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">KYC Documents</h3>
          {kyc.length === 0 ? (
            <p className="text-sm text-slate-400">No KYC documents uploaded</p>
          ) : (
            <div className="space-y-3">
              {kyc.map((doc) => (
                <div key={doc.id as string} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <FiFileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="font-medium text-sm">{doc.document_type as string}</div>
                      <div className="text-xs text-slate-400">{doc.file_name as string}</div>
                    </div>
                  </div>
                  <StatusBadge status={doc.verified ? 'verified' : 'pending'} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Licences */}
      {tab === 'licences' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Licences</h3>
          {licences.length === 0 ? (
            <p className="text-sm text-slate-400">No licences on record</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Number</th>
                  <th className="text-left py-2">Issuer</th>
                  <th className="text-left py-2">Expiry</th>
                  <th className="text-left py-2">Status</th>
                </tr></thead>
                <tbody>
                  {licences.map((l) => (
                    <tr key={l.id as string} className="border-t border-slate-800">
                      <td className="py-2">{l.type as string}</td>
                      <td>{l.licence_number as string}</td>
                      <td>{l.issuer as string}</td>
                      <td>{l.expiry_date as string}</td>
                      <td><StatusBadge status={l.status as string} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Audit Log</h3>
          {audit.length === 0 ? (
            <p className="text-sm text-slate-400">No audit entries</p>
          ) : (
            <div className="space-y-2">
              {audit.map((entry) => (
                <div key={entry.id as string} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 text-sm">
                  <div>
                    <span className="font-medium">{entry.action as string}</span>
                    <span className="text-slate-400 ml-2">on {entry.entity_type as string}</span>
                  </div>
                  <span className="text-xs text-slate-500">{entry.created_at as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Review Statutory Check">
        {selectedCheck && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm"><strong>Regulation:</strong> {selectedCheck.regulation as string}</div>
              <div className="text-sm"><strong>Entity:</strong> {selectedCheck.entity_type as string} / {selectedCheck.entity_id as string}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setReviewForm({ ...reviewForm, decision: 'pass' })}
                  className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${reviewForm.decision === 'pass' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <FiCheck /> Approve
                </button>
                <button type="button" onClick={() => setReviewForm({ ...reviewForm, decision: 'fail' })}
                  className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${reviewForm.decision === 'fail' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <FiX /> Reject
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                rows={3} value={reviewForm.notes} onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })} />
            </div>
            <button onClick={handleReview}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
              Submit Review
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
