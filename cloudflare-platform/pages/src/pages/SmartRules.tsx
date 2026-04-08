import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiPlus, FiRefreshCw, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiClock } from '../lib/fi-icons-shim';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { contractRulesAPI } from '../lib/api';
import { formatDate, formatZAR } from '../lib/format';
import { DataTable, Button, Modal, Input, Select, ConfirmDialog } from '../components/ui';
import type { Column } from '../components/ui';

interface SmartRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  condition: string;
  action_type: string;
  action_params: string;
  enabled: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
  [key: string]: unknown;
}

const TRIGGER_TYPES = [
  { value: 'price_above', label: 'Price Above Threshold' },
  { value: 'price_below', label: 'Price Below Threshold' },
  { value: 'volume_exceeds', label: 'Volume Exceeds' },
  { value: 'time_based', label: 'Time-Based (Cron)' },
  { value: 'contract_expiry', label: 'Contract Expiry Warning' },
  { value: 'settlement_due', label: 'Settlement Due' },
  { value: 'margin_breach', label: 'Margin Breach' },
];

const ACTION_TYPES = [
  { value: 'notify', label: 'Send Notification' },
  { value: 'auto_trade', label: 'Auto-Execute Trade' },
  { value: 'pause_trading', label: 'Pause Trading' },
  { value: 'alert_admin', label: 'Alert Admin' },
  { value: 'generate_report', label: 'Generate Report' },
  { value: 'webhook', label: 'Fire Webhook' },
];

export default function SmartRules() {
  const { isDark } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<SmartRule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'price_above', condition: '', action_type: 'notify', action_params: '' });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await contractRulesAPI.getRules();
      setRules(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load smart rules'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return; }
    if (!form.condition.trim()) { toast.error('Condition is required'); return; }
    setSaving(true);
    try {
      const res = await contractRulesAPI.createRule(form);
      if (res.data?.success) { toast.success('Rule created successfully'); setShowAdd(false); setForm({ name: '', description: '', trigger_type: 'price_above', condition: '', action_type: 'notify', action_params: '' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to create rule');
    } catch (err: unknown) { toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create rule'); }
    setSaving(false);
  };

  const handleToggle = async (rule: SmartRule) => {
    try {
      await contractRulesAPI.updateRule(rule.id, { enabled: !rule.enabled });
      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'}`);
      loadData();
    } catch { toast.error('Failed to toggle rule'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await contractRulesAPI.deleteRule(id);
      toast.success('Rule deleted');
      setShowConfirm(null);
      loadData();
    } catch { toast.error('Failed to delete rule'); }
  };

  const columns: Column<SmartRule>[] = [
    { key: 'name', header: 'Rule', sortable: true, render: (r) => (
      <div>
        <span className="font-medium text-slate-800 dark:text-slate-200">{r.name}</span>
        {r.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{r.description}</p>}
      </div>
    )},
    { key: 'trigger_type', header: 'Trigger', sortable: true, render: (r) => <span className="text-xs capitalize">{r.trigger_type?.replace(/_/g, ' ')}</span> },
    { key: 'condition', header: 'Condition', render: (r) => <span className="mono text-xs">{r.condition}</span> },
    { key: 'action_type', header: 'Action', sortable: true, render: (r) => <span className="text-xs capitalize">{r.action_type?.replace(/_/g, ' ')}</span> },
    { key: 'trigger_count', header: 'Triggered', sortable: true, render: (r) => <span className="mono">{r.trigger_count || 0}</span> },
    { key: 'last_triggered', header: 'Last Run', sortable: true, render: (r) => (
      <span className="text-xs">{r.last_triggered ? formatDate(r.last_triggered) : 'Never'}</span>
    )},
    { key: 'enabled', header: 'Status', render: (r) => (
      <button onClick={() => handleToggle(r)} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${r.enabled ? 'text-emerald-500' : 'text-slate-400'}`}
        aria-label={`${r.enabled ? 'Disable' : 'Enable'} rule ${r.name}`}>
        {r.enabled ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
        {r.enabled ? 'Active' : 'Inactive'}
      </button>
    )},
    { key: 'id', header: '', render: (r) => (
      <button onClick={() => setShowConfirm(r.id)} className="text-rose-400 hover:text-rose-500 transition-colors" aria-label={`Delete rule ${r.name}`}>
        <FiTrash2 className="w-3.5 h-3.5" />
      </button>
    )},
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Smart rules">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Smart Rules</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Automated trading rules and alerts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Refresh">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => setShowAdd(true)} icon={<FiPlus className="w-4 h-4" />}>Create Rule</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: rules.length, icon: FiZap, color: 'text-blue-500' },
          { label: 'Active', value: rules.filter(r => r.enabled).length, icon: FiToggleRight, color: 'text-emerald-500' },
          { label: 'Total Triggers', value: rules.reduce((s, r) => s + (r.trigger_count || 0), 0), icon: FiClock, color: 'text-amber-500' },
          { label: 'Inactive', value: rules.filter(r => !r.enabled).length, icon: FiToggleLeft, color: 'text-slate-400' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-2xl p-4 ${isDark ? 'bg-[#151F32] border border-white/[0.06]' : 'bg-white border border-black/[0.06]'} shadow-sm`}>
            <kpi.icon className={`w-4 h-4 ${kpi.color} mb-2`} aria-hidden="true" />
            {loading ? <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : <p className={`text-2xl font-bold mono ${kpi.color}`}>{kpi.value}</p>}
            <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rules as (SmartRule & Record<string, unknown>)[]}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No smart rules"
        emptyDescription="Create your first automated rule to get started."
        searchable
        searchPlaceholder="Search rules..."
        pageSize={10}
      />

      {/* Create Rule Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create Smart Rule" description="Set up an automated trading rule or alert.">
        <div className="space-y-4 mt-2">
          <Input label="Rule Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Solar price alert" required />
          <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
          <Select label="Trigger Type" options={TRIGGER_TYPES} value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))} />
          <Input label="Condition" value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} placeholder="e.g., price > 850" required helpText="Expression or threshold value" />
          <Select label="Action" options={ACTION_TYPES} value={form.action_type} onChange={e => setForm(p => ({ ...p, action_type: e.target.value }))} />
          <Input label="Action Parameters" value={form.action_params} onChange={e => setForm(p => ({ ...p, action_params: e.target.value }))} placeholder="Optional JSON params" helpText="Additional parameters for the action" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} icon={<FiZap className="w-4 h-4" />}>Create Rule</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={() => showConfirm && handleDelete(showConfirm)}
        title="Delete Rule"
        description="This will permanently delete this smart rule. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </motion.div>
  );
}
