import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { SoftDeleteFilter } from '../../../db/types';

export interface EmployeeLifecycle {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  from_status: string | null;
  to_status: string;
  transition_date: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export class EmployeeLifecycleRepository extends BaseRepository<EmployeeLifecycle> {
  constructor() {
    super('employee_lifecycle');
  }

  /**
   * Create lifecycle record.
   * Overridden because employee_lifecycle has no updated_at/deleted_at columns.
   */
  async create(ctx: TenantContext, data: Partial<EmployeeLifecycle>): Promise<EmployeeLifecycle> {
    const [id] = await this.query(ctx).insert({
      ...data,
      organization_id: ctx.organizationId,
      created_at: new Date() as any,
    });

    const created = await this.getById(ctx, id as any);
    if (!created) {
      throw new Error(`Failed to create ${this.tableName}`);
    }

    return created;
  }

  /**
   * Get lifecycle history for employee.
   * INCLUDE_DELETED skips the deleted_at filter (column doesn't exist on this table).
   */
  async getEmployeeHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'transition_date',
      sortOrder: 'desc',
    }, SoftDeleteFilter.INCLUDE_DELETED);
  }

  /**
   * Get latest status transition
   */
  async getLatestTransition(ctx: TenantContext, employeeId: number): Promise<EmployeeLifecycle | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .orderBy('transition_date', 'desc')
      .first() as Promise<EmployeeLifecycle | null>;
  }

  /**
   * Get transitions by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { to_status: status },
    }, SoftDeleteFilter.INCLUDE_DELETED);
  }

  protected getSearchableFields(): string[] {
    return ['notes'];
  }

  protected getAllowedSortColumns(): string[] {
    return ['id', 'created_at', 'organization_id', 'transition_date'];
  }
}
