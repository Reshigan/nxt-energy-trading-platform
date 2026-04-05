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

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      localStorage.removeItem('nxt_token');
      localStorage.removeItem('nxt_user');
      window.location.href = '/login';
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

export default api;
