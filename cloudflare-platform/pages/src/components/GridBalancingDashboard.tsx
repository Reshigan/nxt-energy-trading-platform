import React, { useState, useEffect } from 'react';
import { FiZap, FiTrendingUp, FiTrendingDown, FiActivity, FiRefreshCw, FiTarget } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface GridZone {
  id: string;
  name: string;
  demand: number;
  supply: number;
  frequency: number;
  price: number;
  renewablePct: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface SystemMetrics {
  totalDemand: number;
  totalSupply: number;
  systemFrequency: number;
  avgSpotPrice: number;
  renewableCoverage: number;
  gridStability: number;
  reserveMargin: number;
}

export default function GridBalancingDashboard() {
  const tc = useThemeClasses();
  const [zones, setZones] = useState<GridZone[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalDemand: 0, totalSupply: 0, systemFrequency: 50, avgSpotPrice: 0, renewableCoverage: 0, gridStability: 0, reserveMargin: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  useEffect(() => {
    // Initialize grid zones
    const initialZones: GridZone[] = [
      { id: 'northern', name: 'Northern Cape', demand: 1200, supply: 1350, frequency: 50.02, price: 1.42, renewablePct: 85, status: 'normal', trend: 'stable' },
      { id: 'eastern', name: 'Eastern Cape', demand: 2800, supply: 2650, frequency: 49.95, price: 1.78, renewablePct: 62, status: 'warning', trend: 'up' },
      { id: 'western', name: 'Western Cape', demand: 3200, supply: 3400, frequency: 50.05, price: 1.35, renewablePct: 78, status: 'normal', trend: 'down' },
      { id: 'central', name: 'Central SA', demand: 4500, supply: 4400, frequency: 49.98, price: 1.65, renewablePct: 45, status: 'warning', trend: 'up' },
      { id: 'kwazulu', name: 'KwaZulu-Natal', demand: 2100, supply: 1900, frequency: 49.90, price: 1.95, renewablePct: 38, status: 'critical', trend: 'up' },
    ];
    setZones(initialZones);
    
    // Update metrics based on zones
    updateMetrics(initialZones);
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setZones(prev => {
        const updated = prev.map(zone => {
          const demandChange = (Math.random() - 0.5) * 50;
          const supplyChange = (Math.random() - 0.4) * 40;
          const newDemand = Math.max(800, zone.demand + demandChange);
          const newSupply = Math.max(800, zone.supply + supplyChange);
          const balance = newSupply - newDemand;
          
          return {
            ...zone,
            demand: newDemand,
            supply: newSupply,
            frequency: 50 + (balance / 1000) * 0.1,
            price: 1.3 + (balance < 0 ? Math.abs(balance) * 0.001 : 0),
            renewablePct: Math.max(20, Math.min(95, zone.renewablePct + (Math.random() - 0.5) * 5)),
            status: balance < -200 ? 'critical' as const : balance < 100 ? 'warning' as const : 'normal' as const,
            trend: balance > zone.supply - zone.demand ? 'up' as const : balance < zone.supply - zone.demand ? 'down' as const : 'stable' as const
          };
        });
        updateMetrics(updated);
        setLastUpdate(new Date());
        return updated;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const updateMetrics = (zoneData: GridZone[]) => {
    const totalDemand = zoneData.reduce((s, z) => s + z.demand, 0);
    const totalSupply = zoneData.reduce((s, z) => s + z.supply, 0);
    const avgPrice = zoneData.reduce((s, z) => s + z.price, 0) / zoneData.length;
    const avgRenewable = zoneData.reduce((s, z) => s + z.renewablePct, 0) / zoneData.length;
    const avgFreq = zoneData.reduce((s, z) => s + z.frequency, 0) / zoneData.length;
    
    setMetrics({
      totalDemand,
      totalSupply,
      systemFrequency: avgFreq,
      avgSpotPrice: avgPrice,
      renewableCoverage: avgRenewable,
      gridStability: Math.max(0, 100 - (totalDemand - totalSupply) * 0.5),
      reserveMargin: ((totalSupply - totalDemand) / totalDemand) * 100
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-500/10 text-emerald-500';
      case 'warning': return 'bg-amber-500/10 text-amber-500';
      case 'critical': return 'bg-red-500/10 text-red-500';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };
  
  const frequencyStatus = metrics.systemFrequency >= 49.95 && metrics.systemFrequency <= 50.05 ? 'normal' : 'warning';
  
  return (
    <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <FiZap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${tc.textPrimary}`}>Grid Balancing Dashboard</h3>
            <p className="text-xs text-slate-500">Real-time load management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-500 font-medium">Live</span>
          </div>
          <span className="text-xs text-slate-400">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>
      
      {/* System Overview */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiActivity className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Demand</span>
          </div>
          <p className="text-xl font-bold font-mono">{metrics.totalDemand.toLocaleString()}</p>
          <p className="text-xs text-blue-500/70">MW</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiZap className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Supply</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-500">{metrics.totalSupply.toLocaleString()}</p>
          <p className="text-xs text-emerald-500/70">MW</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiTarget className="w-4 h-4 text-cyan-500" />
            <span className="text-xs text-slate-500">Frequency</span>
          </div>
          <p className={`text-xl font-bold font-mono ${frequencyStatus === 'normal' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {metrics.systemFrequency.toFixed(3)}
          </p>
          <p className="text-xs text-slate-400">Hz</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiActivity className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-slate-500">Renewable</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-500">{metrics.renewableCoverage.toFixed(0)}%</p>
          <p className="text-xs text-emerald-500/70">of supply</p>
        </div>
      </div>
      
      {/* Balance Indicator */}
      <div className={`p-4 rounded-xl mb-5 ${metrics.reserveMargin >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Reserve Margin</span>
          <span className={`text-sm font-bold ${metrics.reserveMargin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {metrics.reserveMargin >= 0 ? '+' : ''}{metrics.reserveMargin.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${metrics.reserveMargin >= 10 ? 'bg-emerald-500' : metrics.reserveMargin >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, Math.max(0, 50 + metrics.reserveMargin))}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>Critical</span>
          <span>Healthy</span>
        </div>
      </div>
      
      {/* Zone Grid */}
      <div className="grid grid-cols-5 gap-2">
        {zones.map(zone => (
          <div 
            key={zone.id}
            className={`p-3 rounded-xl transition-all hover:scale-105 ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium truncate">{zone.name}</span>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(zone.status)}`} />
            </div>
            <div className={`text-2xl font-bold font-mono mb-1 ${zone.status === 'critical' ? 'text-red-500' : zone.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`}>
              {zone.trend === 'up' ? <FiTrendingUp className="w-5 h-5 inline" /> : 
               zone.trend === 'down' ? <FiTrendingDown className="w-5 h-5 inline" /> : ''}
              {((zone.supply - zone.demand) / 100).toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-400 mb-2">MW balance</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Demand</span>
                <span className="font-mono">{zone.demand.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Supply</span>
                <span className="font-mono text-emerald-500">{zone.supply.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Price</span>
                <span className="font-mono">R{zone.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Renewable</span>
                <span className="font-mono text-emerald-500">{zone.renewablePct.toFixed(0)}%</span>
              </div>
            </div>
            <div className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-center ${getStatusBg(zone.status)}`}>
              {zone.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
      
      {/* Control Actions */}
      <div className="mt-4 flex gap-2">
        <button className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-all">
          <FiZap className="w-4 h-4" />
          Dispatch Reserve
        </button>
        <button className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all">
          <FiRefreshCw className="w-4 h-4" />
          Refresh Forecast
        </button>
        <button className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-purple-600 transition-all">
          <FiTarget className="w-4 h-4" />
          Set Target
        </button>
      </div>
    </div>
  );
}