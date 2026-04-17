import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nxt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses — only redirect if user had an active session (token existed before this request)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      const hadToken = !!localStorage.getItem('nxt_token');
      localStorage.removeItem('nxt_token');
      localStorage.removeItem('nxt_user');
      // Only redirect if user previously had a session (expired token), not for unauthenticated API calls
      if (hadToken && error.config?.headers?.Authorization) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: Record<string, unknown>) => api.post('/register', data),
  login: (data: { email: string; password: string }) => api.post('/register/auth/login', data),
  login2FA: (data: { email: string; token: string; otp: string }) => api.post('/register/auth/login/2fa', data),
  me: () => api.get('/register/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: Record<string, unknown>) => api.patch('/register/me', data),
  changePassword: (data: { current_password: string; new_password: string }) => api.post('/register/me/password', data),
  updatePreferences: (data: Record<string, unknown>) => api.post('/register/me/preferences', data),
  getOnboardingStatus: () => api.get('/register/me/onboarding-status'),
  completeOnboarding: () => api.post('/register/me/complete-onboarding'),
  uploadDocument: (participantId: string, data: FormData) => api.post(`/register/${participantId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  forgotPassword: (email: string) => api.post('/register/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; otp: string; new_password: string }) => api.post('/register/auth/reset-password', data),
  sendVerification: (email: string) => api.post('/register/auth/send-verification', { email }),
  verifyEmail: (data: { email: string; otp: string }) => api.post('/register/auth/verify-email', data),
  enable2FA: () => api.post('/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  disable2FA: (password: string) => api.post('/auth/2fa/disable', { password }),
};

// Dashboard
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
};

// Notifications
export const notificationsAPI = {
  list: (params?: Record<string, string>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Trading
export const tradingAPI = {
  placeOrder: (data: Record<string, unknown>) => api.post('/trading/orders', data),
  cancelOrder: (id: string) => api.delete(`/trading/orders/${id}`),
  getOrders: (params?: Record<string, string>) => api.get('/trading/orders', { params }),
  getHistory: (params?: Record<string, string>) => api.get('/trading/orders/history', { params }),
  getPositions: () => api.get('/trading/positions'),
  getOrderbook: (market: string) => api.get(`/trading/orderbook/${market}`),
  getIndices: () => api.get('/trading/markets/indices'),
  getPrices: (market: string, interval?: string) => api.get(`/trading/markets/prices/${market}`, { params: { interval } }),
};

// Contracts
export const contractsAPI = {
  list: (params?: Record<string, string>) => api.get('/contracts/documents', { params }),
  get: (id: string) => api.get(`/contracts/documents/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts/documents', data),
  advancePhase: (id: string, data: { target_phase: string; notes?: string }) => api.patch(`/contracts/documents/${id}/phase`, data),
  sign: (id: string, data: Record<string, unknown>) => api.post(`/contracts/documents/${id}/sign`, data),
  getSignatures: (id: string) => api.get(`/contracts/documents/${id}/signatures`),
  amend: (id: string, data: { reason: string; major?: boolean }) => api.post(`/contracts/documents/${id}/amend`, data),
  getVersions: (id: string) => api.get(`/contracts/documents/${id}/versions`),
  getPdf: (id: string) => api.get(`/contracts/documents/${id}/pdf`, { responseType: 'blob' }),
  getAuditTrail: (id: string) => api.get(`/contracts/documents/${id}/audit-trail`),
  verify: (id: string) => api.get(`/contracts/documents/${id}/verify`),
  getCertificate: (docId: string, participantId: string) => api.get(`/contracts/documents/${docId}/certificate/${participantId}`),
  getTemplates: () => api.get('/contracts/templates'),
  getTemplate: (type: string) => api.get(`/contracts/templates/${type}`),
  coolingOff: (id: string) => api.post(`/contracts/documents/${id}/cooling-off`),
  request2FA: (id: string) => api.post(`/contracts/documents/${id}/request-2fa`),
  verify2FA: (id: string, otp: string) => api.post(`/contracts/documents/${id}/verify-2fa`, { otp }),
  uploadAttachment: (id: string, data: FormData) => api.post(`/contracts/documents/${id}/attachments`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAttachments: (id: string) => api.get(`/contracts/documents/${id}/attachments`),
};

// POPIA Compliance
export const popiaAPI = {
  getConsent: () => api.get('/popia/consent'),
  giveConsent: (consent: boolean, version?: string) => api.post('/popia/consent', { consent, version }),
  exportData: () => api.get('/popia/export'),
  requestErasure: (confirm: boolean, reason?: string) => api.delete('/popia/erasure', { data: { confirm, reason } }),
};

// Carbon
export const carbonAPI = {
  getCredits: (params?: Record<string, string>) => api.get('/carbon/credits', { params }),
  retireCredit: (id: string, data: Record<string, unknown>) => api.post(`/carbon/credits/${id}/retire`, data),
  transferCredit: (id: string, data: Record<string, unknown>) => api.post(`/carbon/credits/${id}/transfer`, data),
  listOnMarketplace: (id: string, data: Record<string, unknown>) => api.post(`/carbon/credits/${id}/list`, data),
  getOptions: (params?: Record<string, string>) => api.get('/carbon/options', { params }),
  createOption: (data: Record<string, unknown>) => api.post('/carbon/options', data),
  exerciseOption: (id: string) => api.post(`/carbon/options/${id}/exercise`),
  getFundNAV: () => api.get('/carbon/fund/nav'),
  syncRegistry: (registry: string) => api.post(`/carbon/registry/sync/${registry}`),
};

// Projects (IPP)
export const projectsAPI = {
  list: (params?: Record<string, string>) => api.get('/projects', { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/projects', data),
  updateMilestone: (projectId: string, milestoneId: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${projectId}/milestones/${milestoneId}`, data),
  updateCondition: (projectId: string, conditionId: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${projectId}/conditions/${conditionId}`, data),
  getDisbursements: (projectId: string) => api.get(`/projects/${projectId}/disbursements`),
  requestDisbursement: (projectId: string, data: Record<string, unknown>) => api.post(`/projects/${projectId}/disbursements`, data),
};

// Settlement
export const settlementAPI = {
  getSettlements: (params?: Record<string, string>) => api.get('/settlement/settlements', { params }),
  confirmSettlement: (tradeId: string) => api.post(`/settlement/settlements/${tradeId}/confirm`),
  getEscrows: (params?: Record<string, string>) => api.get('/settlement/escrows', { params }),
  createEscrow: (data: Record<string, unknown>) => api.post('/settlement/escrows', data),
  getInvoices: (params?: Record<string, string>) => api.get('/settlement/invoices', { params }),
  generateInvoice: (data: Record<string, unknown>) => api.post('/settlement/invoices/generate', data),
  payInvoice: (id: string) => api.post(`/settlement/invoices/${id}/pay`),
  getDisputes: (params?: Record<string, string>) => api.get('/settlement/disputes', { params }),
  fileDispute: (data: Record<string, unknown>) => api.post('/settlement/disputes', data),
  updateDisputeStatus: (id: string, data: Record<string, unknown>) => api.patch(`/settlement/disputes/${id}/status`, data),
  getNetting: (params: { counterparty_id?: string; from?: string; to?: string }) => api.get('/settlement/netting', { params }),
  generateNetInvoice: (data: Record<string, unknown>) => api.post('/settlement/netting', data),
};

// Compliance
export const complianceAPI = {
  getKYC: (params?: Record<string, string>) => api.get('/compliance/kyc', { params }),
  verifyKYC: (id: string) => api.post(`/compliance/kyc/${id}/verify`),
  rejectKYC: (id: string, data: { reason: string }) => api.post(`/compliance/kyc/${id}/reject`, data),
  getLicences: (params?: Record<string, string>) => api.get('/compliance/licences', { params }),
  getStatutory: (params?: Record<string, string>) => api.get('/compliance/statutory', { params }),
  overrideStatutory: (id: string, data: { reason: string }) => api.post(`/compliance/statutory/${id}/override`, data),
  reviewStatutory: (id: string, data: { decision: string; notes?: string }) => api.post(`/compliance/statutory/${id}/review`, data),
  getAudit: (params?: Record<string, string>) => api.get('/compliance/audit', { params }),
  getReports: () => api.get('/compliance/reports'),
};

// Marketplace
export const marketplaceAPI = {
  list: (params?: Record<string, string>) => api.get('/marketplace/listings', { params }),
  get: (id: string) => api.get(`/marketplace/listings/${id}`),
  create: (data: Record<string, unknown>) => api.post('/marketplace/listings', data),
  bid: (id: string, data: Record<string, unknown>) => api.post(`/marketplace/listings/${id}/bid`, data),
};

// Participants
export const participantsAPI = {
  list: (params?: Record<string, string>) => api.get('/participants', { params }),
  get: (id: string) => api.get(`/participants/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/participants/${id}`, data),
  approve: (id: string) => api.post(`/participants/${id}/approve`),
  reject: (id: string, data?: { reason?: string }) => api.post(`/participants/${id}/reject`, data),
  suspend: (id: string, data: { reason: string }) => api.post(`/participants/${id}/suspend`, data),
};

// AI Portfolio Optimisation
export const aiAPI = {
  optimise: (data: Record<string, unknown>) => api.post('/ai/optimise', data),
  history: () => api.get('/ai/history'),
  chat: (message: string) => api.post('/ai/chat', { message }),
  weather: (projectId: string) => api.get(`/ai/weather/${projectId}`),
  risk: (participantId: string) => api.get(`/ai/risk/${participantId}`),
};

// Reports
export const reportsAPI = {
  list: () => api.get('/reports'),
  get: (id: string) => api.get(`/reports/${id}`),
  create: (data: Record<string, unknown>) => api.post('/reports', data),
  generate: (id: string) => api.post(`/reports/${id}/generate`),
  delete: (id: string) => api.delete(`/reports/${id}`),
  schedule: (data: Record<string, unknown>) => api.post('/reports/schedule', data),
  deleteSchedule: (id: string) => api.delete(`/reports/schedule/${id}`),
  getSchedules: () => api.get('/reports/schedules'),
};

// Tenants
export const tenantsAPI = {
  list: () => api.get('/tenants'),
  get: (id: string) => api.get(`/tenants/${id}`),
  create: (data: Record<string, unknown>) => api.post('/tenants', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tenants/${id}`, data),
  resolve: (subdomain: string) => api.get(`/tenants/resolve/${subdomain}`),
};

// Developer Portal
export const developerAPI = {
  getKeys: () => api.get('/developer/keys'),
  createKey: (data: Record<string, unknown>) => api.post('/developer/keys', data),
  revokeKey: (id: string) => api.delete(`/developer/keys/${id}`),
  getWebhooks: () => api.get('/developer/webhooks'),
  createWebhook: (data: Record<string, unknown>) => api.post('/developer/webhooks', data),
  deleteWebhook: (id: string) => api.delete(`/developer/webhooks/${id}`),
  toggleWebhook: (id: string, active: boolean) => api.patch(`/developer/webhooks/${id}`, { active }),
  testWebhook: (id: string) => api.post(`/developer/webhooks/${id}/test`),
  getUsage: () => api.get('/developer/usage'),
  getDocs: () => api.get('/developer/docs'),
};

// Metering & IoT
export const meteringAPI = {
  getReadings: (params?: Record<string, string>) => api.get('/metering/readings', { params }),
  getSummary: (projectId: string) => api.get('/metering/summary', { params: { project_id: projectId } }),
  getMeters: (projectId: string) => api.get('/metering/meters', { params: { project_id: projectId } }),
  ingest: (data: Record<string, unknown>) => api.post('/metering/ingest', data),
  validate: (readingIds: string[]) => api.post('/metering/validate', { reading_ids: readingIds }),
};

// P2P Trading
export const p2pAPI = {
  getOffers: (params?: Record<string, string>) => api.get('/p2p/offers', { params }),
  createOffer: (data: Record<string, unknown>) => api.post('/p2p/offers', data),
  acceptOffer: (id: string) => api.post(`/p2p/offers/${id}/accept`),
  cancelOffer: (id: string) => api.delete(`/p2p/offers/${id}`),
  settleOffer: (id: string) => api.post(`/p2p/offers/${id}/settle`),
  getZones: () => api.get('/p2p/zones'),
  getMyTrades: () => api.get('/p2p/my'),
};

// Demand Profiles
export const demandAPI = {
  getProfiles: (params?: Record<string, string>) => api.get('/demand/profiles', { params }),
  getProfile: (id: string) => api.get(`/demand/profiles/${id}`),
  createProfile: (data: Record<string, unknown>) => api.post('/demand/profiles', data),
  updateProfile: (id: string, data: Record<string, unknown>) => api.put(`/demand/profiles/${id}`, data),
  uploadBill: (profileId: string, data: Record<string, unknown>) => api.post(`/demand/profiles/${profileId}/bills`, data),
  analyze: (profileId: string) => api.post(`/demand/profiles/${profileId}/analyze`),
  expressInterest: (profileId: string, data: { match_id: string; message?: string }) => api.post(`/demand/profiles/${profileId}/express-interest`, data),
  getMatches: () => api.get('/demand/matches'),
};

// Fees
export const feesAPI = {
  getSchedule: () => api.get('/fees'),
};

// Subscriptions (B8)
export const subscriptionsAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrent: () => api.get('/subscriptions/current'),
  subscribe: (data: { plan_id: string; billing_cycle?: string }) => api.post('/subscriptions', data),
  cancel: () => api.delete('/subscriptions'),
  getUsage: () => api.get('/subscriptions/usage'),
  getAll: () => api.get('/subscriptions/all'),
};

// Pricing (B9)
export const pricingAPI = {
  getTiers: () => api.get('/pricing/tiers'),
  getQuote: (data: Record<string, unknown>) => api.post('/pricing/quote', data),
  getMarketRates: () => api.get('/pricing/market-rates'),
  getOfftakerCost: (offtakerId: string) => api.get(`/pricing/offtaker/${offtakerId}`),
};

// Health
export const healthAPI = {
  basic: () => api.get('/health'),
  detailed: () => api.get('/health/detailed'),
  getStatus: () => api.get('/health/status'),
  getMetrics: () => api.get('/health/metrics'),
};

// Fees
export const feesAdminAPI = {
  getSchedule: () => api.get('/fees'),
  updateSchedule: (id: string, data: Record<string, unknown>) => api.patch(`/admin/fees/${id}`, data),
  createSchedule: (data: Record<string, unknown>) => api.post('/admin/fees', data),
  getRevenue: (params?: Record<string, string>) => api.get('/admin/revenue', { params }),
};

// Contract Rules
export const contractRulesAPI = {
  list: (contractId: string) => api.get(`/contracts/${contractId}/rules`),
  create: (contractId: string, data: Record<string, unknown>) => api.post(`/contracts/${contractId}/rules`, data),
  update: (contractId: string, ruleId: string, data: Record<string, unknown>) => api.patch(`/contracts/${contractId}/rules/${ruleId}`, data),
  remove: (contractId: string, ruleId: string) => api.delete(`/contracts/${contractId}/rules/${ruleId}`),
  pause: (contractId: string, ruleId: string) => api.post(`/contracts/${contractId}/rules/${ruleId}/pause`),
  getRules: () => api.get('/smart-rules'),
  createRule: (data: Record<string, unknown>) => api.post('/smart-rules', data),
  updateRule: (id: string, data: Record<string, unknown>) => api.patch(`/smart-rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/smart-rules/${id}`),
};

// Admin
export const adminAPI = {
  getParticipants: (params?: Record<string, string>) => api.get('/admin/participants', { params }),
  getUsers: (params?: Record<string, string>) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  createTenant: (data: Record<string, unknown>) => api.post('/admin/tenants', data),
  deleteTenant: (id: string) => api.delete(`/admin/tenants/${id}`),
  getAuditLog: (params?: Record<string, string>) => api.get('/admin/audit-log', { params }),
  getSystemStats: () => api.get('/admin/stats'),
  getRevenue: (params?: Record<string, string>) => api.get('/admin/revenue', { params }),
};

// Document Vault
export const vaultAPI = {
  getDocuments: () => api.get('/vault/documents'),
  uploadDocument: (data: Record<string, unknown>) => api.post('/vault/documents', data),
  shareDocument: (id: string, data: { participant_ids: string[]; permission: string }) => api.post(`/vault/documents/${id}/share`, data),
  getTemplates: () => api.get('/vault/templates'),
  verifyDocument: (id: string) => api.post(`/vault/verify/${id}`),
};

// Lender Tools
export const lenderAPI = {
  getDashboard: () => api.get('/lender/dashboard'),
  getDisbursements: () => api.get('/lender/disbursements'),
  approveDisbursement: (id: string) => api.post(`/lender/disbursements/${id}/approve`),
  rejectDisbursement: (id: string, data: { reason: string }) => api.post(`/lender/disbursements/${id}/reject`, data),
  getCovenants: () => api.get('/lender/covenants'),
  getExposure: () => api.get('/lender/exposure'),
  getPortfolioReport: () => api.get('/lender/report/portfolio'),
  getCPMatrix: () => api.get('/lender/cp-matrix'),
  getFacilityUtil: () => api.get('/lender/facility-util'),
  getWatchlist: () => api.get('/lender/watchlist'),
  addToWatchlist: (data: { project_id: string; reason: string; exposure_cents?: number }) => api.post('/lender/watchlist', data),
  removeFromWatchlist: (projectId: string) => api.delete(`/lender/watchlist/${projectId}`),
  getDisbursementsPending: () => api.get('/lender/disbursements/pending'),
};

// Surveillance / Regulator Tools
export const surveillanceAPI = {
  getAlerts: () => api.get('/surveillance/alerts'),
  investigateAlert: (id: string) => api.post(`/surveillance/alerts/${id}/investigate`),
  getKYCDeep: () => api.get('/surveillance/kyc-deep'),
  getStatutoryReports: () => api.get('/surveillance/statutory-reports'),
  getRiskMonitor: () => api.get('/surveillance/risk-monitor'),
};

// RECs (Renewable Energy Certificates)
export const recsAPI = {
  list: (params?: Record<string, string>) => api.get('/recs', { params }),
  summary: () => api.get('/recs/summary'),
  transfer: (id: string, data: { to_participant_id: string; volume_mwh?: number }) => api.post(`/recs/${id}/transfer`, data),
  redeem: (id: string, data: { purpose: string; beneficiary: string }) => api.post(`/recs/${id}/redeem`, data),
  issue: (data: { project_id: string; period_start: string; period_end: string }) => api.post('/recs/issue', data),
};

// Carbon Tokens
export const tokensAPI = {
  list: (params?: Record<string, string>) => api.get('/tokens', { params }),
  mint: (data: { source_type: string; source_id: string; quantity: number; unit: string; metadata?: Record<string, unknown> }) => api.post('/tokens/mint', data),
  verify: (tokenId: string) => api.get(`/tokens/${tokenId}/verify`),
  transfer: (id: string, data: { to_participant_id: string }) => api.post(`/tokens/${id}/transfer`, data),
  retire: (id: string, data: { reason: string; beneficiary?: string }) => api.post(`/tokens/${id}/retire`, data),
};

// Cockpit
export const cockpitAPI = {
  get: (role?: string) => api.get('/cockpit', { params: role ? { role } : undefined }),
};

// Contract Agreements (digital workflow)
export const contractAgreementsAPI = {
  list: (params?: Record<string, string>) => api.get('/contracts/agreements', { params }),
  get: (id: string) => api.get(`/contracts/agreements/${id}`),
  create: (data: Record<string, unknown>) => api.post('/contracts/agreements', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/contracts/agreements/${id}`, data),
  saveFields: (id: string, fields: Array<{ field_key: string; field_value: string; field_type?: string; section?: string }>) =>
    api.post(`/contracts/agreements/${id}/fields`, { fields }),
  addSigners: (id: string, signers: Array<{ participant_id: string; signer_name: string; signer_email: string; signer_role?: string; signing_order?: number }>) =>
    api.post(`/contracts/agreements/${id}/signers`, { signers }),
  send: (id: string) => api.post(`/contracts/agreements/${id}/send`),
  sign: (id: string) => api.post(`/contracts/agreements/${id}/sign`),
  getActivity: (id: string) => api.get(`/contracts/agreements/${id}/activity`),
  activityFeed: (params?: Record<string, string>) => api.get('/contracts/activity/feed', { params }),
};

// ODSE Metering Analytics
export const odseAPI = {
  assets: (params?: Record<string, string>) => api.get('/odse/assets', { params }),
  summary: (params?: { days?: number; asset_id?: string; project_id?: string }) => api.get('/odse/analytics/summary', { params }),
  hourly: (params?: { days?: number; asset_id?: string }) => api.get('/odse/analytics/hourly', { params }),
  daily: (params?: { days?: number; asset_id?: string }) => api.get('/odse/analytics/daily', { params }),
  carbon: (params?: { days?: number; asset_id?: string }) => api.get('/odse/analytics/carbon', { params }),
  tariff: (params?: { days?: number; asset_id?: string }) => api.get('/odse/analytics/tariff', { params }),
  timeseries: (params?: Record<string, string>) => api.get('/odse/timeseries', { params }),
  ingest: (data: { readings: Array<Record<string, unknown>> }) => api.post('/odse/ingest', data),
};

// Staff Management (admin)
export const staffAPI = {
  list: () => api.get('/staff'),
  create: (data: { email: string; password: string; company_name: string; admin_level: string }) => api.post('/staff', data),
  updateLevel: (id: string, data: { admin_level: string }) => api.patch(`/staff/${id}`, data),
  revoke: (id: string) => api.delete(`/staff/${id}/revoke`),
  activity: (params?: Record<string, string>) => api.get('/staff/activity', { params }),
};

// Support Tickets
export const ticketsAPI = {
  list: (params?: Record<string, string | undefined>) => api.get('/tickets', { params }),
  create: (data: { subject: string; category: string; description: string; priority?: string }) => api.post('/tickets', data),
  get: (id: string) => api.get(`/tickets/${id}`),
  addMessage: (id: string, data: { message: string; is_internal_note?: boolean }) => api.post(`/tickets/${id}/messages`, data),
  update: (id: string, data: { status?: string; assigned_to?: string; priority?: string }) => api.patch(`/tickets/${id}`, data),
  stats: () => api.get('/tickets/stats'),
};

// Announcements
export const announcementsAPI = {
  list: () => api.get('/announcements'),
  create: (data: { title: string; body?: string; type?: string; starts_at?: string; expires_at?: string }) => api.post('/announcements/admin', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/announcements/admin/${id}`, data),
  remove: (id: string) => api.delete(`/announcements/admin/${id}`),
};

// Platform Config (admin)
export const platformConfigAPI = {
  list: () => api.get('/admin/config'),
  get: (key: string) => api.get(`/admin/config/${key}`),
  update: (key: string, data: { value: string }) => api.patch(`/admin/config/${key}`, data),
};

// User Impersonation (superadmin)
export const impersonateAPI = {
  start: (userId: string) => api.post(`/admin/impersonate/${userId}`),
  end: () => api.post('/admin/impersonate/end'),
};

// Account Recovery (admin)
export const accountRecoveryAPI = {
  resetPassword: (userId: string) => api.post(`/register/admin/users/${userId}/reset-password`),
  unlock: (userId: string) => api.post(`/register/admin/users/${userId}/unlock`),
  resendVerification: (userId: string) => api.post(`/register/admin/users/${userId}/resend-verification`),
  verifyEmail: (userId: string) => api.post(`/register/admin/users/${userId}/verify-email`),
  reset2FA: (userId: string) => api.post(`/register/admin/users/${userId}/reset-2fa`),
};

// Payments
export const paymentsAPI = {
  list: (params?: Record<string, string>) => api.get('/payments', { params }),
  stats: () => api.get('/payments/stats'),
  initiate: (data: Record<string, unknown>) => api.post('/payments', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/payments/${id}`, data),
  creditNotes: () => api.get('/payments/credit-notes'),
  issueCreditNote: (data: { invoice_id: string; amount_cents: number; reason: string }) => api.post('/payments/credit-note', data),
};

// AML Monitoring
export const amlAPI = {
  alerts: (params?: Record<string, string>) => api.get('/aml/alerts', { params }),
  getAlert: (id: string) => api.get(`/aml/alerts/${id}`),
  updateAlert: (id: string, data: Record<string, unknown>) => api.patch(`/aml/alerts/${id}`, data),
  scan: (participantId: string) => api.post(`/aml/scan/${participantId}`),
  rules: () => api.get('/aml/rules'),
  updateRule: (id: string, data: Record<string, unknown>) => api.patch(`/aml/rules/${id}`, data),
};

// Trading Limits
export const tradingLimitsAPI = {
  get: () => api.get('/trading/my-limits'),
  update: (data: Record<string, unknown>) => api.patch('/trading/my-limits', data),
};

// Entity Graph (Spec 11)
export const entityAPI = {
  getGraph: (type: string, id: string) => api.get(`/entity/${type}/${id}`),
};

// Action Queue / Notifications WebSocket polling (Spec 11)
export const notificationsWsAPI = {
  poll: (since?: string) => api.get('/notifications-ws/poll', { params: { since } }),
  stream: () => api.get('/notifications-ws/stream'),
  getActionQueue: (status?: string) => api.get('/notifications-ws/action-queue', { params: { status } }),
  completeAction: (id: string) => api.post(`/notifications-ws/action-queue/${id}/complete`),
  dismissAction: (id: string) => api.post(`/notifications-ws/action-queue/${id}/dismiss`),
};

// Spec 12: World-Leader Enhancements APIs

// TOU Pricing
export const touAPI = {
  getProfiles: () => api.get('/tou/profiles'),
  createProfile: (data: Record<string, unknown>) => api.post('/tou/profiles', data),
  getCurrentPeriod: () => api.get('/tou/current-period'),
  splitTrade: (tradeId: string) => api.post(`/tou/split-trade/${tradeId}`),
  costComparison: (params: Record<string, string>) => api.get('/tou/cost-comparison', { params }),
};

// Forward Price Curves
export const curvesAPI = {
  getCurve: (market: string) => api.get(`/curves/${market}`),
  getTenor: (market: string, tenor: number) => api.get(`/curves/${market}/${tenor}`),
  buildCurve: (market: string) => api.post(`/curves/build/${market}`),
  getHistory: (market: string, params?: Record<string, string>) => api.get(`/curves/history/${market}`, { params }),
};

// Scheduling & Nominations
export const schedulingAPI = {
  nominate: (data: Record<string, unknown>) => api.post('/scheduling/nominate', data),
  getNominations: (params?: Record<string, string>) => api.get('/scheduling/nominations', { params }),
  confirm: (id: string) => api.post(`/scheduling/${id}/confirm`),
  gridConfirm: (id: string) => api.post(`/scheduling/${id}/grid-confirm`),
  getCalendar: (params?: Record<string, string>) => api.get('/scheduling/calendar', { params }),
  submitActual: (id: string, data: Record<string, unknown>) => api.post(`/scheduling/${id}/actual`, data),
  getImbalance: () => api.get('/scheduling/imbalance'),
  settleImbalance: () => api.post('/scheduling/imbalance/settle'),
};

// Multi-Currency
export const currencyAPI = {
  getRates: () => api.get('/currency/rates'),
  updateRates: (data: Record<string, unknown>) => api.post('/currency/rates', data),
  convert: (data: { amount: number; from: string; to: string }) => api.post('/currency/convert', data),
};

// PPA Valuation
export const valuationAPI = {
  calculatePPA: (data: Record<string, unknown>) => api.post('/valuation/ppa', data),
  sensitivity: (data: Record<string, unknown>) => api.post('/valuation/sensitivity', data),
  getHistory: () => api.get('/valuation/history'),
};

// Regulatory Export
export const regulatoryAPI = {
  getNERSA: (params?: Record<string, string>) => api.get('/regulatory/nersa', { params }),
  getFSCA: () => api.get('/regulatory/fsca'),
  exportData: (format: string, params?: Record<string, string>) => api.get(`/regulatory/export/${format}`, { params }),
  scheduleReport: (data: Record<string, unknown>) => api.post('/regulatory/schedule', data),
};

// Data Retention
export const retentionAPI = {
  getPolicies: () => api.get('/retention/policies'),
  archive: (table: string) => api.post(`/retention/archive/${table}`),
  getLog: () => api.get('/retention/log'),
  getStats: () => api.get('/retention/stats'),
};

// ESG Scoring
export const esgAPI = {
  calculate: (participantId: string) => api.post(`/esg/calculate/${participantId}`),
  getScore: (participantId: string) => api.get(`/esg/score/${participantId}`),
  getLeaderboard: (params?: Record<string, string>) => api.get('/esg/leaderboard', { params }),
  getBadges: () => api.get('/esg/badges'),
};

// Carbon Vintage Analysis
export const vintageAPI = {
  getAnalysis: () => api.get('/vintage/analysis'),
  getFairValue: (params: Record<string, string>) => api.get('/vintage/fair-value', { params }),
};

// Deal Room
export const dealroomAPI = {
  create: (data: { contract_id: string }) => api.post('/dealroom', data),
  list: () => api.get('/dealroom'),
  get: (id: string) => api.get(`/dealroom/${id}`),
  sendMessage: (id: string, data: Record<string, unknown>) => api.post(`/dealroom/${id}/message`, data),
  propose: (id: string, data: Record<string, unknown>) => api.post(`/dealroom/${id}/propose`, data),
  close: (id: string) => api.post(`/dealroom/${id}/close`),
};

// VPP
export const vppAPI = {
  registerAsset: (data: Record<string, unknown>) => api.post('/vpp/assets', data),
  getAssets: (params?: Record<string, string>) => api.get('/vpp/assets', { params }),
  dispatch: (data: Record<string, unknown>) => api.post('/vpp/dispatch', data),
  endDispatch: (id: string) => api.post(`/vpp/dispatch/${id}/end`),
  getEvents: () => api.get('/vpp/events'),
  getDashboard: () => api.get('/vpp/dashboard'),
  heartbeat: (id: string, data: Record<string, unknown>) => api.post(`/vpp/assets/${id}/heartbeat`, data),
};

// AI Negotiation
export const negotiateAPI = {
  analyze: (data: Record<string, unknown>) => api.post('/negotiate/negotiate', data),
  compare: (data: Record<string, unknown>) => api.post('/negotiate/negotiate/compare', data),
};

// WhatsApp
export const whatsappAPI = {
  link: (data: { phone_number: string }) => api.post('/whatsapp/link', data),
  verify: (data: { otp: string }) => api.post('/whatsapp/verify', data),
  getStatus: () => api.get('/whatsapp/status'),
};

// Search
export const searchAPI = {
  search: (q: string, params?: Record<string, string>) => api.get('/search', { params: { q, ...params } }),
};

// Alerts
export const alertsAPI = {
  subscribe: (data: Record<string, unknown>) => api.post('/alerts/subscribe', data),
  unsubscribe: () => api.delete('/alerts/subscribe'),
  createPriceAlert: (data: Record<string, unknown>) => api.post('/alerts/price', data),
  getPriceAlerts: () => api.get('/alerts/price'),
  deletePriceAlert: (id: string) => api.delete(`/alerts/price/${id}`),
  checkAlerts: () => api.post('/alerts/check'),
  getSubscriptions: () => api.get('/alerts/subscriptions'),
};

// Enhanced Surveillance
export const surveillanceEnhancedAPI = {
  scan: () => api.post('/surveillance/enhanced/scan'),
  getAlerts: (params?: Record<string, string>) => api.get('/surveillance/enhanced/alerts', { params }),
  investigate: (id: string) => api.post(`/surveillance/enhanced/alerts/${id}/investigate`),
  resolve: (id: string, data: Record<string, unknown>) => api.post(`/surveillance/enhanced/alerts/${id}/resolve`, data),
  getStats: () => api.get('/surveillance/enhanced/stats'),
};

// Spec 13+14: Platform Evolution + Role-Complete APIs

// Deal Pipeline
export const pipelineAPI = {
  getDeals: () => api.get('/pipeline'),
  getStats: () => api.get('/pipeline/stats'),
  updateStage: (dealId: string, data: { stage: string }) => api.patch(`/pipeline/${dealId}/stage`, data),
};

// Entity Threads (Conversations)
export const threadsAPI = {
  getThreads: (entityType: string, entityId: string) => api.get(`/threads/${entityType}/${entityId}`),
  addComment: (entityType: string, entityId: string, data: { message: string; message_type?: string }) => api.post(`/threads/${entityType}/${entityId}`, data),
  reply: (id: string, data: { message: string }) => api.post(`/threads/${id}/reply`, data),
  markRead: (id: string) => api.post(`/threads/${id}/read`),
  getUnread: () => api.get('/threads/unread/count'),
};

// Calendar
export const calendarAPI = {
  getEvents: (params?: Record<string, string>) => api.get('/calendar', { params }),
  getToday: () => api.get('/calendar/today'),
  getWeek: () => api.get('/calendar/week'),
  getOverdue: () => api.get('/calendar/overdue'),
  createCustom: (data: { title: string; event_date: string; description?: string; event_type?: string }) => api.post('/calendar/custom', data),
};

// Intelligence Engine
export const intelligenceAPI = {
  getItems: (params?: Record<string, string>) => api.get('/intelligence', { params }),
  getSummary: () => api.get('/intelligence/summary'),
  acknowledge: (id: string) => api.post(`/intelligence/${id}/acknowledge`),
  acknowledgeAll: () => api.post('/intelligence/acknowledge-all'),
  generate: () => api.post('/intelligence/generate'),
};

// Network Graph
export const networkAPI = {
  getGraph: () => api.get('/network/graph'),
};

// Morning Briefing
export const briefingAPI = {
  get: () => api.get('/briefing'),
};

// First-Deal Concierge
export const conciergeAPI = {
  getStatus: () => api.get('/concierge/status'),
  completeStep: (step: number) => api.post('/concierge/complete-step', { step }),
  dismiss: () => api.post('/concierge/dismiss'),
};

// Grid Operator
export const gridAPI = {
  getConnections: (params?: Record<string, string>) => api.get('/grid/connections', { params }),
  createConnection: (data: Record<string, unknown>) => api.post('/grid/connections', data),
  updateConnectionStatus: (id: string, data: Record<string, unknown>) => api.patch(`/grid/connections/${id}/status`, data),
  getWheelingSummary: () => api.get('/grid/wheeling/summary'),
  getValidationQueue: () => api.get('/grid/metering/validation-queue'),
  validateReading: (id: string, data: { valid: boolean; notes?: string }) => api.post(`/grid/metering/${id}/validate`, data),
  batchValidate: (data: { ids: string[]; valid: boolean }) => api.post('/grid/metering/batch-validate', data),
  getImbalance: (params?: Record<string, string>) => api.get('/grid/imbalance', { params }),
  settleImbalance: (id: string) => api.post(`/grid/imbalance/${id}/settle`),
  getCapacity: () => api.get('/grid/capacity'),
};

// Carbon Fund
export const fundAPI = {
  getPerformance: (params?: Record<string, string>) => api.get('/fund/performance', { params }),
  getOptionsBook: () => api.get('/fund/options-book'),
  getRegistryReconciliation: () => api.get('/fund/registry-reconciliation'),
  syncRegistry: (name: string) => api.post(`/fund/registry/${name}/sync`),
  getVintageLadder: () => api.get('/fund/vintage-ladder'),
  generateReport: (type: string) => api.post(`/fund/report/${type}`),
  getDrawdown: () => api.get('/fund/drawdown'),
};

// Procurement (Offtaker)
export const procurementAPI = {
  createRFP: (data: Record<string, unknown>) => api.post('/procurement/rfp', data),
  listRFPs: () => api.get('/procurement/rfp'),
  publishRFP: (id: string) => api.patch(`/procurement/rfp/${id}/publish`),
  getBids: (rfpId: string) => api.get(`/procurement/rfp/${rfpId}/bids`),
  submitBid: (rfpId: string, data: Record<string, unknown>) => api.post(`/procurement/rfp/${rfpId}/bids`, data),
  selectBid: (rfpId: string, bidId: string) => api.post(`/procurement/rfp/${rfpId}/select/${bidId}`),
  getConsumptionTracking: () => api.get('/procurement/consumption-tracking'),
  getBudgetTracking: () => api.get('/procurement/budget-tracking'),
  getSustainabilityMetrics: () => api.get('/procurement/sustainability-metrics'),
  generateSustainabilityReport: () => api.post('/procurement/sustainability-report'),
};

// Document Intelligence (Spec 13 Shift 5)
export const documentsAPI = {
  extract: (document_id: string) => api.post('/documents/extract', { document_id }),
  getTerms: (id: string) => api.get(`/documents/${id}/terms`),
  compare: (doc_a_id: string, doc_b_id: string) => api.post('/documents/compare', { doc_a_id, doc_b_id }),
  getClauseLibrary: () => api.get('/documents/clause-library'),
};

// Smart Auto-Scheduling (Spec 13 Shift 6)
export const autoSchedulingAPI = {
  nominate: (data: { period?: string; contract_id?: string }) => api.post('/auto-scheduling/nominate', data),
  getRules: () => api.get('/auto-scheduling/rules'),
  submit: (nominations: Array<Record<string, unknown>>) => api.post('/auto-scheduling/submit', { nominations }),
};

// Batch Operations
export const batchAPI = {
  approveDisbursements: (ids: string[]) => api.post('/batch/disbursements/approve', { ids }),
  reverifyKYC: (ids: string[]) => api.post('/batch/kyc/reverify', { ids }),
  retireCredits: (data: { ids: string[]; purpose?: string; beneficiary?: string }) => api.post('/batch/credits/retire', data),
  signDocuments: (ids: string[]) => api.post('/batch/documents/sign', { ids }),
  payInvoices: (data: { ids: string[]; payment_ref?: string }) => api.post('/batch/invoices/pay', data),
  exportData: (data: { entity_type: string; ids: string[]; format?: string }) => api.post('/batch/export', data),
};

export default api;
