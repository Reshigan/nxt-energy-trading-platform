import React, { useState, useEffect, useCallback } from 'react';
import { FiZap, FiRefreshCw, FiLoader, FiMapPin } from '../lib/fi-icons-shim';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { p2pAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

const ZONES = ['All', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo'] as const;

interface P2POffer { id: string; seller: string; zone: string; energy: string; volume: number; price: number; expires: string; status: string; }
interface ZoneStat { zone: string; offers: number; avg: number; }

export default function P2PTrading() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState('All');
  const [offerData, setOfferData] = useState<P2POffer[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  // F8: Zone map view
  const [showMap, setShowMap] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [offRes, zoneRes] = await Promise.allSettled([
        p2pAPI.getOffers(), p2pAPI.getZones(),
      ]);
      if (offRes.status === 'fulfilled') setOfferData(Array.isArray(offRes.value.data?.data) ? offRes.value.data.data : []);
      if (zoneRes.status === 'fulfilled') setZoneStats(Array.isArray(zoneRes.value.data?.data) ? zoneRes.value.data.data : []);
      if (offRes.status === 'rejected' && zoneRes.status === 'rejected') setError('Failed to load P2P trading data.');
    } catch { setError('Failed to load P2P trading data.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = async (id: string) => {
    setAccepting(id);
    try {
      const res = await p2pAPI.acceptOffer(id);
      if (res.data?.success) { toast.success('Offer accepted'); loadData(); }
      else toast.error(res.data?.error || 'Failed to accept offer');
    } catch { toast.error('Failed to accept offer'); }
    setAccepting(null);
  };

  const filtered = activeZone === 'All' ? offerData : offerData.filter(o => o.zone === activeZone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="P2P Trading page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">P2P Trading</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Peer-to-peer energy trading by zone</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMap(!showMap)} className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${showMap ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600'}`} aria-label="Toggle zone map">
            <FiMapPin className="w-4 h-4" /> Zone Map
          </button>
          <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2" aria-label="Refresh P2P trading data">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* F8: Zone Map */}
      {showMap && (
        <div className={`cp-card !p-6 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 300ms ease both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><FiMapPin className="w-4 h-4 text-blue-500" /> South Africa Energy Trading Zones</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ZONES.filter(z => z !== 'All').map(zone => {
              const stat = zoneStats.find(s => s.zone === zone);
              const offerCount = stat?.offers || offerData.filter(o => o.zone === zone).length;
              const avgPrice = stat?.avg || 0;
              return (
                <button key={zone} onClick={() => { setActiveZone(zone); setShowMap(false); }}
                  className={`p-4 rounded-xl text-center transition-all border ${activeZone === zone ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : c('border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]', 'border-black/[0.06] bg-white hover:bg-slate-50')}`}
                  aria-label={`View ${zone} zone`}>
                  <FiMapPin className={`w-5 h-5 mx-auto mb-2 ${offerCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{zone}</p>
                  <p className="text-xs text-slate-400 mt-1">{offerCount} offers</p>
                  {avgPrice > 0 && <p className="text-[10px] text-slate-400">Avg {formatZAR(avgPrice / 100)}/MWh</p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex flex-wrap items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Filter by zone" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {ZONES.map(z => (
          <button key={z} role="tab" aria-selected={activeZone === z} onClick={() => setActiveZone(z)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeZone === z ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{z}</button>
        ))}
      </div>

      {loading ? (<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-full h-20" />)}</div>) : (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {zoneStats.length > 0 ? zoneStats.map((z, i) => (
          <div key={z.zone} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
            <p className="text-xs text-slate-400 mb-1">{z.zone}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mono">{z.offers} offers</p>
            <p className="text-xs text-slate-400 mt-0.5">Avg {formatZAR(z.avg / 100)}/MWh</p>
          </div>
        )) : <div className="col-span-full"><EmptyState title="No zone data" description="Zone statistics will appear once P2P offers are created." /></div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Offers by Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={c('#1e293b', '#f1f5f9')} />
              <XAxis dataKey="zone" tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: c('#64748b', '#94a3b8') }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: c('#151F32', '#fff'), border: c('1px solid rgba(255,255,255,0.08)', '1px solid rgba(0,0,0,0.06)'), borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="offers" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`lg:col-span-2 cp-card !p-0 overflow-hidden ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 400ms both' }}>
          <div className={`px-5 py-3.5 border-b ${c('border-white/[0.06]', 'border-black/[0.06]')}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Available Offers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className={`text-xs border-b ${c('border-white/[0.06] text-slate-500', 'border-black/[0.06] text-slate-400')}`}>
                <th className="text-left py-3 px-5 font-medium">ID</th>
                <th className="text-left py-3 px-4 font-medium">Seller</th>
                <th className="text-left py-3 px-4 font-medium">Zone</th>
                <th className="text-left py-3 px-4 font-medium">Energy</th>
                <th className="text-right py-3 px-4 font-medium">Volume</th>
                <th className="text-right py-3 px-4 font-medium">Price</th>
                <th className="text-center py-3 px-4 font-medium">Action</th>
              </tr></thead>
              <tbody>{filtered.map(o => (
                <tr key={o.id} className={`border-t ${c('border-white/[0.04]', 'border-black/[0.04]')} hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors`}>
                  <td className="py-3 px-5 font-semibold text-blue-600 dark:text-blue-400 mono text-xs">{o.id}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{o.seller}</td>
                  <td className="py-3 px-4 text-slate-500">{o.zone}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.energy === 'Solar' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : o.energy === 'Wind' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'}`}>{o.energy}</span></td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white mono">{o.volume} MWh</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 mono">{formatZAR(o.price / 100)}/MWh</td>
                  <td className="py-3 px-4 text-center">
                    {o.status === 'Active' || o.status === 'active' ? (
                      <button onClick={() => handleAccept(o.id)} disabled={accepting === o.id} className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1 mx-auto" aria-label={`Accept offer ${o.id}`}>{accepting === o.id && <FiLoader className="w-3 h-3 animate-spin" />} Accept</button>
                    ) : (
                      <span className="text-xs text-slate-400">Expired</span>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}
    </motion.div>
  );
}
