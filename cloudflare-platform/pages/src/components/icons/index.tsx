import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const defaultProps = { size: 20, className: '', color: 'currentColor' };

function wrap(props: IconProps, children: React.ReactNode) {
  const { size = 20, className = '', color = 'currentColor' } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

// ─── Navigation Icons ────────────────────────────────
export function IconDashboard(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke={p.color || 'currentColor'} />
    <rect x="14" y="3" width="7" height="4" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </>);
}

export function IconTrading(p: IconProps = defaultProps) {
  return wrap(p, <>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
    <line x1="2" y1="20" x2="22" y2="20" strokeOpacity="0.3" />
  </>);
}

export function IconCarbon(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
    <path d="M12 7v4l3 2" />
    <path d="M8 15s1.5 2 4 2 4-2 4-2" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconContracts(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </>);
}

export function IconAnalytics(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="12" width="4" height="9" rx="1" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke={p.color || 'currentColor'} />
    <rect x="10" y="8" width="4" height="13" rx="1" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <rect x="17" y="3" width="4" height="18" rx="1" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconMarkets(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="4" y1="19" x2="4" y2="9" />
    <line x1="4" y1="15" x2="4" y2="12" strokeWidth="3.5" />
    <line x1="9" y1="19" x2="9" y2="5" />
    <line x1="9" y1="12" x2="9" y2="8" strokeWidth="3.5" />
    <line x1="14" y1="19" x2="14" y2="10" />
    <line x1="14" y1="16" x2="14" y2="13" strokeWidth="3.5" />
    <line x1="19" y1="19" x2="19" y2="4" />
    <line x1="19" y1="10" x2="19" y2="6" strokeWidth="3.5" />
  </>);
}

export function IconPortfolio(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 9 9h-9z" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke={p.color || 'currentColor'} />
    <path d="M12 12l-6.36 6.36" />
  </>);
}

export function IconRisk(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>);
}

export function IconMetering(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
    <circle cx="12" cy="12" r="1.5" fill={p.color || 'currentColor'} />
  </>);
}

export function IconP2P(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="7" cy="12" r="3" fill={p.color || 'currentColor'} fillOpacity="0.12" stroke={p.color || 'currentColor'} />
    <circle cx="17" cy="12" r="3" fill={p.color || 'currentColor'} fillOpacity="0.12" stroke={p.color || 'currentColor'} />
    <path d="M10 11h4" />
    <path d="M10 13h4" />
  </>);
}

export function IconIPP(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <rect x="9" y="13" width="6" height="8" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <line x1="12" y1="7" x2="12" y2="10" />
  </>);
}

export function IconMarketplace(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5z" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <line x1="3" y1="7" x2="21" y2="7" />
    <path d="M16 11a4 4 0 0 1-8 0" />
  </>);
}

export function IconSettlement(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="2" y="5" width="20" height="14" rx="2" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <line x1="2" y1="10" x2="22" y2="10" />
    <path d="M6 15h4" />
  </>);
}

export function IconCompliance(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />
    <polyline points="9 12 11 14 15 10" />
  </>);
}

export function IconReports(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <rect x="8" y="13" width="3" height="5" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.2" stroke={p.color || 'currentColor'} />
    <rect x="13" y="11" width="3" height="7" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconDeveloper(p: IconProps = defaultProps) {
  return wrap(p, <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <line x1="14" y1="4" x2="10" y2="20" strokeDasharray="2 2" />
  </>);
}

export function IconSettings(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>);
}

export function IconNotifications(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <circle cx="17" cy="5" r="3" fill="#3b82f6" stroke="none" />
  </>);
}

export function IconAdmin(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>);
}

export function IconDisputes(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>);
}

export function IconInvoices(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="4" y="2" width="16" height="20" rx="2" fill={p.color || 'currentColor'} fillOpacity="0.05" stroke={p.color || 'currentColor'} />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="12" y2="15" />
    <path d="M14 15h2l1 4h-4z" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke="none" />
  </>);
}

export function IconSmartRules(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="3" width="18" height="18" rx="3" fill={p.color || 'currentColor'} fillOpacity="0.05" stroke={p.color || 'currentColor'} />
    <path d="M8 12l3 3 5-6" />
    <circle cx="17" cy="7" r="2" fill="#10b981" stroke="none" />
  </>);
}

export function IconAuditTrail(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M5 3L3 5" />
    <path d="M19 3l2 2" />
  </>);
}

