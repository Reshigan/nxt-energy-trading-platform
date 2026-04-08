import React, { useState, useEffect, useCallback } from 'react';
import { FiShield, FiCheck, FiAlertCircle, FiClock, FiUpload, FiFileText, FiRefreshCw } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { complianceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';

const TABS = ['Overview', 'KYC Documents', 'Licences', 'Statutory Checks'] as const;

interface KYCDoc { name: string; status: string; date: string; score: number; }
interface Licence { name: string; number: string; status: string; expiry: string; issuer: string; }
interface StatutoryCheck { rule: string; status: string; lastCheck: string; regulator: string; }

const statusBadge: Record<string, string> = {
  Verified: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Pending Renewal': 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Expired: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  Fail: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  'N/A': 'bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

export default function Compliance() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [showUploadKYC, setShowUploadKYC] = useState(false);
  const [kycFile, setKycFile] = useState('');
  const [uploadingKYC, setUploadingKYC] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overriding, setOverriding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [kycData, setKycData] = useState<KYCDoc[]>([]);
  const [licenceData, setLicenceData] = useState<Licence[]>([]);
  const [statutoryData, setStatutoryData] = useState<StatutoryCheck[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [kycRes, licRes, statRes] = await Promise.allSettled([
        complianceAPI.getKYC(), complianceAPI.getLicences(), complianceAPI.getStatutory(),
      ]);
      if (kycRes.status === 'fulfilled') setKycData(Array.isArray(kycRes.value.data?.data) ? kycRes.value.data.data : []);
      if (licRes.status === 'fulfilled') setLicenceData(Array.isArray(licRes.value.data?.data) ? licRes.value.data.data : []);
      if (statRes.status === 'fulfilled') setStatutoryData(Array.isArray(statRes.value.data?.data) ? statRes.value.data.data : []);
      if (kycRes.status === 'rejected' && licRes.status === 'rejected' && statRes.status === 'rejected') setError('Failed to load compliance data.');
    } catch { setError('Failed to load compliance data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUploadKYC = async () => {
    if (!kycFile.trim()) { toast.error('Please enter document name'); return; }
    setUploadingKYC(true);
    try {
      const res = await complianceAPI.verifyKYC(kycFile);
      if (res.data?.success) { toast.success('KYC document uploaded'); setShowUploadKYC(false); setKycFile(''); loadData(); }
      else toast.error(res.data?.error || 'Upload failed');
    } catch { toast.error('Upload failed'); }
    setUploadingKYC(false);
  };

  const handleOverride = async () => {
    if (!overrideTarget) return;
    setOverriding(true);
    try {
      const res = await complianceAPI.overrideStatutory(overrideTarget, { reason: 'Administrative override' });
      if (res.data?.success) { toast.success('Statutory override applied'); setOverrideTarget(null); loadData(); }
      else toast.error(res.data?.error || 'Override failed');
    } catch { toast.error('Override failed'); }
    setOverriding(false);
  };

  const verifiedCount = kycData.filter(d => d.status === 'Verified').length;
  const overallScore = kycData.length > 0 ? Math.round(kycData.reduce((s, d) => s + (d.score || 0), 0) / kycData.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Compliance page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Compliance</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">KYC verification, licences & statutory compliance</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh compliance data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Compliance sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {loading ? (<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-20" />)}</div>) : activeTab === 'Overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 150ms both' }}>
            {[
              { label: 'KYC Score', value: `${overallScore}%`, icon: FiShield, color: overallScore >= 80 ? 'text-emerald-500' : 'text-amber-500' },
              { label: 'Docs Verified', value: `${verifiedCount}/${kycData.length}`, icon: FiCheck, color: 'text-emerald-500' },
              { label: 'Active Licences', value: `${licenceData.filter(l => l.status === 'Active').length}/${licenceData.length}`, icon: FiFileText, color: 'text-blue-500' },
              { label: 'Statutory Checks', value: `${statutoryData.filter(s => s.status === 'Pass').length}/${statutoryData.length}`, icon: FiShield, color: 'text-blue-500' },
            ].map((kpi, i) => (
              <div key={kpi.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${150 + i * 60}ms both` }}>
                <kpi.icon className={`w-4 h-4 ${kpi.color} mb-2`} />
                <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">10-Point Verification Progress</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {kycData.map((doc, i) => (
                <div key={doc.name} className={`p-3 rounded-xl border ${doc.status === 'Verified' ? c('border-emerald-500/20 bg-emerald-500/5', 'border-emerald-200 bg-emerald-50') : doc.status === 'Pending' ? c('border-amber-500/20 bg-amber-500/5', 'border-amber-200 bg-amber-50') : c('border-red-500/20 bg-red-500/5', 'border-red-200 bg-red-50')}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {doc.status === 'Verified' ? <FiCheck className="w-3 h-3 text-emerald-500" /> : doc.status === 'Pending' ? <FiClock className="w-3 h-3 text-amber-500" /> : <FiAlertCircle className="w-3 h-3 text-red-500" />}
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{doc.name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${statusBadge[doc.status]?.split(' ').filter(c => c.startsWith('text-')).join(' ') || 'text-slate-400'}`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'KYC Documents' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium">Document</th>
                <th className="text-left py-3.5 px-4 font-medium">Status</th>
                <th className="text-right py-3.5 px-4 font-medium">Score</th>
                <th className="text-right py-3.5 px-5 font-medium">Date</th>
              </tr></thead>
              <tbody>{kycData.map(doc => (
                <tr key={doc.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">{doc.name}</td>
                  <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[doc.status] || ''}`}>{doc.status}</span></td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{doc.score}%</td>
                  <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{doc.date}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Licences' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {licenceData.map((lic, i) => (
            <div key={lic.number} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{lic.name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[lic.status] || ''}`}>{lic.status}</span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <p>Number: <span className="text-slate-600 dark:text-slate-300 mono">{lic.number}</span></p>
                <p>Issuer: <span className="text-slate-600 dark:text-slate-300">{lic.issuer}</span></p>
                <p>Expiry: <span className="text-slate-600 dark:text-slate-300">{lic.expiry}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Statutory Checks' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3.5 px-5 font-medium">Rule</th>
                <th className="text-left py-3.5 px-4 font-medium">Regulator</th>
                <th className="text-left py-3.5 px-4 font-medium">Status</th>
                <th className="text-right py-3.5 px-5 font-medium">Last Check</th>
              </tr></thead>
              <tbody>{statutoryData.map(s => (
                <tr key={s.rule} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-medium text-slate-800 dark:text-slate-200">{s.rule}</td>
                  <td className="py-3 px-4 text-slate-500">{s.regulator}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[s.status] || ''}`}>{s.status}</span></td>
                  <td className="py-3 px-5 text-right text-slate-400 text-xs">{s.lastCheck}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showUploadKYC} onClose={() => setShowUploadKYC(false)} title="Upload KYC Document">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Document Name</label>
            <input value={kycFile} onChange={e => setKycFile(e.target.value)} placeholder="e.g. ID-verification-2024.pdf" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <p className="text-xs text-slate-400">Supported formats: PDF, JPG, PNG. Max 10MB.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowUploadKYC(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUploadKYC} loading={uploadingKYC}>Upload</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!overrideTarget} onClose={() => setOverrideTarget(null)} onConfirm={handleOverride} title="Override Statutory Requirement" description="This will mark this statutory requirement as overridden. Only do this with proper authorization." confirmLabel="Override" variant="warning" loading={overriding} />
    </motion.div>
  );
}
