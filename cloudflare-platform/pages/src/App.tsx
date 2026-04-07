import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Portfolio from './pages/Portfolio';
import Contracts from './pages/Contracts';
import Carbon from './pages/Carbon';
import IPP from './pages/IPP';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Trading from './pages/Trading';
import Compliance from './pages/Compliance';
import Settlement from './pages/Settlement';
import Marketplace from './pages/Marketplace';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import RiskDashboard from './pages/RiskDashboard';
import Metering from './pages/Metering';
import P2PTrading from './pages/P2PTrading';
import ReportBuilder from './pages/ReportBuilder';
import DeveloperPortal from './pages/DeveloperPortal';
// Spec 8: Production readiness pages
import Landing from './pages/Landing';
import Signup from './pages/Signup';
import TermsPage from './pages/Terms';
import PrivacyPage from './pages/Privacy';
import CookiesPage from './pages/Cookies';
import RulesPage from './pages/Rules';
import RiskDisclosurePage from './pages/Risk';
import AMLPage from './pages/AML';

function App() {
  return (
    <ErrorBoundary>
    <Routes>
      {/* Public routes (no layout) */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Legal pages (public) */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
      <Route path="/aml" element={<AMLPage />} />

      {/* Dashboard routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/carbon" element={<Carbon />} />
        <Route path="/ipp" element={<IPP />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/risk" element={<RiskDashboard />} />
        <Route path="/metering" element={<Metering />} />
        <Route path="/p2p" element={<P2PTrading />} />
        <Route path="/reports" element={<ReportBuilder />} />
        <Route path="/developer" element={<DeveloperPortal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
