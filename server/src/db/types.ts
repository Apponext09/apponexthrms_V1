import type { Knex } from 'knex';

/**
 * TenantContext passed through middleware and stored on req.ctx
 * Every database query MUST be scoped to the current organization
 */
export interface TenantContext {
  organizationId: number;
  userId: number;
  sessionUuid: string;
  companyId?: number;
}

/**
 * QueryBuilder wrapper type for type-safe query building
 */
export type QueryBuilder<T = any> = Knex.QueryBuilder<T>;

/**
 * Database table row types (snake_case from DB, camelCase by ORM hook)
 */
export interface BaseRow {
  id: number;
  uuid: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Pagination metadata returned with list queries
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

/**
 * Paginated list response
 */
export interface PaginatedList<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Query options for list operations
 */
export interface ListQueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

/**
 * Soft delete filter enum
 */
export enum SoftDeleteFilter {
  INCLUDE_DELETED = 'include_deleted',
  ONLY_DELETED = 'only_deleted',
  EXCLUDE_DELETED = 'exclude_deleted', // default
}

/**
 * Generic repository response type
 */
export interface RepositoryResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Filter builder for dynamic query construction
 */
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin' | 'exists';
  value: unknown;
}

/**
 * Transaction context for multi-step operations
 */
export interface TransactionContext {
  trx: Knex.Transaction;
  ctx: TenantContext;
}
