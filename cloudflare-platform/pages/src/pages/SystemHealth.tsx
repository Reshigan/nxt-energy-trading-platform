import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiServer, FiDatabase, FiWifi, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiXCircle, FiCpu, FiHardDrive } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { healthAPI } from '../lib/api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface HealthCheck {
  service: string;
  status: string;
  latency_ms: number;
  last_check: string;
  uptime_pct: number;
  details?: string;
}

interface SystemMetrics {
  requests_per_min: number;
  error_rate_pct: number;
  avg_latency_ms: number;
  active_connections: number;
  db_pool_used: number;
  db_pool_total: number;
  memory_used_mb: number;
  memory_total_mb: number;
  cpu_pct: number;
  latency_history: Array<{ time: string; latency: number; errors: number }>;
}

export default function SystemHealth() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([
        healthAPI.getStatus(),
        healthAPI.getMetrics(),
      ]);
      if (healthRes.status === 'fulfilled' && healthRes.value.data?.data) {
        const d = healthRes.value.data.data;
        setChecks(Array.isArray(d.checks) ? d.checks : Array.isArray(d) ? d : []);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value.data?.data) setMetrics(metricsRes.value.data.data);
      if (healthRes.status === 'rejected' && metricsRes.status === 'rejected') setError('Failed to load system health data');
    } catch { setError('Failed to load system health data'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const statusIcon = (s: string) => {
    if (s === 'healthy' || s === 'up') return <FiCheckCircle className="w-5 h-5 text-emerald-500" />;
    if (s === 'degraded' || s === 'slow') return <FiAlertTriangle className="w-5 h-5 text-amber-500" />;
    return <FiXCircle className="w-5 h-5 text-rose-500" />;
  };

  const statusColor = (s: string) => {
    if (s === 'healthy' || s === 'up') return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    if (s === 'degraded' || s === 'slow') return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
    return 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
  };

  const serviceIcon = (service: string) => {
    if (service.includes('database') || service.includes('db') || service.includes('d1')) return FiDatabase;
    if (service.includes('api') || service.includes('worker')) return FiServer;
    if (service.includes('network') || service.includes('cdn')) return FiWifi;
    if (service.includes('cpu')) return FiCpu;
    if (service.includes('storage') || service.includes('r2')) return FiHardDrive;
    return FiActivity;
  };

  const cardCls = `rounded-2xl p-5 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`;

  const overallStatus = checks.every(c => c.status === 'healthy' || c.status === 'up') ? 'healthy' : checks.some(c => c.status === 'down' || c.status === 'error') ? 'critical' : 'degraded';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="System health">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">System Health</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Platform status and performance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded border-slate-300 text-blue-500" />
            Auto-refresh (30s)
          </label>
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh health data">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Overall Status Banner */}
      {!loading && checks.length > 0 && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${statusColor(overallStatus)}`} role="status">
          {statusIcon(overallStatus)}
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">System {overallStatus}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{checks.filter(c => c.status === 'healthy' || c.status === 'up').length}/{checks.length} services operational</p>
          </div>
        </div>
      )}

      {/* Metrics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Requests/min', value: metrics?.requests_per_min?.toLocaleString() || '0', icon: FiActivity, color: 'text-blue-500' },
          { label: 'Error Rate', value: metrics ? `${metrics.error_rate_pct.toFixed(2)}%` : '0%', icon: FiAlertTriangle, color: metrics && metrics.error_rate_pct > 1 ? 'text-rose-500' : 'text-emerald-500' },
          { label: 'Avg Latency', value: metrics ? `${metrics.avg_latency_ms}ms` : '0ms', icon: FiServer, color: metrics && metrics.avg_latency_ms > 200 ? 'text-amber-500' : 'text-emerald-500' },
          { label: 'Connections', value: metrics?.active_connections?.toString() || '0', icon: FiWifi, color: 'text-blue-500' },
        ].map(kpi => (
          <div key={kpi.label} className={cardCls}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} aria-hidden="true" />
              <span className="text-xs text-slate-400">{kpi.label}</span>
            </div>
            {loading ? <Skeleton className="w-20 h-7" /> : <p className={`text-2xl font-bold mono ${kpi.color}`}>{kpi.value}</p>}
          </div>
        ))}
      </div>

      {/* Latency Chart */}
      {metrics?.latency_history && metrics.latency_history.length > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Latency & Error Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.latency_history}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="latency" stroke="#3B82F6" strokeWidth={2} fill="url(#latGrad)" name="Latency (ms)" />
              <Area type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={1.5} fill="none" strokeDasharray="4 4" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Service Health Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Service Status</h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : checks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {checks.map(c => {
              const Icon = serviceIcon(c.service);
              return (
                <div key={c.service} className={`rounded-2xl p-4 border ${statusColor(c.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{c.service.replace(/_/g, ' ')}</span>
                    </div>
                    {statusIcon(c.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Latency: {c.latency_ms}ms</span>
                    <span>Uptime: {c.uptime_pct?.toFixed(2)}%</span>
                  </div>
                  {c.details && <p className="text-xs text-slate-400 mt-1 truncate">{c.details}</p>}
                </div>
              );
            })}
          </div>
        ) : <EmptyState title="No health checks" description="Service health checks will appear once configured." />}
      </div>
    </motion.div>
  );
}
