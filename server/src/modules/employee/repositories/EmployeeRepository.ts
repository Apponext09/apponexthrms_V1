import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Employee {
  id: number;
  uuid: string;
  organization_id: number;
  employee_code: string;
  status: 'candidate' | 'onboarding' | 'probation' | 'active' | 'notice' | 'exit' | 'alumni';
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_group: string | null;
  nationality: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  passport_number: string | null;
  current_designation_id: number | null;
  current_department_id: number | null;
  current_branch_id: number | null;
  current_location_id: number | null;
  reporting_manager_id: number | null;
  cost_center_id: number | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  date_of_joining: string;
  date_of_confirmation: string | null;
  probation_end_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  department?: string | null;
  custom_id_card?: string | null;
}

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor() {
    super('employees');
  }

  /**
   * Get employee by employee code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Employee | null> {
    return this.query(ctx).where('employee_code', code).first() as Promise<Employee | null>;
  }

  /**
   * Check if employee code is unique
   */
  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('employee_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  /**
   * Get employees by department
   */
  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { current_department_id: departmentId },
    });
  }

  /**
   * Get employees by manager (direct reports)
   */
  async getDirectReports(ctx: TenantContext, managerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { reporting_manager_id: managerId },
    });
  }

  /**
   * Get employees by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  override async getById(ctx: TenantContext, id: number | string): Promise<Employee | null> {
    const employee = await super.getById(ctx, id);
    if (!employee) return null;

    const deptId = (employee as any).currentDepartmentId || (employee as any).current_department_id;
    if (deptId) {
      const dept = await this.db('departments')
        .where('organization_id', ctx.organizationId)
        .where('id', deptId)
        .select('name')
        .first();
      if (dept) {
        (employee as any).department = dept.name;
      }
    }

    const desigId = (employee as any).currentDesignationId || (employee as any).current_designation_id;
    if (desigId) {
      const desig = await this.db('designations')
        .where('organization_id', ctx.organizationId)
        .where('id', desigId)
        .select('name')
        .first();
      if (desig) {
        (employee as any).jobTitle = desig.name;
        (employee as any).designation = desig.name;
      }
    }

    const user = await this.db('users')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employee.id)
      .first();
    if (user) {
      const userRoles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.organization_id', ctx.organizationId)
        .where('user_roles.user_id', user.id)
        .whereIn('roles.code', ['employee', 'team_lead', 'hr_manager', 'department_head'])
        .select('roles.code');
      if (userRoles.length > 0) {
        const rolePriority: Record<string, number> = {
          hr_manager: 4,
          department_head: 3,
          team_lead: 2,
          employee: 1,
        };
        let highestRole = 'employee';
        let highestPriority = 0;
        for (const ur of userRoles) {
          const priority = rolePriority[ur.code] || 0;
          if (priority > highestPriority) {
            highestPriority = priority;
            highestRole = ur.code;
          }
        }
        (employee as any).accessRole = highestRole;
      }
    }

    const managerId = (employee as any).reportingManagerId || (employee as any).reporting_manager_id;
    if (managerId) {
      const mgr = await this.db('employees')
        .where('id', managerId)
        .select('first_name', 'last_name', 'email')
        .first();
      if (mgr) {
        (employee as any).reportingManager = `${mgr.first_name} ${mgr.last_name}`;
        (employee as any).reportingManagerEmail = mgr.email;
        (employee as any).reporting_manager_name = `${mgr.first_name} ${mgr.last_name}`;
      }
    }
    if (!(employee as any).reportingManager) {
      (employee as any).reportingManager = 'Narendra Gaikwad (Senior Manager)';
      (employee as any).reportingManagerEmail = 'gaikwadnarendra316@gmail.com';
    }
    (employee as any).hrManager = 'John Doe (HR Manager)';
    (employee as any).hrManagerEmail = 'john.doe@example.com';

    return employee;
  }

  override async list(
    ctx: TenantContext,
    options: ListQueryOptions = {},
    includeDeleted?: any
  ): Promise<any> {
    const result = await super.list(ctx, options, includeDeleted);
    
    if (!result.items || result.items.length === 0) {
      return result;
    }

    const deptIds = result.items
      .map((item: any) => item.currentDepartmentId || item.current_department_id)
      .filter((id: any): id is number => typeof id === 'number' && id > 0);

    if (deptIds.length > 0) {
      const depts = await this.db('departments')
        .where('organization_id', ctx.organizationId)
        .whereIn('id', Array.from(new Set(deptIds)))
        .select('id', 'name');

      const deptMap = new Map<number, string>();
      for (const d of depts) {
        deptMap.set(Number(d.id), d.name);
      }

      for (const item of result.items) {
        const deptId = item.currentDepartmentId || item.current_department_id;
        if (deptId) {
          (item as any).department = deptMap.get(Number(deptId)) || null;
        }
      }
    }

    const desigIds = result.items
      .map((item: any) => item.currentDesignationId || item.current_designation_id)
      .filter((id: any): id is number => typeof id === 'number' && id > 0);

    if (desigIds.length > 0) {
      const desigs = await this.db('designations')
        .where('organization_id', ctx.organizationId)
        .whereIn('id', Array.from(new Set(desigIds)))
        .select('id', 'name');

      const desigMap = new Map<number, string>();
      for (const d of desigs) {
        desigMap.set(Number(d.id), d.name);
      }

      for (const item of result.items) {
        const desigId = item.currentDesignationId || item.current_designation_id;
        if (desigId) {
          (item as any).jobTitle = desigMap.get(Number(desigId)) || null;
          (item as any).designation = desigMap.get(Number(desigId)) || null;
        }
      }
    }

    // Map Manager names
    const mgrIds = result.items
      .map((item: any) => item.reportingManagerId || item.reporting_manager_id)
      .filter((id: any): id is number => typeof id === 'number' && id > 0);

    const mgrMap = new Map<number, { name: string; email: string }>();
    if (mgrIds.length > 0) {
      const mgrs = await this.db('employees')
        .whereIn('id', Array.from(new Set(mgrIds)))
        .select('id', 'first_name', 'last_name', 'email');
      for (const m of mgrs) {
        mgrMap.set(Number(m.id), { name: `${m.first_name} ${m.last_name}`, email: m.email });
      }
    }

    const employeeIds = result.items.map((item: any) => item.id);
    if (employeeIds.length > 0) {
      const users = await this.db('users')
        .where('organization_id', ctx.organizationId)
        .whereIn('employee_id', employeeIds)
        .select('id', 'employee_id');

      if (users.length > 0) {
        const userMap = new Map<number, number>();
        for (const u of users) {
          userMap.set(Number((u as any).employeeId || u.employee_id), Number(u.id));
        }

        const userIds = users.map((u) => u.id);
        const userRoles = await this.db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.organization_id', ctx.organizationId)
          .whereIn('user_roles.user_id', userIds)
          .whereIn('roles.code', ['employee', 'team_lead', 'hr_manager', 'department_head'])
          .select('user_roles.user_id', 'roles.code');

        const rolePriority: Record<string, number> = {
          hr_manager: 4,
          department_head: 3,
          team_lead: 2,
          employee: 1,
        };
        const roleMap = new Map<number, string>();
        for (const ur of userRoles) {
          const uId = Number((ur as any).userId || ur.user_id);
          const currentRole = roleMap.get(uId);
          const currentPriority = currentRole ? (rolePriority[currentRole] || 0) : 0;
          const newPriority = rolePriority[ur.code] || 0;
          if (newPriority > currentPriority) {
            roleMap.set(uId, ur.code);
          }
        }

        for (const item of result.items) {
          const userId = userMap.get(Number(item.id));
          if (userId) {
            (item as any).accessRole = roleMap.get(userId) || 'employee';
          } else {
            (item as any).accessRole = 'employee';
          }

          const mId = item.reportingManagerId || item.reporting_manager_id;
          const mInfo = mId ? mgrMap.get(Number(mId)) : null;
          (item as any).reportingManager = mInfo ? mInfo.name : 'Narendra Gaikwad (Senior Manager)';
          (item as any).reportingManagerEmail = mInfo ? mInfo.email : 'gaikwadnarendra316@gmail.com';
          (item as any).hrManager = 'John Doe (HR Manager)';
        }
      }
    }

    return result;
  }

  /**
   * Get employee with all related information
   */
  async getWithDetails(ctx: TenantContext, id: number | string): Promise<Employee | null> {
    return this.getById(ctx, id);
  }

  /**
   * Get searchable fields for list() method
   */
  protected getSearchableFields(): string[] {
    return ['employee_code', 'first_name', 'last_name', 'email', 'mobile', 'pan_number'];
  }

  /**
   * Get allowed columns for sorting
   */
  protected getAllowedSortColumns(): string[] {
    return [
      'id',
      'employee_code',
      'first_name',
      'last_name',
      'email',
      'status',
      'employment_type',
      'date_of_joining',
      'date_of_confirmation',
      'probation_end_date',
      'created_at',
      'updated_at',
      'organization_id',
    ];
  }
}
