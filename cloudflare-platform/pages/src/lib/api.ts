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
  enable2FA: () => api.post('/register/me/2fa/enable'),
  verify2FA: (code: string) => api.post('/register/me/2fa/verify', { code }),
  disable2FA: (password: string) => api.post('/register/me/2fa/disable', { password }),
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
  getPdf: (id: string) => api.get(`/contracts/documents/${id}/pdf`),
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
  generateNetInvoice: (data: Record<string, unknown>) => api.post('/settlement/netting/generate', data),
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
  reject: (id: string) => api.post(`/participants/${id}/reject`),
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
  updateSchedule: (id: string, data: Record<string, unknown>) => api.patch(`/fees/${id}`, data),
  getRevenue: (params?: Record<string, string>) => api.get('/fees/revenue', { params }),
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

export default api;
