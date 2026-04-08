import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiRefreshCw, FiFilter, FiDownload, FiUser, FiClock } from '../lib/fi-icons-shim';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { adminAPI } from '../lib/api';
import { formatDate } from '../lib/format';
import { DataTable, Button, Select, Tabs } from '../components/ui';
import type { Column } from '../components/ui';

interface AuditEvent {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  timestamp: string;
  severity: string;
  [key: string]: unknown;
}

const SEVERITY_TABS = [
  { key: 'all', label: 'All Events' },
  { key: 'info', label: 'Info' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' },
];

export default function AuditTrail() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [severity, setSeverity] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, string> = {};
      if (severity !== 'all') params.severity = severity;
      if (actionFilter !== 'all') params.action = actionFilter;
      const res = await adminAPI.getAuditLog(params);
      setEvents(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load audit trail'); }
    setLoading(false);
  }, [severity, actionFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = () => {
    const csv = ['Timestamp,Actor,Action,Resource,Details,IP,Severity']
      .concat(events.map(e => `${e.timestamp},${e.actor_email},${e.action},${e.resource_type}:${e.resource_id},"${e.details}",${e.ip_address},${e.severity}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Audit trail exported');
  };

  const severityBadge = (s: string) => {
    const map: Record<string, string> = {
      info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
      warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      critical: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    };
    return map[s] || 'bg-slate-100 dark:bg-white/[0.04] text-slate-500';
  };

  const columns: Column<AuditEvent>[] = [
    { key: 'timestamp', header: 'Time', sortable: true, render: (r) => (
      <div className="flex items-center gap-1.5 text-xs">
        <FiClock className="w-3 h-3 text-slate-400" />
        <span>{r.timestamp ? formatDate(r.timestamp) : 'N/A'}</span>
      </div>
    )},
    { key: 'actor_email', header: 'Actor', sortable: true, render: (r) => (
      <div className="flex items-center gap-1.5">
        <FiUser className="w-3 h-3 text-slate-400" />
        <span className="text-xs">{r.actor_email || 'System'}</span>
      </div>
    )},
    { key: 'action', header: 'Action', sortable: true, render: (r) => <span className="font-medium capitalize text-sm">{r.action?.replace(/_/g, ' ')}</span> },
    { key: 'resource_type', header: 'Resource', sortable: true, render: (r) => (
      <span className="text-xs">
        <span className="capitalize">{r.resource_type}</span>
        {r.resource_id && <span className="text-slate-400 ml-1 mono">#{r.resource_id.slice(0, 8)}</span>}
      </span>
    )},
    { key: 'details', header: 'Details', render: (r) => <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] block">{r.details || 'N/A'}</span> },
    { key: 'ip_address', header: 'IP', render: (r) => <span className="mono text-xs">{r.ip_address || 'N/A'}</span> },
    { key: 'severity', header: 'Severity', sortable: true, render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${severityBadge(r.severity)}`}>{r.severity}</span> },
  ];

  const filtered = severity === 'all' ? events : events.filter(e => e.severity === severity);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Audit trail">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Audit Trail</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Complete log of all platform actions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button variant="ghost" onClick={handleExport} icon={<FiDownload className="w-4 h-4" />} disabled={events.length === 0}>Export CSV</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs tabs={SEVERITY_TABS} active={severity} onChange={setSeverity} variant="pill" />
        <div className="w-48">
          <Select label="" options={[
            { value: 'all', label: 'All Actions' },
            { value: 'login', label: 'Login' },
            { value: 'trade', label: 'Trade' },
            { value: 'contract', label: 'Contract' },
            { value: 'kyc', label: 'KYC' },
            { value: 'settings', label: 'Settings' },
            { value: 'admin', label: 'Admin' },
          ]} value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: events.length, color: 'text-blue-500' },
          { label: 'Warnings', value: events.filter(e => e.severity === 'warning').length, color: 'text-amber-500' },
          { label: 'Critical', value: events.filter(e => e.severity === 'critical').length, color: 'text-rose-500' },
          { label: 'Unique Actors', value: new Set(events.map(e => e.actor_email)).size, color: 'text-emerald-500' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`}>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold mono ${kpi.color}`}>{loading ? '...' : kpi.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered as (AuditEvent & Record<string, unknown>)[]}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No audit events"
        emptyDescription="Platform activity will be logged here."
        searchable
        searchPlaceholder="Search events..."
        pageSize={20}
      />
    </motion.div>
  );
}
