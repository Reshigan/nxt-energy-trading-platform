import React, { useState, useEffect } from 'react';
import { FiGlobe, FiLink, FiCheckCircle, FiClock, FiLeaf } from '../lib/fi-icons-shim';
import { useThemeClasses } from '../hooks/useThemeClasses';

interface TokenizedCredit {
  id: string;
  vintage: number;
  type: string;
  volume: number;
  price: number;
  registry: string;
  tokenId: string;
  status: 'minted' | 'listing' | 'retired' | 'transferred';
  timestamp: string;
  verificationScore: number;
}

const REGISTRIES: Record<string, { color: string; logo: string }> = {
  'Gold Standard': { color: '#f59e0b', logo: 'GS' },
  'Verra': { color: '#10b981', logo: 'V' },
  'SouthSouthCarbon': { color: '#6366f1', logo: 'SSC' },
  'AFOLU': { color: '#22c55e', logo: 'AF' }
};

export default function CarbonTokenizationEngine() {
  const tc = useThemeClasses();
  const [tokenizedCredits, setTokenizedCredits] = useState<TokenizedCredit[]>([]);
  const [selectedRegistry, setSelectedRegistry] = useState<string>('all');
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  
  useEffect(() => {
    const mockCredits: TokenizedCredit[] = [
      { id: 'tkn-001', vintage: 2024, type: 'Solar Cookstove', volume: 150, price: 285, registry: 'Gold Standard', tokenId: '0x7a3f...8e2d', status: 'minted', timestamp: '2h ago', verificationScore: 98 },
      { id: 'tkn-002', vintage: 2024, type: 'Reforestation', volume: 500, price: 320, registry: 'Verra', tokenId: '0x9b4c...3f1a', status: 'listing', timestamp: '4h ago', verificationScore: 95 },
      { id: 'tkn-003', vintage: 2023, type: 'Wind Farm', volume: 250, price: 265, registry: 'SouthSouthCarbon', tokenId: '0x2e8f...9c4b', status: 'retired', timestamp: '1d ago', verificationScore: 92 },
      { id: 'tkn-004', vintage: 2024, type: 'Biomass', volume: 80, price: 295, registry: 'Gold Standard', tokenId: '0x5d1a...7e0f', status: 'transferred', timestamp: '3d ago', verificationScore: 99 },
      { id: 'tkn-005', vintage: 2024, type: 'Mangrove', volume: 1200, price: 340, registry: 'AFOLU', tokenId: '0x8f2c...1b6d', status: 'minted', timestamp: '6h ago', verificationScore: 97 },
      { id: 'tkn-006', vintage: 2023, type: 'Clean Cook', volume: 95, price: 278, registry: 'Verra', tokenId: '0x3a9e...5d2c', status: 'listing', timestamp: '12h ago', verificationScore: 94 },
    ];
    
    setTokenizedCredits(mockCredits);
    
    const volume = mockCredits.reduce((sum, c) => sum + c.volume, 0);
    const value = mockCredits.reduce((sum, c) => sum + c.volume * c.price, 0);
    setTotalVolume(volume);
    setTotalValue(value);
  }, []);
  
  const filteredCredits = selectedRegistry === 'all' 
    ? tokenizedCredits 
    : tokenizedCredits.filter(c => c.registry === selectedRegistry);
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'minted': return { color: 'emerald', label: 'On-chain', icon: FiCheckCircle };
      case 'listing': return { color: 'blue', label: 'Listed', icon: FiClock };
      case 'retired': return { color: 'slate', label: 'Retired', icon: FiLeaf };
      case 'transferred': return { color: 'purple', label: 'Transferred', icon: FiLink };
      default: return { color: 'slate', label: status, icon: FiClock };
    }
  };
  
  const formatVolume = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`;
  
  return (
    <div className={`rounded-2xl p-5 ${tc.cardBg}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <FiGlobe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${tc.textPrimary}`}>Carbon Tokenization</h3>
            <p className="text-xs text-slate-500">On-chain credit registry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-500 font-medium">Blockchain Synced</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-500">Total Credits</p>
          <p className="text-xl font-bold font-mono">{formatVolume(totalVolume)}</p>
          <p className="text-xs text-slate-400">tCO2e</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-500">Portfolio Value</p>
          <p className="text-xl font-bold font-mono text-emerald-500">R{(totalValue/1000000).toFixed(1)}M</p>
          <p className="text-xs text-emerald-500/70">+12.4%</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-500">Tokenized</p>
          <p className="text-xl font-bold font-mono">{tokenizedCredits.length}</p>
          <p className="text-xs text-slate-400">Assets</p>
        </div>
        <div className={`p-3 rounded-xl ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
          <p className="text-xs text-slate-500">Avg Score</p>
          <p className="text-xl font-bold font-mono text-emerald-500">96%</p>
          <p className="text-xs text-slate-400">Verification</p>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedRegistry('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            selectedRegistry === 'all' 
              ? 'bg-emerald-500 text-white' 
              : tc.isDark ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}
        >
          All Registries
        </button>
        {Object.keys(REGISTRIES).map(reg => (
          <button
            key={reg}
            onClick={() => setSelectedRegistry(reg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedRegistry === reg 
                ? 'bg-emerald-500 text-white' 
                : tc.isDark ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {REGISTRIES[reg].logo} {reg}
          </button>
        ))}
      </div>
      
      <div className="space-y-2">
        {filteredCredits.map(credit => {
          const statusConfig = getStatusConfig(credit.status);
          const registryConfig = REGISTRIES[credit.registry];
          
          return (
            <div 
              key={credit.id}
              className={`p-4 rounded-xl transition-all hover:scale-[1.01] ${tc.isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: registryConfig?.color || '#6366f1' }}
                  >
                    {registryConfig?.logo || '??'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${tc.textPrimary}`}>{credit.type}</p>
                      <span className="text-xs text-slate-400">{credit.vintage}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{credit.tokenId}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono">{formatVolume(credit.volume)} tCO2</p>
                    <p className="text-xs text-emerald-500">R{credit.price}/tCO2</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        statusConfig.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                        statusConfig.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                        statusConfig.color === 'slate' ? 'bg-slate-500/10 text-slate-400' :
                        'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {React.createElement(statusConfig.icon, { className: 'w-4 h-4' })}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">{statusConfig.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">{credit.verificationScore}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{credit.timestamp}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/25">
        <FiGlobe className="w-4 h-4" />
        Tokenize New Credit
      </button>
    </div>
  );
}