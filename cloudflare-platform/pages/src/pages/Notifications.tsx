import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiCheck } from 'react-icons/fi';
import { participantsAPI } from '../lib/api';
import { useNotificationStore } from '../lib/store';
import { useThemeClasses } from '../hooks/useThemeClasses';

export default function Notifications() {
  const tc = useThemeClasses();
  const { notifications, setNotifications, markRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await participantsAPI.getNotifications();
      setNotifications(res.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await participantsAPI.markNotificationRead(id);
      markRead(id);
    } catch { /* ignore */ }
  };

  const typeColors: Record<string, string> = {
    info: 'border-l-cyan-500',
    success: 'border-l-emerald-500',
    warning: 'border-l-yellow-500',
    danger: 'border-l-red-500',
    compliance: 'border-l-purple-500',
    trading: 'border-l-blue-500',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className={`text-2xl font-bold ${tc.textPrimary}`}>Notifications</h1>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className={`${tc.cardBg} p-12 text-center`}>
          <FiBell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id}
              className={`${tc.cardBg} p-4 border-l-4 ${typeColors[n.type] || 'border-l-slate-500'} ${!n.read ? (tc.isDark ? 'bg-slate-800/80' : 'bg-blue-50/50') : 'opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{n.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{n.body}</p>
                  <span className="text-xs text-slate-500 mt-2 block">{n.created_at}</span>
                </div>
                {!n.read && (
                  <button onClick={() => handleMarkRead(n.id)} className={`p-1.5 rounded-lg ${tc.isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors ml-2`} title="Mark as read">
                    <FiCheck className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
