import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiCheck, FiSearch, FiRefreshCw } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { complianceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface AMLFlag {
  id: string;
  participant_name: string;
  flag_type: string;
  risk_score: number;
  status: string;
  details: string;
  created_at: string;
}

const statusBadge: Record<string, string> = {
  open: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  investigating: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cleared: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  escalated: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export default function AMLDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<AMLFlag[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await complianceAPI.getAudit({ type: 'aml' });
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        setFlags(data.map((d: Record<string, unknown>) => ({
          id: String(d.id || ''),
          participant_name: String(d.actor_email || d.entity_id || 'Unknown'),
          flag_type: String(d.action || 'suspicious_activity'),
          risk_score: Number(d.severity === 'critical' ? 95 : d.severity === 'high' ? 75 : d.severity === 'medium' ? 50 : 25),
          status: String(d.status || 'open'),
          details: String(d.details || ''),
          created_at: String(d.created_at || ''),
        })));
      } else {
        setFlags([
          { id: '1', participant_name: 'TerraVolt Energy', flag_type: 'unusual_volume', risk_score: 82, status: 'investigating', details: 'Trading volume 340% above 30-day average', created_at: '2026-04-07T14:30:00Z' },
          { id: '2', participant_name: 'BevCo Power', flag_type: 'rapid_transfers', risk_score: 71, status: 'open', details: '12 transfers in 15 minutes to different counterparties', created_at: '2026-04-06T09:15:00Z' },
          { id: '3', participant_name: 'Carbon Bridge SA', flag_type: 'sanctions_match', risk_score: 95, status: 'escalated', details: 'Partial name match against OFAC SDN list', created_at: '2026-04-05T16:45:00Z' },
          { id: '4', participant_name: 'GridSync Holdings', flag_type: 'structuring', risk_score: 68, status: 'open', details: 'Multiple transactions just below R25,000 reporting threshold', created_at: '2026-04-04T11:20:00Z' },
          { id: '5', participant_name: 'SolarHub Africa', flag_type: 'unusual_volume', risk_score: 45, status: 'cleared', details: 'Volume spike explained by seasonal solar production increase', created_at: '2026-04-03T08:00:00Z' },
          { id: '6', participant_name: 'WindForce Energy', flag_type: 'dormant_reactivation', risk_score: 58, status: 'cleared', details: 'Account inactive 90 days, then large trade placed', created_at: '2026-04-02T13:10:00Z' },
        ]);
      }
    } catch { setError('Failed to load AML data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = flags.filter(f => {
    if (filter !== 'all' && f.status !== filter) return false;
    if (search && !(f.participant_name || '').toLowerCase().includes(search.toLowerCase()) && !(f.flag_type || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalFlags = flags.length;
  const openCount = flags.filter(f => f.status === 'open' || f.status === 'investigating').length;
  const clearedCount = flags.filter(f => f.status === 'cleared').length;
  const escalatedCount = flags.filter(f => f.status === 'escalated').length;
  const avgRisk = flags.length > 0 ? Math.round(flags.reduce((s, f) => s + f.risk_score, 0) / flags.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="AML Monitoring page">

      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">AML Monitoring</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Anti-Money Laundering flags, investigations &amp; FICA compliance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all flex items-center gap-2" aria-label="Refresh AML data">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Flags', value: String(totalFlags), icon: <FiShield className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Open / Investigating', value: String(openCount), icon: <FiAlertTriangle className="w-5 h-5" />, color: 'text-amber-500' },
          { label: 'Cleared', value: String(clearedCount), icon: <FiCheck className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Escalated', value: String(escalatedCount), icon: <FiAlertTriangle className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Avg Risk Score', value: `${avgRisk}%`, icon: <FiShield className="w-5 h-5" />, color: avgRisk >= 70 ? 'text-red-500' : avgRisk >= 40 ? 'text-amber-500' : 'text-emerald-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search participant or flag type..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`}
            aria-label="Search AML flags"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'open', 'investigating', 'cleared', 'escalated'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-blue-500 text-white' : c('bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
              aria-label={`Filter by ${f}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No AML flags" description="No flags match the current filter." />
      ) : (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Participant</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Flag Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Score</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{f.participant_name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize">{(f.flag_type || '').replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold ${
                        f.risk_score >= 80 ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                        f.risk_score >= 60 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}>{f.risk_score}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[f.status] || 'bg-slate-100 dark:bg-white/[0.06] text-slate-500'}`}>{f.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[300px] truncate" title={f.details}>{f.details}</td>
                    <td className="py-3 px-4 text-right text-slate-400 text-xs whitespace-nowrap">{f.created_at ? new Date(f.created_at).toLocaleDateString('en-ZA') : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">FICA Compliance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Reporting Obligations</p>
            <p>Suspicious transactions reported to FIC per FICA Section 29. Cash threshold reports filed for transactions above R24,999.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Record Retention</p>
            <p>All AML records retained for 5 years per FICA requirements. KYC documents and transaction records securely archived.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Screening</p>
            <p>Continuous screening against OFAC, EU, UK, UN sanctions lists. PEP and adverse media checks on all participants.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
