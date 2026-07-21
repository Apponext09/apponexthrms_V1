import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Goal {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  goal_template_id: number | null;
  title: string;
  description: string | null;
  category: string;
  start_date: string;
  end_date: string;
  target_value: number | null;
  progress: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  weight: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class GoalRepository extends BaseRepository<Goal> {
  constructor() {
    super('goals');
  }

  /**
   * Get goals by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get goals by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get goals by category
   */
  async getByCategory(ctx: TenantContext, category: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { category },
    });
  }

  /**
   * Get active goals for an employee
   */
  async getActiveGoals(ctx: TenantContext, employeeId: number) {
    return this.list(ctx, {
      filters: {
        employee_id: employeeId,
        status: 'active',
      },
    });
  }
}
