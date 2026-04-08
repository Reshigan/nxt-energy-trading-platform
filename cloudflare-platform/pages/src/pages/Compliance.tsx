import React, { useState, useEffect } from 'react';
import { FiShield, FiCheck, FiAlertCircle, FiClock, FiUpload, FiFileText } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { complianceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const tabs = ['Overview', 'KYC Documents', 'Licences', 'Statutory Checks'];

const kycDocs = [
  { name: 'CIPC Registration', status: 'Verified', date: '2024-01-15', score: 100 },
  { name: 'SARS Tax Clearance', status: 'Verified', date: '2024-02-10', score: 100 },
  { name: 'VAT Registration', status: 'Verified', date: '2024-01-20', score: 100 },
  { name: 'FICA Compliance', status: 'Pending', date: '2024-03-25', score: 60 },
  { name: 'BBBEE Certificate', status: 'Expired', date: '2023-06-30', score: 0 },
  { name: 'Directors ID Documents', status: 'Verified', date: '2024-01-15', score: 100 },
  { name: 'Proof of Address', status: 'Verified', date: '2024-01-18', score: 100 },
  { name: 'Bank Confirmation', status: 'Pending', date: '2024-03-28', score: 50 },
  { name: 'Sanctions Screening', status: 'Verified', date: '2024-03-01', score: 100 },
  { name: 'POPIA Consent', status: 'Verified', date: '2024-01-15', score: 100 },
];

const licences = [
  { name: 'NERSA Generation Licence', number: 'NER-GEN-2024-001', status: 'Active', expiry: '2029-01-15', issuer: 'NERSA' },
  { name: 'FSCA Financial Services', number: 'FSP-48291', status: 'Active', expiry: '2025-12-31', issuer: 'FSCA' },
  { name: 'FAIS Compliance', number: 'FAIS-2024-882', status: 'Active', expiry: '2025-06-30', issuer: 'FSCA' },
  { name: 'CIDB Registration', number: 'CIDB-9-CE', status: 'Pending Renewal', expiry: '2024-06-30', issuer: 'CIDB' },
];

const statutoryChecks = [
  { rule: 'CIPC Annual Return Filed', status: 'Pass', lastCheck: '2024-04-01', regulator: 'CIPC' },
  { rule: 'SARS Tax Compliance', status: 'Pass', lastCheck: '2024-03-28', regulator: 'SARS' },
  { rule: 'VAT Returns Up to Date', status: 'Pass', lastCheck: '2024-03-31', regulator: 'SARS' },
  { rule: 'FICA CDD Complete', status: 'Warning', lastCheck: '2024-03-25', regulator: 'FIC' },
  { rule: 'Sanctions List Clear', status: 'Pass', lastCheck: '2024-04-01', regulator: 'FIC' },
  { rule: 'BBBEE Level Valid', status: 'Fail', lastCheck: '2024-04-01', regulator: 'DTI' },
  { rule: 'NERSA Licence Active', status: 'Pass', lastCheck: '2024-04-01', regulator: 'NERSA' },
  { rule: 'FSCA Returns Filed', status: 'Pass', lastCheck: '2024-03-15', regulator: 'FSCA' },
  { rule: 'FAIS Fit & Proper', status: 'Pass', lastCheck: '2024-02-28', regulator: 'FSCA' },
  { rule: 'CIDB Grading Current', status: 'Warning', lastCheck: '2024-03-20', regulator: 'CIDB' },
  { rule: 'POPIA Consent Valid', status: 'Pass', lastCheck: '2024-04-01', regulator: 'Info Regulator' },
  { rule: 'ERA Compliance', status: 'Pass', lastCheck: '2024-03-28', regulator: 'NERSA' },
  { rule: 'Environmental Authorisation', status: 'Pass', lastCheck: '2024-02-15', regulator: 'DFFE' },
  { rule: 'Water Use Licence', status: 'N/A', lastCheck: '-', regulator: 'DWS' },
];

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
  const [activeTab, setActiveTab] = useState('Overview');
  const [kycData, setKycData] = useState(kycDocs);
  const [licenceData, setLicenceData] = useState(licences);
  const [statutoryData, setStatutoryData] = useState(statutoryChecks);

  useEffect(() => {
    (async () => {
      try {
        const [kycRes, licRes, statRes] = await Promise.all([
          complianceAPI.getKYC(),
          complianceAPI.getLicences(),
          complianceAPI.getStatutory(),
        ]);
        if (kycRes.data?.data?.length) setKycData(kycRes.data.data);
        if (licRes.data?.data?.length) setLicenceData(licRes.data.data);
        if (statRes.data?.data?.length) setStatutoryData(statRes.data.data);
      } catch {
      toast.error('Failed to load data');
    }
    })();
  }, []);

  const verifiedCount = kycData.filter(d => d.status === 'Verified').length;
  const overallScore = Math.round(kycData.reduce((s, d) => s + d.score, 0) / kycData.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Compliance</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">KYC verification, licences & statutory compliance</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Upload">
          <FiUpload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' && (
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
    </motion.div>
  );
}
