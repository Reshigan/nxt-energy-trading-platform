import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NXTLogo from '../components/NXTLogo';
import {
  IconNotifications, IconLogout, IconSun, IconMoon, IconMenu, IconClose,
  IconChevronDown, IconHelp, IconSearch, IconDashboard, IconTrading,
  IconCarbon, IconContracts, IconAnalytics, IconMarkets, IconPortfolio,
  IconRisk, IconMetering, IconP2P, IconIPP, IconMarketplace, IconSettlement,
  IconCompliance, IconReports, IconDeveloper, IconSettings, IconDemand,
  IconOfftakerCost, IconDisputes, IconInvoices, IconSmartRules, IconAuditTrail,
  IconSystemHealth, IconTenant, IconAdmin,
  IconVault, IconLender, IconSurveillance, IconTradeJournal,
  IconCarbonDeep, IconIPPDeep, IconOfftakerDeep, IconReportingEngine,
  IconTOU, IconCurves, IconScheduling, IconCurrency, IconValuation,
  IconESG, IconDealRoom, IconVPP, IconScenario, IconRegulatory, IconRetention, IconVintage,
} from '../components/icons';
import SearchModal from '../components/SearchModal';
import AIChatWidget from '../components/AIChatWidget';
import EntityDetailPanel from '../components/EntityDetailPanel';
import AnnouncementBanner from '../components/AnnouncementBanner';
import GuidedTour from '../components/GuidedTour';
import KYCBanner from '../components/KYCBanner';
import HelpPanel from '../components/HelpPanel';
import { useAuthStore, useNotificationStore } from '../lib/store';
import { useTheme } from '../contexts/ThemeContext';
import { getRoleConfig } from '../config/roles';
import { useModules } from '../hooks/useModules';

// ── Role-Specific Grouped Navigation ──────────────────────
interface NavItem { name: string; href: string; icon: React.ComponentType<{ size?: number }> }
interface NavGroup { label: string; items: NavItem[] }

