import React, { useState, useEffect } from 'react';
import { FiBattery, FiZap, FiTrendingUp, FiTrendingDown, FiClock, FiActivity } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface Vehicle {
  id: string;
  name: string;
  charge: number;
  status: 'charging' | 'discharging' | 'idle' | 'scheduled';
  gridContribution: number;
  energyBalance: number;
  nextAvailable: string;
  capacity: number;
}

interface GridSignal {
  time: string;
  price: number;
  demand: number;
  renewable: number;
  recommendation: 'charge' | 'discharge' | 'hold';
}

// Simulate real-time grid signals
const generateGridSignals = (): GridSignal[] => {
  const signals: GridSignal[] = [];
  const now = new Date();
  
  for (let i = 0; i < 8; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    const hour = time.getHours();
    
    // Solar peak (12-15h), wind peak (21-03h)
    const renewableFactor = hour >= 12 && hour <= 15 ? 0.8 : hour >= 21 || hour <= 3 ? 0.6 : 0.3;
    const demandFactor = hour >= 7 && hour <= 9 || hour >= 18 && hour <= 21 ? 1.3 : 1.0;
    
    const basePrice = 1.45 + (demandFactor - 1) * 0.3 - renewableFactor * 0.2;
    
    signals.push({
      time: time.toLocaleTimeString('en-ZA', { hour: '2-digit' }),
      price: Math.max(0.8, basePrice + (Math.random() - 0.5) * 0.15),
      demand: 3500 + demandFactor * 800 + Math.random() * 200,
      renewable: renewableFactor * 100,
      recommendation: basePrice < 1.3 ? 'charge' : basePrice > 1.7 ? 'discharge' : 'hold'
    });
  }
  return signals;
};

export default function V2GGridIntegration() {
  const tc = useThemeClasses();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [gridSignals, setGridSignals] = useState<GridSignal[]>([]);
  const [totalContribution, setTotalContribution] = useState(0);
  const [totalEnergyBalance, setTotalEnergyBalance] = useState(0);
  
  useEffect(() => {
    // Initialize fleet data
    setVehicles([
      { id: 'EV-001', name: 'Fleet Transit Van', charge: 78, status: 'discharging', gridContribution: 45, energyBalance: -120, nextAvailable: '14:30', capacity: 85 },
      { id: 'EV-002', name: 'Delivery Truck A', charge: 92, status: 'idle', gridContribution: 0, energyBalance: 0, nextAvailable: '08:00', capacity: 120 },
      { id: 'EV-003', name: 'Service Vehicle', charge: 45, status: 'charging', gridContribution: 30, energyBalance: 85, nextAvailable: '16:00', capacity: 65 },
      { id: 'EV-004', name: 'Warehouse Forklift', charge: 100, status: 'discharging', gridContribution: 60, energyBalance: -95, nextAvailable: '11:00', capacity: 95 },
      { id: 'EV-005', name: 'Executive Shuttle', charge: 62, status: 'scheduled', gridContribution: 0, energyBalance: 0, nextAvailable: '09:00', capacity: 70 },
    ]);
    
    setGridSignals(generateGridSignals());
    
    // Update grid signals periodically
    const signalInterval = setInterval(() => {
      setGridSignals(generateGridSignals());
    }, 30000);
    
    return () => clearInterval(signalInterval);
  }, []);
  
  useEffect(() => {
    const contrib = vehicles.reduce((sum, v) => sum + v.gridContribution, 0);
    const balance = vehicles.reduce((sum, v) => sum + v.energyBalance, 0);
    setTotalContribution(contrib);
    setTotalEnergyBalance(balance);
  }, [vehicles]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'charging': return 'bg-emerald-500';
      case 'discharging': return 'bg-amber-500';
      case 'idle': return 'bg-slate-400';
      default: return 'bg-blue-500';
    }
  };
  
  const getSignalColor = (rec: string) => {
    switch (rec) {
      case 'charge': return 'text-emerald-500';
      case 'discharge': return 'text-amber-500';
      default: return 'text-slate-400';
    }
  };
  
  const currentSignal = gridSignals[0];
  
  return (
    <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <FiBattery className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${tc.textPrimary}`}>V2G Grid Integration</h3>
            <p className="text-xs text-slate-500">Vehicle-to-Grid energy optimization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">Grid Connected</span>
        </div>
      </div>
      
      {/* Fleet Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiZap className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Grid Output</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-500">{totalContribution} kW</p>
          <p className="text-xs text-emerald-500/70">Feeding grid</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiActivity className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Energy Balance</span>
          </div>
          <p className={`text-xl font-bold font-mono ${totalEnergyBalance >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {totalEnergyBalance >= 0 ? '+' : ''}{totalEnergyBalance} kWh
          </p>
          <p className="text-xs text-slate-500">Net today</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <FiBattery className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Fleet Size</span>
          </div>
          <p className="text-xl font-bold font-mono text-blue-500">{vehicles.length}</p>
          <p className="text-xs text-slate-500">Connected EVs</p>
        </div>
      </div>
      
      {/* Real-time Grid Signal */}
      {currentSignal && (
        <div className={`p-4 rounded-xl mb-4 ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">Current Grid Signal</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              currentSignal.recommendation === 'charge' ? 'bg-emerald-500/10 text-emerald-500' :
              currentSignal.recommendation === 'discharge' ? 'bg-amber-500/10 text-amber-500' :
              'bg-slate-500/10 text-slate-400'
            }`}>
              {currentSignal.recommendation.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Spot Price</p>
              <p className="text-lg font-bold font-mono">R{currentSignal.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">System Demand</p>
              <p className="text-lg font-bold font-mono">{currentSignal.demand.toFixed(0)} MW</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Renewable %</p>
              <p className="text-lg font-bold font-mono text-emerald-500">{currentSignal.renewable.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 8-Hour Forecast */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">8-Hour Grid Forecast</p>
        <div className="flex gap-1 h-16">
          {gridSignals.map((signal, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-t transition-all hover:opacity-80 ${
                signal.recommendation === 'charge' ? 'bg-emerald-500' :
                signal.recommendation === 'discharge' ? 'bg-amber-500' :
                'bg-slate-300'
              }`}
              title={`${signal.time}: ${signal.recommendation} (R${signal.price.toFixed(2)})`}
              style={{ height: `${40 + Math.random() * 60}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {gridSignals.slice(0, 4).map((s, i) => (
            <span key={i} className="text-[10px] text-slate-500">{s.time}</span>
          ))}
        </div>
      </div>
      
      {/* Vehicle List */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 mb-2">Fleet Status</p>
        {vehicles.map(v => (
          <div key={v.id} className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${getStatusColor(v.status)}`} />
                <div>
                  <p className={`font-medium ${tc.textPrimary}`}>{v.name}</p>
                  <p className="text-xs text-slate-500">{v.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold font-mono">{v.charge}%</p>
                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                    <div 
                      className={`h-full rounded-full ${v.charge > 50 ? 'bg-emerald-500' : v.charge > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${v.charge}%` }}
                    />
                  </div>
                </div>
                {v.status === 'discharging' && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-500">-{v.gridContribution} kW</p>
                    <p className="text-xs text-slate-500">→ Grid</p>
                  </div>
                )}
                {v.status === 'charging' && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-500">+{v.energyBalance} kW</p>
                    <p className="text-xs text-slate-500">← Grid</p>
                  </div>
                )}
                <div className="text-right">
                  <p className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    v.status === 'charging' ? 'bg-emerald-500/10 text-emerald-500' :
                    v.status === 'discharging' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {v.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}