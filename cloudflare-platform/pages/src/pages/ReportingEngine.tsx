import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiBarChart2, FiDownload, FiRefreshCw, FiClock, FiPlus, FiCalendar } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { reportsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  format: string;
  created_at: string;
  generated_at?: string;
}

const TABS = ['Reports', 'KPI Builder', 'Scheduled', 'Export'] as const;

const REPORT_TYPES = [
  { id: 'trading_summary', name: 'Trading Summary', description: 'Daily/weekly/monthly trade volumes, values, and P&L' },
  { id: 'settlement_report', name: 'Settlement Report', description: 'Netting results, payment schedules, outstanding invoices' },
  { id: 'carbon_portfolio', name: 'Carbon Portfolio', description: 'Credit inventory, vintage breakdown, SDG impact metrics' },
  { id: 'compliance_audit', name: 'Compliance Audit', description: 'KYC status, AML flags, statutory check results' },
  { id: 'risk_assessment', name: 'Risk Assessment', description: 'VaR, exposure analysis, counterparty risk metrics' },
  { id: 'project_performance', name: 'Project Performance', description: 'Generation data, capacity factors, revenue actuals vs forecast' },
  { id: 'financial_overview', name: 'Financial Overview', description: 'Revenue, costs, margins, escrow balances, fee collection' },
  { id: 'regulatory_submission', name: 'Regulatory Submission', description: 'NERSA filing data, licence compliance, grid statistics' },
];

const KPI_TEMPLATES = [
  { name: 'Platform Revenue', formula: 'SUM(trades.total_cents) * fee_rate', unit: 'ZAR', category: 'Financial' },
  { name: 'Trade Volume', formula: 'SUM(trades.volume)', unit: 'MWh', category: 'Trading' },
  { name: 'Active Users', formula: 'COUNT(DISTINCT participants WHERE last_login > 30d)', unit: 'Users', category: 'Engagement' },
  { name: 'Carbon Credits Retired', formula: "SUM(carbon_credits WHERE status='retired')", unit: 'tCO2e', category: 'Carbon' },
  { name: 'Avg Settlement Time', formula: 'AVG(settlement.completed_at - settlement.created_at)', unit: 'Hours', category: 'Operations' },
  { name: 'KYC Completion Rate', formula: "COUNT(kyc='verified') / COUNT(participants)", unit: '%', category: 'Compliance' },
];

