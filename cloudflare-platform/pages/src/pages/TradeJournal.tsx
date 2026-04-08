import React, { useState, useEffect, useCallback } from 'react';
import { FiBook, FiTrendingUp, FiTrendingDown, FiBarChart2, FiRefreshCw, FiSearch, FiDownload } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { tradingAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface Trade {
  id: string;
  market: string;
  side: string;
  volume: number;
  price_cents: number;
  total_cents: number;
  status: string;
  created_at: string;
  buyer_id?: string;
  seller_id?: string;
}

const TABS = ['Journal', 'Execution Analytics', 'Counterparty Analysis'] as const;

export default function TradeJournal() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Journal');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await tradingAPI.getHistory();
      if (Array.isArray(res.data?.data)) setTrades(res.data.data);
      else if (Array.isArray(res.data)) setTrades(res.data);
    } catch { setError('Failed to load trade journal.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPnL = trades.reduce((s, t) => s + ((t.side === 'sell' ? 1 : -1) * (t.total_cents || 0)), 0);
  const winRate = trades.length > 0 ? Math.round((trades.filter(t => t.side === 'sell').length / trades.length) * 100) : 0;
  const avgSize = trades.length > 0 ? Math.round(trades.reduce((s, t) => s + (t.total_cents || 0), 0) / trades.length) : 0;
  const filtered = trades.filter(t => !search || (t.market || '').toLowerCase().includes(search.toLowerCase()) || (t.status || '').toLowerCase().includes(search.toLowerCase()));

  // Counterparty analysis
  const counterpartyMap: Record<string, { count: number; volume: number }> = {};
  for (const t of trades) {
    const cp = t.buyer_id || t.seller_id || 'unknown';
    if (!counterpartyMap[cp]) counterpartyMap[cp] = { count: 0, volume: 0 };
    counterpartyMap[cp].count++;
    counterpartyMap[cp].volume += t.total_cents || 0;
  }

  const handleExport = () => {
    const csv = ['Date,Market,Side,Volume,Price,Total,Status', ...trades.map(t => `${t.created_at},${t.market},${t.side},${t.volume},${(t.price_cents || 0) / 100},${(t.total_cents || 0) / 100},${t.status}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'trade-journal.csv'; a.click();
    toast.success('Trade journal exported');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6" role="main" aria-label="Trade Journal page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Trade Journal</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Execution analytics, counterparty analysis &amp; P&amp;L tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Export CSV"><FiDownload className="w-4 h-4" /> Export CSV</button>
          <button onClick={loadData} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${c('bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]', 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`} aria-label="Refresh"><FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {[
          { label: 'Total Trades', value: String(trades.length), icon: <FiBook className="w-5 h-5" />, color: 'text-blue-500' },
          { label: 'Net P&L', value: formatZAR(totalPnL / 100), icon: totalPnL >= 0 ? <FiTrendingUp className="w-5 h-5" /> : <FiTrendingDown className="w-5 h-5" />, color: totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500' },
          { label: 'Win Rate', value: `${winRate}%`, icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-purple-500' },
          { label: 'Avg Trade Size', value: formatZAR(avgSize / 100), icon: <FiBarChart2 className="w-5 h-5" />, color: 'text-amber-500' },
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : c('bg-white/[0.04] text-slate-400 hover:text-white', 'bg-slate-100 text-slate-500 hover:text-slate-700')}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Journal' && (
        <>
          <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08] text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'}`} aria-label="Search trades" /></div>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : filtered.length === 0 ? <EmptyState title="No trades" description="No trade records found." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Market</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Side</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Volume</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Price</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
              </tr></thead><tbody>{filtered.map(t => (
                <tr key={t.id} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 text-slate-400 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString('en-ZA') : '\u2014'}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 capitalize">{(t.market || '').replace(/_/g, ' ')}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${t.side === 'buy' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{t.side}</span></td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{t.volume?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{formatZAR((t.price_cents || 0) / 100)}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{formatZAR((t.total_cents || 0) / 100)}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${t.status === 'settled' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>{t.status}</span></td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </>
      )}

      {activeTab === 'Execution Analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-32" />) : (
            <>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Fill Rate Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Full Fills</p><p className="text-xl font-bold text-emerald-500 mono">{trades.filter(t => t.status === 'settled').length}</p></div>
                  <div><p className="text-xs text-slate-400">Partial Fills</p><p className="text-xl font-bold text-amber-500 mono">{trades.filter(t => t.status === 'partial').length}</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Volume by Market</h3>
                {(() => {
                  const markets: Record<string, number> = {};
                  for (const t of trades) { markets[t.market || 'unknown'] = (markets[t.market || 'unknown'] || 0) + (t.volume || 0); }
                  return Object.entries(markets).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, v]) => (
                    <div key={m} className="flex justify-between items-center py-1.5"><span className="text-xs text-slate-400 capitalize">{m.replace(/_/g, ' ')}</span><span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{v.toLocaleString()} MWh</span></div>
                  ));
                })()}
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Buy vs Sell Split</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400">Buys</p><p className="text-xl font-bold text-emerald-500 mono">{trades.filter(t => t.side === 'buy').length}</p></div>
                  <div><p className="text-xs text-slate-400">Sells</p><p className="text-xl font-bold text-red-500 mono">{trades.filter(t => t.side === 'sell').length}</p></div>
                </div>
              </div>
              <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Avg Price by Market</h3>
                {(() => {
                  const priceMap: Record<string, { sum: number; count: number }> = {};
                  for (const t of trades) { const m = t.market || 'unknown'; if (!priceMap[m]) priceMap[m] = { sum: 0, count: 0 }; priceMap[m].sum += t.price_cents || 0; priceMap[m].count++; }
                  return Object.entries(priceMap).slice(0, 5).map(([m, { sum, count }]) => (
                    <div key={m} className="flex justify-between items-center py-1.5"><span className="text-xs text-slate-400 capitalize">{m.replace(/_/g, ' ')}</span><span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{formatZAR(sum / count / 100)}/MWh</span></div>
                  ));
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'Counterparty Analysis' && (
        <div style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div> : Object.keys(counterpartyMap).length === 0 ? <EmptyState title="No counterparties" description="No counterparty data available." /> : (
            <div className={`cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={c('bg-white/[0.02]', 'bg-slate-50')}>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Counterparty</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Trades</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Total Volume</th>
              </tr></thead><tbody>{Object.entries(counterpartyMap).sort((a, b) => b[1].volume - a[1].volume).map(([cp, data]) => (
                <tr key={cp} className={`border-t ${c('border-white/[0.04] hover:bg-white/[0.02]', 'border-black/[0.04] hover:bg-slate-50')} transition-colors`}>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 font-mono text-xs">{cp.substring(0, 12)}...</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{data.count}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{formatZAR(data.volume / 100)}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
