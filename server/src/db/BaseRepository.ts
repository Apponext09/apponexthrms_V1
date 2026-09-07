import type { Knex } from 'knex';
import { getKnex, convertSnakeToCamel } from './knex';
import type { TenantContext, QueryBuilder, ListQueryOptions, PaginatedList, PaginationMeta } from './types';
import { SoftDeleteFilter } from './types';

/**
 * Returns the current local time as a MySQL-compatible DATETIME string.
 * Format: 'YYYY-MM-DD HH:MM:SS'
 *
 * IMPORTANT: Never pass `new Date()` directly to Knex for MySQL DATETIME columns.
 * Knex serialises JavaScript Date objects as ISO 8601 ('2026-07-28T08:21:31.014Z')
 * which MySQL rejects with "Incorrect datetime value".
 */
const mysqlNow = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};


/**
 * BaseRepository: THE critical multi-tenant isolation choke point.
 *
 * Every repository MUST extend this class and call super in its constructor.
 * All queries are automatically scoped to the current organization via:
 * - whereOrgId() called in every query method
 * - Tenant context passed through all operations
 *
 * This is non-negotiable for security.
 */
export abstract class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  public db: Knex;
  protected companyScoped: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = getKnex();
  }

  /**
   * Start a new query scoped to this tenant and optionally company context
   */
  public query(ctx: TenantContext): QueryBuilder<T> {
    const tableName = this.tableName;
    let q = this.db(tableName).where(`${tableName}.organization_id`, ctx.organizationId);
    if (this.companyScoped && ctx?.companyId) {
      q = q.where((builder) => {
        builder.where(`${tableName}.company_id`, ctx.companyId).orWhereNull(`${tableName}.company_id`);
      });
    }
    return q as QueryBuilder<T>;
  }

  /**
   * Add organization filter to existing query
   */
  protected whereOrgId(query: QueryBuilder<T>, ctx: TenantContext): QueryBuilder<T> {
    return query.where('organization_id', ctx.organizationId);
  }

  /**
   * Get single record by ID
   */
  async getById(ctx: TenantContext, id: number | string): Promise<T | null> {
    if (id === undefined || id === null || id === '' || id === 'undefined' || id === 'null') {
      return null;
    }
    try {
      let cleanId: number | string = id;
      if (typeof cleanId === 'string' && cleanId.includes(':') && !this.isPrimaryKeyUuid(cleanId)) {
        const firstPart = cleanId.split(':')[0];
        const num = parseInt(firstPart, 10);
        if (!isNaN(num) && num > 0) {
          cleanId = num;
        }
      }

      // Use raw query to bypass Knex query validation issues
      const idCol = this.isPrimaryKeyUuid(cleanId) ? 'uuid' : 'id';
      const result = await this.db.raw(
        `SELECT * FROM ?? WHERE ?? = ? AND ?? = ? LIMIT 1`,
        [this.tableName, 'organization_id', ctx.organizationId, idCol, cleanId]
      ) as any;

      // Extract results from raw query response
      const rows = result[0] || [];
      if (!rows || rows.length === 0) {
        return null;
      }

      // Convert snake_case to camelCase (since postProcessResponse doesn't run on raw queries)
      return convertSnakeToCamel(rows[0]);
    } catch (error) {
      console.error('[BaseRepository.getById] Error:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get single record by multiple fields
   */
  async getByFields(
    ctx: TenantContext,
    fields: Record<string, unknown>,
    includeDeleted: SoftDeleteFilter = SoftDeleteFilter.EXCLUDE_DELETED
  ): Promise<T | null> {
    let query = this.query(ctx);

    for (const [field, value] of Object.entries(fields)) {
      query = (query as any).where(field, value as any);
    }

    query = this.applySoftDeleteFilter(query, includeDeleted);

    return query.first() || null;
  }

  /**
   * List records with pagination and filtering
   */
  async list(
    ctx: TenantContext,
    options: ListQueryOptions = {},
    includeDeleted: SoftDeleteFilter = SoftDeleteFilter.EXCLUDE_DELETED
  ): Promise<PaginatedList<T>> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      filters = {},
    } = options;

    const validatedPage = Math.max(1, Number.isNaN(Number(page)) ? 1 : Math.floor(Number(page)));
    const validatedPageSize = Math.max(1, Number.isNaN(Number(pageSize)) ? 20 : Math.floor(Number(pageSize)));
    const validatedSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

    const allowedSortColumns = this.getAllowedSortColumns();
    const validatedSortBy = allowedSortColumns.includes(String(sortBy)) ? sortBy : 'created_at';

    let query = this.query(ctx);

    // Apply soft delete filter
    query = this.applySoftDeleteFilter(query, includeDeleted);

    // Apply custom filters
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = (query as any).where(field, value as any);
      }
    }

    if ((options as any).customWhere) {
      query = (query as any).where((options as any).customWhere);
    }

    // Apply search (subclasses can override this method for custom search logic)
    if (search && this.getSearchableFields().length > 0) {
      query = query.andWhere((q) => {
        this.getSearchableFields().forEach((field, index) => {
          if (index === 0) {
            q.where(field, 'like', `%${search}%`);
          } else {
            q.orWhere(field, 'like', `%${search}%`);
          }
        });
      });
    }

    // Get total count before pagination
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = Number(count);

    // Apply sorting and pagination
    query = query
      .orderBy(validatedSortBy, validatedSortOrder)
      .offset((validatedPage - 1) * validatedPageSize)
      .limit(validatedPageSize);

    const items = await query;

    const meta: PaginationMeta = {
      page: validatedPage,
      pageSize: validatedPageSize,
      total,
      hasMore: validatedPage * validatedPageSize < total,
      totalPages: Math.ceil(total / validatedPageSize),
    };

    return { items, meta };
  }

  /**
   * Create a new record
   */
  async create(ctx: TenantContext, data: Partial<T>): Promise<T> {
    const insertPayload: any = {
      ...data,
      organization_id: ctx.organizationId,
      created_at: mysqlNow(),
      updated_at: mysqlNow(),
    };
    if (this.companyScoped && ctx?.companyId && insertPayload.company_id === undefined) {
      insertPayload.company_id = ctx.companyId;
    }
    const [id] = await this.query(ctx).insert(insertPayload);

    const created = await this.getById(ctx, id);
    if (!created) {
      throw new Error(`Failed to create ${this.tableName}`);
    }

    return created;
  }

  /**
   * Create multiple records in a single query
   */
  async createMany(ctx: TenantContext, dataArray: Partial<T>[]): Promise<T[]> {
    const now = mysqlNow();
    const prepared = dataArray.map((data) => ({
      ...data,
      organization_id: ctx.organizationId,
      created_at: now,
      updated_at: now,
    }));

    const [firstId] = await (this.query(ctx).insert(prepared as any) as any);

    const created = await (this.query(ctx)
      .whereIn('id', Array.from({ length: dataArray.length }, (_, i) => Number(firstId) + i))
      .select() as any);

    return created;
  }

  /**
   * Update a record
   */
  async update(ctx: TenantContext, id: number | string, data: Partial<T>): Promise<T> {
    const updateData = {
      ...data,
      updated_at: mysqlNow(),
    };

    await (this.query(ctx)
      .where(this.isPrimaryKeyUuid(id) ? 'uuid' : 'id', id)
      .update(updateData as any) as any);

    const updated = await this.getById(ctx, id);
    if (!updated) {
      throw new Error(`Failed to update ${this.tableName}`);
    }

    return updated;
  }

  /**
   * Update many records matching a condition
   */
  async updateWhere(
    ctx: TenantContext,
    conditions: Record<string, unknown>,
    data: Partial<T>
  ): Promise<number> {
    let query: any = this.query(ctx);

    for (const [field, value] of Object.entries(conditions)) {
      query = query.where(field, value as any);
    }

    return (query.update({
      ...data,
      updated_at: new Date(),
    }) as any) as Promise<number>;
  }

  /**
   * Soft delete (update deleted_at timestamp)
   */
  async delete(ctx: TenantContext, id: number | string): Promise<void> {
    await (this.query(ctx)
      .where(this.isPrimaryKeyUuid(id) ? 'uuid' : 'id', id)
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      } as any) as any);
  }

  /**
   * Hard delete (actually remove from DB)
   */
  async hardDelete(ctx: TenantContext, id: number | string): Promise<void> {
    await this.query(ctx)
      .where(this.isPrimaryKeyUuid(id) ? 'uuid' : 'id', id)
      .del();
  }

  /**
   * Restore soft-deleted record
   */
  async restore(ctx: TenantContext, id: number | string): Promise<T> {
    const restored = await this.update(ctx, id, { deleted_at: null } as any);
    return restored;
  }

  /**
   * Check if record exists
   */
  async exists(
    ctx: TenantContext,
    conditions: Record<string, unknown>,
    includeDeleted: SoftDeleteFilter = SoftDeleteFilter.EXCLUDE_DELETED
  ): Promise<boolean> {
    let query = this.query(ctx);

    for (const [field, value] of Object.entries(conditions)) {
      query = (query as any).where(field, value as any);
    }

    query = this.applySoftDeleteFilter(query, includeDeleted);

    const result = await query.first();
    return !!result;
  }

  /**
   * Count records
   */
  async count(
    ctx: TenantContext,
    conditions: Record<string, unknown> = {},
    includeDeleted: SoftDeleteFilter = SoftDeleteFilter.EXCLUDE_DELETED
  ): Promise<number> {
    let query = this.query(ctx);

    for (const [field, value] of Object.entries(conditions)) {
      query = (query as any).where(field, value as any);
    }

    query = this.applySoftDeleteFilter(query, includeDeleted);

    const [{ count }] = await query.count('* as count');
    return Number(count);
  }

  /**
   * Batch delete (soft delete multiple records)
   */
  async deleteBatch(ctx: TenantContext, ids: (number | string)[]): Promise<number> {
    return (this.query(ctx)
      .whereIn('id', ids)
      .update({
        deleted_at: new Date(),
        updated_at: new Date(),
      } as any) as any) as Promise<number>;
  }

  /**
   * Apply soft delete filter to query
   */
  protected applySoftDeleteFilter(
    query: QueryBuilder<T>,
    filter: SoftDeleteFilter
  ): QueryBuilder<T> {
    switch (filter) {
      case SoftDeleteFilter.INCLUDE_DELETED:
        return query; // No filter
      case SoftDeleteFilter.ONLY_DELETED:
        return query.whereNotNull('deleted_at');
      case SoftDeleteFilter.EXCLUDE_DELETED:
      default:
        return query.whereNull('deleted_at');
    }
  }

  /**
   * Check if value looks like a UUID (override this if using different PKs)
   */
  protected isPrimaryKeyUuid(value: unknown): boolean {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  /**
   * Get fields that should be searched (override in subclasses)
   */
  protected getSearchableFields(): string[] {
    return [];
  }

  /**
   * Get allowed columns for sorting (override in subclasses for custom columns)
   * Default: id, created_at, updated_at, organization_id
   */
  protected getAllowedSortColumns(): string[] {
    return ['id', 'created_at', 'updated_at', 'organization_id'];
  }
}
