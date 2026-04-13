import React, { useState, useEffect, useCallback } from 'react';
import { FiDatabase, FiRefreshCw, FiArchive } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { retentionAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';

interface Policy { table_name: string; retention_days: number; archive_target: string; description: string; }
interface LogEntry { id: string; table_name: string; records_archived: number; archived_at: string; r2_key: string; }
interface Stats { total_records: number; archived_records: number; tables_count: number; oldest_record: string; }

export default function DataRetention() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [polRes, logRes, statsRes] = await Promise.all([retentionAPI.getPolicies(), retentionAPI.getLog(), retentionAPI.getStats()]);
      setPolicies(polRes.data?.data || []);
      setLog(logRes.data?.data || []);
      setStats(statsRes.data?.data || null);
    } catch { setError('Failed to load retention data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleArchive = async (table: string) => {
    setArchiving(table);
    try {
      const res = await retentionAPI.archive(table);
      toast.success(`Archived ${res.data?.data?.records_archived || 0} records from ${table}`);
      loadData();
    } catch { toast.error(`Failed to archive ${table}`); }
    setArchiving(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Data Retention</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Archival policies, R2 storage, and compliance lifecycle</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Storage stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiDatabase className="w-4 h-4 text-blue-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white mono">{(stats.total_records || 0).toLocaleString()}</p>
            <p className="text-[11px] text-slate-400">Total Records</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiArchive className="w-4 h-4 text-emerald-500 mb-1" />
            <p className="text-xl font-bold text-emerald-500 mono">{(stats.archived_records || 0).toLocaleString()}</p>
            <p className="text-[11px] text-slate-400">Archived Records</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-purple-500 mono">{stats.tables_count || 0}</p>
            <p className="text-[11px] text-slate-400">Monitored Tables</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-amber-500 mono text-sm">{stats.oldest_record ? new Date(stats.oldest_record).toLocaleDateString() : 'N/A'}</p>
            <p className="text-[11px] text-slate-400">Oldest Record</p>
          </div>
        </div>
      )}

      {/* Policies table */}
      {loading ? <Skeleton className="h-48" /> : (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Retention Policies</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Table</th>
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-right py-2 font-medium">Retention</th>
              <th className="text-left py-2 font-medium">Archive To</th>
              <th className="text-right py-2 font-medium">Action</th>
            </tr></thead>
            <tbody>{policies.map(p => (
              <tr key={p.table_name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 mono text-xs">{p.table_name}</td>
                <td className="py-2.5 text-slate-500 text-xs">{p.description}</td>
                <td className="py-2.5 text-right text-slate-500 mono">{p.retention_days >= 365 ? `${Math.round(p.retention_days / 365)}yr` : `${p.retention_days}d`}</td>
                <td className="py-2.5 text-slate-400 text-xs">{p.archive_target}</td>
                <td className="py-2.5 text-right">
                  <Button variant="ghost" onClick={() => handleArchive(p.table_name)} disabled={archiving === p.table_name} className="text-xs">
                    {archiving === p.table_name ? 'Archiving...' : 'Archive Now'}
                  </Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Archive log */}
      {log.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Archive Log</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Table</th>
              <th className="text-right py-2 font-medium">Records</th>
              <th className="text-left py-2 font-medium">R2 Key</th>
              <th className="text-right py-2 font-medium">Date</th>
            </tr></thead>
            <tbody>{log.map(l => (
              <tr key={l.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 mono text-xs">{l.table_name}</td>
                <td className="py-2.5 text-right text-slate-500 mono">{l.records_archived}</td>
                <td className="py-2.5 text-slate-400 text-xs truncate max-w-[200px]">{l.r2_key}</td>
                <td className="py-2.5 text-right text-slate-500 text-xs">{new Date(l.archived_at).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
