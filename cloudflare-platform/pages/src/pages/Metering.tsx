import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { meteringAPI, projectsAPI } from '../lib/api';
import { useThemeClasses } from '../hooks/useThemeClasses';

const COLORS = ['#d4e157', '#66bb6a', '#42a5f5', '#ef5350', '#ab47bc'];

interface MeterReading {
  id: string; meter_id: string; meter_type: string; timestamp: string; value_kwh: number; source: string; quality: string;
}

interface MeterSummary {
  meter_type: string; reading_count: number; total_kwh: number; avg_kwh: number; first_reading: string; last_reading: string;
}

export default function Metering() {
  const tc = useThemeClasses();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [summary, setSummary] = useState<{ by_meter_type: MeterSummary[]; total_generated_mwh: number; contracted_annual_mwh: number; performance_ratio: number } | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; technology: string; capacity_mw: number }>>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    projectsAPI.list().then((r) => {
      const p = r.data?.data?.results || r.data?.data || [];
      setProjects(p);
      if (p.length > 0) setSelectedProject(p[0].id);
    }).catch(() => {
      // Demo projects
      const demo = [
        { id: 'proj1', name: 'Sunfields 50MW Solar', technology: 'solar', capacity_mw: 50 },
        { id: 'proj2', name: 'Cape Wind Farm', technology: 'wind', capacity_mw: 100 },
      ];
      setProjects(demo);
      setSelectedProject(demo[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    Promise.all([
      meteringAPI.getReadings({ project_id: selectedProject, limit: '96' }).catch(() => ({ data: { data: [] } })),
      meteringAPI.getSummary(selectedProject).catch(() => ({
        data: { data: { by_meter_type: demoSummary(), total_generated_mwh: 12450.5, contracted_annual_mwh: 109500, performance_ratio: 11.37 } },
      })),
    ]).then(([readingsRes, summaryRes]) => {
      const r = readingsRes.data?.data || [];
      setReadings(r.length > 0 ? r : demoReadings());
      setSummary(summaryRes.data?.data || null);
    });
  }, [selectedProject]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-[#d4e157] border-t-transparent rounded-full" /></div>;

  // Chart data: 15-min interval readings
  const chartData = readings.slice(0, 96).reverse().map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
    value: r.value_kwh,
    type: r.meter_type,
  }));

  // Summary bar chart
  const summaryChart = (summary?.by_meter_type || []).map((s) => ({
    type: s.meter_type.replace(/_/g, ' '),
    total: Math.round(s.total_kwh / 1000), // MWh
    readings: s.reading_count,
  }));

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Metering & IoT</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time 15-min interval data from connected meters</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm bg-white">
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-2xl font-semibold text-sm hover:bg-[#c0ca33] transition-colors">Upload Reading</button>
          <button onClick={() => setShowAlertModal(true)} className="px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-2xl text-sm">Configure Alerts</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Generated', value: `${summary?.total_generated_mwh?.toLocaleString() || '0'} MWh`, color: '#d4e157' },
          { label: 'Contracted Annual', value: `${summary?.contracted_annual_mwh?.toLocaleString() || '0'} MWh`, color: '#42a5f5' },
          { label: 'Performance Ratio', value: `${summary?.performance_ratio || 0}%`, color: summary && summary.performance_ratio > 10 ? '#66bb6a' : '#ef5350' },
          { label: 'Capacity', value: `${currentProject?.capacity_mw || 0} MW ${currentProject?.technology || ''}`, color: '#ab47bc' },
        ].map((m) => (
          <div key={m.label} className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-4 border border-slate-200 dark:border-white/[0.06]`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time 15-min Chart */}
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06] lg:col-span-2`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Real-Time Generation (15-min intervals)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={11} />
              <YAxis tickFormatter={(v: number) => `${v} kWh`} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#d4e157" fill="#d4e15730" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Metered vs Contracted */}
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Generation by Meter Type (MWh)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summaryChart}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {summaryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meter Status Table */}
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Meter Status</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                <th className="text-left py-2 text-slate-500 dark:text-slate-400">Meter</th>
                <th className="text-left py-2 text-slate-500 dark:text-slate-400">Type</th>
                <th className="text-right py-2 text-slate-500 dark:text-slate-400">Readings</th>
                <th className="text-left py-2 pl-3 text-slate-500 dark:text-slate-400">Quality</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.by_meter_type || []).map((m, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-white/[0.04]">
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-100">MTR-{String(i + 1).padStart(3, '0')}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-400">{m.meter_type.replace(/_/g, ' ')}</td>
                  <td className="py-2 text-right font-mono">{m.reading_count.toLocaleString()}</td>
                  <td className="py-2 pl-3"><span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">actual</span></td>
                </tr>
              ))}
              {(summary?.by_meter_type || []).length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-400 dark:text-slate-500">No meter data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-md`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Upload Meter Reading</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Source</label>
                <select className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm">
                  <option>Eskom AMI</option><option>SolarEdge</option><option>Fronius</option><option>SMA</option><option>Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">CSV File</label>
                <input type="file" accept=".csv" className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" />
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Format: meter_id, meter_type, timestamp, value_kwh</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Config Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-md`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Configure Meter Alerts</h3>
            <div className="space-y-3">
              {['Generation below threshold', 'No data for 30 minutes', 'Quality downgrade to estimated', 'Contracted volume shortfall'].map((alert) => (
                <label key={alert} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#d4e157]" />
                  <span className="text-sm text-slate-900 dark:text-slate-100">{alert}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAlertModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Cancel</button>
              <button onClick={() => setShowAlertModal(false)} className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Demo data generators
function demoReadings(): MeterReading[] {
  const now = Date.now();
  return Array.from({ length: 96 }, (_, i) => ({
    id: `r${i}`,
    meter_id: 'MTR-001',
    meter_type: 'solar_gen',
    timestamp: new Date(now - (95 - i) * 15 * 60 * 1000).toISOString(),
    value_kwh: Math.max(0, Math.sin((i - 24) * Math.PI / 48) * 450 + Math.random() * 50),
    source: 'solaredge',
    quality: 'actual',
  }));
}

function demoSummary(): MeterSummary[] {
  return [
    { meter_type: 'solar_gen', reading_count: 2880, total_kwh: 1245000, avg_kwh: 432, first_reading: '2024-01-01', last_reading: '2024-01-31' },
    { meter_type: 'grid_export', reading_count: 2880, total_kwh: 980000, avg_kwh: 340, first_reading: '2024-01-01', last_reading: '2024-01-31' },
    { meter_type: 'consumption', reading_count: 2880, total_kwh: 265000, avg_kwh: 92, first_reading: '2024-01-01', last_reading: '2024-01-31' },
  ];
}
