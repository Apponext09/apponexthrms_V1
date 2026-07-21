import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeOnboardingInstance {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  checklist_id: number;
  start_date: string;
  target_completion_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeOnboardingInstanceRepository extends BaseRepository<EmployeeOnboardingInstance> {
  constructor() {
    super('employee_onboarding_instances');
  }

  /**
   * Get onboarding instances for employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get active onboarding instances
   */
  async getActive(ctx: TenantContext, employeeId: number): Promise<EmployeeOnboardingInstance | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('status', '!=', 'completed')
      .orderBy('created_at', 'desc')
      .first() as Promise<EmployeeOnboardingInstance | null>;
  }

  /**
   * Get by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
