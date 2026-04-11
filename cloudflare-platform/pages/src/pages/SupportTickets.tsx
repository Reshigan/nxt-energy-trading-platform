import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ticketsAPI } from '../lib/api';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  sender_id: string;
  message: string;
  is_internal_note: number;
  created_at: string;
}

export default function SupportTickets() {
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [form, setForm] = useState({ subject: '', category: 'general', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await ticketsAPI.list();
      setTickets(res.data.data || []);
    } catch {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ticketsAPI.create(form);
      setShowCreate(false);
      setForm({ subject: '', category: 'general', description: '', priority: 'medium' });
      fetchTickets();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

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
      await ticketsAPI.addMessage(selectedTicket, { message: newMessage });
      setNewMessage('');
      viewTicket(selectedTicket);
    } catch {
      setError('Failed to send message');
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
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Support Tickets</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-16 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
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
          &larr; Back to tickets
        </button>
        <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{ticket?.subject}</h1>
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(ticket?.status || '')}`}>{ticket?.status}</span>
          <span className={`text-xs ${priorityColor(ticket?.priority || '')}`}>{ticket?.priority}</span>
        </div>

        <div className="space-y-3 mb-6">
          {messages.map(msg => (
            <div key={msg.id} className={`p-3 rounded-lg ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{msg.message}</p>
              <span className={`text-xs mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {new Date(msg.created_at).toLocaleString()}
                {msg.is_internal_note ? ' (internal note)' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text" placeholder="Type a message..."
            value={newMessage} onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
          />
          <button onClick={sendMessage} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Support Tickets</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Submit and track support requests
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
          + New Ticket
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>New Support Ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="text" required placeholder="Subject"
              value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            />
            <select
              value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            >
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="kyc">KYC</option>
              <option value="trading">Trading</option>
            </select>
          </div>
          <textarea
            required placeholder="Describe your issue..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
            className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Ticket'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No tickets yet.</p>
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
                <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
