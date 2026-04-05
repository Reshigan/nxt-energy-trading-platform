import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGlobe, FiTrendingUp, FiRefreshCw, FiPlus, FiArrowRight } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { carbonAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuthStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

const SDG_BADGES: Record<string, string> = {
  '7': 'Affordable Energy', '9': 'Industry & Innovation', '11': 'Sustainable Cities',
  '12': 'Responsible Consumption', '13': 'Climate Action', '14': 'Life Below Water', '15': 'Life on Land',
};
const CHART_COLORS = ['#d4e157', '#4caf50', '#42a5f5', '#ff9800', '#ef5350', '#ab47bc'];

export default function Carbon() {
  const tc = useThemeClasses();
  const { activeRole } = useAuthStore();
  const [tab, setTab] = useState<'inventory' | 'options' | 'fund' | 'registry' | 'tokens' | 'recs'>('inventory');
  const [credits, setCredits] = useState<Array<Record<string, unknown>>>([]);
  const [options, setOptions] = useState<Array<Record<string, unknown>>>([]);
  const [fundNAV, setFundNAV] = useState<Record<string, unknown> | null>(null);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWriteOptionModal, setShowWriteOptionModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Record<string, unknown> | null>(null);
  const [selectedOption, setSelectedOption] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Forms
  const [retireForm, setRetireForm] = useState({ quantity: '', purpose: 'compliance', beneficiary: '', statement: '' });
  const [transferForm, setTransferForm] = useState({ quantity: '', recipient_id: '', recipient_org: '', notes: '' });
  const [optionForm, setOptionForm] = useState({ type: 'call', style: 'european', underlying_credit_id: '', strike_price: '', premium: '', quantity: '', expiry: '', settlement: 'physical' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'inventory') {
        const res = await carbonAPI.getCredits();
        setCredits(res.data.data || []);
      } else if (tab === 'options') {
        const res = await carbonAPI.getOptions();
        setOptions(res.data.data || []);
      } else if (tab === 'fund') {
        const res = await carbonAPI.getFundNAV();
        setFundNAV(res.data.data || null);
      }
    } catch { /* ignore */ }
  };

  const handleRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;
    setLoading(true);
    try {
      await carbonAPI.retireCredit(selectedCredit.id as string, {
        quantity: parseFloat(retireForm.quantity),
        purpose: retireForm.purpose,
        beneficiary: retireForm.beneficiary,
        retirement_statement: retireForm.statement,
      });
      setShowRetireModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) return;
    setLoading(true);
    try {
      await carbonAPI.transferCredit(selectedCredit.id as string, {
        quantity: parseFloat(transferForm.quantity),
        recipient_id: transferForm.recipient_id,
        recipient_org: transferForm.recipient_org,
        notes: transferForm.notes,
      });
      setShowTransferModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleWriteOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await carbonAPI.createOption({
        ...optionForm,
        strike_price: parseFloat(optionForm.strike_price),
        premium: parseFloat(optionForm.premium),
        quantity: parseFloat(optionForm.quantity),
      });
      setShowWriteOptionModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleExercise = async () => {
    if (!selectedOption) return;
    setLoading(true);
    try {
      await carbonAPI.exerciseOption(selectedOption.id as string);
      setShowExerciseModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSync = async (registry: string) => {
    try { await carbonAPI.syncRegistry(registry); } catch { /* ignore */ }
  };

  const inputClass = `w-full px-3 py-2 ${tc.input} rounded-lg text-sm`;

  // Metrics
  const available = credits.filter((c) => c.status === 'active').length;
  const retired = credits.filter((c) => c.status === 'retired').length;
  const totalValue = credits.reduce((sum, c) => sum + ((c.price_cents as number) || 0) * ((c.quantity as number) || 0), 0) / 100;

  // Chart data
  const inventoryChart = ['solar', 'wind', 'hydro', 'biomass', 'other'].map((tech) => ({
    name: tech, value: credits.filter((c) => c.project_type === tech || c.technology === tech).length,
  }));

  const tabs = [
    { id: 'inventory' as const, label: 'Inventory' },
    { id: 'options' as const, label: 'Options' },
    { id: 'fund' as const, label: 'Fund Management' },
    { id: 'registry' as const, label: 'Registry' },
    { id: 'tokens' as const, label: 'Tokens' },
    { id: 'recs' as const, label: 'RECs' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Carbon Credits</h1>

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Available', value: available, color: 'text-emerald-400' },
          { label: 'Retired', value: retired, color: 'text-slate-400' },
          { label: 'Options', value: options.length, color: 'text-blue-400' },
          { label: 'Total Value', value: `R${totalValue.toLocaleString()}`, color: 'text-blue-400' },
          { label: 'Pending', value: credits.filter((c) => c.status === 'pending').length, color: 'text-orange-400' },
        ].map((m) => (
          <div key={m.label} className={`${tc.cardBg} p-4 text-center`}>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          {/* Bar Chart */}
          <div className={`${tc.cardBg} p-6`}>
            <h3 className="text-sm font-semibold mb-4">Credits by Technology</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inventoryChart}>
                <XAxis dataKey="name" stroke={tc.chartAxis} fontSize={12} />
                <YAxis stroke={tc.chartAxis} fontSize={12} />
                <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Credits Table */}
          <div className={`${tc.cardBg} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Credit Inventory</h3>
            </div>
            {credits.length === 0 ? <p className="text-sm text-slate-400">No credits found</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                    <th className="text-left py-2">Serial</th><th className="text-left py-2">Registry</th>
                    <th className="text-left py-2">Vintage</th><th className="text-left py-2">Qty</th>
                    <th className="text-left py-2">Status</th><th className="text-left py-2">SDGs</th>
                    <th className="text-right py-2">Actions</th>
                  </tr></thead>
                  <tbody>
                    {credits.map((c) => (
                      <tr key={c.id as string} className="border-t border-slate-200 dark:border-white/[0.06]">
                        <td className="py-2 font-mono text-xs">{(c.serial_number as string) || c.id as string}</td>
                        <td>{c.registry as string}</td>
                        <td>{c.vintage as string}</td>
                        <td>{c.quantity as number}</td>
                        <td><StatusBadge status={c.status as string} /></td>
                        <td>
                          <div className="flex gap-1">
                            {((c.sdg_goals as string) || '7,13').split(',').slice(0, 3).map((sdg) => (
                              <span key={sdg} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400" title={SDG_BADGES[sdg.trim()] || `SDG ${sdg}`}>
                                SDG{sdg.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-right space-x-2">
                          {c.status === 'active' && (
                            <>
                              <button onClick={() => { setSelectedCredit(c); setShowRetireModal(true); }} className="text-xs text-orange-400 hover:text-orange-300">Retire</button>
                              <button onClick={() => { setSelectedCredit(c); setShowTransferModal(true); }} className="text-xs text-blue-400 hover:text-blue-300">Transfer</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Tab */}
      {tab === 'options' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {(activeRole === 'trader' || activeRole === 'carbon_fund' || activeRole === 'admin') && (
              <button onClick={() => setShowWriteOptionModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg text-sm font-medium">
                <FiPlus className="w-4 h-4" /> Write Option
              </button>
            )}
          </div>
          <div className={`${tc.cardBg} p-6`}>
            {options.length === 0 ? <p className="text-sm text-slate-400">No options found</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                    <th className="text-left py-2">Type</th><th className="text-left py-2">Style</th>
                    <th className="text-left py-2">Strike</th><th className="text-left py-2">Premium</th>
                    <th className="text-left py-2">Qty</th><th className="text-left py-2">Expiry</th>
                    <th className="text-left py-2">Status</th><th className="text-right py-2">Actions</th>
                  </tr></thead>
                  <tbody>
                    {options.map((o) => (
                      <tr key={o.id as string} className="border-t border-slate-200 dark:border-white/[0.06]">
                        <td className="py-2 capitalize">{o.type as string}</td>
                        <td className="capitalize">{o.style as string}</td>
                        <td>R{((o.strike_price_cents as number) / 100).toFixed(2)}</td>
                        <td>R{((o.premium_cents as number) / 100).toFixed(2)}</td>
                        <td>{o.quantity as number}</td>
                        <td className="text-xs">{o.expiry as string}</td>
                        <td><StatusBadge status={o.status as string} /></td>
                        <td className="text-right">
                          {o.status === 'active' && (
                            <button onClick={() => { setSelectedOption(o); setShowExerciseModal(true); }} className="text-xs text-blue-400 hover:text-blue-500">Exercise</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fund Management Tab */}
      {tab === 'fund' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Fund NAV', value: fundNAV ? `R${((fundNAV.nav_cents as number) / 100).toLocaleString()}` : 'R0' },
              { label: 'AUM', value: fundNAV ? `R${((fundNAV.aum_cents as number) / 100).toLocaleString()}` : 'R0' },
              { label: 'Investors', value: fundNAV?.investor_count || 0 },
              { label: 'YTD Return', value: fundNAV ? `${fundNAV.ytd_return || 0}%` : '0%' },
            ].map((m) => (
              <div key={m.label} className={`${tc.cardBg} p-4 text-center`}>
                <div className="text-xl font-bold text-blue-400">{String(m.value)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          {/* Composition Pie Chart */}
          <div className={`${tc.cardBg} p-6`}>
            <h3 className="text-sm font-semibold mb-4">Fund Composition</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[{ name: 'Solar', value: 35 }, { name: 'Wind', value: 25 }, { name: 'Hydro', value: 15 }, { name: 'Biomass', value: 15 }, { name: 'Other', value: 10 }]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ background: tc.chartTooltipBg, border: `1px solid ${tc.chartTooltipBorder}`, borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Registry Tab */}
      {tab === 'registry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: 'Gold Standard', credits: credits.filter((c) => c.registry === 'gold_standard').length, status: 'Connected' },
            { name: 'Verra (VCS)', credits: credits.filter((c) => c.registry === 'verra').length, status: 'Connected' },
          ].map((reg) => (
            <div key={reg.name} className={`${tc.cardBg} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{reg.name}</h3>
                <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">{reg.status}</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-2">{reg.credits} credits</div>
              <button onClick={() => handleSync(reg.name.toLowerCase().replace(/[^a-z]/g, '_'))}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 dark:hover:text-white mt-4">
                <FiRefreshCw className="w-4 h-4" /> Sync Registry
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tokens Tab */}
      {tab === 'tokens' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Tokenised', value: '12,450 tCO2e', color: 'text-blue-400' },
              { label: 'On-Chain Value', value: 'R2.4M', color: 'text-emerald-400' },
              { label: 'Pending Mint', value: '850 tCO2e', color: 'text-orange-400' },
              { label: 'Burned', value: '3,200 tCO2e', color: 'text-red-400' },
            ].map((m) => (
              <div key={m.label} className={`${tc.cardBg} p-4 text-center`}>
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          <div className={`${tc.cardBg} p-6`}>
            <h3 className="text-sm font-semibold mb-4">Tokenised Carbon Assets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                  <th className="text-left py-2">Token ID</th><th className="text-left py-2">Standard</th>
                  <th className="text-left py-2">Vintage</th><th className="text-right py-2">Quantity</th>
                  <th className="text-left py-2">Chain</th><th className="text-left py-2">Status</th>
                </tr></thead>
                <tbody>
                  {[
                    { id: 'NXT-VCS-2024-001', standard: 'Verra VCS', vintage: '2024', qty: '5,000', chain: 'Polygon', status: 'minted' },
                    { id: 'NXT-GS-2024-002', standard: 'Gold Standard', vintage: '2024', qty: '3,200', chain: 'Polygon', status: 'minted' },
                    { id: 'NXT-VCS-2023-015', standard: 'Verra VCS', vintage: '2023', qty: '4,250', chain: 'Polygon', status: 'minted' },
                    { id: 'NXT-GS-2024-003', standard: 'Gold Standard', vintage: '2024', qty: '850', chain: 'Polygon', status: 'pending' },
                  ].map((t) => (
                    <tr key={t.id} className="border-t border-slate-200 dark:border-white/[0.06]">
                      <td className="py-2 font-mono text-xs text-blue-400">{t.id}</td>
                      <td>{t.standard}</td>
                      <td>{t.vintage}</td>
                      <td className="text-right">{t.qty}</td>
                      <td><span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">{t.chain}</span></td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECs Tab */}
      {tab === 'recs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active RECs', value: '8,200 MWh', color: 'text-blue-400' },
              { label: 'Redeemed', value: '15,400 MWh', color: 'text-emerald-400' },
              { label: 'Pending Issuance', value: '2,100 MWh', color: 'text-orange-400' },
              { label: 'Total Value', value: 'R1.8M', color: 'text-blue-400' },
            ].map((m) => (
              <div key={m.label} className={`${tc.cardBg} p-4 text-center`}>
                <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          <div className={`${tc.cardBg} p-6`}>
            <h3 className="text-sm font-semibold mb-4">Renewable Energy Certificates</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 dark:text-slate-400 text-xs">
                  <th className="text-left py-2">Certificate</th><th className="text-left py-2">Technology</th>
                  <th className="text-left py-2">Issuer</th><th className="text-right py-2">MWh</th>
                  <th className="text-left py-2">Period</th><th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Action</th>
                </tr></thead>
                <tbody>
                  {[
                    { id: 'REC-ZA-2024-00145', tech: 'Solar PV', issuer: 'NERSA', mwh: '3,500', period: 'Q1 2024', status: 'active' },
                    { id: 'REC-ZA-2024-00146', tech: 'Wind', issuer: 'NERSA', mwh: '2,800', period: 'Q1 2024', status: 'active' },
                    { id: 'REC-ZA-2024-00147', tech: 'Solar PV', issuer: 'NERSA', mwh: '1,900', period: 'Q4 2023', status: 'redeemed' },
                    { id: 'REC-ZA-2024-00148', tech: 'Biomass', issuer: 'NERSA', mwh: '2,100', period: 'Q1 2024', status: 'pending' },
                  ].map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 dark:border-white/[0.06]">
                      <td className="py-2 font-mono text-xs">{r.id}</td>
                      <td>{r.tech}</td>
                      <td>{r.issuer}</td>
                      <td className="text-right">{r.mwh}</td>
                      <td>{r.period}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="text-right">
                        {r.status === 'active' && (
                          <button className="text-xs text-orange-400 hover:text-orange-300">Redeem</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Retire Modal */}
      <Modal isOpen={showRetireModal} onClose={() => setShowRetireModal(false)} title="Retire Carbon Credits">
        <form onSubmit={handleRetire} className="space-y-4">
          <div className={`p-3 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} text-sm`}>
            <strong>Credit:</strong> {selectedCredit?.serial_number as string} — Available: {selectedCredit?.quantity as number}
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantity to Retire *</label>
            <input className={inputClass} type="number" step="1" required value={retireForm.quantity} onChange={(e) => setRetireForm({ ...retireForm, quantity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Purpose *</label>
            <select className={inputClass} value={retireForm.purpose} onChange={(e) => setRetireForm({ ...retireForm, purpose: e.target.value })}>
              {['compliance', 'voluntary', 'offsetting', 'csr', 'ndc_contribution'].map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Beneficiary</label>
            <input className={inputClass} value={retireForm.beneficiary} onChange={(e) => setRetireForm({ ...retireForm, beneficiary: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Retirement Statement</label>
            <textarea className={inputClass} rows={2} value={retireForm.statement} onChange={(e) => setRetireForm({ ...retireForm, statement: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Retiring...' : 'Retire Credits'}
          </button>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Carbon Credits">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantity *</label>
            <input className={inputClass} type="number" step="1" required value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Recipient Account ID *</label>
            <input className={inputClass} required value={transferForm.recipient_id} onChange={(e) => setTransferForm({ ...transferForm, recipient_id: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Recipient Organisation</label>
            <input className={inputClass} value={transferForm.recipient_org} onChange={(e) => setTransferForm({ ...transferForm, recipient_org: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <textarea className={inputClass} rows={2} value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Transferring...' : 'Transfer Credits'}
          </button>
        </form>
      </Modal>

      {/* Write Option Modal */}
      <Modal isOpen={showWriteOptionModal} onClose={() => setShowWriteOptionModal(false)} title="Write Carbon Option" size="lg">
        <form onSubmit={handleWriteOption} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Option Type *</label>
              <select className={inputClass} value={optionForm.type} onChange={(e) => setOptionForm({ ...optionForm, type: e.target.value })}>
                {['call', 'put', 'collar', 'spread', 'barrier', 'asian'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Style *</label>
              <select className={inputClass} value={optionForm.style} onChange={(e) => setOptionForm({ ...optionForm, style: e.target.value })}>
                <option value="european">European</option>
                <option value="american">American</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Strike Price (R) *</label>
              <input className={inputClass} type="number" step="0.01" required value={optionForm.strike_price} onChange={(e) => setOptionForm({ ...optionForm, strike_price: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Premium (R) *</label>
              <input className={inputClass} type="number" step="0.01" required value={optionForm.premium} onChange={(e) => setOptionForm({ ...optionForm, premium: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantity *</label>
              <input className={inputClass} type="number" step="1" required value={optionForm.quantity} onChange={(e) => setOptionForm({ ...optionForm, quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Expiry Date *</label>
              <input className={inputClass} type="date" required value={optionForm.expiry} onChange={(e) => setOptionForm({ ...optionForm, expiry: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Settlement</label>
              <select className={inputClass} value={optionForm.settlement} onChange={(e) => setOptionForm({ ...optionForm, settlement: e.target.value })}>
                <option value="physical">Physical</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Underlying Credit ID</label>
              <input className={inputClass} value={optionForm.underlying_credit_id} onChange={(e) => setOptionForm({ ...optionForm, underlying_credit_id: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Write Option'}
          </button>
        </form>
      </Modal>

      {/* Exercise Option Modal */}
      <Modal isOpen={showExerciseModal} onClose={() => setShowExerciseModal(false)} title="Exercise Option">
        {selectedOption && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${tc.isDark ? "bg-white/[0.04]" : "bg-slate-50"} space-y-2 text-sm`}>
              <div><strong>Type:</strong> {selectedOption.type as string} ({selectedOption.style as string})</div>
              <div><strong>Strike:</strong> R{((selectedOption.strike_price_cents as number) / 100).toFixed(2)}</div>
              <div><strong>Quantity:</strong> {selectedOption.quantity as number}</div>
              <div><strong>Expiry:</strong> {selectedOption.expiry as string}</div>
              {selectedOption.style === 'american' && (
                <div className="p-2 rounded bg-yellow-500/10 text-yellow-400 text-xs mt-2">
                  American style: Can be exercised any time before expiry
                </div>
              )}
            </div>
            <button onClick={handleExercise} disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Exercising...' : 'Confirm Exercise'}
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
