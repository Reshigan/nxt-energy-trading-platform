import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiFilter, FiSearch, FiStar, FiChevronUp, FiChevronDown } from 'react-icons/fi';

interface MarketData {
  id: number;
  energyType: string;
  region: string;
  price: number;
  change: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
  isFavorite: boolean;
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

  const toggleFavorite = (id: number) => {
    setMarkets(markets.map(market => 
      market.id === id ? { ...market, isFavorite: !market.isFavorite } : market
    ));
  };

  const sortedMarkets = [...markets]
    .filter(market => 
      market.energyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      market.region.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortBy] - b[sortBy];
      } else {
        return b[sortBy] - a[sortBy];
      }
    });

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <FiChevronUp className="w-4 h-4 text-emerald-400" />;
      case 'down': return <FiChevronDown className="w-4 h-4 text-rose-400" />;
      default: return <div className="w-4 h-4"></div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Energy Markets</h1>
          <p className="text-slate-400 mt-1">Real-time pricing and trading opportunities</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 glass rounded-lg hover:bg-slate-700 transition-colors">
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
          <button className="flex items-center px-4 py-2 glass rounded-lg hover:bg-slate-700 transition-colors">
            <FiFilter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass p-4 rounded-lg">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search energy types or regions..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Market Table */}
      <div className="chart-glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Energy Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Region</th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400"
                  onClick={() => {
                    setSortBy('price');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div className="flex items-center">
                    Price ($/MWh)
                    {sortBy === 'price' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400"
                  onClick={() => {
                    setSortBy('change');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div className="flex items-center">
                    Change (%)
                    {sortBy === 'change' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400"
                  onClick={() => {
                    setSortBy('volume');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div className="flex items-center">
                    Volume (MWh)
                    {sortBy === 'volume' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMarkets.map((market) => (
                <motion.tr 
                  key={market.id}
                  whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                  className="border-b border-slate-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button 
                        onClick={() => toggleFavorite(market.id)}
                        className="mr-3 text-amber-400 hover:text-amber-300"
                      >
                        {market.isFavorite ? <FiStar fill="currentColor" /> : <FiStar />}
                      </button>
                      <span className="font-medium">{market.energyType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">{market.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">${market.price.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    market.change > 0 ? 'text-emerald-400' : market.change < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    <div className="flex items-center">
                      {getTrendIcon(market.trend)}
                      {market.change > 0 ? '+' : ''}{market.change.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-300">{market.volume.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="px-3 py-1 text-sm rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                      Trade
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="chart-glass p-6">
          <h3 className="text-lg font-bold mb-4">Top Performing</h3>
          <div className="space-y-4">
            {sortedMarkets
              .filter(m => m.change > 0)
              .sort((a, b) => b.change - a.change)
              .slice(0, 3)
              .map(market => (
                <div key={market.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{market.energyType}</div>
                    <div className="text-sm text-slate-400">{market.region}</div>
                  </div>
                  <div className="text-emerald-400">+{market.change.toFixed(1)}%</div>
                </div>
              ))}
          </div>
        </div>
        
        <div className="chart-glass p-6">
          <h3 className="text-lg font-bold mb-4">Volatility Indicators</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Solar</span>
                <span className="text-sm">Medium</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Wind</span>
                <span className="text-sm">High</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Natural Gas</span>
                <span className="text-sm">Low</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="chart-glass p-6">
          <h3 className="text-lg font-bold mb-4">AI Trading Signals</h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="font-medium text-emerald-400">BUY Signal</div>
              <div className="text-sm mt-1">Solar prices favorable in CA. Confidence: 87%</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="font-medium text-amber-400">HOLD Signal</div>
              <div className="text-sm mt-1">Wind market stabilizing. Wait for breakout. Confidence: 72%</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <div className="font-medium text-slate-300">NEUTRAL Signal</div>
              <div className="text-sm mt-1">Coal market unchanged. Monitor geopolitical risks.</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}