import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiFilter, FiSearch, FiStar, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface MarketData {
  id: number; energyType: string; region: string; price: number; change: number; volume: number; trend: 'up' | 'down' | 'stable'; isFavorite: boolean;
}

const mockMarketData: MarketData[] = [
  { id: 1, energyType: 'Solar', region: 'California', price: 48.5, change: 2.3, volume: 12500, trend: 'up', isFavorite: true },
  { id: 2, energyType: 'Wind', region: 'Texas', price: 38.2, change: -1.2, volume: 9800, trend: 'down', isFavorite: false },
  { id: 3, energyType: 'Hydro', region: 'Pacific NW', price: 32.7, change: 0.8, volume: 7600, trend: 'up', isFavorite: true },
  { id: 4, energyType: 'Natural Gas', region: 'Northeast', price: 52.1, change: 3.5, volume: 15200, trend: 'up', isFavorite: false },
  { id: 5, energyType: 'Coal', region: 'Midwest', price: 41.8, change: -0.5, volume: 6800, trend: 'down', isFavorite: false },
  { id: 6, energyType: 'Nuclear', region: 'Southeast', price: 36.4, change: 1.1, volume: 8900, trend: 'stable', isFavorite: false },
];

export default function Markets() {
  const [markets, setMarkets] = useState<MarketData[]>(mockMarketData);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const tc = useThemeClasses();

  const toggleFavorite = (id: number) => {
    setMarkets(markets.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
  };

  const sortedMarkets = [...markets]
    .filter(m => m.energyType.toLowerCase().includes(searchTerm.toLowerCase()) || m.region.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortOrder === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${tc.textPrimary}`}>Energy Markets</h1>
          <p className={`mt-1 ${tc.textSecondary}`}>Real-time pricing and trading opportunities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tc.btnSecondary}`}>
            <FiRefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
          <button className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tc.btnSecondary}`}>
            <FiFilter className="w-4 h-4 mr-2" /> Filters
          </button>
        </div>
      </div>

      <div className={`rounded-2xl p-4 ${tc.cardBg}`}>
        <div className="relative">
          <FiSearch className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 ${tc.textMuted}`} />
          <input type="text" placeholder="Search energy types or regions..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm ${tc.input}`}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden ${tc.cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${tc.border}`}>
                {['Energy Type', 'Region'].map(h => (
                  <th key={h} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${tc.textMuted}`}>{h}</th>
                ))}
                {(['price', 'change', 'volume'] as const).map(key => (
                  <th key={key} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-blue-500 ${tc.textMuted}`}
                    onClick={() => { setSortBy(key); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center">
                      {key === 'price' ? 'Price ($/MWh)' : key === 'change' ? 'Change (%)' : 'Volume (MWh)'}
                      {sortBy === key && <span className="ml-1">{sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />}</span>}
                    </div>
                  </th>
                ))}
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${tc.textMuted}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMarkets.map((market) => (
                <tr key={market.id} className={`border-b transition-colors ${tc.tableRow}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button onClick={() => toggleFavorite(market.id)} className="mr-3 text-amber-400 hover:text-amber-300">
                        {market.isFavorite ? <FiStar fill="currentColor" /> : <FiStar />}
                      </button>
                      <span className={`font-medium ${tc.textPrimary}`}>{market.energyType}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${tc.textSecondary}`}>{market.region}</td>
                  <td className={`px-6 py-4 whitespace-nowrap font-medium ${tc.textPrimary}`}>${market.price.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${market.change > 0 ? 'text-emerald-500' : market.change < 0 ? 'text-rose-500' : tc.textMuted}`}>
                    <div className="flex items-center">
                      {market.trend === 'up' ? <FiChevronUp className="w-4 h-4" /> : market.trend === 'down' ? <FiChevronDown className="w-4 h-4" /> : null}
                      {market.change > 0 ? '+' : ''}{market.change.toFixed(1)}%
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${tc.textSecondary}`}>{market.volume.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">Trade</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${tc.textPrimary}`}>Top Performing</h3>
          <div className="space-y-3">
            {sortedMarkets.filter(m => m.change > 0).sort((a, b) => b.change - a.change).slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div><div className={`font-medium text-sm ${tc.textPrimary}`}>{m.energyType}</div><div className={`text-xs ${tc.textMuted}`}>{m.region}</div></div>
                <div className="text-emerald-500 font-medium">+{m.change.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${tc.textPrimary}`}>Volatility Indicators</h3>
          <div className="space-y-4">
            {[{ n: 'Solar', v: 65, l: 'Medium', c: 'bg-amber-500' }, { n: 'Wind', v: 85, l: 'High', c: 'bg-rose-500' }, { n: 'Natural Gas', v: 30, l: 'Low', c: 'bg-emerald-500' }].map(x => (
              <div key={x.n}>
                <div className="flex justify-between mb-1.5">
                  <span className={`text-sm ${tc.textPrimary}`}>{x.n}</span>
                  <span className={`text-sm ${tc.textMuted}`}>{x.l}</span>
                </div>
                <div className={`w-full rounded-full h-1.5 ${tc.isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                  <div className={`${x.c} h-1.5 rounded-full`} style={{ width: `${x.v}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl p-6 ${tc.cardBg}`}>
          <h3 className={`text-lg font-bold mb-4 ${tc.textPrimary}`}>AI Trading Signals</h3>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border ${tc.isDark ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="font-medium text-emerald-500 text-sm">BUY Signal</div>
              <div className={`text-xs mt-1 ${tc.textSecondary}`}>Solar prices favorable in CA. Confidence: 87%</div>
            </div>
            <div className={`p-3 rounded-xl border ${tc.isDark ? 'bg-amber-500/[0.06] border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <div className="font-medium text-amber-500 text-sm">HOLD Signal</div>
              <div className={`text-xs mt-1 ${tc.textSecondary}`}>Wind market stabilizing. Confidence: 72%</div>
            </div>
            <div className={`p-3 rounded-xl border ${tc.isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`font-medium text-sm ${tc.textSecondary}`}>NEUTRAL Signal</div>
              <div className={`text-xs mt-1 ${tc.textMuted}`}>Coal market unchanged. Monitor risks.</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
