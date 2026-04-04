import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiHome, FiTrendingUp, FiPieChart, FiFileText, FiGlobe, FiZap, FiBarChart2, FiSettings, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAdvisor } from '../hooks/useAIAdvisor';
import AIChatWidget from '../components/AIChatWidget';

const navigation = [
  { name: 'Dashboard', href: '/', icon: FiHome },
  { name: 'Markets', href: '/markets', icon: FiTrendingUp },
  { name: 'Portfolio', href: '/portfolio', icon: FiPieChart },
  { name: 'Contracts', href: '/contracts', icon: FiFileText },
  { name: 'Carbon', href: '/carbon', icon: FiGlobe },
  { name: 'IPP Projects', href: '/ipp', icon: FiZap },
  { name: 'Analytics', href: '/analytics', icon: FiBarChart2 },
  { name: 'Settings', href: '/settings', icon: FiSettings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { aiInsights, isLoading } = useAIAdvisor();

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
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 20 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 glass lg:relative lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <FiZap className="text-white" />
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
                      ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-400 border border-cyan-500/30'
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
              <div className="text-xs text-cyan-400 line-clamp-3">
                {aiInsights?.recommendations?.[0] || 'No new insights at this time.'}
              </div>
            )}
          </div>
        </div>
      </motion.aside>

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
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-green-500 pulse absolute -top-1 -right-1"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">AI</span>
                  </div>
                  <span className="hidden sm:block text-sm">AI Assistant Active</span>
                </div>
              </div>
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
    </div>
  );
}
