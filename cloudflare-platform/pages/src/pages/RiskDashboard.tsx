import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiShield, FiAlertTriangle, FiTrendingDown, FiRefreshCw, FiActivity, FiTrendingUp, FiMaximize2, FiClock } from '../lib/fi-icons-shim';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { aiAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

interface ExposureEntry { name: string; exposure: number; limit: number; }
interface DrawdownPoint { day: number; drawdown: number; }
interface StressScenario { name: string; impact: string; probability: string; severity: string; }
interface Greek { name: string; value: string; desc: string; change: string; }
interface VaRMetric { label: string; value: number; sub: string; }
interface RiskHeatmapCell { sector: string; metric: string; value: number; }
interface CacheEntry<T> { data: T; timestamp: number; }

const severityColors: Record<string, string> = {
  Critical: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  High: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Low: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

// D1 query optimization: Client-side cache with configurable TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default
const cacheStore = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttl = CACHE_TTL_MS): T | null {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data;
  return null;
}

function setCache<T>(key: string, data: T): void {
  cacheStore.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
  cacheStore.clear();
}

export default function RiskDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [showStressTest, setShowStressTest] = useState(false);
  const [stressForm, setStressForm] = useState({ scenario: 'market_crash', severity: '50' });
  const [stressing, setStressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<Greek[]>([]);
  const [exposureData, setExposureData] = useState<ExposureEntry[]>([]);
  const [drawdownData, setDrawdownData] = useState<DrawdownPoint[]>([]);
  const [stressScenarios, setStressScenarios] = useState<StressScenario[]>([]);
  const [varMetrics, setVarMetrics] = useState<VaRMetric[]>([]);
  // D1 optimization: Manual refresh + cache status
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [cacheHit, setCacheHit] = useState(false);
  // Risk heatmap data
  const [heatmapData, setHeatmapData] = useState<RiskHeatmapCell[]>([]);

  // Generate risk heatmap from exposure data
  const heatmap = useMemo(() => {
    if (exposureData.length === 0) return [];
    const sectors = ['Solar', 'Wind', 'Gas', 'Carbon', 'Battery'];
    const metrics = ['Exposure', 'VaR', 'Concentration', 'Liquidity', 'Correlation'];
    
    return heatmapData.length > 0 ? heatmapData : sectors.flatMap(sector => 
      metrics.map(metric => ({
        sector,
        metric,
        value: Math.random() * 100, // Placeholder - replace with real data
      }))
    );
  }, [exposureData, heatmapData]);

  const getHeatColor = (value: number): string => {
    if (value >= 80) return 'bg-red-500';
    if (value >= 60) return 'bg-orange-500';
    if (value >= 40) return 'bg-yellow-500';
    if (value >= 20) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `risk-${user?.id || 'default'}`;
    
    // Check cache first (skip if force refresh)
    if (!forceRefresh) {
      const cached = getCached<{ riskMetrics: Greek[]; exposureData: ExposureEntry[]; drawdownData: DrawdownPoint[]; stressScenarios: StressScenario[]; varMetrics: VaRMetric[] }>(cacheKey);
      if (cached) {
        setRiskMetrics(cached.riskMetrics);
        setExposureData(cached.exposureData);
        setDrawdownData(cached.drawdownData);
        setStressScenarios(cached.stressScenarios);
        setVarMetrics(cached.varMetrics);
        setCacheHit(true);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setCacheHit(false);
    try {
      const pid = user?.id || 'default';
      const res = await aiAPI.risk(pid);
      const d = res.data?.data;
      const greeks = d?.greeks || [];
      const exposure = d?.exposure || [];
      const drawdown = d?.drawdown || [];
      const scenarios = d?.stress_scenarios || [];
      const varMets = d?.var_metrics || [];
      
      setRiskMetrics(greeks);
      setExposureData(exposure);
      setDrawdownData(drawdown);
      setStressScenarios(scenarios);
      setVarMetrics(varMets);
      setLastRefresh(Date.now());
      
      // Cache the results
      setCache(cacheKey, { riskMetrics: greeks, exposureData: exposure, drawdownData: drawdown, stressScenarios: scenarios, varMetrics: varMets });
    } catch { setError('Failed to load risk data.'); }
    setLoading(false);
  }, [user]);

  // Load on mount with cache
  useEffect(() => { loadData(); }, [loadData]);

  // D1 optimization: Clear cache on manual refresh
  const handleRefresh = () => {
    clearCache();
    loadData(true);
    toast.info('Refreshing risk data...');
  };

  const handleStressTest = async () => {
    setStressing(true);
    try {
      const res = await aiAPI.optimise({ type: 'stress_test', scenario: stressForm.scenario, severity: Number(stressForm.severity) });
      if (res.data?.success) { 
        toast.success('Stress test complete'); 
        setShowStressTest(false); 
        clearCache(); // Clear cache after mutation
        loadData(true); 
      }
      else toast.error(res.data?.error || 'Stress test failed');
    } catch { toast.error('Stress test failed'); }
    setStressing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Risk Dashboard page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Risk Dashboard</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">VaR, Greeks, stress tests & exposure monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          {cacheHit && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <FiClock className="w-3 h-3" /> Cached • {Math.round((Date.now() - lastRefresh) / 1000)}s ago
            </span>
          )}
          <button onClick={handleRefresh} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all flex items-center gap-2" aria-label="Refresh risk data">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {cacheHit ? 'Refresh' : 'Load'}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (<div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-24" />)}</div>) : (<>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {varMetrics.length > 0 ? varMetrics.map((v, i) => (
          <div key={v.label} className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 500ms ease ${100 + i * 60}ms both` }}>
            <div className="flex items-center gap-2 mb-3"><FiShield className="w-4 h-4 text-blue-500" aria-hidden="true" /><span className="text-xs text-slate-400">{v.label}</span></div>
            <p className="text-2xl font-bold text-red-500 mono">{formatZAR(v.value)}</p>
            <p className="text-xs text-slate-400 mt-1">{v.sub}</p>
          </div>
        )) : <div className="col-span-full"><EmptyState title="No VaR data" description="Risk metrics will appear once positions are established." /></div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {riskMetrics.map((g, i) => (
          <div key={g.name} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 60}ms both` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{g.name}</span>
              <span className="text-[11px] font-semibold text-blue-500">{g.change}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mono">{g.value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{g.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Counterparty Exposure</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={exposureData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis type="number" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: c('#94a3b8', '#64748b') }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="exposure" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Exposure (R'000)" />
              <Bar dataKey="limit" fill={c('rgba(255,255,255,0.04)', 'rgba(0,0,0,0.04)')} radius={[0, 6, 6, 0]} name="Limit (R'000)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 500ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Portfolio Drawdown (30D)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={drawdownData}>
              <defs><linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={35} unit="%" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={2} fill="url(#ddGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 650ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Risk Heatmap (Sector × Metric)</h3>
        {heatmap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={c('text-slate-500', 'text-slate-400')}>
                  <th className="text-left py-2 pr-3 font-medium w-24">Sector</th>
                  {['Exposure', 'VaR', 'Concentration', 'Liquidity', 'Correlation'].map(m => (
                    <th key={m} className="text-center py-2 px-2 font-medium">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Solar', 'Wind', 'Gas', 'Carbon', 'Battery'].map(sector => (
                  <tr key={sector} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                    <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-300">{sector}</td>
                    {['Exposure', 'VaR', 'Concentration', 'Liquidity', 'Correlation'].map(metric => {
                      const cell = heatmap.find(h => h.sector === sector && h.metric === metric);
                      const value = cell?.value ?? Math.round(Math.random() * 100);
                      return (
                        <td key={metric} className="py-1 px-1">
                          <div className={`${getHeatColor(value)} rounded text-center text-white font-bold py-1.5 ${value >= 80 ? 'ring-2 ring-red-300' : ''}`}>
                            {value.toFixed(0)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400"></span> Low (0-20)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> Moderate (20-40)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> High (40-60)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span> Critical (60-80)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Severe (80+)</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">Generate exposure data to populate heatmap</div>
        )}
      </div>

      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 600ms both' }}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Stress Test Scenarios</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Scenario</th>
              <th className="text-right py-2 font-medium">Portfolio Impact</th>
              <th className="text-right py-2 font-medium">Probability</th>
              <th className="text-left py-2 font-medium">Severity</th>
            </tr></thead>
            <tbody>{stressScenarios.map(s => (
              <tr key={s.name} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{s.name}</td>
                <td className={`py-3 text-right font-bold mono ${s.impact.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>{s.impact}</td>
                <td className="py-3 text-right text-slate-500 mono">{s.probability}</td>
                <td className="py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${severityColors[s.severity]}`}>{s.severity}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      </>)}

      <Modal isOpen={showStressTest} onClose={() => setShowStressTest(false)} title="Custom Stress Test">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Scenario</label>
            <select value={stressForm.scenario} onChange={e => setStressForm(p => ({ ...p, scenario: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
              <option value="market_crash">Market Crash (-30%)</option><option value="load_shedding">Stage 6 Load Shedding</option><option value="currency_shock">ZAR Depreciation (-15%)</option><option value="supply_disruption">Supply Chain Disruption</option>
            </select></div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Severity (%)</label>
            <input type="range" min="10" max="100" value={stressForm.severity} onChange={e => setStressForm(p => ({ ...p, severity: e.target.value }))} className="w-full" />
            <span className="text-sm text-slate-600 dark:text-slate-300">{stressForm.severity}%</span></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowStressTest(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleStressTest} loading={stressing}>Run Test</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
