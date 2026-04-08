import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiTrendingDown, FiSearch, FiFilter, FiRefreshCw, FiStar } from '../lib/fi-icons-shim';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { tradingAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const sparkline = (seed: number, trend: boolean) =>
  Array.from({ length: 12 }, (_, i) => ({ v: (seed + (trend ? i * 3 : -i * 2) + Math.random() * 15) }));

interface MarketRow {
  name: string;
  price: string;
  price_cents?: number;
  change: string;
  positive: boolean;
  volume: string;
  cap: string;
  spark: Array<{ v: number }>;
}

const fallbackMarkets: MarketRow[] = [
  { name: 'Solar PPA Spot', price_cents: 84720, price: 'R847.20', change: '+4.3%', positive: true, volume: '24.8K MWh', cap: 'R12.4B', spark: sparkline(700, true) },
  { name: 'Wind Forward H2', price_cents: 62350, price: 'R623.50', change: '+2.1%', positive: true, volume: '18.2K MWh', cap: 'R8.7B', spark: sparkline(580, true) },
  { name: 'Gas Spot', price_cents: 41280, price: 'R412.80', change: '-1.8%', positive: false, volume: '15.6K MWh', cap: 'R6.2B', spark: sparkline(440, false) },
  { name: 'Carbon Credit', price_cents: 28500, price: 'R285.00', change: '+8.8%', positive: true, volume: '32.1K t', cap: 'R4.1B', spark: sparkline(240, true) },
  { name: 'Biogas PPA', price_cents: 52040, price: 'R520.40', change: '+1.2%', positive: true, volume: '8.4K MWh', cap: 'R2.8B', spark: sparkline(490, true) },
  { name: 'Nuclear Base', price_cents: 38000, price: 'R380.00', change: '-0.5%', positive: false, volume: '42.0K MWh', cap: 'R18.6B', spark: sparkline(390, false) },
  { name: 'Hydro Peak', price_cents: 69580, price: 'R695.80', change: '+3.4%', positive: true, volume: '11.2K MWh', cap: 'R5.4B', spark: sparkline(650, true) },
  { name: 'REC Certificate', price_cents: 14520, price: 'R145.20', change: '+5.6%', positive: true, volume: '28.6K', cap: 'R1.9B', spark: sparkline(120, true) },
];

export default function Markets() {
  const toast = useToast();
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [filterPositive, setFilterPositive] = useState<boolean | null>(null);
  const [marketData, setMarketData] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // F9: Watchlist
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem('nxt_watchlist'); return saved ? new Set(JSON.parse(saved)) : new Set<string>(); } catch { return new Set<string>(); }
  });
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const toggleWatchlist = (name: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      localStorage.setItem('nxt_watchlist', JSON.stringify([...next]));
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await tradingAPI.getIndices();
      if (res.data?.data?.length) setMarketData(res.data.data);
      else setMarketData(fallbackMarkets);
    } catch {
      setError('Failed to load market data');
      toast.error('Failed to load market data');
      setMarketData(fallbackMarkets);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = marketData.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterPositive === null || m.positive === filterPositive;
    const matchesWatchlist = !showWatchlistOnly || watchlist.has(m.name);
    return matchesSearch && matchesFilter && matchesWatchlist;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Markets overview page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Markets</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Live energy & carbon market overview</p>
        </div>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh market data">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'}`}>
          <FiSearch className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search markets..." aria-label="Search markets" className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400" />
        </div>
        <button onClick={() => setShowWatchlistOnly(!showWatchlistOnly)} className={`px-3 py-2.5 rounded-2xl text-sm font-medium flex items-center gap-1.5 transition-all ${showWatchlistOnly ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : isDark ? 'bg-[#151F32] border border-white/[0.06] text-slate-300 hover:bg-[#1A2640]' : 'bg-white border border-black/[0.06] text-slate-600 hover:bg-slate-50'}`} aria-label="Show watchlist only" aria-pressed={showWatchlistOnly}>
          <FiStar className={`w-3.5 h-3.5 ${showWatchlistOnly ? 'fill-current' : ''}`} /> Watchlist ({watchlist.size})
        </button>
        <div className="flex gap-1" role="group" aria-label="Market filter">
          {[{ label: 'All', val: null }, { label: 'Gainers', val: true }, { label: 'Losers', val: false }].map(f => (
            <button key={f.label} onClick={() => setFilterPositive(f.val as boolean | null)}
              className={`px-3 py-2.5 rounded-2xl text-sm font-medium flex items-center gap-1.5 transition-all ${filterPositive === f.val ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : isDark ? 'bg-[#151F32] border border-white/[0.06] text-slate-300 hover:bg-[#1A2640]' : 'bg-white border border-black/[0.06] text-slate-600 hover:bg-slate-50'}`}
              aria-label={`Filter ${f.label}`} aria-pressed={filterPositive === f.val}>
              {f.val === null && <FiFilter className="w-3.5 h-3.5" />}{f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Table */}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading markets">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="w-full h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No markets found" description="Try adjusting your search or filter criteria." />
      ) : (
      <div className={`cp-card !p-0 overflow-hidden ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Energy markets">
            <thead>
              <tr className={`text-xs border-b ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'}`}>
                <th className="text-left py-3.5 px-5 font-medium" scope="col">Market</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Price</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">24h Change</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Volume</th>
                <th className="text-right py-3.5 px-4 font-medium" scope="col">Market Cap</th>
                <th className="text-right py-3.5 px-5 font-medium w-28" scope="col">7D</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.name} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer`}
                  style={{ animation: `cardFadeUp 400ms ease ${i * 50}ms both` }}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(m.name); }} className={`transition-colors ${watchlist.has(m.name) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'}`} aria-label={watchlist.has(m.name) ? `Remove ${m.name} from watchlist` : `Add ${m.name} to watchlist`}>
                        <FiStar className={`w-3.5 h-3.5 ${watchlist.has(m.name) ? 'fill-current' : ''}`} />
                      </button>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white mono">{m.price_cents ? formatZAR(m.price_cents) : m.price}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${m.positive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {m.positive ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      {m.change}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 mono text-xs">{m.volume}</td>
                  <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 mono text-xs">{m.cap}</td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="w-24 h-8 ml-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={m.spark}>
                          <defs>
                            <linearGradient id={`sg-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={m.positive ? '#10B981' : '#EF4444'} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={m.positive ? '#10B981' : '#EF4444'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={m.positive ? '#10B981' : '#EF4444'} strokeWidth={1.5} fill={`url(#sg-${i})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </motion.div>
  );
}
