import React, { useState, useEffect } from 'react';
import { FiZap, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { p2pAPI } from '../lib/api';

const zones = ['All', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo'];

const zoneData = [
  { zone: 'GP', offers: 24, avg: 580 },
  { zone: 'WC', offers: 18, avg: 620 },
  { zone: 'KZN', offers: 12, avg: 540 },
  { zone: 'EC', offers: 8, avg: 560 },
  { zone: 'LP', offers: 15, avg: 510 },
];

const offers = [
  { id: 'P2P-001', seller: 'TerraVolt Energy', zone: 'Gauteng', energy: 'Solar', volume: '500 MWh', price: 'R580/MWh', expires: '2024-04-20', status: 'Active' },
  { id: 'P2P-002', seller: 'Eastern Cape Wind', zone: 'Eastern Cape', energy: 'Wind', volume: '300 MWh', price: 'R620/MWh', expires: '2024-04-25', status: 'Active' },
  { id: 'P2P-003', seller: 'KZN Biogas Plant', zone: 'KwaZulu-Natal', energy: 'Biomass', volume: '150 MWh', price: 'R540/MWh', expires: '2024-04-18', status: 'Active' },
  { id: 'P2P-004', seller: 'Karoo Wind Farm', zone: 'Limpopo', energy: 'Wind', volume: '800 MWh', price: 'R510/MWh', expires: '2024-04-22', status: 'Active' },
  { id: 'P2P-005', seller: 'Solar One Cape', zone: 'Western Cape', energy: 'Solar', volume: '200 MWh', price: 'R650/MWh', expires: '2024-04-15', status: 'Expired' },
  { id: 'P2P-006', seller: 'GreenFund SA', zone: 'Gauteng', energy: 'Solar', volume: '450 MWh', price: 'R560/MWh', expires: '2024-04-30', status: 'Active' },
];

export default function P2PTrading() {
  const { isDark } = useTheme();
  const c = (d: string, l: string) => isDark ? d : l;
  const [activeZone, setActiveZone] = useState('All');
  const [offerData, setOfferData] = useState(offers);

  useEffect(() => {
    (async () => {
      try {
        const res = await p2pAPI.getOffers();
        if (res.data?.data?.length) setOfferData(res.data.data);
      } catch { /* use demo data */ }
    })();
  }, []);

  const filtered = activeZone === 'All' ? offerData : offerData.filter(o => o.zone === activeZone);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between" style={{ animation: 'cardFadeUp 500ms ease both' }}>
        <div>
          <h1 className="text-3xl sm:text-[42px] font-extrabold tracking-tight text-slate-900 dark:text-white">P2P Trading</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Peer-to-peer energy trading by zone</p>
        </div>
        <button className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 transition-all flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      <div className={`flex items-center rounded-full p-1 w-fit overflow-x-auto ${c('bg-white/[0.04]', 'bg-slate-100')}`} style={{ animation: 'cardFadeUp 500ms ease 100ms both' }}>
        {zones.map(z => (
          <button key={z} onClick={() => setActiveZone(z)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${activeZone === z ? c('bg-white/[0.12] text-white shadow-sm', 'bg-white text-slate-900 shadow-sm') : c('text-slate-400 hover:text-slate-200', 'text-slate-500 hover:text-slate-700')}`}>{z}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" style={{ animation: 'cardFadeUp 500ms ease 200ms both' }}>
        {zoneData.map((z, i) => (
          <div key={z.zone} className={`cp-card !p-4 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: `cardFadeUp 400ms ease ${200 + i * 50}ms both` }}>
            <p className="text-xs text-slate-400 mb-1">{z.zone}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mono">{z.offers} offers</p>
            <p className="text-xs text-slate-400 mt-0.5">Avg R{z.avg}/MWh</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 cp-card !p-5 ${c('!bg-[#151F32] !border-white/[0.06]', '')}`} style={{ animation: 'cardFadeUp 500ms ease 300ms both' }}>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Offers by Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneData}>
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
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white mono">{o.volume}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 mono">{o.price}</td>
                  <td className="py-3 px-4 text-center">
                    {o.status === 'Active' ? (
                      <button className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Accept</button>
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
    </div>
  );
}
