import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { developerAPI } from '../lib/api';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface ApiKey {
  id: string; name: string; key_prefix: string; permissions: string[]; rate_limit_per_minute: number;
  last_used_at: string | null; expires_at: string | null; revoked: number; created_at: string;
}

interface Webhook {
  id: string; url: string; events: string[]; active: number; last_triggered_at: string | null;
  failure_count: number; created_at: string;
}

const PERMISSIONS = [
  'trading.read', 'trading.write', 'carbon.read', 'carbon.write',
  'contracts.read', 'contracts.write', 'metering.read', 'metering.write',
  'settlement.read', 'reports.read', 'reports.write',
];

const WEBHOOK_EVENTS = [
  'trade.executed', 'order.filled', 'order.cancelled',
  'credit.retired', 'credit.transferred',
  'contract.signed', 'contract.phase_changed',
  'settlement.completed', 'escrow.released',
  'invoice.generated', 'invoice.paid',
  'alert.price', 'alert.risk',
];

export default function DeveloperPortal() {
  const tc = useThemeClasses();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState({ name: '', permissions: [] as string[], rate_limit: '60' });
  const [webhookForm, setWebhookForm] = useState({ url: '', events: [] as string[] });

  useEffect(() => {
    Promise.all([
      developerAPI.getKeys().catch(() => ({ data: { data: demoKeys() } })),
      developerAPI.getWebhooks().catch(() => ({ data: { data: demoWebhooks() } })),
    ]).then(([keysRes, webhooksRes]) => {
      setKeys(keysRes.data?.data || []);
      setWebhooks(webhooksRes.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreateKey = async () => {
    try {
      const res = await developerAPI.createKey({
        name: keyForm.name,
        permissions: keyForm.permissions,
        rate_limit_per_minute: parseInt(keyForm.rate_limit, 10),
      });
      setNewKeyValue(res.data?.data?.key || null);
      setKeys((prev) => [{ id: res.data?.data?.id, name: keyForm.name, key_prefix: res.data?.data?.prefix || 'nxt_...', permissions: keyForm.permissions, rate_limit_per_minute: parseInt(keyForm.rate_limit, 10), last_used_at: null, expires_at: null, revoked: 0, created_at: new Date().toISOString() }, ...prev]);
      setShowKeyModal(false);
    } catch { /* handled */ }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await developerAPI.revokeKey(id);
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revoked: 1 } : k));
    } catch { /* handled */ }
  };

  const handleCreateWebhook = async () => {
    try {
      const res = await developerAPI.createWebhook({ url: webhookForm.url, events: webhookForm.events });
      setNewWebhookSecret(res.data?.data?.secret || null);
      setWebhooks((prev) => [{ id: res.data?.data?.id, url: webhookForm.url, events: webhookForm.events, active: 1, last_triggered_at: null, failure_count: 0, created_at: new Date().toISOString() }, ...prev]);
      setShowWebhookModal(false);
    } catch { /* handled */ }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-[#d4e157] border-t-transparent rounded-full" /></div>;

  // Usage chart data (demo)
  const usageData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    requests: Math.floor(Math.random() * 500 + 100),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Developer Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">API keys, webhooks, usage tracking & documentation</p>
        </div>
      </div>

      {/* Secret Display Banners */}
      {newKeyValue && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">Your new API key (shown only once):</p>
          <code className="block bg-white p-3 rounded-xl text-xs font-mono break-all border border-yellow-100">{newKeyValue}</code>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { navigator.clipboard.writeText(newKeyValue); }} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium">Copy</button>
            <button onClick={() => setNewKeyValue(null)} className="px-3 py-1.5 text-yellow-600 text-xs">Dismiss</button>
          </div>
        </div>
      )}
      {newWebhookSecret && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">Webhook signing secret (shown only once):</p>
          <code className="block bg-white p-3 rounded-xl text-xs font-mono break-all border border-blue-100">{newWebhookSecret}</code>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { navigator.clipboard.writeText(newWebhookSecret); }} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">Copy</button>
            <button onClick={() => setNewWebhookSecret(null)} className="px-3 py-1.5 text-blue-600 text-xs">Dismiss</button>
          </div>
        </div>
      )}

      {/* Usage Chart */}
      <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]`}>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">API Usage (30 days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke={tc.chartGrid} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="requests" stroke="#d4e157" fill="#d4e15730" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl w-fit">
        {([['keys', 'API Keys'], ['webhooks', 'Webhooks'], ['docs', 'Documentation']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* API Keys Tab */}
      {tab === 'keys' && (
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 dark:border-white/[0.06] flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">API Keys</h3>
            <button onClick={() => setShowKeyModal(true)} className="px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Create Key</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Name</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Key</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Permissions</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400">Rate Limit</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-slate-100 dark:border-white/[0.04]">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{k.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{k.key_prefix}...****</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(k.permissions || []).slice(0, 3).map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400">{p}</span>
                      ))}
                      {(k.permissions || []).length > 3 && <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">+{k.permissions.length - 3}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">{k.rate_limit_per_minute}/min</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${k.revoked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {k.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!k.revoked && (
                      <button onClick={() => handleRevokeKey(k.id)} className="px-3 py-1 text-red-500 border border-red-200 rounded-lg text-xs hover:bg-red-50">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Webhooks Tab */}
      {tab === 'webhooks' && (
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 dark:border-white/[0.06] flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Webhook Subscriptions</h3>
            <button onClick={() => setShowWebhookModal(true)} className="px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Create Webhook</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">URL</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Events</th>
                <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400">Failures</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 dark:border-white/[0.04]">
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{w.url}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(w.events || []).slice(0, 2).map((e) => (
                        <span key={e} className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">{e}</span>
                      ))}
                      {(w.events || []).length > 2 && <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">+{w.events.length - 2}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${w.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400'}`}>
                      {w.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{w.failure_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Docs Tab */}
      {tab === 'docs' && (
        <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 border border-slate-200 dark:border-white/[0.06] space-y-6`}>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">NXT Energy Trading API</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">OpenAPI 3.1 — Base URL: <code className="bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded text-xs">https://et.vantax.co.za/api/v1</code></p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Authentication</h4>
            <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl text-sm space-y-2">
              <p><strong>Bearer Token:</strong> <code>Authorization: Bearer &lt;JWT&gt;</code></p>
              <p><strong>API Key:</strong> <code>X-API-Key: nxt_&lt;key&gt;</code></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Endpoints</h4>
            <div className="space-y-2">
              {[
                { method: 'POST', path: '/trading/orders', desc: 'Place order' },
                { method: 'GET', path: '/trading/orderbook/{market}', desc: 'Get order book' },
                { method: 'GET', path: '/carbon/credits', desc: 'List carbon credits' },
                { method: 'POST', path: '/ai/optimise', desc: 'Run AI portfolio optimisation' },
                { method: 'POST', path: '/ai/chat', desc: 'AI chat assistant' },
                { method: 'GET', path: '/metering/readings', desc: 'Get meter readings' },
                { method: 'POST', path: '/metering/ingest', desc: 'Ingest meter readings' },
                { method: 'GET', path: '/p2p/offers', desc: 'List P2P offers' },
                { method: 'GET', path: '/reports', desc: 'List reports' },
              ].map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-white/[0.02] rounded-lg">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                  <code className="text-xs text-slate-700 dark:text-slate-200">{ep.path}</code>
                  <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 ml-auto">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Webhook Events</h4>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((e) => <span key={e} className="px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] font-mono">{e}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Create API Key</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Key Name</label>
                <input value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" placeholder="Production Key" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Rate Limit (req/min)</label>
                <input value={keyForm.rate_limit} onChange={(e) => setKeyForm({ ...keyForm, rate_limit: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" type="number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={keyForm.permissions.includes(p)} onChange={(e) => {
                        setKeyForm({
                          ...keyForm,
                          permissions: e.target.checked ? [...keyForm.permissions, p] : keyForm.permissions.filter((x) => x !== p),
                        });
                      }} className="accent-[#d4e157]" />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowKeyModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreateKey} className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Create Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${tc.isDark ? "bg-[#0f1d32]" : "bg-white"} rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto`}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Create Webhook</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Endpoint URL</label>
                <input value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} className="w-full border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 text-sm" placeholder="https://your-app.com/webhooks/nxt" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {WEBHOOK_EVENTS.map((e) => (
                    <label key={e} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={webhookForm.events.includes(e)} onChange={(ev) => {
                        setWebhookForm({
                          ...webhookForm,
                          events: ev.target.checked ? [...webhookForm.events, e] : webhookForm.events.filter((x) => x !== e),
                        });
                      }} className="accent-[#d4e157]" />
                      {e}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWebhookModal(false)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/[0.06] rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreateWebhook} className="flex-1 px-4 py-2 bg-[#d4e157] text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold">Create Webhook</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function demoKeys(): ApiKey[] {
  return [
    { id: 'k1', name: 'Production API', key_prefix: 'nxt_a1b2c3d4', permissions: ['trading.read', 'trading.write', 'carbon.read'], rate_limit_per_minute: 120, last_used_at: '2024-03-15T10:30:00Z', expires_at: null, revoked: 0, created_at: '2024-01-01T00:00:00Z' },
    { id: 'k2', name: 'Metering Webhook', key_prefix: 'nxt_e5f6g7h8', permissions: ['metering.write'], rate_limit_per_minute: 300, last_used_at: '2024-03-15T11:00:00Z', expires_at: null, revoked: 0, created_at: '2024-02-15T00:00:00Z' },
    { id: 'k3', name: 'Old Test Key', key_prefix: 'nxt_i9j0k1l2', permissions: ['trading.read'], rate_limit_per_minute: 30, last_used_at: null, expires_at: null, revoked: 1, created_at: '2023-12-01T00:00:00Z' },
  ];
}

function demoWebhooks(): Webhook[] {
  return [
    { id: 'w1', url: 'https://app.example.com/webhooks/nxt', events: ['trade.executed', 'order.filled', 'settlement.completed'], active: 1, last_triggered_at: '2024-03-15T10:00:00Z', failure_count: 0, created_at: '2024-01-15T00:00:00Z' },
    { id: 'w2', url: 'https://monitoring.example.com/alerts', events: ['alert.price', 'alert.risk'], active: 1, last_triggered_at: null, failure_count: 2, created_at: '2024-02-01T00:00:00Z' },
  ];
}
