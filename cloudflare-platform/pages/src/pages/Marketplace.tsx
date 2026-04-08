import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiPlus, FiStar } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { marketplaceAPI } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const listings = [
  { id: 'MKT-001', title: 'Solar PPA 50MW Limpopo', type: 'PPA', technology: 'Solar PV', price: 'R580/MWh', volume: '50 MW', seller: 'TerraVolt Energy', listed: '2024-04-01', bids: 3, featured: true },
  { id: 'MKT-002', title: 'VCS Carbon Credits 10,000t', type: 'Carbon Credit', technology: 'Forestry', price: 'R180/t', volume: '10,000 t', seller: 'GreenFund SA', listed: '2024-03-28', bids: 7, featured: true },
  { id: 'MKT-003', title: 'Wind Forward H2 2025', type: 'Forward', technology: 'Onshore Wind', price: 'R620/MWh', volume: '30 MW', seller: 'Eastern Cape Wind', listed: '2024-04-03', bids: 1, featured: false },
  { id: 'MKT-004', title: 'Gold Standard CERs 5,000t', type: 'Carbon Credit', technology: 'Cookstoves', price: 'R210/t', volume: '5,000 t', seller: 'Carbon Bridge', listed: '2024-03-25', bids: 4, featured: false },
  { id: 'MKT-005', title: 'Biomass Baseload 25MW', type: 'PPA', technology: 'Biomass', price: 'R540/MWh', volume: '25 MW', seller: 'KZN Biogas', listed: '2024-04-02', bids: 2, featured: false },
  { id: 'MKT-006', title: 'REC Certificates Q2 2024', type: 'REC', technology: 'Solar PV', price: 'R65/MWh', volume: '28,600', seller: 'Solar One Cape', listed: '2024-04-05', bids: 0, featured: false },
  { id: 'MKT-007', title: 'CSP Option Dec 2024', type: 'Option', technology: 'CSP', price: 'R12K premium', volume: '20 MW', seller: 'Northern Cape CSP', listed: '2024-04-04', bids: 1, featured: false },
  { id: 'MKT-008', title: 'Hydro PPA 30MW Free State', type: 'PPA', technology: 'Small Hydro', price: 'R490/MWh', volume: '30 MW', seller: 'Drakensberg Hydro', listed: '2024-04-06', bids: 5, featured: true },
];

const types = ['All', 'PPA', 'Carbon Credit', 'Forward', 'Option', 'REC'];

export default function Marketplace() {
  const toast = useToast();
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeType, setActiveType] = useState('All');
  const [search, setSearch] = useState('');
  const [listingData, setListingData] = useState(listings);

  useEffect(() => {
    (async () => {
      try {
        const res = await marketplaceAPI.list();
        if (res.data?.data?.length) setListingData(res.data.data);
      } catch {
      toast.error('Failed to load data');
    }
    })();
  }, []);

  const filtered = listingData.filter(l =>
    (activeType === 'All' || l.type === activeType) &&
    (search === '' || l.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">Marketplace</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Browse & list energy assets, PPAs, carbon credits</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all flex items-center gap-2" aria-label="Plus">
          <FiPlus className="w-4 h-4" /> Create Listing
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap" style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${c('bg-white/[0.04] border-white/[0.06]', 'bg-white border-black/[0.06]')}`}>
          <FiSearch className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings..."
            className={`bg-transparent text-sm outline-none ${c('text-white placeholder-slate-500', 'text-slate-800 placeholder-slate-400')}`} />
        </div>
        <div className={`flex items-center rounded-full p-1 ${c('bg-white/[0.04]', 'bg-slate-100')}`}>
          {types.map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeType === t ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400', 'text-slate-500')}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {filtered.map((l, i) => (
          <div key={l.id} className={`cp-card !p-5 relative ${c('!bg-[#151F32] !border-white/[0.06]', '')} ${l.featured ? 'ring-1 ring-amber-500/30' : ''}`}
            style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
            {l.featured && <FiStar className="absolute top-3 right-3 w-4 h-4 text-amber-400 fill-amber-400" />}
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
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mono">{l.price}</span>
              <span className="text-xs text-slate-400">{l.volume}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{l.bids} bid{l.bids !== 1 ? 's' : ''}</span>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">Place Bid</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
