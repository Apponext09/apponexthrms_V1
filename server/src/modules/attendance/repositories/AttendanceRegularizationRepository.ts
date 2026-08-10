import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { db } from '../../../db/knex';

export interface AttendanceRegularization {
  id: number;
  uuid: string;
  organization_id: number;
  company_id: number | null;
  employee_id: number;
  attendance_record_id: number | null;
  request_date: string;
  is_date_range: boolean;
  end_date: string | null;
  requested_check_in_time: string | null;
  requested_check_out_time: string | null;
  actual_check_in_time: string | null;
  actual_check_out_time: string | null;
  reason: string;
  day_type: string | null;
  comment: string | null;
  status: 'pending_manager' | 'pending_hr' | 'manager_approved' | 'approved' | 'rejected';
  manager_id: number | null;
  manager_approved_by: number | null;
  manager_approved_at: string | null;
  manager_comments: string | null;
  hr_approved_by: number | null;
  hr_approved_at: string | null;
  hr_comments: string | null;
  created_at: string;
  updated_at: string;
}

export class AttendanceRegularizationRepository extends BaseRepository<AttendanceRegularization> {
  constructor() {
    super('attendance_regularizations');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    const orgId = ctx.organizationId || ctx.companyId || 8;
    const query = this.query(ctx)
      .where((qb) => {
        qb.where('employee_id', employeeId);
      })
      .andWhere((qb) => {
        qb.where('organization_id', orgId).orWhere('company_id', orgId);
      })
      .orderBy('request_date', 'desc');

    const items = await query;
    return { items, meta: { total: items.length, page: 1, pageSize: items.length, totalPages: 1 } };
  }

  async getManagerPendingRequests(ctx: TenantContext, managerEmployeeId: number, managerDeptId?: number) {
    const orgId = ctx.organizationId || ctx.companyId || 8;

    // Get team lead IDs under manager if applicable
    let teamLeadIds: number[] = [];
    if (managerEmployeeId) {
      const teamLeads = await db('employees')
        .where('reporting_manager_id', managerEmployeeId)
        .select('id');
      teamLeadIds = teamLeads.map((t: any) => Number(t.id));
    }

    const query = db('attendance_regularizations')
      .select('attendance_regularizations.*')
      .select(
        'employees.first_name as employee_first_name',
        'employees.last_name as employee_last_name',
        'employees.employee_code as employee_code',
        'departments.name as department_name'
      )
      .join('employees', 'attendance_regularizations.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .where((qb) => {
        qb.where('attendance_regularizations.organization_id', orgId)
          .orWhere('attendance_regularizations.company_id', orgId);
      })
      .whereIn('attendance_regularizations.status', ['pending_manager', 'pending'])
      .where((qb) => {
        qb.where('attendance_regularizations.manager_id', managerEmployeeId)
          .orWhere('employees.reporting_manager_id', managerEmployeeId);
        if (managerDeptId) {
          qb.orWhere('employees.current_department_id', managerDeptId);
        }
        if (teamLeadIds.length > 0) {
          qb.orWhereIn('employees.reporting_manager_id', teamLeadIds);
        }
      })
      .orderBy('attendance_regularizations.created_at', 'desc');

    const items = await query;
    return items;
  }

  async getHRPendingRequests(ctx: TenantContext) {
    const orgId = ctx.organizationId || ctx.companyId || 8;

    const query = db('attendance_regularizations')
      .select('attendance_regularizations.*')
      .select(
        'employees.first_name as employee_first_name',
        'employees.last_name as employee_last_name',
        'employees.employee_code as employee_code',
        'departments.name as department_name'
      )
      .join('employees', 'attendance_regularizations.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .where((qb) => {
        qb.where('attendance_regularizations.organization_id', orgId)
          .orWhere('attendance_regularizations.company_id', orgId);
      })
      .whereIn('attendance_regularizations.status', ['pending_hr', 'manager_approved', 'pending_manager', 'pending'])
      .orderBy('attendance_regularizations.created_at', 'desc');

    const items = await query;
    return items;
  }

  async getAdminLogs(ctx: TenantContext, options: {
    startDate?: string;
    endDate?: string;
    employeeId?: number;
    status?: string;
    companyId?: number;
    search?: string;
  }) {
    const orgId = options.companyId || ctx.companyId || ctx.organizationId || 8;

    const query = db('attendance_regularizations')
      .select('attendance_regularizations.*')
      .select(
        'employees.first_name as employee_first_name',
        'employees.last_name as employee_last_name',
        'employees.employee_code as employee_code',
        'departments.name as department_name'
      )
      .join('employees', 'attendance_regularizations.employee_id', 'employees.id')
      .leftJoin('departments', 'employees.current_department_id', 'departments.id')
      .where((qb) => {
        qb.where('attendance_regularizations.organization_id', orgId)
          .orWhere('attendance_regularizations.company_id', orgId);
      });

    if (options.employeeId) {
      query.andWhere('attendance_regularizations.employee_id', options.employeeId);
    }
    if (options.status) {
      query.andWhere('attendance_regularizations.status', options.status);
    }
    if (options.startDate) {
      query.andWhere('attendance_regularizations.request_date', '>=', options.startDate);
    }
    if (options.endDate) {
      query.andWhere('attendance_regularizations.request_date', '<=', options.endDate);
    }
    if (options.search) {
      query.andWhere((qb) => {
        qb.where('employees.first_name', 'like', `%${options.search}%`)
          .orWhere('employees.last_name', 'like', `%${options.search}%`)
          .orWhere('employees.employee_code', 'like', `%${options.search}%`)
          .orWhere('attendance_regularizations.reason', 'like', `%${options.search}%`);
      });
    }

    query.orderBy('attendance_regularizations.created_at', 'desc');

    const items = await query;
    return items;
  }

  async getByRecord(ctx: TenantContext, recordId: number): Promise<AttendanceRegularization | null> {
    return this.query(ctx).where('attendance_record_id', recordId).first() as Promise<AttendanceRegularization | null>;
  }

  protected override applySoftDeleteFilter(query: any, filter: any): any {
    return query;
  }

  protected override getSearchableFields(): string[] {
    return ['reason', 'comment'];
  }
}
