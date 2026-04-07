import React, { useState } from 'react';
import { FiFileText, FiCheck, FiClock, FiAlertCircle, FiPlus, FiDownload, FiFilter } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const tabs = ['All', 'Draft', 'Active', 'Pending', 'Completed', 'Smart Rules'];

const contracts = [
  { id: 'PPA-2024-001', type: 'Solar PPA', counterparty: 'Eskom Holdings', value: 'R24.8M', status: 'Active', start: '2024-01-15', end: '2034-01-14', capacity: '50 MW' },
  { id: 'PPA-2024-002', type: 'Wind PPA', counterparty: 'BevCo Power', value: 'R18.2M', status: 'Active', start: '2024-03-01', end: '2034-02-28', capacity: '35 MW' },
  { id: 'FWD-2024-003', type: 'Gas Forward', counterparty: 'GreenFund SA', value: 'R6.4M', status: 'Pending', start: '2024-07-01', end: '2025-06-30', capacity: '15 MW' },
  { id: 'PPA-2024-004', type: 'Solar PPA', counterparty: 'TerraVolt Energy', value: 'R32.1M', status: 'Draft', start: '2024-09-01', end: '2034-08-31', capacity: '75 MW' },
  { id: 'OPT-2024-005', type: 'Carbon Option', counterparty: 'Carbon Bridge', value: 'R2.8M', status: 'Active', start: '2024-02-15', end: '2024-12-31', capacity: '10,000 t' },
  { id: 'PPA-2024-006', type: 'Biogas PPA', counterparty: 'Envera Group', value: 'R8.6M', status: 'Completed', start: '2023-01-01', end: '2023-12-31', capacity: '20 MW' },
];

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Active: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <FiCheck className="w-3 h-3" /> },
  Pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: <FiClock className="w-3 h-3" /> },
  Draft: { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', icon: <FiFileText className="w-3 h-3" /> },
  Completed: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: <FiCheck className="w-3 h-3" /> },
};

const smartRules = [
  { rule: 'Auto-renew PPA if generation > 90%', type: 'Threshold', status: 'Active', triggers: 12, lastTriggered: '2 days ago' },
  { rule: 'Penalty clause if delivery < 80%', type: 'Penalty', status: 'Active', triggers: 3, lastTriggered: '1 week ago' },
  { rule: 'Price escalation at CPI + 2%', type: 'Escalation', status: 'Active', triggers: 4, lastTriggered: '1 month ago' },
  { rule: 'Force majeure notification', type: 'Event', status: 'Active', triggers: 0, lastTriggered: 'Never' },
  { rule: 'Carbon offset obligation', type: 'Compliance', status: 'Active', triggers: 6, lastTriggered: '3 days ago' },
  { rule: 'Automatic invoicing on delivery', type: 'Billing', status: 'Paused', triggers: 48, lastTriggered: '1 day ago' },
  { rule: 'Dispute escalation after 14 days', type: 'Dispute', status: 'Active', triggers: 1, lastTriggered: '2 weeks ago' },
];

export default function Contracts() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All' ? contracts :
    activeTab === 'Smart Rules' ? contracts :
    contracts.filter(c => c.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Contracts</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">PPAs, forwards, options & smart rules</p>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-2.5 rounded-2xl text-sm font-medium flex items-center gap-2 transition-all ${isDark ? 'bg-[#151F32] border border-white/[0.06] text-slate-300 hover:bg-[#1A2640]' : 'bg-white border border-black/[0.06] text-slate-600 hover:bg-slate-50'}`}>
            <FiDownload className="w-4 h-4" /> Export
          </button>
          <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-all flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Smart Rules' ? (
        /* Smart Rules Table */
        <div className={`cp-card !p-0 overflow-hidden ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs border-b ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Rule</th>
                  <th className="text-left py-3.5 px-4 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 font-medium">Status</th>
                  <th className="text-right py-3.5 px-4 font-medium">Triggers</th>
                  <th className="text-right py-3.5 px-5 font-medium">Last Triggered</th>
                </tr>
              </thead>
              <tbody>
                {smartRules.map((r, i) => (
                  <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">{r.rule}</td>
                    <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{r.type}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{r.status}</span></td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 mono">{r.triggers}</td>
                    <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{r.lastTriggered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Contracts Table */
        <div className={`cp-card !p-0 overflow-hidden ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs border-b ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Contract ID</th>
                  <th className="text-left py-3.5 px-4 font-medium">Type</th>
                  <th className="text-left py-3.5 px-4 font-medium">Counterparty</th>
                  <th className="text-right py-3.5 px-4 font-medium">Value</th>
                  <th className="text-left py-3.5 px-4 font-medium">Status</th>
                  <th className="text-right py-3.5 px-4 font-medium">Capacity</th>
                  <th className="text-right py-3.5 px-5 font-medium">Period</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const sc = statusConfig[c.status] || statusConfig.Draft;
                  return (
                    <tr key={c.id} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer`}
                      style={{ animation: `cardFadeUp 400ms ease ${i * 50}ms both` }}>
                      <td className="py-3.5 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{c.id}</td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{c.type}</td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{c.counterparty}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{c.value}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.icon} {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 mono text-xs">{c.capacity}</td>
                      <td className="py-3.5 px-5 text-right text-slate-400 text-xs">{c.start} — {c.end}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