const ROLE_NAV: Record<string, NavGroup[]> = {
  admin: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Dashboard', href: '/dashboard', icon: IconAnalytics },
      { name: 'Admin', href: '/admin', icon: IconAdmin },
    ]},
    { label: 'Operations', items: [
      { name: 'Trading', href: '/trading', icon: IconTrading },
      { name: 'Scheduling', href: '/scheduling', icon: IconScheduling },
      { name: 'Compliance', href: '/compliance', icon: IconCompliance },
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
    ]},
    { label: 'World Leader', items: [
      { name: 'Forward Curves', href: '/forward-curves', icon: IconCurves },
      { name: 'PPA Valuation', href: '/ppa-valuation', icon: IconValuation },
      { name: 'Deal Room', href: '/deal-room', icon: IconDealRoom },
      { name: 'VPP', href: '/vpp', icon: IconVPP },
      { name: 'Scenarios', href: '/scenarios', icon: IconScenario },
      { name: 'ESG Scoring', href: '/esg', icon: IconESG },
    ]},
    { label: 'Platform Evolution', items: [
      { name: 'Deal Pipeline', href: '/pipeline', icon: IconContracts },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
      { name: 'Network Map', href: '/network', icon: IconP2P },
    ]},
    { label: 'Staff', items: [
      { name: 'Staff Management', href: '/staff', icon: IconAdmin },
      { name: 'Support Dashboard', href: '/support-dashboard', icon: IconHelp },
      { name: 'Platform Config', href: '/platform-config', icon: IconSettings },
    ]},
    { label: 'Finance & Compliance', items: [
      { name: 'Payments', href: '/payments', icon: IconInvoices },
      { name: 'AML Monitoring', href: '/aml-dashboard', icon: IconSurveillance },
      { name: 'Regulatory', href: '/reporting-engine', icon: IconRegulatory },
    ]},
    { label: 'System', items: [
      { name: 'System Health', href: '/system-health', icon: IconSystemHealth },
      { name: 'Audit Trail', href: '/audit-trail', icon: IconAuditTrail },
      { name: 'Surveillance', href: '/surveillance', icon: IconSurveillance },
      { name: 'Enhanced Surveillance', href: '/surveillance-enhanced', icon: IconSurveillance },
      { name: 'Data Retention', href: '/data-retention', icon: IconRetention },
      { name: 'Modules', href: '/modules', icon: IconAdmin },
      { name: 'Changelog', href: '/changelog', icon: IconReports },
    ]},
  ],
  generator: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'IPP Projects', href: '/ipp', icon: IconIPP },
      { name: 'Deal Pipeline', href: '/pipeline', icon: IconContracts },
    ]},
    { label: 'Energy', items: [
      { name: 'Trading', href: '/trading', icon: IconTrading },
      { name: 'Scheduling', href: '/scheduling', icon: IconScheduling },
      { name: 'Metering', href: '/metering', icon: IconMetering },
      { name: 'Analytics (ODSE)', href: '/metering-analytics', icon: IconAnalytics },
      { name: 'Carbon', href: '/carbon', icon: IconCarbon },
      { name: 'VPP', href: '/vpp', icon: IconVPP },
    ]},
    { label: 'Finance', items: [
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'PPA Valuation', href: '/ppa-valuation', icon: IconValuation },
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
      { name: 'Invoices', href: '/invoices', icon: IconInvoices },
      { name: 'ESG', href: '/esg', icon: IconESG },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
    ]},
  ],
  ipp_developer: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'IPP Projects', href: '/ipp', icon: IconIPP },
    ]},
    { label: 'Development', items: [
      { name: 'Metering', href: '/metering', icon: IconMetering },
      { name: 'Analytics (ODSE)', href: '/metering-analytics', icon: IconAnalytics },
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Compliance', href: '/compliance', icon: IconCompliance },
    ]},
    { label: 'Finance', items: [
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
      { name: 'Invoices', href: '/invoices', icon: IconInvoices },
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
    ]},
  ],
  trader: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Markets', href: '/markets', icon: IconMarkets },
    ]},
    { label: 'Trading', items: [
      { name: 'Trading', href: '/trading', icon: IconTrading },
      { name: 'Forward Curves', href: '/forward-curves', icon: IconCurves },
      { name: 'Portfolio', href: '/portfolio', icon: IconPortfolio },
      { name: 'Risk', href: '/risk', icon: IconRisk },
      { name: 'Scheduling', href: '/scheduling', icon: IconScheduling },
      { name: 'Energy Analytics', href: '/metering-analytics', icon: IconAnalytics },
    ]},
    { label: 'Carbon & Finance', items: [
      { name: 'Carbon', href: '/carbon', icon: IconCarbon },
      { name: 'Deal Room', href: '/deal-room', icon: IconDealRoom },
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Scenarios', href: '/scenarios', icon: IconScenario },
    ]},
  ],
  carbon_fund: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Fund Dashboard', href: '/fund-dashboard', icon: IconPortfolio },
      { name: 'Portfolio', href: '/portfolio', icon: IconPortfolio },
    ]},
    { label: 'Carbon', items: [
      { name: 'Carbon', href: '/carbon', icon: IconCarbon },
      { name: 'Vintage Analysis', href: '/carbon-deep', icon: IconVintage },
      { name: 'Carbon Analytics', href: '/metering-analytics', icon: IconAnalytics },
      { name: 'Trading', href: '/trading', icon: IconTrading },
      { name: 'Markets', href: '/markets', icon: IconMarkets },
      { name: 'ESG', href: '/esg', icon: IconESG },
    ]},
    { label: 'Finance', items: [
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Deal Room', href: '/deal-room', icon: IconDealRoom },
      { name: 'Deal Pipeline', href: '/pipeline', icon: IconContracts },
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
    ]},
  ],
  offtaker: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Procurement Hub', href: '/procurement', icon: IconMarketplace },
      { name: 'Demand', href: '/demand', icon: IconDemand },
    ]},
    { label: 'Supply', items: [
      { name: 'Marketplace', href: '/marketplace', icon: IconMarketplace },
      { name: 'PPA Valuation', href: '/ppa-valuation', icon: IconValuation },
      { name: 'Consumption Analytics', href: '/metering-analytics', icon: IconAnalytics },
      { name: 'Carbon', href: '/carbon', icon: IconCarbon },
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Scenarios', href: '/scenarios', icon: IconScenario },
      { name: 'Deal Pipeline', href: '/pipeline', icon: IconContracts },
    ]},
    { label: 'Finance', items: [
      { name: 'Invoices', href: '/invoices', icon: IconInvoices },
      { name: 'Offtaker Cost', href: '/offtaker-cost', icon: IconOfftakerCost },
      { name: 'ESG', href: '/esg', icon: IconESG },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
    ]},
  ],
  lender: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Lender', href: '/lender', icon: IconLender },
      { name: 'Deal Pipeline', href: '/pipeline', icon: IconContracts },
    ]},
    { label: 'Portfolio', items: [
      { name: 'IPP Projects', href: '/ipp', icon: IconIPP },
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Network Map', href: '/network', icon: IconP2P },
    ]},
    { label: 'Finance', items: [
      { name: 'Settlement', href: '/settlement', icon: IconSettlement },
      { name: 'Invoices', href: '/invoices', icon: IconInvoices },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
    ]},
  ],
  regulator: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Surveillance', href: '/surveillance', icon: IconSurveillance },
    ]},
    { label: 'Compliance', items: [
      { name: 'Enhanced Surveillance', href: '/surveillance-enhanced', icon: IconSurveillance },
      { name: 'Compliance', href: '/compliance', icon: IconCompliance },
      { name: 'Audit Trail', href: '/audit-trail', icon: IconAuditTrail },
      { name: 'ESG Scoring', href: '/esg', icon: IconESG },
    ]},
    { label: 'Market', items: [
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
      { name: 'Metering', href: '/metering', icon: IconMetering },
      { name: 'Reports', href: '/reports', icon: IconReports },
    ]},
  ],
  grid: [
    { label: 'Overview', items: [
      { name: 'Cockpit', href: '/', icon: IconDashboard },
      { name: 'Grid Dashboard', href: '/grid-dashboard', icon: IconMetering },
      { name: 'Metering', href: '/metering', icon: IconMetering },
    ]},
    { label: 'Grid Operations', items: [
      { name: 'Metering Analytics', href: '/metering-analytics', icon: IconAnalytics },
      { name: 'Scheduling', href: '/scheduling', icon: IconScheduling },
      { name: 'VPP', href: '/vpp', icon: IconVPP },
      { name: 'Compliance', href: '/compliance', icon: IconCompliance },
      { name: 'Contracts', href: '/contracts', icon: IconContracts },
      { name: 'Network Map', href: '/network', icon: IconP2P },
    ]},
    { label: 'Reports', items: [
      { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
      { name: 'Calendar', href: '/calendar', icon: IconScheduling },
      { name: 'Reports', href: '/reports', icon: IconReports },
    ]},
  ],
};

