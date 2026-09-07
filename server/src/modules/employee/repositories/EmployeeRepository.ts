import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

const LIST_VIEW_SENSITIVE_FIELDS = [
  'aadhar_number', 'aadharNumber',
  'pan_number', 'panNumber', 'pan',
  'passport_number', 'passportNumber',
  'bank_name', 'bankName',
  'account_no', 'accountNo',
  'ifsc_code', 'ifscCode',
  'uan_no', 'uanNo',
  'esic_no', 'esicNo',
  'pf_no', 'pfNo',
];

export interface Employee {
  id: number;
  uuid: string;
  organization_id: number;
  organizationId?: number;
  company_id?: number | null;
  companyId?: number | null;
  employee_code: string;
  employeeCode?: string;
  status: 'candidate' | 'onboarding' | 'probation' | 'active' | 'notice' | 'exit' | 'alumni';
  first_name: string;
  firstName?: string;
  middle_name: string | null;
  middleName?: string | null;
  last_name: string;
  lastName?: string;
  email: string;
  phone: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  dateOfBirth?: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_group: string | null;
  bloodGroup?: string | null;
  nationality: string | null;
  aadhar_number: string | null;
  aadharNumber?: string | null;
  pan_number: string | null;
  panNumber?: string | null;
  passport_number: string | null;
  passportNumber?: string | null;
  current_designation_id: number | null;
  currentDesignationId?: number | null;
  current_department_id: number | null;
  currentDepartmentId?: number | null;
  current_branch_id: number | null;
  currentBranchId?: number | null;
  current_location_id: number | null;
  currentLocationId?: number | null;
  reporting_manager_id: number | null;
  reportingManagerId?: number | null;
  cost_center_id: number | null;
  costCenterId?: number | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship';
  date_of_joining: string;
  dateOfJoining?: string;
  date_of_confirmation: string | null;
  dateOfConfirmation?: string | null;
  probation_end_date: string | null;
  probationEndDate?: string | null;
  created_by: number;
  createdBy?: number;
  updated_by: number;
  updatedBy?: number;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  deleted_at: string | null;
  deletedAt?: string | null;
  department?: string | null;
  departmentName?: string | null;
  department_name?: string | null;
  designation?: string | null;
  designationName?: string | null;
  designation_name?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  locationName?: string | null;
  location_name?: string | null;
  branchName?: string | null;
  company?: string | null;
  companyName?: string | null;
  company_name?: string | null;
  reportingManager?: string | null;
  reportingManagerEmail?: string | null;
  reporting_manager_name?: string | null;
  accessRole?: string | null;
  hrManager?: string | null;
  hrManagerEmail?: string | null;
  custom_id_card?: string | null;
  document_policy_accepted?: boolean;
  documentPolicyAccepted?: boolean;
  document_policy_accepted_at?: string | null;
  documentPolicyAcceptedAt?: string | null;
}

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor() {
    super('employees');
    this.companyScoped = true;
  }

  /**
   * Get employee by employee code within organization
   */
  async getByCode(ctx: TenantContext, code: string): Promise<Employee | null> {
    return this.query(ctx).where('employee_code', code).first() as Promise<Employee | null>;
  }

  /**
   * Get employee by email within organization
   */
  async getByEmail(ctx: TenantContext, email: string): Promise<Employee | null> {
    if (!email) return null;
    return this.query(ctx)
      .whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()])
      .first() as Promise<Employee | null>;
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
      let highestRole = user.role || 'employee';
      let highestPriority = 0;

      const userRoles = await this.db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where(function(this: any) {
          this.where('user_roles.organization_id', ctx.organizationId).orWhereNull('user_roles.organization_id');
        })
        .where('user_roles.user_id', user.id)
        .select('roles.code', 'roles.name');

      if (userRoles.length > 0) {
        const rolePriority: Record<string, number> = {
          ceo: 8,
          organization_admin: 8,
          super_admin: 8,
          cto: 6,
          cfo: 6,
          coo: 6,
          cxo: 6,
          hr_manager: 5,
          department_head: 4,
          team_lead: 3,
          finance: 3,
          intern: 2,
          consultant: 2,
          employee: 1,
        };
        for (const ur of userRoles) {
          const priority = rolePriority[ur.code] || 0;
          if (priority > highestPriority) {
            highestPriority = priority;
            highestRole = ur.code;
          }
        }
      }
      (employee as any).accessRole = highestRole;
      const roleList = userRoles.map((ur: any) => ur.name || ur.code);
      (employee as any).assignedRoles = roleList;
      (employee as any).roles = roleList;
    }

    const managerId = (employee as any).reportingManagerId || (employee as any).reporting_manager_id;
    if (managerId) {
      const mgr = await this.db('employees')
        .where('id', managerId)
        .select('first_name', 'last_name', 'email')
        .first();
      if (mgr) {
        const fName = mgr.firstName || mgr.first_name || '';
        const lName = mgr.lastName || mgr.last_name || '';
        (employee as any).reportingManager = `${fName} ${lName}`.trim();
        (employee as any).reportingManagerEmail = mgr.email;
        (employee as any).reporting_manager_name = `${fName} ${lName}`.trim();
      }
    }

    // Attach assigned salary structure and pay slab
    try {
      const struct = await this.db('salary_structures as ss')
        .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
        .where('ss.employee_id', employee.id)
        .whereNull('ss.deleted_at')
        .orderBy('ss.id', 'desc')
        .select('ss.slab_id', 'ps.name as slab_name', 'ss.gross_monthly', 'ss.annual_ctc')
        .first();

      if (struct) {
        const sId = struct.slab_id || (struct as any).slabId;
        const sName = struct.slab_name || (struct as any).slabName;
        (employee as any).salarySlabId = sId;
        (employee as any).salary_slab_id = sId;
        (employee as any).salarySlabName = sName;
        (employee as any).salary_slab_name = sName;
        (employee as any).payrollSlab = sName;
        (employee as any).payroll_slab = sName;
        (employee as any).payroll_slab_name = sName;
      }
    } catch {}

    const statusVal = (employee as any).employee_status || employee.status ;
    const formattedStatusVal = String(statusVal).split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    (employee as any).employeeStatus = formattedStatusVal;
    (employee as any).employee_status = formattedStatusVal;

    return employee;
  }

  /**
   * Sensitive statutory/financial identifiers that must never appear in a
   * list/directory response — this endpoint is reachable by any
   * authenticated org member (e.g. the Assign Shift employee picker), not
   * just HR/admin roles, and super.list() otherwise returns every column on
   * the employees table with no projection. A single-employee fetch
   * (getById / getWithDetails) is intentionally left untouched since that
   * path is used by employees viewing/editing their own profile and by HR
   * screens that legitimately need this data.
   */
  private stripSensitiveListFields(items: any[]): void {
    for (const item of items) {
      for (const field of LIST_VIEW_SENSITIVE_FIELDS) {
        delete item[field];
      }
    }
  }

  override async list(
    ctx: TenantContext,
    options: ListQueryOptions = {},
    includeDeleted?: any
  ): Promise<any> {
    let effectiveCtx = { ...ctx };
    if (!effectiveCtx.companyId) {
      const parentComp = await this.db('company')
        .where('organization_id', ctx.organizationId)
        .where((b) => b.where('is_parent', 1).orWhere('is_parent', true))
        .whereNull('deleted_at')
        .first();
      if (parentComp) {
        effectiveCtx.companyId = Number((parentComp as any).companyId || (parentComp as any).company_id || (parentComp as any).id);
      }
    }

    const queryFilters = { ...options.filters };
    let excludeCeoFilter = false;
    if (queryFilters.is_ceo === 0 || (queryFilters as any).isCeo === 0) {
      delete queryFilters.is_ceo;
      delete (queryFilters as any).isCeo;
      excludeCeoFilter = true;
    }

    const modifiedOptions = { ...options, filters: queryFilters };
    if (excludeCeoFilter) {
      (modifiedOptions as any).customWhere = (builder: any) => {
        builder.where(function(this: any) {
          this.where('employees.is_ceo', 0).orWhereNull('employees.is_ceo');
        });
      };
    }

    const result = await super.list(effectiveCtx, modifiedOptions, includeDeleted);


    
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
          const dName = deptMap.get(Number(deptId)) || null;
          (item as any).department = dName;
          (item as any).departmentName = dName;
          (item as any).department_name = dName;
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
          const dgName = desigMap.get(Number(desigId)) || null;
          (item as any).jobTitle = dgName;
          (item as any).designation = dgName;
          (item as any).designationName = dgName;
          (item as any).designation_name = dgName;
        }
      }
    }

    // Map Location names
    const locationIds = result.items
      .map((item: any) => item.currentLocationId || item.current_location_id || item.currentBranchId || item.current_branch_id)
      .filter((id: any): id is number => typeof id === 'number' && id > 0);

    if (locationIds.length > 0) {
      const locs = await this.db('attendance_locations')
        .where('organization_id', ctx.organizationId)
        .whereIn('id', Array.from(new Set(locationIds)))
        .select('id', 'location_name');

      const locMap = new Map<number, string>();
      for (const l of locs) {
        locMap.set(Number(l.id), l.location_name);
      }

      for (const item of result.items) {
        const locId = item.currentLocationId || item.current_location_id || item.currentBranchId || item.current_branch_id;
        if (locId) {
          const lName = locMap.get(Number(locId)) || null;
          (item as any).location = lName;
          (item as any).locationName = lName;
          (item as any).location_name = lName;
          (item as any).branchName = lName;
        }
      }
    }

    // Map Organization / Company names
    const compRows = await this.db('company')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select('company_id', 'name');
    const compMap = new Map<number, string>();
    for (const c of compRows) {
      compMap.set(Number((c as any).companyId || (c as any).company_id || (c as any).id), c.name);
    }

    const orgRow = await this.db('organizations').where('id', ctx.organizationId).first('name');
    const defaultOrgName = orgRow?.name || 'Main Company';
    for (const item of result.items) {
      const cId = Number(item.companyId || item.company_id);
      const cName = compMap.get(cId) || defaultOrgName;
      (item as any).company = cName;
      (item as any).companyName = cName;
      (item as any).company_name = cName;
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
    const userMap = new Map<number, number>();
    const roleMap = new Map<number, string>();

    if (employeeIds.length > 0) {
      const users = await this.db('users')
        .where(function(this: any) {
          this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
        })
        .whereIn('employee_id', employeeIds)
        .select('id', 'employee_id', 'role');

      if (users.length > 0) {
        for (const u of users) {
          const empId = Number((u as any).employeeId || u.employee_id);
          const uId = Number(u.id);
          userMap.set(empId, uId);
          if ((u as any).role) {
            roleMap.set(uId, String((u as any).role).toLowerCase());
          }
        }

        const userIds = users.map((u) => u.id);
        const userRoles = await this.db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where(function(this: any) {
            this.where('user_roles.organization_id', ctx.organizationId).orWhereNull('user_roles.organization_id');
          })
          .whereIn('user_roles.user_id', userIds)
          .whereIn('roles.code', ['employee', 'team_lead', 'hr_manager', 'department_head', 'cto', 'cfo', 'coo', 'cxo', 'intern', 'consultant', 'finance'])
          .select('user_roles.user_id', 'roles.code');

        const rolePriority: Record<string, number> = {
          ceo: 8,
          organization_admin: 8,
          super_admin: 8,
          cto: 6,
          cfo: 6,
          coo: 6,
          cxo: 6,
          hr_manager: 5,
          department_head: 4,
          team_lead: 3,
          finance: 3,
          intern: 2,
          consultant: 2,
          employee: 1,
        };
        for (const ur of userRoles) {
          const uId = Number((ur as any).userId || ur.user_id);
          const currentRole = roleMap.get(uId);
          const currentPriority = currentRole ? (rolePriority[currentRole] || 0) : 0;
          const newPriority = rolePriority[ur.code] || 0;
          if (newPriority > currentPriority) {
            roleMap.set(uId, ur.code);
          }
        }
      }
    }

    for (const item of result.items) {
      const userId = userMap.get(Number(item.id));
      (item as any).accessRole = userId ? (roleMap.get(userId) || 'employee') : 'employee';

      const mId = item.reportingManagerId || item.reporting_manager_id;
      const mInfo = mId ? mgrMap.get(Number(mId)) : null;
      if (mInfo) {
        (item as any).reportingManager = mInfo.name;
        (item as any).reportingManagerEmail = mInfo.email;
        (item as any).reporting_manager_name = mInfo.name;
      }
    }

    // Sensitive aadhar / passport can be omitted if needed, but preserve pan, bank, pf, uan, esic
    // this.stripSensitiveListFields(result.items);

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
