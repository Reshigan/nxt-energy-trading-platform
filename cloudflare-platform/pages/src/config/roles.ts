export type PlatformRole = 'generator' | 'trader' | 'offtaker' | 'ipp_developer' | 'regulator' | 'admin';

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
    allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/metering', '/ipp', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand'],
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
    allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/risk', '/p2p', '/marketplace', '/settlement', '/reports', '/notifications', '/settings'],
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
    allowedPaths: ['/', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/marketplace', '/p2p', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand'],
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
    allowedPaths: ['/', '/contracts', '/analytics', '/ipp', '/metering', '/settlement', '/compliance', '/reports', '/notifications', '/settings', '/demand'],
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
    allowedPaths: ['/', '/analytics', '/compliance', '/admin', '/reports', '/notifications', '/settings', '/metering'],
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
    allowedPaths: ['/', '/trading', '/carbon', '/contracts', '/analytics', '/markets', '/portfolio', '/risk', '/metering', '/p2p', '/ipp', '/marketplace', '/settlement', '/compliance', '/reports', '/developer', '/notifications', '/admin', '/settings', '/demand'],
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
};

export function getRoleConfig(role: string): RoleConfig {
  const key = role?.toLowerCase().replace(/\s+/g, '_') as PlatformRole;
  return ROLE_CONFIGS[key] || ROLE_CONFIGS.trader;
}
