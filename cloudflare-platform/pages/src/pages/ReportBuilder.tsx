import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiDownload, FiCalendar, FiFilter, FiRefreshCw, FiLoader, FiClock, FiTrash2 } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { reportsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface ReportType { id: string; name: string; description: string; icon: string; format: string[]; }
interface ReportEntry { id?: string; name: string; type: string; date: string; status: string; size: string; }
interface VolumeByType { type: string; count: number; }

const REPORT_TYPES: ReportType[] = [
  { id: 'trading', name: 'Trading Summary', description: 'Order history, fills, P&L by period', icon: '📊', format: ['PDF', 'XLSX', 'CSV'] },
  { id: 'carbon', name: 'Carbon Report', description: 'Credits, retirements, offsets, SDG alignment', icon: '🌱', format: ['PDF', 'XLSX'] },
  { id: 'compliance', name: 'Compliance Report', description: 'KYC status, statutory checks, licence expiry', icon: '🛡️', format: ['PDF'] },
  { id: 'settlement', name: 'Settlement Report', description: 'Invoices, payments, escrows, disputes', icon: '💰', format: ['PDF', 'XLSX', 'CSV'] },
  { id: 'tcfd', name: 'TCFD Report', description: 'Climate risk disclosure following TCFD framework', icon: '🌍', format: ['PDF'] },
  { id: 'custom', name: 'Custom Report', description: 'Build a custom report with selected metrics', icon: '⚙️', format: ['PDF', 'XLSX', 'CSV'] },
];

export default function ReportBuilder() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportEntry[]>([]);
  const [volumeByType, setVolumeByType] = useState<VolumeByType[]>([]);
  const [generating, setGenerating] = useState(false);
  // F12: Scheduled reports
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('weekly');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduledReports, setScheduledReports] = useState<Array<{ id: string; type: string; frequency: string; email: string; next_run: string }>>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsAPI.list();
      const d = res.data?.data;
      if (Array.isArray(d)) setReportData(d);
      if (res.data?.volume_by_type) setVolumeByType(res.data.volume_by_type);
    } catch { setError('Failed to load reports.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSchedule = async () => {
    if (!selectedType) { toast.error('Select a report type first'); return; }
    if (!scheduleEmail) { toast.error('Enter an email address'); return; }
    setSavingSchedule(true);
    try {
      const res = await reportsAPI.schedule({ type: selectedType, frequency: scheduleFreq, email: scheduleEmail });
      if (res.data?.success) {
        toast.success('Report scheduled successfully');
        setShowSchedule(false);
        setScheduledReports(prev => [...prev, { id: res.data?.data?.id || crypto.randomUUID(), type: selectedType, frequency: scheduleFreq, email: scheduleEmail, next_run: res.data?.data?.next_run || 'Pending' }]);
      } else toast.error(res.data?.error || 'Failed to schedule report');
    } catch { toast.error('Failed to schedule report'); }
    setSavingSchedule(false);
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await reportsAPI.deleteSchedule(id);
      setScheduledReports(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule removed');
    } catch { toast.error('Failed to remove schedule'); }
  };

  const handleGenerate = async () => {
    if (!selectedType) { toast.error('Select a report type first'); return; }
    setGenerating(true);
    try {
      const res = await reportsAPI.create({ type: selectedType });
      if (res.data?.success) { toast.success('Report generation started'); loadData(); }
      else toast.error(res.data?.error || 'Failed to generate report');
    } catch { toast.error('Failed to generate report'); }
    setGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Report Builder page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Report Builder</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Generate, schedule & download platform reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSchedule(!showSchedule)} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${showSchedule ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600'}`} aria-label="Schedule reports">
            <FiClock className="w-4 h-4" /> Schedule
          </button>
          <button onClick={handleGenerate} disabled={generating || !selectedType} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2 disabled:opacity-50" aria-label="Generate report">
            {generating ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiFileText className="w-4 h-4" />} Generate
          </button>
          <button onClick={loadData} className="p-2.5 rounded-xl bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/[0.1] transition-colors" aria-label="Refresh reports">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (<div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>) : (<>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {REPORT_TYPES.map((rt, i) => (
          <button key={rt.id} onClick={() => setSelectedType(rt.id)}
            className={`cp-card !p-5 text-left transition-all ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${selectedType === rt.id ? 'ring-2 ring-blue-500/40' : ''}`}
            style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className="text-2xl mb-3">{rt.icon}</div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{rt.name}</h3>
            <p className="text-xs text-slate-400 mb-3">{rt.description}</p>
            <div className="flex gap-1.5">
              {rt.format.map(f => (
                <span key={f} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>{f}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports by Type */}
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Reports Generated</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeByType}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="type" tick={{ fontSize: 9, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Reports */}
        <div className={`lg:col-span-2 cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <div className={`px-5 py-3.5 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Recent Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium">Report</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-right py-3 px-4 font-medium">Size</th>
                <th className="text-right py-3 px-4 font-medium">Date</th>
                <th className="text-center py-3 px-5 font-medium">Action</th>
              </tr></thead>
              <tbody>{reportData.map(r => (
                <tr key={r.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c('bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-600')}`}>{r.type}</span></td>
                  <td className="py-3 px-4 text-right text-slate-500 mono text-xs">{r.size}</td>
                  <td className="py-3 px-4 text-right text-slate-400 text-xs">{r.date}</td>
                  <td className="py-3 px-5 text-center">
                    <button onClick={() => { toast.success('Downloading report...'); }} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" aria-label={`Download ${r.name}`}><FiDownload className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      {/* F12: Schedule Panel */}
      {showSchedule && (
        <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 300ms ease both' }}>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><FiClock className="w-5 h-5 text-blue-500" /> Schedule Report</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="sched-type" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Report Type</label>
              <select id="sched-type" value={selectedType || ''} onChange={e => setSelectedType(e.target.value)} aria-label="Report type"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-800')}`}>
                <option value="">Select type...</option>
                {REPORT_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sched-freq" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Frequency</label>
              <select id="sched-freq" value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)} aria-label="Schedule frequency"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-800')}`}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label htmlFor="sched-email" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Deliver to email</label>
              <input id="sched-email" type="email" value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)} placeholder="you@company.co.za" aria-label="Delivery email"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${c('bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500', 'bg-slate-50 border-black/[0.06] text-slate-800 placeholder-slate-400')}`} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSchedule} disabled={savingSchedule || !selectedType || !scheduleEmail}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2">
                {savingSchedule ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiClock className="w-4 h-4" />} Save Schedule
              </button>
              <button onClick={() => setShowSchedule(false)} className={`px-4 py-2.5 rounded-2xl text-sm font-medium ${c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Reports List */}
      {scheduledReports.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 300ms ease both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><FiClock className="w-4 h-4 text-amber-500" /> Scheduled Reports ({scheduledReports.length})</h3>
          <div className="space-y-2">
            {scheduledReports.map(s => (
              <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl ${c('bg-white/[0.02]', 'bg-slate-50')}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{REPORT_TYPES.find(rt => rt.id === s.type)?.name || s.type}</p>
                  <p className="text-xs text-slate-400">{s.frequency} &middot; {s.email} &middot; Next: {s.next_run}</p>
                </div>
                <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" aria-label={`Delete schedule ${s.type}`}><FiTrash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}
    </motion.div>
  );
}
