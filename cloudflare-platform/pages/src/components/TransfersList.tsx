import React from 'react';
import { FiArrowUpRight, FiArrowDownLeft } from '../lib/fi-icons-shim';

interface Transfer {
  id: string;
  type: 'in' | 'out';
  counterparty: string;
  amount: string;
  asset: string;
  time: string;
}

const transfers: Transfer[] = [
  { id: '1', type: 'in', counterparty: 'Eskom Holdings', amount: '+R842,000', asset: 'Solar PPA', time: '2 min ago' },
  { id: '2', type: 'out', counterparty: 'Carbon Bridge', amount: '-R125,000', asset: 'Carbon Credits', time: '15 min ago' },
  { id: '3', type: 'in', counterparty: 'BevCo Power', amount: '+R1,240,000', asset: 'Wind Contract', time: '1 hr ago' },
  { id: '4', type: 'out', counterparty: 'GreenFund SA', amount: '-R430,000', asset: 'RECs', time: '3 hr ago' },
  { id: '5', type: 'in', counterparty: 'TerraVolt Energy', amount: '+R680,000', asset: 'Gas Forward', time: '5 hr ago' },
];

export default function TransfersList() {
  return (
    <div className="space-y-1">
      {transfers.map((t, i) => (
        <div key={t.id}
          className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
          style={{ animation: `cardFadeUp 500ms ease ${i * 80}ms both` }}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              t.type === 'in' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-red-50 dark:bg-red-500/10 text-red-500'
            }`}>
              {t.type === 'in' ? <FiArrowDownLeft className="w-4 h-4" /> : <FiArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.counterparty}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t.asset}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold mono ${t.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{t.amount}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
