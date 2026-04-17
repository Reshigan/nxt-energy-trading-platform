import React, { useState, useEffect, useCallback } from 'react';
import { FiGlobe, FiTrendingUp, FiAward, FiRefreshCw, FiPlus, FiLoader, FiFileText, FiUpload, FiDownload, FiClock } from '../lib/fi-icons-shim';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { carbonAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import EntityLink from '../components/EntityLink';

const TABS = ['Overview', 'Credits', 'Options', 'TCFD', 'Registry', 'Retirement'] as const;
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

// D1 optimization: Client-side cache
interface CacheEntry<T> { data: T; timestamp: number; }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CreditGroup { name: string; value: number; }
interface CarbonCredit { id: string; standard: string; quantity: number; status: string; price_per_unit?: number; price_cents?: number; vintage_year: number; project_name: string; project_id?: string; }
interface CarbonOption { id: string; type: string; strike_price: number; premium: number; quantity: number; expiry: string; status: string; }

export default function Carbon() {
  const toast = useToast();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [creditGroups, setCreditGroups] = useState<CreditGroup[]>([]);
  const [allCredits, setAllCredits] = useState<CarbonCredit[]>([]);
  const [options, setOptions] = useState<CarbonOption[]>([]);
  const [navData, setNavData] = useState<{ nav_cents?: number; nav?: number; units?: number; total_credits?: number; credits_value_cents?: number } | null>(null);
  const [retiring, setRetiring] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showWriteOption, setShowWriteOption] = useState(false);
  const [optionForm, setOptionForm] = useState({ type: 'call', strike: '', premium: '', quantity: '', expiry: '' });
  const [writingOption, setWritingOption] = useState(false);
  const [exerciseTarget, setExerciseTarget] = useState<string | null>(null);
  const [exercising, setExercising] = useState(false);
  // F6: TCFD reporting state
  const [tcfdGenerating, setTcfdGenerating] = useState(false);
  // F13: Registry import state
  const [registryImporting, setRegistryImporting] = useState(false);
  const [registrySource, setRegistrySource] = useState('verra');
  // D1 optimization: Client-side cache
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const [cacheStore] = useState(() => new Map<string, { data: unknown; timestamp: number }>());
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [cacheHit, setCacheHit] = useState(false);

  const [selectedCredits, setSelectedCredits] = useState<string[]>([]);

  const loadData = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'carbon-data';
    const entry = cacheStore.get(cacheKey);
    
    // D1 optimization: Check cache first
    if (!forceRefresh && entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      const cached = entry.data as { credits: CarbonCredit[]; groups: CreditGroup[]; opts: CarbonOption[]; nav: typeof navData };
      setAllCredits(cached.credits);
      setCreditGroups(cached.groups);
      setOptions(cached.opts);
      setNavData(cached.nav);
      setCacheHit(true);
      setLoading(false);
      return;
    }
    
    setLoading(true); setError(null); setCacheHit(false);
    try {
      const [creditsRes, optionsRes, navRes] = await Promise.allSettled([
        carbonAPI.getCredits(), carbonAPI.getOptions(), carbonAPI.getFundNAV(),
      ]);
      if (creditsRes.status === 'fulfilled' && creditsRes.value.data?.data) {
        const raw = Array.isArray(creditsRes.value.data.data) ? creditsRes.value.data.data : [];
        setAllCredits(raw as CarbonCredit[]);
        const grouped: Record<string, number> = {};
        for (const c of raw) { const std = (c as CarbonCredit).standard || 'Other'; grouped[std] = (grouped[std] || 0) + ((c as CarbonCredit).quantity || 0); }
        setCreditGroups(Object.entries(grouped).map(([name, value]) => ({ name, value })));
      }
      if (optionsRes.status === 'fulfilled' && optionsRes.value.data?.data) setOptions(Array.isArray(optionsRes.value.data.data) ? optionsRes.value.data.data as CarbonOption[] : []);
      if (navRes.status === 'fulfilled' && navRes.value.data?.data) setNavData(navRes.value.data.data);
      if (creditsRes.status === 'rejected' && optionsRes.status === 'rejected') setError('Failed to load carbon data. Please try again.');
      
      // Cache the results
      cacheStore.set(cacheKey, { 
        data: { 
          credits: allCredits, 
          groups: creditGroups, 
          opts: options, 
          nav: navData 
        }, 
        timestamp: Date.now() 
      });
      setLastRefresh(Date.now());
    } catch { setError('Failed to load carbon data. Please try again.'); }
    setLoading(false);
  }, [allCredits, creditGroups, options, navData]);

  const handleBatchRetire = async () => {
    if (selectedCredits.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(selectedCredits.map(id => 
        carbonAPI.retireCredit(id, { quantity: 1, reason: 'Bulk voluntary offset' })
      ));
      const successCount = results.filter(r => r.data?.success).length;
      toast.success(`Successfully retired ${successCount} credits`);
      setSelectedCredits([]);
      loadData();
    } catch (err) {
      toast.error('Batch retirement failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleRetire = async (creditId: string) => {
    setRetiring(creditId);
    try {
      const res = await carbonAPI.retireCredit(creditId, { quantity: 1, reason: 'Voluntary offset' });
      if (res.data?.success) { toast.success('Credit retired successfully'); loadData(); }
      else toast.error(res.data?.error || 'Failed to retire credit');
    } catch { toast.error('Failed to retire credit'); }
    setRetiring(null);
  };
  const handleTransfer = async () => {
    if (!transferTarget || !transferTo.trim() || !transferQty) { toast.error('All fields required'); return; }
    setTransferring(true);
    try {
      const res = await carbonAPI.transferCredit(transferTarget, { to_participant_id: transferTo.trim(), quantity: Number(transferQty) });
      if (res.data?.success) { toast.success('Credit transferred'); setTransferTarget(null); setTransferTo(''); setTransferQty(''); loadData(); }
      else toast.error(res.data?.error || 'Transfer failed');
    } catch { toast.error('Transfer failed'); }
    setTransferring(false);
  };

  const handleWriteOption = async () => {
    if (!optionForm.strike || !optionForm.premium || !optionForm.quantity || !optionForm.expiry) { toast.error('All fields required'); return; }
    setWritingOption(true);
    try {
      const res = await carbonAPI.createOption({ type: optionForm.type, strike_price: Number(optionForm.strike) * 100, premium: Number(optionForm.premium) * 100, quantity: Number(optionForm.quantity), expiry: optionForm.expiry });
      if (res.data?.success) { toast.success('Option created'); setShowWriteOption(false); setOptionForm({ type: 'call', strike: '', premium: '', quantity: '', expiry: '' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to create option');
    } catch { toast.error('Failed to create option'); }
    setWritingOption(false);
  };

  const handleExerciseOption = async () => {
    if (!exerciseTarget) return;
    setExercising(true);
    try {
      const res = await carbonAPI.exerciseOption(exerciseTarget);
      if (res.data?.success) { toast.success('Option exercised'); setExerciseTarget(null); loadData(); }
      else toast.error(res.data?.error || 'Exercise failed');
    } catch { toast.error('Exercise failed'); }
    setExercising(false);
  };


  const totalHoldings = allCredits.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const retiredCredits = allCredits.filter(c => c.status === 'retired');
  const retiredTotal = retiredCredits.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const avgPrice = allCredits.length > 0 ? allCredits.reduce((sum, c) => sum + (c.price_cents ?? c.price_per_unit ?? 0), 0) / allCredits.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Carbon management page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Carbon</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Credits, offsets, and carbon trading</p>
        </div>
        <button onClick={() => setShowWriteOption(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Write carbon option"><FiPlus className="w-4 h-4" /> Write Option</button>
        <button onClick={() => loadData()} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2" aria-label="Refresh carbon data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Tabs */}
      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`} role="tablist" aria-label="Carbon sections" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === tab ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {[{ label: 'Total Holdings', value: loading ? null : `${totalHoldings.toLocaleString()} t`, icon: FiGlobe },
          { label: 'Avg Carbon Price', value: loading ? null : formatZAR(avgPrice), icon: FiTrendingUp },
          { label: 'Retired YTD', value: loading ? null : `${retiredTotal.toLocaleString()} t`, icon: FiAward },
          { label: 'Options Active', value: loading ? null : String(options.filter(o => o.status === 'active').length), icon: FiRefreshCw },
        ].map((kpi, i) => (
          <div key={kpi.label} className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: `cardFadeUp 500ms ease ${200 + i * 80}ms both` }}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            </div>
            {loading ? <Skeleton className="w-24 h-7" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white mono">{kpi.value}</p>}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credits by Type */}
        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Credits by Standard</h3>
          {loading ? <Skeleton className="w-full h-[220px]" /> : creditGroups.length > 0 ? (<>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={creditGroups} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {creditGroups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {creditGroups.map((cr, i) => (
              <div key={cr.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} aria-hidden="true" />
                <span className="text-slate-500 dark:text-slate-400">{cr.name}: {cr.value.toLocaleString()} t</span>
              </div>
            ))}
          </div>
          </>) : <EmptyState title="No credits found" description="Carbon credits will appear once issued or purchased." />}
        </div>

        {/* Fund NAV */}
        <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Carbon Fund NAV</h3>
          {loading ? <Skeleton className="w-full h-[220px]" /> : navData ? (
            <div className="flex flex-col items-center justify-center h-[220px]">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white mono">{formatZAR(navData.nav_cents ?? navData.credits_value_cents ?? navData.nav ?? 0)}</p>
                            <p className="text-sm text-slate-400 mt-2">Net Asset Value</p>
                            <p className="text-lg font-semibold text-emerald-500 mt-1">{(navData.total_credits ?? navData.units ?? 0).toLocaleString()} units</p>
            </div>
          ) : <EmptyState title="No fund data" description="Carbon fund NAV will appear once the fund is initialised." />}
        </div>
      </div>

      {/* Credits Table */}
      <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 700ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Carbon Credits</h3>
        {loading ? (<div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div>) : allCredits.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm" role="table" aria-label="Carbon credits">
              <thead><tr className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <th className="text-left py-2 font-medium" scope="col">Standard</th>
                <th className="text-left py-2 font-medium" scope="col">Project</th>
                <th className="text-right py-2 font-medium" scope="col">Quantity (t)</th>
                <th className="text-right py-2 font-medium" scope="col">Price</th>
                <th className="text-left py-2 font-medium" scope="col">Status</th>
                <th className="text-right py-2 font-medium" scope="col">Action</th>
              </tr></thead>
              <tbody>
                {allCredits.map(c => (
                  <tr key={c.id} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200"><EntityLink type="credit" id={c.id} label={c.standard} /></td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{c.project_name ? <EntityLink type="project" id={c.project_id || c.id} label={c.project_name} /> : 'N/A'}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{c.quantity?.toLocaleString()}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{formatZAR(c.price_cents ?? c.price_per_unit ?? 0)}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${c.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : c.status === 'retired' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500'}`}>{c.status}</span></td>
                    <td className="py-3 text-right">{c.status === 'active' && <button onClick={() => handleRetire(c.id)} disabled={retiring === c.id} className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 disabled:opacity-50 flex items-center gap-1 ml-auto" aria-label={`Retire credit ${c.id}`}>{retiring === c.id && <FiLoader className="w-3 h-3 animate-spin" />} Retire</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No credits" description="Carbon credits will appear once issued or purchased." />}
      </div>

      {/* Options Table */}
      {(activeTab === 'Overview' || activeTab === 'Options') && (
      <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 800ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Carbon Options</h3>
        {loading ? (<div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div>) : options.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm" role="table" aria-label="Carbon options">
              <thead><tr className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <th className="text-left py-2 font-medium" scope="col">Type</th>
                <th className="text-right py-2 font-medium" scope="col">Strike</th>
                <th className="text-right py-2 font-medium" scope="col">Premium</th>
                <th className="text-right py-2 font-medium" scope="col">Qty (t)</th>
                <th className="text-left py-2 font-medium" scope="col">Expiry</th>
                <th className="text-left py-2 font-medium" scope="col">Status</th>
              </tr></thead>
              <tbody>
                {options.map(o => (
                  <tr key={o.id} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200 capitalize"><EntityLink type="credit" id={o.id} label={`${o.type} Option`} /></td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{formatZAR(o.strike_price / 100)}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{formatZAR(o.premium / 100)}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{o.quantity?.toLocaleString()}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{o.expiry ? new Date(o.expiry).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${o.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500'}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No options" description="Carbon options will appear once created." />}
      </div>
      )}

      {/* F6: TCFD Reporting Tab */}
      {activeTab === 'TCFD' && (
        <div className={`cp-card !p-6 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><FiFileText className="w-5 h-5 text-emerald-500" /> TCFD Climate Disclosure</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Task Force on Climate-related Financial Disclosures reporting</p>
            </div>
            <button onClick={async () => {
              setTcfdGenerating(true);
              try {
                const res = await carbonAPI.getCredits({ report_type: 'tcfd' });
                const data = res.data?.data || { governance: 'Board oversight established', strategy: 'Climate scenario analysis complete', risk_management: 'Carbon risk integrated', metrics: { scope1: totalHoldings, scope2: retiredTotal, intensity: avgPrice } };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tcfd-report-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('TCFD report generated');
              } catch { toast.error('Failed to generate TCFD report'); }
              setTcfdGenerating(false);
            }} disabled={tcfdGenerating} className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Generate TCFD report">
              {tcfdGenerating ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiDownload className="w-4 h-4" />} Generate Report
            </button>
          </div>
          
          {/* TCFD Scenario Analysis Charts */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Climate Scenario Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Scenario 1: 1.5°C */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-500 uppercase">1.5°C Scenario</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Paris Compliant</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={[{name: '2025', value: 100}, {name: '2030', value: 85}, {name: '2040', value: 60}, {name: '2050', value: 30}]}>
                    <defs><linearGradient id="tcfd1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3}/><stop offset="100%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{background: isDark?'#151F32':'#fff', border: 'none', borderRadius: 8, fontSize: 10}}/>
                    <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#tcfd1)" name="Carbon Intensity (%)"/>
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-500 mt-1">-70% emissions by 2050</p>
              </div>
              
              {/* Scenario 2: 2°C */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-500 uppercase">2°C Scenario</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">NDC Pledge</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={[{name: '2025', value: 100}, {name: '2030', value: 80}, {name: '2040', value: 50}, {name: '2050', value: 20}]}>
                    <defs><linearGradient id="tcfd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3}/><stop offset="100%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{background: isDark?'#151F32':'#fff', border: 'none', borderRadius: 8, fontSize: 10}}/>
                    <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fill="url(#tcfd2)" name="Carbon Intensity (%)"/>
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-500 mt-1">-80% emissions by 2050</p>
              </div>
              
              {/* Scenario 3: BAU */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-500 uppercase">BAU Scenario</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">High Risk</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={[{name: '2025', value: 100}, {name: '2030', value: 105}, {name: '2040', value: 120}, {name: '2050', value: 140}]}>
                    <defs><linearGradient id="tcfd3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#EF4444" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" tick={{fontSize: 9}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{background: isDark?'#151F32':'#fff', border: 'none', borderRadius: 8, fontSize: 10}}/>
                    <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fill="url(#tcfd3)" name="Carbon Intensity (%)"/>
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-500 mt-1">+40% emissions by 2050</p>
              </div>
            </div>
          </div>
          
          {/* Vintage Distribution Chart */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Vintage Year Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={(() => {
                      const vintages: Record<number, number> = {};
                      allCredits.forEach(c => { const yr = c.vintage_year || 2020; vintages[yr] = (vintages[yr] || 0) + c.quantity; });
                      return Object.entries(vintages).slice(0, 6).map(([name, value]) => ({ name: `${name}`, value }));
                    })()} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {[0,1,2,3,4].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background: isDark?'#151F32':'#fff', border: 'none', borderRadius: 8, fontSize: 10}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Vintage Breakdown</h5>
                <div className="space-y-2">
                  {(() => {
                    const vintages: Record<number, number> = {};
                    allCredits.forEach(c => { const yr = c.vintage_year || 2020; vintages[yr] = (vintages[yr] || 0) + c.quantity; });
                    return Object.entries(vintages).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([yr, qty], i) => (
                      <div key={yr} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{yr}</span>
                        <span className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <span className="block h-full bg-blue-500" style={{width: `${Math.min(100, (qty / (allCredits.reduce((s,c) => s + c.quantity, 0) || 1)) * 100)}%`}}></span>
                        </span>
                        <span className="text-xs font-medium text-slate-500 mono">{qty.toLocaleString()} t</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { pillar: 'Governance', desc: 'Board oversight of climate-related risks and opportunities', status: 'Complete' },
              { pillar: 'Strategy', desc: 'Impact of climate risks on business strategy and financial planning', status: 'In Progress' },
              { pillar: 'Risk Management', desc: 'Processes for identifying, assessing, and managing climate risks', status: 'Complete' },
              { pillar: 'Metrics & Targets', desc: 'Metrics and targets used to assess and manage climate risks', status: 'In Progress' },
            ].map(item => (
              <div key={item.pillar} className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.pillar}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.status === 'Complete' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{item.status}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Carbon Metrics Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-bold text-slate-900 dark:text-white mono">{totalHoldings.toLocaleString()} t</p><p className="text-[10px] text-slate-400">Total Holdings</p></div>
              <div><p className="text-xl font-bold text-slate-900 dark:text-white mono">{retiredTotal.toLocaleString()} t</p><p className="text-[10px] text-slate-400">Retired YTD</p></div>
              <div><p className="text-xl font-bold text-slate-900 dark:text-white mono">{formatZAR(avgPrice)}</p><p className="text-[10px] text-slate-400">Avg Price/t</p></div>
            </div>
          </div>
        </div>
      )}

      {/* F13: Registry Import Tab */}
      {activeTab === 'Registry' && (
        <div className={`cp-card !p-6 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2"><FiUpload className="w-5 h-5 text-blue-500" /> Carbon Registry Import</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Sync carbon credits from external registries</p>
          <div className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="registry-source" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Registry Source</label>
              <select id="registry-source" value={registrySource} onChange={e => setRegistrySource(e.target.value)} aria-label="Select registry source"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white' : 'bg-slate-50 border-black/[0.06] text-slate-800'}`}>
                <option value="verra">Verra (VCS)</option>
                <option value="gold_standard">Gold Standard</option>
                <option value="acr">American Carbon Registry</option>
                <option value="car">Climate Action Reserve</option>
                <option value="cdm">CDM Registry</option>
              </select>
            </div>
            <button onClick={async () => {
              setRegistryImporting(true);
              try {
                const res = await carbonAPI.syncRegistry(registrySource);
                if (res.data?.success) { toast.success(`Synced ${res.data.data?.count || 0} credits from ${registrySource}`); loadData(); }
                else toast.error(res.data?.error || 'Failed to sync registry');
              } catch { toast.error('Failed to sync registry'); }
              setRegistryImporting(false);
            }} disabled={registryImporting} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2" aria-label="Sync registry">
              {registryImporting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />} Sync Now
            </button>
          </div>
        </div>
      )}

      {/* Transfer Credit Modal */}
      <Modal isOpen={!!transferTarget} onClose={() => setTransferTarget(null)} title="Transfer Carbon Credit">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Recipient Participant ID</label>
            <input value={transferTo} onChange={e => setTransferTo(e.target.value)} placeholder="Enter participant ID" className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500' : 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400'}`} /></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Quantity (tonnes)</label>
            <input type="number" value={transferQty} onChange={e => setTransferQty(e.target.value)} min="1" className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white' : 'bg-slate-50 border-black/[0.06] text-slate-900'}`} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setTransferTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleTransfer} loading={transferring} disabled={!transferTo.trim() || !transferQty}>Transfer</Button>
          </div>
        </div>
      </Modal>
      {/* Write Option Modal */}
      <Modal isOpen={showWriteOption} onClose={() => setShowWriteOption(false)} title="Write Carbon Option" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
              <select value={optionForm.type} onChange={e => setOptionForm(p => ({ ...p, type: e.target.value }))} className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white' : 'bg-slate-50 border-black/[0.06] text-slate-900'}`}>
                <option value="call">Call</option><option value="put">Put</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Strike Price (R/t)</label>
              <input type="number" value={optionForm.strike} onChange={e => setOptionForm(p => ({ ...p, strike: e.target.value }))} placeholder="0.00" className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500' : 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400'}`} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Premium (R/t)</label>
              <input type="number" value={optionForm.premium} onChange={e => setOptionForm(p => ({ ...p, premium: e.target.value }))} placeholder="0.00" className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500' : 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400'}`} /></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Quantity (tonnes)</label>
              <input type="number" value={optionForm.quantity} onChange={e => setOptionForm(p => ({ ...p, quantity: e.target.value }))} placeholder="100" className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-slate-500' : 'bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400'}`} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Expiry Date</label>
            <input type="date" value={optionForm.expiry} onChange={e => setOptionForm(p => ({ ...p, expiry: e.target.value }))} className={`w-full px-3 py-2 rounded-xl text-sm border ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white' : 'bg-slate-50 border-black/[0.06] text-slate-900'}`} /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowWriteOption(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleWriteOption} loading={writingOption}>Write Option</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!exerciseTarget} onClose={() => setExerciseTarget(null)} onConfirm={handleExerciseOption} title="Exercise Option" description="Are you sure you want to exercise this carbon option? This action is irreversible." confirmLabel="Exercise" variant="warning" loading={exercising} />
    </motion.div>
  );
}
