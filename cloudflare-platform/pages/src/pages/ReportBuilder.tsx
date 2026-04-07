import React, { useState } from 'react';
import { FiFileText, FiDownload, FiCalendar, FiFilter } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const reportTypes = [
  { id: 'trading', name: 'Trading Summary', description: 'Order history, fills, P&L by period', icon: '📊', format: ['PDF', 'XLSX', 'CSV'] },
  { id: 'carbon', name: 'Carbon Report', description: 'Credits, retirements, offsets, SDG alignment', icon: '🌱', format: ['PDF', 'XLSX'] },
  { id: 'compliance', name: 'Compliance Report', description: 'KYC status, statutory checks, licence expiry', icon: '🛡️', format: ['PDF'] },
  { id: 'settlement', name: 'Settlement Report', description: 'Invoices, payments, escrows, disputes', icon: '💰', format: ['PDF', 'XLSX', 'CSV'] },
  { id: 'tcfd', name: 'TCFD Report', description: 'Climate risk disclosure following TCFD framework', icon: '🌍', format: ['PDF'] },
  { id: 'custom', name: 'Custom Report', description: 'Build a custom report with selected metrics', icon: '⚙️', format: ['PDF', 'XLSX', 'CSV'] },
];

const recentReports = [
  { name: 'Trading Summary Q1 2024', type: 'Trading', date: '2024-04-01', status: 'Ready', size: '2.4 MB' },
  { name: 'Carbon Report March 2024', type: 'Carbon', date: '2024-03-31', status: 'Ready', size: '1.8 MB' },
  { name: 'TCFD Annual 2023', type: 'TCFD', date: '2024-01-15', status: 'Ready', size: '4.2 MB' },
  { name: 'Compliance Q4 2023', type: 'Compliance', date: '2023-12-31', status: 'Ready', size: '1.1 MB' },
  { name: 'Settlement February 2024', type: 'Settlement', date: '2024-02-28', status: 'Ready', size: '890 KB' },
];

const volumeByType = [
  { type: 'Trading', count: 24 }, { type: 'Carbon', count: 18 },
  { type: 'Settlement', count: 15 }, { type: 'Compliance', count: 8 },
  { type: 'TCFD', count: 4 }, { type: 'Custom', count: 12 },
];

export default function ReportBuilder() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [selectedType, setSelectedType] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Report Builder</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Generate, schedule & download platform reports</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {reportTypes.map((rt, i) => (
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
              <tbody>{recentReports.map(r => (
                <tr key={r.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c('bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-600')}`}>{r.type}</span></td>
                  <td className="py-3 px-4 text-right text-slate-500 mono text-xs">{r.size}</td>
                  <td className="py-3 px-4 text-right text-slate-400 text-xs">{r.date}</td>
                  <td className="py-3 px-5 text-center">
                    <button className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><FiDownload className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
