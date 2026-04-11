import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Loading skeleton for lazy-loaded pages
function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-700/50 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-700/30 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 bg-slate-700/20 rounded-xl" />
        <div className="h-64 bg-slate-700/20 rounded-xl" />
      </div>
    </div>
  );
}

// Lazy-loaded pages (code splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cockpit = lazy(() => import('./pages/Cockpit'));
const Markets = lazy(() => import('./pages/Markets'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Carbon = lazy(() => import('./pages/Carbon'));
const IPP = lazy(() => import('./pages/IPP'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Trading = lazy(() => import('./pages/Trading'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Settlement = lazy(() => import('./pages/Settlement'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));
const RiskDashboard = lazy(() => import('./pages/RiskDashboard'));
const Metering = lazy(() => import('./pages/Metering'));
const P2PTrading = lazy(() => import('./pages/P2PTrading'));
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'));
const DeveloperPortal = lazy(() => import('./pages/DeveloperPortal'));
const DemandProfile = lazy(() => import('./pages/DemandProfile'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OfftakerCost = lazy(() => import('./pages/OfftakerCost'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Disputes = lazy(() => import('./pages/Disputes'));
const TenantAdmin = lazy(() => import('./pages/TenantAdmin'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const Invoices = lazy(() => import('./pages/Invoices'));
const SmartRules = lazy(() => import('./pages/SmartRules'));
const ContractDeep = lazy(() => import('./pages/ContractDeep'));
const Landing = lazy(() => import('./pages/Landing'));
const TermsPage = lazy(() => import('./pages/Terms'));
const PrivacyPage = lazy(() => import('./pages/Privacy'));
const CookiesPage = lazy(() => import('./pages/Cookies'));
const RulesPage = lazy(() => import('./pages/Rules'));
const RiskDisclosurePage = lazy(() => import('./pages/Risk'));
const AMLPage = lazy(() => import('./pages/AML'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));
const LenderDashboard = lazy(() => import('./pages/LenderDashboard'));
const SurveillancePage = lazy(() => import('./pages/Surveillance'));
const TradeJournal = lazy(() => import('./pages/TradeJournal'));
const CarbonDeep = lazy(() => import('./pages/CarbonDeep'));
const IPPDeep = lazy(() => import('./pages/IPPDeep'));
const OfftakerDeep = lazy(() => import('./pages/OfftakerDeep'));
const ReportingEngine = lazy(() => import('./pages/ReportingEngine'));

function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<LoadingSkeleton />}>
    <Routes>
      {/* Public routes (no layout) */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/onboarding" element={<Onboarding />} />
      {/* Legal pages (public) */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />
      <Route path="/aml" element={<AMLPage />} />

      {/* Dashboard routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Cockpit />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cockpit" element={<Cockpit />} />
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
        <Route path="/demand" element={<DemandProfile />} />
        <Route path="/offtaker-cost" element={<OfftakerCost />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/tenant-admin" element={<TenantAdmin />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/system-health" element={<SystemHealth />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/smart-rules" element={<SmartRules />} />
        <Route path="/contracts/:id" element={<ContractDeep />} />
        <Route path="/vault" element={<DocumentVault />} />
        <Route path="/lender" element={<LenderDashboard />} />
        <Route path="/surveillance" element={<SurveillancePage />} />
        <Route path="/trade-journal" element={<TradeJournal />} />
        <Route path="/carbon-deep" element={<CarbonDeep />} />
        <Route path="/ipp-deep" element={<IPPDeep />} />
        <Route path="/offtaker-deep" element={<OfftakerDeep />} />
        <Route path="/reporting-engine" element={<ReportingEngine />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}

export default App;
