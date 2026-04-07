import React, { useState } from 'react';
import { FiKey, FiGlobe, FiCode, FiPlus, FiTrash2, FiCopy, FiEye, FiEyeOff } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const tabs = ['API Keys', 'Webhooks', 'Documentation', 'Usage'];

const apiKeys = [
  { id: 'key_live_1a2b3c', name: 'Production API', created: '2024-01-15', lastUsed: '2 min ago', requests: '12,847', status: 'Active' },
  { id: 'key_test_4d5e6f', name: 'Staging API', created: '2024-02-10', lastUsed: '1 hour ago', requests: '3,421', status: 'Active' },
  { id: 'key_live_7g8h9i', name: 'Trading Bot', created: '2024-03-01', lastUsed: '5 min ago', requests: '89,234', status: 'Active' },
];

const webhooks = [
  { id: 'wh_001', url: 'https://api.example.com/hooks/trades', events: ['trade.executed', 'order.filled'], status: 'Active', failures: 0 },
  { id: 'wh_002', url: 'https://api.example.com/hooks/carbon', events: ['credit.retired', 'credit.transferred'], status: 'Active', failures: 2 },
  { id: 'wh_003', url: 'https://api.example.com/hooks/contracts', events: ['contract.signed', 'invoice.generated'], status: 'Paused', failures: 12 },
];

const usageData = Array.from({ length: 14 }, (_, i) => ({
  date: `Apr ${i + 1}`,
  requests: 800 + Math.floor(Math.random() * 500),
  errors: Math.floor(Math.random() * 20),
}));

const endpoints = [
  { method: 'POST', path: '/api/v1/trading/orders', description: 'Place a new order' },
  { method: 'GET', path: '/api/v1/trading/positions', description: 'Get open positions' },
  { method: 'GET', path: '/api/v1/carbon/credits', description: 'List carbon credits' },
  { method: 'POST', path: '/api/v1/carbon/credits/:id/retire', description: 'Retire a carbon credit' },
  { method: 'GET', path: '/api/v1/contracts/documents', description: 'List contracts' },
  { method: 'POST', path: '/api/v1/contracts/documents', description: 'Create a contract' },
  { method: 'GET', path: '/api/v1/settlement/invoices', description: 'List invoices' },
  { method: 'GET', path: '/api/v1/ai/risk/:participantId', description: 'Get risk metrics' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PATCH: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  DELETE: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
};

export default function DeveloperPortal() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeTab, setActiveTab] = useState('API Keys');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Developer Portal</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">API keys, webhooks, documentation & usage analytics</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> {activeTab === 'API Keys' ? 'Create Key' : 'Add Webhook'}
        </button>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'API Keys' && <FiKey className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'Webhooks' && <FiGlobe className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'Documentation' && <FiCode className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'API Keys' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {apiKeys.map((key, i) => (
            <div key={key.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{key.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 mono">{key.id}••••••</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"><FiCopy className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3 text-xs text-slate-400">
                <span>Created: {key.created}</span>
                <span>Last used: {key.lastUsed}</span>
                <span>Requests: <span className="font-semibold text-slate-600 dark:text-slate-300 mono">{key.requests}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Webhooks' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          {webhooks.map((wh, i) => (
            <div key={wh.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 80}ms both` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{wh.url}</p>
                  <div className="flex gap-2 mt-2">
                    {wh.events.map(e => (
                      <span key={e} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c('bg-white/[0.06] text-slate-400', 'bg-slate-100 text-slate-500')}`}>{e}</span>
                    ))}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${wh.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{wh.status}</span>
              </div>
              {wh.failures > 0 && <p className="text-xs text-red-400 mt-2">{wh.failures} delivery failures</p>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Documentation' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className={`px-5 py-3.5 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">API Endpoints</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium w-20">Method</th>
                <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                <th className="text-left py-3 px-5 font-medium">Description</th>
              </tr></thead>
              <tbody>{endpoints.map(ep => (
                <tr key={ep.path} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[ep.method] || ''}`}>{ep.method}</span></td>
                  <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">{ep.path}</td>
                  <td className="py-3 px-5 text-slate-500">{ep.description}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Usage' && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">API Usage (14 days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={usageData}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} fill="url(#reqGrad)" name="Requests" />
              <Area type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={1.5} fill="url(#errGrad)" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
