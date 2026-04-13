export type PlatformRole = 'generator' | 'trader' | 'offtaker' | 'ipp_developer' | 'regulator' | 'admin' | 'lender' | 'carbon_fund' | 'grid';

export interface RoleConfig {
  label: string;
  accent: string;     // tailwind text class
  accentBg: string;   // tailwind bg class
  accentHex: string;  // hex for SVG/charts
  kpis: { label: string; value: string; change: string; positive: boolean }[];
  actions: { label: string; icon: string }[];
  /** Nav paths this role can see (Phase 3.18: role-based navigation) */
  allowedPaths: string[];
}

export const ROLE_CONFIGS: Record<PlatformRole, RoleConfig> = {
  generator: {
    label: 'Generator',
    accent: 'text-green-600',
    accentBg: 'bg-green-500',
    accentHex: '#16A34A',
        allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/metering', '/metering-analytics', '/ipp', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand', '/invoices', '/smart-rules', '/vault', '/trade-journal', '/carbon-deep', '/ipp-deep', '/reporting-engine', '/support'],
        kpis: [
          { label: 'Generation Today', value: '847 MWh', change: '+12.3%', positive: true },
      { label: 'Active PPAs', value: '14', change: '+2', positive: true },
      { label: 'Revenue MTD', value: 'R4.2M', change: '+8.1%', positive: true },
      { label: 'Plant Availability', value: '94.7%', change: '-0.3%', positive: false },
    ],
    actions: [
      { label: 'Submit Generation Data', icon: 'upload' },
      { label: 'View Active PPAs', icon: 'file' },
      { label: 'Check Plant Performance', icon: 'activity' },
      { label: 'Sync NERSA Registry', icon: 'refresh' },
    ],
  },
  trader: {
    label: 'Trader',
    accent: 'text-indigo-600',
    accentBg: 'bg-indigo-500',
    accentHex: '#4F46E5',
    allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/metering-analytics', '/risk', '/p2p', '/marketplace', '/settlement', '/reports', '/notifications', '/settings', '/smart-rules', '/invoices', '/vault', '/trade-journal', '/carbon-deep', '/reporting-engine', '/support'],
    kpis: [
      { label: 'Portfolio Value', value: 'R24.8M', change: '+12.4%', positive: true },
      { label: "Today's P&L", value: 'R1.24M', change: '+8.2%', positive: true },
      { label: 'Open Positions', value: '23', change: '+3', positive: true },
      { label: 'Carbon Credits', value: '12,450 t', change: '+3.8%', positive: true },
    ],
    actions: [
      { label: 'Place Order', icon: 'plus' },
      { label: 'Portfolio Rebalance', icon: 'refresh' },
      { label: 'Review Risk Exposure', icon: 'shield' },
      { label: 'Write Carbon Option', icon: 'file-plus' },
    ],
  },
  offtaker: {
    label: 'Offtaker',
    accent: 'text-purple-600',
    accentBg: 'bg-purple-500',
    accentHex: '#7C3AED',
    allowedPaths: ['/', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/metering-analytics', '/marketplace', '/p2p', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand', '/offtaker-cost', '/invoices', '/disputes', '/vault', '/trade-journal', '/offtaker-deep', '/reporting-engine', '/support'],
    kpis: [
      { label: 'Energy Consumed', value: '1.2 GWh', change: '+5.4%', positive: true },
      { label: 'Blended Cost', value: 'R0.89/kWh', change: '-2.1%', positive: true },
      { label: 'Carbon Offset', value: '3,200 t', change: '+15%', positive: true },
      { label: 'Active Contracts', value: '8', change: '+1', positive: true },
    ],
    actions: [
      { label: 'Browse P2P Marketplace', icon: 'shopping-bag' },
      { label: 'Review Invoices', icon: 'file-text' },
      { label: 'Track Carbon Offsets', icon: 'globe' },
      { label: 'Download TCFD Report', icon: 'download' },
    ],
  },
  ipp_developer: {
    label: 'IPP Developer',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-500',
    accentHex: '#D97706',
        allowedPaths: ['/', '/contracts', '/analytics', '/ipp', '/metering', '/metering-analytics', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand', '/invoices', '/vault', '/ipp-deep', '/reporting-engine', '/support'],
        kpis: [
          { label: 'Projects Active', value: '6', change: '+1', positive: true },
      { label: 'Total Capacity', value: '450 MW', change: '+75 MW', positive: true },
      { label: 'Disbursed Amount', value: 'R180M', change: '+R25M', positive: true },
      { label: 'CPs Completed', value: '34/42', change: '+5', positive: true },
    ],
    actions: [
      { label: 'Update Milestones', icon: 'check-circle' },
      { label: 'Upload CP Documents', icon: 'upload' },
      { label: 'Check Disbursements', icon: 'dollar-sign' },
      { label: 'Review Metering', icon: 'bar-chart' },
    ],
  },
  regulator: {
    label: 'Regulator',
    accent: 'text-red-600',
    accentBg: 'bg-red-500',
    accentHex: '#DC2626',
    allowedPaths: ['/', '/analytics', '/compliance', '/admin', '/reports', '/notifications', '/settings', '/metering', '/audit-trail', '/surveillance', '/reporting-engine', '/support'],
    kpis: [
      { label: 'Participants', value: '142', change: '+8', positive: true },
      { label: 'Trades Today', value: '1,847', change: '+23%', positive: true },
      { label: 'Compliance Rate', value: '97.2%', change: '+0.4%', positive: true },
      { label: 'AML Flags', value: '3', change: '-2', positive: true },
    ],
    actions: [
      { label: 'Review KYC Queue', icon: 'users' },
      { label: 'Audit Trading Activity', icon: 'search' },
      { label: 'Monitor Market Health', icon: 'activity' },
      { label: 'Check AML Flags', icon: 'alert-triangle' },
    ],
  },
  admin: {
    label: 'Admin',
    accent: 'text-slate-600',
    accentBg: 'bg-slate-500',
    accentHex: '#525252',
    allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/risk', '/metering', '/metering-analytics', '/p2p', '/ipp', '/marketplace', '/settlement', '/compliance', '/reports', '/developer', '/notifications', '/admin', '/settings', '/demand', '/offtaker-cost', '/disputes', '/invoices', '/smart-rules', '/audit-trail', '/system-health', '/tenant-admin', '/vault', '/lender', '/surveillance', '/trade-journal', '/carbon-deep', '/ipp-deep', '/offtaker-deep', '/reporting-engine', '/staff', '/support-dashboard', '/support', '/platform-config', '/aml-dashboard', '/payments', '/dashboard', '/modules'],
    kpis: [
      { label: 'Platform Users', value: '142', change: '+12', positive: true },
      { label: 'API Calls Today', value: '48.2K', change: '+18%', positive: true },
      { label: 'Uptime', value: '99.97%', change: '+0.02%', positive: true },
      { label: 'Revenue MTD', value: 'R2.1M', change: '+14%', positive: true },
    ],
    actions: [
      { label: 'Manage Participants', icon: 'users' },
      { label: 'System Health', icon: 'heart' },
      { label: 'Generate Reports', icon: 'file-text' },
      { label: 'Review API Usage', icon: 'code' },
    ],
  },
  lender: {
    label: 'Lender',
    accent: 'text-teal-600',
    accentBg: 'bg-teal-500',
    accentHex: '#0D9488',
    allowedPaths: ['/', '/contracts', '/analytics', '/ipp', '/settlement', '/reports', '/notifications', '/settings', '/invoices', '/lender', '/vault', '/reporting-engine', '/support'],
    kpis: [
      { label: 'Lending Portfolio', value: 'R1.2B', change: '+4.2%', positive: true },
      { label: 'Active Facilities', value: '18', change: '+2', positive: true },
      { label: 'Disbursed YTD', value: 'R340M', change: '+R45M', positive: true },
      { label: 'NPL Ratio', value: '1.8%', change: '-0.3%', positive: true },
    ],
    actions: [
      { label: 'Review Disbursements', icon: 'dollar-sign' },
      { label: 'Check CP Status', icon: 'check-circle' },
      { label: 'Portfolio Analytics', icon: 'bar-chart' },
      { label: 'Generate Reports', icon: 'file-text' },
    ],
  },
  grid: {
    label: 'Grid Operator',
    accent: 'text-orange-600',
    accentBg: 'bg-orange-500',
    accentHex: '#EA580C',
    allowedPaths: ['/', '/metering', '/metering-analytics', '/analytics', '/contracts', '/compliance', '/reports', '/notifications', '/settings', '/vault', '/reporting-engine', '/support'],
    kpis: [
      { label: 'Active Connections', value: '1,247', change: '+23', positive: true },
      { label: 'Energy Wheeled MTD', value: '4.8 GWh', change: '+12%', positive: true },
      { label: 'Grid Availability', value: '99.1%', change: '+0.2%', positive: true },
      { label: 'Pending Meters', value: '8', change: '-3', positive: true },
    ],
    actions: [
      { label: 'Validate Meter Readings', icon: 'check-circle' },
      { label: 'Review Connection Apps', icon: 'users' },
      { label: 'Grid Status Update', icon: 'activity' },
      { label: 'Download Wheeling Report', icon: 'download' },
    ],
  },
  carbon_fund: {
    label: 'Carbon Fund',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-500',
    accentHex: '#10B981',
    allowedPaths: ['/', '/trading', '/carbon', '/carbon-deep', '/contracts', '/analytics', '/markets', '/portfolio', '/metering-analytics', '/risk', '/settlement', '/reports', '/notifications', '/settings', '/vault', '/trade-journal', '/reporting-engine', '/support'],
    kpis: [
      { label: 'ESG Assets', value: 'R2.4B', change: '+15.2%', positive: true },
      { label: 'Carbon Offset', value: '1.2M t', change: '+120K', positive: true },
      { label: 'Avg Yield', value: '6.4%', change: '+0.2%', positive: true },
      { label: 'Impact Score', value: '94/100', change: '+2', positive: true },
    ],
    actions: [
      { label: 'Allocate Fund', icon: 'dollar-sign' },
      { label: 'Buy Carbon Credits', icon: 'globe' },
      { label: 'View ESG Impact', icon: 'leaf' },
      { label: 'Manage Portfolio', icon: 'layers' },
    ],
  },
};


// Role aliases — map DB roles to frontend config keys
const ROLE_ALIASES: Record<string, PlatformRole> = {
  ipp: 'generator', // ipp maps to generator config (same project-based workflow)
};

export function getRoleConfig(role: string): RoleConfig {
  const normalized = role?.toLowerCase().replace(/\s+/g, '_');
  const key = (ROLE_ALIASES[normalized] || normalized) as PlatformRole;
  return ROLE_CONFIGS[key] || ROLE_CONFIGS.trader;
}
