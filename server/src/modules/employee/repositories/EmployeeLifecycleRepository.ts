import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

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
   * Get lifecycle history for employee
   */
  async getEmployeeHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'transition_date',
      sortOrder: 'desc',
    });
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
    });
  }

  protected getSearchableFields(): string[] {
    return ['notes'];
  }
}
