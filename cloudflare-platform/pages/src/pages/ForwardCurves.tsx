import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiRefreshCw } from '../lib/fi-icons-shim';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { curvesAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';

interface CurvePoint { tenor_months: number; price_cents: number; confidence_lower_cents: number; confidence_upper_cents: number; }

const MARKETS = ['solar', 'wind', 'carbon', 'gas', 'hydro', 'battery'];

export default function ForwardCurves() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [market, setMarket] = useState('solar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [basePrice, setBasePrice] = useState(0);

  const loadCurve = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await curvesAPI.getCurve(market);
      const d = res.data?.data;
      if (d?.points) setCurveData(d.points);
      if (d?.base_price_cents) setBasePrice(d.base_price_cents);
    } catch { setError('Failed to load forward curve.'); }
    setLoading(false);
  }, [market]);

  useEffect(() => { loadCurve(); }, [loadCurve]);

  const handleRebuild = async () => {
    try {
      await curvesAPI.buildCurve(market);
      toast.success(`${market} curve rebuilt successfully`);
      loadCurve();
    } catch { toast.error('Failed to rebuild curve'); }
  };

  const chartData = curveData.map(p => ({
    tenor: `${p.tenor_months}M`,
    price: p.price_cents / 100,
    lower: p.confidence_lower_cents / 100,
    upper: p.confidence_upper_cents / 100,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Forward Price Curves</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Expected energy prices 1 month to 15 years forward</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={market} onChange={e => setMarket(e.target.value)} className="px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
            {MARKETS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <Button variant="primary" onClick={handleRebuild} className="text-xs">Rebuild Curve</Button>
          <button onClick={loadCurve} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadCurve} />}

      {/* Base price card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <p className="text-[11px] text-slate-400 mb-1">Spot Price</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mono">R{(basePrice / 100).toFixed(2)}/kWh</p>
        </div>
        {curveData.length > 0 && <>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">1Y Forward</p>
            <p className="text-xl font-bold text-emerald-500 mono">R{((curveData.find(p => p.tenor_months === 12)?.price_cents || 0) / 100).toFixed(2)}</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">5Y Forward</p>
            <p className="text-xl font-bold text-blue-500 mono">R{((curveData.find(p => p.tenor_months === 60)?.price_cents || 0) / 100).toFixed(2)}</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">10Y Forward</p>
            <p className="text-xl font-bold text-purple-500 mono">R{((curveData.find(p => p.tenor_months === 120)?.price_cents || 0) / 100).toFixed(2)}</p>
          </div>
        </>}
      </div>

      {loading ? <Skeleton className="w-full h-80" /> : curveData.length === 0 ? <EmptyState title="No curve data" description="Build a curve to generate forward price projections." /> : (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">{market.charAt(0).toUpperCase() + market.slice(1)} Forward Curve with 85% Confidence Band</h3>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="tenor" tick={{ fontSize: 11, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={55} unit=" R" />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#confGrad)" />
              <Area type="monotone" dataKey="lower" stroke="transparent" fill={c('#151F32', '#fff')} />
              <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tenor table */}
      {curveData.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Tenor Points</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Tenor</th>
              <th className="text-right py-2 font-medium">Price (R/kWh)</th>
              <th className="text-right py-2 font-medium">Lower Band</th>
              <th className="text-right py-2 font-medium">Upper Band</th>
              <th className="text-right py-2 font-medium">vs Spot</th>
            </tr></thead>
            <tbody>{curveData.map(p => {
              const change = basePrice > 0 ? ((p.price_cents - basePrice) / basePrice * 100) : 0;
              return (
                <tr key={p.tenor_months} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                  <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{p.tenor_months >= 12 ? `${p.tenor_months / 12}Y` : `${p.tenor_months}M`}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">R{(p.price_cents / 100).toFixed(2)}</td>
                  <td className="py-2.5 text-right text-slate-500 mono text-xs">R{(p.confidence_lower_cents / 100).toFixed(2)}</td>
                  <td className="py-2.5 text-right text-slate-500 mono text-xs">R{(p.confidence_upper_cents / 100).toFixed(2)}</td>
                  <td className="py-2.5 text-right"><span className={`text-xs font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
