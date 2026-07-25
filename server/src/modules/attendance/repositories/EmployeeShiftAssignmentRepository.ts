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

  /**
   * Get all assignments with employee and shift details joined
   */
  async getAllWithJoins(
    ctx: TenantContext,
    options?: ListQueryOptions & { isCurrent?: boolean; shiftId?: number; search?: string }
  ) {
    const { page = 1, pageSize = 50, isCurrent, shiftId, search } = options || {};
    const offset = (page - 1) * pageSize;

    let query = this.db('employee_shift_assignments as esa')
      .where('esa.organization_id', ctx.organizationId)
      .whereNull('esa.deleted_at')
      .join('employees as e', 'e.id', 'esa.employee_id')
      .join('shift_templates as st', 'st.id', 'esa.shift_id')
      .leftJoin('departments as d', 'd.id', 'e.current_department_id')
      .leftJoin('designations as des', 'des.id', 'e.current_designation_id')
      .select(
        'esa.id',
        'esa.uuid',
        'esa.employee_id',
        'esa.shift_id',
        'esa.assignment_start_date',
        'esa.assignment_end_date',
        'esa.is_current',
        'esa.created_at',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'd.name as department_name',
        'des.name as designation_name',
        'st.shift_name',
        'st.shift_code',
        'st.color as shift_color',
        'st.shift_type',
        'st.start_time',
        'st.end_time'
      );

    if (isCurrent !== undefined) {
      query = query.where('esa.is_current', isCurrent);
    }
    if (shiftId) {
      query = query.where('esa.shift_id', shiftId);
    }
    if (search) {
      query = query.where((q) =>
        q
          .where('e.first_name', 'like', `%${search}%`)
          .orWhere('e.last_name', 'like', `%${search}%`)
          .orWhere('e.employee_code', 'like', `%${search}%`)
          .orWhere('st.shift_name', 'like', `%${search}%`)
      );
    }

    const countResult = await query.clone().clearSelect().count('* as total').first() as any;
    const items = await query
      .orderBy('esa.assignment_start_date', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      meta: {
        total: Number(countResult?.total || 0),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countResult?.total || 0) / pageSize),
        hasMore: page * pageSize < Number(countResult?.total || 0),
      },
    };
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
