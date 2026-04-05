import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiPieChart, FiFileText, FiGlobe, FiZap, FiBarChart2, FiSettings, FiMenu, FiX, FiShoppingBag, FiDollarSign, FiShield, FiBell, FiUsers, FiLogOut, FiRefreshCw, FiAlertTriangle, FiCpu, FiRepeat, FiBook, FiCode } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import AIChatWidget from '../components/AIChatWidget';
import { useAuthStore } from '../lib/store';

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
  const roleBtnRef = useRef<HTMLButtonElement>(null);

  const getCurrentPageTitle = () => {
    const currentPage = navigation.find(item => item.href === location.pathname);
    return currentPage ? currentPage.name : 'Page Not Found';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r               from-[#d4e157] to-[#b8c43a] flex items-center justify-center">
                              <FiZap className="text-slate-900" />
              </div>
              <span className="text-xl font-bold gradient-text">NXT Energy</span>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#d4e157]/10 text-[#d4e157] border border-[#d4e157]/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* AI Insights Preview */}
          <div className="px-4 py-4 border-t border-slate-700">
            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">AI Insights</div>
            {isLoading ? (
              <div className="text-xs text-slate-400">Analyzing markets...</div>
            ) : (
              <div className="text-xs text-[#d4e157] line-clamp-3">
                {aiInsights?.recommendations?.[0] || 'No new insights at this time.'}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="glass border-b border-slate-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                className="p-2 mr-4 text-slate-400 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold gradient-text">{getCurrentPageTitle()}</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Role Switcher */}
              <div className="relative">
                <button ref={roleBtnRef} onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm transition-colors">
                  <FiRefreshCw className="w-3.5 h-3.5 text-[#d4e157]" />
                  <span className="capitalize hidden sm:block">{activeRole || 'Select Role'}</span>
                </button>
              </div>

              {/* Notifications */}
              <Link to="/notifications" className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors relative">
                <FiBell className="w-5 h-5" />
              </Link>

              {/* User / AI Status */}
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-green-500 pulse absolute -top-1 -right-1"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r                   from-[#d4e157] to-[#b8c43a] flex items-center justify-center">
                                      <span className="text-xs font-bold text-slate-900">{user?.company_name?.charAt(0) || 'AI'}</span>
                  </div>
                  <span className="hidden sm:block text-sm">{user?.company_name || 'AI Assistant Active'}</span>
                </div>
              </div>

              {/* Logout */}
              {isAuthenticated && (
                <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-red-400 transition-colors" title="Logout">
                  <FiLogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />

      {/* Role Switcher Dropdown Portal - rendered outside header to avoid backdrop-filter clipping */}
      {showRoleSwitcher && createPortal(
        <div className="fixed inset-0 z-[9998]" onClick={() => setShowRoleSwitcher(false)}>
          <div
            className="absolute w-48 rounded-lg shadow-xl z-[9999] py-1 bg-slate-800 border border-slate-700"
            style={{
              top: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().bottom + 8 : 0,
              left: roleBtnRef.current ? roleBtnRef.current.getBoundingClientRect().right - 192 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {roles.map((r) => (
              <button key={r} onClick={() => { switchRole(r); setShowRoleSwitcher(false); }}
                className={`block w-full text-left px-4 py-2 text-sm capitalize hover:bg-slate-700/50 ${activeRole === r ? 'text-[#d4e157]' : 'text-slate-300'}`}>
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