export function IconSystemHealth(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </>);
}

export function IconDemand(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconTenant(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </>);
}

export function IconOnboarding(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </>);
}

export function IconOfftakerCost(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>);
}

// ─── Utility / Action Icons ────────────────────────────
export function IconSearch(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>);
}

export function IconPlus(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>);
}

export function IconDownload(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>);
}

export function IconUpload(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>);
}

export function IconRefresh(p: IconProps = defaultProps) {
  return wrap(p, <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>);
}

export function IconFilter(p: IconProps = defaultProps) {
  return wrap(p, <>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconSun(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </>);
}

export function IconMoon(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconLogout(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </>);
}

export function IconMenu(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </>);
}

export function IconClose(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>);
}

export function IconChevronDown(p: IconProps = defaultProps) {
  return wrap(p, <polyline points="6 9 12 15 18 9" />);
}

export function IconHelp(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>);
}

export function IconAI(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="3" width="18" height="18" rx="4" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.5" />
    <path d="M7 8l2-2m6 0l2 2M7 16l2 2m6 0l2-2" strokeWidth="1.5" strokeOpacity="0.4" />
  </>);
}

export function IconCheck(p: IconProps = defaultProps) {
  return wrap(p, <polyline points="20 6 9 17 4 12" />);
}

export function IconArrowRight(p: IconProps = defaultProps) {
  return wrap(p, <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>);
}

export function IconExternalLink(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>);
}

export function IconStar(p: IconProps = defaultProps) {
  return wrap(p, <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />);
}

export function IconShield(p: IconProps = defaultProps) {
  return wrap(p, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />);
}

export function IconZap(p: IconProps = defaultProps) {
  return wrap(p, <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={p.color || 'currentColor'} fillOpacity="0.12" stroke={p.color || 'currentColor'} />);
}

export function IconGlobe(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </>);
}

export function IconActivity(p: IconProps = defaultProps) {
  return wrap(p, <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />);
}

export function IconHeart(p: IconProps = defaultProps) {
  return wrap(p, <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />);
}

// ─── Deep Tools Icons ────────────────────────────────
export function IconVault(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="11" width="18" height="11" rx="2" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1.5" fill={p.color || 'currentColor'} />
  </>);
}

export function IconLender(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="M12 3l9 7H3z" fill={p.color || 'currentColor'} fillOpacity="0.08" stroke={p.color || 'currentColor'} />
    <line x1="7" y1="10" x2="7" y2="21" />
    <line x1="12" y1="10" x2="12" y2="21" />
    <line x1="17" y1="10" x2="17" y2="21" />
  </>);
}

export function IconSurveillance(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="11" cy="11" r="8" fill={p.color || 'currentColor'} fillOpacity="0.05" stroke={p.color || 'currentColor'} />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <path d="M11 8v6l4 2" />
  </>);
}

export function IconTradeJournal(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </>);
}

export function IconCarbonDeep(p: IconProps = defaultProps) {
  return wrap(p, <>
    <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
    <path d="M12 7v4l3 2" />
    <path d="M8 15s1.5 2 4 2 4-2 4-2" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <circle cx="12" cy="12" r="3" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke="none" />
  </>);
}

export function IconIPPDeep(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" fill={p.color || 'currentColor'} fillOpacity="0.06" stroke={p.color || 'currentColor'} />
    <rect x="9" y="13" width="6" height="8" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <circle cx="12" cy="9" r="2" fill={p.color || 'currentColor'} fillOpacity="0.2" stroke={p.color || 'currentColor'} />
  </>);
}

export function IconOfftakerDeep(p: IconProps = defaultProps) {
  return wrap(p, <>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
    <circle cx="18" cy="5" r="3" fill="#7c3aed" stroke="none" />
  </>);
}

export function IconReportingEngine(p: IconProps = defaultProps) {
  return wrap(p, <>
    <rect x="3" y="3" width="18" height="18" rx="2" fill={p.color || 'currentColor'} fillOpacity="0.05" stroke={p.color || 'currentColor'} />
    <rect x="7" y="12" width="3" height="6" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.2" stroke={p.color || 'currentColor'} />
    <rect x="11" y="8" width="3" height="10" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.15" stroke={p.color || 'currentColor'} />
    <rect x="15" y="5" width="3" height="13" rx="0.5" fill={p.color || 'currentColor'} fillOpacity="0.1" stroke={p.color || 'currentColor'} />
  </>);
}
