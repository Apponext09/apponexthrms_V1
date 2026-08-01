import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { getKnex } from '../../../db/knex';

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
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn' | 'pending_manager' | 'pending_hr' | 'pending_hr_override';
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
  lop_days?: number;
  pool_leave_type_id?: number | null;
  l1_approved_by?: number | null;
  l1_approval_date?: string | null;
  l2_approved_by?: number | null;
  l2_approval_date?: string | null;
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
   * Get pending approvals for user (all submitted applications visible to manager)
   */
  async getPendingForApprover(ctx: TenantContext, approverId: number, options?: ListQueryOptions) {
    const db = getKnex();
    
    // 1. Get employee ID and roles for the approver
    const user = await db('users')
      .where({ id: approverId })
      .first();

    const employeeId = user ? (user.employee_id || (user as any).employeeId) : null;

    const employee = employeeId
      ? await db('employees')
          .where({ organization_id: ctx.organizationId, id: employeeId })
          .whereNull('deleted_at')
          .first()
      : null;

    // 2. Build the set of subordinate employee IDs this user can approve for
    let subordinateIds: number[] = [];

    // 2a. Direct reports (employees whose reporting_manager_id = this employee)
    if (employee) {
      const directReports = await db('employees')
        .where({ organization_id: ctx.organizationId, reporting_manager_id: employee.id })
        .whereNull('deleted_at')
        .select('id');
      subordinateIds = directReports.map((r: any) => Number(r.id));
    }
      
    const userRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', approverId)
      .select('roles.code');
      
    const roles = userRoles.map((r: any) => r.code);
    const isHrOrAdmin = roles.includes('hr_manager') || roles.includes('tenant_admin') || roles.includes('system_admin') || roles.includes('organization_admin');
    const isDeptHead = roles.includes('department_head');

    // 2b. Department employees for department_head role users
    if (isDeptHead && employee) {
      const deptId = employee.currentDepartmentId || employee.current_department_id;
      if (deptId) {
        const deptEmployees = await db('employees')
          .where({ organization_id: ctx.organizationId, current_department_id: deptId })
          .whereNull('deleted_at')
          .whereNot('id', employee.id) // exclude self
          .select('id');
        const deptIds = deptEmployees.map((r: any) => Number(r.id));
        // Merge without duplicates
        subordinateIds = [...new Set([...subordinateIds, ...deptIds])];
      }
    }

    // 2c. For managers (non-department_head): also include 2nd-tier reports (employees who report to this manager's direct TLs)
    if (employee && !isDeptHead) {
      const secondTierReports = await db('employees')
        .where({ organization_id: ctx.organizationId })
        .whereIn('reporting_manager_id', subordinateIds.length > 0 ? subordinateIds : [-1])
        .whereNull('deleted_at')
        .select('id');
      const secondTierIds = secondTierReports.map((r: any) => Number(r.id));
      subordinateIds = [...new Set([...subordinateIds, ...secondTierIds])];
    }

    const setting = await db('organization_settings')
      .where('organization_id', ctx.organizationId)
      .where('setting_key', 'LEAVE_APPROVAL_LEVELS')
      .whereNull('deleted_at')
      .first();
    const rawVal = setting ? (setting.settingValue !== undefined ? setting.settingValue : setting.setting_value) : null;
    const approvalLevels = rawVal !== null && rawVal !== undefined ? parseInt(String(rawVal), 10) : 2;

    // Build base query manually to support complex ORs for subordinates
    const query = db('leave_applications')
      .leftJoin('employees', 'leave_applications.employee_id', 'employees.id')
      .leftJoin('leave_types', 'leave_applications.leave_type_id', 'leave_types.id')
      .where('leave_applications.organization_id', ctx.organizationId)
      .whereNull('leave_applications.deleted_at')
      .select(
        'leave_applications.*', 
        'employees.first_name as employeeFirstName', 
        'employees.last_name as employeeLastName', 
        'employees.employee_code as employeeCode', 
        'leave_types.leave_name as leaveTypeName'
      );

    // Apply visibility filters based on approval level setting and user role
    const isManagerOrTL = isDeptHead || roles.includes('team_lead') || roles.includes('manager');
    const isPureAdmin = isHrOrAdmin && !isManagerOrTL;

    if (approvalLevels === 1) {
      // ONE-STAGE: Only TL/Manager/DeptHead approves.
      // Manager/TL/DeptHead sees pending_manager for their subordinates.
      // HR/Admin sees pending_hr (which is Manager leaves) in one-stage.
      query.where((builder) => {
        let conditionsAdded = false;
        if (isHrOrAdmin) {
          builder.whereIn('leave_applications.status', ['pending_hr', 'pending_hr_override', 'escalated']);
          conditionsAdded = true;
        }
        if (subordinateIds.length > 0) {
          if (conditionsAdded) {
            builder.orWhere((subBuilder) => {
              subBuilder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                        .whereIn('leave_applications.employee_id', subordinateIds);
            });
          } else {
            builder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                   .whereIn('leave_applications.employee_id', subordinateIds);
            conditionsAdded = true;
          }
        }
        if (conditionsAdded) {
          builder.orWhere((subBuilder) => {
            subBuilder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                      .where('leave_applications.delegated_to_user_id', approverId);
          });
        } else {
          builder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                 .where('leave_applications.delegated_to_user_id', approverId);
          conditionsAdded = true;
        }
      });
    } else {
      // TWO-STAGE: Manager approves first, then HR/Admin approves.
      query.where((builder) => {
        let conditionsAdded = false;
        if (isHrOrAdmin) {
          builder.whereIn('leave_applications.status', ['pending_hr', 'pending_hr_override', 'escalated']);
          conditionsAdded = true;
        }
        if (subordinateIds.length > 0) {
          if (conditionsAdded) {
            builder.orWhere((subBuilder) => {
              subBuilder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                        .whereIn('leave_applications.employee_id', subordinateIds);
            });
          } else {
            builder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                   .whereIn('leave_applications.employee_id', subordinateIds);
            conditionsAdded = true;
          }
        }
        if (conditionsAdded) {
          builder.orWhere((subBuilder) => {
            subBuilder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                      .where('leave_applications.delegated_to_user_id', approverId);
          });
        } else {
          builder.whereIn('leave_applications.status', ['submitted', 'pending_manager', 'escalated'])
                 .where('leave_applications.delegated_to_user_id', approverId);
          conditionsAdded = true;
        }
      });
    }

    // Pagination
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    
    const countQuery = query.clone().clearSelect().count('* as total');
    const totalRes = await countQuery;
    const total = Number(totalRes[0]?.total || 0);
    
    query.orderBy('leave_applications.created_at', 'desc').limit(pageSize).offset((page - 1) * pageSize);
    const items = await query;
    
    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total
      }
    };
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

  /**
   * Get processed approvals (history) for user (approved/rejected applications visible to manager)
   */
  async getHistoryForApprover(ctx: TenantContext, approverId: number, options?: ListQueryOptions) {
    const db = getKnex();
    
    // 1. Get employee ID and roles for the approver
    const user = await db('users')
      .where({ id: approverId })
      .first();

    const employeeId = user ? (user.employee_id || (user as any).employeeId) : null;

    const employee = employeeId
      ? await db('employees')
          .where({ organization_id: ctx.organizationId, id: employeeId })
          .whereNull('deleted_at')
          .first()
      : null;

    // 2. Build the set of subordinate employee IDs this user can approve for
    let subordinateIds: number[] = [];

    // 2a. Direct reports
    if (employee) {
      const directReports = await db('employees')
        .where({ organization_id: ctx.organizationId, reporting_manager_id: employee.id })
        .whereNull('deleted_at')
        .select('id');
      subordinateIds = directReports.map((r: any) => Number(r.id));
    }
      
    const userRoles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', approverId)
      .select('roles.code');
      
    const roles = userRoles.map((r: any) => r.code);
    const isHrOrAdmin = roles.includes('hr_manager') || roles.includes('tenant_admin') || roles.includes('system_admin') || roles.includes('organization_admin');
    const isDeptHead = roles.includes('department_head');

    // 2b. Department employees for department_head
    if (isDeptHead && employee) {
      const deptId = employee.currentDepartmentId || employee.current_department_id;
      if (deptId) {
        const deptEmployees = await db('employees')
          .where({ organization_id: ctx.organizationId, current_department_id: deptId })
          .whereNull('deleted_at')
          .whereNot('id', employee.id)
          .select('id');
        const deptIds = deptEmployees.map((r: any) => Number(r.id));
        subordinateIds = [...new Set([...subordinateIds, ...deptIds])];
      }
    }

    // 2c. 2nd-tier reports for managers
    if (employee && !isDeptHead) {
      const secondTierReports = await db('employees')
        .where({ organization_id: ctx.organizationId })
        .whereIn('reporting_manager_id', subordinateIds.length > 0 ? subordinateIds : [-1])
        .whereNull('deleted_at')
        .select('id');
      const secondTierIds = secondTierReports.map((r: any) => Number(r.id));
      subordinateIds = [...new Set([...subordinateIds, ...secondTierIds])];
    }

    const query = db('leave_applications')
      .leftJoin('employees', 'leave_applications.employee_id', 'employees.id')
      .leftJoin('leave_types', 'leave_applications.leave_type_id', 'leave_types.id')
      .where('leave_applications.organization_id', ctx.organizationId)
      .whereNull('leave_applications.deleted_at')
      .select(
        'leave_applications.*', 
        'employees.first_name as employeeFirstName', 
        'employees.last_name as employeeLastName', 
        'employees.employee_code as employeeCode', 
        'leave_types.leave_name as leaveTypeName'
      );

    // Filter to only processed approvals (history)
    query.whereIn('leave_applications.status', ['approved', 'rejected']);

    // Subordinate restriction for managers/TLs/DeptHeads
    if (!isHrOrAdmin && subordinateIds.length > 0) {
      query.whereIn('leave_applications.employee_id', subordinateIds);
    } else if (!isHrOrAdmin) {
      query.where('leave_applications.id', -1);
    }

    // Pagination
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const data = await query.orderBy('leave_applications.updated_at', 'desc').limit(pageSize).offset(offset);

    return data;
  }
}
