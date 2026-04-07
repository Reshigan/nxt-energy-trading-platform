import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { tradingAPI } from '../lib/api';

const candleData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  price: 750 + Math.sin(i / 3) * 120 + Math.random() * 40,
  volume: 200 + Math.random() * 300,
}));

const orderBook = {
  bids: [
    { price: 847.20, size: 12400, total: 12400 },
    { price: 846.80, size: 8200, total: 20600 },
    { price: 846.50, size: 15100, total: 35700 },
    { price: 846.10, size: 6800, total: 42500 },
    { price: 845.90, size: 9300, total: 51800 },
  ],
  asks: [
    { price: 847.50, size: 10200, total: 10200 },
    { price: 847.80, size: 7600, total: 17800 },
    { price: 848.20, size: 13400, total: 31200 },
    { price: 848.60, size: 5900, total: 37100 },
    { price: 849.00, size: 11200, total: 48300 },
  ],
};

const positions = [
  { asset: 'Solar PPA Q2', side: 'Long', qty: '5,000 MWh', entry: 'R812.40', current: 'R847.20', pnl: '+R174,000', pnlPct: '+4.3%', positive: true },
  { asset: 'Wind Forward H2', side: 'Long', qty: '3,200 MWh', entry: 'R598.00', current: 'R623.50', pnl: '+R81,600', pnlPct: '+4.3%', positive: true },
  { asset: 'Gas Spot', side: 'Short', qty: '1,800 MWh', entry: 'R425.60', current: 'R412.80', pnl: '+R23,040', pnlPct: '+3.0%', positive: true },
  { asset: 'Carbon Credit Dec', side: 'Long', qty: '8,000 t', entry: 'R262.00', current: 'R285.00', pnl: '+R184,000', pnlPct: '+8.8%', positive: true },
];

export default function Trading() {
  const { isDark } = useTheme();
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [positionsData, setPositionsData] = useState(positions);
  const [obData, setObData] = useState(orderBook);

  useEffect(() => {
    (async () => {
      try {
        const [posRes, obRes] = await Promise.all([
          tradingAPI.getPositions(),
          tradingAPI.getOrderbook('solar_ppa'),
        ]);
        if (posRes.data?.data?.length) setPositionsData(posRes.data.data);
        if (obRes.data?.data) setObData(obRes.data.data);
      } catch { /* use demo data */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Trading</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Real-time energy trading with live orderbook</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Chart */}
        <div className={`lg:col-span-2 cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Solar PPA Spot</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white mono">R847.20</span>
                <span className="text-sm font-semibold text-emerald-500 flex items-center gap-0.5"><FiTrendingUp className="w-3.5 h-3.5" /> +4.3%</span>
              </div>
            </div>
            <div className="flex gap-1">
              {['1H', '4H', '1D', '1W', '1M'].map(tf => (
                <button key={tf} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${tf === '1D' ? isDark ? 'bg-white/[0.1] text-white' : 'bg-slate-900 text-white' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>{tf}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={candleData}>
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
              <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} fill="url(#priceGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          {/* Volume bars */}
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={candleData}>
              <Bar dataKey="volume" fill={isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)'} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Book + Place Order */}
        <div className="space-y-4">
          {/* Order Book */}
          <div className={`cp-card !p-4 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Order Book</h3>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-400 dark:text-slate-500 mb-1 px-1">
                <span>Price (R)</span><span>Size (MWh)</span><span>Total</span>
              </div>
              {obData.asks.slice().reverse().map((a, i) => (
                <div key={i} className="flex justify-between px-1 py-0.5 rounded relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 bg-red-500/5" style={{ width: `${(a.total / 50000) * 100}%` }} />
                  <span className="text-red-500 mono relative z-10">{a.price.toFixed(2)}</span>
                  <span className="text-slate-600 dark:text-slate-400 mono relative z-10">{a.size.toLocaleString()}</span>
                  <span className="text-slate-400 mono relative z-10">{a.total.toLocaleString()}</span>
                </div>
              ))}
              <div className={`text-center py-1.5 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'} mono`}>R847.35</div>
              {obData.bids.map((b, i) => (
                <div key={i} className="flex justify-between px-1 py-0.5 rounded relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 bg-emerald-500/5" style={{ width: `${(b.total / 55000) * 100}%` }} />
                  <span className="text-emerald-500 mono relative z-10">{b.price.toFixed(2)}</span>
                  <span className="text-slate-600 dark:text-slate-400 mono relative z-10">{b.size.toLocaleString()}</span>
                  <span className="text-slate-400 mono relative z-10">{b.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Place Order */}
          <div className={`cp-card !p-4 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Place Order</h3>
            <div className="flex gap-1 mb-3">
              <button onClick={() => setOrderSide('buy')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${orderSide === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>BUY</button>
              <button onClick={() => setOrderSide('sell')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${orderSide === 'sell' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : isDark ? 'bg-white/[0.04] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>SELL</button>
            </div>
            <div className="flex gap-1 mb-3">
              {(['limit', 'market'] as const).map(t => (
                <button key={t} onClick={() => setOrderType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${orderType === t ? isDark ? 'bg-white/[0.1] text-white' : 'bg-slate-200 text-slate-800' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t}</button>
              ))}
            </div>
            <div className="space-y-2">
              {orderType === 'limit' && (
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Price (R/MWh)</label>
                  <input type="number" defaultValue={847.20} className={`w-full px-3 py-2 rounded-xl text-sm mono ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white' : 'bg-slate-50 border border-black/[0.06] text-slate-900'}`} />
                </div>
              )}
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Quantity (MWh)</label>
                <input type="number" defaultValue={1000} className={`w-full px-3 py-2 rounded-xl text-sm mono ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white' : 'bg-slate-50 border border-black/[0.06] text-slate-900'}`} />
              </div>
              <button className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${orderSide === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25'}`}>
                {orderSide === 'buy' ? 'Buy' : 'Sell'} Solar PPA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className={`cp-card !p-5 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Open Positions</h3>
          <button className="text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1"><FiRefreshCw className="w-3 h-3" /> Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <th className="text-left py-2 font-medium">Asset</th>
                <th className="text-left py-2 font-medium">Side</th>
                <th className="text-right py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Entry</th>
                <th className="text-right py-2 font-medium">Current</th>
                <th className="text-right py-2 font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {positionsData.map((p, i) => (
                <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-black/[0.04]'} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{p.asset}</td>
                  <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.side === 'Long' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{p.side}</span></td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{p.qty}</td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-400 mono">{p.entry}</td>
                  <td className="py-3 text-right font-medium text-slate-800 dark:text-slate-200 mono">{p.current}</td>
                  <td className="py-3 text-right">
                    <span className={`font-bold mono ${p.positive ? 'text-emerald-500' : 'text-red-500'}`}>{p.pnl}</span>
                    <span className={`text-xs ml-1 ${p.positive ? 'text-emerald-400' : 'text-red-400'}`}>{p.pnlPct}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
