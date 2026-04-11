import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { staffAPI } from '../lib/api';

interface StaffMember {
  id: string;
  email: string;
  company_name: string;
  admin_level: string;
  created_at: string;
}

export default function StaffManagement() {
  const { isDark } = useTheme();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', company_name: '', admin_level: 'support' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await staffAPI.list();
      setStaff(res.data.data || []);
    } catch {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await staffAPI.create(form);
      setShowCreate(false);
      setForm({ email: '', password: '', company_name: '', admin_level: 'support' });
      fetchStaff();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || 'Failed to create staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this staff member\'s access?')) return;
    try {
      await staffAPI.revoke(id);
      fetchStaff();
    } catch {
      setError('Failed to revoke access');
    }
  };

  const levelColor = (level: string) => {
    if (level === 'superadmin') return 'text-red-400 bg-red-500/10';
    if (level === 'admin') return 'text-amber-400 bg-amber-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Staff Management</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-16 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Staff Management</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage internal staff accounts (superadmin, admin, support)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          + Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Staff Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input
              type="email" required placeholder="Email"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            />
            <input
              type="password" required placeholder="Password (min 8 chars)" minLength={8}
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            />
            <input
              type="text" required placeholder="Display Name"
              value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            />
            <select
              value={form.admin_level} onChange={e => setForm({ ...form, admin_level: e.target.value })}
              className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
            >
              <option value="support">Support</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {staff.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No staff members yet.</p>
        ) : (
          staff.map(member => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{member.company_name || member.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor(member.admin_level)}`}>
                    {member.admin_level}
                  </span>
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{member.email}</span>
              </div>
              <button
                onClick={() => handleRevoke(member.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
