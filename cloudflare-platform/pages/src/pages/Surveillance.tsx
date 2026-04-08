import React, { useState, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiShield, FiEye, FiRefreshCw, FiSearch, FiActivity } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { surveillanceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface Alert {
  id: string;
  type: string;
  severity: string;
  participant_id: string | null;
  description: string;
  created_at: string;
  status: string;
}

interface RiskData {
  open_orders: number;
  total_exposure_cents: number;
  active_escrows: number;
  escrow_total_cents: number;
  system_var_95: number;
  system_var_99: number;
  concentration_risk: string;
  largest_counterparty_exposure_pct: number;
}

const TABS = ['Alerts', 'Risk Monitor', 'KYC Deep'] as const;
const severityBadge: Record<string, string> = {
  high: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export default function Surveillance() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [kycData, setKycData] = useState<{ participants: Array<Record<string, unknown>>; stats: Record<string, number> }>({ participants: [], stats: {} });
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Alerts');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [alertRes, riskRes, kycRes] = await Promise.allSettled([
        surveillanceAPI.getAlerts(), surveillanceAPI.getRiskMonitor(), surveillanceAPI.getKYCDeep(),
      ]);
      if (alertRes.status === 'fulfilled' && Array.isArray(alertRes.value.data?.data)) setAlerts(alertRes.value.data.data);
      if (riskRes.status === 'fulfilled' && riskRes.value.data?.data) setRisk(riskRes.value.data.data);
      if (kycRes.status === 'fulfilled' && kycRes.value.data?.data) setKycData(kycRes.value.data.data);
    } catch { setError('Failed to load surveillance data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInvestigate = async (id: string) => {
    try {
      const res = await surveillanceAPI.investigateAlert(id);
      if (res.data?.success) { toast.success('Alert marked as investigating'); loadData(); }
    } catch { toast.error('Failed to update alert'); }
  };

  const filteredAlerts = alerts.filter(a => !search || a.description.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Market Surveillance page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Market Surveillance</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Trade monitoring, risk analysis &amp; KYC compliance</p>
        </div>
        <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Active Alerts', value: String(alerts.filter(a => a.status !== 'cleared').length), icon: <FiAlertTriangle className="w-5 h-5" />, color: 'text-red-500' },
          { label: 'Open Orders', value: String(risk?.open_orders || 0), icon: <FiActivity className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'System Exposure', value: formatZAR((risk?.total_exposure_cents || 0) / 100), icon: <FiShield className="w-5 h-5" />, color: 'text-amber-500' },
          { label: 'KYC Verified', value: String(kycData.stats?.verified || 0), icon: <FiEye className="w-5 h-5" />, color: 'text-emerald-500' },
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

      {activeTab === 'Alerts' && (
        <>
          <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`} aria-label="Search alerts" /></div>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div> : filteredAlerts.length === 0 ? <EmptyState title="No alerts" description="No surveillance alerts detected." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Description</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr></thead><tbody>{filteredAlerts.map(a => (
                <tr key={a.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 capitalize">{a.type.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${severityBadge[a.severity] || ''}`}>{a.severity}</span></td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[400px] truncate">{a.description}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${a.status === 'cleared' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : a.status === 'investigating' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{a.status}</span></td>
                  <td className="py-3 px-4 text-center">{a.status === 'open' && <button onClick={() => handleInvestigate(a.id)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">Investigate</button>}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </>
      )}

      {activeTab === 'Risk Monitor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />) : !risk ? <EmptyState title="No risk data" description="Risk monitor data unavailable." /> : (
            <>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Value at Risk</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">VaR (95%)</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(risk.system_var_95 / 100)}</p></div>
                  <div><p className="text-xs text-slate-400">VaR (99%)</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(risk.system_var_99 / 100)}</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Escrow Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Active Escrows</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{risk.active_escrows}</p></div>
                  <div><p className="text-xs text-slate-400">Total Escrowed</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(risk.escrow_total_cents / 100)}</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Concentration Risk</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Risk Level</p><p className={`text-xl font-bold capitalize ${risk.concentration_risk === 'low' ? 'text-emerald-500' : risk.concentration_risk === 'medium' ? 'text-amber-500' : 'text-red-500'}`}>{risk.concentration_risk}</p></div>
                  <div><p className="text-xs text-slate-400">Largest Exposure</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300">{risk.largest_counterparty_exposure_pct}%</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Order Exposure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Open Orders</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{risk.open_orders}</p></div>
                  <div><p className="text-xs text-slate-400">Total Exposure</p><p className="text-xl font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR(risk.total_exposure_cents / 100)}</p></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'KYC Deep' && (
        <div style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total', value: String(kycData.stats?.total || 0), color: 'text-blue-500' },
              { label: 'Verified', value: String(kycData.stats?.verified || 0), color: 'text-emerald-500' },
              { label: 'Pending', value: String(kycData.stats?.pending || 0), color: 'text-amber-500' },
              { label: 'Rejected', value: String(kycData.stats?.rejected || 0), color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className={`cp-card !p-4 text-center ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <p className={`text-2xl font-bold mono ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : kycData.participants.length === 0 ? <EmptyState title="No KYC data" description="No participant KYC records found." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Company</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">KYC Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">BEE Level</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Docs</th>
              </tr></thead><tbody>{kycData.participants.map(p => (
                <tr key={String(p.id)} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{String(p.company_name || '\u2014')}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize">{String(p.role || '')}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${p.kyc_status === 'verified' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : p.kyc_status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{String(p.kyc_status || 'pending')}</span></td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{String(p.bbbee_level || '\u2014')}</td>
                  <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 mono">{String(p.doc_count || 0)}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
