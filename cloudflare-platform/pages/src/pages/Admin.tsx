import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiShield, FiActivity, FiDatabase } from 'react-icons/fi';
import { participantsAPI, complianceAPI } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function Admin() {
  const [tab, setTab] = useState<'participants' | 'statutory' | 'reports'>('participants');
  const [participants, setParticipants] = useState<Array<Record<string, unknown>>>([]);
  const [statutory, setStatutory] = useState<Array<Record<string, unknown>>>([]);
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Record<string, unknown> | null>(null);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'participants') {
        const res = await participantsAPI.list();
        setParticipants(res.data.data);
      } else if (tab === 'statutory') {
        const res = await complianceAPI.getStatutory();
        setStatutory(res.data.data);
      } else {
        const res = await complianceAPI.getReports();
        setReports(res.data.data);
      }
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: 'participants' as const, label: 'Participants', icon: FiUsers },
    { id: 'statutory' as const, label: 'Statutory Overview', icon: FiShield },
    { id: 'reports' as const, label: 'Regulatory Reports', icon: FiActivity },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Participants', value: participants.length, icon: FiUsers, color: 'from-cyan-500 to-blue-500' },
          { label: 'Pending KYC', value: participants.filter((p) => p.kyc_status === 'pending').length, icon: FiShield, color: 'from-yellow-500 to-orange-500' },
          { label: 'Active Checks', value: statutory.filter((s) => s.status === 'pending' || s.status === 'running').length, icon: FiActivity, color: 'from-purple-500 to-violet-500' },
          { label: 'Trading Enabled', value: participants.filter((p) => p.trading_enabled).length, icon: FiDatabase, color: 'from-emerald-500 to-teal-500' },
        ].map((stat) => (
          <div key={stat.label} className="chart-glass p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-20`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Participants */}
      {tab === 'participants' && (
        <div className="chart-glass p-6">
          {participants.length === 0 ? <p className="text-sm text-slate-400">No participants</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Company</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">KYC</th>
                  <th className="text-left py-2">Trading</th>
                  <th className="text-right py-2">Action</th>
                </tr></thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.id as string} className="border-t border-slate-800">
                      <td className="py-2 font-medium">{p.company_name as string}</td>
                      <td className="text-slate-400">{p.email as string}</td>
                      <td className="capitalize">{p.role as string}</td>
                      <td><StatusBadge status={p.kyc_status as string} /></td>
                      <td>{p.trading_enabled ? <span className="text-emerald-400 text-xs">Enabled</span> : <span className="text-red-400 text-xs">Disabled</span>}</td>
                      <td className="text-right">
                        <button onClick={() => { setSelectedParticipant(p); setShowDetailModal(true); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statutory Overview */}
      {tab === 'statutory' && (
        <div className="chart-glass p-6">
          {statutory.length === 0 ? <p className="text-sm text-slate-400">No checks</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Regulation</th>
                  <th className="text-left py-2">Entity Type</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Checked At</th>
                </tr></thead>
                <tbody>
                  {statutory.map((ch) => (
                    <tr key={ch.id as string} className="border-t border-slate-800">
                      <td className="py-2 font-medium">{ch.regulation as string}</td>
                      <td>{ch.entity_type as string}</td>
                      <td>{ch.method as string}</td>
                      <td><StatusBadge status={ch.status as string} /></td>
                      <td className="text-xs text-slate-400">{ch.checked_at as string || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Regulatory Reports */}
      {tab === 'reports' && (
        <div className="chart-glass p-6">
          {reports.length === 0 ? <p className="text-sm text-slate-400">No reports</p> : (
            <div className="space-y-3">
              {reports.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                  <div>
                    <div className="font-medium capitalize">{(r.type as string || '').replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400">Period: {r.period as string}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={r.status as string} />
                    <div className="text-xs text-slate-400 mt-1">Due: {r.due_date as string}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participant Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Participant Details" size="lg">
        {selectedParticipant && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Company', selectedParticipant.company_name],
                ['Registration #', selectedParticipant.registration_number],
                ['Tax Number', selectedParticipant.tax_number],
                ['VAT Number', selectedParticipant.vat_number || 'N/A'],
                ['Email', selectedParticipant.email],
                ['Phone', selectedParticipant.phone],
                ['Role', selectedParticipant.role],
                ['KYC Status', selectedParticipant.kyc_status],
                ['BBBEE Level', selectedParticipant.bbbee_level || 'N/A'],
                ['SA ID', selectedParticipant.sa_id_number || 'N/A'],
                ['NERSA Licence', selectedParticipant.nersa_licence || 'N/A'],
                ['FSCA Licence', selectedParticipant.fsca_licence || 'N/A'],
              ].map(([label, value]) => (
                <div key={label as string} className="p-2 rounded bg-slate-800/50">
                  <div className="text-xs text-slate-400">{label as string}</div>
                  <div className="text-sm font-medium">{value as string}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
