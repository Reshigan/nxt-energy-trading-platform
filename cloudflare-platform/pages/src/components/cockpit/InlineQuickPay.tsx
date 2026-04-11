import React, { useState } from 'react';
import { FiCreditCard, FiX } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
  onPay: (invoiceId: string, method: string) => void;
  onCancel: () => void;
}

export default function InlineQuickPay({ invoiceId, invoiceNumber, amountCents, onPay, onCancel }: Props) {
  const { isDark } = useTheme();
  const [method, setMethod] = useState('eft');

  const inp = `w-full rounded-lg px-3 py-2 text-sm border ${isDark ? 'bg-[#0D1526] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-slate-900'}`;

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Pay Invoice</h4>
        <button type="button" onClick={onCancel} className="p-1 hover:opacity-70"><FiX className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{invoiceNumber}</span>
        <span className={`text-lg font-bold mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
          R{(amountCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <select value={method} onChange={(e) => setMethod(e.target.value)} className={inp}>
        <option value="eft">EFT Bank Transfer</option>
        <option value="card">Card Payment</option>
        <option value="debit_order">Debit Order</option>
      </select>
      <button
        onClick={() => onPay(invoiceId, method)}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 bg-[#d4e157] text-[#1a2e1a] text-sm font-bold hover:opacity-90 transition-opacity"
      >
        <FiCreditCard className="w-4 h-4" /> Confirm Payment
      </button>
    </div>
  );
}
