import React, { useEffect, useState } from 'react';
import { procurementAPI } from '../lib/api';

type Tab = 'contracts' | 'rfp' | 'consumption' | 'sustainability' | 'billing';

export default function ProcurementHub() {
  const [tab, setTab] = useState<Tab>('contracts');
  const [rfps, setRfps] = useState<Record<string, unknown>[]>([]);
  const [bids, setBids] = useState<Record<string, unknown>[]>([]);
  const [selectedRfp, setSelectedRfp] = useState<string | null>(null);
  const [consumption, setConsumption] = useState<Record<string, unknown>[]>([]);
  const [budget, setBudget] = useState<Record<string, unknown>>({});
  const [sustainability, setSustainability] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRfp, setNewRfp] = useState({ title: '', volume_mwh: '', technology: 'solar', location: '', contract_term_years: '10', max_tariff_cents: '' });

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<Tab, () => Promise<void>> = {
      contracts: () => procurementAPI.getBudgetTracking().then((r) => setBudget(r.data?.data || {})),
      rfp: () => procurementAPI.listRFPs().then((r) => setRfps(r.data?.data || [])),
      consumption: () => procurementAPI.getConsumptionTracking().then((r) => setConsumption(r.data?.data || [])),
      sustainability: () => procurementAPI.getSustainabilityMetrics().then((r) => setSustainability(r.data?.data || {})),
      billing: () => procurementAPI.getBudgetTracking().then((r) => setBudget(r.data?.data || {})),
    };
    fetchers[tab]().catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  const handleCreateRfp = () => {
    if (!newRfp.title || !newRfp.volume_mwh) return;
    procurementAPI.createRFP({
      title: newRfp.title, volume_mwh: Number(newRfp.volume_mwh),
      technology: newRfp.technology, location: newRfp.location,
      contract_term_years: Number(newRfp.contract_term_years),
      max_tariff_cents: newRfp.max_tariff_cents ? Number(newRfp.max_tariff_cents) : undefined,
    }).then(() => {
      setShowCreate(false);
      setNewRfp({ title: '', volume_mwh: '', technology: 'solar', location: '', contract_term_years: '10', max_tariff_cents: '' });
      procurementAPI.listRFPs().then((r) => setRfps(r.data?.data || []));
    }).catch(() => {});
  };

  const loadBids = (rfpId: string) => {
    setSelectedRfp(rfpId);
    procurementAPI.getBids(rfpId).then((r) => setBids(r.data?.data || [])).catch(() => {});
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'contracts', label: 'Active Contracts' },
    { key: 'rfp', label: 'RFP Management' },
    { key: 'consumption', label: 'Consumption' },
    { key: 'sustainability', label: 'Sustainability' },
    { key: 'billing', label: 'Bill Comparison' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Procurement Hub</h1>
        <p className="text-slate-400 text-sm mt-1">Manage energy procurement — contracts, RFPs, consumption &amp; sustainability</p>
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
          {tab === 'contracts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Budget', value: `R${((Number(budget.total_budget_cents) || 0) / 100).toLocaleString()}`, color: 'text-white' },
                  { label: 'Total Spend', value: `R${((Number(budget.total_spend_cents) || 0) / 100).toLocaleString()}`, color: 'text-blue-400' },
                  { label: 'Remaining', value: `R${((Number(budget.remaining_cents) || 0) / 100).toLocaleString()}`, color: 'text-green-400' },
                  { label: 'Renewable %', value: `${Number(budget.renewable_pct) || 0}%`, color: 'text-cyan-400' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="text-slate-400 text-xs">{kpi.label}</div>
                    <div className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Budget Utilisation</span>
                  <span className="text-sm text-white font-medium">{Number(budget.utilisation_pct) || 0}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(100, Number(budget.utilisation_pct) || 0)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Blended Rate: R{((Number(budget.blended_rate_cents_kwh) || 0) / 100).toFixed(2)}/kWh</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'rfp' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">+ New RFP</button>
              </div>
              {showCreate && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="RFP Title" value={newRfp.title} onChange={(e) => setNewRfp({ ...newRfp, title: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <input type="number" placeholder="Volume (MWh)" value={newRfp.volume_mwh} onChange={(e) => setNewRfp({ ...newRfp, volume_mwh: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <select value={newRfp.technology} onChange={(e) => setNewRfp({ ...newRfp, technology: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                      <option value="solar">Solar PV</option><option value="wind">Wind</option><option value="hybrid">Hybrid</option><option value="biomass">Biomass</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="Location" value={newRfp.location} onChange={(e) => setNewRfp({ ...newRfp, location: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <input type="number" placeholder="Max Tariff (cents/kWh)" value={newRfp.max_tariff_cents} onChange={(e) => setNewRfp({ ...newRfp, max_tariff_cents: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <button onClick={handleCreateRfp} className="bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">Create RFP</button>
                  </div>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-900/50 text-slate-400 text-left">
                    <th className="px-4 py-3">RFP</th><th className="px-4 py-3">Volume</th><th className="px-4 py-3">Technology</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody>{rfps.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No RFPs created yet</td></tr>
                  ) : rfps.map((rfp, i) => (
                    <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-white">{String(rfp.title)}</td>
                      <td className="px-4 py-3 text-slate-300">{Number(rfp.volume_mwh).toLocaleString()} MWh</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{String(rfp.technology || '-')}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${rfp.status === 'published' ? 'bg-green-500/20 text-green-400' : rfp.status === 'awarded' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{String(rfp.status || 'draft')}</span></td>
                      <td className="px-4 py-3 flex gap-2">
                        {rfp.status === 'draft' && <button onClick={() => procurementAPI.publishRFP(String(rfp.id)).then(() => setTab('rfp'))} className="text-blue-400 hover:text-blue-300 text-xs">Publish</button>}
                        <button onClick={() => loadBids(String(rfp.id))} className="text-cyan-400 hover:text-cyan-300 text-xs">View Bids</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {selectedRfp && bids.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900/50 text-sm text-white font-medium">Bids for RFP</div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-900/30 text-slate-400 text-left">
                      <th className="px-4 py-3">Generator</th><th className="px-4 py-3">Tariff</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">BBBEE</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody>{bids.map((bid, i) => (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="px-4 py-3 text-white">{String(bid.generator_name || bid.generator_id)}</td>
                        <td className="px-4 py-3 text-slate-300">R{((Number(bid.tariff_cents) || 0) / 100).toFixed(2)}/kWh</td>
                        <td className="px-4 py-3 text-green-400">{Number(bid.weighted_score || 0).toFixed(1)}</td>
                        <td className="px-4 py-3 text-slate-300">Level {Number(bid.bbbee_level) || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${bid.status === 'selected' ? 'bg-green-500/20 text-green-400' : bid.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-slate-600/30 text-slate-400'}`}>{String(bid.status || 'submitted')}</span></td>
                        <td className="px-4 py-3">{String(bid.status) === 'submitted' && <button onClick={() => procurementAPI.selectBid(selectedRfp, String(bid.id)).then(() => loadBids(selectedRfp))} className="text-green-400 hover:text-green-300 text-xs">Select</button>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'consumption' && (
            <div className="space-y-4">
              {consumption.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No active consumption contracts</div>
              ) : consumption.map((ct, i) => (
                <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{String(ct.contract_title || ct.contract_id)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${ct.status === 'over' ? 'bg-red-500/20 text-red-400' : ct.status === 'under' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                      {ct.status === 'on_track' ? 'On Track' : ct.status === 'over' ? 'Over-Consuming' : 'Under-Consuming'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-slate-400">Contracted:</span> <span className="text-white ml-1">{Number(ct.contracted_mwh).toLocaleString()} MWh</span></div>
                    <div><span className="text-slate-400">Actual:</span> <span className="text-white ml-1">{Number(ct.actual_mwh).toLocaleString()} MWh</span></div>
                    <div><span className="text-slate-400">Variance:</span> <span className={`ml-1 ${Number(ct.variance_mwh) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{Number(ct.variance_mwh)} MWh</span></div>
                    <div><span className="text-slate-400">Variance %:</span> <span className={`ml-1 ${Number(ct.variance_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{Number(ct.variance_pct)}%</span></div>
                  </div>
                  <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${ct.status === 'over' ? 'bg-red-500' : ct.status === 'under' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (Number(ct.actual_mwh) / Math.max(1, Number(ct.contracted_mwh))) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'sustainability' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(Array.isArray(sustainability.metrics) ? sustainability.metrics as Array<Record<string, unknown>> : []).map((m, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="text-slate-400 text-xs">{String(m.name)}</div>
                    <div className="text-xl font-bold text-white mt-1">{String(m.value)}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">Target: {String(m.target)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${m.status === 'on_target' ? 'bg-green-500/20 text-green-400' : m.status === 'below_target' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {m.status === 'on_target' ? 'On Target' : m.status === 'below_target' ? 'Below Target' : 'Needs Work'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => procurementAPI.generateSustainabilityReport()} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">Generate Sustainability Report</button>
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-white font-semibold mb-4">Bill Comparison — Eskom vs Renewable PPAs</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-slate-400 text-sm">Eskom Tariff</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">R1.98/kWh</div>
                    <div className="text-xs text-slate-500 mt-1">Megaflex (peak)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400 text-sm">PPA Blended Rate</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">R{((Number(budget.blended_rate_cents_kwh) || 142) / 100).toFixed(2)}/kWh</div>
                    <div className="text-xs text-slate-500 mt-1">Solar + Wind blend</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400 text-sm">Savings</div>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">{Math.round(((198 - (Number(budget.blended_rate_cents_kwh) || 142)) / 198) * 100)}%</div>
                    <div className="text-xs text-slate-500 mt-1">vs Eskom peak rate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
