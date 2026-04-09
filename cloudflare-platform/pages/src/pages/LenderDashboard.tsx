import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiRefreshCw, FiShield, FiBarChart2 } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { lenderAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface LenderData {
  total_facilities: number;
  total_disbursed_cents: number;
  total_disbursements: number;
  pending_disbursements: number;
  projects: Array<Record<string, unknown>>;
  portfolio_health: string;
  average_dscr: number;
  weighted_avg_tenor: number;
}

interface Disbursement {
  id: string;
  project_id: string;
  project_name: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

interface Covenant {
  project_id: string;
  project_name: string;
  dscr: { target: number; actual: number; status: string };
  llcr: { target: number; actual: number; status: string };
  debt_equity: { target: number; actual: number; status: string };
  insurance: { required: boolean; current: boolean; expiry: string };
}

const TABS = ['Overview', 'Disbursements', 'Covenants'] as const;

export default function LenderDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LenderData | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [covenants, setCovenants] = useState<Covenant[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashRes, disbRes, covRes] = await Promise.allSettled([
        lenderAPI.getDashboard(), lenderAPI.getDisbursements(), lenderAPI.getCovenants(),
      ]);
      if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) setData(dashRes.value.data.data);
      if (disbRes.status === 'fulfilled' && Array.isArray(disbRes.value.data?.data)) setDisbursements(disbRes.value.data.data);
      if (covRes.status === 'fulfilled' && Array.isArray(covRes.value.data?.data)) setCovenants(covRes.value.data.data);
    } catch { setError('Failed to load lender data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    try {
      const res = await lenderAPI.approveDisbursement(id);
      if (res.data?.success) { toast.success('Disbursement approved'); loadData(); }
      else toast.error('Approval failed');
    } catch { toast.error('Approval failed'); }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await lenderAPI.rejectDisbursement(id, { reason: 'Insufficient documentation' });
      if (res.data?.success) { toast.success('Disbursement rejected'); loadData(); }
      else toast.error('Rejection failed');
    } catch { toast.error('Rejection failed'); }
  };

  const healthColor = (health: string) => {
    if (health === 'green') return 'text-emerald-500';
    if (health === 'amber') return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Lender Dashboard page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Lender Dashboard</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Project finance portfolio, disbursements &amp; covenant monitoring</p>
        </div>
        <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Facilities', value: String(data?.total_facilities || 0), icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Total Disbursed', value: formatZAR((data?.total_disbursed_cents || 0) / 100), icon: <FiDollarSign className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Pending', value: String(data?.pending_disbursements || 0), icon: <FiAlertTriangle className="w-5 h-5" />, color: 'text-amber-500' },
          { label: 'Avg DSCR', value: String(data?.average_dscr?.toFixed(2) || '1.45'), icon: <FiTrendingUp className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Portfolio Health', value: data?.portfolio_health || 'green', icon: <FiShield className="w-5 h-5" />, color: healthColor(data?.portfolio_health || 'green') },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1" role="tablist" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />) : data?.projects?.length ? data.projects.map((p, i) => (
            <div key={String(p.id)} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${300 + i * 60}ms both` }}>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{String(p.name)}</h3>
              <p className="text-xs text-slate-400 mt-1">{String(p.technology)} &middot; {String(p.capacity_mw)} MW &middot; {String(p.phase)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Phase</span><p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{String(p.phase)}</p></div>
                <div><span className="text-slate-400">Created</span><p className="font-semibold text-slate-700 dark:text-slate-300">{p.created_at ? new Date(String(p.created_at)).toLocaleDateString('en-ZA') : '\u2014'}</p></div>
              </div>
            </div>
          )) : <EmptyState title="No projects" description="No project finance facilities found." />}
        </div>
      )}

      {activeTab === 'Disbursements' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : disbursements.length === 0 ? <div className="p-6"><EmptyState title="No disbursements" description="No disbursement records found." /></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Project</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Date</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Actions</th>
            </tr></thead><tbody>{disbursements.map(d => (
              <tr key={d.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{d.project_name || d.project_id}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatZAR((d.amount_cents || 0) / 100)}</td>
                <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${d.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : d.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{d.status}</span></td>
                <td className="py-3 px-4 text-right text-slate-400 text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString('en-ZA') : '\u2014'}</td>
                <td className="py-3 px-4 text-center">{d.status === 'pending' && (
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => handleApprove(d.id)} className="text-xs text-emerald-500 hover:text-emerald-600 font-medium">Approve</button>
                    <button onClick={() => handleReject(d.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Reject</button>
                  </div>
                )}</td>
              </tr>
            ))}</tbody></table></div>
          )}
        </div>
      )}

      {activeTab === 'Covenants' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />) : covenants.length === 0 ? <EmptyState title="No covenants" description="No covenant data available." /> : covenants.map((cov, i) => (
            <div key={cov.project_id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">{cov.project_name}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div><span className="text-slate-400">DSCR</span><p className="font-bold text-lg text-slate-700 dark:text-slate-300">{cov.dscr.actual.toFixed(2)}<span className="text-slate-400 text-[10px] ml-1">/ {cov.dscr.target}</span></p></div>
                <div><span className="text-slate-400">LLCR</span><p className="font-bold text-lg text-slate-700 dark:text-slate-300">{cov.llcr.actual.toFixed(2)}<span className="text-slate-400 text-[10px] ml-1">/ {cov.llcr.target}</span></p></div>
                <div><span className="text-slate-400">D/E Ratio</span><p className="font-bold text-lg text-slate-700 dark:text-slate-300">{cov.debt_equity.actual}%<span className="text-slate-400 text-[10px] ml-1">/ {cov.debt_equity.target}%</span></p></div>
                <div><span className="text-slate-400">Insurance</span><p className={`font-semibold ${cov.insurance.current ? 'text-emerald-500' : 'text-red-500'}`}>{cov.insurance.current ? 'Current' : 'Expired'}</p></div>
                <div><span className="text-slate-400">Status</span><p className="font-semibold text-emerald-500 capitalize">{cov.dscr.status}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
