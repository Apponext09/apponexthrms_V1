import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeavePolicyAssignment {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  leave_policy_id: number;
  leave_type_id: number;
  annual_quota: number;
  monthly_accrual: number | null;
  quarterly_accrual: number | null;
  yearly_accrual: number | null;
  carry_forward_enabled: boolean;
  carry_forward_limit: number | null;
  encashment_enabled: boolean;
  encashment_limit: number | null;
  maximum_balance: number | null;
  can_take_negative: boolean;
  sandwich_policy_enabled: boolean;
  probation_excluded: boolean;
  assignment_start_date: string;
  assignment_end_date: string | null;
  is_active: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeavePolicyAssignmentRepository extends BaseRepository<LeavePolicyAssignment> {
  constructor() {
    super('leave_policy_assignments');
    this.companyScoped = true;
  }

  /**
   * Get assignment for employee and leave type
   */
  async getForEmployeeAndLeaveType(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number
  ): Promise<LeavePolicyAssignment | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('leave_type_id', leaveTypeId)
      .where('is_active', true)
      .first() as Promise<LeavePolicyAssignment | null>;
  }

  /**
   * Get all assignments for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId, is_active: true },
    });
  }

  /**
   * Get assignments by leave policy
   */
  async getByPolicy(ctx: TenantContext, policyId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { leave_policy_id: policyId },
    });
  }

  /**
   * Get assignments for active employees
   */
  async getActiveForEmployees(ctx: TenantContext, employeeIds: number[]) {
    return this.query(ctx)
      .whereIn('employee_id', employeeIds)
      .where('is_active', true)
      .orderBy('employee_id', 'asc');
  }
}
