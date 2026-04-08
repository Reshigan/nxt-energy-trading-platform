import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiShield, FiSettings, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { adminAPI } from '../lib/api';
import { formatDate } from '../lib/format';
import { DataTable, Button, Modal, Input, Select, Tabs, ConfirmDialog } from '../components/ui';
import type { Column } from '../components/ui';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  users_count: number;
  created_at: string;
  admin_email: string;
  [key: string]: unknown;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  last_login: string;
  created_at: string;
  [key: string]: unknown;
}

const TAB_ITEMS = [
  { key: 'tenants', label: 'Tenants' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles & Permissions' },
];

export default function TenantAdmin() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('tenants');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', admin_email: '', plan: 'starter' });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'tenants') {
        const res = await adminAPI.getParticipants();
        setTenants(Array.isArray(res.data?.data) ? res.data.data : []);
      } else if (activeTab === 'users') {
        const res = await adminAPI.getUsers();
        setUsers(Array.isArray(res.data?.data) ? res.data.data : []);
      }
    } catch { setError(`Failed to load ${activeTab}`); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.admin_email.trim()) { toast.error('Name and admin email are required'); return; }
    setSaving(true);
    try {
      await adminAPI.createTenant(form);
      toast.success('Tenant created successfully');
      setShowAdd(false);
      setForm({ name: '', slug: '', admin_email: '', plan: 'starter' });
      loadData();
    } catch (err: unknown) { toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create tenant'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await adminAPI.deleteTenant(id);
      toast.success('Tenant deactivated');
      setShowConfirm(null);
      loadData();
    } catch { toast.error('Failed to deactivate tenant'); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      inactive: 'bg-slate-100 dark:bg-white/[0.04] text-slate-500',
      suspended: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };
    return map[s] || 'bg-slate-100 dark:bg-white/[0.04] text-slate-500';
  };

  const tenantCols: Column<Tenant>[] = [
    { key: 'name', header: 'Tenant', sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', sortable: true, render: (r) => <span className="mono text-xs">{r.slug}</span> },
    { key: 'admin_email', header: 'Admin', sortable: true },
    { key: 'plan', header: 'Plan', sortable: true, render: (r) => <span className="capitalize">{r.plan}</span> },
    { key: 'users_count', header: 'Users', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(r.status)}`}>{r.status}</span> },
    { key: 'created_at', header: 'Created', sortable: true, render: (r) => <span className="text-xs">{r.created_at ? formatDate(r.created_at) : 'N/A'}</span> },
    { key: 'id', header: '', render: (r) => (
      <button onClick={() => setShowConfirm(r.id)} className="text-rose-500 hover:text-rose-600 text-xs font-semibold" aria-label={`Delete tenant ${r.name}`}>
        <FiTrash2 className="w-3.5 h-3.5" />
      </button>
    )},
  ];

  const userCols: Column<UserRow>[] = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', sortable: true, render: (r) => <span className="capitalize">{r.role}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(r.status)}`}>{r.status}</span> },
    { key: 'last_login', header: 'Last Login', sortable: true, render: (r) => <span className="text-xs">{r.last_login ? formatDate(r.last_login) : 'Never'}</span> },
    { key: 'created_at', header: 'Created', sortable: true, render: (r) => <span className="text-xs">{r.created_at ? formatDate(r.created_at) : 'N/A'}</span> },
  ];

  const ROLES_DATA = [
    { role: 'admin', permissions: ['Full access', 'User management', 'Settings', 'Billing'] },
    { role: 'trader', permissions: ['Trading', 'Markets', 'Portfolio', 'Reports'] },
    { role: 'offtaker', permissions: ['Contracts', 'Cost dashboard', 'Settlement', 'Reports'] },
    { role: 'generator', permissions: ['Projects', 'Metering', 'Carbon', 'Settlement'] },
    { role: 'ipp_developer', permissions: ['Projects', 'Demand profile', 'Contracts'] },
    { role: 'regulator', permissions: ['Compliance', 'Audit trail', 'Reports (read-only)'] },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Tenant administration">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Tenant Admin</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage tenants, users, and roles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'tenants' && <Button onClick={() => setShowAdd(true)} icon={<FiPlus className="w-4 h-4" />}>Add Tenant</Button>}
        </div>
      </div>

      <Tabs tabs={TAB_ITEMS} active={activeTab} onChange={setActiveTab} variant="pill" />

      {activeTab === 'tenants' && (
        <DataTable columns={tenantCols} data={tenants as (Tenant & Record<string, unknown>)[]} loading={loading} error={error} onRetry={loadData}
          emptyTitle="No tenants" emptyDescription="Create your first tenant to get started." searchable searchPlaceholder="Search tenants..." pageSize={10} />
      )}

      {activeTab === 'users' && (
        <DataTable columns={userCols} data={users as (UserRow & Record<string, unknown>)[]} loading={loading} error={error} onRetry={loadData}
          emptyTitle="No users" emptyDescription="Users will appear when tenants are created." searchable searchPlaceholder="Search users..." pageSize={15} />
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES_DATA.map(r => (
            <div key={r.role} className={`rounded-2xl p-5 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-3">
                <FiShield className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{r.role.replace('_', ' ')}</h3>
              </div>
              <ul className="space-y-1.5">
                {r.permissions.map(p => (
                  <li key={p} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <FiCheck className="w-3 h-3 text-emerald-500 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Tenant Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Tenant">
        <div className="space-y-4 mt-2">
          <Input label="Tenant Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Slug" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} helpText="URL-friendly identifier" />
          <Input label="Admin Email" type="email" value={form.admin_email} onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))} required />
          <Select label="Plan" options={[{ value: 'starter', label: 'Starter' }, { value: 'professional', label: 'Professional' }, { value: 'enterprise', label: 'Enterprise' }]} value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Tenant</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={() => showConfirm && handleDelete(showConfirm)}
        title="Deactivate Tenant"
        description="This will deactivate the tenant and all associated users. This action can be reversed."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </motion.div>
  );
}
