import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ticketsAPI } from '../lib/api';

interface Ticket {
  id: string;
  participant_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_resolution_hours: number;
}

interface TicketMessage {
  id: string;
  sender_id: string;
  message: string;
  is_internal_note: number;
  created_at: string;
}

export default function SupportDashboard() {
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        ticketsAPI.list({ status: filter === 'all' ? undefined : filter }),
        ticketsAPI.stats(),
      ]);
      setTickets(ticketsRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const viewTicket = async (id: string) => {
    setSelectedTicket(id);
    try {
      const res = await ticketsAPI.get(id);
      setMessages(res.data.data?.messages || []);
    } catch {
      setError('Failed to load ticket');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      await ticketsAPI.addMessage(selectedTicket, { message: newMessage, is_internal_note: isInternal });
      setNewMessage('');
      viewTicket(selectedTicket);
    } catch {
      setError('Failed to send message');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await ticketsAPI.update(id, { status });
      fetchData();
      if (selectedTicket === id) viewTicket(id);
    } catch {
      setError('Failed to update ticket');
    }
  };

  const statusColor = (status: string) => {
    if (status === 'open') return 'text-blue-400 bg-blue-500/10';
    if (status === 'in_progress') return 'text-amber-400 bg-amber-500/10';
    if (status === 'resolved') return 'text-emerald-400 bg-emerald-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  const priorityColor = (priority: string) => {
    if (priority === 'critical') return 'text-red-400';
    if (priority === 'high') return 'text-orange-400';
    if (priority === 'medium') return 'text-amber-400';
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Support Dashboard</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-20 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    const ticket = tickets.find(t => t.id === selectedTicket);
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={() => setSelectedTicket(null)} className={`mb-4 text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          &larr; Back to dashboard
        </button>
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{ticket?.subject}</h1>
          <div className="flex items-center gap-2">
            <select
              value={ticket?.status}
              onChange={e => updateStatus(selectedTicket, e.target.value)}
              className={`px-2 py-1 rounded-lg border text-xs ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(ticket?.status || '')}`}>{ticket?.status}</span>
          <span className={`text-xs ${priorityColor(ticket?.priority || '')}`}>{ticket?.priority}</span>
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>#{ticket?.id.slice(0, 8)}</span>
        </div>

        <div className="space-y-3 mb-6">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg border ${
                msg.is_internal_note
                  ? isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                  : isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'
              }`}
            >
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{msg.message}</p>
              <span className={`text-xs mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {new Date(msg.created_at).toLocaleString()}
                {msg.is_internal_note ? ' - Internal Note' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text" placeholder={isInternal ? 'Internal note (not visible to user)...' : 'Reply to user...'}
              value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            />
            <button onClick={sendMessage} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              Send
            </button>
          </div>
          <label className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
            Internal note (only visible to staff)
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Support Dashboard</h1>
      <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Manage and respond to support tickets
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Open', value: stats.open, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-amber-400' },
            { label: 'Resolved', value: stats.resolved, color: 'text-emerald-400' },
            { label: 'Avg Resolution', value: `${stats.avg_resolution_hours ?? 0}h`, color: 'text-purple-400' },
          ].map(stat => (
            <div key={stat.label} className={`p-3 rounded-xl border text-center ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No tickets match this filter.</p>
        ) : (
          tickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => viewTicket(ticket.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{ticket.subject}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(ticket.status)}`}>{ticket.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{ticket.category}</span>
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>#{ticket.id.slice(0, 8)}</span>
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
