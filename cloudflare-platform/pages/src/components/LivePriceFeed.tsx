import React, { useState, useEffect, useRef } from 'react';
import { FiTrendingUp, FiTrendingDown, FiZap } from '../lib/fi-icons-shim';

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  timestamp: number;
}

const PRICE_CONFIG = {
  'SA_power': { name: 'SA Power (Eskom Spot)', basePrice: 2.45, volatility: 0.15 },
  'solar_ppa': { name: 'Solar PPA (ZAR/kWh)', basePrice: 1.85, volatility: 0.08 },
  'wind_forward': { name: 'Wind Forward (ZAR/kWh)', basePrice: 1.62, volatility: 0.07 },
  'gas_spot': { name: 'Gas Spot (ZAR/MWh)', basePrice: 485, volatility: 0.25 },
  'carbon_zar': { name: 'Carbon (ZAR/tCO₂)', basePrice: 285, volatility: 0.12 },
  'demand_charge': { name: 'Demand Charge (ZAR/kW)', basePrice: 165, volatility: 0.05 },
};

function simulatePrice(price: number, volatility: number): number {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return Math.max(0.01, price * (1 + change));
}

export default function LivePriceFeed({ isDark }: { isDark: boolean }) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    // Initialize with base prices
    const initial: Record<string, PriceData> = {};
    Object.entries(PRICE_CONFIG).forEach(([symbol, config]) => {
      initial[symbol] = {
        symbol,
        name: config.name,
        price: config.basePrice,
        change: 0,
        changePct: 0,
        volume: Math.floor(Math.random() * 10000) + 1000,
        timestamp: Date.now(),
      };
      prevPrices.current[symbol] = config.basePrice;
    });
    setPrices(initial);

    // Real-time price updates via simulation (replace with actual WebSocket)
    const interval = setInterval(() => {
      setPrices(prev => {
        const updated: Record<string, PriceData> = {};
        Object.entries(prev).forEach(([symbol, data]) => {
          const config = PRICE_CONFIG[symbol as keyof typeof PRICE_CONFIG];
          const newPrice = simulatePrice(data.price, config.volatility);
          const prevPrice = prevPrices.current[symbol] || newPrice;
          const change = newPrice - prevPrice;
          const changePct = (change / prevPrice) * 100;
          
          updated[symbol] = {
            ...data,
            price: newPrice,
            change,
            changePct,
            volume: data.volume + Math.floor(Math.random() * 100),
            timestamp: Date.now(),
          };
          prevPrices.current[symbol] = newPrice;
        });
        return updated;
      });
      setLastUpdate(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string): string => {
    if (symbol === 'gas_spot') return `R${price.toFixed(0)}`;
    if (symbol === 'carbon_zar') return `R${price.toFixed(0)}`;
    if (symbol === 'demand_charge') return `R${price.toFixed(0)}`;
    if (symbol === 'SA_power') return `R${price.toFixed(2)}/kWh`;
    return `R${price.toFixed(2)}`;
  };

  return (
    <div className={`cp-card !p-4 ${isDark ? '!bg-[#151F32] !border-white/[0.06]' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <FiZap className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Live Energy Prices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(prices).slice(0, 4).map(([symbol, data]) => (
          <div 
            key={symbol}
            className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {data.name.length > 20 ? data.name.slice(0, 18) + '...' : data.name}
              </span>
              {data.changePct > 0 ? (
                <FiTrendingUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <FiTrendingDown className="w-3 h-3 text-red-500" />
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white mono">
                {formatPrice(data.price, symbol)}
              </span>
              <span className={`text-xs font-medium ${data.changePct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {data.changePct >= 0 ? '+' : ''}{data.changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Full price table for desktop */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 text-slate-500 font-medium">Market</th>
              <th className="text-right py-2 text-slate-500 font-medium">Price</th>
              <th className="text-right py-2 text-slate-500 font-medium">Change</th>
              <th className="text-right py-2 text-slate-500 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(prices).map(data => (
              <tr key={data.symbol} className="border-b border-slate-100 dark:border-slate-800/50">
                <td className="py-2 text-slate-700 dark:text-slate-300">{data.name}</td>
                <td className="py-2 text-right font-semibold text-slate-900 dark:text-white mono">
                  {formatPrice(data.price, data.symbol)}
                </td>
                <td className={`py-2 text-right font-medium ${data.changePct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {data.changePct >= 0 ? '+' : ''}{data.changePct.toFixed(2)}%
                </td>
                <td className="py-2 text-right text-slate-500 mono">{(data.volume / 1000).toFixed(1)}k</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}