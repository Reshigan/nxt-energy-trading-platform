import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiRefreshCw, FiActivity, FiPlus } from '../lib/fi-icons-shim';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { vppAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Button } from '../components/ui/Button';
import Modal from '../components/Modal';

interface VPPAsset { id: string; name: string; asset_type: string; capacity_kw: number; location: string; status: string; owner_name?: string; last_heartbeat?: string; }
interface DispatchEvent { id: string; reason: string; total_dispatched_kw: number; status: string; started_at: string; ended_at?: string; revenue_rands?: number; }
interface Dashboard { total_capacity_kw: number; online_assets: number; offline_assets: number; active_dispatches: number; total_revenue_rands: number; assets_by_type: Record<string, number>; }

export default function VPPDashboard() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<VPPAsset[]>([]);
  const [events, setEvents] = useState<DispatchEvent[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', asset_type: 'solar', capacity_kw: 0, location: '' });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [assetsRes, eventsRes, dashRes] = await Promise.all([vppAPI.getAssets(), vppAPI.getEvents(), vppAPI.getDashboard()]);
      setAssets(assetsRes.data?.data || []);
      setEvents(eventsRes.data?.data || []);
      setDashboard(dashRes.data?.data || null);
    } catch { setError('Failed to load VPP data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRegister = async () => {
    try {
      await vppAPI.registerAsset(regForm);
      toast.success('DER asset registered');
      setShowRegister(false);
      loadData();
    } catch { toast.error('Registration failed'); }
  };

  const handleDispatch = async () => {
    try {
      await vppAPI.dispatch({ reason: 'grid_signal', signal_type: 'frequency_response' });
      toast.success('VPP dispatch initiated');
      loadData();
    } catch { toast.error('Dispatch failed'); }
  };

  const typeChartData = dashboard?.assets_by_type ? Object.entries(dashboard.assets_by_type).map(([type, count]) => ({ type: type.charAt(0).toUpperCase() + type.slice(1), count })) : [];
  const TYPE_COLORS: Record<string, string> = { solar: 'text-amber-500', battery: 'text-blue-500', wind: 'text-cyan-500', genset: 'text-red-500', load: 'text-purple-500', ev: 'text-emerald-500' };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Virtual Power Plant</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Aggregate distributed energy resources & demand response</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowRegister(true)}><FiPlus className="w-3 h-3 mr-1" /> Register Asset</Button>
          <Button variant="ghost" onClick={handleDispatch}><FiZap className="w-3 h-3 mr-1" /> Dispatch</Button>
          <button onClick={loadData} className="p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiZap className="w-4 h-4 text-amber-500 mb-1" />
            <p className="text-xl font-bold text-slate-900 dark:text-white mono">{(dashboard.total_capacity_kw / 1000).toFixed(1)} MW</p>
            <p className="text-[11px] text-slate-400">Total Capacity</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <FiActivity className="w-4 h-4 text-emerald-500 mb-1" />
            <p className="text-xl font-bold text-emerald-500 mono">{dashboard.online_assets}</p>
            <p className="text-[11px] text-slate-400">Online Assets</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-red-500 mono">{dashboard.offline_assets}</p>
            <p className="text-[11px] text-slate-400">Offline Assets</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-blue-500 mono">{dashboard.active_dispatches}</p>
            <p className="text-[11px] text-slate-400">Active Dispatches</p>
          </div>
          <div className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
            <p className="text-xl font-bold text-purple-500 mono">R{((dashboard.total_revenue_rands || 0) / 1000).toFixed(1)}k</p>
            <p className="text-[11px] text-slate-400">Total Revenue</p>
          </div>
        </div>
      )}

      {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : (<>

      {/* Assets by type chart */}
      {typeChartData.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Assets by Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Assets table */}
      {assets.length === 0 ? <EmptyState title="No VPP assets" description="Register distributed energy resources to build your virtual power plant." /> : (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Registered Assets</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Name</th>
              <th className="text-left py-2 font-medium">Type</th>
              <th className="text-right py-2 font-medium">Capacity</th>
              <th className="text-left py-2 font-medium">Location</th>
              <th className="text-center py-2 font-medium">Status</th>
            </tr></thead>
            <tbody>{assets.map(a => (
              <tr key={a.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{a.name}</td>
                <td className="py-2.5"><span className={`text-xs font-semibold ${TYPE_COLORS[a.asset_type] || 'text-slate-500'}`}>{a.asset_type}</span></td>
                <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{a.capacity_kw} kW</td>
                <td className="py-2.5 text-slate-500 text-xs">{a.location}</td>
                <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{a.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Dispatch events */}
      {events.length > 0 && (
        <div className={`cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Dispatch Events</h3>
          <table className="w-full text-sm">
            <thead><tr className={`text-xs ${c('text-slate-500', 'text-slate-400')}`}>
              <th className="text-left py-2 font-medium">Reason</th>
              <th className="text-right py-2 font-medium">Dispatched</th>
              <th className="text-center py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Revenue</th>
              <th className="text-right py-2 font-medium">Started</th>
            </tr></thead>
            <tbody>{events.map(e => (
              <tr key={e.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')}`}>
                <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{e.reason}</td>
                <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white mono">{e.total_dispatched_kw} kW</td>
                <td className="py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${e.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>{e.status}</span></td>
                <td className="py-2.5 text-right text-emerald-500 mono">{e.revenue_rands ? `R${e.revenue_rands.toLocaleString()}` : '-'}</td>
                <td className="py-2.5 text-right text-slate-500 text-xs">{new Date(e.started_at).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      </>)}

      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)} title="Register DER Asset">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Asset Name</label>
            <input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <select value={regForm.asset_type} onChange={e => setRegForm(p => ({ ...p, asset_type: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
              <option value="solar">Solar</option><option value="battery">Battery</option><option value="wind">Wind</option><option value="genset">Genset</option><option value="load">Load</option><option value="ev">EV</option>
            </select>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Capacity (kW)</label>
            <input type="number" value={regForm.capacity_kw} onChange={e => setRegForm(p => ({ ...p, capacity_kw: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Location</label>
            <input value={regForm.location} onChange={e => setRegForm(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRegister}>Register</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
