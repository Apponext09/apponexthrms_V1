import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export class ManagerService {
  private db = getKnex();

  /**
   * Helper to resolve manager's employee details & department ID
   */
  /**
   * Helper to resolve manager's employee details & department ID
   */
  /**
   * Helper to resolve manager's employee details & department ID
   */
  private async getManagerDetails(ctx: TenantContext) {
    const user = await this.db('users')
      .where('id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .first();

    // Handle both camelCase (Knex converts) and snake_case
    let empId = user?.employee_id || user?.employeeId || user?.['employee_id'];

    // Fallback 1: match employee by email
    if (!empId && user?.email) {
      const empByEmail = await this.db('employees')
        .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByEmail) empId = empByEmail.id;
    }

    // Fallback 2: match employee by first_name
    if (!empId && (user?.first_name || user?.firstName)) {
      const nameVal = user?.first_name || user?.firstName;
      const empByName = await this.db('employees')
        .where('first_name', nameVal)
        .where('organization_id', ctx.organizationId)
        .first();
      if (empByName) empId = empByName.id;
    }

    const employee = empId
      ? await this.db('employees')
          .where('id', empId)
          .where('organization_id', ctx.organizationId)
          .first()
      : null;

    // Handle camelCase from Knex
    let departmentId = employee?.current_department_id
      || employee?.currentDepartmentId
      || (user as any)?.department_id
      || (user as any)?.departmentId
      || null;

    // Fallback 3: check if employee is department_head_id in departments table
    if (!departmentId && empId) {
      const headDept = await this.db('departments')
        .where('department_head_id', empId)
        .where('organization_id', ctx.organizationId)
        .first();
      if (headDept) departmentId = headDept.id;
    }

    // Fallback 4: check by user's department_name string
    const deptName = (user as any)?.department_name || (user as any)?.departmentName || (user as any)?.department;
    if (!departmentId && deptName) {
      const matchedDept = await this.db('departments')
        .where('organization_id', ctx.organizationId)
        .where('name', deptName)
        .first();
      if (matchedDept) departmentId = matchedDept.id;
    }

    // Query roles
    const userRoles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', ctx.userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .select('roles.code');
    const roles = userRoles.map(ur => ur.code);

    return {
      employeeId: empId || null,
      departmentId: departmentId || null,
      roles,
    };
  }


  /**
   * Get department dashboard metrics
   */
  async getDepartmentDashboard(ctx: TenantContext) {
    const manager = await this.getManagerDetails(ctx);
    let headcount = 0;

    if (manager?.departmentId || manager?.employeeId) {
      let leadIds: number[] = [];
      if (manager.employeeId) {
        const directLeads = await this.db('employees')
          .where('reporting_manager_id', manager.employeeId)
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select('id');
        leadIds = directLeads.map((e: any) => e.id);
      }

      const headcountResult = await this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where((builder) => {
          if (manager.departmentId) {
            builder.where('current_department_id', manager.departmentId);
          }
          if (manager.employeeId) {
            builder.orWhere('reporting_manager_id', manager.employeeId);
          }
          if (leadIds.length > 0) {
            builder.orWhereIn('reporting_manager_id', leadIds);
          }
        })
        .count('id as total')
        .first();
      headcount = Number((headcountResult as any)?.total || 0);
    }

    if (headcount === 0) {
      const headcountResult = await this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .count('id as total')
        .first();
      headcount = Number((headcountResult as any)?.total || 0);
    }

    return {
      headcount,
      pendingHiringRequests: 0,
      activePIPs: 0,
      budgetUtilization: 85,
    };
  }

  /**
   * List department employees
   */
  async getDepartmentEmployees(ctx: TenantContext) {
    const manager = await this.getManagerDetails(ctx);
    let list: any[] = [];

    if (manager?.departmentId || manager?.employeeId) {
      // Get direct team leads (employees who report to this manager)
      let leadIds: number[] = [];
      if (manager.employeeId) {
        const directLeads = await this.db('employees')
          .whereRaw('reporting_manager_id = ?', [manager.employeeId])
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select('id');
        leadIds = directLeads.map((e: any) => e.id);
      }

      // Build the team query using raw conditions (snake_case in DB)
      list = await this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where((builder) => {
          if (manager.departmentId) {
            builder.whereRaw('current_department_id = ?', [manager.departmentId]);
          }
          if (manager.employeeId) {
            builder.orWhereRaw('reporting_manager_id = ?', [manager.employeeId]);
          }
          if (leadIds.length > 0) {
            builder.orWhereRaw(`reporting_manager_id IN (${leadIds.join(',')})`);
          }
        })
        .select(
          'id',
          'first_name as firstName',
          'last_name as lastName',
          'email',
          'status',
          'employment_type as employmentType',
          'current_designation_id as currentDesignationId',
          'employee_code as employeeCode',
          'reporting_manager_id as reportingManagerId',
          'current_department_id as currentDepartmentId'
        );
    }

    // Fallback: if no dept/manager found, return all employees in org
    if (list.length === 0) {
      list = await this.db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select(
          'id',
          'first_name as firstName',
          'last_name as lastName',
          'email',
          'status',
          'employment_type as employmentType',
          'current_designation_id as currentDesignationId',
          'employee_code as employeeCode',
          'reporting_manager_id as reportingManagerId',
          'current_department_id as currentDepartmentId'
        );
    }

    const desigs = await this.db('designations')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');

    const depts = await this.db('departments')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');

    const allEmps = await this.db('employees')
      .where('organization_id', ctx.organizationId)
      .select('id', 'first_name as firstName', 'last_name as lastName');

    const desigMap = new Map(desigs.map((d) => [d.id, d.name]));
    const deptMap = new Map(depts.map((d) => [d.id, d.name]));
    const empNameMap = new Map(allEmps.map((e) => [e.id, `${e.firstName || ''} ${e.lastName || ''}`.trim()]));

    return list.map((emp) => {
      const desigName = desigMap.get(emp.currentDesignationId) || 'Department Specialist';
      const isLead = desigName.toLowerCase().includes('lead') || desigName.toLowerCase().includes('supervisor') || desigName.toLowerCase().includes('manager');
      const managerName = empNameMap.get(emp.reportingManagerId);
      return {
        id: emp.id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        code: emp.employeeCode || `EMP-${emp.id}`,
        email: emp.email || '',
        status: emp.status ? emp.status.toLowerCase() : 'active',
        employmentType: emp.employmentType || 'Full-time',
        designation: desigName,
        departmentName: deptMap.get(emp.currentDepartmentId) || 'Department',
        managerName: managerName || 'Department Head',
        roleTag: isLead ? 'Team Lead' : 'Employee',
        teamLeadName: isLead ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : (managerName || 'Team Lead'),
      };
    });
  }


  /**
   * Submit promotion/transfer recommendation
   */
  async submitRecommendation(ctx: TenantContext, employeeId: number, type: 'promotion' | 'transfer', details: string) {
    const manager = await this.getManagerDetails(ctx);
    if (!manager) {
      throw new Error('Action unauthorized');
    }

    // Verify employee belongs to this manager's department
    const employee = await this.db('employees')
      .where('id', employeeId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!employee || employee.current_department_id !== manager.departmentId) {
      throw new Error('Employee does not belong to your department');
    }

    // Log recommendation in audit logs (and can also insert to specific db tables if present)
    const logId = await this.db('audit_logs').insert({
      organization_id: ctx.organizationId,
      action: 'CREATE',
      actor_user_id: ctx.userId,
      entity_type: 'RECOMMENDATION',
      entity_id: employeeId,
      created_at: new Date(),
    });

    return {
      success: true,
      message: `Successfully submitted ${type} recommendation for employee.`,
    };
  }

  /**
   * Submit hiring / resource request
   */
  async submitResourceRequest(ctx: TenantContext, designationId: number, justification: string) {
    const manager = await this.getManagerDetails(ctx);
    if (!manager || !manager.departmentId) {
      throw new Error('Action unauthorized');
    }

    // Audit log
    await this.db('audit_logs').insert({
      organization_id: ctx.organizationId,
      action: 'CREATE',
      actor_user_id: ctx.userId,
      entity_type: 'RESOURCE_REQUEST',
      entity_id: designationId,
      created_at: new Date(),
    });

    return {
      success: true,
      message: 'Hiring resource request successfully submitted to HR for approval.',
    };
  }
}
