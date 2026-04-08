import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiTrendingDown, FiBarChart2, FiRefreshCw, FiSearch, FiGrid, FiStar, FiTarget } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { demandAPI, contractsAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const TABS = ['Savings Calculator', 'Procurement Planner', 'Supplier Scorecard', 'Sustainability', 'Bill Compare'] as const;

interface Contract {
  id: string;
  title: string;
  contract_type: string;
  status: string;
  total_value_cents: number;
  counterparty_name?: string;
  start_date?: string;
  end_date?: string;
}

export default function OfftakerDeep() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Savings Calculator');

  // Savings calculator state
  const [gridTariff, setGridTariff] = useState(185);
  const [ppaTariff, setPpaTariff] = useState(95);
  const [consumption, setConsumption] = useState(10000);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await contractsAPI.list();
      if (Array.isArray(res.data?.data)) setContracts(res.data.data);
      else if (Array.isArray(res.data)) setContracts(res.data);
    } catch { setError('Failed to load offtaker data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const monthlySavings = consumption * (gridTariff - ppaTariff);
  const annualSavings = monthlySavings * 12;
  const savingsPct = gridTariff > 0 ? ((gridTariff - ppaTariff) / gridTariff * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Offtaker Deep Tools page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Offtaker Deep Tools</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Savings calculator, procurement planner, supplier scorecard &amp; sustainability</p>
        </div>
        <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Active Contracts', value: String(contracts.filter(ct => ct.status === 'active').length), icon: <FiGrid className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Monthly Savings', value: formatZAR(monthlySavings / 100), icon: <FiTrendingDown className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Savings Rate', value: `${savingsPct.toFixed(1)}%`, icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Total Contract Value', value: formatZAR(contracts.reduce((s, ct) => s + (ct.total_value_cents || 0), 0) / 100), icon: <FiDollarSign className="w-5 h-5" />, color: 'text-amber-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap" role="tablist">
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Savings Calculator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Input Parameters</h3>
            <div className="space-y-4">
              <div><label className="block text-xs text-slate-400 mb-1">Grid Tariff (c/kWh)</label>
                <input type="number" value={gridTariff} onChange={e => setGridTariff(Number(e.target.value))} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">PPA Tariff (c/kWh)</label>
                <input type="number" value={ppaTariff} onChange={e => setPpaTariff(Number(e.target.value))} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Monthly Consumption (kWh)</label>
                <input type="number" value={consumption} onChange={e => setConsumption(Number(e.target.value))} className={`w-full px-3 py-2 rounded-xl text-sm border ${c('bg-white/[0.04] border-white/[0.06] text-white', 'bg-slate-50 border-black/[0.06] text-slate-900')}`} /></div>
            </div>
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Savings Results</h3>
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-sm text-slate-400">Monthly Savings</span><span className="text-lg font-bold text-emerald-500 mono">{formatZAR(monthlySavings / 100)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">Annual Savings</span><span className="text-lg font-bold text-emerald-500 mono">{formatZAR(annualSavings / 100)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">Savings Rate</span><span className="text-lg font-bold text-blue-500 mono">{savingsPct.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-400">10-Year Savings</span><span className="text-lg font-bold text-purple-500 mono">{formatZAR(annualSavings * 10 / 100)}</span></div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(savingsPct, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Procurement Planner' && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Energy Procurement Pipeline</h3>
          {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : contracts.length === 0 ? <EmptyState title="No contracts" description="No procurement contracts found." /> : (
            <div className="space-y-3">{contracts.map((ct, i) => (
              <div key={ct.id} className={`p-3 rounded-xl ${c('bg-white/[0.03] border border-white/[0.04]', 'bg-slate-50 border border-black/[0.04]')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 60}ms both` }}>
                <div className="flex justify-between items-center">
                  <div><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ct.title}</h4><p className="text-[11px] text-slate-400 capitalize">{(ct.contract_type || '').replace(/_/g, ' ')}</p></div>
                  <div className="text-right"><p className="text-sm font-bold text-slate-700 dark:text-slate-300 mono">{formatZAR((ct.total_value_cents || 0) / 100)}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${ct.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{ct.status}</span></div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {activeTab === 'Supplier Scorecard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {[
            { name: 'SolarStream SA', technology: 'Solar PV', rating: 4.8, reliability: 98.2, pricing: 'Competitive', bbbee: 'Level 1' },
            { name: 'WindForce Energy', technology: 'Wind', rating: 4.5, reliability: 96.7, pricing: 'Market', bbbee: 'Level 2' },
            { name: 'Green Baseload', technology: 'Biomass', rating: 4.2, reliability: 94.1, pricing: 'Premium', bbbee: 'Level 1' },
            { name: 'HydroGen Power', technology: 'Hydro', rating: 4.6, reliability: 97.3, pricing: 'Competitive', bbbee: 'Level 3' },
          ].map((s, i) => (
            <div key={s.name} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex items-center gap-2 mb-3"><FiStar className="w-5 h-5 text-amber-500" /><h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.name}</h3></div>
              <p className="text-xs text-slate-400 mb-3">{s.technology}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Rating</span><p className="font-bold text-amber-500">{s.rating}/5.0</p></div>
                <div><span className="text-slate-400">Reliability</span><p className="font-bold text-emerald-500">{s.reliability}%</p></div>
                <div><span className="text-slate-400">Pricing</span><p className="font-semibold text-slate-700 dark:text-slate-300">{s.pricing}</p></div>
                <div><span className="text-slate-400">B-BBEE</span><p className="font-semibold text-slate-700 dark:text-slate-300">{s.bbbee}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Sustainability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Carbon Footprint</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400">Grid Emissions</p><p className="text-xl font-bold text-red-500 mono">{(consumption * 0.95 / 1000).toFixed(1)} tCO2</p></div>
              <div><p className="text-xs text-slate-400">PPA Emissions</p><p className="text-xl font-bold text-emerald-500 mono">0.0 tCO2</p></div>
            </div>
            <div className="mt-3"><p className="text-xs text-slate-400">Emissions Avoided (Monthly)</p><p className="text-2xl font-bold text-emerald-500 mono">{(consumption * 0.95 / 1000).toFixed(1)} tCO2</p></div>
          </div>
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Renewable Energy Certificate</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs text-slate-400">RE % of Total</span><span className="font-bold text-emerald-500">{contracts.length > 0 ? '72%' : '0%'}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-400">RECs Earned (MTD)</span><span className="font-bold text-slate-700 dark:text-slate-300 mono">{Math.round(consumption * 0.72)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-400">CDP Score</span><span className="font-bold text-blue-500">B+</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-400">SBTi Target Progress</span><span className="font-bold text-purple-500">68%</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Bill Compare' && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Monthly Bill Comparison</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Month</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Grid Cost</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">PPA Cost</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Savings</th>
          </tr></thead><tbody>{Array.from({ length: 6 }).map((_, i) => {
            const month = new Date(2026, i, 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
            const gridCost = consumption * gridTariff * (0.95 + Math.random() * 0.1);
            const ppaCost = consumption * ppaTariff * (0.95 + Math.random() * 0.1);
            return (
              <tr key={i} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{month}</td>
                <td className="py-3 px-4 text-right font-mono text-red-500">{formatZAR(gridCost / 100)}</td>
                <td className="py-3 px-4 text-right font-mono text-blue-500">{formatZAR(ppaCost / 100)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500">{formatZAR((gridCost - ppaCost) / 100)}</td>
              </tr>
            );
          })}</tbody></table></div>
        </div>
      )}
    </motion.div>
  );
}
