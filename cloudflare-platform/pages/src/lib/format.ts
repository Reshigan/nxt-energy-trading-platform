/**
 * Rule 5: ALL MONEY IN ZAR — R (Rand), never $.
 * Central formatting utilities for the NXT Energy Trading Platform.
 */

/** Format cents to ZAR display string: 2480 → "R24.80" */
export function formatZAR(cents: number): string {
  return 'R' + (cents / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format number with South African locale separators: 1234567 → "1 234 567" */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-ZA');
}

/** Format volume in MWh: 1234.5 → "1 234.50 MWh" */
export function formatMWh(volume: number): string {
  return volume.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MWh';
}

/** Format percentage: 0.85 → "85.0%" */
export function formatPct(decimal: number): string {
  return (decimal * 100).toFixed(1) + '%';
}

/** Format date to SA locale: "2024-03-15T10:30:00Z" → "15 Mar 2024, 12:30" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative time: "2 hours ago", "3 days ago" */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