export default function ReportingEngine() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Reports');
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('trading_summary');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await reportsAPI.list();
      if (Array.isArray(res.data?.data)) setReports(res.data.data);
      else if (Array.isArray(res.data)) setReports(res.data);
    } catch { setError('Failed to load reports.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const rt = REPORT_TYPES.find(r => r.id === selectedType);
      const res = await reportsAPI.create({ report_type: selectedType, title: rt?.name || selectedType, format: 'pdf' });
      if (res.data?.success) { toast.success('Report generated'); setShowGenerate(false); loadData(); }
      else toast.error(res.data?.error || 'Generation failed');
    } catch { toast.error('Report generation failed'); }
    setGenerating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Reporting Engine page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Reporting Engine</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Report builder, KPI dashboards, scheduled delivery &amp; export tools</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGenerate(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Generate report"><FiPlus className="w-4 h-4" /> Generate Report</button>
          <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Reports', value: String(reports.length), icon: <FiFileText className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Generated', value: String(reports.filter(r => r.status === 'generated' || r.status === 'completed').length), icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Pending', value: String(reports.filter(r => r.status === 'pending').length), icon: <FiClock className="w-5 h-5" />, color: 'text-amber-500' },
          { label: 'Report Types', value: String(REPORT_TYPES.length), icon: <FiFileText className="w-5 h-5" />, color: 'text-purple-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1" role="tablist">
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Reports' && (
        <div style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : reports.length === 0 ? <EmptyState title="No reports" description="Generate your first report to get started." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Title</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Format</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Date</th>
              </tr></thead><tbody>{reports.map(r => (
                <tr key={r.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{r.title}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 capitalize">{(r.report_type || '').replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4 text-slate-400 uppercase text-xs">{r.format || 'PDF'}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${r.status === 'generated' || r.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{r.status}</span></td>
                  <td className="py-3 px-4 text-right text-slate-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-ZA') : '\u2014'}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'KPI Builder' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {KPI_TEMPLATES.map((kpi, i) => (
            <div key={kpi.name} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{kpi.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>{kpi.category}</span>
              </div>
              <p className={`text-[11px] font-mono p-2 rounded-lg ${c('bg-white/[0.03] text-slate-400', 'bg-slate-50 text-slate-500')}`}>{kpi.formula}</p>
              <p className="text-[11px] text-slate-400 mt-2">Unit: {kpi.unit}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Scheduled' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {[
            { name: 'Daily Trading Summary', schedule: 'Every day at 18:00 SAST', type: 'trading_summary', recipients: 'All traders', lastRun: '2026-04-08' },
            { name: 'Weekly Compliance Report', schedule: 'Every Monday at 09:00 SAST', type: 'compliance_audit', recipients: 'Compliance team', lastRun: '2026-04-07' },
            { name: 'Monthly Financial Overview', schedule: '1st of each month at 08:00 SAST', type: 'financial_overview', recipients: 'Management', lastRun: '2026-04-01' },
            { name: 'Quarterly Regulatory Filing', schedule: 'Q1/Q2/Q3/Q4 end + 15 days', type: 'regulatory_submission', recipients: 'NERSA submissions', lastRun: '2026-03-31' },
          ].map((sched, i) => (
            <div key={sched.name} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{sched.name}</h3>
                  <div className="flex items-center gap-2 mt-1"><FiCalendar className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-400">{sched.schedule}</p></div>
                  <p className="text-[11px] text-slate-400 mt-1">Recipients: {sched.recipients}</p>
                </div>
                <div className="text-right"><p className="text-[11px] text-slate-400">Last run</p><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{sched.lastRun}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Export' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {[
            { name: 'All Trades', format: 'CSV', endpoint: '/trading/trades', icon: <FiDownload className="w-6 h-6 text-blue-500" /> },
            { name: 'Contracts', format: 'CSV', endpoint: '/contracts', icon: <FiDownload className="w-6 h-6 text-emerald-500" /> },
            { name: 'Carbon Credits', format: 'CSV', endpoint: '/carbon/credits', icon: <FiDownload className="w-6 h-6 text-purple-500" /> },
            { name: 'Participants', format: 'CSV', endpoint: '/admin/participants', icon: <FiDownload className="w-6 h-6 text-amber-500" /> },
            { name: 'Settlements', format: 'CSV', endpoint: '/settlement/settlements', icon: <FiDownload className="w-6 h-6 text-red-500" /> },
            { name: 'Audit Log', format: 'CSV', endpoint: '/admin/audit-log', icon: <FiDownload className="w-6 h-6 text-slate-500" /> },
            { name: 'Orders', format: 'CSV', endpoint: '/trading/orderbook', icon: <FiDownload className="w-6 h-6 text-cyan-500" /> },
            { name: 'Notifications', format: 'JSON', endpoint: '/notifications', icon: <FiDownload className="w-6 h-6 text-pink-500" /> },
          ].map((exp, i) => (
            <button key={exp.name} className={`cp-card !p-5 text-left hover:scale-[1.02] transition-all ${c('!bg-[#151F32] !border-white/[0.06] hover:!border-blue-500/30', 'hover:!border-blue-500/30')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 60}ms both` }}
              onClick={() => toast.success(`${exp.name} export started`)}>
              <div className="mb-3">{exp.icon}</div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{exp.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{exp.format} &middot; {exp.endpoint}</p>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Report">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Report Type</label>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`}>
              {REPORT_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select></div>
          <p className="text-xs text-slate-400">{REPORT_TYPES.find(r => r.id === selectedType)?.description}</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleGenerate} loading={generating}>Generate</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
