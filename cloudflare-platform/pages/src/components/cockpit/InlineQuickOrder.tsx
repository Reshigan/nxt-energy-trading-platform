import React, { useState } from 'react';
import { FiSend, FiX } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  onSubmit: (data: { market: string; side: 'buy' | 'sell'; quantity: number; price: number }) => void;
  onCancel: () => void;
}

export default function InlineQuickOrder({ onSubmit, onCancel }: Props) {
  const { isDark } = useTheme();
  const [market, setMarket] = useState('DAM');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !price) return;
    onSubmit({ market, side, quantity: Number(quantity), price: Number(price) });
  };

  const inp = `w-full rounded-lg px-3 py-2 text-sm border ${isDark ? 'bg-[#0D1526] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900'}`;

  return (
    <form onSubmit={handleSubmit} className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Quick Order</h4>
        <button type="button" onClick={onCancel} className="p-1 hover:opacity-70"><FiX className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={market} onChange={(e) => setMarket(e.target.value)} className={inp}>
          <option value="DAM">Day-Ahead</option>
          <option value="IDM">Intraday</option>
          <option value="BM">Balancing</option>
          <option value="CARBON">Carbon</option>
        </select>
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
          <button type="button" onClick={() => setSide('buy')} className={`flex-1 text-xs font-bold py-2 ${side === 'buy' ? 'bg-emerald-500 text-white' : isDark ? 'bg-[#0D1526] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>BUY</button>
          <button type="button" onClick={() => setSide('sell')} className={`flex-1 text-xs font-bold py-2 ${side === 'sell' ? 'bg-red-500 text-white' : isDark ? 'bg-[#0D1526] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>SELL</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" placeholder="Qty (MWh)" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inp} min="0" step="0.1" />
        <input type="number" placeholder="Price (R/MWh)" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} min="0" step="0.01" />
      </div>
      <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg py-2 bg-[#d4e157] text-[#1a2e1a] text-sm font-bold hover:opacity-90 transition-opacity">
        <FiSend className="w-4 h-4" /> Place Order
      </button>
    </form>
  );
}
