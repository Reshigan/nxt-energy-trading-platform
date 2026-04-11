// Environment bindings for Cloudflare Workers
export interface AppBindings extends Record<string, unknown> {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  ORDER_BOOK: DurableObjectNamespace;
  ESCROW_MGR: DurableObjectNamespace;
  P2P_MATCHER: DurableObjectNamespace;
  SMART_CONTRACT: DurableObjectNamespace;
  RISK_ENGINE: DurableObjectNamespace;
  EVENTS_QUEUE: Queue;
  ENVIRONMENT: string;
  JWT_ISSUER: string;
  API_BASE_URL: string;
  [key: string]: unknown;
}

// Hono environment type
export type HonoEnv = { Bindings: AppBindings; Variables: { user: JwtPayload } };

// Admin hierarchy levels
export type AdminLevel = 'superadmin' | 'admin' | 'support';

// User roles
export type Role = 'admin' | 'ipp' | 'ipp_developer' | 'generator' | 'trader' | 'carbon_fund' | 'offtaker' | 'lender' | 'grid' | 'regulator';

export const ROLES: Role[] = ['admin', 'ipp', 'ipp_developer', 'generator', 'trader', 'carbon_fund', 'offtaker', 'lender', 'grid', 'regulator'];

// KYC status
export type KycStatus = 'pending' | 'in_review' | 'verified' | 'rejected' | 'suspended';

// JWT payload
export interface JwtPayload {
  sub: string; // participant ID
  email: string;
  role: Role;
  company_name: string;
  kyc_status: KycStatus;
  admin_level?: AdminLevel;
  iss: string;
  iat: number;
  exp: number;
}

// Validation result from statutory checks
export interface ValidationResult {
  status: 'pass' | 'fail' | 'pending' | 'exempt' | 'overridden';
  reason?: string;
  source?: string;
  checked_at: string;
}

// Order types
export type OrderDirection = 'buy' | 'sell';
export type Market = 'solar' | 'wind' | 'hydro' | 'gas' | 'carbon' | 'battery';
export type OrderType = 'limit' | 'market' | 'stop_loss' | 'take_profit' | 'iceberg';
export type OrderValidity = 'gtc' | 'day' | 'ioc' | 'fok' | 'gtd';
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled' | 'expired';

// Contract document phases
export type DocumentPhase =
  | 'draft' | 'loi' | 'term_sheet' | 'hoa' | 'draft_agreement'
  | 'legal_review' | 'statutory_check' | 'execution' | 'active'
  | 'amended' | 'terminated';

// Document types
export type DocumentType =
  | 'loi' | 'term_sheet' | 'hoa' | 'ppa_wheeling' | 'ppa_btm'
  | 'carbon_purchase' | 'carbon_option_isda' | 'forward' | 'epc'
  | 'wheeling_agreement' | 'side_letter' | 'nda';

// Escrow states
export type EscrowStatus = 'created' | 'funded' | 'held' | 'released' | 'disputed' | 'expired';

// IPP project phases
export type ProjectPhase = 'development' | 'financial_close' | 'construction' | 'commissioning' | 'commercial_ops';

// Dispute states
export type DisputeStatus = 'filed' | 'under_review' | 'evidence_phase' | 'counter_claim' | 'mediation' | 'resolved' | 'escalated';

// Carbon credit status
export type CreditStatus = 'active' | 'retired' | 'transferred' | 'listed' | 'suspended';

// Carbon option types
export type OptionType = 'call' | 'put' | 'collar' | 'spread' | 'barrier' | 'asian';

// Invoice status
export type InvoiceStatus = 'draft' | 'outstanding' | 'paid' | 'overdue' | 'cancelled';

// Standard API response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}
