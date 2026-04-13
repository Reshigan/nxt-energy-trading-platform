import React, { useState } from 'react';
import { FiLayers, FiPlus, FiTrash2 } from '../lib/fi-icons-shim';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

interface Scenario {
  id: number; name: string; color: string;
  ppa_tariff_cents: number; escalation_pct: number; capacity_mw: number; capacity_factor_pct: number;
  capex_rands: number; opex_annual_rands: number; tenure_years: number; grid_tariff_cents: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
let nextId = 1;

function createScenario(name: string, color: string): Scenario {
  return {
    id: nextId++, name, color,
    ppa_tariff_cents: 145, escalation_pct: 7, capacity_mw: 10, capacity_factor_pct: 22,
    capex_rands: 15000000, opex_annual_rands: 500000, tenure_years: 20, grid_tariff_cents: 350,
  };
}

function calculateYearlyCosts(s: Scenario): { year: number; ppa: number; grid: number; savings: number }[] {
  const years: { year: number; ppa: number; grid: number; savings: number }[] = [];
  let ppaTariff = s.ppa_tariff_cents;
  let gridTariff = s.grid_tariff_cents;
  const annualGen = s.capacity_mw * 1000 * 8760 * (s.capacity_factor_pct / 100);
  let cumulativeSavings = -s.capex_rands / 100; // convert to cents then to rands

  for (let y = 1; y <= s.tenure_years; y++) {
    const ppaCost = (ppaTariff * annualGen) / 100;
    const gridCost = (gridTariff * annualGen) / 100;
    const saving = gridCost - ppaCost - s.opex_annual_rands;
    cumulativeSavings += saving;
    years.push({ year: y, ppa: Math.round(ppaCost), grid: Math.round(gridCost), savings: Math.round(cumulativeSavings) });
    ppaTariff *= (1 + s.escalation_pct / 100);
    gridTariff *= 1.12; // Eskom avg escalation
  }
  return years;
}

export default function ScenarioComparison() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [scenarios, setScenarios] = useState<Scenario[]>([
    createScenario('Base Case', COLORS[0]),
    createScenario('Aggressive', COLORS[1]),
  ]);

  const addScenario = () => {
    if (scenarios.length >= 4) { toast.error('Maximum 4 scenarios'); return; }
    setScenarios(prev => [...prev, createScenario(`Scenario ${prev.length + 1}`, COLORS[prev.length])]);
  };

  const removeScenario = (id: number) => {
    if (scenarios.length <= 2) { toast.error('Minimum 2 scenarios needed'); return; }
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const updateScenario = (id: number, field: keyof Scenario, value: number) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Build comparison chart data
  const maxYears = Math.max(...scenarios.map(s => s.tenure_years));
  const comparisonData: Record<string, unknown>[] = [];
  const scenarioYearlyData = scenarios.map(s => ({ scenario: s, data: calculateYearlyCosts(s) }));

  for (let y = 1; y <= maxYears; y++) {
    const point: Record<string, unknown> = { year: `Y${y}` };
    scenarioYearlyData.forEach(({ scenario, data }) => {
      const yearData = data.find(d => d.year === y);
      point[scenario.name] = yearData?.savings || 0;
    });
    comparisonData.push(point);
  }

  // Find crossover points
  const crossovers = scenarios.map(s => {
    const data = calculateYearlyCosts(s);
    const crossover = data.find(d => d.savings >= 0);
    return { name: s.name, crossoverYear: crossover?.year || null, finalSavings: data[data.length - 1]?.savings || 0 };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Scenario Comparison</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Side-by-side financial modelling of energy procurement scenarios</p>
        </div>
        <Button variant="primary" onClick={addScenario} disabled={scenarios.length >= 4}><FiPlus className="w-3 h-3 mr-1" /> Add Scenario</Button>
      </div>

      {/* Scenario inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scenarios.map(s => (
          <div key={s.id} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="flex items-center justify-between mb-3">
              <input value={s.name} onChange={e => setScenarios(prev => prev.map(sc => sc.id === s.id ? { ...sc, name: e.target.value } : sc))}
                className="text-sm font-semibold bg-transparent text-slate-800 dark:text-slate-200 border-none outline-none" />
              <button onClick={() => removeScenario(s.id)} className="text-slate-400 hover:text-red-500"><FiTrash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['ppa_tariff_cents', 'PPA Tariff (c/kWh)'],
                ['escalation_pct', 'Escalation %'],
                ['capacity_mw', 'Capacity (MW)'],
                ['capacity_factor_pct', 'Cap Factor %'],
                ['capex_rands', 'CapEx (R)'],
                ['opex_annual_rands', 'OpEx/yr (R)'],
                ['tenure_years', 'Tenure (yrs)'],
                ['grid_tariff_cents', 'Grid Tariff (c/kWh)'],
              ] as [keyof Scenario, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[10px] text-slate-400 mb-0.5">{label}</label>
                  <input type="number" value={s[key] as number} onChange={e => updateScenario(s.id, key, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded-lg text-xs border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Crossover summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {crossovers.map(cr => (
          <div key={cr.name} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-[11px] text-slate-400 mb-1">{cr.name}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Payback: <span className="text-emerald-500">{cr.crossoverYear ? `Year ${cr.crossoverYear}` : 'N/A'}</span></p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Final: <span className={cr.finalSavings >= 0 ? 'text-emerald-500' : 'text-red-500'}>R{(cr.finalSavings / 1000000).toFixed(2)}M</span></p>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Cumulative Savings Comparison (R)</h3>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={65} tickFormatter={(v: number) => `R${(v / 1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`R${(v / 1000000).toFixed(2)}M`, '']} />
            <Legend />
            {scenarios.map(s => <Line key={s.id} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
            {/* Zero line */}
            <Line type="monotone" dataKey={() => 0} stroke={c('#374151', '#d1d5db')} strokeDasharray="5 5" strokeWidth={1} dot={false} name="Break-even" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-year breakdown table */}
      <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Year-by-Year Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Year</th>
              {scenarios.map(s => <th key={s.id} className="text-right py-2 font-medium" style={{ color: s.color }}>{s.name} Savings</th>)}
            </tr></thead>
            <tbody>
              {Array.from({ length: maxYears }).map((_, i) => {
                const y = i + 1;
                return (
                  <tr key={y} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                    <td className="py-1.5 text-slate-500">Y{y}</td>
                    {scenarioYearlyData.map(({ scenario, data }) => {
                      const d = data.find(r => r.year === y);
                      const val = d?.savings || 0;
                      return <td key={scenario.id} className={`py-1.5 text-right mono text-xs ${val >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>R{(val / 1000000).toFixed(3)}M</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
