import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { tradingAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useThemeClasses } from '../hooks/useThemeClasses';

const MARKETS = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];

export default function Trading() {
  const [selectedMarket, setSelectedMarket] = useState('solar');
  const [indices, setIndices] = useState<Record<string, { price: number; change_24h: number; volume_24h: number }>>({});
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);
  const [orderbook, setOrderbook] = useState<{ bids: Array<{ price: number; volume: number }>; asks: Array<{ price: number; volume: number }> }>({ bids: [], asks: [] });
  const [priceData, setPriceData] = useState<Array<{ time: string; close: number; volume: number }>>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ direction: 'buy' as 'buy' | 'sell', market: 'solar', volume: '', price: '', order_type: 'limit', validity: 'day', iceberg_visible_qty: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tc = useThemeClasses();

  useEffect(() => { loadData(); }, [selectedMarket]);

  const loadData = async () => {
    try {
      const [indicesRes, ordersRes, positionsRes, bookRes, pricesRes] = await Promise.allSettled([
        tradingAPI.getIndices(), tradingAPI.getOrders(), tradingAPI.getPositions(),
        tradingAPI.getOrderbook(selectedMarket), tradingAPI.getPrices(selectedMarket),
      ]);
      if (indicesRes.status === 'fulfilled') setIndices(indicesRes.value.data.data);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data);
      if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.data.data);
      if (bookRes.status === 'fulfilled') setOrderbook(bookRes.value.data.data);
      if (pricesRes.status === 'fulfilled') setPriceData(pricesRes.value.data.data.candles || []);
    } catch { /* ignore */ }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await tradingAPI.placeOrder({ direction: orderForm.direction, market: orderForm.market, volume: parseFloat(orderForm.volume),
        price: orderForm.price ? parseFloat(orderForm.price) : undefined, order_type: orderForm.order_type, validity: orderForm.validity,
        iceberg_visible_qty: orderForm.iceberg_visible_qty ? parseFloat(orderForm.iceberg_visible_qty) : undefined });
      setShowOrderModal(false); loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Order failed');
    } finally { setLoading(false); }
  };

  const cancelOrder = async (id: string) => { try { await tradingAPI.cancelOrder(id); loadData(); } catch { /* ignore */ } };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Trading Engine</h1>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2 rounded-xl transition-colors ${tc.btnSecondary}`}><FiRefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowOrderModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${tc.btnPrimary}`}>
            <FiPlus className="w-4 h-4" /> Place Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {MARKETS.map((m) => {
          const idx = indices[m] || { price: 0, change_24h: 0, volume_24h: 0 };
          const isUp = idx.change_24h >= 0;
          return (
            <button key={m} onClick={() => { setSelectedMarket(m); setOrderForm({ ...orderForm, market: m }); }}
              className={`p-3 rounded-xl transition-all text-left ${selectedMarket === m
                ? 'bg-blue-500/15 border border-blue-500/30'
                : tc.isDark ? 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06]' : 'bg-white hover:bg-slate-50 border border-slate-200'}`}>
              <div className={`text-xs capitalize ${tc.textMuted}`}>{m}</div>
              <div className={`text-lg font-bold ${tc.textPrimary}`}>R{(idx.price / 100).toFixed(2)}</div>
              <div className={`text-xs flex items-center ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {isUp ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                {idx.change_24h.toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-2xl p-6 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 capitalize ${tc.textPrimary}`}>{selectedMarket} Price Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData.length > 0 ? priceData : [{ time: 'No data', close: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
              <XAxis dataKey="time" stroke={tc.chartAxis} tick={{ fontSize: 10 }} />
              <YAxis stroke={tc.chartAxis} />
              <Tooltip contentStyle={{ backgroundColor: tc.chartTooltipBg, borderColor: tc.chartTooltipBorder, borderRadius: '12px' }} />
              <Line type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
          <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Order Book</h3>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            <div className={`text-xs flex justify-between mb-2 ${tc.textMuted}`}><span>Price (R)</span><span>Volume</span></div>
            {orderbook.asks.slice().reverse().map((a, i) => (
              <div key={`ask-${i}`} className="flex justify-between text-xs py-0.5"><span className="text-red-500">{(a.price / 100).toFixed(2)}</span><span className={tc.textMuted}>{a.volume}</span></div>
            ))}
            <div className={`border-t border-b py-1 my-1 text-center text-sm font-bold text-blue-500 ${tc.border}`}>Spread</div>
            {orderbook.bids.map((b, i) => (
              <div key={`bid-${i}`} className="flex justify-between text-xs py-0.5"><span className="text-emerald-500">{(b.price / 100).toFixed(2)}</span><span className={tc.textMuted}>{b.volume}</span></div>
            ))}
            {orderbook.bids.length === 0 && orderbook.asks.length === 0 && <div className={`text-xs text-center py-4 ${tc.textMuted}`}>No orders in book</div>}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
        <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Positions</h3>
        {positions.length === 0 ? <p className={`text-sm ${tc.textMuted}`}>No open positions</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={tc.textMuted}>
                <th className="text-left py-2 text-xs">Market</th><th className="text-right py-2 text-xs">Net Vol</th>
                <th className="text-right py-2 text-xs">Avg Entry</th><th className="text-right py-2 text-xs">Current</th>
                <th className="text-right py-2 text-xs">Unrealised P&L</th>
              </tr></thead>
              <tbody>{positions.map((pos, i) => (
                <tr key={i} className={`border-t ${tc.border}`}>
                  <td className={`py-2 capitalize ${tc.textPrimary}`}>{pos.market as string}</td>
                  <td className={`text-right ${tc.textSecondary}`}>{pos.net_volume as number}</td>
                  <td className={`text-right ${tc.textSecondary}`}>R{((pos.avg_entry_price_cents as number || 0) / 100).toFixed(2)}</td>
                  <td className={`text-right ${tc.textSecondary}`}>R{((pos.current_price_cents as number || 0) / 100).toFixed(2)}</td>
                  <td className={`text-right ${(pos.unrealised_pnl_cents as number || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    R{((pos.unrealised_pnl_cents as number || 0) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
        <h3 className={`font-semibold mb-4 ${tc.textPrimary}`}>Open Orders</h3>
        {orders.length === 0 ? <p className={`text-sm ${tc.textMuted}`}>No orders</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={tc.textMuted}>
                <th className="text-left py-2 text-xs">Market</th><th className="text-left py-2 text-xs">Side</th>
                <th className="text-left py-2 text-xs">Type</th><th className="text-right py-2 text-xs">Volume</th>
                <th className="text-right py-2 text-xs">Price</th><th className="text-left py-2 text-xs">Status</th>
                <th className="text-right py-2 text-xs">Action</th>
              </tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id as string} className={`border-t ${tc.border}`}>
                  <td className={`py-2 capitalize ${tc.textPrimary}`}>{o.market as string}</td>
                  <td className={o.direction === 'buy' ? 'text-emerald-500' : 'text-red-500'}>{o.direction as string}</td>
                  <td className={tc.textSecondary}>{o.order_type as string}</td>
                  <td className={`text-right ${tc.textSecondary}`}>{o.volume as number}</td>
                  <td className={`text-right ${tc.textSecondary}`}>{o.price_cents ? `R${((o.price_cents as number) / 100).toFixed(2)}` : 'MKT'}</td>
                  <td><StatusBadge status={o.status as string} /></td>
                  <td className="text-right">
                    {(o.status === 'open' || o.status === 'partial') && (
                      <button onClick={() => cancelOrder(o.id as string)} className="text-xs text-red-500 hover:text-red-400">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)} title="Place Order" size="md">
        {error && <div className="mb-3 p-2 rounded-lg bg-red-500/15 text-red-500 text-sm">{error}</div>}
        <form onSubmit={placeOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOrderForm({ ...orderForm, direction: 'buy' })}
              className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${orderForm.direction === 'buy' ? 'bg-emerald-600 text-white' : tc.btnSecondary}`}>Buy</button>
            <button type="button" onClick={() => setOrderForm({ ...orderForm, direction: 'sell' })}
              className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${orderForm.direction === 'sell' ? 'bg-red-600 text-white' : tc.btnSecondary}`}>Sell</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Market</label>
              <select className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} value={orderForm.market} onChange={(e) => setOrderForm({ ...orderForm, market: e.target.value })}>
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
            <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Order Type</label>
              <select className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} value={orderForm.order_type} onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}>
                <option value="limit">Limit</option><option value="market">Market</option><option value="stop_loss">Stop Loss</option>
                <option value="take_profit">Take Profit</option><option value="iceberg">Iceberg</option>
              </select></div>
            <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Volume (MWh)</label>
              <input className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} type="number" step="0.01" value={orderForm.volume} onChange={(e) => setOrderForm({ ...orderForm, volume: e.target.value })} required /></div>
            {orderForm.order_type !== 'market' && (
              <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Price (R/MWh)</label>
                <input className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} type="number" step="0.01" value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} required /></div>
            )}
            <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Validity</label>
              <select className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} value={orderForm.validity} onChange={(e) => setOrderForm({ ...orderForm, validity: e.target.value })}>
                <option value="day">Day</option><option value="gtc">Good Till Cancelled</option><option value="ioc">Immediate or Cancel</option><option value="fok">Fill or Kill</option>
              </select></div>
            {orderForm.order_type === 'iceberg' && (
              <div><label className={`block text-xs mb-1.5 ${tc.textMuted}`}>Visible Qty</label>
                <input className={`w-full px-3 py-2 rounded-xl text-sm ${tc.input}`} type="number" step="0.01" value={orderForm.iceberg_visible_qty} onChange={(e) => setOrderForm({ ...orderForm, iceberg_visible_qty: e.target.value })} /></div>
            )}
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-xl font-medium text-white ${orderForm.direction === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} disabled:opacity-50 transition-colors`}>
            {loading ? 'Placing...' : `${orderForm.direction === 'buy' ? 'Buy' : 'Sell'} ${orderForm.market}`}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
