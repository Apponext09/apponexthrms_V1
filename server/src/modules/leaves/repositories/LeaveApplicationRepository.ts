import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeaveApplication {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  leave_type_id: number;
  application_start_date: string;
  application_end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_period: 'first_half' | 'second_half' | null;
  is_hourly: boolean;
  hourly_duration: number | null;
  reason_description: string | null;
  supporting_document_url: string | null;
  workflow_instance_id: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  submitted_at: string | null;
  submitted_by_user_id: number | null;
  approved_by: number | null;
  approval_date: string | null;
  rejection_reason: string | null;
  cancelled_by: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  withdrawn_at: string | null;
  withdrawn_by: number | null;
  withdrawn_reason: string | null;
  is_sandwich_day: boolean;
  delegated_to_user_id: number | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeaveApplicationRepository extends BaseRepository<LeaveApplication> {
  constructor() {
    super('leave_applications');
  }

  /**
   * Get applications for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get pending approvals for user
   */
  async getPendingForApprover(ctx: TenantContext, approverId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { delegated_to_user_id: approverId, status: 'submitted' },
    });
  }

  /**
   * Get applications within date range
   */
  async getByDateRange(
    ctx: TenantContext,
    startDate: string,
    endDate: string,
    employeeId?: number,
    options?: ListQueryOptions
  ) {
    let query = this.query(ctx)
      .where('application_start_date', '<=', endDate)
      .where('application_end_date', '>=', startDate);

    if (employeeId) {
      query = query.where('employee_id', employeeId);
    }

    return query.orderBy('application_start_date', 'asc');
  }

  /**
   * Get applications by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get applications for department
   */
  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.query(ctx)
      .join('employees', 'leave_applications.employee_id', 'employees.id')
      .where('employees.current_department_id', departmentId)
      .where('leave_applications.organization_id', ctx.organizationId)
      .select('leave_applications.*')
      .orderBy('leave_applications.application_start_date', 'desc');
  }

  /**
   * Count pending approvals for user
   */
  async countPending(ctx: TenantContext, approverId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('delegated_to_user_id', approverId)
      .where('status', 'submitted')
      .count('id as total')
      .first() as any;
    return result?.total || 0;
  }
}