// Fallback flat lists for roles without grouped nav
const ALL_MAIN_TABS = [
  { name: 'Cockpit', href: '/', icon: IconDashboard },
  { name: 'Trading', href: '/trading', icon: IconTrading },
  { name: 'Carbon', href: '/carbon', icon: IconCarbon },
  { name: 'Contracts', href: '/contracts', icon: IconContracts },
  { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
];

const roles = ['generator', 'trader', 'offtaker', 'ipp_developer', 'regulator', 'admin', 'lender', 'carbon_fund', 'grid'] as const;

// Map nav hrefs to module names for feature-flag filtering
const HREF_TO_MODULE: Record<string, string> = {
  '/trading': 'spot_trading',
  '/carbon': 'carbon_credits',
  '/p2p': 'p2p_trading',
  '/settlement': 'settlement',
  '/marketplace': 'marketplace',
  '/metering': 'metering',
  '/developer': 'developer_api',
  '/reports': 'report_builder',
  '/ai': 'ai_portfolio',
  '/recs': 'recs',
  '/tokens': 'tokenization',
};

const marketTicker = [
  { name: 'Solar', price: '847.20', change: '+8%', positive: true },
  { name: 'Wind', price: '623.50', change: '+4%', positive: true },
  { name: 'Gas', price: '412.80', change: '-3%', positive: false },
  { name: 'Carbon', price: '285.00', change: '+12%', positive: true },
];

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, switchRole, logout, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { isDark, toggleTheme } = useTheme();
  const roleBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // Item 10: Frontend auth guard — redirect to /login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const roleConfig = getRoleConfig(activeRole || 'trader');
  const allowed = new Set(roleConfig.allowedPaths);
  const { isEnabled: isModuleEnabled } = useModules();
  // Map ipp → generator nav (same project-based workflow)
  const navRole = activeRole === 'ipp' ? 'generator' : (activeRole || 'trader');
  const roleGroups = ROLE_NAV[navRole] || ROLE_NAV.trader;

  // Filter nav items by module status — hide items whose module is disabled
  const filterByModule = (items: NavItem[]) =>
    items.filter(item => {
      const mod = HREF_TO_MODULE[item.href];
      return !mod || isModuleEnabled(mod);
    });
  // Primary tabs: first group items (cockpit + primary module), filtered by module status
  const mainTabs = filterByModule(roleGroups[0]?.items || ALL_MAIN_TABS.filter(t => allowed.has(t.href)));
  // More links: ONLY items from ROLE_NAV groups (no generic ALL_MORE_LINKS leakage)
  const moreGroups = roleGroups.slice(1).map(g => ({
    ...g,
    items: filterByModule(g.items),
  })).filter(g => g.items.length > 0);
  const moreLinks = moreGroups.flatMap(g => g.items);

  const isTabActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const isMoreActive = moreLinks.some(l => location.pathname === l.href);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0B1120]' : 'bg-[#EEF1F6]'}`}>
      {/* ── Top Navigation Bar ─────────────────────── */}
      <header className={`sticky top-0 z-50 ${isDark ? 'bg-[#151F32]/95 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-white/95 backdrop-blur-xl border-b border-black/[0.06]'}`}>
        {/* Market Ticker Strip */}
        <div className={`h-9 flex items-center px-4 sm:px-8 gap-6 overflow-x-auto text-xs ${isDark ? 'bg-[#0B1120] border-b border-white/[0.04]' : 'bg-[#F8FAFC] border-b border-black/[0.04]'}`}>
          <span className={`font-semibold shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>LIVE MARKETS</span>
          {marketTicker.map((m, i) => (
            <div key={m.name} className="flex items-center gap-2 shrink-0" style={{ animation: `tickerSlide 500ms ease ${i * 80}ms both` }}>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{m.name}</span>
              <span className={`mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{m.price}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.positive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>{m.change}</span>
            </div>
          ))}
        </div>

        {/* Main Nav */}
        <div className="flex items-center justify-between h-14 px-4 sm:px-8">
          {/* Left: Logo + Tabs */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <NXTLogo size={36} animated />
              <span className="text-lg font-bold tracking-tight gradient-text hidden sm:block group-hover:opacity-80 transition-opacity">Ionvex</span>
            </Link>

            {/* Tab Pills */}
            <nav className="hidden md:flex items-center">
              <div className={`flex items-center rounded-full p-1 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                {mainTabs.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <Link key={tab.href} to={tab.href}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-250 ${
                        isTabActive(tab.href)
                          ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                          : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}>
                      <TabIcon size={15} />
                      {tab.name}
                    </Link>
                  );
                })}

                {/* More dropdown */}
                <div className="relative">
                  <button ref={moreBtnRef} onClick={() => setMoreOpen(!moreOpen)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1 ${
                      isMoreActive
                        ? isDark ? 'bg-white/[0.12] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    More <IconChevronDown size={12} />
                  </button>
                </div>
              </div>
            </nav>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div onClick={() => setSearchOpen(true)} className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${isDark ? 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.06]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
              <IconSearch size={14} />
              <span className="text-xs">Search...</span>
              <kbd className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/[0.06] text-slate-500' : 'bg-white text-slate-400'}`}>⌘K</kbd>
            </div>

            <button onClick={() => setHelpOpen(true)} className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} aria-label="Help">
              <IconHelp size={18} />
            </button>

            <button onClick={toggleTheme} className={`p-2 rounded-xl transition-all ${isDark ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-400 hover:bg-slate-100'}`} aria-label="Toggle theme">
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>

            {/* Role Switcher */}
            <div className="relative" data-tour="role-switcher">
              <button ref={roleBtnRef} onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                <span className={`w-2 h-2 rounded-full ${roleConfig.accentBg}`} />
                <span className="hidden sm:block capitalize">{roleConfig.label}</span>
              </button>
            </div>

            <Link to="/notifications" className={`p-2 rounded-xl relative transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
              <IconNotifications size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-lg shadow-blue-500/30 notification-dot">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User avatar */}
            <div className="flex items-center gap-2 ml-1">
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${roleConfig.accentBg}`}>
                  {user?.company_name?.charAt(0) || 'N'}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 ${isDark ? 'border-[#151F32]' : 'border-white'}`} />
              </div>
              <span className={`hidden lg:block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {user?.company_name || 'NXT Platform'}
              </span>
            </div>

            {isAuthenticated && (
              <button onClick={() => { logout(); navigate('/login'); }}
                className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title="Logout" aria-label="Logout">
                <IconLogout size={18} />
              </button>
            )}

            {/* Mobile menu */}
            <button className={`md:hidden p-2 rounded-xl ${isDark ? 'text-slate-400 hover:bg-white/[0.06]' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
              {mobileMenuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu ─────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className={`fixed top-[92px] left-4 right-4 z-50 rounded-2xl shadow-2xl p-4 md:hidden max-h-[70vh] overflow-y-auto ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06]'}`}>
              <div className="grid grid-cols-2 gap-2">
                {[...mainTabs, ...moreLinks].map(link => {
                  const LinkIcon = link.icon;
                  return (
                    <Link key={link.href} to={link.href} onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        location.pathname === link.href
                          ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                          : isDark ? 'text-slate-400 hover:bg-white/[0.04]' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      <LinkIcon size={16} />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────── */}
      <AnnouncementBanner />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6" data-tour="dashboard">
        <KYCBanner />
        <Outlet />
      </main>

      {/* ── Widgets ─────────────────────────────────── */}
      <AIChatWidget />
      <GuidedTour />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* ── More dropdown portal ────────────────────── */}
      {moreOpen && createPortal(
        <div className="fixed inset-0 z-[9998]" onClick={() => setMoreOpen(false)}>
          <div
            className={`absolute w-64 rounded-2xl shadow-2xl py-2 max-h-[60vh] overflow-y-auto ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06] shadow-slate-200/50'}`}
            style={{
              top: moreBtnRef.current ? moreBtnRef.current.getBoundingClientRect().bottom + 8 : 0,
              left: moreBtnRef.current ? moreBtnRef.current.getBoundingClientRect().left : 0,
            }}
            onClick={e => e.stopPropagation()}>
            {moreGroups.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className={`mx-3 my-1.5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`} />}
                <div className={`px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{group.label}</div>
                {group.items.map(link => {
                  const LinkIcon = link.icon;
                  return (
                    <Link key={link.href} to={link.href} onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                        location.pathname === link.href
                          ? isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'
                          : isDark ? 'text-slate-300 hover:bg-white/[0.04]' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      <LinkIcon size={16} />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── Role Switcher portal ────────────────────── */}
      {showRoleSwitcher && createPortal(
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowRoleSwitcher(false)}>
          <div
            className={`absolute w-52 rounded-2xl shadow-2xl py-2 ${isDark ? 'bg-[#151F32] border border-white/[0.08]' : 'bg-white border border-black/[0.06] shadow-slate-200/50'}`}
            style={{
              top: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().bottom + 8 : 0,
              left: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().right - 208 : 0,
            }}
            onClick={e => e.stopPropagation()}>
            {roles.map(r => {
              const rc = getRoleConfig(r);
              return (
                <button key={r} onClick={() => { switchRole(r); setShowRoleSwitcher(false); }}
                  className={`flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeRole === r
                      ? isDark ? 'bg-white/[0.08] text-white' : 'bg-slate-50 text-slate-900'
                      : isDark ? 'text-slate-400 hover:bg-white/[0.04]' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${rc.accentBg}`} />
                  {rc.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* ── Entity Detail Panel (Spec 11) ────────────── */}
      <EntityDetailPanel />

      {/* ── Platform-Wide Search (Spec 12) ────────────── */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
