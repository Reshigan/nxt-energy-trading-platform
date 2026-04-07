import React, { useState, useEffect } from 'react';
import { FiUsers, FiShield, FiCheck, FiX, FiSearch, FiActivity } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { participantsAPI, complianceAPI } from '../lib/api';

const tabs = ['Participants', 'System Stats', 'Audit Log'];

const participants = [
  { id: 'P-001', name: 'TerraVolt Energy', email: 'james@terravolt.co.za', role: 'IPP', kyc: 'Verified', status: 'Active', joined: '2024-01-15' },
  { id: 'P-002', name: 'BevCo Power', email: 'sarah@bevco-power.co.za', role: 'Offtaker', kyc: 'Verified', status: 'Active', joined: '2024-01-20' },
  { id: 'P-003', name: 'Envera Trading', email: 'thabo@envera.co.za', role: 'Trader', kyc: 'Pending', status: 'Active', joined: '2024-02-10' },
  { id: 'P-004', name: 'GreenFund SA', email: 'nomsa@greenfund.co.za', role: 'Carbon Fund', kyc: 'Verified', status: 'Active', joined: '2024-01-25' },
  { id: 'P-005', name: 'Carbon Bridge', email: 'pieter@carbonbridge.co.za', role: 'Trader', kyc: 'Verified', status: 'Active', joined: '2024-02-05' },
  { id: 'P-006', name: 'ABSA Capital', email: 'michelle.govender@absa.co.za', role: 'Lender', kyc: 'Pending', status: 'Pending', joined: '2024-03-15' },
  { id: 'P-007', name: 'Eskom Holdings', email: 'david.mahlangu@eskom.co.za', role: 'Grid', kyc: 'Verified', status: 'Active', joined: '2024-01-10' },
];

const auditLog = [
  { time: '20:12:04', user: 'admin@et.vantax.co.za', action: 'KYC Approved', target: 'TerraVolt Energy', ip: '102.165.44.21' },
  { time: '20:08:15', user: 'thabo@envera.co.za', action: 'Order Placed', target: 'SOLAR-SPOT BUY 100 MWh', ip: '105.244.18.92' },
  { time: '19:55:32', user: 'james@terravolt.co.za', action: 'Contract Signed', target: 'PPA-2024-001', ip: '41.76.108.44' },
  { time: '19:42:18', user: 'pieter@carbonbridge.co.za', action: 'Credit Retired', target: 'VCS-2024-8821 (500 tCO2e)', ip: '196.22.144.67' },
  { time: '19:30:01', user: 'system', action: 'Cron: Licence Expiry Check', target: '4 licences checked', ip: '-' },
  { time: '19:15:44', user: 'sarah@bevco-power.co.za', action: 'Invoice Paid', target: 'INV-2024-002 R1,240,000', ip: '154.127.62.15' },
];

const systemStats = [
  { label: 'Total Users', value: '7' }, { label: 'Active Sessions', value: '12' },
  { label: 'API Calls (24h)', value: '14,847' }, { label: 'Avg Response', value: '42ms' },
  { label: 'DB Size', value: '148 MB' }, { label: 'Error Rate', value: '0.02%' },
];

const apiCallsData = [
  { hour: '00', calls: 120 }, { hour: '04', calls: 45 }, { hour: '08', calls: 890 },
  { hour: '12', calls: 1240 }, { hour: '16', calls: 980 }, { hour: '20', calls: 650 },
];

export default function Admin() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeTab, setActiveTab] = useState('Participants');
  const [search, setSearch] = useState('');
  const [participantData, setParticipantData] = useState(participants);
  const [auditData, setAuditData] = useState(auditLog);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          participantsAPI.list(),
          complianceAPI.getAudit(),
        ]);
        if (pRes.data?.data?.length) setParticipantData(pRes.data.data);
        if (aRes.data?.data?.length) setAuditData(aRes.data.data);
      } catch { /* use demo data */ }
    })();
  }, []);

  const filteredParticipants = participantData.filter(p =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Admin</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Platform administration & participant management</p>
        </div>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit ${c('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeTab === tab ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>
            {tab === 'Participants' && <FiUsers className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'System Stats' && <FiActivity className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab === 'Audit Log' && <FiShield className="w-3.5 h-3.5 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Participants' && (
        <>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-fit ${c('bg-white/[0.04] border-white/[0.06]', 'bg-white border-black/[0.06]')}`} style={{ animation: 'cardFadeUp 500ms ease 150ms both' }}>
            <FiSearch className="w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participants..."
              className={`bg-transparent text-sm outline-none ${c('text-white placeholder-slate-500', 'text-slate-800 placeholder-slate-400')}`} />
          </div>
          <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                  <th className="text-left py-3.5 px-5 font-medium">Name</th>
                  <th className="text-left py-3.5 px-4 font-medium">Email</th>
                  <th className="text-left py-3.5 px-4 font-medium">Role</th>
                  <th className="text-left py-3.5 px-4 font-medium">KYC</th>
                  <th className="text-left py-3.5 px-4 font-medium">Status</th>
                  <th className="text-center py-3.5 px-5 font-medium">Actions</th>
                </tr></thead>
                <tbody>{filteredParticipants.map(p => (
                  <tr key={p.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                    <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{p.email}</td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c('bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-600')}`}>{p.role}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.kyc === 'Verified' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.kyc}</span></td>
                    <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{p.status}</span></td>
                    <td className="py-3.5 px-5 text-center">
                      {p.kyc === 'Pending' && (
                        <div className="flex justify-center gap-1.5">
                          <button className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"><FiCheck className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"><FiX className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'System Stats' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            {systemStats.map((s, i) => (
              <div key={s.label} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mono">{s.value}</p>
              </div>
            ))}
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">API Calls by Hour</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={apiCallsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="calls" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeTab === 'Audit Log' && (
        <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium">Time</th>
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Action</th>
                <th className="text-left py-3 px-4 font-medium">Target</th>
                <th className="text-right py-3 px-5 font-medium">IP</th>
              </tr></thead>
              <tbody>{auditData.map((log, i) => (
                <tr key={i} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-mono text-xs text-slate-400">{log.time}</td>
                  <td className="py-3 px-4 text-blue-600 dark:text-blue-400 text-xs">{log.user}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.action}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{log.target}</td>
                  <td className="py-3 px-5 text-right text-slate-400 font-mono text-xs">{log.ip}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
