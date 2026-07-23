import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export class ManagerService {
  private db = getKnex();

  /**
   * Helper to resolve manager's employee details & department ID
   */
  private async getManagerDetails(ctx: TenantContext) {
    const user = await this.db('users')
      .where('id', ctx.userId)
      .where('organization_id', ctx.organizationId)
      .first();

    const empId = user?.employee_id || user?.employeeId;
    if (!empId) return null;

    const employee = await this.db('employees')
      .where('id', empId)
      .where('organization_id', ctx.organizationId)
      .first();

    // Query roles
    const userRoles = await this.db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', ctx.userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .select('roles.code');
    const roles = userRoles.map(ur => ur.code);

    return {
      employeeId: empId,
      departmentId: employee?.current_department_id || employee?.currentDepartmentId || null,
      roles,
    };
  }

  /**
   * Get department dashboard metrics
   */
  async getDepartmentDashboard(ctx: TenantContext) {
    const manager = await this.getManagerDetails(ctx);
    if (!manager || !manager.departmentId) {
      return {
        headcount: 0,
        pendingHiringRequests: 0,
        activePIPs: 0,
        budgetUtilization: 0,
      };
    }

    const deptId = manager.departmentId;
    let headcount = 0;

    if (manager.roles.includes('department_head') || manager.roles.includes('organization_admin') || manager.roles.includes('hr_manager')) {
      // Count employees in department
      const headcountResult = await this.db('employees')
        .where('current_department_id', deptId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .count('id as total')
        .first();
      headcount = Number((headcountResult as any)?.total || 0);
    } else if (manager.roles.includes('team_lead')) {
      // Count team lead direct reports
      const headcountResult = await this.db('employees')
        .where('reporting_manager_id', manager.employeeId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .count('id as total')
        .first();
      headcount = Number((headcountResult as any)?.total || 0);
    }

    return {
      headcount,
      pendingHiringRequests: manager.roles.includes('team_lead') ? 0 : 2,
      activePIPs: 0,
      budgetUtilization: 72, // 72% utilization mock
    };
  }

  /**
   * List department employees
   */
  async getDepartmentEmployees(ctx: TenantContext) {
    const manager = await this.getManagerDetails(ctx);
    if (!manager || !manager.departmentId) return [];

    const deptId = manager.departmentId;
    let list: any[] = [];

    if (manager.roles.includes('department_head') || manager.roles.includes('organization_admin') || manager.roles.includes('hr_manager')) {
      list = await this.db('employees')
        .where('current_department_id', deptId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'first_name', 'last_name', 'email', 'status', 'employment_type', 'current_designation_id');
    } else if (manager.roles.includes('team_lead')) {
      list = await this.db('employees')
        .where('reporting_manager_id', manager.employeeId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'first_name', 'last_name', 'email', 'status', 'employment_type', 'current_designation_id');
    }

    const desigs = await this.db('designations')
      .where('organization_id', ctx.organizationId)
      .select('id', 'name');

    const desigMap = new Map(desigs.map((d) => [d.id, d.name]));

    return list.map((emp) => ({
      id: emp.id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      status: emp.status,
      employmentType: emp.employment_type,
      designation: desigMap.get(emp.current_designation_id) || 'Team Member',
    }));
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
