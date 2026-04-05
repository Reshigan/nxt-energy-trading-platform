import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { tradingAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const MARKETS = ['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery'];

export default function Trading() {
  const [selectedMarket, setSelectedMarket] = useState('solar');
  const [indices, setIndices] = useState<Record<string, { price: number; change_24h: number; volume_24h: number }>>({});
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [positions, setPositions] = useState<Array<Record<string, unknown>>>([]);
  const [orderbook, setOrderbook] = useState<{ bids: Array<{ price: number; volume: number }>; asks: Array<{ price: number; volume: number }> }>({ bids: [], asks: [] });
  const [priceData, setPriceData] = useState<Array<{ time: string; close: number; volume: number }>>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    direction: 'buy' as 'buy' | 'sell',
    market: 'solar',
    volume: '',
    price: '',
    order_type: 'limit',
    validity: 'day',
    iceberg_visible_qty: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedMarket]);

  const loadData = async () => {
    try {
      const [indicesRes, ordersRes, positionsRes, bookRes, pricesRes] = await Promise.allSettled([
        tradingAPI.getIndices(),
        tradingAPI.getOrders(),
        tradingAPI.getPositions(),
        tradingAPI.getOrderbook(selectedMarket),
        tradingAPI.getPrices(selectedMarket),
      ]);
      if (indicesRes.status === 'fulfilled') setIndices(indicesRes.value.data.data);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data);
      if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.data.data);
      if (bookRes.status === 'fulfilled') setOrderbook(bookRes.value.data.data);
      if (pricesRes.status === 'fulfilled') setPriceData(pricesRes.value.data.data.candles || []);
    } catch { /* ignore */ }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await tradingAPI.placeOrder({
        direction: orderForm.direction,
        market: orderForm.market,
        volume: parseFloat(orderForm.volume),
        price: orderForm.price ? parseFloat(orderForm.price) : undefined,
        order_type: orderForm.order_type,
        validity: orderForm.validity,
        iceberg_visible_qty: orderForm.iceberg_visible_qty ? parseFloat(orderForm.iceberg_visible_qty) : undefined,
      });
      setShowOrderModal(false);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (id: string) => {
    try {
      await tradingAPI.cancelOrder(id);
      loadData();
    } catch { /* ignore */ }
  };

  const inputClass = 'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Trading Engine</h1>
        <div className="flex gap-2">
          <button onClick={loadData} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowOrderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
            <FiPlus className="w-4 h-4" /> Place Order
          </button>
        </div>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {MARKETS.map((m) => {
          const idx = indices[m] || { price: 0, change_24h: 0, volume_24h: 0 };
          const isUp = idx.change_24h >= 0;
          return (
            <button
              key={m}
              onClick={() => { setSelectedMarket(m); setOrderForm({ ...orderForm, market: m }); }}
              className={`p-3 rounded-lg transition-all text-left ${selectedMarket === m ? 'bg-cyan-600/20 border border-cyan-500/30' : 'bg-slate-800/50 hover:bg-slate-800'}`}
            >
              <div className="text-xs text-slate-400 capitalize">{m}</div>
              <div className="text-lg font-bold">R{(idx.price / 100).toFixed(2)}</div>
              <div className={`text-xs flex items-center ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <FiTrendingUp className="w-3 h-3 mr-1" /> : <FiTrendingDown className="w-3 h-3 mr-1" />}
                {idx.change_24h.toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 chart-glass p-6">
          <h3 className="font-semibold mb-4 capitalize">{selectedMarket} Price Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData.length > 0 ? priceData : [{ time: 'No data', close: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="close" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Book */}
        <div className="chart-glass p-6">
          <h3 className="font-semibold mb-4">Order Book</h3>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            <div className="text-xs text-slate-400 flex justify-between mb-2">
              <span>Price (R)</span><span>Volume</span>
            </div>
            {orderbook.asks.slice().reverse().map((a, i) => (
              <div key={`ask-${i}`} className="flex justify-between text-xs py-0.5">
                <span className="text-red-400">{(a.price / 100).toFixed(2)}</span>
                <span className="text-slate-400">{a.volume}</span>
              </div>
            ))}
            <div className="border-t border-b border-slate-700 py-1 my-1 text-center text-sm font-bold text-cyan-400">
              Spread
            </div>
            {orderbook.bids.map((b, i) => (
              <div key={`bid-${i}`} className="flex justify-between text-xs py-0.5">
                <span className="text-emerald-400">{(b.price / 100).toFixed(2)}</span>
                <span className="text-slate-400">{b.volume}</span>
              </div>
            ))}
            {orderbook.bids.length === 0 && orderbook.asks.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">No orders in book</div>
            )}
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className="chart-glass p-6">
        <h3 className="font-semibold mb-4">Positions</h3>
        {positions.length === 0 ? (
          <p className="text-sm text-slate-400">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Market</th>
                  <th className="text-right py-2">Net Vol</th>
                  <th className="text-right py-2">Avg Entry</th>
                  <th className="text-right py-2">Current</th>
                  <th className="text-right py-2">Unrealised P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => (
                  <tr key={i} className="border-t border-slate-800">
                    <td className="py-2 capitalize">{pos.market as string}</td>
                    <td className="text-right">{pos.net_volume as number}</td>
                    <td className="text-right">R{((pos.avg_entry_price_cents as number || 0) / 100).toFixed(2)}</td>
                    <td className="text-right">R{((pos.current_price_cents as number || 0) / 100).toFixed(2)}</td>
                    <td className={`text-right ${(pos.unrealised_pnl_cents as number || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      R{((pos.unrealised_pnl_cents as number || 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Orders */}
      <div className="chart-glass p-6">
        <h3 className="font-semibold mb-4">Open Orders</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400">No orders</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left py-2">Market</th>
                  <th className="text-left py-2">Side</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Volume</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id as string} className="border-t border-slate-800">
                    <td className="py-2 capitalize">{o.market as string}</td>
                    <td className={o.direction === 'buy' ? 'text-emerald-400' : 'text-red-400'}>{o.direction as string}</td>
                    <td>{o.order_type as string}</td>
                    <td className="text-right">{o.volume as number}</td>
                    <td className="text-right">{o.price_cents ? `R${((o.price_cents as number) / 100).toFixed(2)}` : 'MKT'}</td>
                    <td><StatusBadge status={o.status as string} /></td>
                    <td className="text-right">
                      {(o.status === 'open' || o.status === 'partial') && (
                        <button onClick={() => cancelOrder(o.id as string)} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Place Order Modal */}
      <Modal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)} title="Place Order" size="md">
        {error && <div className="mb-3 p-2 rounded bg-red-500/20 text-red-400 text-sm">{error}</div>}
        <form onSubmit={placeOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOrderForm({ ...orderForm, direction: 'buy' })}
              className={`py-2 rounded-lg font-medium text-sm ${orderForm.direction === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              Buy
            </button>
            <button type="button" onClick={() => setOrderForm({ ...orderForm, direction: 'sell' })}
              className={`py-2 rounded-lg font-medium text-sm ${orderForm.direction === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              Sell
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Market</label>
              <select className={inputClass} value={orderForm.market} onChange={(e) => setOrderForm({ ...orderForm, market: e.target.value })}>
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Order Type</label>
              <select className={inputClass} value={orderForm.order_type} onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}>
                <option value="limit">Limit</option>
                <option value="market">Market</option>
                <option value="stop_loss">Stop Loss</option>
                <option value="take_profit">Take Profit</option>
                <option value="iceberg">Iceberg</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Volume (MWh)</label>
              <input className={inputClass} type="number" step="0.01" value={orderForm.volume} onChange={(e) => setOrderForm({ ...orderForm, volume: e.target.value })} required />
            </div>
            {orderForm.order_type !== 'market' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Price (R/MWh)</label>
                <input className={inputClass} type="number" step="0.01" value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Validity</label>
              <select className={inputClass} value={orderForm.validity} onChange={(e) => setOrderForm({ ...orderForm, validity: e.target.value })}>
                <option value="day">Day</option>
                <option value="gtc">Good Till Cancelled</option>
                <option value="ioc">Immediate or Cancel</option>
                <option value="fok">Fill or Kill</option>
              </select>
            </div>
            {orderForm.order_type === 'iceberg' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Visible Qty</label>
                <input className={inputClass} type="number" step="0.01" value={orderForm.iceberg_visible_qty} onChange={(e) => setOrderForm({ ...orderForm, iceberg_visible_qty: e.target.value })} />
              </div>
            )}
          </div>
          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-lg font-medium text-white ${orderForm.direction === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} disabled:opacity-50 transition-colors`}>
            {loading ? 'Placing...' : `${orderForm.direction === 'buy' ? 'Buy' : 'Sell'} ${orderForm.market}`}
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
