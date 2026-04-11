import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { amlAPI } from '../lib/api';

interface AMLAlert {
  id: string;
  participant_id: string;
  rule_id: string;
  rule_name: string;
  severity: string;
  status: string;
  details: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface AMLRule {
  id: string;
  name: string;
  rule_type: string;
  severity: string;
  enabled: number;
  parameters: string;
  description: string | null;
}

export default function AMLDashboard() {
  const { isDark } = useTheme();
  const [alerts, setAlerts] = useState<AMLAlert[]>([]);
  const [rules, setRules] = useState<AMLRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [scanId, setScanId] = useState('');
  const [scanning, setScanning] = useState(false);

  const fetchAlerts = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const res = await amlAPI.alerts(params);
      setAlerts(res.data.data || []);
    } catch {
      setError('Failed to load AML alerts');
    }
  };

  const fetchRules = async () => {
    try {
      const res = await amlAPI.rules();
      setRules(res.data.data || []);
    } catch {
      setError('Failed to load AML rules');
    }
  };

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchRules()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, [filter]);

  const handleUpdateAlert = async (id: string, status: string) => {
    try {
      await amlAPI.updateAlert(id, { status });
      fetchAlerts();
    } catch {
      setError('Failed to update alert');
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      await amlAPI.updateRule(id, { enabled });
      fetchRules();
    } catch {
      setError('Failed to update rule');
    }
  };

  const handleScan = async () => {
    if (!scanId.trim()) return;
    setScanning(true);
    setError('');
    try {
      const res = await amlAPI.scan(scanId.trim());
      const count = res.data.data?.alerts_created ?? 0;
      setError(count > 0 ? `Scan complete: ${count} alert(s) created` : 'Scan complete: no alerts triggered');
      setScanId('');
      fetchAlerts();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: string } } };
      setError(axErr.response?.data?.error || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const severityColor = (severity: string) => {
    if (severity === 'critical') return 'text-red-400 bg-red-500/10';
    if (severity === 'high') return 'text-orange-400 bg-orange-500/10';
    if (severity === 'medium') return 'text-amber-400 bg-amber-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  const statusColor = (status: string) => {
    if (status === 'open') return 'text-blue-400 bg-blue-500/10';
    if (status === 'investigating') return 'text-amber-400 bg-amber-500/10';
    if (status === 'escalated') return 'text-red-400 bg-red-500/10';
    if (status === 'resolved') return 'text-emerald-400 bg-emerald-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>AML Monitoring</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-20 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>AML Monitoring</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Anti-money laundering alerts, rules, and participant scanning
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('alerts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'alerts' ? 'bg-emerald-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
          >
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setTab('rules')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'rules' ? 'bg-emerald-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
          >
            Rules ({rules.length})
          </button>
        </div>
      </div>

      {error && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${error.includes('complete') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {error}
        </div>
      )}

      {/* Scan participant */}
      <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Run AML Scan</h3>
        <div className="flex gap-2">
          <input
            type="text" placeholder="Participant ID"
            value={scanId} onChange={e => setScanId(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200'}`}
          />
          <button
            onClick={handleScan}
            disabled={scanning || !scanId.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>

      {tab === 'alerts' && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 mb-4">
            {['all', 'open', 'investigating', 'escalated', 'resolved', 'dismissed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: alerts.length, color: 'text-white' },
              { label: 'Open', value: alerts.filter(a => a.status === 'open').length, color: 'text-blue-400' },
              { label: 'Investigating', value: alerts.filter(a => a.status === 'investigating').length, color: 'text-amber-400' },
              { label: 'Escalated', value: alerts.filter(a => a.status === 'escalated').length, color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className={`p-3 rounded-xl border text-center ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Alert list */}
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No alerts match this filter.</p>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {alert.rule_name || alert.rule_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => handleUpdateAlert(alert.id, 'investigating')}
                          className="px-2 py-1 text-xs rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                        >
                          Investigate
                        </button>
                      )}
                      {(alert.status === 'open' || alert.status === 'investigating') && (
                        <>
                          <button
                            onClick={() => handleUpdateAlert(alert.id, 'escalated')}
                            className="px-2 py-1 text-xs rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          >
                            Escalate
                          </button>
                          <button
                            onClick={() => handleUpdateAlert(alert.id, 'resolved')}
                            className="px-2 py-1 text-xs rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleUpdateAlert(alert.id, 'dismissed')}
                            className="px-2 py-1 text-xs rounded bg-slate-600/20 text-slate-400 hover:bg-slate-600/30"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Participant: {alert.participant_id.slice(0, 12)}... &middot; {new Date(alert.created_at).toLocaleString()}
                  </p>
                  {alert.details && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'rules' && (
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No AML rules configured.</p>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor(rule.severity)}`}>
                        {rule.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.rule_type}
                      </span>
                    </div>
                    {rule.description && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rule.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      rule.enabled
                        ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                        : 'bg-slate-600/20 text-slate-400 hover:bg-slate-600/30'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
