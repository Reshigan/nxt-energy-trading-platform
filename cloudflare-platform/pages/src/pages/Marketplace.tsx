import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiRefreshCw, FiPlus, FiStar, FiLoader } from '../lib/fi-icons-shim';
import { useTheme } from '../contexts/ThemeContext';
import { marketplaceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { formatZAR } from '../lib/format';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import Modal from '../components/Modal';
import { Button } from '../components/ui/Button';

interface Listing { id: string; title: string; type: string; technology: string; price: number; unit: string; volume: string; seller: string; listed: string; bids: number; featured: boolean; }

const TYPES = ['All', 'PPA', 'Carbon Credit', 'Forward', 'Option', 'REC'] as const;

export default function Marketplace() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState('All');
  const [search, setSearch] = useState('');
  const [listingData, setListingData] = useState<Listing[]>([]);
  const [bidding, setBidding] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [listForm, setListForm] = useState({ title: '', type: 'PPA', technology: 'Solar', price: '', volume: '' });
  const [listCreating, setListCreating] = useState(false);
  const [bidTarget, setBidTarget] = useState<Listing | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await marketplaceAPI.list();
      setListingData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setError('Failed to load marketplace listings.'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateListing = async () => {
    if (!listForm.title.trim() || !listForm.price) { toast.error('Title and price are required'); return; }
    setListCreating(true);
    try {
      const res = await marketplaceAPI.create({ title: listForm.title, type: listForm.type, technology: listForm.technology, price: Math.round(Number(listForm.price) * 100), volume: listForm.volume || '0 MWh' });
      if (res.data?.success || res.data?.data) { toast.success('Listing created'); setShowCreate(false); setListForm({ title: '', type: 'PPA', technology: 'Solar', price: '', volume: '' }); loadData(); }
      else toast.error(res.data?.error || 'Failed to create listing');
    } catch { toast.error('Failed to create listing'); }
    setListCreating(false);
  };

  const handlePlaceBid = async () => {
    if (!bidTarget || !bidAmount) { toast.error('Bid amount required'); return; }
    setBidSubmitting(true);
    try {
      const res = await marketplaceAPI.bid(bidTarget.id, { amount: Math.round(Number(bidAmount) * 100) });
      if (res.data?.success) { toast.success('Bid placed'); setBidTarget(null); setBidAmount(''); loadData(); }
      else toast.error(res.data?.error || 'Failed to place bid');
    } catch { toast.error('Failed to place bid'); }
    setBidSubmitting(false);
  };

  const handleBid = async (id: string) => {
    setBidding(id);
    try {
      const res = await marketplaceAPI.bid(id, {});
      if (res.data?.success) { toast.success('Bid placed successfully'); loadData(); }
      else toast.error(res.data?.error || 'Failed to place bid');
    } catch { toast.error('Failed to place bid'); }
    setBidding(null);
  };

  const filtered = listingData.filter(l =>
    (activeType === 'All' || l.type === activeType) &&
    (search === '' || l.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6" role="main" aria-label="Marketplace page">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Marketplace</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Browse & list energy assets, PPAs, carbon credits</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2" aria-label="Create listing"><FiPlus className="w-4 h-4" /> List Asset</button>
        <button onClick={loadData} className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Refresh marketplace">
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="flex items-center gap-3 flex-wrap" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${c('bg-white/[0.04] border-white/[0.06]', 'bg-white border-black/[0.06]')}`}>
          <FiSearch className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..." aria-label="Search marketplace listings"
            className={`bg-transparent text-sm outline-none ${c('text-white placeholder-slate-500', 'text-slate-800 placeholder-slate-400')}`} />
        </div>
        <div className={`flex flex-wrap items-center rounded-full p-1 ${c('bg-white/[0.04]', 'bg-slate-100')}`} role="tablist" aria-label="Filter by type">
          {TYPES.map(t => (
            <button key={t} role="tab" aria-selected={activeType === t} onClick={() => setActiveType(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeType === t ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400', 'text-slate-500')}`}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="w-full h-48" />)}</div>) : filtered.length === 0 ? (<EmptyState title="No listings" description={search ? 'No listings match your search.' : 'No marketplace listings available yet.'} />) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {filtered.map((l, i) => (
          <div key={l.id} className={`cp-card !p-5 relative ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${l.featured ? 'ring-1 ring-amber-500/30' : ''}`}
            style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
            {l.featured && <FiStar className="absolute top-3 right-3 w-4 h-4 text-amber-400 fill-amber-400" aria-label="Featured listing" />}
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-3 ${
              l.type === 'PPA' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
              l.type === 'Carbon Credit' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              l.type === 'Forward' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' :
              l.type === 'Option' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
              'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
            }`}>{l.type}</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{l.title}</h3>
            <p className="text-xs text-slate-400 mb-3">{l.seller} &middot; {l.technology}</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mono">{formatZAR(l.price / 100)}/{l.unit || 'MWh'}</span>
              <span className="text-xs text-slate-400">{l.volume}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{l.bids} bid{l.bids !== 1 ? 's' : ''}</span>
              <button onClick={() => handleBid(l.id)} disabled={bidding === l.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1" aria-label={`Place bid on ${l.title}`}>{bidding === l.id && <FiLoader className="w-3 h-3 animate-spin" />} Place Bid</button>
            </div>
          </div>
        ))}
      </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Marketplace Listing">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Title</label>
            <input value={listForm.title} onChange={e => setListForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 50 MW Solar PPA - Northern Cape" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
              <select value={listForm.type} onChange={e => setListForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
                <option>PPA</option><option>Carbon Credit</option><option>Forward</option><option>Option</option><option>REC</option>
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Technology</label>
              <select value={listForm.technology} onChange={e => setListForm(p => ({ ...p, technology: e.target.value }))} className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white">
                <option>Solar</option><option>Wind</option><option>Gas</option><option>Hydro</option><option>Battery</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Price (R/MWh)</label>
              <input type="number" value={listForm.price} onChange={e => setListForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
            <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Volume</label>
              <input value={listForm.volume} onChange={e => setListForm(p => ({ ...p, volume: e.target.value }))} placeholder="e.g. 100 MWh" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateListing} loading={listCreating}>Create Listing</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!bidTarget} onClose={() => setBidTarget(null)} title="Place Bid">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Listing: <span className="font-bold text-slate-900 dark:text-white">{bidTarget?.title}</span></p>
          <div><label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Your Bid (R/MWh)</label>
            <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 rounded-xl text-sm border bg-slate-50 border-black/[0.06] text-slate-900 placeholder-slate-400 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-white dark:placeholder-slate-500" /></div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setBidTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handlePlaceBid} loading={bidSubmitting} disabled={!bidAmount}>Place Bid</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
