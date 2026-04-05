import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiPlus, FiFilter } from 'react-icons/fi';
import { marketplaceAPI } from '../lib/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

export default function Marketplace() {
  const [listings, setListings] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState({ type: '', status: 'active' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Record<string, unknown> | null>(null);
  const [createForm, setCreateForm] = useState({ type: 'energy', technology: 'solar', volume: '', price_cents: '', description: '', min_volume: '' });
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter.type) params.type = filter.type;
      if (filter.status) params.status = filter.status;
      const res = await marketplaceAPI.list(params);
      setListings(res.data.data);
    } catch { /* ignore */ }
  };

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await marketplaceAPI.create({
        type: createForm.type,
        technology: createForm.technology,
        volume: parseFloat(createForm.volume),
        price_cents: parseInt(createForm.price_cents, 10),
        description: createForm.description,
        min_volume: createForm.min_volume ? parseFloat(createForm.min_volume) : undefined,
      });
      setShowCreateModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const placeBid = async () => {
    if (!selectedListing || !bidAmount) return;
    setLoading(true);
    try {
      await marketplaceAPI.bid(selectedListing.id as string, { price_cents: parseInt(bidAmount, 10) });
      setShowBidModal(false);
      loadData();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const inputClass = 'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 text-sm';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Marketplace</h1>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
          <FiPlus className="w-4 h-4" /> Create Listing
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'energy', 'carbon', 'ppa', 'certificate'].map((t) => (
          <button key={t} onClick={() => setFilter({ ...filter, type: t })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter.type === t ? 'bg-cyan-600/20 text-cyan-400' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="chart-glass p-12 text-center">
          <FiShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No listings found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div key={listing.id as string} className="chart-glass p-5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 capitalize">{listing.type as string}</span>
                <StatusBadge status={listing.status as string} />
              </div>
              <h3 className="font-medium mb-1 capitalize">{listing.technology as string || listing.type as string}</h3>
              <p className="text-sm text-slate-400 mb-3 line-clamp-2">{listing.description as string || 'No description'}</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-slate-400">Volume</div>
                  <div className="font-semibold">{listing.volume as number} MWh</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Price</div>
                  <div className="font-semibold text-cyan-400">R{((listing.price_cents as number) / 100).toFixed(2)}</div>
                </div>
              </div>
              {listing.status === 'active' && (
                <button onClick={() => { setSelectedListing(listing); setShowBidModal(true); }}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-medium hover:from-cyan-500 hover:to-blue-500 transition-all">
                  Place Bid
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Listing Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Listing">
        <form onSubmit={createListing} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select className={inputClass} value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                <option value="energy">Energy</option>
                <option value="carbon">Carbon</option>
                <option value="ppa">PPA</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Technology</label>
              <select className={inputClass} value={createForm.technology} onChange={(e) => setCreateForm({ ...createForm, technology: e.target.value })}>
                {['solar', 'wind', 'hydro', 'gas', 'battery', 'biomass'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Volume (MWh) *</label>
              <input className={inputClass} type="number" step="0.01" value={createForm.volume} onChange={(e) => setCreateForm({ ...createForm, volume: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price (cents) *</label>
              <input className={inputClass} type="number" value={createForm.price_cents} onChange={(e) => setCreateForm({ ...createForm, price_cents: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea className={inputClass} rows={2} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
      </Modal>

      {/* Bid Modal */}
      <Modal isOpen={showBidModal} onClose={() => setShowBidModal(false)} title="Place Bid">
        {selectedListing && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-800/50">
              <div className="text-sm"><strong>Listing:</strong> {selectedListing.description as string}</div>
              <div className="text-sm"><strong>Ask Price:</strong> R{((selectedListing.price_cents as number) / 100).toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Your Bid (cents)</label>
              <input className={inputClass} type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
            </div>
            <button onClick={placeBid} disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Bidding...' : 'Submit Bid'}
            </button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
