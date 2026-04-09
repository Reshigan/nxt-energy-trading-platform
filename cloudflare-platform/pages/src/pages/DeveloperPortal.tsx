import React, { useState, useEffect, useCallback } from 'react';
import { FiKey, FiGlobe, FiCode, FiPlus, FiTrash2, FiCopy, FiRefreshCw, FiLoader } from '../lib/fi-icons-shim';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { developerAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

const TABS = ['API Keys', 'Webhooks', 'Documentation', 'Usage'] as const;

interface ApiKey { id: string; name: string; created: string; lastUsed: string; requests: string; status: string; }
interface Webhook { id: string; url: string; events: string[]; status: string; failures: number; }
interface UsagePoint { date: string; requests: number; errors: number; }
interface Endpoint { method: string; path: string; description: string; }

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PATCH: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DELETE: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function DeveloperPortal() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('API Keys');
  const [keyData, setKeyData] = useState<ApiKey[]>([]);
  const [webhookData, setWebhookData] = useState<Webhook[]>([]);
  const [usageData, setUsageData] = useState<UsagePoint[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: 'order.filled' });
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [keysRes, whRes, usRes, docsRes] = await Promise.allSettled([
        developerAPI.getKeys(), developerAPI.getWebhooks(), developerAPI.getUsage(), developerAPI.getDocs(),
      ]);
      if (keysRes.status === 'fulfilled') setKeyData(Array.isArray(keysRes.value.data?.data) ? keysRes.value.data.data : []);
      if (whRes.status === 'fulfilled') setWebhookData(Array.isArray(whRes.value.data?.data) ? whRes.value.data.data : []);
      if (usRes.status === 'fulfilled') setUsageData(Array.isArray(usRes.value.data?.data) ? usRes.value.data.data : []);
      if (docsRes.status === 'fulfilled') setEndpoints(Array.isArray(docsRes.value.data?.data) ? docsRes.value.data.data : []);
      if (keysRes.status === 'rejected' && whRes.status === 'rejected') setError('Failed to load developer data.');
    } catch { setError('Failed to load developer data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateKey = async () => {
    if (!keyName.trim()) { toast.error('Key name is required'); return; }
    setCreatingKey(true);
    try {
      const res = await developerAPI.createKey({ name: keyName.trim() });
      if (res.data?.success || res.data?.data) { toast.success('API key created'); setShowCreateKey(false); setKeyName(''); loadData(); }
      else toast.error(res.data?.error || 'Failed to create key');
    } catch { toast.error('Failed to create API key'); }
    setCreatingKey(false);
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.url.trim()) { toast.error('URL is required'); return; }
    setCreatingWebhook(true);
    try {
      const res = await developerAPI.createWebhook({ url: webhookForm.url.trim(), events: webhookForm.events.split(',').map(e => e.trim()) });
      if (res.data?.success || res.data?.data) { toast.success('Webhook created'); setShowCreateWebhook(false); setWebhookForm({ url: '', events: 'order.filled' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to create webhook');
    } catch { toast.error('Failed to create webhook'); }
    setCreatingWebhook(false);
  };

  const handleRevokeKey = async (id: string) => {
    setRevoking(id);
    try {
      const res = await developerAPI.revokeKey(id);
      if (res.data?.success) { toast.success('API key revoked'); loadData(); }
      else toast.error(res.data?.error || 'Failed to revoke key');
    } catch { toast.error('Failed to revoke key'); }
    setRevoking(null);
  };

  const handleCopyKey = (id: string) => {
    navigator.clipboard.writeText(id).then(() => toast.success('Key copied to clipboard')).catch(() => toast.error('Failed to copy'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Developer Portal page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Developer Portal</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">API keys, webhooks, documentation & usage analytics</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh developer data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Developer sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'API Keys' && <FiKey className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab === 'Webhooks' && <FiGlobe className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab === 'Documentation' && <FiCode className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (<div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-20" />)}</div>) : activeTab === 'API Keys' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {keyData.length === 0 ? <EmptyState title="No API keys" description="Create your first API key to get started." /> : keyData.map((key, i) => (
            <div key={key.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{key.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mono">{key.id}••••••</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopyKey(key.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors" aria-label={`Copy key ${key.name}`}><FiCopy className="w-4 h-4" /></button>
                  <button onClick={() => handleRevokeKey(key.id)} disabled={revoking === key.id} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50" aria-label={`Revoke key ${key.name}`}>{revoking === key.id ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiTrash2 className="w-4 h-4" />}</button>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3 text-xs text-slate-400">
                <span>Created: {key.created}</span>
                <span>Last used: {key.lastUsed}</span>
                <span>Requests: <span className="font-semibold text-slate-600 dark:text-slate-300 mono">{key.requests}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Webhooks' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {webhookData.map((wh, i) => (
            <div key={wh.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{wh.url}</p>
                  <div className="flex gap-2 mt-2">
                    {wh.events.map(e => (
                      <span key={e} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>{e}</span>
                    ))}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${wh.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{wh.status}</span>
              </div>
              {wh.failures > 0 && <p className="text-xs text-red-400 mt-2">{wh.failures} delivery failures</p>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Documentation' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className={`px-5 py-3.5 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">API Endpoints</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium w-20">Method</th>
                <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                <th className="text-left py-3 px-5 font-medium">Description</th>
              </tr></thead>
              <tbody>{endpoints.map(ep => (
                <tr key={ep.path} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[ep.method] || ''}`}>{ep.method}</span></td>
                  <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">{ep.path}</td>
                  <td className="py-3 px-5 text-slate-500">{ep.description}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Usage' && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">API Usage (14 days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={usageData}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} fill="url(#reqGrad)" name="Requests" />
              <Area type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={1.5} fill="url(#errGrad)" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <Modal isOpen={showCreateKey} onClose={() => setShowCreateKey(false)} title="Create API Key">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Key Name</label>
            <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. Production Trading Bot" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateKey(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateKey} loading={creatingKey} disabled={!keyName.trim()}>Create Key</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={showCreateWebhook} onClose={() => setShowCreateWebhook(false)} title="Create Webhook">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Webhook URL</label>
            <input value={webhookForm.url} onChange={e => setWebhookForm(p => ({ ...p, url: e.target.value }))} placeholder="https://your-server.com/webhook" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Events (comma-separated)</label>
            <input value={webhookForm.events} onChange={e => setWebhookForm(p => ({ ...p, events: e.target.value }))} placeholder="order.filled, trade.settled" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateWebhook(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateWebhook} loading={creatingWebhook} disabled={!webhookForm.url.trim()}>Create Webhook</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
