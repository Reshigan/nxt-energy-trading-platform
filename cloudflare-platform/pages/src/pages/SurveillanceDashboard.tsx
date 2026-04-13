import React, { useState, useEffect, useCallback } from 'react';
import { FiShield, FiRefreshCw, FiSearch, FiAlertTriangle, FiEye } from '../lib/fi-icons-shim';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { surveillanceEnhancedAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';

interface AlertItem { id: string; rule_type: string; severity: string; participant_id: string; company_name?: string; description: string; evidence: string; status: string; created_at: string; }
interface Stats { total_alerts: number; open_alerts: number; by_rule: Record<string, number>; by_severity: Record<string, number>; }

const RULE_LABELS: Record<string, string> = {
  wash_trading: 'Wash Trading', spoofing: 'Spoofing', front_running: 'Front Running',
  price_manipulation: 'Price Manipulation', concentration: 'Concentration', layering: 'Layering', marking_close: 'Marking Close',
};
const SEV_COLORS: Record<string, string> = { critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#10B981' };
const SEV_BG: Record<string, string> = { critical: 'bg-red-500/10 text-red-500', high: 'bg-amber-500/10 text-amber-500', medium: 'bg-blue-500/10 text-blue-500', low: 'bg-emerald-500/10 text-emerald-500' };

export default function SurveillanceDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        surveillanceEnhancedAPI.getAlerts(filter ? { rule_type: filter } : undefined),
        surveillanceEnhancedAPI.getStats(),
      ]);
      setAlerts(alertsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } catch { setError('Failed to load surveillance data.'); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await surveillanceEnhancedAPI.scan();
      const d = res.data?.data;
      toast.success(`Scan complete: ${d?.alerts_generated || 0} alerts generated`);
      loadData();
    } catch { toast.error('Scan failed'); }
    setScanning(false);
  };

  const handleInvestigate = async (id: string) => {
    try {
      await surveillanceEnhancedAPI.investigate(id);
      toast.success('Alert marked as investigating');
      loadData();
    } catch { toast.error('Failed to investigate'); }
  };

  const handleResolve = async (id: string) => {
    try {
      await surveillanceEnhancedAPI.resolve(id, { resolution_notes: 'Reviewed and resolved' });
      toast.success('Alert resolved');
      loadData();
    } catch { toast.error('Failed to resolve'); }
  };

  const ruleChartData = stats?.by_rule ? Object.entries(stats.by_rule).map(([rule, count]) => ({ rule: RULE_LABELS[rule] || rule, count })) : [];
  const sevChartData = stats?.by_severity ? Object.entries(stats.by_severity).map(([sev, count]) => ({ name: sev, value: count })) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Market Surveillance</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">7-rule detection engine for market manipulation</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
            <option value="">All Rules</option>
            {Object.entries(RULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button variant="primary" onClick={handleScan} disabled={scanning}>{scanning ? 'Scanning...' : 'Run Scan'}</Button>
          <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Stats KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiShield className="w-4 h-4 text-blue-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white mono">{stats.total_alerts}</p>
            <p className="text-[11px] text-slate-400">Total Alerts</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiAlertTriangle className="w-4 h-4 text-red-500 mb-1" />
            <p className="text-xl font-bold text-red-500 mono">{stats.open_alerts}</p>
            <p className="text-[11px] text-slate-400">Open Alerts</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-amber-500 mono">{Object.keys(stats.by_rule).length}</p>
            <p className="text-[11px] text-slate-400">Rules Triggered</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-purple-500 mono">{stats.by_severity?.critical || 0}</p>
            <p className="text-[11px] text-slate-400">Critical Alerts</p>
          </div>
        </div>
      )}

      {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : (<>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by rule */}
        {ruleChartData.length > 0 && (
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Alerts by Rule</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ruleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="rule" tick={{ fontSize: 9, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} angle={-20} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alerts by severity */}
        {sevChartData.length > 0 && (
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Alerts by Severity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sevChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {sevChartData.map((entry) => <Cell key={entry.name} fill={SEV_COLORS[entry.name] || '#64748b'} />)}
                </Pie>
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {sevChartData.map(e => (
                <div key={e.name} className="flex items-center gap-1 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SEV_COLORS[e.name] }} />
                  <span className="text-slate-400 capitalize">{e.name}: {e.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerts table */}
      {alerts.length === 0 ? <EmptyState title="No surveillance alerts" description="Run a scan to detect market manipulation patterns." /> : (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Alerts ({alerts.length})</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Rule</th>
              <th className="text-center py-2 font-medium">Severity</th>
              <th className="text-left py-2 font-medium">Participant</th>
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-center py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Actions</th>
            </tr></thead>
            <tbody>{alerts.map(a => (
              <tr key={a.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200">{RULE_LABELS[a.rule_type] || a.rule_type}</td>
                <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEV_BG[a.severity] || 'bg-slate-500/10 text-slate-500'}`}>{a.severity}</span></td>
                <td className="py-2.5 text-slate-500 text-xs">{a.company_name || a.participant_id?.substring(0, 8) || 'N/A'}</td>
                <td className="py-2.5 text-slate-500 text-xs max-w-[200px] truncate">{a.description}</td>
                <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.status === 'open' ? 'bg-red-500/10 text-red-500' : a.status === 'investigating' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{a.status}</span></td>
                <td className="py-2.5 text-right space-x-1">
                  {a.status === 'open' && <button onClick={() => handleInvestigate(a.id)} className="text-[10px] text-blue-500 hover:underline"><FiEye className="w-3 h-3 inline" /> Investigate</button>}
                  {(a.status === 'open' || a.status === 'investigating') && <button onClick={() => handleResolve(a.id)} className="text-[10px] text-emerald-500 hover:underline ml-2">Resolve</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      </>)}
    </motion.div>
  );
}
