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
  me: () => api.get('/register/me'),
  refresh: (refreshToken: string) => api.post('/register/refresh', { refreshToken }),
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
};

// Settlement
export const settlementAPI = {
  confirmSettlement: (tradeId: string) => api.post(`/settlement/settlements/${tradeId}/confirm`),
  getEscrows: (params?: Record<string, string>) => api.get('/settlement/escrows', { params }),
  createEscrow: (data: Record<string, unknown>) => api.post('/settlement/escrows', data),
  getInvoices: (params?: Record<string, string>) => api.get('/settlement/invoices', { params }),
  generateInvoice: (data: Record<string, unknown>) => api.post('/settlement/invoices/generate', data),
  payInvoice: (id: string) => api.post(`/settlement/invoices/${id}/pay`),
  getDisputes: (params?: Record<string, string>) => api.get('/settlement/disputes', { params }),
  fileDispute: (data: Record<string, unknown>) => api.post('/settlement/disputes', data),
  updateDisputeStatus: (id: string, data: Record<string, unknown>) => api.patch(`/settlement/disputes/${id}/status`, data),
};

// Compliance
export const complianceAPI = {
  getKYC: (params?: Record<string, string>) => api.get('/compliance/kyc', { params }),
  verifyKYC: (id: string) => api.post(`/compliance/kyc/${id}/verify`),
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
  getNotifications: (params?: Record<string, string>) => api.get('/marketplace/notifications', { params }),
  markNotificationRead: (id: string) => api.post(`/marketplace/notifications/${id}/read`),
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

export default api;
