import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiPieChart, FiFileText, FiGlobe, FiZap, FiBarChart2, FiSettings, FiMenu, FiX, FiShoppingBag, FiDollarSign, FiShield, FiBell, FiUsers, FiLogOut, FiRefreshCw, FiAlertTriangle, FiCpu, FiRepeat, FiBook, FiCode, FiSun, FiMoon } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import AIChatWidget from '../components/AIChatWidget';
import { useAuthStore } from '../lib/store';
import { useTheme } from '../contexts/ThemeContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: FiHome },
  { name: 'Markets', href: '/markets', icon: FiTrendingUp },
  { name: 'Trading', href: '/trading', icon: FiDollarSign },
  { name: 'AI Portfolio', href: '/portfolio', icon: FiPieChart },
  { name: 'Risk Dashboard', href: '/risk', icon: FiAlertTriangle },
  { name: 'Contracts', href: '/contracts', icon: FiFileText },
  { name: 'Carbon', href: '/carbon', icon: FiGlobe },
  { name: 'Metering & IoT', href: '/metering', icon: FiCpu },
  { name: 'P2P Trading', href: '/p2p', icon: FiRepeat },
  { name: 'IPP Projects', href: '/ipp', icon: FiZap },
  { name: 'Marketplace', href: '/marketplace', icon: FiShoppingBag },
  { name: 'Settlement', href: '/settlement', icon: FiDollarSign },
  { name: 'Compliance', href: '/compliance', icon: FiShield },
  { name: 'Report Builder', href: '/reports', icon: FiBook },
  { name: 'Analytics', href: '/analytics', icon: FiBarChart2 },
  { name: 'Developer Portal', href: '/developer', icon: FiCode },
  { name: 'Notifications', href: '/notifications', icon: FiBell },
  { name: 'Admin', href: '/admin', icon: FiUsers },
  { name: 'Settings', href: '/settings', icon: FiSettings },
];

const roles = ['generator', 'trader', 'offtaker', 'ipp_developer', 'regulator', 'admin', 'observer'] as const;

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { aiInsights, isLoading } = useAIAdvisor();
  const { user, activeRole, switchRole, logout, isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const roleBtnRef = useRef<HTMLButtonElement>(null);

  const getCurrentPageTitle = () => {
    const currentPage = navigation.find(item => item.href === location.pathname);
    return currentPage ? currentPage.name : 'Page Not Found';
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-[#0a1628]' : 'bg-slate-50'}`}>
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:!translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${
          isDark
            ? 'bg-[#0d1b2a]/95 backdrop-blur-xl border-r border-white/[0.06]'
            : 'bg-white border-r border-slate-200'
        }`}
      >
        <div className={`flex items-center justify-between px-5 h-16 shrink-0 ${isDark ? 'border-b border-white/[0.06]' : 'border-b border-slate-100'}`}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FiZap className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight gradient-text">NXT Energy</span>
          </Link>
          <button className={`lg:hidden p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`} onClick={() => setSidebarOpen(false)}>
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? 'bg-blue-500/15 text-blue-400 shadow-sm shadow-blue-500/10'
                      : 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/5'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? '' : 'opacity-70'}`} />
                <span className="truncate">{item.name}</span>
                {isActive && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />}
              </Link>
            );
          })}
        </nav>

        <div className={`px-4 py-3 mx-3 mb-3 rounded-xl ${isDark ? 'bg-blue-500/[0.08] border border-blue-500/10' : 'bg-blue-50 border border-blue-100'}`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-blue-400/70' : 'text-blue-500/70'}`}>AI Insights</div>
          {isLoading ? (
            <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Analyzing markets...</div>
          ) : (
            <div className={`text-xs leading-relaxed line-clamp-2 ${isDark ? 'text-blue-300/80' : 'text-blue-600/80'}`}>
              {aiInsights?.recommendations?.[0] || 'No new insights at this time.'}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 ${
          isDark ? 'bg-[#0d1b2a]/80 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-white/80 backdrop-blur-xl border-b border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <button className={`p-2 rounded-lg lg:hidden ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setSidebarOpen(true)}>
              <FiMenu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold gradient-text">{getCurrentPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className={`p-2 rounded-xl transition-all duration-200 ${isDark ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-500 hover:bg-slate-100'}`} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {isDark ? <FiSun className="w-[18px] h-[18px]" /> : <FiMoon className="w-[18px] h-[18px]" />}
            </button>

            <div className="relative">
              <button ref={roleBtnRef} onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                <FiRefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span className="capitalize hidden sm:block">{activeRole || 'Select Role'}</span>
              </button>
            </div>

            <Link to="/notifications" className={`p-2 rounded-xl transition-all duration-200 relative ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              <FiBell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            </Link>

            <div className="flex items-center gap-2 ml-1">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-xs font-bold text-white">{user?.company_name?.charAt(0) || 'AI'}</span>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 ${isDark ? 'border-[#0d1b2a]' : 'border-white'}`} />
              </div>
              <span className={`hidden sm:block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {user?.company_name || 'AI Assistant'}
              </span>
            </div>

            {isAuthenticated && (
              <button onClick={() => { logout(); navigate('/login'); }}
                className={`p-2 rounded-xl transition-all duration-200 ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title="Logout">
                <FiLogOut className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AIChatWidget />

      {showRoleSwitcher && createPortal(
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowRoleSwitcher(false)}>
          <div
            className={`absolute w-52 rounded-xl shadow-xl z-[9999] py-1.5 ${isDark ? 'bg-[#0d1b2a] border border-white/[0.08] shadow-black/40' : 'bg-white border border-slate-200 shadow-slate-200/50'}`}
            style={{
              top: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().bottom + 8 : 0,
              left: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().right - 208 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {roles.map((r) => (
              <button key={r} onClick={() => { switchRole(r); setShowRoleSwitcher(false); }}
                className={`block w-full text-left px-4 py-2 text-sm capitalize transition-colors ${
                  activeRole === r ? 'text-blue-400 bg-blue-500/10' : isDark ? 'text-slate-300 hover:bg-white/[0.04]' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
