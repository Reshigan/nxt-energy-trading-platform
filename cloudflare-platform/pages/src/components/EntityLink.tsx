/**
 * EntityLink — Clickable chip that appears wherever entity IDs are shown.
 * Clicking opens the EntityDetailPanel for that entity.
 * 
 * Usage: <EntityLink type="trade" id="abc-123" label="Trade #abc" />
 */
import React from 'react';

export type EntityType = 'trade' | 'contract' | 'project' | 'credit' | 'participant' | 'invoice' | 'escrow';

interface EntityLinkProps {
  type: EntityType;
  id: string;
  label?: string;
  onClick?: (type: EntityType, id: string) => void;
  className?: string;
}

const TYPE_COLORS: Record<EntityType, { bg: string; text: string; border: string; icon: string }> = {
  trade: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', icon: '\u2194' },
  contract: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', icon: '\u{1F4DC}' },
  project: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', icon: '\u2600' },
  credit: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', icon: '\u{1F33F}' },
  participant: { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20', icon: '\u{1F464}' },
  invoice: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20', icon: '\u{1F4B3}' },
  escrow: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20', icon: '\u{1F512}' },
};

export default function EntityLink({ type, id, label, onClick, className = '' }: EntityLinkProps) {
  const colors = TYPE_COLORS[type] || TYPE_COLORS.trade;
  const displayLabel = label || `${type.charAt(0).toUpperCase() + type.slice(1)} ${id.substring(0, 8)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(type, id);
    } else {
      // Dispatch custom event for EntityDetailPanel to listen to
      window.dispatchEvent(new CustomEvent('open-entity-detail', { detail: { type, id } }));
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border cursor-pointer transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] ${colors.bg} ${colors.text} ${colors.border} ${className}`}
      title={`View ${type}: ${id}`}
      aria-label={`View ${type} details: ${id}`}
    >
      <span className="text-[10px]" aria-hidden="true">{colors.icon}</span>
      <span className="truncate max-w-[120px]">{displayLabel}</span>
    </button>
  );
}
