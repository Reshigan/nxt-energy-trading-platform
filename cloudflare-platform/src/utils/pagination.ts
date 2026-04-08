/**
 * Phase 3.7: Standardised pagination helper.
 * All GET list endpoints accept ?page=1&per_page=20.
 * Returns {data, pagination: {page, per_page, total, total_pages}}.
 */

export interface PaginationParams {
  page: number;
  per_page: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export function parsePagination(query: { page?: string; per_page?: string; limit?: string }): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const per_page = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit || '20', 10)));
  return { page, per_page, offset: (page - 1) * per_page };
}

export function paginationMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    per_page: params.per_page,
    total,
    total_pages: Math.ceil(total / params.per_page),
  };
}

/**
 * Phase 3.8: Standardised error codes.
 */
export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  ORDER_REJECTED: 'ORDER_REJECTED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function errorResponse(code: ErrorCode, message: string, details?: unknown, requestId?: string) {
  return {
    success: false as const,
    error: message,
    code,
    ...(details ? { details } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    success: true as const,
    data,
    pagination: paginationMeta(total, params),
  };
}
