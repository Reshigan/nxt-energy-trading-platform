// Real-time WebSocket service for energy price streaming
// Supports market price feeds, grid status, and carbon pricing

import { useState, useEffect, useCallback, useRef } from 'react';

export interface EnergyPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePct: number;
  volume: number;
  timestamp: number;
}

export interface GridStatus {
  load: number;        // Current load in MW
  capacity: number;   // Total capacity in MW
  priceZone: 'low' | 'medium' | 'high';
  demandForecast: number;
  supplyAvailable: number;
  curtailmentRisk: number;
}

export interface CarbonPrice {
  cert_type: 'CER' | 'VER' | 'EUA' | 'SAF';
  price: number;      // ZAR per tonne
  change24h: number;
  volume24h: number;
  timestamp: number;
}

interface WebSocketConfig {
  onPriceUpdate?: (prices: EnergyPrice[]) => void;
  onGridUpdate?: (status: GridStatus) => void;
  onCarbonUpdate?: (price: CarbonPrice) => void;
  onConnectionChange?: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

// Simulated real-time price data (replace with actual exchange WebSocket)
function generateMockPrices(): EnergyPrice[] {
  const basePrices: Record<string, number> = {
    'ZAR/kWh': 2.45 + Math.random() * 0.3,
    'SA Rand/kWh': 2.38 + Math.random() * 0.25,
    'Eskom Spot': 185.50 + Math.random() * 15,
    'Solar PPA': 3.12 + Math.random() * 0.2,
    'Wind Forward': 2.89 + Math.random() * 0.18,
    'Gas Spot': 45.20 + Math.random() * 3,
    'Carbon CER': 850 + Math.random() * 50,
  };
  
  return Object.entries(basePrices).map(([symbol, price]) => ({
    symbol,
    price,
    change24h: (Math.random() - 0.5) * 0.1 * price,
    changePct: (Math.random() - 0.5) * 10,
    volume: Math.floor(Math.random() * 10000) + 1000,
    timestamp: Date.now(),
  }));
}

function generateMockGridStatus(): GridStatus {
  return {
    load: 35000 + Math.floor(Math.random() * 5000),
    capacity: 45000,
    priceZone: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
    demandForecast: 38000 + Math.floor(Math.random() * 4000),
    supplyAvailable: 42000 + Math.floor(Math.random() * 5000),
    curtailmentRisk: Math.random() * 30,
  };
}

function generateMockCarbonPrice(): CarbonPrice {
  const types: CarbonPrice['cert_type'][] = ['CER', 'VER', 'EUA', 'SAF'];
  const type = types[Math.floor(Math.random() * types.length)];
  const basePrice: Record<CarbonPrice['cert_type'], number> = {
    CER: 850,
    VER: 720,
    EUA: 950,
    SAF: 1200,
  };
  return {
    cert_type: type,
    price: basePrice[type] + Math.random() * 100,
    change24h: (Math.random() - 0.5) * 50,
    volume24h: Math.floor(Math.random() * 100000),
    timestamp: Date.now(),
  };
}

// WebSocket hook for real-time energy data
export function useEnergyWebSocket(config?: WebSocketConfig) {
  const [prices, setPrices] = useState<EnergyPrice[]>([]);
  const [gridStatus, setGridStatus] = useState<GridStatus | null>(null);
  const [carbonPrice, setCarbonPrice] = useState<CarbonPrice | null>(null);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latency, setLatency] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  
  const intervalRef = useRef<number | null>(null);
  
  const connect = useCallback(() => {
    setStatus('connecting');
    
    // Simulate connection delay
    setTimeout(() => {
      setStatus('connected');
      config?.onConnectionChange?.('connected');
      
      // Initial data load
      setPrices(generateMockPrices());
      setGridStatus(generateMockGridStatus());
      setCarbonPrice(generateMockCarbonPrice());
      setLastUpdate(Date.now());
      
      // Start real-time updates (every 2-5 seconds)
      intervalRef.current = window.setInterval(() => {
        const start = Date.now();
        
        // Update prices
        const newPrices = generateMockPrices();
        setPrices(newPrices);
        config?.onPriceUpdate?.(newPrices);
        
        // Occasionally update grid status
        if (Math.random() > 0.7) {
          const grid = generateMockGridStatus();
          setGridStatus(grid);
          config?.onGridUpdate?.(grid);
        }
        
        // Occasionally update carbon price
        if (Math.random() > 0.8) {
          const carbon = generateMockCarbonPrice();
          setCarbonPrice(carbon);
          config?.onCarbonUpdate?.(carbon);
        }
        
        setLastUpdate(Date.now());
        setLatency(Date.now() - start);
      }, 2000 + Math.random() * 3000);
    }, 500);
  }, [config]);
  
  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('disconnected');
    config?.onConnectionChange?.('disconnected');
  }, [config]);
  
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return {
    prices,
    gridStatus,
    carbonPrice,
    status,
    latency,
    lastUpdate,
    reconnect,
    disconnect,
  };
}

// Price formatter for display
export function formatPrice(price: number, symbol: string): string {
  if (symbol.includes('/kWh') || symbol.includes('Rand/kWh')) {
    return `R${price.toFixed(2)}/kWh`;
  }
  if (symbol.includes('Spot')) {
    return `R${price.toFixed(2)}/MWh`;
  }
  if (symbol.includes('Carbon') || symbol.includes('CER')) {
    return `R${price.toFixed(0)}/t`;
  }
  return `R${price.toFixed(2)}`;
}

// Price change indicator
export function getPriceChangeClass(changePct: number): string {
  if (changePct > 0) return 'text-emerald-500';
  if (changePct < 0) return 'text-red-500';
  return 'text-slate-500';
}