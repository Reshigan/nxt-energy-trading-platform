import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { p2pAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';

const STATUS_COLORS: Record<string, string> = {
  open: '#d4e157',
  matched: '#42a5f5',
  settled: '#66bb6a',
  cancelled: '#9e9e9e',
  expired: '#ef5350',
};

interface P2POffer {
  id: string; seller_id: string; buyer_id: string | null; volume_kwh: number;
  price_cents_per_kwh: number; total_cents: number; distribution_zone: string;
  offer_type: string; status: string; seller_name?: string; created_at: string;
}

export default function P2PTrading() {
  const { user } = useAuthStore();
  const [offers, setOffers] = useState<P2POffer[]>([]);
  const [myTrades, setMyTrades] = useState<P2POffer[]>([]);
  const [zones, setZones] = useState<Array<{ distribution_zone: string; offer_count: number }>>([]);
  const [tab, setTab] = useState<'market' | 'my'>('market');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ volume_kwh: '100', price_cents_per_kwh: '85', distribution_zone: 'Eskom Dx - Gauteng', offer_type: 'sell' as 'sell' | 'buy' });

  useEffect(() => {
    Promise.all([
      p2pAPI.getOffers().catch(() => ({ data: { data: demoOffers() } })),
      p2pAPI.getMyTrades().catch(() => ({ data: { data: [] } })),
      p2pAPI.getZones().catch(() => ({ data: { data: demoZones() } })),
    ]).then(([offersRes, myRes, zonesRes]) => {
      setOffers(offersRes.data?.data || []);
      setMyTrades(myRes.data?.data || []);
      setZones(zonesRes.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await p2pAPI.acceptOffer(id);
      setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status: 'matched', buyer_id: user?.id || '' } : o));
    } catch { /* handled by error toast */ }
  };

  const handleCreate = async () => {
    try {
      await p2pAPI.createOffer({
        volume_kwh: parseFloat(form.volume_kwh),
        price_cents_per_kwh: parseInt(form.price_cents_per_kwh, 10),
        distribution_zone: form.distribution_zone,
        offer_type: form.offer_type,
      });
      setShowCreateModal(false);
    } catch { /* handled */ }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-[#d4e157] border-t-transparent rounded-full" /></div>;

  const zoneChart = zones.map((z) => ({ zone: z.distribution_zone.replace('Eskom Dx - ', ''), offers: z.offer_count }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e1a]">P2P Energy Trading</h1>
          <p className="text-sm text-gray-500">Peer-to-peer prosumer energy marketplace by distribution zone</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#d4e157] text-[#1a2e1a] rounded-2xl font-semibold text-sm hover:bg-[#c0ca33] transition-colors">
          Create Offer
        </button>
      </div>

      {/* Zone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 lg:col-span-2">
          <h3 className="font-semibold text-[#1a2e1a] mb-4">Offers by Distribution Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="offers" radius={[8, 8, 0, 0]} fill="#d4e157" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          <h3 className="font-semibold text-[#1a2e1a] mb-2">Market Stats</h3>
          {[
            { label: 'Open Offers', value: offers.filter((o) => o.status === 'open').length },
            { label: 'Total Volume', value: `${offers.reduce((s, o) => s + o.volume_kwh, 0).toLocaleString()} kWh` },
            { label: 'Avg Price', value: `${Math.round(offers.reduce((s, o) => s + o.price_cents_per_kwh, 0) / (offers.length || 1))} c/kWh` },
            { label: 'Active Zones', value: zones.length },
          ].map((s) => (
            <div key={s.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{s.label}</span>
              <span className="font-medium text-[#1a2e1a]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['market', 'my'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#1a2e1a] shadow-sm' : 'text-gray-500'}`}>
            {t === 'market' ? 'Market Offers' : 'My Trades'}
          </button>
        ))}
      </div>

      {/* Offer Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Zone</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Volume (kWh)</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Price (c/kWh)</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Total</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {(tab === 'market' ? offers : myTrades).map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.offer_type === 'sell' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {o.offer_type.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700">{o.distribution_zone}</td>
                <td className="py-3 px-4 text-right font-mono">{o.volume_kwh.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-mono">{o.price_cents_per_kwh}</td>
                <td className="py-3 px-4 text-right font-mono">R{((o.total_cents || o.volume_kwh * o.price_cents_per_kwh) / 100).toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${STATUS_COLORS[o.status]}30`, color: STATUS_COLORS[o.status] }}>
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  {tab === 'market' && o.status === 'open' && o.seller_id !== user?.id && (
                    <button onClick={() => handleAccept(o.id)} className="px-3 py-1 bg-[#d4e157] text-[#1a2e1a] rounded-lg text-xs font-semibold">Accept</button>
                  )}
                </td>
              </tr>
            ))}
            {(tab === 'market' ? offers : myTrades).length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No offers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[#1a2e1a] mb-4">Create P2P Offer</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Offer Type</label>
                <div className="flex gap-2">
                  {(['sell', 'buy'] as const).map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, offer_type: t })} className={`flex-1 py-2 rounded-xl text-sm font-medium ${form.offer_type === t ? 'bg-[#d4e157] text-[#1a2e1a]' : 'bg-gray-100 text-gray-500'}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Volume (kWh) — min 10</label>
                <input value={form.volume_kwh} onChange={(e) => setForm({ ...form, volume_kwh: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" type="number" min="10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Price (cents/kWh)</label>
                <input value={form.price_cents_per_kwh} onChange={(e) => setForm({ ...form, price_cents_per_kwh: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" type="number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Distribution Zone</label>
                <select value={form.distribution_zone} onChange={(e) => setForm({ ...form, distribution_zone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  {['Eskom Dx - Gauteng', 'Eskom Dx - Western Cape', 'Eskom Dx - KZN', 'City of Cape Town', 'City of Johannesburg', 'eThekwini Metro'].map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-[#d4e157] text-[#1a2e1a] rounded-xl text-sm font-semibold">Create Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function demoOffers(): P2POffer[] {
  return [
    { id: 'p1', seller_id: 's1', buyer_id: null, volume_kwh: 500, price_cents_per_kwh: 85, total_cents: 42500, distribution_zone: 'Eskom Dx - Gauteng', offer_type: 'sell', status: 'open', seller_name: 'SunPower Prosumer', created_at: '2024-03-15T10:00:00Z' },
    { id: 'p2', seller_id: 's2', buyer_id: null, volume_kwh: 1200, price_cents_per_kwh: 92, total_cents: 110400, distribution_zone: 'Eskom Dx - Western Cape', offer_type: 'sell', status: 'open', seller_name: 'WindGen Farm', created_at: '2024-03-15T11:00:00Z' },
    { id: 'p3', seller_id: 's3', buyer_id: 'b1', volume_kwh: 300, price_cents_per_kwh: 78, total_cents: 23400, distribution_zone: 'Eskom Dx - Gauteng', offer_type: 'buy', status: 'matched', seller_name: 'GreenBuild Ltd', created_at: '2024-03-14T09:00:00Z' },
    { id: 'p4', seller_id: 's4', buyer_id: 'b2', volume_kwh: 2000, price_cents_per_kwh: 88, total_cents: 176000, distribution_zone: 'City of Cape Town', offer_type: 'sell', status: 'settled', seller_name: 'Rooftop Solar Co', created_at: '2024-03-13T14:00:00Z' },
  ];
}

function demoZones() {
  return [
    { distribution_zone: 'Eskom Dx - Gauteng', offer_count: 12 },
    { distribution_zone: 'Eskom Dx - Western Cape', offer_count: 8 },
    { distribution_zone: 'City of Cape Town', offer_count: 6 },
    { distribution_zone: 'Eskom Dx - KZN', offer_count: 4 },
    { distribution_zone: 'eThekwini Metro', offer_count: 2 },
  ];
}
