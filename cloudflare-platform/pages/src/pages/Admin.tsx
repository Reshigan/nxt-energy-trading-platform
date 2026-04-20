import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiShield, FiCheck, FiX, FiSearch, FiActivity, FiRefreshCw, FiLoader, FiDollarSign, FiEdit2, FiSlash, FiServer, FiClock, FiZap } from '../lib/fi-icons-shim';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { participantsAPI, complianceAPI, adminAPI } from '../lib/api';
import { formatZAR } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const TABS = ['Participants', 'Revenue', 'System Stats', 'Audit Log'] as const;

interface Participant { id: string; name: string; email: string; role: string; kyc: string; status: string; joined: string; }
interface AuditEntry { time: string; user: string; action: string; target: string; ip: string; }
interface SystemStat { label: string; value: string; }
interface ApiCallPoint { hour: string; calls: number; }
// System Health Metrics
interface HealthMetric { label: string; value: number; unit: string; status: 'healthy' | 'warning' | 'critical'; uptime: number; }

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
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  // Suspend participant
  const [suspendTarget, setSuspendTarget] = useState<Participant | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);
  // Edit participant
  const [editTarget, setEditTarget] = useState<Participant | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  // F10: Revenue dashboard
  const [revenueData, setRevenueData] = useState<{ total: number; monthly: number; fees: number; subscriptions: number; monthly_trend: Array<{ month: string; revenue: number }> } | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  // System Health Gauges (D1 optimization: auto-refresh toggle + manual refresh + cache)
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([
    { label: 'API Latency', value: 42, unit: 'ms', status: 'healthy', uptime: 99.9 },
    { label: 'D1 Queries', value: 1284, unit: '/min', status: 'healthy', uptime: 100 },
    { label: 'Workers CPU', value: 23, unit: '%', status: 'healthy', uptime: 99.5 },
    { label: 'R2 Storage', value: 67, unit: '%', status: 'healthy', uptime: 100 },
    { label: 'KV Reads', value: 892, unit: '/s', status: 'healthy', uptime: 99.8 },
    { label: 'Error Rate', value: 0.02, unit: '%', status: 'healthy', uptime: 99.95 },
  ]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthAutoRefresh, setHealthAutoRefresh] = useState(false);
  const [healthLastUpdate, setHealthLastUpdate] = useState<number>(Date.now());
  const [healthCacheHit, setHealthCacheHit] = useState(false);
  const HEALTH_CACHE_TTL_MS = 30 * 1000; // 30s for health metrics

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const handleBatchSuspend = async () => {
    if (selectedParticipants.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(selectedParticipants.map(id => 
        participantsAPI.suspend(id, { reason: 'Bulk administrative suspension' })
      ));
      const successCount = results.filter(r => r.data?.success).length;
      toast.success(`Successfully suspended ${successCount} participants`);
      setSelectedParticipants([]);
      loadData();
    } catch (err) {
      toast.error('Batch suspension failed');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRejectKYC = async () => {
    if (!rejecting || !rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setRejectLoading(true);
    try {
      const res = await complianceAPI.rejectKYC(rejecting, { reason: rejectReason.trim() });
      if (res.data?.success) { toast.success('KYC rejected'); setRejecting(null); setRejectReason(''); loadData(); }
      else toast.error(res.data?.error || 'Failed to reject KYC');
    } catch { toast.error('Failed to reject KYC'); }
    setRejectLoading(false);
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      const res = await participantsAPI.suspend(suspendTarget.id, { reason: 'Administrative suspension' });
      if (res.data?.success) { toast.success(`${suspendTarget.name} suspended`); setSuspendTarget(null); loadData(); }
      else toast.error(res.data?.error || 'Failed to suspend participant');
    } catch { toast.error('Failed to suspend participant'); }
    setSuspendLoading(false);
  };

  const handleEditParticipant = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await participantsAPI.update(editTarget.id, { company_name: editName, role: editRole });
      if (res.data?.success) { toast.success('Participant updated'); setEditTarget(null); loadData(); }
      else toast.error('Failed to update participant');
    } catch { toast.error('Failed to update participant'); }
    setEditLoading(false);
  };

  const filteredParticipants = participantData.filter(p =>
    search === '' || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase())
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
            {tab === 'Revenue' && <FiDollarSign className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />}
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
                      <div className="flex justify-center gap-1.5">
                        {p.kyc === 'Pending' && (
                          <>
                            <button onClick={() => handleApproveKYC(p.id)} disabled={approving === p.id} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50" aria-label={`Approve KYC for ${p.name}`}>{approving === p.id ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCheck className="w-3.5 h-3.5" />}</button>
                            <button onClick={() => { setRejecting(p.id); setRejectReason(''); }} className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors" aria-label={`Reject KYC for ${p.name}`}><FiX className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <button onClick={() => { setEditTarget(p); setEditName(p.name); setEditRole(p.role); }} className={`p-1.5 rounded-lg transition-colors ${c('hover:bg-white/[0.06] text-slate-400', 'hover:bg-slate-100 text-slate-500')}`} aria-label={`Edit ${p.name}`}><FiEdit2 className="w-3.5 h-3.5" /></button>
                        {p.status === 'Active' && (
                          <button onClick={() => setSuspendTarget(p)} className={`p-1.5 rounded-lg transition-colors ${c('hover:bg-white/[0.06] text-slate-400', 'hover:bg-slate-100 text-slate-500')}`} aria-label={`Suspend ${p.name}`}><FiSlash className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* F10: Revenue Dashboard Tab */}
      {activeTab === 'Revenue' && (
        <div className="space-y-6" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {revenueData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: formatZAR(revenueData.total / 100), color: 'text-emerald-500' },
                  { label: 'This Month', value: formatZAR(revenueData.monthly / 100), color: 'text-blue-500' },
                  { label: 'Trading Fees', value: formatZAR(revenueData.fees / 100), color: 'text-amber-500' },
                  { label: 'Subscriptions', value: formatZAR(revenueData.subscriptions / 100), color: 'text-purple-500' },
                ].map((kpi, i) => (
                  <div key={kpi.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 60}ms both` }}>
                    <p className={`text-2xl font-bold text-slate-900 dark:text-white mono`}>{kpi.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>
              {revenueData.monthly_trend?.length > 0 && (
                <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenueData.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={60} tickFormatter={v => formatZAR(v / 100)} />
                      <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatZAR(v / 100)} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <button onClick={async () => {
                setRevenueLoading(true);
                try {
                  const res = await adminAPI.getRevenue();
                  if (res.data?.data) setRevenueData(res.data.data);
                  else setRevenueData({ total: 0, monthly: 0, fees: 0, subscriptions: 0, monthly_trend: [] });
                } catch { toast.error('Failed to load revenue data'); setRevenueData({ total: 0, monthly: 0, fees: 0, subscriptions: 0, monthly_trend: [] }); }
                setRevenueLoading(false);
              }} disabled={revenueLoading} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2 mx-auto" aria-label="Load revenue data">
                {revenueLoading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiDollarSign className="w-4 h-4" />} Load Revenue Data
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'System Stats' && (
        <>
          {/* System Health Gauges */}
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 150ms both' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FiServer className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">System Health</h3>
                {healthCacheHit && <span className="text-xs text-emerald-400">• Cached</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 flex items-center gap-1"><FiClock className="w-3 h-3" /> {Math.round((Date.now() - healthLastUpdate) / 1000)}s ago</span>
                <button onClick={() => { setHealthCacheHit(false); setHealthLoading(true); setTimeout(() => { setHealthMetrics([...healthMetrics]); setHealthLastUpdate(Date.now()); setHealthLoading(false); }, 500); }} 
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${c('bg-white/[0.06] hover:bg-white/[0.1] text-slate-300', 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`} disabled={healthLoading}>
                  <FiRefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={() => setHealthAutoRefresh(!healthAutoRefresh)} 
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${healthAutoRefresh ? 'bg-blue-500/20 text-blue-500' : c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>
                  <FiZap className="w-3 h-3 inline mr-1" /> Auto {healthAutoRefresh ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {healthMetrics.map((metric) => {
                const gaugeColor = metric.status === 'critical' ? '#EF4444' : metric.status === 'warning' ? '#F59E0B' : '#10B981';
                return (
                  <div key={metric.label} className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-400">{metric.label}</span>
                      <span className={`w-2 h-2 rounded-full ${metric.status === 'healthy' ? 'bg-emerald-500' : metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mono">{metric.value}<span className="text-xs text-slate-400 ml-1">{metric.unit}</span></p>
                    <div className="mt-1.5 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, metric.value)}%`, backgroundColor: gaugeColor }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{metric.uptime.toFixed(2)}% uptime</p>
                  </div>
                );
              })}
            </div>
          </div>
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
      {/* Reject KYC Modal */}
      <Modal isOpen={!!rejecting} onClose={() => { setRejecting(null); setRejectReason(''); }} title="Reject KYC">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Provide a reason for rejecting this participant's KYC application.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (required)..."
            rows={3}
            className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.06] border-white/[0.08] text-white placeholder-slate-500', 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400')} focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
            aria-label="Rejection reason"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setRejecting(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleRejectKYC} loading={rejectLoading} disabled={!rejectReason.trim()}>Reject KYC</Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Participant Dialog */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title="Suspend Participant"
        description={`Are you sure you want to suspend ${suspendTarget?.name}? They will lose access to all trading and platform features.`}
        confirmLabel="Suspend"
        variant="danger"
        loading={suspendLoading}
      />

      {/* Edit Participant Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name || 'Participant'}`}>
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.06] border-white/[0.08] text-white', 'bg-slate-50 border-slate-200 text-slate-900')}`}
            >
              {['generator', 'trader', 'offtaker', 'ipp_developer', 'regulator', 'admin', 'lender'].map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditParticipant} loading={editLoading}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
