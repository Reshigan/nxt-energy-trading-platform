import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiShield, FiCheck, FiX, FiSearch, FiActivity, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { participantsAPI, complianceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const TABS = ['Participants', 'System Stats', 'Audit Log'] as const;

interface Participant { id: string; name: string; email: string; role: string; kyc: string; status: string; joined: string; }
interface AuditEntry { time: string; user: string; action: string; target: string; ip: string; }
interface SystemStat { label: string; value: string; }
interface ApiCallPoint { hour: string; calls: number; }

export default function Admin() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Participants');
  const [search, setSearch] = useState('');
  const [participantData, setParticipantData] = useState<Participant[]>([]);
  const [auditData, setAuditData] = useState<AuditEntry[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStat[]>([]);
  const [apiCallsData, setApiCallsData] = useState<ApiCallPoint[]>([]);
  const [approving, setApproving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pRes, aRes] = await Promise.allSettled([
        participantsAPI.list(), complianceAPI.getAudit(),
      ]);
      if (pRes.status === 'fulfilled') setParticipantData(Array.isArray(pRes.value.data?.data) ? pRes.value.data.data : []);
      if (aRes.status === 'fulfilled') setAuditData(Array.isArray(aRes.value.data?.data) ? aRes.value.data.data : []);
      if (pRes.status === 'fulfilled' && pRes.value.data?.stats) setSystemStats(pRes.value.data.stats);
      if (pRes.status === 'fulfilled' && pRes.value.data?.api_calls) setApiCallsData(pRes.value.data.api_calls);
      if (pRes.status === 'rejected' && aRes.status === 'rejected') setError('Failed to load admin data.');
    } catch { setError('Failed to load admin data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApproveKYC = async (id: string) => {
    setApproving(id);
    try {
      const res = await participantsAPI.approve(id);
      if (res.data?.success) { toast.success('KYC approved'); loadData(); }
      else toast.error(res.data?.error || 'Failed to approve KYC');
    } catch { toast.error('Failed to approve KYC'); }
    setApproving(null);
  };

  const filteredParticipants = participantData.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Admin page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Admin</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Platform administration & participant management</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh admin data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Admin sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'Participants' && <FiUsers className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab === 'System Stats' && <FiActivity className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab === 'Audit Log' && <FiShield className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>) : activeTab === 'Participants' && (
        <>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-fit ${c('bg-white/[0.04] border-white/[0.06]', 'bg-white border-black/[0.06]')}`} style={{ animation: 'cardFadeUp 500ms ease 150ms both' }}>
            <FiSearch className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participants..." aria-label="Search participants"
              className={`bg-transparent text-sm outline-none ${c('text-white placeholder-slate-500', 'text-slate-800 placeholder-slate-400')}`} />
          </div>
          <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 font-medium">Email</th>
                  <th className="text-left py-3.5 px-4 font-medium">Role</th>
                  <th className="text-left py-3.5 px-4 font-medium">KYC</th>
                  <th className="text-left py-3.5 px-4 font-medium">Status</th>
                  <th className="text-center py-3.5 px-5 font-medium">Actions</th>
                </tr></thead>
                <tbody>{filteredParticipants.map(p => (
                  <tr key={p.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{p.email}</td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c('bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-600')}`}>{p.role}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.kyc === 'Verified' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.kyc}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.status}</span></td>
                    <td className="py-3.5 px-5 text-center">
                      {p.kyc === 'Pending' && (
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => handleApproveKYC(p.id)} disabled={approving === p.id} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50" aria-label={`Approve KYC for ${p.name}`}>{approving === p.id ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}</button>
                          <button className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" aria-label={`Reject KYC for ${p.name}`}><FiX className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'System Stats' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            {systemStats.map((s, i) => (
              <div key={s.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mono">{s.value}</p>
              </div>
            ))}
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">API Calls by Hour</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={apiCallsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="calls" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeTab === 'Audit Log' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium">Time</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Action</th>
                <th className="text-left py-3 px-4 font-medium">Target</th>
                <th className="text-right py-3 px-5 font-medium">IP</th>
              </tr></thead>
              <tbody>{auditData.map((log, i) => (
                <tr key={i} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-mono text-xs text-slate-400">{log.time}</td>
                  <td className="py-3 px-4 text-blue-600 dark:text-blue-400 text-xs">{log.user}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.action}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{log.target}</td>
                  <td className="py-3 px-5 text-right text-slate-400 font-mono text-xs">{log.ip}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
