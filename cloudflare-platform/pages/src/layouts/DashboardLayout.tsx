import React, { useState, useRef } from 'react';
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
} from '../components/icons';
import AIChatWidget from '../components/AIChatWidget';
import GuidedTour from '../components/GuidedTour';
import KYCBanner from '../components/KYCBanner';
import HelpPanel from '../components/HelpPanel';
import { useAuthStore, useNotificationStore } from '../lib/store';
import { useTheme } from '../contexts/ThemeContext';
import { getRoleConfig } from '../config/roles';

const ALL_MAIN_TABS = [
  { name: 'Dashboard', href: '/', icon: IconDashboard },
  { name: 'Trading', href: '/trading', icon: IconTrading },
  { name: 'Carbon', href: '/carbon', icon: IconCarbon },
  { name: 'Contracts', href: '/contracts', icon: IconContracts },
  { name: 'Analytics', href: '/analytics', icon: IconAnalytics },
];

const ALL_MORE_LINKS = [
  { name: 'Markets', href: '/markets', icon: IconMarkets },
  { name: 'AI Portfolio', href: '/portfolio', icon: IconPortfolio },
  { name: 'Risk Dashboard', href: '/risk', icon: IconRisk },
  { name: 'Metering & IoT', href: '/metering', icon: IconMetering },
  { name: 'P2P Trading', href: '/p2p', icon: IconP2P },
  { name: 'IPP Projects', href: '/ipp', icon: IconIPP },
  { name: 'Marketplace', href: '/marketplace', icon: IconMarketplace },
  { name: 'Settlement', href: '/settlement', icon: IconSettlement },
  { name: 'Compliance', href: '/compliance', icon: IconCompliance },
  { name: 'Report Builder', href: '/reports', icon: IconReports },
  { name: 'Developer Portal', href: '/developer', icon: IconDeveloper },
  { name: 'Demand Profile', href: '/demand', icon: IconDemand },
  { name: 'Offtaker Cost', href: '/offtaker-cost', icon: IconOfftakerCost },
  { name: 'Disputes', href: '/disputes', icon: IconDisputes },
  { name: 'Invoices', href: '/invoices', icon: IconInvoices },
  { name: 'Smart Rules', href: '/smart-rules', icon: IconSmartRules },
  { name: 'Audit Trail', href: '/audit-trail', icon: IconAuditTrail },
  { name: 'System Health', href: '/system-health', icon: IconSystemHealth },
  { name: 'Tenant Admin', href: '/tenant-admin', icon: IconTenant },
  { name: 'Notifications', href: '/notifications', icon: IconNotifications },
  { name: 'Admin', href: '/admin', icon: IconAdmin },
  { name: 'Settings', href: '/settings', icon: IconSettings },
  { name: 'Document Vault', href: '/vault', icon: IconVault },
  { name: 'Lender Dashboard', href: '/lender', icon: IconLender },
  { name: 'Surveillance', href: '/surveillance', icon: IconSurveillance },
  { name: 'Trade Journal', href: '/trade-journal', icon: IconTradeJournal },
  { name: 'Carbon Deep', href: '/carbon-deep', icon: IconCarbonDeep },
  { name: 'IPP Deep', href: '/ipp-deep', icon: IconIPPDeep },
  { name: 'Offtaker Deep', href: '/offtaker-deep', icon: IconOfftakerDeep },
  { name: 'Reporting Engine', href: '/reporting-engine', icon: IconReportingEngine },
];

const roles = ['generator', 'trader', 'offtaker', 'ipp_developer', 'regulator', 'admin'] as const;

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, switchRole, logout, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { isDark, toggleTheme } = useTheme();
  const roleBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const roleConfig = getRoleConfig(activeRole || 'trader');
  const allowed = new Set(roleConfig.allowedPaths);
  const mainTabs = ALL_MAIN_TABS.filter(t => allowed.has(t.href));
  const moreLinks = ALL_MORE_LINKS.filter(l => allowed.has(l.href));

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
              <span className="text-lg font-bold tracking-tight gradient-text hidden sm:block group-hover:opacity-80 transition-opacity">NXT Energy</span>
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
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all ${isDark ? 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.06]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
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
            {moreLinks.map(link => {
              const LinkIcon = link.icon;
              return (
                <Link key={link.href} to={link.href} onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
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
    </div>
  );
}
