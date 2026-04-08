import React, { useState, useEffect, useCallback } from 'react';
import { FiTrendingUp, FiRefreshCw, FiLoader, FiDownload } from '../lib/fi-icons-shim';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { tradingAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

interface Position { market: string; direction: string; net_volume: number; avg_entry_price: number; current_price: number; unrealised_pnl: number; }
interface OrderBookEntry { price: number; size: number; total: number; }
interface PricePoint { time: string; price: number; volume: number; }

const MARKETS = ['solar_ppa', 'wind_ppa', 'gas_spot', 'carbon', 'battery', 'hydro'] as const;
const TIMEFRAMES = ['1H', '4H', '1D', '1W', '1M'] as const;

export default function Trading() {
  const toast = useToast();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [obData, setObData] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('solar_ppa');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderVolume, setOrderVolume] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [posRes, obRes, priceRes] = await Promise.allSettled([
        tradingAPI.getPositions(),
        tradingAPI.getOrderbook(selectedMarket),
        tradingAPI.getPrices(selectedMarket, selectedTimeframe.toLowerCase()),
      ]);
      if (posRes.status === 'fulfilled' && posRes.value.data?.data) setPositions(Array.isArray(posRes.value.data.data) ? posRes.value.data.data : []);
      if (obRes.status === 'fulfilled' && obRes.value.data?.data) setObData(obRes.value.data.data);
      if (priceRes.status === 'fulfilled') {
        const pd = priceRes.value.data?.data;
        if (Array.isArray(pd)) setPriceData(pd);
        else if (pd?.candles && Array.isArray(pd.candles)) setPriceData(pd.candles.map((c: Record<string, unknown>) => ({ time: c.time as string, price: c.close as number, volume: c.volume as number })));
      }
      if (posRes.status === 'rejected' && obRes.status === 'rejected' && priceRes.status === 'rejected') setError('Failed to load trading data. Please try again.');
    } catch { setError('Failed to load trading data. Please try again.'); }
    setLoading(false);
  }, [selectedMarket, selectedTimeframe]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePlaceOrder = async () => {
    if (!orderVolume || Number(orderVolume) <= 0) { toast.error('Please enter a valid volume'); return; }
    if (orderType === 'limit' && (!orderPrice || Number(orderPrice) <= 0)) { toast.error('Please enter a valid price'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { market: selectedMarket, direction: orderSide, volume: Number(orderVolume), order_type: orderType };
      if (orderType === 'limit') payload.price = Number(orderPrice);
      const res = await tradingAPI.placeOrder(payload);
      if (res.data?.success) { toast.success('Order placed successfully'); setOrderPrice(''); setOrderVolume(''); loadData(); }
      else toast.error(res.data?.error || 'Failed to place order');
    } catch (err: unknown) { toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to place order'); }
    setSubmitting(false);
  };

  const midPrice = obData.asks?.[0]?.price && obData.bids?.[0]?.price ? (obData.asks[0].price + obData.bids[0].price) / 2 : priceData.length > 0 ? priceData[priceData.length - 1].price : 0;

  // F3: Trade/Position export to CSV
  const handleExportCSV = () => {
    if (positions.length === 0) { toast.error('No positions to export'); return; }
    const headers = ['Market', 'Direction', 'Volume (MWh)', 'Avg Entry (ZAR)', 'Current (ZAR)', 'Unrealised P&L (ZAR)'];
    const rows = positions.map(p => [
      p.market.replace(/_/g, ' '),
      p.direction,
      p.net_volume,
      (p.avg_entry_price / 100).toFixed(2),
      (p.current_price / 100).toFixed(2),
      (p.unrealised_pnl / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `positions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Positions exported to CSV');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Trading page">
      <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Trading</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Real-time energy trading with live orderbook</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Market selector">
        {MARKETS.map(m => (
          <button key={m} role="tab" aria-selected={selectedMarket === m} onClick={() => setSelectedMarket(m)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${selectedMarket === m ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : isDark ? 'bg-white/[0.04] text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>{m.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Chart */}
        <div className={`lg:col-span-2 cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedMarket.replace(/_/g, ' ')} Spot</h3>
              <div className="flex items-center gap-2 mt-1">
                {loading ? <Skeleton className="w-32 h-8" /> : midPrice > 0 ? (<><span className="text-2xl font-bold text-slate-900 dark:text-white mono">{formatZAR(midPrice / 100)}</span><span className="text-sm font-semibold text-emerald-500 flex items-center gap-0.5"><FiTrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Live</span></>) : <span className="text-sm text-slate-400">No price data available</span>}
              </div>
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Timeframe selector">
              {TIMEFRAMES.map(tf => (
                <button key={tf} role="tab" aria-selected={selectedTimeframe === tf} onClick={() => setSelectedTimeframe(tf)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedTimeframe === tf ? isDark ? 'bg-white/[0.1] text-white' : 'bg-slate-900 text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>{tf}</button>
              ))}
            </div>
          </div>
          {loading ? <Skeleton className="w-full h-[320px]" /> : priceData.length > 0 ? (<>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={priceData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={50} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} />
              <Tooltip contentStyle={{ background: isDark ? '#151F32' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 12 }} formatter={(value: number) => [formatZAR(value / 100), 'Price']} />
              <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} fill="url(#priceGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={priceData}>
              <Bar dataKey="volume" fill={isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </>) : <EmptyState title="No price data" description="Price data will appear when trades are executed on this market." />}
        </div>

        {/* Order Book + Place Order */}
        <div className="space-y-4">
          {/* Order Book */}
          <div className={`cp-card !p-4 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Order Book</h3>
              <button onClick={loadData} className="text-slate-400 hover:text-blue-500 transition-colors" aria-label="Refresh orderbook"><FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
            {loading ? (<div className="space-y-1">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="w-full h-5" />)}</div>) : (obData.asks?.length > 0 || obData.bids?.length > 0) ? (
            <div className="space-y-0.5 text-xs" role="table" aria-label="Order book">
              <div className="flex justify-between text-slate-400 dark:text-slate-500 mb-1 px-1" role="row">
                <span role="columnheader">Price (R)</span><span role="columnheader">Size (MWh)</span><span role="columnheader">Total</span>
              </div>
              {(obData.asks || []).slice(0, 5).reverse().map((a, i) => (
                <div key={`ask-${i}`} className="flex justify-between px-1 py-0.5 rounded relative overflow-hidden" role="row">
                  <div className="absolute inset-y-0 right-0 bg-red-500/5" style={{ width: `${Math.min(100, (a.total / Math.max(1, obData.asks[obData.asks.length - 1]?.total || 1)) * 100)}%` }} />
                  <span className="text-red-500 mono relative z-10" role="cell">{formatZAR(a.price / 100)}</span>
                  <span className="text-slate-600 dark:text-slate-400 mono relative z-10" role="cell">{a.size.toLocaleString()}</span>
                  <span className="text-slate-400 mono relative z-10" role="cell">{a.total.toLocaleString()}</span>
                </div>
              ))}
              {midPrice > 0 && <div className={`text-center py-1.5 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'} mono`}>{formatZAR(midPrice / 100)}</div>}
              {(obData.bids || []).slice(0, 5).map((b, i) => (
                <div key={`bid-${i}`} className="flex justify-between px-1 py-0.5 rounded relative overflow-hidden" role="row">
                  <div className="absolute inset-y-0 right-0 bg-emerald-500/5" style={{ width: `${Math.min(100, (b.total / Math.max(1, obData.bids[obData.bids.length - 1]?.total || 1)) * 100)}%` }} />
                  <span className="text-emerald-500 mono relative z-10" role="cell">{formatZAR(b.price / 100)}</span>
                  <span className="text-slate-600 dark:text-slate-400 mono relative z-10" role="cell">{b.size.toLocaleString()}</span>
                  <span className="text-slate-400 mono relative z-10" role="cell">{b.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
            ) : <EmptyState title="No orders yet" description="Be the first to place an order on this market." />}
          </div>

          {/* Place Order */}
          <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }} className={`cp-card !p-4 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }} aria-label="Place order form">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Place Order</h3>
            <div className="flex gap-1 mb-3">
              <button type="button" onClick={() => setOrderSide('buy')} aria-pressed={orderSide === 'buy'} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${orderSide === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>BUY</button>
              <button type="button" onClick={() => setOrderSide('sell')} aria-pressed={orderSide === 'sell'} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${orderSide === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>SELL</button>
            </div>
            <div className="flex gap-1 mb-3">
              {(['limit', 'market'] as const).map(t => (
                <button key={t} type="button" onClick={() => setOrderType(t)} aria-pressed={orderType === t} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${orderType === t ? isDark ? 'bg-white/[0.1] text-white' : 'bg-slate-200 text-slate-800' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t}</button>
              ))}
            </div>
            <div className="space-y-2">
              {orderType === 'limit' && (
                <div>
                  <label htmlFor="order-price" className="text-[11px] text-slate-400 mb-1 block">Price (R/MWh)</label>
                  <input id="order-price" type="number" min="0" step="0.01" value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} required placeholder="Enter price in ZAR" className={`w-full px-3 py-2 rounded-xl text-sm mono ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600' : 'bg-slate-50 border border-black/[0.06] text-slate-900 placeholder:text-slate-300'}`} />
                </div>
              )}
              <div>
                <label htmlFor="order-volume" className="text-[11px] text-slate-400 mb-1 block">Quantity (MWh)</label>
                <input id="order-volume" type="number" min="0.1" step="0.1" value={orderVolume} onChange={(e) => setOrderVolume(e.target.value)} required placeholder="Enter volume" className={`w-full px-3 py-2 rounded-xl text-sm mono ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600' : 'bg-slate-50 border border-black/[0.06] text-slate-900 placeholder:text-slate-300'}`} />
              </div>
              {orderVolume && Number(orderVolume) > 0 && orderType === 'limit' && orderPrice && Number(orderPrice) > 0 && (
                <div className="text-xs text-slate-400 px-1">Total: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatZAR(Number(orderPrice) * Number(orderVolume))}</span></div>
              )}
              <button type="submit" disabled={submitting} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${orderSide === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25'}`}>
                {submitting && <FiLoader className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedMarket.replace(/_/g, ' ')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Positions Table */}
      <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Open Positions</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} disabled={positions.length === 0} className="text-xs font-medium text-emerald-500 hover:text-emerald-600 flex items-center gap-1 disabled:opacity-40" aria-label="Export positions to CSV"><FiDownload className="w-3 h-3" /> Export</button>
            <button onClick={loadData} className="text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1" aria-label="Refresh positions"><FiRefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>
        {loading ? (<div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-full h-12" />)}</div>) : positions.length > 0 ? (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm" role="table" aria-label="Open positions">
            <thead>
              <tr className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <th className="text-left py-2 font-medium" scope="col">Market</th>
                <th className="text-left py-2 font-medium" scope="col">Side</th>
                <th className="text-right py-2 font-medium" scope="col">Volume</th>
                <th className="text-right py-2 font-medium" scope="col">Avg Entry</th>
                <th className="text-right py-2 font-medium" scope="col">Current</th>
                <th className="text-right py-2 font-medium" scope="col">Unrealised P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => { const pnlPositive = p.unrealised_pnl >= 0; return (
                <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 font-medium text-slate-800 dark:text-slate-200 capitalize">{(p.market || '').replace(/_/g, ' ')}</td>
                  <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${p.direction === 'buy' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{p.direction === 'buy' ? 'Long' : 'Short'}</span></td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{p.net_volume?.toLocaleString()} MWh</td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{formatZAR(p.avg_entry_price / 100)}</td>
                  <td className="py-3 text-right font-medium text-slate-800 dark:text-slate-200 mono">{formatZAR(p.current_price / 100)}</td>
                  <td className="py-3 text-right"><span className={`font-bold mono ${pnlPositive ? 'text-emerald-500' : 'text-red-500'}`}>{pnlPositive ? '+' : ''}{formatZAR(p.unrealised_pnl / 100)}</span></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        ) : <EmptyState title="No open positions" description="Place your first order to see positions here." />}
      </div>
    </motion.div>
  );
}
