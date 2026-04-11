import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiAlertCircle } from '../../lib/fi-icons-shim';
import { useTheme } from '../../contexts/ThemeContext';

export interface ModuleCardData {
  module: string;
  title: string;
  summary: Record<string, unknown>;
  chart_data?: unknown[];
  chart_type?: 'sparkline' | 'bar' | 'pie' | 'gauge';
  action_count: number;
  link: string;
}

const moduleIcons: Record<string, string> = {
  participants: 'U',
  trading: 'T',
  compliance: 'C',
  revenue: 'R',
  disputes: 'D',
  system: 'S',
  pipeline: 'P',
  cp_tracker: 'CP',
  disbursements: '$',
  generation: 'G',
  contracts: 'F',
  positions: 'P',
  orderbook: 'OB',
  risk: 'RK',
  carbon: 'CO',
  recent_trades: 'RT',
  inventory: 'I',
  options: 'OP',
  performance: 'PF',
  registry: 'RG',
  market: 'MK',
  consumption: 'KW',
  cost: '$',
  invoices: 'IN',
  portfolio: 'PF',
  cp_status: 'CP',
  covenants: 'CV',
  grid: 'GR',
  metering: 'M',
  imbalance: 'IM',
  audit: 'AL',
};

function SummaryLine({ label, value }: { label: string; value: string | number }) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{label}</span>
      <span className={`font-semibold mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{String(value)}</span>
    </div>
  );
}

function renderSummary(summary: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(summary).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number'
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1 mt-2">
      {entries.slice(0, 4).map(([key, val]) => (
        <SummaryLine
          key={key}
          label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          value={val as string | number}
        />
      ))}
    </div>
  );
}

export default function ModuleCard({ card, accentHex }: { card: ModuleCardData; accentHex: string }) {
  const { isDark } = useTheme();
  const icon = moduleIcons[card.module] || card.module.charAt(0).toUpperCase();

  return (
    <Link
      to={card.link}
      className={`block rounded-2xl p-4 transition-all hover:scale-[1.01] group ${
        isDark
          ? 'bg-[#151F32] border border-white/[0.06] hover:border-white/[0.1]'
          : 'bg-white border border-black/[0.06] shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
            style={{ backgroundColor: accentHex }}
          >
            {icon}
          </div>
          <h4 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {card.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {card.action_count > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              <FiAlertCircle className="w-3 h-3" />
              {card.action_count}
            </span>
          )}
          <FiArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
        </div>
      </div>
      {renderSummary(card.summary)}
    </Link>
  );
}
