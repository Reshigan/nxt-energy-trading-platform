import React, { useEffect, useState } from 'react';
import { gridAPI } from '../lib/api';

type Tab = 'connections' | 'wheeling' | 'metering' | 'imbalance' | 'capacity';

export default function GridDashboard() {
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<Record<string, unknown>[]>([]);
  const [wheeling, setWheeling] = useState<Record<string, unknown>>({});
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [imbalances, setImbalances] = useState<Record<string, unknown>[]>([]);
  const [capacity, setCapacity] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<Tab, () => Promise<void>> = {
      connections: () => gridAPI.getConnections().then((r) => setConnections(r.data?.data || [])),
      wheeling: () => gridAPI.getWheelingSummary().then((r) => setWheeling(r.data?.data || {})),
      metering: () => gridAPI.getValidationQueue().then((r) => setQueue(r.data?.data || [])),
      imbalance: () => gridAPI.getImbalance().then((r) => setImbalances(r.data?.data || [])),
      capacity: () => gridAPI.getCapacity().then((r) => setCapacity(r.data?.data || [])),
    };
    fetchers[tab]().catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'connections', label: 'Connections' },
    { key: 'wheeling', label: 'Wheeling' },
    { key: 'metering', label: 'Metering' },
    { key: 'imbalance', label: 'Imbalance' },
    { key: 'capacity', label: 'Capacity' },
  ];

  const statusColors: Record<string, string> = {
    applied: 'bg-blue-500/20 text-blue-400', feasibility: 'bg-yellow-500/20 text-yellow-400',
    quoted: 'bg-orange-500/20 text-orange-400', agreement_signed: 'bg-purple-500/20 text-purple-400',
    construction: 'bg-indigo-500/20 text-indigo-400', energised: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Grid Operator Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Manage connections, wheeling, metering, imbalance &amp; capacity</p>
      </div>

      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {tab === 'connections' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                  <th className="px-4 py-3">Project</th><th className="px-4 py-3">Connection Point</th><th className="px-4 py-3">Applied MW</th><th className="px-4 py-3">Allocated MW</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Applicant</th>
                </tr></thead>
                <tbody>{connections.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">No connections</td></tr>
                ) : connections.map((conn, i) => (
                  <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-white">{String(conn.project_name || conn.project_id || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{String(conn.connection_point || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{Number(conn.applied_capacity_mw) || 0}</td>
                    <td className="px-4 py-3 text-slate-300">{Number(conn.allocated_capacity_mw) || 0}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusColors[String(conn.status)] || 'bg-slate-600/30 text-slate-400'}`}>{String(conn.status || '-')}</span></td>
                    <td className="px-4 py-3 text-slate-300">{String(conn.applicant_name || '-')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === 'wheeling' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="text-slate-400 text-sm">Active Agreements</div>
                  <div className="text-2xl font-bold text-white mt-1">{Number(wheeling.total_agreements) || 0}</div>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="text-slate-400 text-sm">Total Volume</div>
                  <div className="text-2xl font-bold text-green-400 mt-1">{(Number(wheeling.total_volume_mwh) || 0).toLocaleString()} MWh</div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                    <th className="px-4 py-3">Agreement</th><th className="px-4 py-3">Generator</th><th className="px-4 py-3">Offtaker</th><th className="px-4 py-3">Value</th>
                  </tr></thead>
                  <tbody>{(Array.isArray(wheeling.agreements) ? wheeling.agreements as Record<string, unknown>[] : []).map((a, i) => (
                    <tr key={i} className="border-t border-slate-700/50">
                      <td className="px-4 py-3 text-white">{String(a.title || a.id || '-')}</td>
                      <td className="px-4 py-3 text-slate-300">{String(a.generator || '-')}</td>
                      <td className="px-4 py-3 text-slate-300">{String(a.offtaker || '-')}</td>
                      <td className="px-4 py-3 text-green-400">R{((Number(a.value_cents) || 0) / 100).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'metering' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between">
                <span className="text-sm text-slate-400">Pending Validation ({queue.length})</span>
                {queue.length > 0 && <button onClick={() => gridAPI.batchValidate({ ids: queue.map((q) => String(q.id)), valid: true }).then(() => setQueue([]))} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs">Validate All</button>}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-900/30 text-slate-400 text-left">
                  <th className="px-4 py-3">Project</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">kWh</th><th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>{queue.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-500">No readings pending validation</td></tr>
                ) : queue.map((r, i) => (
                  <tr key={i} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-white">{String(r.project_name || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{String(r.timestamp || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{Number(r.kwh_reading) || 0}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => gridAPI.validateReading(String(r.id), { valid: true }).then(() => setQueue((prev) => prev.filter((q) => q.id !== r.id)))} className="text-green-400 hover:text-green-300 text-xs">Approve</button>
                      <button onClick={() => gridAPI.validateReading(String(r.id), { valid: false }).then(() => setQueue((prev) => prev.filter((q) => q.id !== r.id)))} className="text-red-400 hover:text-red-300 text-xs">Reject</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === 'imbalance' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                  <th className="px-4 py-3">Connection</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Nominated MWh</th><th className="px-4 py-3">Actual MWh</th><th className="px-4 py-3">Imbalance</th><th className="px-4 py-3">Settlement</th>
                </tr></thead>
                <tbody>{imbalances.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">No imbalance data</td></tr>
                ) : imbalances.map((im, i) => (
                  <tr key={i} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 text-white">{String(im.connection_point || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{String(im.project_name || '-')}</td>
                    <td className="px-4 py-3 text-slate-300">{Number(im.nominated_mwh) || 0}</td>
                    <td className="px-4 py-3 text-slate-300">{Number(im.actual_mwh) || 0}</td>
                    <td className={`px-4 py-3 ${Number(im.imbalance_mwh) < 0 ? 'text-red-400' : 'text-green-400'}`}>{Number(im.imbalance_mwh) || 0} MWh</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${im.settlement_status === 'settled' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{String(im.settlement_status || 'pending')}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === 'capacity' && (
            <div className="space-y-4">
              {capacity.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No capacity data</div>
              ) : capacity.map((cp, i) => (
                <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{String(cp.connection_point)}</span>
                    <span className="text-sm text-slate-400">{Number(cp.utilisation_pct)}% utilised</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div className={`h-3 rounded-full ${Number(cp.utilisation_pct) > 80 ? 'bg-red-500' : Number(cp.utilisation_pct) > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Number(cp.utilisation_pct))}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Applied: {Number(cp.total_applied_mw)} MW</span>
                    <span>Allocated: {Number(cp.total_allocated_mw)} MW</span>
                    <span>Available: {Number(cp.available_mw)} MW</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
