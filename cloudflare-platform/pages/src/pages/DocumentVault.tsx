import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiUpload, FiShare2, FiShield, FiSearch, FiRefreshCw, FiPlus, FiGrid } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { vaultAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

interface VaultDoc {
  id: string;
  title: string;
  document_type: string;
  file_name: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  fields: string[];
}

export default function DocumentVault() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<VaultDoc[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', document_type: 'general' });
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'templates'>('documents');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [docsRes, tplRes] = await Promise.allSettled([vaultAPI.getDocuments(), vaultAPI.getTemplates()]);
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value.data?.data)) setDocuments(docsRes.value.data.data);
      if (tplRes.status === 'fulfilled' && Array.isArray(tplRes.value.data?.data)) setTemplates(tplRes.value.data.data);
    } catch { setError('Failed to load vault data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      const res = await vaultAPI.uploadDocument(uploadForm);
      if (res.data?.success) { toast.success('Document uploaded'); setShowUpload(false); setUploadForm({ title: '', document_type: 'general' }); loadData(); }
      else toast.error(res.data?.error || 'Upload failed');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await vaultAPI.verifyDocument(id);
      if (res.data?.success) toast.success(`Verified — Hash: ${(res.data.data?.integrity_hash || '').substring(0, 16)}...`);
      else toast.error('Verification failed');
    } catch { toast.error('Verification failed'); }
  };

  const filtered = documents.filter(d => !search || (d.title || '').toLowerCase().includes(search.toLowerCase()) || (d.document_type || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Document Vault page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Document Vault</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Secure document storage, templates &amp; integrity verification</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Upload document"><FiUpload className="w-4 h-4" /> Upload</button>
          <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Documents', value: String(documents.length), icon: <FiFileText className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Templates', value: String(templates.length), icon: <FiGrid className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Contracts', value: String(documents.filter(d => d.document_type === 'contract' || d.document_type === 'ppa').length), icon: <FiFileText className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Shared', value: '0', icon: <FiShare2 className="w-5 h-5" />, color: 'text-amber-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['documents', 'templates'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${activeTab === tab ? 'bg-blue-500 text-white' : c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-600')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'documents' && (
        <>
          <div className="relative" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`} aria-label="Search documents" />
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No documents" description="Upload your first document to get started." />
          ) : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr></thead>
                  <tbody>{filtered.map(d => (
                    <tr key={d.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{d.title}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize">{d.document_type}</td>
                      <td className="py-3 px-4 text-right text-slate-400 text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString('en-ZA') : '\u2014'}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleVerify(d.id)} className="text-xs text-blue-500 hover:text-blue-600 font-medium" aria-label="Verify document"><FiShield className="w-3.5 h-3.5 inline mr-1" />Verify</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {templates.map((t, i) => (
            <div key={t.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 60}ms both` }}>
              <FiFileText className="w-5 h-5 text-blue-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</h3>
              <p className="text-xs text-slate-400 mt-1 capitalize">{t.category}</p>
              <div className="flex flex-wrap gap-1 mt-3">{t.fields.map(f => (
                <span key={f} className={`px-2 py-0.5 rounded text-[10px] font-medium ${c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>{f}</span>
              ))}</div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Document">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Document Title</label>
            <input value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Solar PPA — Karoo Farm" className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400')}`} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <select value={uploadForm.document_type} onChange={e => setUploadForm(p => ({ ...p, document_type: e.target.value }))} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`}>
              <option value="general">General</option><option value="contract">Contract</option><option value="ppa">PPA</option><option value="compliance">Compliance</option><option value="financial">Financial</option><option value="legal">Legal</option>
            </select></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpload} loading={uploading}>Upload</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
