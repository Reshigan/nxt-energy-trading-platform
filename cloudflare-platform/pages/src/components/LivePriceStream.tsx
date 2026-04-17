import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiTrendingUp, FiTrendingDown, FiRefreshCw } from '../lib/fi-icons-shim';
import { motion } from 'framer-motion';

// Simulated energy spot prices (ZAR/kWh) - replace with real WebSocket in production
const BASE_PRICES = {
  solar: 1.24,
  wind: 1.18,
  gas: 2.45,
  coal: 1.89,
  battery: 1.76,
  carbon: 0.85,
  eskom: 2.32,
  nuclear: 1.52
};

// Volatility factors for realistic price movement
const VOLATILITY = {
  solar: 0.03,  // Low - predictable
  wind: 0.05,   // Medium - weather dependent
  gas: 0.08,    // High - market sensitive
  coal: 0.04,   // Low - stable
  battery: 0.06, // Medium - arbitrage
  carbon: 0.10, // High - regulatory
  eskom: 0.02,  // Very low - regulated
  nuclear: 0.01  // Very low - baseload
};

interface PriceTick {
  id: string;
  label: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
  updatedAt: Date;
  color: string;
}

interface LivePriceStreamProps {
  isDark?: boolean;
  compact?: boolean;
}

const LivePriceStream: React.FC<LivePriceStreamProps> = ({ isDark = false, compact = false }) => {
  const [prices, setPrices] = useState<PriceTick[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [tickCount, setTickCount] = useState(0);

  // Initialize prices
  useEffect(() => {
    const initial: PriceTick[] = [
      { id: 'solar', label: 'Solar Spot', price: BASE_PRICES.solar, previousPrice: BASE_PRICES.solar, change: 0, changePercent: 0, trend: 'neutral', updatedAt: new Date(), color: '#f59e0b' },
      { id: 'wind', label: 'Wind Spot', price: BASE_PRICES.wind, previousPrice: BASE_PRICES.wind, change: 0, changePercent: 0, trend: 'neutral', updatedAt: new Date(), color: '#06b6d4' },
      { id: 'gas', label: 'Gas Peak', price: BASE_PRICES.gas, previousPrice: BASE_PRICES.gas, change: 0, changePercent: 0, trend: 'neutral', updatedAt: new Date(), color: '#8b5cf6' },
      { id: 'carbon', label: 'Carbon EAL', price: BASE_PRICES.carbon, previousPrice: BASE_PRICES.carbon, change: 0, changePercent: 0, trend: 'neutral', updatedAt: new Date(), color: '#10b981' },
    ];
    setPrices(initial);
  }, []);

  // Real-time price simulation (replace with WebSocket in production)
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setTickCount(c => c + 1);
      
      setPrices(current => {
        return current.map(price => {
          const volatility = VOLATILITY[price.id as keyof typeof VOLATILITY] || 0.05;
          const randomWalk = (Math.random() - 0.5) * 2 * volatility;
          const newPrice = Math.max(0.01, price.price * (1 + randomWalk));
          const change = newPrice - price.previousPrice;
          const changePercent = (change / price.previousPrice) * 100;
          
          return {
            ...price,
            previousPrice: price.price,
            price: newPrice,
            change,
            changePercent,
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
            updatedAt: new Date()
          };
        });
      });
      
      setLastUpdate(new Date());
    }, compact ? 3000 : 1500); // Update every 1.5s (3s if compact)
    
    return () => clearInterval(interval);
  }, [isPaused, compact]);

  const formatPrice = (p: number) => p.toFixed(4);
  
  const cardClass = compact 
    ? 'p-3' 
    : `p-4 ${isDark ? 'bg-[#151F32]/80' : 'bg-white'} rounded-2xl border ${isDark ? 'border-white/[0.06]' : 'border-black/[0.04]'}`;

  return (
    <motion.div 
      className={cardClass}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <FiActivity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Live Energy Prices</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ZAR/kWh spot market</p>
            </div>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-lg transition-all ${isPaused ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            <FiRefreshCw className={`w-4 h-4 ${isPaused ? '' : 'animate-spin'}`} style={{ animationDuration: '3s' }} />
          </button>
        </div>
      )}

      {/* Price Grid */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
        {prices.map((price) => (
          <div
            key={price.id}
            className={`relative p-3 rounded-xl transition-all duration-300 ${
              isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-slate-50 hover:bg-slate-100'
            }`}
          >
            {/* Trend indicator */}
            <div className={`absolute top-2 right-2 ${price.trend === 'up' ? 'text-emerald-500' : price.trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
              {price.trend === 'up' ? <FiTrendingUp className="w-4 h-4" /> : 
               price.trend === 'down' ? <FiTrendingDown className="w-4 h-4" /> : 
               <div className="w-4 h-0.5 bg-slate-400 rounded" />}
            </div>
            
            {/* Color indicator */}
            <div 
              className="w-2 h-2 rounded-full mb-2"
              style={{ backgroundColor: price.color }}
            />
            
            {/* Label */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{price.label}</p>
            
            {/* Price */}
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {formatPrice(price.price)}
            </p>
            
            {/* Change */}
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              price.changePercent > 0 ? 'text-emerald-500' : 
              price.changePercent < 0 ? 'text-red-500' : 
              'text-slate-400'
            }`}>
              <span>{price.changePercent > 0 ? '+' : ''}{price.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status */}
      {!compact && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Stream active • {tickCount} ticks
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default LivePriceStream;