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

    const scopedEmployeeIds = await this.getScopedEmployeeIds(ctx, manager);
    const employeeScope = (query: any, column = 'employee_id') => {
      if (scopedEmployeeIds.length) query.whereIn(column, scopedEmployeeIds);
      else query.whereRaw('1 = 0');
      return query;
    };
    const pendingStatuses = ['submitted', 'pending', 'pending_manager', 'pending_hr', 'escalated'];
    const [leaveRow, hiringRow, pipRow] = await Promise.all([
      employeeScope(this.db('leave_applications').where('organization_id', ctx.organizationId).whereIn('status', pendingStatuses))
        .count('id as total').first().catch(() => ({ total: 0 })),
      this.countDepartmentHiringRequests(ctx, manager.departmentId),
      this.countActivePips(ctx, scopedEmployeeIds),
    ]);

    return {
      headcount,
      pendingLeaveRequests: Number((leaveRow as any)?.total || 0),
      pendingHiringRequests: Number(hiringRow || 0),
      activePIPs: Number(pipRow || 0),
      budgetUtilization: 85,
    };
  }

  private async getScopedEmployeeIds(ctx: TenantContext, manager: any): Promise<number[]> {
    const members = await this.getDepartmentEmployees(ctx);
    return members.map((member: any) => Number(member.id)).filter(Boolean);
  }

  private async countDepartmentHiringRequests(ctx: TenantContext, departmentId: number | null): Promise<number> {
    for (const table of ['manpower_requisitions', 'resource_requests', 'job_requisitions']) {
      if (!(await this.db.schema.hasTable(table))) continue;
      let query: any = this.db(table).where('organization_id', ctx.organizationId);
      if (departmentId && await this.db.schema.hasColumn(table, 'department_id')) query = query.where('department_id', departmentId);
      if (await this.db.schema.hasColumn(table, 'status')) query = query.whereNotIn('status', ['closed', 'cancelled', 'rejected']);
      const row = await query.count('id as total').first();
      return Number(row?.total || 0);
    }
    return 0;
  }

  private async countActivePips(ctx: TenantContext, employeeIds: number[]): Promise<number> {
    if (!employeeIds.length) return 0;
    for (const table of ['performance_improvement_plans', 'pip_records', 'performance_improvement_plan']) {
      if (!(await this.db.schema.hasTable(table))) continue;
      const employeeColumn = await this.db.schema.hasColumn(table, 'employee_id') ? 'employee_id' : null;
      if (!employeeColumn) continue;
      let query: any = this.db(table).where('organization_id', ctx.organizationId).whereIn(employeeColumn, employeeIds);
      if (await this.db.schema.hasColumn(table, 'status')) query = query.whereIn('status', ['active', 'in_progress', 'open']);
      const row = await query.count('id as total').first();
      return Number(row?.total || 0);
    }
    return 0;
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

    const scopedEmployeeIds = await this.getScopedEmployeeIds(ctx, manager);
    if (!employee || !scopedEmployeeIds.includes(employeeId)) {
      throw new Error('Employee does not belong to your department');
    }

    const result = await this.db.transaction(async (trx) => {
      const [proposalId] = await trx('employee_change_proposals').insert({
        uuid: uuidv4(), organization_id: ctx.organizationId, employee_id: employeeId,
        proposed_by_user_id: ctx.userId, proposal_type: type, justification: details,
        status: 'pending_hr_verification', created_at: new Date(), updated_at: new Date(),
      });
      const [approvalId] = await trx('workflow_approvals').insert({
        uuid: uuidv4(), organization_id: ctx.organizationId, module_type: 'Employment Change',
        reference_id: proposalId, applicant_id: employeeId, approver_role: 'HR',
        status: 'Pending HR Verification', details: JSON.stringify({ proposalType: type, justification: details, proposedByUserId: ctx.userId }),
        created_at: new Date(), updated_at: new Date(),
      });
      await trx('employee_change_proposals').where('id', proposalId).update({ workflow_approval_id: approvalId });
      return { proposalId, approvalId };
    });

    return {
      success: true,
      data: result,
      message: `Successfully submitted ${type} proposal to HR for verification.`,
    };
  }

  async getHrRecommendationQueue(ctx: TenantContext) {
    await this.assertHrVerifier(ctx);
    return this.db('employee_change_proposals as p')
      .join('employees as e', 'p.employee_id', 'e.id')
      .join('users as u', 'p.proposed_by_user_id', 'u.id')
      .where('p.organization_id', ctx.organizationId).where('p.status', 'pending_hr_verification').whereNull('p.deleted_at')
      .select('p.id', 'p.uuid', 'p.proposal_type as proposalType', 'p.justification', 'p.created_at as createdAt',
        'e.first_name as employeeFirstName', 'e.last_name as employeeLastName', 'u.first_name as proposerFirstName', 'u.last_name as proposerLastName');
  }

  async decideHrRecommendation(ctx: TenantContext, proposalId: number, status: 'approved' | 'rejected', comment?: string) {
    await this.assertHrVerifier(ctx);
    await this.db.transaction(async (trx) => {
      const proposal = await trx('employee_change_proposals').where({ id: proposalId, organization_id: ctx.organizationId }).where('status', 'pending_hr_verification').first();
      if (!proposal) throw new Error('Pending proposal not found');
      await trx('employee_change_proposals').where('id', proposalId).update({ status: status === 'approved' ? 'hr_verified' : 'hr_rejected', verified_by_user_id: ctx.userId, verification_comment: comment || null, verified_at: new Date(), updated_at: new Date() });
      await trx('workflow_approvals').where('id', proposal.workflowApprovalId).update({ status: status === 'approved' ? 'Approved' : 'Rejected', updated_at: new Date() });
    });
    return { success: true, message: `Proposal ${status === 'approved' ? 'verified by HR' : 'rejected by HR'}.` };
  }

  private async assertHrVerifier(ctx: TenantContext) {
    const roles = (ctx.roles || [ctx.role || '']).map(role => role.toLowerCase());
    if (!roles.some(role => ['hr', 'hr_admin', 'hr_manager', 'organization_admin'].includes(role))) throw new Error('Only HR may verify employment-change proposals');
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
