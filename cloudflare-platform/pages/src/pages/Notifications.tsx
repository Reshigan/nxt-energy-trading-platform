import React, { useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiAlertCircle, FiInfo, FiDollarSign, FiFileText } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const notifications = [
  { id: 1, type: 'trade', title: 'Order Filled', message: 'Your buy order for 100 MWh Solar Spot was filled at R680/MWh', time: '2 min ago', read: false },
  { id: 2, type: 'contract', title: 'Contract Signed', message: 'PPA-2024-001 has been signed by all parties. SHA-256 hash verified.', time: '15 min ago', read: false },
  { id: 3, type: 'carbon', title: 'Carbon Credits Retired', message: '500 tCO2e retired from VCS-2024-8821. Certificate generated.', time: '1 hour ago', read: false },
  { id: 4, type: 'settlement', title: 'Invoice Payment Received', message: 'INV-2024-002 paid by BevCo Power. R1,240,000 settled.', time: '2 hours ago', read: true },
  { id: 5, type: 'system', title: 'System Maintenance', message: 'Scheduled maintenance window: April 10, 02:00-04:00 SAST', time: '5 hours ago', read: true },
  { id: 6, type: 'compliance', title: 'BBBEE Certificate Expiring', message: 'Your BBBEE certificate expires in 30 days. Please upload renewed certificate.', time: '1 day ago', read: true },
  { id: 7, type: 'trade', title: 'Position Margin Warning', message: 'Your Wind Forward H2 position is approaching margin threshold (85%).', time: '1 day ago', read: true },
  { id: 8, type: 'system', title: 'New Feature: P2P Trading', message: 'P2P energy trading is now live. Trade directly with peers by zone.', time: '2 days ago', read: true },
];

const typeIcons: Record<string, React.ReactNode> = {
  trade: <FiDollarSign className="w-4 h-4 text-blue-500" />,
  contract: <FiFileText className="w-4 h-4 text-purple-500" />,
  carbon: <FiCheckCircle className="w-4 h-4 text-emerald-500" />,
  settlement: <FiDollarSign className="w-4 h-4 text-amber-500" />,
  system: <FiInfo className="w-4 h-4 text-slate-400" />,
  compliance: <FiAlertCircle className="w-4 h-4 text-red-500" />,
};

export default function Notifications() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(items.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setItems(items.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 rounded-2xl text-sm font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all flex items-center gap-2">
            <FiCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {items.map((n, i) => (
          <button key={n.id} onClick={() => markRead(n.id)}
            className={`w-full cp-card !p-4 text-left transition-all ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${!n.read ? c('ring-1 ring-blue-500/20 !bg-blue-500/[0.04]', 'ring-1 ring-blue-500/10 !bg-blue-50/50') : ''}`}
            style={{ animation: `cardFadeUp 400ms ease ${100 + i * 40}ms both` }}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-xl ${c('bg-white/[0.04]', 'bg-slate-100')}`}>
                {typeIcons[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{n.title}</h3>
                  <span className="text-[11px] text-slate-400 ml-2 whitespace-nowrap">{n.time}</span>
                </div>
                <p className={`text-xs mt-0.5 ${!n.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>{n.message}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
