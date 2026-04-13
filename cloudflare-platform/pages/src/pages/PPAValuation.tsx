import React, { useState } from 'react';
import { FiDollarSign, FiTrendingUp, FiCheckCircle, FiXCircle } from '../lib/fi-icons-shim';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { valuationAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

interface YearBreakdown { year: number; generation_kwh: number; ppa_tariff_cents: number; grid_tariff_cents: number; revenue_rands: number; opex_rands: number; net_cashflow_rands: number; cumulative_rands: number; }

export default function PPAValuation() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [breakdown, setBreakdown] = useState<YearBreakdown[]>([]);

  const [form, setForm] = useState({
    ppa_tariff_cents: 145, escalation_pct: 7, capacity_mw: 10, capacity_factor_pct: 22,
    capex_rands: 15000000, opex_annual_rands: 500000, opex_escalation_pct: 6,
    tenure_years: 20, discount_rate: 12, grid_tariff_cents: 350, grid_escalation_pct: 12,
    degradation_pct: 0.5,
  });

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await valuationAPI.calculatePPA(form);
      const d = res.data?.data;
      if (d) { setResult(d); setBreakdown(d.yearly_breakdown || []); }
      toast.success('PPA valuation calculated');
    } catch { toast.error('Valuation calculation failed'); }
    setLoading(false);
  };

  const chartData = breakdown.map(y => ({
    year: `Y${y.year}`, revenue: Math.round(y.revenue_rands / 1000), opex: Math.round(y.opex_rands / 1000),
    cumulative: Math.round(y.cumulative_rands / 1000),
  }));

  const recommendation = result?.recommendation as string;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">PPA Valuation Engine</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Financial modelling for Power Purchase Agreements — NPV, IRR, LCOE, payback</p>
      </div>

      {/* Input form */}
      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">PPA Parameters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(form).map(([key, val]) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
              <input type="number" value={val} onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={handleCalculate} disabled={loading}>{loading ? 'Calculating...' : 'Calculate Valuation'}</Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <p className="text-[11px] text-slate-400 mb-1">NPV</p>
              <p className={`text-xl font-bold mono ${(result.npv_rands as number) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>R{((result.npv_rands as number) / 1000000).toFixed(2)}M</p>
            </div>
            <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <p className="text-[11px] text-slate-400 mb-1">IRR</p>
              <p className="text-xl font-bold text-blue-500 mono">{result.irr_pct as number}%</p>
            </div>
            <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <p className="text-[11px] text-slate-400 mb-1">LCOE</p>
              <p className="text-xl font-bold text-purple-500 mono">{result.lcoe_cents_kwh as number} c/kWh</p>
            </div>
            <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <p className="text-[11px] text-slate-400 mb-1">Payback</p>
              <p className="text-xl font-bold text-amber-500 mono">{result.payback_years as number || 'N/A'} yrs</p>
            </div>
            <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')} flex items-center gap-2`}>
              {recommendation === 'PROCEED' ? <FiCheckCircle className="w-6 h-6 text-emerald-500" /> : recommendation === 'MARGINAL' ? <FiTrendingUp className="w-6 h-6 text-amber-500" /> : <FiXCircle className="w-6 h-6 text-red-500" />}
              <div>
                <p className="text-[11px] text-slate-400">Recommendation</p>
                <p className={`text-lg font-bold ${recommendation === 'PROCEED' ? 'text-emerald-500' : recommendation === 'MARGINAL' ? 'text-amber-500' : 'text-red-500'}`}>{recommendation}</p>
              </div>
            </div>
          </div>

          {/* Cumulative cashflow chart */}
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Cumulative Cashflow (R thousands)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue vs OpEx */}
          <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Revenue vs Operating Costs (R thousands)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="opex" fill="#EF4444" radius={[4, 4, 0, 0]} name="OpEx" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Grid savings */}
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')} text-center`}>
            <p className="text-sm text-slate-500 dark:text-slate-400">Estimated Grid Savings over {String(result.tenure_years ?? '')} years</p>
            <p className="text-3xl font-extrabold text-emerald-500 mono mt-1">R{((result.grid_savings_rands as number) / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-slate-400 mt-1">Total generation: {((result.total_generation_mwh as number) || 0).toLocaleString()} MWh</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
