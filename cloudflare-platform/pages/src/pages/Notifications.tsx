import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsAPI } from '../lib/api';
import { useNotificationStore } from '../lib/store';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
}

export default function Notifications() {
  const { isDark } = useTheme();
  const { setNotifications } = useNotificationStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await notificationsAPI.list({ limit: '50' });
      const data = res.data?.data || [];
      setItems(data);
      setNotifications(data.map((n: Notification) => ({ id: n.id, title: n.title, body: n.body, type: n.type, read: !!n.read, created_at: n.created_at })));
    } catch {
      setError('Failed to load notifications');
    }
    setLoading(false);
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsAPI.markRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  const typeColors: Record<string, string> = {
    trading: 'text-blue-500 bg-blue-500/10',
    compliance: 'text-amber-500 bg-amber-500/10',
    settlement: 'text-emerald-500 bg-emerald-500/10',
    carbon: 'text-green-500 bg-green-500/10',
    contract: 'text-purple-500 bg-purple-500/10',
    system: 'text-slate-500 bg-slate-500/10',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {items.filter(n => !n.read).length} unread
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <FiCheckCircle className="w-4 h-4" /> Mark all read
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <FiLoader className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          <FiAlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <FiBell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No notifications yet</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map(n => (
          <div key={n.id}
            className={`cp-card !p-4 flex items-start gap-3 transition-all ${
              !n.read ? (isDark ? '!bg-[#151F32] !border-blue-500/20' : '!bg-blue-50/50 !border-blue-200/50') : ''
            }`}>
            <div className={`mt-0.5 p-2 rounded-lg ${typeColors[n.type] || typeColors.system}`}>
              <FiBell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{n.title}</h3>
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                {new Date(n.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!n.read && (
              <button onClick={() => handleMarkRead(n.id)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400"
                title="Mark as read">
                <FiCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
