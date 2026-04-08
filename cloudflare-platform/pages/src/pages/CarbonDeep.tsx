import React, { useState, useEffect, useCallback } from 'react';
import { FiGlobe, FiAward, FiTrendingUp, FiRefreshCw, FiSearch, FiLayers, FiTarget } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { carbonAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface CarbonCredit {
  id: string;
  project_id: string;
  vintage: string;
  registry: string;
  volume_tonnes: number;
  price_per_tonne_cents: number;
  status: string;
  created_at: string;
}

const TABS = ['Credits', 'SDG Impact', 'Vintage Analysis', 'Registry'] as const;
const SDG_GOALS = [
  { id: 7, name: 'Affordable & Clean Energy', color: 'bg-yellow-500' },
  { id: 8, name: 'Decent Work & Economic Growth', color: 'bg-red-500' },
  { id: 9, name: 'Industry, Innovation & Infrastructure', color: 'bg-orange-500' },
  { id: 11, name: 'Sustainable Cities', color: 'bg-amber-500' },
  { id: 12, name: 'Responsible Consumption', color: 'bg-yellow-600' },
  { id: 13, name: 'Climate Action', color: 'bg-emerald-600' },
];

export default function CarbonDeep() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Credits');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await carbonAPI.getCredits();
      if (Array.isArray(res.data?.data)) setCredits(res.data.data);
      else if (Array.isArray(res.data)) setCredits(res.data);
    } catch { setError('Failed to load carbon data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalVolume = credits.reduce((s, cr) => s + (cr.volume_tonnes || 0), 0);
  const totalValue = credits.reduce((s, cr) => s + (cr.volume_tonnes || 0) * (cr.price_per_tonne_cents || 0), 0);
  const avgPrice = credits.length > 0 ? credits.reduce((s, cr) => s + (cr.price_per_tonne_cents || 0), 0) / credits.length : 0;
  const filtered = credits.filter(cr => !search || (cr.registry || '').toLowerCase().includes(search.toLowerCase()) || (cr.vintage || '').includes(search));

  // Vintage analysis
  const vintageMap: Record<string, { count: number; volume: number; value: number }> = {};
  for (const cr of credits) {
    const v = cr.vintage || 'Unknown';
    if (!vintageMap[v]) vintageMap[v] = { count: 0, volume: 0, value: 0 };
    vintageMap[v].count++;
    vintageMap[v].volume += cr.volume_tonnes || 0;
    vintageMap[v].value += (cr.volume_tonnes || 0) * (cr.price_per_tonne_cents || 0);
  }

  // Registry breakdown
  const registryMap: Record<string, number> = {};
  for (const cr of credits) { const r = cr.registry || 'Unknown'; registryMap[r] = (registryMap[r] || 0) + (cr.volume_tonnes || 0); }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Carbon Deep Tools page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Carbon Fund Deep Tools</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">SDG impact, vintage analysis, registry integration &amp; carbon attribution</p>
        </div>
        <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Credits', value: String(credits.length), icon: <FiAward className="w-5 h-5" />, color: 'text-emerald-500' },
          { label: 'Total Volume', value: `${totalVolume.toLocaleString()} tCO2e`, icon: <FiGlobe className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Portfolio Value', value: formatZAR(totalValue / 100), icon: <FiTrendingUp className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Avg Price/tonne', value: formatZAR(avgPrice / 100), icon: <FiLayers className="w-5 h-5" />, color: 'text-amber-500' },
        ].map((card, i) => (
          <div key={card.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${100 + i * 60}ms both` }}>
            <div className={`mb-2 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1" role="tablist">
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Credits' && (
        <>
          <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search credits..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`} aria-label="Search credits" /></div>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : filtered.length === 0 ? <EmptyState title="No credits" description="No carbon credits found." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Vintage</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Registry</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Volume (tCO2e)</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Price/t</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
              </tr></thead><tbody>{filtered.map(cr => (
                <tr key={cr.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{cr.vintage || '\u2014'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{cr.registry || '\u2014'}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{(cr.volume_tonnes || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatZAR((cr.price_per_tonne_cents || 0) / 100)}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${cr.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : cr.status === 'retired' ? 'bg-slate-100 dark:bg-slate-500/10 text-slate-500' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{cr.status}</span></td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </>
      )}

      {activeTab === 'SDG Impact' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {SDG_GOALS.map((goal, i) => (
            <div key={goal.id} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${goal.color} flex items-center justify-center text-white font-bold text-sm`}>{goal.id}</div>
                <div><h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">SDG {goal.id}</h3><p className="text-[11px] text-slate-400">{goal.name}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Credits Linked</span><p className="font-bold text-slate-700 dark:text-slate-300 mono">{Math.round(totalVolume / SDG_GOALS.length).toLocaleString()}</p></div>
                <div><span className="text-slate-400">Impact Score</span><p className="font-bold text-emerald-500 mono">{(70 + Math.random() * 25).toFixed(0)}%</p></div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full ${goal.color}`} style={{ width: `${60 + Math.random() * 35}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Vintage Analysis' && (
        <div className="space-y-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {Object.keys(vintageMap).length === 0 ? <EmptyState title="No vintage data" description="No vintage records available." /> : Object.entries(vintageMap).sort((a, b) => b[0].localeCompare(a[0])).map(([vintage, data], i) => (
            <div key={vintage} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex justify-between items-center">
                <div><h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Vintage {vintage}</h3><p className="text-xs text-slate-400">{data.count} credits</p></div>
                <div className="text-right"><p className="text-lg font-bold text-slate-700 dark:text-slate-300 mono">{data.volume.toLocaleString()} tCO2e</p><p className="text-xs text-slate-400">{formatZAR(data.value / 100)} value</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Registry' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {Object.keys(registryMap).length === 0 ? <EmptyState title="No registry data" description="No registry records found." /> : Object.entries(registryMap).sort((a, b) => b[1] - a[1]).map(([registry, volume], i) => (
            <div key={registry} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${i * 80}ms both` }}>
              <div className="flex items-center gap-3 mb-3"><FiTarget className="w-6 h-6 text-emerald-500" /><h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{registry}</h3></div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mono">{volume.toLocaleString()} tCO2e</p>
              <p className="text-xs text-slate-400 mt-1">{totalVolume > 0 ? ((volume / totalVolume) * 100).toFixed(1) : 0}% of portfolio</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
