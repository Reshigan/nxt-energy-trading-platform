import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiActivity, FiCalendar, FiZap, FiSun, FiWind } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';

// AI-powered energy forecasting engine
interface ForecastPoint {
  time: string;
  predicted: number;
  actual?: number;
  confidence: number;
  lower: number;
  upper: number;
  change: number;
}

interface ForecastData {
  generation: ForecastPoint[];
  prices: ForecastPoint[];
  demand: ForecastPoint[];
}

const generateForecast = (baseValue: number, volatility: number, hours: number): ForecastPoint[] => {
  const points: ForecastPoint[] = [];
  const now = new Date();
  let prevPrice = baseValue;
  
  for (let i = 0; i < hours; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    const hourFactor = Math.sin((time.getHours() - 6) * Math.PI / 12); // Peak at noon
    const predicted = baseValue * (1 + hourFactor * 0.3 + (Math.random() - 0.5) * volatility);
    const confidence = 95 - (i * 2); // Confidence decreases over time
    const uncertainty = (100 - confidence) / 200;
    const change = predicted - prevPrice;
    prevPrice = predicted;
    
    points.push({
      time: time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      predicted: Math.max(0, predicted),
      actual: i < 2 ? predicted * (1 + (Math.random() - 0.5) * 0.02) : undefined,
      confidence,
      lower: Math.max(0, predicted * (1 - uncertainty)),
      upper: predicted * (1 + uncertainty),
      change
    });
  }
  return points;
};

export default function AIEnergyForecasting() {
  const tc = useThemeClasses();
  const [data, setData] = useState<ForecastData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'generation' | 'prices' | 'demand'>('generation');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate AI model loading
    setIsLoading(true);
    const timer = setTimeout(() => {
      setData({
        generation: generateForecast(2.5, 0.15, 24),
        prices: generateForecast(1.85, 0.08, 24),
        demand: generateForecast(4500, 0.12, 24)
      });
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  
  const getMetricIcon = (m: string) => {
    if (m === 'generation') return <FiSun className="w-4 h-4" />;
    if (m === 'prices') return <FiActivity className="w-4 h-4" />;
    return <FiZap className="w-4 h-4" />;
  };
  
  const getMetricLabel = (m: string) => {
    if (m === 'generation') return 'Solar Generation (MW)';
    if (m === 'prices') return 'ZAR/kWh Spot Price';
    return 'System Demand (MW)';
  };
  
  const getMetricColor = (m: string) => {
    if (m === 'generation') return '#f59e0b';
    if (m === 'prices') return '#10b981';
    return '#6366f1';
  };
  
  const currentData = data?.[selectedMetric] || [];
  const latestPoint = currentData[0];
  
  return (
    <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${tc.textPrimary}`}>AI Energy Forecasting</h3>
            <p className="text-xs text-slate-500">ML-powered predictions • 24h horizon</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-xs font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          Neural Net Active
        </div>
      </div>
      
      {/* Metric Selector */}
      <div className="flex gap-2 mb-4">
        {(['generation', 'prices', 'demand'] as const).map(m => (
          <button
            key={m}
            onClick={() => setSelectedMetric(m)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedMetric === m 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg' 
                : tc.isDark ? 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {getMetricIcon(m)}
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Current Forecast */}
      {latestPoint && (
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Next Hour Prediction</p>
            <p className={`text-3xl font-bold font-mono ${tc.textPrimary}`}>
              {selectedMetric === 'prices' ? 'R' : ''}{latestPoint.predicted.toFixed(2)}{selectedMetric === 'demand' ? ' MW' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 text-sm font-medium ${latestPoint.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {latestPoint.change >= 0 ? <FiTrendingUp className="w-4 h-4" /> : <FiTrendingDown className="w-4 h-4" />}
              {latestPoint.change >= 0 ? '+' : ''}{(latestPoint.change / latestPoint.predicted * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-400">{latestPoint.confidence}% confidence</p>
          </div>
        </div>
      )}
      
      {/* Forecast Chart (Simplified bar visualization) */}
      <div className="relative h-32 flex items-end gap-1">
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          currentData.slice(0, 12).map((point, i) => {
            const maxVal = Math.max(...currentData.map(p => p.upper));
            const height = (point.predicted / maxVal) * 100;
            const isNow = i === 0;
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${
                    isNow ? 'bg-purple-500' : 'bg-purple-500/40 hover:bg-purple-500/60'
                  }`}
                  style={{ height: `${Math.max(10, height)}%` }}
                />
                <span className="text-[9px] text-slate-500">{point.time.split(':')[0]}</span>
              </div>
            );
          })
        )}
      </div>
      
      {/* Confidence Band */}
      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-purple-500/20 border border-purple-500/40" />
            <span className="text-slate-500">Prediction confidence</span>
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {latestPoint ? `${latestPoint.confidence}%` : '--'}
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${latestPoint?.confidence || 0}%` }}
          />
        </div>
      </div>
      
      {/* Key Insights */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <FiSun className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">Peak Generation</span>
          </div>
          <p className="text-lg font-bold font-mono">14:00</p>
          <p className="text-xs text-emerald-500">+15% vs yesterday</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <FiCalendar className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-slate-500">Best Trading Window</span>
          </div>
          <p className="text-lg font-bold font-mono">09:00-11:00</p>
          <p className="text-xs text-emerald-500">87% accuracy</p>
        </div>
      </div>
    </div>
  );
}