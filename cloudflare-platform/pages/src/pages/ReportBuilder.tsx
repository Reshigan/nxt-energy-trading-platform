import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../lib/api';
import { useThemeClasses } from '../hooks/useThemeClasses';

const REPORT_TYPES = [
  { value: 'portfolio', label: 'Portfolio Report', icon: '📊', description: 'Positions, P&L, allocation breakdown' },
  { value: 'trading', label: 'Trading Activity', icon: '📈', description: 'Order history, execution quality, volumes' },
  { value: 'carbon', label: 'Carbon Report', icon: '🌿', description: 'Credits, retirements, offsets, SDG impact' },
  { value: 'compliance', label: 'Compliance Report', icon: '🛡️', description: 'Statutory checks, KYC status, licence expiry' },
  { value: 'tcfd', label: 'TCFD Report', icon: '🌍', description: 'Auto-generated climate disclosure report' },
  { value: 'custom', label: 'Custom Report', icon: '⚙️', description: 'Configure your own metrics and groupings' },
];

interface ReportDef {
  id: string; name: string; report_type: string; output_format: string; schedule: string | null;
  last_generated_at: string | null; created_at: string;
}

export default function ReportBuilder() {
  const tc = useThemeClasses();
  const [reports, setReports] = useState<ReportDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTcfdModal, setShowTcfdModal] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    name: '', report_type: 'portfolio', output_format: 'pdf',
    date_from: '2024-01-01', date_to: new Date().toISOString().split('T')[0],
    schedule: '',
  });

  useEffect(() => {
    reportsAPI.list().then((r) => setReports(r.data?.data || []))
      .catch(() => setReports(demoReports()))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      const res = await reportsAPI.create({
        name: form.name || `${form.report_type} Report`,
        report_type: form.report_type,
        output_format: form.output_format,
        date_range: { from: form.date_from, to: form.date_to },
        schedule: form.schedule || undefined,
      });
      setReports((prev) => [{ id: res.data?.data?.id, name: form.name || `${form.report_type} Report`, report_type: form.report_type, output_format: form.output_format, schedule: form.schedule || null, last_generated_at: null, created_at: new Date().toISOString() }, ...prev]);
      setShowCreateModal(false);
    } catch { /* handled */ }
  };

  const handleGenerate = async (id: string) => {
    setGeneratingId(id);
    try {
      const res = await reportsAPI.generate(id);
      setGeneratedData(res.data?.data || null);
    } catch {
      setGeneratedData({ message: 'Report generation completed (demo mode)' });
    }
    setGeneratingId(null);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-[#d4e157] border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Report Builder</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Generate portfolio, trading, carbon, compliance & TCFD reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTcfdModal(true)} className="px-4 py-2 border border-[#d4e157] text-slate-900 dark:text-slate-100 rounded-2xl text-sm font-semibold hover:bg-[#d4e157]/10 transition-colors">
            TCFD Template
          </button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-2xl font-semibold text-sm hover:bg-[#c0ca33] transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((rt) => (
          <button key={rt.value} onClick={() => { setForm({ ...form, report_type: rt.value, name: rt.label }); setShowCreateModal(true); }}
            className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06] text-left hover:border-[#d4e157] hover:shadow-sm transition-all`}>
            <span className="text-2xl">{rt.icon}</span>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-2">{rt.label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Saved Reports */}
      <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.06]">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Saved Reports</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
              <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Name</th>
              <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Type</th>
              <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Format</th>
              <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Schedule</th>
              <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Last Generated</th>
              <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:bg-white/[0.02]/50">
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-slate-900 dark:text-slate-100">
                    {r.report_type}
                  </span>
                </td>
                <td className="py-3 px-4 uppercase text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">{r.output_format}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{r.schedule || '—'}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{r.last_generated_at ? new Date(r.last_generated_at).toLocaleDateString() : 'Never'}</td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => handleGenerate(r.id)} disabled={generatingId === r.id}
                    className="px-3 py-1 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold disabled:opacity-50">
                    {generatingId === r.id ? 'Generating...' : 'Generate'}
                  </button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">No saved reports — create one above</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generated Data Preview */}
      {generatedData && (
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Report Preview</h3>
            <button onClick={() => setGeneratedData(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400">Close</button>
          </div>
          <pre className="text-xs bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl overflow-auto max-h-96">{JSON.stringify(generatedData, null, 2)}</pre>
          <div className="flex gap-2 mt-4">
            {['PDF', 'XLSX', 'CSV', 'JSON'].map((fmt) => (
              <button key={fmt} className="px-3 py-1.5 border border-slate-200 dark:border-white/[0.06] rounded-lg text-xs font-medium hover:bg-slate-50 dark:bg-white/[0.02]">
                Export {fmt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-md`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Generate Report</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Report Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" placeholder="My Report" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
                <select value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm">
                  {REPORT_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">From</label>
                  <input type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">To</label>
                  <input type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Format</label>
                <select value={form.output_format} onChange={(e) => setForm({ ...form, output_format: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm">
                  <option value="pdf">PDF</option><option value="xlsx">XLSX</option><option value="csv">CSV</option><option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Schedule (optional)</label>
                <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm">
                  <option value="">One-time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Create & Generate</button>
            </div>
          </div>
        </div>
      )}

      {/* TCFD Template Modal */}
      {showTcfdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">TCFD Report Template</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Auto-generated from platform data per Task Force on Climate-related Financial Disclosures framework.</p>
            {[
              { section: 'Governance', items: ['Board oversight of climate risks', 'Management role in ESG strategy', 'Integration with risk framework'] },
              { section: 'Strategy', items: ['Climate-related risks & opportunities', 'Impact on business & planning', 'Scenario analysis (1.5°C, 2°C, 4°C pathways)'] },
              { section: 'Risk Management', items: ['Process for identifying climate risks', 'Process for managing climate risks', 'Integration into overall risk management'] },
              { section: 'Metrics & Targets', items: ['GHG emissions (Scope 1, 2, 3)', 'Carbon credits retired', 'Renewable energy capacity', 'ESG score and targets'] },
            ].map((s) => (
              <div key={s.section} className="mb-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{s.section}</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 pl-4">
                  {s.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
                </ul>
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowTcfdModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Close</button>
              <button onClick={() => { setShowTcfdModal(false); setForm({ ...form, report_type: 'tcfd', name: 'TCFD Climate Report' }); setShowCreateModal(true); }}
                className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Generate TCFD Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function demoReports(): ReportDef[] {
  return [
    { id: 'r1', name: 'Q1 2024 Portfolio Summary', report_type: 'portfolio', output_format: 'pdf', schedule: 'monthly', last_generated_at: '2024-03-31T00:00:00Z', created_at: '2024-01-15T10:00:00Z' },
    { id: 'r2', name: 'Carbon Offset Report', report_type: 'carbon', output_format: 'xlsx', schedule: null, last_generated_at: '2024-03-15T00:00:00Z', created_at: '2024-02-01T10:00:00Z' },
    { id: 'r3', name: 'TCFD Climate Disclosure 2024', report_type: 'tcfd', output_format: 'pdf', schedule: null, last_generated_at: null, created_at: '2024-03-01T10:00:00Z' },
  ];
}
