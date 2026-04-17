import React, { useEffect, useState } from 'react';
import { gridAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { BatchActionBar } from '../components/ui/BatchActionBar';
import { formatZAR } from '../lib/format';

type Tab = 'connections' | 'wheeling' | 'metering' | 'imbalance' | 'capacity';
type ConnectionStatus = 'applied' | 'quoted' | 'agreement_signed' | 'under_construction' | 'energised' | 'rejected';

const KANBAN_STAGES: ConnectionStatus[] = ['applied', 'quoted', 'agreement_signed', 'under_construction', 'energised', 'rejected'];

export default function GridDashboard() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<Record<string, unknown>[]>([]);
  const [wheeling, setWheeling] = useState<Record<string, unknown>>({});
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string[]>([]);
  const [imbalances, setImbalances] = useState<Record<string, unknown>[]>([]);
  const [capacity, setCapacity] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<Tab, () => Promise<void>> = {
      connections: () => gridAPI.getConnections().then((r) => setConnections(r.data?.data || [])),
      wheeling: () => gridAPI.getWheelingSummary().then((r) => setWheeling(r.data?.data || {})),
      metering: () => gridAPI.getValidationQueue().then((r) => { setQueue(r.data?.data || []); setSelectedQueue([]); }),
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

  const statusColors: Record<ConnectionStatus, string> = {
    applied: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    quoted: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    agreement_signed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    under_construction: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    energised: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabel: Record<ConnectionStatus, string> = {
    applied: 'Applied', quoted: 'Quoted', agreement_signed: 'Agreement', under_construction: 'Construction', energised: 'Energised', rejected: 'Rejected',
  };

  const connectionsByStatus = KANBAN_STAGES.map(s => ({
    name: statusLabel[s], value: connections.filter(c => String(c.status) === s).length,
  })).filter(d => d.value > 0);

  const imbalanceData = imbalances.map(im => ({
    name: String(im.project_name || 'Unknown').substring(0, 12),
    surplus: Number(im.imbalance_mwh) > 0 ? Number(im.imbalance_mwh) : 0,
    shortfall: Number(im.imbalance_mwh) < 0 ? Math.abs(Number(im.imbalance_mwh)) : 0,
  }));

  const handleBatchValidate = async () => {
    if (selectedQueue.length === 0) return;
    try {
      await gridAPI.batchValidate({ ids: selectedQueue, valid: true });
      setQueue(prev => prev.filter(q => !selectedQueue.includes(String(q.id))));
      setSelectedQueue([]);
    } catch { /* */ }
  };

  const toggleQueueSelect = (id: string) => {
    setSelectedQueue(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Grid Operator Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage connections, wheeling, metering, imbalance &amp; capacity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg text-sm ${c('bg-slate-800 border border-slate-700', 'bg-slate-100 border border-slate-200')}`}>
            <span className="text-slate-400">Connections:</span> <span className="text-white font-semibold ml-1">{connections.length}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm ${c('bg-slate-800 border border-slate-700', 'bg-slate-100 border border-slate-200')}`}>
            <span className="text-slate-400">Active:</span> <span className="text-green-400 font-semibold ml-1">{connections.filter((c: Record<string, unknown>) => c.status === 'energised').length}</span>
          </div>
        </div>
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
        <div className="space-y-6" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kanban Pipeline for Connections */}
            {['applied', 'quoted', 'agreement_signed', 'under_construction', 'energised', 'rejected'].map(status => (
              <div key={status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">{status.replace('_', ' ')}</h3>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                    {connections.filter(c => String(c.status) === status).length}
                  </span>
                </div>
                <div className="flex flex-col gap-3 min-h-[400px]">
                  {connections.filter(c => String(c.status) === status).map((conn, i) => (
                    <div key={i} className="bg-slate-800 border border-slate-700 p-4 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{String(conn.project_name || conn.project_id || '-')}</span>
                        <span className="text-[10px] text-slate-500">{String(conn.applicant_name || '-')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>{Number(conn.applied_capacity_mw) || 0} MW</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{Number(conn.allocated_capacity_mw) || 0} MW</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{String(conn.connection_point || '-')}</span>
                        <button className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600/30 transition-colors">Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            <div className="space-y-4">
              <div className={`rounded-xl border overflow-hidden ${c('bg-slate-800 border-slate-700', 'bg-white border-slate-200')}`}>
                <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Pending Validation ({queue.length})</span>
                  {selectedQueue.length > 0 && (
                    <span className="text-xs text-blue-400">{selectedQueue.length} selected</span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400 text-left">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selectedQueue.length === queue.length && queue.length > 0} onChange={(e) => setSelectedQueue(e.target.checked ? queue.map(q => String(q.id)) : [])} className="rounded" />
                    </th>
                    <th className="px-4 py-3">Project</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">kWh</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody>{queue.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">No readings pending validation</td></tr>
                  ) : queue.map((r, i) => (
                    <tr key={i} className={`border-t border-slate-700/50 ${selectedQueue.includes(String(r.id)) ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedQueue.includes(String(r.id))} onChange={() => toggleQueueSelect(String(r.id))} className="rounded" />
                      </td>
                      <td className="px-4 py-3 text-white">{String(r.project_name || '-')}</td>
                      <td className="px-4 py-3 text-slate-300">{String(r.timestamp || '-')}</td>
                      <td className="px-4 py-3 text-slate-300">{Number(r.kwh_reading) || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${r.source === 'AMI' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {String(r.source || 'Manual')}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => gridAPI.validateReading(String(r.id), { valid: true }).then(() => setQueue((prev) => prev.filter((q) => q.id !== r.id)))} className="text-green-400 hover:text-green-300 text-xs">Approve</button>
                        <button onClick={() => gridAPI.validateReading(String(r.id), { valid: false }).then(() => setQueue((prev) => prev.filter((q) => q.id !== r.id)))} className="text-red-400 hover:text-red-300 text-xs">Reject</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {queue.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Validated', value: 0 }, { name: 'Pending', value: queue.length }, { name: 'Rejected', value: 0 }]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={c('#334155', '#e2e8f0')} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: c('#1e293b', '#fff'), border: `1px solid ${c('#334155', '#e2e8f0')}`, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#3b82f6" name="Readings" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <BatchActionBar
                selectedCount={selectedQueue.length}
                actions={[
                  { label: 'Validate Selected', onClick: handleBatchValidate, variant: 'primary' },
                  { label: 'Clear', onClick: () => setSelectedQueue([]), variant: 'secondary' },
                ]}
              />
            </div>
          )}

          {tab === 'imbalance' && (
            <div className="space-y-4">
              {imbalanceData.length > 0 && (
                <div className={`rounded-xl border p-4 ${c('bg-slate-800 border-slate-700', 'bg-white border-slate-200')}`}>
                  <h3 className="text-sm font-semibold text-slate-400 mb-4">Monthly Imbalance by Generator</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={imbalanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={c('#334155', '#e2e8f0')} vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: c('#1e293b', '#fff'), border: `1px solid ${c('#334155', '#e2e8f0')}`, borderRadius: 8 }} />
                        <Bar dataKey="surplus" stackId="a" fill="#22c55e" name="Surplus MWh" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="shortfall" stackId="a" fill="#ef4444" name="Shortfall MWh" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                    <th className="px-4 py-3">Connection</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Nominated</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Imbalance</th><th className="px-4 py-3">Status</th>
                  </tr></thead>
                  <tbody>{imbalances.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">No imbalance data</td></tr>
                  ) : imbalances.map((im, i) => {
                    const imbalance = Number(im.imbalance_mwh) || 0;
                    const exceedsTolerance = Math.abs(imbalance) > 5;
                    return (
                      <tr key={i} className={`border-t border-slate-700/50 ${exceedsTolerance ? 'bg-red-500/5' : ''}`}>
                        <td className="px-4 py-3 text-white">{String(im.connection_point || '-')}</td>
                        <td className="px-4 py-3 text-slate-300">{String(im.project_name || '-')}</td>
                        <td className="px-4 py-3 text-slate-300">{Number(im.nominated_mwh) || 0} MWh</td>
                        <td className="px-4 py-3 text-slate-300">{Number(im.actual_mwh) || 0} MWh</td>
                        <td className={`px-4 py-3 font-medium ${imbalance < 0 ? 'text-red-400' : 'text-green-400'}`}>{imbalance.toFixed(2)} MWh</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${im.settlement_status === 'settled' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{String(im.settlement_status || 'pending')}</span></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'capacity' && (
            <div className="space-y-4">
              {capacity.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No capacity data</div>
              ) : capacity.map((cp, i) => {
                const utilPct = Number(cp.utilisation_pct) || 0;
                const isWarning = utilPct > 80;
                return (
                  <div key={i} className={`rounded-xl border p-4 ${c('bg-slate-800 border-slate-700', 'bg-white border-slate-200')}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">{String(cp.connection_point)}</span>
                      <span className={`text-sm font-medium ${isWarning ? 'text-red-400' : 'text-slate-400'}`}>{utilPct}% utilised</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                      <div className={`h-3 rounded-full transition-all ${isWarning ? 'bg-red-500' : utilPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, utilPct)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Applied: {Number(cp.total_applied_mw) || 0} MW</span>
                      <span>Allocated: {Number(cp.total_allocated_mw) || 0} MW</span>
                      <span>Available: {Number(cp.available_mw) || 0} MW</span>
                    </div>
                    {isWarning && (
                      <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                        Warning: Capacity exceeds 80% utilisation threshold
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {selectedQueue.length > 0 && (
        <BatchActionBar
          selectedCount={selectedQueue.length}
          totalValue={0}
          actions={[
            { label: 'Validate Selected', variant: 'primary', onClick: handleBatchValidate },
            { label: 'Clear', variant: 'secondary', onClick: () => setSelectedQueue([]) },
          ]}
        />
      )}
    </div>
  );
}
