import { useTheme } from '../contexts/ThemeContext';

export function useThemeClasses() {
  const { isDark } = useTheme();

  return {
    isDark,
    // Backgrounds
    pageBg: isDark ? 'bg-[#0a1628]' : 'bg-slate-50',
    cardBg: isDark ? 'bg-[#0f1d32] border border-white/[0.06]' : 'bg-white border border-slate-200',
    cardBgHover: isDark ? 'hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5' : 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5',
    // Text
    textPrimary: isDark ? 'text-slate-100' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
    textMuted: isDark ? 'text-slate-500' : 'text-slate-400',
    // Borders
    border: isDark ? 'border-white/[0.06]' : 'border-slate-200',
    // Inputs
    input: isDark ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20' : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20',
    // Tables
    tableHeader: isDark ? 'bg-white/[0.02] text-slate-400' : 'bg-slate-50 text-slate-500',
    tableRow: isDark ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50',
    // Buttons
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25',
    btnSecondary: isDark ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    // Tabs
    tabActive: isDark ? 'bg-blue-500/15 text-blue-400 border-blue-400' : 'bg-blue-50 text-blue-600 border-blue-500',
    tabInactive: isDark ? 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.04]' : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-50',
    // Status chips
    statusGreen: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    statusBlue: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600',
    statusYellow: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
    statusRed: isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600',
    // Modal
    modalBg: isDark ? 'bg-[#0d1b2a] border border-white/[0.08]' : 'bg-white border border-slate-200',
    // Recharts
    chartGrid: isDark ? '#1e293b' : '#e2e8f0',
    chartAxis: isDark ? '#64748b' : '#94a3b8',
    chartTooltipBg: isDark ? 'rgba(13,27,42,0.95)' : 'rgba(255,255,255,0.95)',
    chartTooltipBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };
}
