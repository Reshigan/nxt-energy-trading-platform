import { useTheme } from '../contexts/ThemeContext';

export function useThemeClasses() {
  const { isDark } = useTheme();
  return {
    isDark,
    bg: isDark ? 'bg-[#0B1120]' : 'bg-[#EEF1F6]',
    pageBg: isDark ? 'bg-[#0B1120]' : 'bg-[#EEF1F6]',
    surface: isDark ? 'bg-[#151F32]' : 'bg-white',
    surfaceAlt: isDark ? 'bg-[#1A2640]' : 'bg-[#F8FAFC]',
    border: isDark ? 'border-white/[0.08]' : 'border-black/[0.06]',
    textPrimary: isDark ? 'text-slate-100' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
    textMuted: isDark ? 'text-slate-500' : 'text-slate-400',
    cardBg: isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06]',
    cardHover: isDark ? 'hover:bg-[#1A2640]' : 'hover:bg-slate-50',
    cardBgHover: isDark ? 'hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5' : 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5',
    statusGreen: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    chartGrid: isDark ? '#1e293b' : '#f1f5f9',
    chartAxis: isDark ? '#64748b' : '#94a3b8',
    chartTooltipBg: isDark ? '#151F32' : '#ffffff',
    chartTooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'bg-[#1A2640] border-white/[0.08]' : 'bg-[#F8FAFC] border-black/[0.06]',
    input: isDark ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20' : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20',
    modalBg: isDark ? 'bg-[#0d1b2a] border border-white/[0.08]' : 'bg-white border border-slate-200',
  };
}
