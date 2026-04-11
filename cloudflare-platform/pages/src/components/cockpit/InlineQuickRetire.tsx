import React, { useState } from 'react';
import { FiCheck, FiX } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  creditId: string;
  maxQuantity: number;
  onRetire: (creditId: string, data: { quantity: number; beneficiary: string; purpose: string }) => void;
  onCancel: () => void;
}

export default function InlineQuickRetire({ creditId, maxQuantity, onRetire, onCancel }: Props) {
  const { isDark } = useTheme();
  const [quantity, setQuantity] = useState(String(maxQuantity));
  const [beneficiary, setBeneficiary] = useState('');
  const [purpose, setPurpose] = useState('');

  const inp = `w-full rounded-lg px-3 py-2 text-sm border ${isDark ? 'bg-[#0D1526] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900'}`;

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Retire Carbon Credits</h4>
        <button type="button" onClick={onCancel} className="p-1 hover:opacity-70"><FiX className="w-4 h-4 text-slate-400" /></button>
      </div>
      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Credit: {creditId} | Max: {maxQuantity} tCO₂e</p>
      <input type="number" placeholder="Quantity (tCO₂e)" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inp} min="1" max={maxQuantity} />
      <input placeholder="Beneficiary" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className={inp} />
      <input placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inp} />
      <button
        onClick={() => onRetire(creditId, { quantity: Number(quantity), beneficiary, purpose })}
        disabled={!quantity || !beneficiary || !purpose}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 bg-emerald-500 text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
      >
        <FiCheck className="w-4 h-4" /> Retire Credits
      </button>
    </div>
  );
}
