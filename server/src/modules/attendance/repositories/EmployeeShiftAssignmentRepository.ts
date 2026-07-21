import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeShiftAssignment {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  shift_id: number;
  shift_rotation_id: number | null;
  assignment_start_date: string;
  assignment_end_date: string | null;
  is_current: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeShiftAssignmentRepository extends BaseRepository<EmployeeShiftAssignment> {
  constructor() {
    super('employee_shift_assignments');
  }

  async getCurrentAssignment(ctx: TenantContext, employeeId: number): Promise<EmployeeShiftAssignment | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('is_current', true)
      .first() as Promise<EmployeeShiftAssignment | null>;
  }

  async getAssignmentByDate(
    ctx: TenantContext,
    employeeId: number,
    date: string
  ): Promise<EmployeeShiftAssignment | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('assignment_start_date', '<=', date)
      .where((q) => q.whereNull('assignment_end_date').orWhere('assignment_end_date', '>=', date))
      .orderBy('assignment_start_date', 'desc')
      .first() as Promise<EmployeeShiftAssignment | null>;
  }

  async getEmployeeAssignments(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'assignment_start_date',
      sortOrder: 'desc',
    });
  }

  async getByShift(ctx: TenantContext, shiftId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { shift_id: shiftId, is_current: true },
    });
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
