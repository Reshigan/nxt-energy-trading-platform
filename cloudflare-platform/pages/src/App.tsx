import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import ProtectedRoute from './components/ProtectedRoute';

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
const ModuleAdmin = lazy(() => import('./pages/ModuleAdmin'));
const Changelog = lazy(() => import('./pages/Changelog'));
const MeteringAnalytics = lazy(() => import('./pages/MeteringAnalytics'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const SupportDashboard = lazy(() => import('./pages/SupportDashboard'));
const PlatformConfig = lazy(() => import('./pages/PlatformConfig'));
const AMLDashboard = lazy(() => import('./pages/AMLDashboard'));
const PaymentsDashboard = lazy(() => import('./pages/PaymentsDashboard'));
// Spec 12: World-Leader Enhancements
const ForwardCurves = lazy(() => import('./pages/ForwardCurves'));
const PPAValuation = lazy(() => import('./pages/PPAValuation'));
const DealRoom = lazy(() => import('./pages/DealRoom'));
const DataRetention = lazy(() => import('./pages/DataRetention'));
const ESGDashboard = lazy(() => import('./pages/ESGDashboard'));
const VPPDashboard = lazy(() => import('./pages/VPPDashboard'));
const ScenarioComparison = lazy(() => import('./pages/ScenarioComparison'));
const SurveillanceDashboard = lazy(() => import('./pages/SurveillanceDashboard'));
const SchedulingPage = lazy(() => import('./pages/Scheduling'));
// Spec 13+14: Platform Evolution + Role-Complete
const PipelinePage = lazy(() => import('./pages/Pipeline'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const NetworkMapPage = lazy(() => import('./pages/NetworkMap'));
const GridDashboard = lazy(() => import('./pages/GridDashboard'));
const FundDashboard = lazy(() => import('./pages/FundDashboard'));
const ProcurementHub = lazy(() => import('./pages/ProcurementHub'));

function App() {
  return (
    <>
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

      {/* Dashboard routes — wrapped with ProtectedRoute for RBAC */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Cockpit />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/cockpit" element={<Cockpit />} />
        <Route path="/markets" element={<ProtectedRoute><Markets /></ProtectedRoute>} />
        <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
        <Route path="/carbon" element={<ProtectedRoute><Carbon /></ProtectedRoute>} />
        <Route path="/ipp" element={<ProtectedRoute><IPP /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/settlement" element={<ProtectedRoute><Settlement /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/risk" element={<ProtectedRoute><RiskDashboard /></ProtectedRoute>} />
        <Route path="/metering" element={<ProtectedRoute><Metering /></ProtectedRoute>} />
        <Route path="/p2p" element={<ProtectedRoute><P2PTrading /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>} />
        <Route path="/developer" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/demand" element={<ProtectedRoute><DemandProfile /></ProtectedRoute>} />
        <Route path="/offtaker-cost" element={<ProtectedRoute><OfftakerCost /></ProtectedRoute>} />
        <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
        <Route path="/tenant-admin" element={<ProtectedRoute><TenantAdmin /></ProtectedRoute>} />
        <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
        <Route path="/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/smart-rules" element={<ProtectedRoute><SmartRules /></ProtectedRoute>} />
        <Route path="/contracts/:id" element={<ProtectedRoute><ContractDeep /></ProtectedRoute>} />
        <Route path="/vault" element={<ProtectedRoute><DocumentVault /></ProtectedRoute>} />
        <Route path="/lender" element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
        <Route path="/surveillance" element={<ProtectedRoute><SurveillancePage /></ProtectedRoute>} />
        <Route path="/trade-journal" element={<ProtectedRoute><TradeJournal /></ProtectedRoute>} />
        <Route path="/carbon-deep" element={<ProtectedRoute><CarbonDeep /></ProtectedRoute>} />
        <Route path="/ipp-deep" element={<ProtectedRoute><IPPDeep /></ProtectedRoute>} />
        <Route path="/offtaker-deep" element={<ProtectedRoute><OfftakerDeep /></ProtectedRoute>} />
        <Route path="/reporting-engine" element={<ProtectedRoute><ReportingEngine /></ProtectedRoute>} />
        <Route path="/modules" element={<ProtectedRoute><ModuleAdmin /></ProtectedRoute>} />
        <Route path="/metering-analytics" element={<ProtectedRoute><MeteringAnalytics /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
        <Route path="/support" element={<SupportTickets />} />
        <Route path="/support-dashboard" element={<ProtectedRoute><SupportDashboard /></ProtectedRoute>} />
        <Route path="/platform-config" element={<ProtectedRoute><PlatformConfig /></ProtectedRoute>} />
        <Route path="/aml-dashboard" element={<ProtectedRoute><AMLDashboard /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PaymentsDashboard /></ProtectedRoute>} />
        {/* Spec 12: World-Leader routes */}
        <Route path="/forward-curves" element={<ProtectedRoute><ForwardCurves /></ProtectedRoute>} />
        <Route path="/ppa-valuation" element={<ProtectedRoute><PPAValuation /></ProtectedRoute>} />
        <Route path="/deal-room" element={<ProtectedRoute><DealRoom /></ProtectedRoute>} />
        <Route path="/data-retention" element={<ProtectedRoute><DataRetention /></ProtectedRoute>} />
        <Route path="/esg" element={<ProtectedRoute><ESGDashboard /></ProtectedRoute>} />
        <Route path="/vpp" element={<ProtectedRoute><VPPDashboard /></ProtectedRoute>} />
        <Route path="/scenarios" element={<ProtectedRoute><ScenarioComparison /></ProtectedRoute>} />
        <Route path="/surveillance-enhanced" element={<ProtectedRoute><SurveillanceDashboard /></ProtectedRoute>} />
        <Route path="/scheduling" element={<ProtectedRoute><SchedulingPage /></ProtectedRoute>} />
        {/* Spec 13+14: Platform Evolution + Role-Complete routes */}
        <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/network" element={<ProtectedRoute><NetworkMapPage /></ProtectedRoute>} />
        <Route path="/grid-dashboard" element={<ProtectedRoute><GridDashboard /></ProtectedRoute>} />
        <Route path="/fund-dashboard" element={<ProtectedRoute><FundDashboard /></ProtectedRoute>} />
        <Route path="/procurement" element={<ProtectedRoute><ProcurementHub /></ProtectedRoute>} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
    </ErrorBoundary>
    <CookieConsent />
    </>
  );
}

export default App;
