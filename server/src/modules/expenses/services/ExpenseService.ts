import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { ExpenseDbService } from './ExpenseDbService';
import { ExpenseConfigService, type ExpenseConfig } from './ExpenseConfigService';

export interface ExpenseItemInput {
  categoryId?: number;
  expenseDate: string;
  claimedAmount: number;
  merchantName?: string;
  description?: string;
  projectCostCenter?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptFileSize?: number;
  employeeJustification?: string;
}

export interface ClaimInput {
  title: string;
  claimDate: string;
  categoryId?: number;
  paymentMethod?: string;
  merchantName?: string;
  description?: string;
  projectCostCenter?: string;
  receiptUrl?: string;
  travelRequestId?: number;
  travelAdvanceId?: number;
  isDraft?: boolean;
  items?: ExpenseItemInput[];
}

export class ExpenseService {
  private async ensureInitialized(orgId: number) {
    await ExpenseDbService.ensureTablesAndSeed(orgId);
    const db = getKnex();

    // Ensure an organization-wide default active workflow exists (department_id is null, target_role is 'all')
    const existingGlobalWf = await db('expense_workflows')
      .where('organization_id', orgId)
      .where(function (this: any) {
        this.whereNull('department_id').orWhere('department_id', 0);
      })
      .where(function (this: any) {
        this.whereNull('target_role').orWhere('target_role', 'all').orWhere('target_role', '');
      })
      .first()
      .catch(() => null);

    if (!existingGlobalWf) {
      const [wfId] = await db('expense_workflows').insert({
        organization_id: orgId,
        department_id: null,
        target_role: 'all',
        name: 'Organization-Wide Default Workflow',
        description: 'Universal fallback workflow for all departments and employees',
        min_amount: 0,
        max_amount: 10000000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => [0]);

      if (wfId) {
        await db('expense_workflow_levels').insert([
          {
            workflow_id: wfId,
            level_order: 1,
            approver_type: 'manager',
            approver_role: 'Reporting Manager',
            step_name: 'Manager Approval',
            is_mandatory: true,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            workflow_id: wfId,
            level_order: 2,
            approver_type: 'hr_admin',
            approver_role: 'Finance Verification',
            step_name: 'Finance Verification',
            is_mandatory: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]).catch(() => null);
      }
    }

    const teamLeadUserRows = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.organization_id', orgId)
      .where(function (this: any) {
        this.whereRaw("LOWER(roles.code) LIKE '%team_lead%'")
          .orWhereRaw("LOWER(roles.name) LIKE '%team lead%'");
      })
      .select('user_roles.user_id')
      .catch(() => []);
    const teamLeadUserIds = (teamLeadUserRows || []).map((r: any) => Number(r.user_id)).filter(Boolean);

    // Fix legacy stuck travel requests submitted by Team Lead
    await db('travel_requests')
      .where('organization_id', orgId)
      .where(function (this: any) {
        this.where('submitted_by_role', 'team_lead')
          .orWhereIn('submitted_by_user_id', teamLeadUserIds.length ? teamLeadUserIds : [0]);
      })
      .where(function (this: any) {
        this.where('status', 'pending_level_1')
          .orWhere('current_approver_role', 'Team Lead')
          .orWhere('current_approver_role', 'Team Lead Review');
      })
      .update({
        submitted_by_role: 'team_lead',
        status: 'pending_level_2',
        current_level: 2,
        current_approver_role: 'Manager Approval'
      }).catch(() => null);

    // Fix legacy stuck claims submitted by Team Lead
    await db('expense_claims')
      .where('organization_id', orgId)
      .where(function (this: any) {
        this.where('submitted_by_role', 'team_lead')
          .orWhereIn('submitted_by_user_id', teamLeadUserIds.length ? teamLeadUserIds : [0]);
      })
      .where(function (this: any) {
        this.where('status', 'pending_level_1')
          .orWhere('current_approver_role', 'Team Lead')
          .orWhere('current_approver_role', 'Team Lead Review');
      })
      .update({
        submitted_by_role: 'team_lead',
        status: 'pending_level_2',
        current_level: 2,
        current_approver_role: 'Manager Approval'
      }).catch(() => null);

    // Fix stuck claims submitted by CEO / Executive Admin (routing away from Manager/TL queue to Finance/CEO queue)
    const ceoUserRows = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.organization_id', orgId)
      .where(function (this: any) {
        this.whereRaw("LOWER(roles.code) LIKE '%organization_admin%'")
          .orWhereRaw("LOWER(roles.code) LIKE '%ceo%'")
          .orWhereRaw("LOWER(roles.name) LIKE '%ceo%'")
          .orWhereRaw("LOWER(roles.name) LIKE '%organization admin%'");
      })
      .select('user_roles.user_id')
      .catch(() => []);
    const ceoUserIds = (ceoUserRows || []).map((r: any) => Number(r.user_id)).filter(Boolean);

    await db('expense_claims')
      .where('organization_id', orgId)
      .where(function (this: any) {
        this.where('submitted_by_role', 'ceo')
          .orWhereIn('submitted_by_user_id', ceoUserIds.length ? ceoUserIds : [0]);
      })
      .where(function (this: any) {
        this.whereIn('status', ['pending_level_1', 'pending_level_2', 'pending_manager', 'pending', 'submitted']);
      })
      .update({
        submitted_by_role: 'ceo',
        status: 'pending_finance',
        current_level: 1,
        current_approver_role: 'Finance Verification'
      }).catch(() => null);
  }

  // Single source of truth for module config (currency, prefixes, labels, defaults).
  private async getConfig(ctx: TenantContext, db?: any): Promise<ExpenseConfig> {
    return ExpenseConfigService.load(ctx.organizationId, db || getKnex());
  }

  // Helper to get active employee record for current user context
  private async getEmployeeForCtx(ctx: TenantContext, employeeIdParam?: number) {
    const db = getKnex();
    if (employeeIdParam) {
      const emp = await db('employees').where('id', employeeIdParam).where('organization_id', ctx.organizationId).first().catch(() => null);
      if (emp) return emp;
    }

    if (ctx.userId) {
      const user = await db('users').where('id', ctx.userId).where('organization_id', ctx.organizationId).first().catch(() => null);
      if (user?.employee_id) {
        const emp = await db('employees').where('id', user.employee_id).first().catch(() => null);
        if (emp) return emp;
      }
      if (user?.email) {
        const emp = await db('employees').where('email', user.email).where('organization_id', ctx.organizationId).first().catch(() => null);
        if (emp) return emp;
      }
    }
    return null;
  }

  private async getPeopleVisibility(ctx: TenantContext, employeeIdColumn: string, employeeId?: number): Promise<{
    type: 'all' | 'eq' | 'none' | 'dept' | 'reportees' | 'team_lead' | 'submitter';
    column?: string;
    value?: number;
    departmentId?: number;
    organizationId?: number;
    configuredLevel?: number;  // which workflow level this role is configured at
  }> {
    if (employeeId) {
      return { type: 'eq', column: employeeIdColumn, value: employeeId };
    }

    const db = getKnex();
    const roleRows = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', ctx.userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .select('roles.code as role_code', 'roles.name as role_name')
      .catch(() => []);
    const roleCodes = (roleRows || []).map((r: any) =>
      String(r.roleCode || r.role_code || r.code || r.roleName || r.role_name || r.name || '').toLowerCase()
    );
    const ctxRoles = [ctx.role, ...(ctx.roles || [])].map((r) => String(r || '').toLowerCase());
    const allRoles = [...roleCodes, ...ctxRoles];
    const isHrOrAdmin = allRoles.some((c: string) =>
      ['organization_admin', 'super_admin', 'ceo', 'hr_admin', 'hr', 'hr_manager', 'admin', 'finance', 'finance_manager', 'accounts'].includes(c)
      || c.includes('ceo')
      || c.includes('finance')
      || (c.includes('admin') && !c.includes('company_employee'))
      || c.startsWith('hr')
    );
    if (isHrOrAdmin) return { type: 'all' };

    const emp = await this.getEmployeeForCtx(ctx);
    if (emp?.current_department_id) {
      const dept = await db('departments').where('id', emp.current_department_id).first().catch(() => null);
      if (dept && String(dept.name || '').toLowerCase().includes('finance')) {
        return { type: 'all' };
      }
    }

    const isTeamLeadRole = allRoles.some((c: string) => ['team_lead'].includes(c) || c.includes('team_lead'));

    // Helper: get the configured workflow level number for a given approver_type pattern
    const getConfiguredLevel = async (approverTypePattern: RegExp, defaultLevel: number): Promise<number> => {
      try {
        const wfLevels = await db('expense_workflow_levels as ewl')
          .join('expense_workflows as ew', 'ewl.workflow_id', 'ew.id')
          .where('ew.organization_id', ctx.organizationId)
          .where('ew.is_active', true)
          .select('ewl.level_order', 'ewl.approver_type')
          .orderBy('ewl.level_order', 'asc')
          .catch(() => []);
        const match = (wfLevels || []).find((l: any) =>
          approverTypePattern.test(String(l.approver_type || l.approverType || '').toLowerCase())
        );
        return match ? Number(match.level_order || match.levelOrder || defaultLevel) : defaultLevel;
      } catch {
        return defaultLevel;
      }
    };

    if (!emp) {
      if (isTeamLeadRole) {
        const configuredLevel = await getConfiguredLevel(/team.?lead/, 1);
        return { type: 'team_lead', column: employeeIdColumn, value: 0, departmentId: undefined, organizationId: ctx.organizationId, configuredLevel };
      }
      const isManagementRole = allRoles.some((c: string) =>
        ['manager', 'department_head', 'dept_head'].includes(c) || c.includes('manager')
      );
      if (isManagementRole) {
        return { type: 'all' };
      }
      return {
        type: 'submitter',
        column: employeeIdColumn.replace('employee_id', 'submitted_by_user_id'),
        value: Number(ctx.userId),
      };
    }

    const deptId = emp.current_department_id ?? emp.currentDepartmentId;
    if (isTeamLeadRole) {
      const configuredLevel = await getConfiguredLevel(/team.?lead/, 1);
      return { type: 'team_lead', column: employeeIdColumn, value: Number(emp.id), departmentId: deptId ? Number(deptId) : undefined, organizationId: ctx.organizationId, configuredLevel };
    }

    const isDeptHead = allRoles.some((c: string) => ['department_head', 'dept_head'].includes(c) || c.includes('department_head'));
    if (isDeptHead && deptId) {
      return { type: 'dept', value: Number(deptId) };
    }

    const isManagerLike = allRoles.some((c: string) => ['manager'].includes(c) || c.includes('manager'));
    if (isManagerLike) {
      const configuredLevel = await getConfiguredLevel(/manager|reporting.?manager|department.?head/, 2);
      return { type: 'reportees', column: employeeIdColumn, value: Number(emp.id), departmentId: deptId ? Number(deptId) : undefined, organizationId: ctx.organizationId, configuredLevel };
    }
    return { type: 'eq', column: employeeIdColumn, value: Number(emp.id) };
  }

  private applyVisibilityToQuery(query: any, vis: {
    type: 'all' | 'eq' | 'none' | 'dept' | 'reportees' | 'team_lead' | 'submitter';
    column?: string;
    value?: number;
    departmentId?: number;
    organizationId?: number;
    configuredLevel?: number;
  }) {
    if (vis.type === 'all') return query;
    if (vis.type === 'none') return query.whereRaw('1 = 0');
    if (vis.type === 'dept') return query.where('e.current_department_id', vis.value);

    if (vis.type === 'team_lead') {
      const db = getKnex();
      const empId = vis.value || 0;
      const deptId = vis.departmentId;
      const tablePrefix = vis.column && vis.column.includes('.') ? vis.column.split('.')[0] + '.' : 'ec.';
      const roleCol = `${tablePrefix}submitted_by_role`;
      const empCol = `${tablePrefix}employee_id`;
      const statusCol = `${tablePrefix}status`;
      const levelCol = `${tablePrefix}current_level`;
      // Use the pre-resolved configured level (fetched async in getPeopleVisibility)
      const tlLevel = vis.configuredLevel ?? 1;

      return query.where(function (this: any) {
        // 1. Team Lead never sees their own submitted claims
        if (empId > 0) {
          this.whereRaw(`COALESCE(${empCol}, 0) != ?`, [empId]);
        }

        // 2. Team Lead only sees requests submitted by regular employees
        this.whereRaw(`LOWER(COALESCE(${roleCol}, 'employee')) NOT IN ('ceo', 'organization_admin', 'super_admin', 'admin', 'hr', 'hr_admin', 'hr_manager', 'manager', 'department_head', 'dept_head', 'team_lead')`);

        // 3. Team Lead sees requests at their configured workflow level
        this.where(function (this: any) {
          this.where(db.raw(`COALESCE(${levelCol}, 1)`), tlLevel)
            .orWhereIn(statusCol, ['pending', 'submitted', 'pending_manager', `pending_level_${tlLevel}`]);
        });

        // 4. Scope to direct reportees OR same department
        if (empId > 0 || deptId) {
          this.where(function (this: any) {
            if (empId > 0) {
              this.where('e.reporting_manager_id', empId)
                .orWhereIn('e.reporting_manager_id', db('employees').select('id').where('reporting_manager_id', empId));
            }
            if (deptId) {
              this.orWhere('e.current_department_id', deptId);
            }
            // Fallback: employees with no manager/dept assigned
            this.orWhere(function (this: any) {
              this.whereNull('e.reporting_manager_id').whereNull('e.current_department_id');
            });
          });
        }
      });
    }

    if (vis.type === 'reportees') {
      const db = getKnex();
      const empId = vis.value || 0;
      const deptId = vis.departmentId;
      const tablePrefix = vis.column && vis.column.includes('.') ? vis.column.split('.')[0] + '.' : 'ec.';
      const roleCol = `${tablePrefix}submitted_by_role`;
      const empCol = `${tablePrefix}employee_id`;
      const statusCol = `${tablePrefix}status`;
      const levelCol = `${tablePrefix}current_level`;
      // Use the pre-resolved configured level (fetched async in getPeopleVisibility)
      const mgLevel = vis.configuredLevel ?? 2;

      return query.where(function (this: any) {
        // 1. Manager never sees own submitted claims
        if (empId > 0) {
          this.whereRaw(`COALESCE(${empCol}, 0) != ?`, [empId]);
        }

        // 2. Manager never sees requests submitted by CEO / Super Admin / Admin
        this.whereRaw(`LOWER(COALESCE(${roleCol}, 'employee')) NOT IN ('ceo', 'organization_admin', 'super_admin', 'admin')`);

        // 3. Manager sees requests at their configured level
        this.where(function (this: any) {
          this.where(db.raw(`COALESCE(${levelCol}, 1)`), mgLevel)
            .orWhere(statusCol, `pending_level_${mgLevel}`);
          // If Manager is also a direct reporting manager for some employees at Level 1
          if (empId > 0) {
            this.orWhere(function (this: any) {
              this.whereIn(statusCol, ['pending', 'submitted', 'pending_manager', 'pending_level_1'])
                .where('e.reporting_manager_id', empId);
            });
          }
        });

        // 4. Hierarchy / Department scope
        if (empId > 0 || deptId) {
          this.where(function (this: any) {
            if (empId > 0) {
              this.where('e.reporting_manager_id', empId)
                .orWhereIn('e.reporting_manager_id', db('employees').select('id').where('reporting_manager_id', empId));
            }
            if (deptId) {
              this.orWhere('e.current_department_id', deptId);
            }
          });
        }
      });
    }

    if (vis.type === 'submitter' && vis.column) return query.where(vis.column, vis.value);
    if (vis.type === 'eq' && vis.column) return query.where(vis.column, vis.value);
    return query;
  }

  private async assertCanManageEmployeeClaim(ctx: TenantContext, claim: any, actionType?: 'manager' | 'finance' | 'payout') {
    if (!claim) throw new Error('Claim not found');
    if (Number(claim.organization_id ?? claim.organizationId) !== Number(ctx.organizationId)) {
      throw new Error('Claim not found');
    }
    const vis = await this.getPeopleVisibility(ctx, 'ec.employee_id');
    if (vis.type === 'all') return;

    const db = getKnex();
    // For finance verification and payout, users in Finance department or with finance permissions can act org-wide
    if (actionType === 'finance' || actionType === 'payout') {
      const emp = await this.getEmployeeForCtx(ctx);
      if (emp?.current_department_id) {
        const dept = await db('departments').where('id', emp.current_department_id).first().catch(() => null);
        if (dept && String(dept.name || '').toLowerCase().includes('finance')) {
          return;
        }
      }
    }

    const claimEmpId = Number(claim.employee_id ?? claim.employeeId);
    const emp = await db('employees').where('id', claimEmpId).where('organization_id', ctx.organizationId).first().catch(() => null);
    const deptId = emp ? (emp.current_department_id ?? emp.currentDepartmentId) : null;
    const managerId = emp ? (emp.reporting_manager_id ?? emp.reportingManagerId) : null;
    if (vis.type === 'dept' && Number(deptId) === vis.value) return;
    if (vis.type === 'reportees' && (Number(managerId) === vis.value || (vis.departmentId && Number(deptId) === vis.departmentId) || claimEmpId === vis.value)) return;
    if (vis.type === 'eq' && claimEmpId === vis.value) return;
    // Team Lead can approve claims at pending_level_1 (their designated workflow level).
    // They are allowed if the claim is at their level OR if they manage the submitter's dept/hierarchy.
    if (vis.type === 'team_lead') {
      const claimStatus = String(claim.status || claim.currentStatus || '');
      const submitterRole = String(claim.submitted_by_role || claim.submittedByRole || 'employee').toLowerCase();
      const isTeamLeadLevel = claimStatus === 'pending_level_1' || claimStatus === 'pending' || claimStatus === 'submitted';
      const notSuperiorRole = !['team_lead', 'manager', 'department_head', 'hr', 'hr_admin', 'ceo', 'admin', 'organization_admin', 'super_admin'].includes(submitterRole);
      if (isTeamLeadLevel && notSuperiorRole) return; // Employee's claim at Level 1 — TL can approve
      if (vis.departmentId && Number(deptId) === vis.departmentId) return; // Same dept
      if (vis.value && vis.value > 0 && Number(managerId) === vis.value) return; // Direct reportee
    }
    throw new Error('You can only act on claims for your team.');
  }

  private getCurrentLevelNum(status: string, dbLevel?: number | null): number {
    const st = String(status || '').toLowerCase().trim();
    let lvl = Number(dbLevel || 1);
    if (isNaN(lvl) || lvl < 1) lvl = 1;

    if (st === 'pending_level_2' || st === 'pending_manager') {
      lvl = Math.max(lvl, 2);
    } else if (st === 'pending_level_3') {
      lvl = Math.max(lvl, 3);
    } else if (st.startsWith('pending_level_')) {
      const parsed = parseInt(st.replace('pending_level_', ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        lvl = Math.max(lvl, parsed);
      }
    }

    return lvl;
  }

  /**
   * Validate that the current user's role matches the required approverType
   * for the current workflow level. Allows HR/Admin to approve any level.
   * For 'reporting_manager' type: checks org hierarchy; falls back to dept head.
   */
  private async assertApproverMatchesWorkflowLevel(
    ctx: TenantContext,
    claim: any,
    levels: any[],
    options?: { isAbsenteeOverride?: boolean; delegatedForId?: number }
  ): Promise<void> {
    const claimStatus = String(claim.status || '').toLowerCase();
    if (!['pending_level_1', 'pending_level_2', 'pending_level_3', 'pending', 'submitted', 'pending_manager'].includes(claimStatus) && !claimStatus.startsWith('pending_level_')) {
      return;
    }

    if (!levels || levels.length === 0) return; // No workflow levels configured, skip

    // If Absentee Override toggle is enabled (with audit reason recorded), allow approval on behalf of absent approver
    if (options?.isAbsenteeOverride) return;

    const currentLevelNum = this.getCurrentLevelNum(claimStatus, claim.current_level ?? claim.currentLevel);
    const currentLevelConfig = levels.find(
      (l: any) => Number(l.level_order ?? l.levelOrder ?? l.level) === currentLevelNum
    );

    if (!currentLevelConfig) return; // No config for this level, allow

    const requiredType = String(
      currentLevelConfig.approver_type ?? currentLevelConfig.approverType ?? ''
    ).toLowerCase().trim();

    if (!requiredType) return; // No approver type set, allow

    const db = getKnex();

    // Fetch current user's role codes from DB
    const userRoleRows = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', ctx.userId)
      .where('user_roles.organization_id', ctx.organizationId)
      .select('roles.code')
      .catch(() => []);

    const userRoleCodes = (userRoleRows || []).map((r: any) =>
      String(r.code ?? '').toLowerCase()
    );

    // Merge context roles
    const ctxRoles = [ctx.role, ...(ctx.roles || [])].map((r) => String(r || '').toLowerCase()).filter(Boolean);
    const allUserRoles = [...new Set([...userRoleCodes, ...ctxRoles])];

    const isTeamLead = allUserRoles.some((c) => ['team_lead'].includes(c) || c.includes('team_lead') || c.includes('team lead'));
    const isManager = allUserRoles.some((c) => ['manager', 'reporting_manager', 'department_head', 'dept_head'].includes(c) || c.includes('manager') || c.includes('department_head'));
    const isHr = allUserRoles.some((c) => ['hr_admin', 'hr_manager', 'hr'].includes(c) || c.startsWith('hr'));
    const isAdmin = allUserRoles.some((c) => ['organization_admin', 'super_admin', 'admin', 'ceo'].includes(c) || c.includes('admin') || c.includes('ceo'));
    const isFinance = allUserRoles.some((c) => ['finance', 'finance_manager', 'accounts'].includes(c) || c.includes('finance'));

    const stepName = String(currentLevelConfig.step_name || currentLevelConfig.stepName || '').toLowerCase();

    // Check direct reporting manager hierarchy
    const emp = await this.getEmployeeForCtx(ctx);
    const claimEmpId = Number(claim.employee_id ?? claim.employeeId);
    let isDirectReportingManager = false;
    if (emp && claimEmpId) {
      const claimEmp = await db('employees')
        .where('id', claimEmpId)
        .where('organization_id', ctx.organizationId)
        .first()
        .catch(() => null);
      if (claimEmp && Number(claimEmp.reporting_manager_id) === Number(emp.id)) {
        isDirectReportingManager = true;
      }
    }

    if (isDirectReportingManager && (currentLevelNum === 1 || currentLevelNum === 2 || requiredType === 'reporting_manager' || requiredType === 'team_lead' || requiredType === 'manager')) {
      return;
    }

    // Level 1 / Team Lead step check
    if (currentLevelNum === 1 || requiredType === 'team_lead' || stepName.includes('team') || stepName.includes('lead')) {
      if (isTeamLead || isManager || isDirectReportingManager) return;
    }

    // Level 2 / Manager step check
    if (currentLevelNum === 2 || requiredType === 'reporting_manager' || requiredType === 'manager' || stepName.includes('manager')) {
      if (isManager || isDirectReportingManager) return;
    }

    // HR step check: allowed if requiredType is HR or stepName mentions HR
    if (requiredType === 'hr' || requiredType === 'hr_admin' || requiredType === 'hr_manager' || stepName.includes('hr')) {
      if (isHr || isAdmin) return;
    }

    // Admin / CEO step check: allowed if requiredType is Admin/CEO
    if (requiredType === 'admin' || requiredType === 'ceo' || requiredType === 'organization_admin' || requiredType === 'super_admin' || stepName.includes('admin') || stepName.includes('ceo')) {
      if (isAdmin) return;
    }

    // Finance step check
    if (requiredType === 'finance' || requiredType === 'finance_manager' || stepName.includes('finance')) {
      if (isFinance || isAdmin) return;
    }

    const legacyMap: Record<string, string[]> = {
      'team_lead': ['team_lead', 'reporting_manager', 'manager'],
      'department_head': ['department_head', 'dept_head', 'manager'],
      'hr': ['hr_admin', 'hr_manager', 'hr'],
      'admin': ['organization_admin', 'super_admin', 'admin', 'ceo'],
      'ceo': ['organization_admin', 'ceo'],
      'finance': ['finance_manager', 'finance', 'accounts'],
      'finance_manager': ['finance_manager', 'finance', 'accounts'],
    };

    const allowedCodes = legacyMap[requiredType] || [requiredType];
    const isMatchedRole = allUserRoles.some((code) => allowedCodes.some((acc) => code.includes(acc)));
    if (isMatchedRole) return;
  }

  // --- EXPENSE CATEGORIES ---
  private mapCategory(row: any) {
    if (!row) return row;
    return {
      ...row,
      id: Number(row.id),
      name: row.name,
      code: row.code,
      description: row.description || '',
      spendingLimit: Number(row.spending_limit ?? row.spendingLimit ?? 0),
      isReceiptMandatory: Boolean(row.is_receipt_mandatory ?? row.isReceiptMandatory),
      minAmountForReceipt: Number(row.min_amount_for_receipt ?? row.minAmountForReceipt ?? 0),
      autoApprovalThreshold: Number(row.auto_approval_threshold ?? row.autoApprovalThreshold ?? 0),
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  async getCategories(ctx: TenantContext, includeInactive: boolean = false) {
    const orgId = ctx?.organizationId;
    if (!orgId) return [];
    await this.ensureInitialized(orgId);
    const db = getKnex();

    let rows = await db('expense_categories')
      .where((b: any) => {
        b.where('organization_id', orgId).orWhereNull('organization_id');
      })
      .modify((q: any) => {
        if (!includeInactive) {
          q.where('is_active', true);
        }
      })
      .orderBy('id', 'asc');

    if (!rows || rows.length === 0) {
      await ExpenseDbService.ensureDefaultCategories(db, orgId);
      rows = await db('expense_categories')
        .where((b: any) => {
          b.where('organization_id', orgId).orWhereNull('organization_id');
        })
        .modify((q: any) => {
          if (!includeInactive) {
            q.where('is_active', true);
          }
        })
        .orderBy('id', 'asc');
    }

    const mapped = (rows || []).map((r: any) => this.mapCategory(r));
    const unique: any[] = [];
    const seen = new Set<string>();
    for (const cat of mapped) {
      const key = String(cat.code || cat.name || cat.id).trim().toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(cat);
    }
    return unique;
  }

  async createCategory(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const code = (data.code || data.name.toUpperCase().replace(/\s+/g, '_')).trim();
    const [id] = await db('expense_categories').insert({
      organization_id: ctx.organizationId,
      name: data.name,
      code,
      description: data.description || null,
      spending_limit: Number(data.spendingLimit) || 0,
      is_receipt_mandatory: Boolean(data.isReceiptMandatory),
      min_amount_for_receipt: Number(data.minAmountForReceipt) || 0,
      auto_approval_threshold: Number(data.autoApprovalThreshold) || 0,
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.mapCategory(await db('expense_categories').where('id', id).first());
  }

  async updateCategory(ctx: TenantContext, categoryId: number, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    const updatePayload: Record<string, any> = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.code !== undefined) updatePayload.code = data.code;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.spendingLimit !== undefined) updatePayload.spending_limit = Number(data.spendingLimit) || 0;
    if (data.isReceiptMandatory !== undefined) updatePayload.is_receipt_mandatory = Boolean(data.isReceiptMandatory);
    if (data.minAmountForReceipt !== undefined) updatePayload.min_amount_for_receipt = Number(data.minAmountForReceipt) || 0;
    if (data.autoApprovalThreshold !== undefined) updatePayload.auto_approval_threshold = Number(data.autoApprovalThreshold) || 0;
    if (data.isActive !== undefined) updatePayload.is_active = Boolean(data.isActive);

    await db('expense_categories')
      .where('id', categoryId)
      .where(function (this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .update(updatePayload);

    return this.mapCategory(await db('expense_categories').where('id', categoryId).first());
  }

  async deleteCategory(ctx: TenantContext, categoryId: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    // Unlink category from any existing claims, claim line items, or policies before hard deletion
    await db('expense_claims').where('category_id', categoryId).update({ category_id: null }).catch(() => null);
    await db('expense_claim_items').where('category_id', categoryId).update({ category_id: null }).catch(() => null);
    await db('expense_policies').where('category_id', categoryId).update({ category_id: null }).catch(() => null);

    await db('expense_categories')
      .where('id', categoryId)
      .where(function (this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .delete();

    return { success: true, message: 'Category deleted successfully.' };
  }

  // --- EXPENSE POLICIES ---
  private mapExpensePolicy(row: any) {
    if (!row) return row;
    return {
      ...row,
      id: Number(row.id),
      policyName: row.policy_name || row.policyName,
      categoryId: row.category_id ? Number(row.category_id) : (row.categoryId ? Number(row.categoryId) : undefined),
      categoryName: row.category_name || row.categoryName,
      grade: row.grade,
      designation: row.designation,
      departmentId: row.department_id ? Number(row.department_id) : (row.departmentId ? Number(row.departmentId) : undefined),
      location: row.location,
      maxLimitPerClaim: Number(row.max_limit_per_claim ?? row.maxLimitPerClaim ?? 0),
      maxLimitPerMonth: Number(row.max_limit_per_month ?? row.maxLimitPerMonth ?? 0),
      requireReceiptAbove: Number(row.require_receipt_above ?? row.requireReceiptAbove ?? 0),
      allowException: Boolean(row.allow_exception ?? row.allowException ?? true),
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      createdAt: row.created_at || row.createdAt
    };
  }

  async getPolicies(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const rows = await db('expense_policies as ep')
      .leftJoin('expense_categories as ec', 'ep.category_id', 'ec.id')
      .where(function (this: any) {
        this.where('ep.organization_id', ctx.organizationId).orWhereNull('ep.organization_id');
      })
      .select('ep.*', 'ec.name as category_name')
      .orderBy('ep.id', 'desc');
    return (rows || []).map((r: any) => this.mapExpensePolicy(r));
  }

  async createPolicy(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const [id] = await db('expense_policies').insert({
      organization_id: ctx.organizationId,
      policy_name: data.policyName,
      category_id: data.categoryId || null,
      grade: data.grade || 'All',
      designation: data.designation || 'All',
      department_id: data.departmentId || null,
      location: data.location || 'All',
      max_limit_per_claim: Number(data.maxLimitPerClaim) || 0,
      max_limit_per_month: Number(data.maxLimitPerMonth) || 0,
      require_receipt_above: Number(data.requireReceiptAbove) || 0,
      allow_exception: data.allowException !== undefined ? Boolean(data.allowException) : true,
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('expense_policies as ep')
      .leftJoin('expense_categories as ec', 'ep.category_id', 'ec.id')
      .where('ep.id', id)
      .select('ep.*', 'ec.name as category_name')
      .first();
    return this.mapExpensePolicy(row);
  }

  async updatePolicy(ctx: TenantContext, policyId: number, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    const updatePayload: Record<string, any> = {
      updated_at: new Date()
    };

    if (data.policyName !== undefined) updatePayload.policy_name = data.policyName;
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId || null;
    if (data.grade !== undefined) updatePayload.grade = data.grade;
    if (data.designation !== undefined) updatePayload.designation = data.designation;
    if (data.departmentId !== undefined) updatePayload.department_id = data.departmentId || null;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.maxLimitPerClaim !== undefined) updatePayload.max_limit_per_claim = Number(data.maxLimitPerClaim) || 0;
    if (data.maxLimitPerMonth !== undefined) updatePayload.max_limit_per_month = Number(data.maxLimitPerMonth) || 0;
    if (data.requireReceiptAbove !== undefined) updatePayload.require_receipt_above = Number(data.requireReceiptAbove) || 0;
    if (data.allowException !== undefined) updatePayload.allow_exception = Boolean(data.allowException);
    if (data.isActive !== undefined) updatePayload.is_active = Boolean(data.isActive);

    await db('expense_policies')
      .where('id', policyId)
      .where(function (this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .update(updatePayload);

    const row = await db('expense_policies as ep')
      .leftJoin('expense_categories as ec', 'ep.category_id', 'ec.id')
      .where('ep.id', policyId)
      .select('ep.*', 'ec.name as category_name')
      .first();
    return this.mapExpensePolicy(row);
  }

  async deletePolicy(ctx: TenantContext, policyId: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_policies')
      .where('id', policyId)
      .where(function (this: any) {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      })
      .delete();
    return { success: true, message: 'Policy deleted successfully.' };
  }

  async validatePolicyForClaim(ctx: TenantContext, categoryId: number, amount: number, receiptProvided: boolean) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const config = await this.getConfig(ctx);
    const cur = (n: number) => ExpenseConfigService.formatAmount(n, config);
    const category = categoryId ? await db('expense_categories').where('id', categoryId).first() : null;

    let empGrade: string | null = null;
    let empDesignation: string | null = null;
    let empLocation: string | null = null;

    if (ctx.userId) {
      try {
        const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
        if (user?.employee_id) {
          const emp = await db('employees')
            .leftJoin('designations', 'employees.current_designation_id', 'designations.id')
            .leftJoin('locations', 'employees.current_location_id', 'locations.id')
            .where('employees.id', user.employee_id)
            .first(
              'employees.grade',
              db.raw('COALESCE(designations.name, designations.designation_name) as designation_name'),
              db.raw('COALESCE(locations.name, locations.location_name) as location_name')
            );
          if (emp) {
            empGrade = emp.grade ? String(emp.grade).trim().toLowerCase() : null;
            empDesignation = emp.designation_name ? String(emp.designation_name).trim().toLowerCase() : null;
            empLocation = emp.location_name ? String(emp.location_name).trim().toLowerCase() : null;
          }
        }
      } catch (e) {
        console.error('Error fetching applicant employee details for policy validation:', e);
      }
    }

    const allPolicies = await db('expense_policies')
      .where('organization_id', ctx.organizationId)
      .where(function () {
        this.where('is_active', true).orWhere('is_active', 1);
      })
      .where(function () {
        this.whereNull('category_id')
          .orWhere('category_id', 0)
          .orWhere('category_id', categoryId || 0);
      });

    const matchesAttr = (polVal: string | null | undefined, empVal: string | null | undefined) => {
      if (!polVal) return true;
      const p = String(polVal).trim().toLowerCase();
      if (p === 'all' || p === '') return true;
      if (!empVal) return true;
      const e = String(empVal).trim().toLowerCase();
      return p === e || p.includes(e) || e.includes(p);
    };

    const policies = allPolicies.filter((pol: any) => {
      const pGrade = pol.grade ? String(pol.grade).trim().toLowerCase() : 'all';
      const pDesig = pol.designation ? String(pol.designation).trim().toLowerCase() : 'all';
      const pLoc = pol.location ? String(pol.location).trim().toLowerCase() : 'all';

      if (pGrade === 'all' || pGrade === '' || !empGrade || matchesAttr(pol.grade, empGrade)) {
        if (pDesig === 'all' || pDesig === '' || !empDesignation || matchesAttr(pol.designation, empDesignation)) {
          if (pLoc === 'all' || pLoc === '' || !empLocation || matchesAttr(pol.location, empLocation)) {
            return true;
          }
        }
      }
      return true;
    });

    // Prioritize category-specific policies if defined for this category
    const catSpecificPolicies = policies.filter((pol: any) => {
      const pCatId = pol.category_id !== null && pol.category_id !== undefined ? Number(pol.category_id) : 0;
      return categoryId && pCatId === Number(categoryId);
    });

    const activePoliciesToApply = catSpecificPolicies.length > 0
      ? catSpecificPolicies
      : policies;

    const violations: string[] = [];
    let allowException = true;

    // Check if an unlimited policy (max_limit_per_claim === 0) applies to this category
    const hasUnlimitedPolicy = activePoliciesToApply.some((pol: any) => {
      return Number(pol.max_limit_per_claim || 0) === 0;
    });

    if (category) {
      if (!hasUnlimitedPolicy && category.spending_limit > 0 && amount > category.spending_limit) {
        violations.push(`Amount ${cur(amount)} exceeds category limit of ${cur(category.spending_limit)} for category '${category.name}'`);
      }
      if (category.is_receipt_mandatory && amount >= category.min_amount_for_receipt && !receiptProvided) {
        violations.push(`Receipt mandatory for ${category.name} above ${cur(category.min_amount_for_receipt)}`);
      }
    }

    for (const pol of activePoliciesToApply) {
      const polMax = Number(pol.max_limit_per_claim || 0);
      const polMin = Number(pol.min_limit_per_claim || 0);
      if (!hasUnlimitedPolicy && polMax > 0 && amount > polMax) {
        violations.push(`Amount ${cur(amount)} exceeds the set policy limit of ${cur(polMax)} for policy '${pol.policy_name}'`);
        if (pol.allow_exception === 0 || pol.allow_exception === false) {
          allowException = false;
        }
      }
      if (polMin > 0 && amount < polMin) {
        violations.push(`Amount ${cur(amount)} is below the minimum set policy limit of ${cur(polMin)} for policy '${pol.policy_name}'`);
      }
      if (pol.require_receipt_above > 0 && amount > pol.require_receipt_above && !receiptProvided) {
        violations.push(`Receipt mandatory for amounts over ${cur(pol.require_receipt_above)} per policy '${pol.policy_name}'`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      allowException
    };
  }

  // --- EXPENSE CLAIMS ---
  private mapClaim(claim: any) {
    if (!claim) return claim;
    return {
      ...claim,
      claimNumber: claim.claim_number || claim.claimNumber,
      employeeId: claim.employee_id || claim.employeeId,
      claimDate: claim.claim_date || claim.claimDate,
      totalClaimedAmount: claim.total_claimed_amount ?? claim.totalClaimedAmount,
      totalApprovedAmount: claim.total_approved_amount ?? claim.totalApprovedAmount,
      totalRejectedAmount: claim.total_rejected_amount ?? claim.totalRejectedAmount,
      paymentMethod: claim.payment_method || claim.paymentMethod,
      merchantName: claim.merchant_name || claim.merchantName,
      projectCostCenter: claim.project_cost_center || claim.projectCostCenter,
      receiptUrl: claim.receipt_url || claim.receiptUrl,
      currentApproverId: claim.current_approver_id || claim.currentApproverId,
      currentApproverRole: claim.current_approver_role || claim.currentApproverRole,
      currentLevel: claim.current_level ?? claim.currentLevel ?? 1,
      workflowId: claim.workflow_id || claim.workflowId,
      rejectionReason: claim.rejection_reason || claim.rejectionReason,
      returnComments: claim.return_comments || claim.returnComments,
      travelRequestId: claim.travel_request_id || claim.travelRequestId,
      travelAdvanceId: claim.travel_advance_id || claim.travelAdvanceId,
      submittedAt: claim.submitted_at || claim.submittedAt,
      approvedAt: claim.approved_at || claim.approvedAt,
      reimbursedAt: claim.reimbursed_at || claim.reimbursedAt,
      paymentDate: claim.payment_date || claim.paymentDate,
      paidAmount: claim.paid_amount ?? claim.paidAmount,
      paymentReference: claim.payment_reference || claim.paymentReference,
      bankName: claim.bank_name || claim.bankName,
      accountNumber: claim.account_no || claim.account_number || claim.accountNo || claim.accountNumber,
      ifscCode: claim.ifsc_code || claim.ifscCode,
      pan: claim.pan,
      firstName: claim.first_name || claim.firstName || claim.submitter_first_name || claim.submitterFirstName,
      lastName: claim.last_name || claim.lastName || claim.submitter_last_name || claim.submitterLastName,
      email: claim.email || claim.submitter_email || claim.submitterEmail,
      employeeCode: claim.employee_code || claim.employeeCode,
      departmentName: claim.department_name || claim.departmentName,
      designationName: claim.designation_name || claim.designationName,
      locationName: claim.location_name || claim.locationName,
      categoryName: claim.category_name || claim.categoryName,
      createdAt: claim.created_at || claim.createdAt,
      updatedAt: claim.updated_at || claim.updatedAt,
      items: (claim.items || []).map((it: any) => ({
        ...it,
        categoryId: it.category_id || it.categoryId,
        expenseDate: it.expense_date || it.expenseDate,
        claimedAmount: it.claimed_amount ?? it.claimedAmount,
        approvedAmount: it.approved_amount ?? it.approvedAmount,
        rejectedAmount: it.rejected_amount ?? it.rejectedAmount,
        merchantName: it.merchant_name || it.merchantName,
        projectCostCenter: it.project_cost_center || it.projectCostCenter,
        receiptUrl: it.receipt_url || it.receiptUrl,
        receiptFileName: it.receipt_file_name || it.receiptFileName,
        receiptFileType: it.receipt_file_type || it.receiptFileType,
        receiptFileSize: it.receipt_file_size || it.receiptFileSize,
        policyValidated: it.policy_validated ?? it.policyValidated,
        policyViolations: it.policy_violations || it.policyViolations,
        employeeJustification: it.employee_justification || it.employeeJustification,
        adjustmentReason: it.adjustment_reason || it.adjustmentReason,
        categoryName: it.category_name || it.categoryName
      }))
    };
  }

  async getClaims(ctx: TenantContext, params: {
    employeeId?: number;
    status?: string;
    departmentId?: number;
    designationId?: number;
    locationId?: number;
    categoryId?: number;
    search?: string;
    mode?: string;
  }) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    let query = db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('users as u', 'ec.submitted_by_user_id', 'u.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
      .leftJoin('locations as loc', 'e.current_location_id', 'loc.id')
      .leftJoin('expense_categories as cat', 'ec.category_id', 'cat.id')
      .where('ec.organization_id', ctx.organizationId)
      .select(
        'ec.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code',
        'e.bank_name',
        'e.account_no',
        'e.ifsc_code',
        'e.pan_number as pan',
        'd.name as department_name',
        'des.name as designation_name',
        'loc.name as location_name',
        'cat.name as category_name',
        'u.first_name as submitter_first_name',
        'u.last_name as submitter_last_name',
        'u.email as submitter_email'
      )
      .orderBy('ec.created_at', 'desc');

    if (params.mode === 'my_expenses') {
      const emp = await this.getEmployeeForCtx(ctx, params.employeeId);
      query = query.where(function () {
        if (emp) this.where('ec.employee_id', emp.id);
        if (ctx.userId) this.orWhere('ec.submitted_by_user_id', ctx.userId);
        if (!emp && !ctx.userId) this.whereRaw('1 = 0');
      });
    } else if (params.mode === 'finance' || params.mode === 'payout' || params.status === 'pending_finance' || params.status === 'payment_pending') {
      const vis = await this.getPeopleVisibility(ctx, 'ec.employee_id', params.employeeId);
      if (vis.type !== 'all') {
        const emp = await this.getEmployeeForCtx(ctx);
        const dept = emp?.current_department_id ? await db('departments').where('id', emp.current_department_id).first().catch(() => null) : null;
        if (!dept || !String(dept.name || '').toLowerCase().includes('finance')) {
          query = this.applyVisibilityToQuery(query, vis);
        }
      }
    } else {
      const vis = await this.getPeopleVisibility(ctx, 'ec.employee_id', params.employeeId);
      query = this.applyVisibilityToQuery(query, vis);
    }

    if (params.employeeId && params.mode !== 'my_expenses') {
      query = query.where('ec.employee_id', params.employeeId);
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'pending_manager') {
        // Legacy: pending_manager maps to any active workflow level
        query = query.where(function (this: any) {
          this.whereIn('ec.status', ['submitted', 'pending_manager', 'pending']).orWhere('ec.status', 'like', 'pending_level_%');
        });
      } else if (params.status === 'pending_level_1') {
        // Exact Level 1 only (Team Lead queue) — do NOT include other levels
        query = query.where(function (this: any) {
          this.whereIn('ec.status', ['submitted', 'pending', 'pending_level_1']);
        });
      } else if (params.status === 'pending_level_2') {
        // Exact Level 2 only (Manager queue)
        query = query.where('ec.status', 'pending_level_2');
      } else if (params.status === 'pending_level_3') {
        // Exact Level 3 (HR queue) & Finance queue
        query = query.whereIn('ec.status', ['pending_level_3', 'pending_finance']);
      } else if (params.status === 'pending_finance') {
        query = query.whereIn('ec.status', ['pending_finance']);
      } else if (params.status === 'pending_approvals') {
        const extractRoleCode = (r: any): string => {
          if (!r) return '';
          if (typeof r === 'string') return r.toLowerCase().trim();
          if (typeof r === 'object') {
            return String(r.code || r.name || r.roleCode || r.role_code || '').toLowerCase().trim();
          }
          return String(r).toLowerCase().trim();
        };

        const allUserRoles = Array.from(
          new Set(
            [
              extractRoleCode(ctx.role),
              extractRoleCode((ctx as any).roleCode),
              ...((ctx.roles || []).map(extractRoleCode))
            ].filter(Boolean)
          )
        );
        const isHrOrAdmin = allUserRoles.some((c) =>
          ['hr_admin', 'hr_manager', 'hr', 'organization_admin', 'super_admin', 'admin', 'ceo'].some(x => c.includes(x))
        );
        const isManagerOnly = allUserRoles.some((c) => ['manager', 'department_head'].some(x => c.includes(x))) && !isHrOrAdmin;
        const isTeamLeadOnly = allUserRoles.some((c) => c.includes('team_lead')) && !isHrOrAdmin && !isManagerOnly;

        query = query.where(function (this: any) {
          if (isHrOrAdmin) {
            this.whereIn('ec.status', ['pending_level_3', 'pending_finance']);
          } else if (isManagerOnly) {
            this.whereIn('ec.status', ['pending_level_2', 'pending_manager']);
          } else if (isTeamLeadOnly) {
            this.whereIn('ec.status', ['submitted', 'pending', 'pending_level_1']);
          } else {
            this.whereIn('ec.status', ['submitted', 'pending_manager', 'pending_finance', 'pending', 'pending_level_1']).orWhere('ec.status', 'like', 'pending_level_%');
          }
        });
      } else if (params.status === 'payment_pending') {
        query = query.whereIn('ec.status', ['payment_pending']);
      } else if (params.status === 'paid' || params.status === 'reimbursed') {
        query = query.whereIn('ec.status', ['paid', 'reimbursed']);
      } else if (params.status === 'approved') {
        query = query.whereIn('ec.status', ['approved', 'payment_pending', 'paid', 'reimbursed']);
      } else if (params.status === 'returned') {
        query = query.whereIn('ec.status', ['returned']);
      } else if (params.status === 'rejected') {
        query = query.whereIn('ec.status', ['rejected']);
      } else {
        query = query.where('ec.status', params.status);
      }
    }

    if (params.departmentId) {
      query = query.where('e.current_department_id', params.departmentId);
    }

    if (params.designationId) {
      query = query.where('e.current_designation_id', params.designationId);
    }

    if (params.locationId) {
      query = query.where('e.current_location_id', params.locationId);
    }

    if (params.categoryId) {
      query = query.where('ec.category_id', params.categoryId);
    }

    if (params.search) {
      const search = `%${params.search.toLowerCase()}%`;
      query = query.where(function () {
        this.whereRaw('LOWER(ec.title) LIKE ?', [search])
          .orWhereRaw('LOWER(ec.claim_number) LIKE ?', [search])
          .orWhereRaw('LOWER(e.first_name) LIKE ?', [search])
          .orWhereRaw('LOWER(e.last_name) LIKE ?', [search])
          .orWhereRaw('LOWER(e.employee_code) LIKE ?', [search]);
      });
    }

    const claims = await query;

    // Attach items count and items preview
    for (const claim of claims) {
      if (claim.receipt_url && String(claim.receipt_url).length > 256 && String(claim.receipt_url).startsWith('data:')) {
        claim.receipt_url = '[attachment]';
      }
      const items = await db('expense_claim_items as eci')
        .leftJoin('expense_categories as c', 'eci.category_id', 'c.id')
        .where('eci.claim_id', claim.id)
        .select('eci.*', 'c.name as category_name');
      for (const item of items) {
        if (item.receipt_url && String(item.receipt_url).length > 256 && String(item.receipt_url).startsWith('data:')) {
          item.receipt_url = '[attachment]';
        }
      }
      claim.items = items;
      claim.itemCount = items.length;
    }

    const mappedClaims = (claims || []).map((c: any) => this.mapClaim(c));

    // Also include standalone Travel Requests if not filtered out
    if (params.mode !== 'my_expenses') {
      try {
        const trs = await this.getTravelRequests(ctx, params.employeeId);
        for (const tr of trs || []) {
          const st = String(tr.status || '').toLowerCase();
          // Preserve the actual workflow level status for filtering
          let appStatus = st || 'pending_level_1';
          if (st === 'pending' || st === 'submitted') appStatus = 'pending_level_1';
          else if (st === 'pending_manager') appStatus = 'pending_level_1';
          else if (st === 'pending_finance') appStatus = 'pending_finance';
          else if (st === 'approved' || st === 'completed') appStatus = 'approved';
          else if (st === 'rejected') appStatus = 'rejected';
          // Keep pending_level_N as-is for accurate level-specific filtering

          if (params.status && params.status !== 'all') {
            // Level 1 (Team Lead queue): show only pending_level_1 / pending / submitted
            if (params.status === 'pending_level_1' && appStatus !== 'pending_level_1') continue;
            // Level 2 (Manager queue): only pending_level_2
            if (params.status === 'pending_level_2' && appStatus !== 'pending_level_2') continue;
            // Level 3 (HR queue): only pending_level_3
            if (params.status === 'pending_level_3' && appStatus !== 'pending_level_3') continue;
            // Legacy pending_manager: any active workflow level
            if (params.status === 'pending_manager' && !['pending_level_1', 'pending_manager', 'pending_finance', 'pending', 'submitted'].includes(appStatus) && !appStatus.startsWith('pending_level_')) continue;
            if (params.status === 'pending_finance' && appStatus !== 'pending_finance') continue;
            if (params.status === 'pending_approvals') {
              const extractRoleCode = (r: any): string => {
                if (!r) return '';
                if (typeof r === 'string') return r.toLowerCase().trim();
                if (typeof r === 'object') return String(r.code || r.name || r.roleCode || r.role_code || '').toLowerCase().trim();
                return String(r).toLowerCase().trim();
              };
              const allUserRoles = Array.from(
                new Set(
                  [
                    extractRoleCode(ctx.role),
                    extractRoleCode((ctx as any).roleCode),
                    ...((ctx.roles || []).map(extractRoleCode))
                  ].filter(Boolean)
                )
              );
              const isHrOrAdmin = allUserRoles.some((c) =>
                ['hr_admin', 'hr_manager', 'hr', 'organization_admin', 'super_admin', 'admin', 'ceo'].some(x => c.includes(x))
              );
              const isManagerOnly = allUserRoles.some((c) => ['manager', 'department_head'].some(x => c.includes(x))) && !isHrOrAdmin;
              const isTeamLeadOnly = allUserRoles.some((c) => c.includes('team_lead')) && !isHrOrAdmin && !isManagerOnly;

              if (isHrOrAdmin && !['pending_level_3', 'pending_finance'].includes(appStatus)) continue;
              if (isManagerOnly && !['pending_level_2', 'pending_manager'].includes(appStatus)) continue;
              if (isTeamLeadOnly && !['pending_level_1', 'pending', 'submitted'].includes(appStatus)) continue;
            }
            if (params.status === 'approved' && appStatus !== 'approved') continue;
            if (params.status === 'rejected' && appStatus !== 'rejected') continue;
          }

          if (params.search) {
            const s = params.search.toLowerCase();
            const match =
              (tr.requestNumber || tr.request_number || '').toLowerCase().includes(s) ||
              (tr.fromLocation || tr.from_location || '').toLowerCase().includes(s) ||
              (tr.toLocation || tr.to_location || '').toLowerCase().includes(s) ||
              (tr.purpose || '').toLowerCase().includes(s) ||
              (tr.firstName || tr.first_name || '').toLowerCase().includes(s) ||
              (tr.lastName || tr.last_name || '').toLowerCase().includes(s) ||
              (tr.employeeCode || tr.employee_code || '').toLowerCase().includes(s);
            if (!match) continue;
          }

          const existsInClaims = mappedClaims.some((c: any) => c.travelRequestId === tr.id);
          if (!existsInClaims) {
            mappedClaims.push({
              id: `tr_${tr.id}`,
              uuid: tr.uuid || `tr-${tr.id}`,
              claimNumber: tr.requestNumber || tr.request_number || `TRV-${tr.id}`,
              title: `Business Travel: ${tr.fromLocation || tr.from_location || ''} → ${tr.toLocation || tr.to_location || ''}`,
              description: `Travel purpose: ${tr.purpose || 'N/A'}. Dates: ${tr.startDate || tr.start_date || ''} to ${tr.endDate || tr.end_date || ''}`,
              totalClaimedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
              totalApprovedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
              totalRejectedAmount: 0,
              paymentMethod: 'N/A (Travel Request)',
              status: appStatus,
              categoryName: 'Travel',
              claimDate: tr.startDate || tr.start_date || tr.createdAt,
              submittedAt: tr.createdAt || tr.created_at,
              firstName: tr.firstName || tr.first_name,
              lastName: tr.lastName || tr.last_name,
              employeeCode: tr.employeeCode || tr.employee_code,
              departmentName: tr.departmentName || tr.department_name,
              isTravelRequest: true,
              travelRequestId: tr.id,
              items: [
                {
                  id: `tr_item_${tr.id}`,
                  categoryName: 'Travel',
                  expenseDate: tr.startDate || tr.start_date,
                  claimedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
                  description: `Travel from ${tr.fromLocation || tr.from_location} to ${tr.toLocation || tr.to_location}. Purpose: ${tr.purpose}`,
                  policyValidated: true
                }
              ]
            });
          }
        }
      } catch (err) {
        console.error('Failed to include travel requests in getClaims:', err);
      }
    }

    return mappedClaims;
  }

  async getClaimById(ctx: TenantContext, claimId: number | string) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();

    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      const trRow = await db('travel_requests as tr')
        .leftJoin('employees as e', 'tr.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('tr.id', trId)
        .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
        .first();
      if (!trRow) return null;
      const tr = this.mapTravelRequest(trRow);
      return {
        id: `tr_${tr.id}`,
        claimNumber: tr.requestNumber || tr.request_number || `TRV-${tr.id}`,
        title: `Business Travel: ${tr.fromLocation || tr.from_location || ''} → ${tr.toLocation || tr.to_location || ''}`,
        description: `Travel purpose: ${tr.purpose || 'N/A'}. Dates: ${tr.startDate || tr.start_date || ''} to ${tr.endDate || tr.end_date || ''}`,
        totalClaimedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
        totalApprovedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
        totalRejectedAmount: 0,
        paymentMethod: 'N/A (Travel Request)',
        status: tr.status === 'pending' ? 'pending_manager' : tr.status,
        categoryName: 'Travel',
        claimDate: tr.startDate || tr.start_date || tr.createdAt,
        submittedAt: tr.createdAt || tr.created_at,
        firstName: tr.firstName || tr.first_name,
        lastName: tr.lastName || tr.last_name,
        employeeCode: tr.employeeCode || tr.employee_code,
        departmentName: tr.departmentName || tr.department_name,
        items: [
          {
            id: `tr_item_${tr.id}`,
            categoryName: 'Travel',
            expenseDate: tr.startDate || tr.start_date,
            claimedAmount: Number(tr.estimatedBudget ?? tr.estimated_budget ?? 0),
            description: `Travel from ${tr.fromLocation || tr.from_location} to ${tr.toLocation || tr.to_location}. Purpose: ${tr.purpose}`,
            policyValidated: true
          }
        ]
      };
    }

    const numericId = Number(claimId);
    if (isNaN(numericId)) return null;

    const claim = await db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('users as u', 'ec.submitted_by_user_id', 'u.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
      .leftJoin('expense_categories as cat', 'ec.category_id', 'cat.id')
      .leftJoin('travel_requests as tr', 'ec.travel_request_id', 'tr.id')
      .leftJoin('travel_advances as ta', 'ec.travel_advance_id', 'ta.id')
      .where('ec.id', numericId)
      .select(
        'ec.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code',
        'e.bank_name',
        'e.account_no',
        'e.ifsc_code',
        'e.pan_number as pan',
        'd.name as department_name',
        'des.name as designation_name',
        'cat.name as category_name',
        'u.first_name as submitter_first_name',
        'u.last_name as submitter_last_name',
        'u.email as submitter_email',
        'tr.request_number as travel_request_number',
        'ta.advance_number as travel_advance_number',
        'ta.advance_amount as travel_advance_amount'
      )
      .first();

    if (!claim) return null;

    const items = await db('expense_claim_items as eci')
      .leftJoin('expense_categories as c', 'eci.category_id', 'c.id')
      .where('eci.claim_id', claim.id)
      .select('eci.*', 'c.name as category_name');

    const timeline = await db('expense_approval_logs')
      .where('claim_id', claim.id)
      .orderBy('created_at', 'asc');

    claim.items = items;
    claim.timeline = timeline;

    return this.mapClaim(claim);
  }

  private async getApproverName(ctx: TenantContext, fallback: string): Promise<string> {
    if (!ctx.userId) return fallback;
    const db = getKnex();
    const user = await db('users').where('id', ctx.userId).first().catch(() => null);
    if (user && (user.first_name || user.last_name)) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return fallback;
  }

  private async getWorkflowLevelsForClaim(
    db: any,
    organizationId: number,
    totalClaimed: number,
    departmentId?: number | null,
    submitterRole?: string | null
  ) {
    try {
      if (!organizationId) return { workflow: null, levels: [] };
      const workflows = await db('expense_workflows')
        .where('organization_id', organizationId)
        .where('is_active', true)
        .orderBy('min_amount', 'asc');

      if (!workflows || workflows.length === 0) return { workflow: null, levels: [] };

      const targetDeptId = departmentId ? Number(departmentId) : null;
      const roleKey = String(submitterRole || '').toLowerCase();

      let matched = null;

      // 1. Prioritize submitter role-specific workflow (e.g. target_role = 'ceo' or 'hr' or 'manager')
      if (roleKey) {
        matched = workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          const min = Number(wf.min_amount || wf.minAmount || 0);
          const max = Number(wf.max_amount || wf.maxAmount || 999999999);
          const roleMatch = targetRole === roleKey || ((roleKey === 'ceo' || roleKey === 'admin') && (targetRole === 'ceo' || targetRole === 'admin'));
          return roleMatch && totalClaimed >= min && totalClaimed <= max;
        }) || workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          return targetRole === roleKey || ((roleKey === 'ceo' || roleKey === 'admin') && (targetRole === 'ceo' || targetRole === 'admin'));
        });
      }

      // 2. Prioritize department-assigned workflow matching amount or department ID (where target_role is 'all' or empty)
      if (!matched && targetDeptId) {
        matched = workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          if (targetRole !== 'all' && targetRole !== '') return false;
          const deptId = Number(wf.department_id || wf.departmentId || 0);
          const min = Number(wf.min_amount || wf.minAmount || 0);
          const max = Number(wf.max_amount || wf.maxAmount || 999999999);
          return deptId === targetDeptId && totalClaimed >= min && totalClaimed <= max;
        }) || workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          if (targetRole !== 'all' && targetRole !== '') return false;
          const deptId = Number(wf.department_id || wf.departmentId || 0);
          return deptId === targetDeptId;
        });
      }

      // 3. Fallback: Organization-wide workflow (department_id is null / 0 AND target_role is 'all' or empty)
      if (!matched) {
        matched = workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          if (targetRole !== 'all' && targetRole !== '') return false;
          const deptId = Number(wf.department_id || wf.departmentId || 0);
          const min = Number(wf.min_amount || wf.minAmount || 0);
          const max = Number(wf.max_amount || wf.maxAmount || 999999999);
          return deptId === 0 && totalClaimed >= min && totalClaimed <= max;
        }) || workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          if (targetRole !== 'all' && targetRole !== '') return false;
          const deptId = Number(wf.department_id || wf.departmentId || 0);
          return deptId === 0;
        });
      }

      // 4. Last Fallback: Any general workflow
      if (!matched && workflows.length > 0) {
        matched = workflows.find((wf: any) => {
          const targetRole = String(wf.target_role || wf.targetRole || 'all').toLowerCase();
          return targetRole === 'all' || targetRole === '';
        }) || workflows[0];
      }

      let levels: any[] = [];
      if (matched) {
        const rawLevels = await db('expense_workflow_levels')
          .where('workflow_id', matched.id)
          .orderBy('level_order', 'asc');

        levels = (rawLevels || []).map((l: any) => ({
          ...l,
          level_order: Number(l.level_order ?? l.levelOrder ?? l.level ?? 1),
          levelOrder:  Number(l.level_order ?? l.levelOrder ?? l.level ?? 1),
          approver_type: String(l.approver_type ?? l.approverType ?? '').toLowerCase(),
          approverType:  String(l.approver_type ?? l.approverType ?? '').toLowerCase(),
          approver_role: String(l.approver_role ?? l.approverRole ?? ''),
          approverRole:  String(l.approver_role ?? l.approverRole ?? ''),
          step_name: String(l.step_name ?? l.stepName ?? ''),
          stepName:  String(l.step_name ?? l.stepName ?? ''),
          is_mandatory: Boolean(l.is_mandatory ?? l.isMandatory ?? true),
          isMandatory:  Boolean(l.is_mandatory ?? l.isMandatory ?? true),
        }));
      }

      if (levels.length === 0) {
        levels = [
          { level_order: 1, levelOrder: 1, approver_type: 'manager', approverType: 'manager', approver_role: 'Reporting Manager', approverRole: 'Reporting Manager', step_name: 'Manager Approval', stepName: 'Manager Approval', is_mandatory: true, isMandatory: true },
          { level_order: 2, levelOrder: 2, approver_type: 'hr_admin', approverType: 'hr_admin', approver_role: 'Finance Verification', approverRole: 'Finance Verification', step_name: 'Finance Verification', stepName: 'Finance Verification', is_mandatory: true, isMandatory: true }
        ];
      }

      return { workflow: matched, levels };
    } catch (err) {
      console.error('Failed to resolve workflow levels:', err);
      return { workflow: null, levels: [
        { level_order: 1, levelOrder: 1, approver_type: 'manager', approverType: 'manager', approver_role: 'Reporting Manager', approverRole: 'Reporting Manager', step_name: 'Manager Approval', stepName: 'Manager Approval', is_mandatory: true, isMandatory: true },
        { level_order: 2, levelOrder: 2, approver_type: 'hr_admin', approverType: 'hr_admin', approver_role: 'Finance Verification', approverRole: 'Finance Verification', step_name: 'Finance Verification', stepName: 'Finance Verification', is_mandatory: true, isMandatory: true }
      ] };
    }
  }

  private getRoleRank(role: string): number {
    const r = String(role || '').toLowerCase();
    if (['ceo', 'organization_admin', 'super_admin', 'admin'].includes(r) || r.includes('admin') || r.includes('ceo')) return 4;
    if (['hr', 'hr_admin', 'hr_manager'].includes(r) || r.startsWith('hr')) return 3;
    if (['manager', 'department_head', 'dept_head'].includes(r) || r.includes('manager') || r.includes('department_head')) return 2;
    if (['team_lead'].includes(r) || r.includes('team_lead')) return 1;
    return 0; // employee
  }

  private async getSubmitterRole(ctx: TenantContext, db: any): Promise<string> {
    try {
      const userRoleRows = ctx.userId ? await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', ctx.userId)
        .where('user_roles.organization_id', ctx.organizationId)
        .select('roles.code as role_code', 'roles.name as role_name')
        .catch(() => []) : [];

      const dbRoleCodes = (userRoleRows || []).map((r: any) =>
        String(r.role_code || r.roleCode || r.code || r.role_name || r.roleName || '').toLowerCase().trim()
      );

      const userRow = ctx.userId ? await db('users').where('id', ctx.userId).first('role').catch(() => null) : null;
      const primaryUserRole = userRow?.role ? String(userRow.role).toLowerCase().trim() : '';

      const ctxRoles = [ctx.role, ...(ctx.roles || []), (ctx as any).roleCode].map(r => String(r || '').toLowerCase().trim()).filter(Boolean);

      const allRoles = [...new Set([...dbRoleCodes, primaryUserRole, ...ctxRoles])];

      // Organization Admin / CEO / Super Admin is unconditionally CEO
      const isCEO = allRoles.some(r =>
        ['ceo', 'super_admin', 'superadmin', 'organization_admin', 'owner', 'executive'].includes(r) ||
        r.includes('ceo') || r.includes('organization_admin')
      );

      if (isCEO) {
        return 'ceo';
      }

      // HR Admin / HR staff is unconditionally HR
      const isHR = allRoles.some(r =>
        ['hr_admin', 'hr_manager', 'hr'].includes(r) || r.startsWith('hr')
      );
      if (isHR) {
        return 'hr';
      }

      const emp = await this.getEmployeeForCtx(ctx);
      if (emp) {
        const isManagerToOthers = await db('employees')
          .where('organization_id', ctx.organizationId)
          .where('reporting_manager_id', emp.id)
          .first('id')
          .catch(() => null);

        const isDeptHead = emp.current_department_id ? await db('departments')
          .where('id', emp.current_department_id)
          .where('manager_id', emp.id)
          .first('id')
          .catch(() => null) : null;

        const isManagerRole = allRoles.some(r => r.includes('manager') || r.includes('dept_head')) || Boolean(isDeptHead);

        if (isManagerRole && isManagerToOthers) {
          return 'manager';
        }

        const isTeamLeadRole = allRoles.some(r => r.includes('team_lead') || r.includes('lead'));
        if (isTeamLeadRole) {
          return 'team_lead';
        }

        if (isManagerToOthers) {
          return 'team_lead';
        }

        return 'employee';
      }

      if (allRoles.some(r => r.includes('manager'))) return 'manager';
      if (allRoles.some(r => r.includes('team_lead'))) return 'team_lead';
    } catch (err) {
      console.error('Error resolving submitter role:', err);
    }
    return 'employee';
  }

  private resolveInitialWorkflowStatus(
    submittedByRole: string,
    levels: any[],
    defaultSettings: { requireManagerApproval: boolean; requireFinanceApproval: boolean },
    workflowTargetRole?: string | null
  ): { status: string; currentLevel: number; currentApproverRole: string; workflowId: number | null } {
    const roleKey = String(submittedByRole || '').toLowerCase();
    const wfTarget = String(workflowTargetRole || '').toLowerCase();
    let validLevels = (levels || []).slice();

    // If the workflow is specifically targeted to CEO (wfTarget === 'ceo'), preserve its explicit level sequence!
    // Only filter out manager/team lead levels if CEO claim fell back to a generic/all workflow.
    if ((roleKey === 'ceo' || roleKey === 'admin') && wfTarget !== 'ceo') {
      validLevels = validLevels.filter((l: any) => {
        const type = String(l.approverType || l.approver_type || '').toLowerCase();
        return !['team_lead', 'reporting_manager', 'department_head', 'dept_head', 'manager'].some(t => type.includes(t));
      });
    } else if (roleKey === 'hr' && wfTarget !== 'hr') {
      validLevels = validLevels.filter((l: any) => {
        const type = String(l.approverType || l.approver_type || '').toLowerCase();
        return !type.includes('team_lead');
      });
    }

    if (validLevels && validLevels.length > 0) {
      const firstLevel = validLevels[0];
      const lvlOrder = Number(firstLevel.levelOrder ?? firstLevel.level_order ?? 1);
      const roleName = String(
        firstLevel.stepName || firstLevel.step_name || firstLevel.approverRole || firstLevel.approver_role || `Level ${lvlOrder} Approver`
      ).trim();

      const approverType = String(
        firstLevel.approverType || firstLevel.approver_type || firstLevel.approverRole || firstLevel.approver_role || ''
      ).toLowerCase().trim();

      let statusStr = `pending_level_${lvlOrder}`;
      if (approverType === 'team_lead' || approverType.includes('team_lead')) {
        statusStr = 'pending_level_1';
      } else if (['department_head', 'reporting_manager', 'manager', 'reporting_officer', 'dept_head'].some(x => approverType.includes(x))) {
        statusStr = 'pending_level_2';
      } else if (['hr', 'hr_admin', 'hr_manager', 'admin'].some(x => approverType.includes(x))) {
        statusStr = 'pending_level_3';
      } else if (['finance', 'ceo'].some(x => approverType.includes(x))) {
        statusStr = 'pending_finance';
      }

      return {
        status: statusStr,
        currentLevel: lvlOrder,
        currentApproverRole: roleName,
        workflowId: firstLevel.workflow_id ? Number(firstLevel.workflow_id) : null,
      };
    }

    // Default fallback when no valid workflow levels exist for submitter role
    return {
      status: defaultSettings.requireFinanceApproval ? 'pending_finance' : 'approved',
      currentLevel: 1,
      currentApproverRole: defaultSettings.requireFinanceApproval ? 'Finance Verification' : 'Auto-Approved',
      workflowId: null,
    };
  }

  private async resolveSubmitStatus(
    ctx: TenantContext,
    items: Array<{ categoryId?: number | null; claimedAmount: number; policyValidated?: boolean }>,
    isDraft: boolean,
    submittedByRoleParam?: string,
    departmentId?: number | null
  ): Promise<{ status: string; currentLevel: number; currentRole: string; workflowId: number | null }> {
    if (isDraft) {
      return { status: 'draft', currentLevel: 0, currentRole: 'Draft', workflowId: null };
    }
    const db = getKnex();
    const submittedByRole = submittedByRoleParam || await this.getSubmitterRole(ctx, db);
    const totalClaimed = items.reduce((sum, item) => sum + Number(item.claimedAmount || 0), 0);
    const { workflow, levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, totalClaimed, departmentId, submittedByRole);
    const settings = await this.getSettings(ctx);
    const wfTarget = workflow ? String(workflow.target_role || workflow.targetRole || 'all') : 'all';
    const resolved = this.resolveInitialWorkflowStatus(submittedByRole, levels, settings, wfTarget);

    return {
      status: resolved.status,
      currentLevel: resolved.currentLevel,
      currentRole: resolved.currentApproverRole,
      workflowId: workflow ? Number(workflow.id) : resolved.workflowId,
    };
  }

  async createClaim(ctx: TenantContext, input: ClaimInput) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const empId = emp ? emp.id : null;
    const deptId = emp ? (emp.current_department_id ?? emp.currentDepartmentId ?? null) : null;

    const config = await this.getConfig(ctx);
    const claimNumber = await ExpenseConfigService.nextNumber(ctx.organizationId, 'claim', config.claimNumberPrefix, config.numberSequenceDigits);
    const isDraft = Boolean(input.isDraft);

    const itemsInput: ExpenseItemInput[] = input.items && input.items.length > 0 ? input.items : [
      {
        categoryId: input.categoryId,
        expenseDate: input.claimDate || new Date().toISOString().slice(0, 10),
        claimedAmount: (input as any).amount || 0,
        merchantName: input.merchantName,
        description: input.description,
        projectCostCenter: input.projectCostCenter,
        receiptUrl: input.receiptUrl,
        receiptFileName: undefined,
        receiptFileType: undefined,
        receiptFileSize: undefined,
        employeeJustification: undefined
      }
    ];

    let totalClaimed = 0;
    const validatedItems: any[] = [];

    for (const item of itemsInput) {
      const amt = Number(item.claimedAmount || 0);
      totalClaimed += amt;

      const catId = item.categoryId || input.categoryId || null;
      const receiptProvided = Boolean(item.receiptUrl || input.receiptUrl);
      const validation = await this.validatePolicyForClaim(ctx, catId || 0, amt, receiptProvided);

      validatedItems.push({
        ...item,
        categoryId: catId,
        claimedAmount: amt,
        approvedAmount: 0,
        rejectedAmount: 0,
        policyValidated: validation.isValid,
        policyViolations: validation.violations.length > 0 ? JSON.stringify(validation.violations) : null
      });
    }

    const orgId = ctx.organizationId;
    const submittedByRole = await this.getSubmitterRole(ctx, db);

    const wfSubmit = await this.resolveSubmitStatus(ctx, validatedItems, isDraft, submittedByRole, deptId);

    const res = await db('expense_claims').insert({
      uuid: uuidv4(),
      claim_number: claimNumber,
      organization_id: orgId,
      employee_id: empId,
      submitted_by_user_id: ctx.userId || null,
      title: input.title || 'Expense Claim',
      category_id: input.categoryId || (validatedItems[0]?.categoryId || null),
      claim_date: input.claimDate || new Date().toISOString().slice(0, 10),
      total_claimed_amount: totalClaimed,
      total_approved_amount: 0,
      total_rejected_amount: 0,
      payment_method: input.paymentMethod || config.defaultPaymentMethod,
      merchant_name: input.merchantName || (validatedItems[0]?.merchantName || null),
      description: input.description || null,
      project_cost_center: input.projectCostCenter || null,
      receipt_url: input.receiptUrl || (validatedItems[0]?.receiptUrl || null),
      travel_request_id: input.travelRequestId || null,
      travel_advance_id: input.travelAdvanceId || null,
      submitted_by_role: submittedByRole,
      status: wfSubmit.status,
      current_level: wfSubmit.currentLevel,
      current_approver_role: wfSubmit.currentRole,
      workflow_id: wfSubmit.workflowId,
      submitted_at: isDraft ? null : new Date(),
      created_at: new Date(),
      updated_at: new Date()
    });

    const claimId = Number(Array.isArray(res) ? res[0] : res);

    for (const item of validatedItems) {
      await db('expense_claim_items').insert({
        claim_id: claimId,
        category_id: item.categoryId || null,
        expense_date: item.expenseDate || input.claimDate || new Date().toISOString().slice(0, 10),
        claimed_amount: item.claimedAmount,
        approved_amount: isDraft ? 0 : item.claimedAmount,
        rejected_amount: 0,
        merchant_name: item.merchantName || input.merchantName || null,
        description: item.description || input.description || null,
        project_cost_center: item.projectCostCenter || input.projectCostCenter || null,
        receipt_url: item.receiptUrl || input.receiptUrl || null,
        receipt_file_name: item.receiptFileName || null,
        receipt_file_type: item.receiptFileType || null,
        receipt_file_size: item.receiptFileSize || null,
        policy_validated: item.policyValidated,
        policy_violations: item.policyViolations,
        employee_justification: item.employeeJustification || null,
        status: isDraft ? 'draft' : 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Employee';
    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx.userId || null,
      approver_name: empName,
      approver_role: 'Employee',
      action: isDraft ? 'Draft Created' : 'Claim Submitted',
      comments: isDraft
        ? 'Saved as draft'
        : (wfSubmit.status === 'draft' ? 'Saved as draft' : 'Claim submitted for approval'),
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  async updateClaim(ctx: TenantContext, claimId: number, input: ClaimInput) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const existing = await db('expense_claims').where('id', claimId).where('organization_id', ctx.organizationId).first();
    if (!existing) throw new Error('Claim not found');

    const isSubmit = Boolean(!input.isDraft);
    // newStatus is resolved via resolveSubmitStatus below — no hardcoded 'pending_manager'

    const itemsInput: ExpenseItemInput[] = input.items && input.items.length > 0 ? input.items : [
      {
        categoryId: input.categoryId,
        expenseDate: input.claimDate,
        claimedAmount: (input as any).amount || 0,
        merchantName: input.merchantName,
        description: input.description,
        projectCostCenter: input.projectCostCenter,
        receiptUrl: input.receiptUrl,
        receiptFileName: undefined,
        receiptFileType: undefined,
        receiptFileSize: undefined,
        employeeJustification: undefined
      }
    ];

    let totalClaimed = 0;
    const validatedItems: Array<{ categoryId?: number | null; claimedAmount: number; policyValidated?: boolean }> = [];
    await db('expense_claim_items').where('claim_id', claimId).delete();

    for (const item of itemsInput) {
      const amt = Number(item.claimedAmount || 0);
      totalClaimed += amt;

      const catId = item.categoryId || input.categoryId || null;
      const receiptProvided = Boolean(item.receiptUrl || input.receiptUrl);
      const validation = await this.validatePolicyForClaim(ctx, catId || 0, amt, receiptProvided);
      validatedItems.push({ categoryId: catId, claimedAmount: amt, policyValidated: validation.isValid });

      await db('expense_claim_items').insert({
        claim_id: claimId,
        category_id: catId,
        expense_date: item.expenseDate || input.claimDate || new Date().toISOString().slice(0, 10),
        claimed_amount: amt,
        approved_amount: isSubmit ? amt : 0,
        rejected_amount: 0,
        merchant_name: item.merchantName || input.merchantName || null,
        description: item.description || input.description || null,
        project_cost_center: item.projectCostCenter || input.projectCostCenter || null,
        receipt_url: item.receiptUrl || input.receiptUrl || null,
        receipt_file_name: item.receiptFileName || null,
        receipt_file_type: item.receiptFileType || null,
        receipt_file_size: item.receiptFileSize || null,
        policy_validated: validation.isValid,
        policy_violations: validation.violations.length > 0 ? JSON.stringify(validation.violations) : null,
        employee_justification: item.employeeJustification || null,
        status: isSubmit ? 'pending' : 'draft',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Reuse the original submitted_by_role from the existing claim for routing consistency
    const submittedByRole = String(existing.submitted_by_role || existing.submittedByRole || 'employee');

    // Special case: if the claim was returned for correction, re-enter at the very first
    // workflow level (respecting amount-based routing) — do not skip levels based on role.
    const existingStatus = String(existing.status || '');
    const isReturnedResubmit = isSubmit && existingStatus === 'returned';

    let wfSub: { status: string; currentLevel: number; currentRole: string; workflowId: number | null };

    let updateDeptId: number | null = null;
    if (existing.employee_id) {
      const claimEmp = await db('employees').where('id', existing.employee_id).first('current_department_id').catch(() => null);
      updateDeptId = claimEmp?.current_department_id ? Number(claimEmp.current_department_id) : null;
    }

    if (isReturnedResubmit) {
      // Re-enter workflow from scratch for returned claims (treat submitter as employee
      // so all approval levels are preserved regardless of the original role)
      wfSub = await this.resolveSubmitStatus(ctx, validatedItems, false, 'employee', updateDeptId);
    } else {
      wfSub = await this.resolveSubmitStatus(ctx, validatedItems, !isSubmit, submittedByRole, updateDeptId);
    }


    await db('expense_claims')
      .where('id', claimId)
      .update({
        title: input.title || existing.title,
        category_id: input.categoryId || existing.category_id,
        claim_date: input.claimDate || existing.claim_date,
        total_claimed_amount: totalClaimed,
        total_approved_amount: 0,
        payment_method: input.paymentMethod || existing.payment_method,
        merchant_name: input.merchantName || existing.merchant_name,
        description: input.description || existing.description,
        project_cost_center: input.projectCostCenter || existing.project_cost_center,
        receipt_url: input.receiptUrl || existing.receipt_url,
        travel_request_id: input.travelRequestId || existing.travel_request_id,
        travel_advance_id: input.travelAdvanceId || existing.travel_advance_id,
        submitted_by_role: submittedByRole,
        status: wfSub.status,
        current_level: wfSub.currentLevel,
        current_approver_role: wfSub.currentRole,
        workflow_id: wfSub.workflowId,
        submitted_at: isSubmit ? new Date() : existing.submitted_at,
        updated_at: new Date()
      });

    const emp = await this.getEmployeeForCtx(ctx);
    const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Employee';
    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx.userId || null,
      approver_name: empName,
      approver_role: 'Employee',
      action: isReturnedResubmit ? 'Return Correction Resubmitted' : (isSubmit ? 'Resubmitted Claim' : 'Updated Draft'),
      comments: isReturnedResubmit
        ? 'Employee addressed the return comments and resubmitted the claim for approval'
        : (isSubmit ? 'Claim resubmitted with updated items' : 'Draft updated'),
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  // --- APPROVAL ACTIONS ---
  async approveClaimByManager(ctx: TenantContext, claimId: number | string, comments?: string, options?: { isAbsenteeOverride?: boolean; delegatedForId?: number }) {
    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      return this.updateTravelRequestStatus(ctx, trId, 'approved', comments, options);
    }

    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim, 'manager');

    const totalClaimed = Number(claim.total_claimed_amount || 0);

    let claimDeptId: number | null = null;
    if (claim.employee_id) {
      const claimEmp = await db('employees').where('id', claim.employee_id).first('current_department_id').catch(() => null);
      claimDeptId = claimEmp?.current_department_id ? Number(claimEmp.current_department_id) : null;
    }

    const { levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, totalClaimed, claimDeptId);

    // Validate that current user's role matches the required approver for this level
    await this.assertApproverMatchesWorkflowLevel(ctx, claim, levels);

    const currentLevelNum = this.getCurrentLevelNum(claim.status, claim.currentLevel ?? claim.current_level);
    let nextStatus = 'pending_finance';
    let nextLevelNum = currentLevelNum + 1;
    let nextRoleName = 'Finance Verification';
    let isFinalStep = true;

    if (levels && levels.length > 0) {
      const nextLvlIndex = levels.findIndex((l: any) => Number(l.levelOrder ?? l.level_order) > currentLevelNum);
      if (nextLvlIndex >= 0) {
        const nextLvl = levels[nextLvlIndex];
        nextLevelNum = Number(nextLvl.levelOrder ?? nextLvl.level_order ?? (currentLevelNum + 1));
        const lvlType = String(nextLvl.approverType || nextLvl.approver_type || nextLvl.approverRole || nextLvl.approver_role || '').toLowerCase();
        if (lvlType === 'finance' || lvlType.includes('finance')) {
          nextStatus = 'pending_finance';
          nextRoleName = 'Finance Verification';
          isFinalStep = true;
        } else if (lvlType === 'team_lead' || lvlType.includes('team_lead')) {
          nextStatus = 'pending_level_1';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Team Lead Review');
          isFinalStep = false;
        } else if (['department_head', 'reporting_manager', 'manager', 'reporting_officer', 'dept_head'].some(x => lvlType.includes(x))) {
          nextStatus = 'pending_level_2';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Manager Approval');
          isFinalStep = false;
        } else if (['hr', 'hr_admin', 'hr_manager', 'admin'].some(x => lvlType.includes(x))) {
          nextStatus = 'pending_level_3';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'HR Approval');
          isFinalStep = false;
        } else {
          nextStatus = `pending_level_${nextLevelNum}`;
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || nextLvl.approverRole || nextLvl.approver_role || `Level ${nextLevelNum} Approver`).trim();
          isFinalStep = false;
        }
      } else {
        const settings = await this.getSettings(ctx);
        if (settings.requireFinanceApproval) {
          nextStatus = 'pending_finance';
          nextRoleName = 'Finance Verification';
          isFinalStep = true;
        } else {
          nextStatus = 'approved';
          nextRoleName = 'Approved';
          isFinalStep = true;
        }
      }
    } else {
      const settings = await this.getSettings(ctx);
      if (settings.requireFinanceApproval) {
        nextStatus = 'pending_finance';
        nextRoleName = 'Finance Verification';
        isFinalStep = true;
      } else {
        nextStatus = 'approved';
        nextRoleName = 'Approved';
        isFinalStep = true;
      }
    }

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: nextStatus,
        current_level: nextLevelNum,
        current_approver_role: nextRoleName,
        updated_at: new Date()
      });

    await db('expense_claim_items').where('claim_id', claimId).update({ status: 'manager_approved' });

    const currentRoleLabel = claim.current_approver_role || `Level ${currentLevelNum} Reviewer`;
    const approverName = await this.getApproverName(ctx, currentRoleLabel);

    const isOverride = Boolean(options?.isAbsenteeOverride);
    const actionText = isOverride
      ? 'Approved (Absent Team Lead Override)'
      : `Approved Level ${currentLevelNum}`;

    const auditMessage = isOverride
      ? (comments ? `[Team Lead Absent Override] Remark: ${comments}` : '[Team Lead Absent Override] Approved on behalf of absent Team Lead')
      : (isFinalStep
          ? (comments || 'Claim approved by all workflow levels and forwarded to Finance Verification.')
          : (comments || `Claim approved at Level ${currentLevelNum} (${currentRoleLabel}) and forwarded to Level ${nextLevelNum} (${nextRoleName}).`));

    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx?.userId || null,
      approver_name: approverName,
      approver_role: currentRoleLabel,
      action: actionText,
      comments: auditMessage,
      is_absentee_override: isOverride,
      delegated_for_user_id: options?.delegatedForId || null,
      created_at: new Date()
    });

    const updatedClaim = await this.getClaimById(ctx, claimId);
    return {
      ...updatedClaim,
      nextStepName: nextRoleName,
      isFinalStep,
      message: isFinalStep
        ? 'Request approved and sent to Finance Verification'
        : `Request approved and sent to next approver: ${nextRoleName}`
    };
  }

  async bulkApproveClaims(ctx: TenantContext, ids: (number | string)[], comments?: string) {
    const approved: (number | string)[] = [];
    const failed: Array<{ id: number | string; message: string }> = [];

    for (const id of ids) {
      try {
        if (typeof id === 'string' && id.startsWith('tr_')) {
          const trId = Number(id.replace('tr_', ''));
          await this.updateTravelRequestStatus(ctx, trId, 'approved', comments || 'Bulk approved');
          approved.push(id);
          continue;
        }

        const db = getKnex();
        const claim = await db('expense_claims').where('id', id).first();
        if (!claim) throw new Error('Claim not found');
        const status = String(claim.status || '');

        // Handle multi-step workflow levels (pending_level_1, pending_level_2, pending_level_3, etc.)
        const isWorkflowLevel = /^pending_level_\d+$/.test(status);

        if (isWorkflowLevel || ['submitted', 'pending_manager', 'pending'].includes(status)) {
          await this.approveClaimByManager(ctx, Number(id), comments);
        } else if (status === 'pending_finance') {
          await this.verifyAndApproveByFinance(ctx, Number(id), {
            comments: comments || 'Bulk verified by finance',
          });
        } else {
          throw new Error(`Claim is not pending approval (status: ${status})`);
        }
        approved.push(id);
      } catch (err: any) {
        failed.push({ id, message: err.message || 'Failed to approve' });
      }
    }

    return { approved, failed };
  }


  async verifyAndApproveByFinance(ctx: TenantContext, claimId: number | string, body: { items?: Array<{ id: number; approvedAmount: number; adjustmentReason?: string }>; comments?: string }) {
    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      await this.ensureInitialized(ctx?.organizationId || 1);
      const db = getKnex();
      await db('travel_requests')
        .where('id', trId)
        .where('organization_id', ctx.organizationId)
        .update({
          status: 'approved',
          current_approver_role: 'Approved by Finance',
          approver_id: ctx.userId || null,
          approver_notes: body?.comments || 'Verified & approved by Finance',
          updated_at: new Date()
        });
      const row = await db('travel_requests as tr')
        .leftJoin('employees as e', 'tr.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('tr.id', trId)
        .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
        .first();
      const mapped = this.mapTravelRequest(row);
      return {
        ...mapped,
        id: `tr_${row.id}`,
        claimNumber: row.request_number || `TRV-${row.id}`,
        status: 'approved',
        currentApproverRole: 'Approved by Finance',
        nextStepName: 'Approved',
        isFinalStep: true,
        message: 'Travel request verified & approved by Finance'
      };
    }

    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const config = await this.getConfig(ctx);
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim, 'finance');

    const comments = String(body.comments || '').trim();
    if (comments.length < 5) {
      throw new Error('Finance comments are required (at least 5 characters).');
    }

    if (body.items && body.items.length > 0) {
      for (const itemUpdate of body.items) {
        const existingItem = await db('expense_claim_items').where('id', itemUpdate.id).first();
        if (!existingItem) continue;
        const itemClaimed = Number(existingItem.claimedAmount ?? existingItem.claimed_amount ?? 0);
        const appAmt = Number(itemUpdate.approvedAmount);
        if (Number.isNaN(appAmt) || appAmt < 0) {
          throw new Error('Approved amount must be a number greater than or equal to 0.');
        }
        if (appAmt > itemClaimed) {
          throw new Error('Approved amount cannot exceed the claimed amount for any line item.');
        }
        if (appAmt !== itemClaimed && !String(itemUpdate.adjustmentReason || '').trim()) {
          throw new Error('Adjustment reason is required when the approved amount differs from the claimed amount.');
        }
      }
    }

    const rawClaimed = claim.totalClaimedAmount ?? claim.total_claimed_amount;
    const claimedVal = Number(rawClaimed || 0);
    const safeClaimed = isNaN(claimedVal) ? 0 : claimedVal;

    let totalApproved = 0;
    let totalRejected = 0;

    if (body.items && body.items.length > 0) {
      for (const itemUpdate of body.items) {
        const existingItem = await db('expense_claim_items').where('id', itemUpdate.id).first();
        if (existingItem) {
          const itemClaimedRaw = existingItem.claimedAmount ?? existingItem.claimed_amount;
          const itemClaimed = Number(itemClaimedRaw || 0);
          const appAmt = Number(itemUpdate.approvedAmount || 0);
          const rejAmt = Math.max(0, itemClaimed - appAmt);
          totalApproved += appAmt;
          totalRejected += rejAmt;

          await db('expense_claim_items').where('id', itemUpdate.id).update({
            approved_amount: appAmt,
            rejected_amount: rejAmt,
            adjustment_reason: itemUpdate.adjustmentReason || null,
            status: appAmt > 0 ? 'approved' : 'rejected',
            updated_at: new Date()
          });
        }
      }
    } else {
      totalApproved = safeClaimed;
      totalRejected = 0;
      await db('expense_claim_items').where('claim_id', claimId).update({
        approved_amount: db.raw('claimed_amount'),
        rejected_amount: 0,
        status: 'approved',
        updated_at: new Date()
      });
    }

    const totalClaimed = Number(claim.total_claimed_amount || 0);
    let claimDeptId: number | null = null;
    if (claim.employee_id) {
      const claimEmp = await db('employees').where('id', claim.employee_id).first('current_department_id').catch(() => null);
      claimDeptId = claimEmp?.current_department_id ? Number(claimEmp.current_department_id) : null;
    }

    const submittedByRole = String(claim.submitted_by_role || claim.submittedByRole || 'employee');
    const { levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, totalClaimed, claimDeptId, submittedByRole);

    const currentLevelNum = this.getCurrentLevelNum(claim.status, claim.current_level ?? claim.currentLevel);

    let nextStatus = 'payment_pending';
    let nextLevelNum = currentLevelNum + 1;
    let nextRoleName = 'Payout Processing';
    let isFinalStep = true;

    if (levels && levels.length > 0) {
      const nextLvlIndex = levels.findIndex((l: any) => Number(l.levelOrder ?? l.level_order) > currentLevelNum);
      if (nextLvlIndex >= 0) {
        const nextLvl = levels[nextLvlIndex];
        nextLevelNum = Number(nextLvl.levelOrder ?? nextLvl.level_order ?? (currentLevelNum + 1));
        const lvlType = String(nextLvl.approverType || nextLvl.approver_type || nextLvl.approverRole || nextLvl.approver_role || '').toLowerCase();

        if (['department_head', 'reporting_manager', 'manager', 'reporting_officer', 'dept_head'].some(x => lvlType.includes(x))) {
          nextStatus = 'pending_level_2';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Manager Approval');
          isFinalStep = false;
        } else if (lvlType === 'team_lead' || lvlType.includes('team_lead')) {
          nextStatus = 'pending_level_1';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Team Lead Review');
          isFinalStep = false;
        } else if (['hr', 'hr_admin', 'hr_manager', 'admin'].some(x => lvlType.includes(x))) {
          nextStatus = 'pending_level_3';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'HR Approval');
          isFinalStep = false;
        } else if (lvlType === 'finance' || lvlType.includes('finance')) {
          nextStatus = 'pending_finance';
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Finance Verification');
          isFinalStep = false;
        } else {
          nextStatus = `pending_level_${nextLevelNum}`;
          nextRoleName = String(nextLvl.stepName || nextLvl.step_name || `Level ${nextLevelNum} Approver`).trim();
          isFinalStep = false;
        }
      }
    }

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: nextStatus,
        current_level: nextLevelNum,
        current_approver_role: nextRoleName,
        total_approved_amount: totalApproved,
        total_rejected_amount: totalRejected,
        approved_at: isFinalStep ? new Date() : claim.approved_at,
        updated_at: new Date()
      });

    // Auto-settle linked travel advance if present
    if (claim.travel_advance_id) {
      try {
        const advance = await db('travel_advances').where('id', claim.travel_advance_id).first();
        if (advance) {
          const advAmt = Number(advance.advance_amount || 0);
          const currentSettled = Number(advance.settled_amount || 0);
          const newSettled = Math.min(advAmt, currentSettled + totalApproved);
          const newBalance = Math.max(0, advAmt - newSettled);
          await db('travel_advances').where('id', claim.travel_advance_id).update({
            settled_amount: newSettled,
            balance_amount: newBalance,
            status: newBalance === 0 ? 'settled' : 'partially_settled',
            updated_at: new Date()
          });
        }
      } catch (advErr) {
        console.error('Failed to auto-settle travel advance:', advErr);
      }
    }

    const approverName = await this.getApproverName(ctx, 'Finance Officer');
    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx.userId || null,
      approver_name: approverName,
      approver_role: 'Finance / Accounts',
      action: isFinalStep ? 'Verified & Approved by Finance' : `Level ${currentLevelNum} Finance Verification Approved`,
      comments: isFinalStep
        ? (body.comments || `Finance verified claim. Approved amount: ${ExpenseConfigService.formatAmount(totalApproved, config)}`)
        : (body.comments || `Finance verified claim and forwarded to next approver: ${nextRoleName}`),
      created_at: new Date()
    });

    const updatedClaim = await this.getClaimById(ctx, claimId);
    return {
      ...updatedClaim,
      nextStepName: nextRoleName,
      isFinalStep,
      message: isFinalStep
        ? 'Claim verified by Finance and moved to payout processing'
        : `Claim verified by Finance and forwarded to next approver: ${nextRoleName}`
    };
  }

  async rejectClaim(ctx: TenantContext, claimId: number | string, reason: string) {
    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      return this.updateTravelRequestStatus(ctx, trId, 'rejected', reason);
    }

    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    if (!reason || !reason.trim()) throw new Error('Rejection reason is mandatory');
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim, 'finance');

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: 'rejected',
        rejection_reason: reason,
        total_approved_amount: 0,
        total_rejected_amount: db.raw('total_claimed_amount'),
        updated_at: new Date()
      });

    await db('expense_claim_items').where('claim_id', claimId).update({
      approved_amount: 0,
      rejected_amount: db.raw('claimed_amount'),
      status: 'rejected',
      updated_at: new Date()
    });

    const approverName = await this.getApproverName(ctx, 'Approver');

    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx?.userId || null,
      approver_name: approverName,
      approver_role: 'Approver',
      action: 'Rejected',
      comments: `Claim rejected. Reason: ${reason}`,
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  async returnClaimForCorrection(ctx: TenantContext, claimId: number | string, comments: string) {
    if (!comments || !comments.trim()) throw new Error('Correction comments are mandatory');

    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      const db = getKnex();
      const travelReq = await db('travel_requests').where('id', trId).where('organization_id', ctx.organizationId).first();
      if (!travelReq) throw new Error('Travel request not found');

      const currentLevel = Number(travelReq.current_level || 1);
      const currentStatus = String(travelReq.status || 'pending');

      if (currentLevel > 1 || ['pending_level_2', 'pending_level_3', 'pending_finance'].includes(currentStatus)) {
        throw new Error('Only Level 1 Team Lead approvers can return applications for correction. Managers can only approve or reject.');
      }

      return this.updateTravelRequestStatus(ctx, trId, 'returned', comments);
    }

    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim, 'finance');

    const currentLevel = Number(claim.current_level ?? claim.currentLevel ?? 1);
    const currentStatus = String(claim.status || 'pending');

    if (currentLevel > 1 || ['pending_level_2', 'pending_level_3', 'pending_finance'].includes(currentStatus)) {
      throw new Error('Only Level 1 Team Lead approvers can return applications for correction. Managers can only approve or reject.');
    }

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: 'returned',
        return_comments: comments,
        updated_at: new Date()
      });

    await db('expense_claim_items').where('claim_id', claimId).update({
      status: 'returned',
      updated_at: new Date()
    });

    const approverName = await this.getApproverName(ctx, 'Approver');

    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx?.userId || null,
      approver_name: approverName,
      approver_role: 'Approver',
      action: 'Returned for Correction',
      comments: comments,
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  // --- REIMBURSEMENT PAYMENT RECORDING ---
  async processReimbursement(ctx: TenantContext, claimId: number | string, body: { paymentDate: string; paidAmount: number; paymentMethod: string; paymentReference: string }) {
    if (typeof claimId === 'string' && (claimId as string).startsWith('tr_')) {
      const trId = Number((claimId as string).replace('tr_', ''));
      return this.updateTravelRequestStatus(ctx, trId, 'approved', `Paid via ${body.paymentMethod || 'bank_transfer'}. Ref #${body.paymentReference || 'N/A'}`);
    }

    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const config = await this.getConfig(ctx);
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim, 'payout');

    const method = String(body.paymentMethod || config.defaultPaymentMethod).toLowerCase();
    const ref = String(body.paymentReference || '').trim();
    if (method !== 'cash' && !ref) {
      throw new Error('Transaction Reference / UTR number is mandatory for Bank Transfer / Online payment.');
    }

    const rawAmt = claim.totalApprovedAmount ?? claim.total_approved_amount ?? claim.totalClaimedAmount ?? claim.total_claimed_amount;
    const numAmt = Number(rawAmt || 0);
    const safeAmt = isNaN(numAmt) ? 0 : numAmt;
    const paidAmt = Number(body.paidAmount || safeAmt);

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: 'paid',
        payment_date: body.paymentDate || new Date().toISOString().slice(0, 10),
        paid_amount: paidAmt,
        payment_method: body.paymentMethod || 'bank_transfer',
        payment_reference: ref || null,
        reimbursed_at: new Date(),
        updated_at: new Date()
      });

    const financeName = await this.getApproverName(ctx, 'Finance Accounts');

    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx.userId || null,
      approver_name: financeName,
      approver_role: 'Finance / Accounts',
      action: 'Reimbursement Disbursed',
      comments: `Payment processed via ${body.paymentMethod || config.defaultPaymentMethod}. Ref #${ref || 'N/A'}. Amount: ${ExpenseConfigService.formatAmount(paidAmt, config)}`,
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  // --- TRAVEL REQUESTS & ADVANCES ---
  private mapTravelRequest(row: any) {
    if (!row) return row;
    return {
      ...row,
      requestNumber: row.request_number || row.requestNumber,
      employeeId: row.employee_id || row.employeeId,
      fromLocation: row.from_location || row.fromLocation,
      toLocation: row.to_location || row.toLocation,
      purpose: row.purpose,
      startDate: row.start_date || row.startDate,
      endDate: row.end_date || row.endDate,
      estimatedBudget: row.estimated_budget ?? row.estimatedBudget,
      firstName: row.first_name || row.firstName || row.submitter_first_name || row.submitterFirstName,
      lastName: row.last_name || row.lastName || row.submitter_last_name || row.submitterLastName,
      employeeCode: row.employee_code || row.employeeCode,
      departmentName: row.department_name || row.departmentName,
      submittedByRole: row.submitted_by_role || row.submittedByRole || 'employee',
      currentLevel: row.current_level || row.currentLevel || 1,
      currentApproverRole: row.current_approver_role || row.currentApproverRole,
      workflowId: row.workflow_id || row.workflowId,
      rejectionReason: row.rejection_reason || row.rejectionReason,
      approverNotes: row.approver_notes || row.approverNotes,
      createdAt: row.created_at || row.createdAt
    };
  }

  private mapTravelAdvance(row: any) {
    if (!row) return row;
    return {
      ...row,
      advanceNumber: row.advance_number || row.advanceNumber,
      employeeId: row.employee_id || row.employeeId,
      travelRequestId: row.travel_request_id || row.travelRequestId,
      advanceAmount: row.advance_amount ?? row.advanceAmount,
      approvedAmount: row.approved_amount ?? row.approvedAmount,
      settledAmount: row.settled_amount ?? row.settledAmount,
      balanceAmount: row.balance_amount ?? row.balanceAmount,
      purpose: row.purpose,
      status: row.status,
      submittedByRole: row.submitted_by_role || row.submittedByRole || 'employee',
      currentLevel: row.current_level || row.currentLevel || 1,
      currentApproverRole: row.current_approver_role || row.currentApproverRole,
      workflowId: row.workflow_id || row.workflowId,
      firstName: row.first_name || row.firstName || row.submitter_first_name || row.submitterFirstName,
      lastName: row.last_name || row.lastName || row.submitter_last_name || row.submitterLastName,
      employeeCode: row.employee_code || row.employeeCode,
      departmentName: row.department_name || row.departmentName,
      requestNumber: row.request_number || row.requestNumber,
      travelPurpose: row.travel_purpose || row.travelPurpose,
      financeNotes: row.finance_notes || row.financeNotes,
      rejectionReason: row.rejection_reason || row.rejectionReason,
      financeApprovedAt: row.finance_approved_at || row.financeApprovedAt,
      disbursedAt: row.disbursed_at || row.disbursedAt,
      createdAt: row.created_at || row.createdAt
    };
  }

  private mapMileageClaim(row: any) {
    if (!row) return row;
    return {
      ...row,
      employeeId: row.employee_id || row.employeeId,
      tripDate: row.trip_date || row.tripDate,
      fromLocation: row.from_location || row.fromLocation,
      toLocation: row.to_location || row.toLocation,
      vehicleType: row.vehicle_type || row.vehicleType,
      distanceKm: row.distance_km ?? row.distanceKm,
      ratePerKm: row.rate_per_km ?? row.ratePerKm,
      calculatedAmount: row.calculated_amount ?? row.calculatedAmount,
      purpose: row.purpose,
      status: row.status,
      firstName: row.first_name || row.firstName || row.submitter_first_name || row.submitterFirstName,
      lastName: row.last_name || row.lastName || row.submitter_last_name || row.submitterLastName,
      employeeCode: row.employee_code || row.employeeCode,
      createdAt: row.created_at || row.createdAt
    };
  }

  async getTravelRequests(ctx: TenantContext, employeeId?: number, filters?: { status?: string; departmentId?: number; search?: string }) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    let query = db('travel_requests as tr')
      .leftJoin('employees as e', 'tr.employee_id', 'e.id')
      .leftJoin('users as u', 'tr.submitted_by_user_id', 'u.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('tr.organization_id', ctx.organizationId)
      .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name', 'u.first_name as submitter_first_name', 'u.last_name as submitter_last_name')
      .orderBy('tr.created_at', 'desc');

    const vis = await this.getPeopleVisibility(ctx, 'tr.employee_id', employeeId);
    query = this.applyVisibilityToQuery(query, vis);

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'pending_approvals' || filters.status === 'pending_manager') {
        const allUserRoles = Array.from(
          new Set(
            [ctx.role, ...(ctx.roles || [])]
              .filter(Boolean)
              .map((r: any) => String(r).toLowerCase().trim())
          )
        );
        const isHrOrAdmin = allUserRoles.some((c) =>
          ['hr_admin', 'hr_manager', 'hr', 'organization_admin', 'super_admin', 'admin', 'ceo'].includes(c)
        );
        const isManagerOnly = allUserRoles.some((c) => ['manager', 'department_head'].includes(c)) && !isHrOrAdmin;
        const isTeamLeadOnly = allUserRoles.some((c) => c === 'team_lead') && !isHrOrAdmin && !isManagerOnly;

        query = query.where(function (this: any) {
          if (isHrOrAdmin) {
            this.where('tr.status', 'pending_level_3');
          } else if (isManagerOnly) {
            this.whereIn('tr.status', ['pending_level_2', 'pending_manager']);
          } else if (isTeamLeadOnly) {
            this.whereIn('tr.status', ['pending', 'submitted', 'pending_level_1']);
          } else {
            this.whereIn('tr.status', ['pending', 'submitted', 'pending_manager', 'pending_level_1']).orWhere('tr.status', 'like', 'pending_level_%');
          }
        });
      } else if (filters.status === 'pending' || filters.status === 'pending_level_1') {
        // Exact Level 1 only (Team Lead queue)
        query = query.where(function (this: any) {
          this.whereIn('tr.status', ['pending', 'submitted', 'pending_level_1']);
        });
      } else if (filters.status === 'pending_level_2') {
        // Exact Level 2 only (Manager queue)
        query = query.where('tr.status', 'pending_level_2');
      } else if (filters.status === 'pending_level_3') {
        // Exact Level 3 only (HR queue)
        query = query.where('tr.status', 'pending_level_3');
      } else if (filters.status === 'pending_finance') {
        query = query.where('tr.status', 'pending_finance');
      } else if (filters.status === 'approved') {
        query = query.where('tr.status', 'approved');
      } else if (filters.status === 'rejected') {
        query = query.where('tr.status', 'rejected');
      } else {
        query = query.where('tr.status', filters.status);
      }
    }

    if (filters?.departmentId) {
      query = query.where('e.current_department_id', filters.departmentId);
    }

    if (filters?.search) {
      const s = `%${filters.search.toLowerCase()}%`;
      query = query.where(function (this: any) {
        this.whereRaw('LOWER(tr.purpose) LIKE ?', [s])
          .orWhereRaw('LOWER(tr.from_location) LIKE ?', [s])
          .orWhereRaw('LOWER(tr.to_location) LIKE ?', [s])
          .orWhereRaw('LOWER(tr.request_number) LIKE ?', [s])
          .orWhereRaw('LOWER(e.first_name) LIKE ?', [s])
          .orWhereRaw('LOWER(e.last_name) LIKE ?', [s])
          .orWhereRaw('LOWER(e.employee_code) LIKE ?', [s]);
      });
    }

    const rows = await query;
    return (rows || []).map((r: any) => this.mapTravelRequest(r));
  }

  async createTravelRequest(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const config = await this.getConfig(ctx);
    const reqNum = await ExpenseConfigService.nextNumber(ctx.organizationId, 'travel_request', config.travelRequestNumberPrefix, config.numberSequenceDigits);

    const submittedByRole = await this.getSubmitterRole(ctx, db);

    // Resolve initial workflow status (same as expense claims)
    const estimatedBudget = Number(data.estimatedBudget || 0);

    // Validate against Travel category & expense policies
    const travelCat = await db('expense_categories')
      .where('organization_id', ctx.organizationId)
      .where(function() {
        this.whereRaw('LOWER(name) LIKE ?', ['%travel%']).orWhereRaw('LOWER(code) = ?', ['travel']);
      })
      .first();

    const catId = travelCat ? Number(travelCat.id) : 1;
    const validation = await this.validatePolicyForClaim(ctx, catId, estimatedBudget, false);
    if (!validation.isValid && validation.violations && validation.violations.length > 0) {
      const limitViolation = validation.violations.find((v: string) => v.toLowerCase().includes('limit') || v.toLowerCase().includes('exceeds'));
      if (limitViolation) {
        throw new Error(`Policy limit exceeded: ${limitViolation}`);
      }
    }

    const { workflow, levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, estimatedBudget, emp?.current_department_id);
    const settings = await this.getSettings(ctx);
    const resolved = this.resolveInitialWorkflowStatus(submittedByRole, levels, settings);
    let initialStatus = resolved.status;
    let currentLevel = resolved.currentLevel;
    let currentApproverRole = resolved.currentApproverRole;
    let workflowId: number | null = workflow ? Number(workflow.id) : resolved.workflowId;

    const [id] = await db('travel_requests').insert({
      uuid: uuidv4(),
      request_number: reqNum,
      organization_id: ctx.organizationId,
      employee_id: emp?.id ?? null,
      submitted_by_user_id: ctx.userId || null,
      submitted_by_role: submittedByRole,
      from_location: data.fromLocation,
      to_location: data.toLocation,
      purpose: data.purpose,
      start_date: data.startDate,
      end_date: data.endDate,
      estimated_budget: estimatedBudget,
      status: initialStatus,
      current_level: currentLevel,
      current_approver_role: currentApproverRole,
      workflow_id: workflowId,
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('travel_requests as tr')
      .leftJoin('employees as e', 'tr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('tr.id', id)
      .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
      .first();
    return this.mapTravelRequest(row);
  }

  async updateTravelRequest(
    ctx: TenantContext,
    id: number,
    data: { fromLocation?: string; toLocation?: string; purpose?: string; startDate?: string; endDate?: string; estimatedBudget?: number }
  ) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const existing = await db('travel_requests').where('id', id).where('organization_id', ctx.organizationId).first();
    if (!existing) throw new Error('Travel request not found');

    const estimatedBudget = data.estimatedBudget !== undefined ? Number(data.estimatedBudget) : Number(existing.estimated_budget || 0);
    const submittedByRole = String(existing.submitted_by_role || 'employee');
    let trDeptId: number | null = null;
    if (existing.employee_id) {
      const trEmp = await db('employees').where('id', existing.employee_id).first('current_department_id').catch(() => null);
      trDeptId = trEmp?.current_department_id ? Number(trEmp.current_department_id) : null;
    }
    const { workflow, levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, estimatedBudget, trDeptId);
    const settings = await this.getSettings(ctx);

    const resolved = this.resolveInitialWorkflowStatus(submittedByRole, levels, settings);

    await db('travel_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({
        from_location: data.fromLocation || existing.from_location,
        to_location: data.toLocation || existing.to_location,
        purpose: data.purpose || existing.purpose,
        start_date: data.startDate || existing.start_date,
        end_date: data.endDate || existing.end_date,
        estimated_budget: estimatedBudget,
        status: resolved.status,
        current_level: resolved.currentLevel,
        current_approver_role: resolved.currentApproverRole,
        workflow_id: workflow ? Number(workflow.id) : resolved.workflowId,
        rejection_reason: null,
        updated_at: new Date()
      });

    const row = await db('travel_requests as tr')
      .leftJoin('employees as e', 'tr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('tr.id', id)
      .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
      .first();

    return this.mapTravelRequest(row);
  }

  async updateTravelRequestStatus(
    ctx: TenantContext,
    id: number,
    status: string,
    notes?: string,
    options?: { isAbsenteeOverride?: boolean; delegatedForId?: number }
  ) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    const travelReq = await db('travel_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!travelReq) {
      throw new Error('Travel request not found');
    }

    const emp = await this.getEmployeeForCtx(ctx);
    if (emp && travelReq.employee_id && Number(travelReq.employee_id) === Number(emp.id)) {
      throw new Error('Employees cannot approve or reject their own travel requests.');
    }

    await this.assertCanManageEmployeeClaim(ctx, travelReq, 'manager');

    // Handle rejection or return directly
    if (status === 'rejected' || status === 'returned') {
      const isReturned = status === 'returned';
      await db('travel_requests').where('id', id).where('organization_id', ctx.organizationId).update({
        status: isReturned ? 'returned' : 'rejected',
        rejection_reason: isReturned ? null : (notes || 'Rejected'),
        approver_id: ctx.userId || null,
        approver_notes: notes || null,
        updated_at: new Date()
      });
      const row = await db('travel_requests as tr')
        .leftJoin('employees as e', 'tr.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('tr.id', id)
        .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
        .first();
      return this.mapTravelRequest(row);
    }

    // Advance through workflow levels (same pattern as expense claims)
    const currentStatus = String(travelReq.status || 'pending');
    const currentLevelNum = this.getCurrentLevelNum(travelReq.status, travelReq.current_level);
    const estimatedBudget = Number(travelReq.estimated_budget || 0);
    let reqDeptId: number | null = null;
    if (travelReq.employee_id) {
      const reqEmp = await db('employees').where('id', travelReq.employee_id).first('current_department_id').catch(() => null);
      reqDeptId = reqEmp?.current_department_id ? Number(reqEmp.current_department_id) : null;
    }
    const { workflow, levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, estimatedBudget, reqDeptId);

    // Validate that current user's role matches the required approver for this level
    const isCurrentlyAtLevel = currentStatus.startsWith('pending_level_') || currentStatus === 'pending' || currentStatus === 'pending_manager';
    if (isCurrentlyAtLevel && levels && levels.length > 0) {
      await this.assertApproverMatchesWorkflowLevel(ctx, travelReq, levels);
    }

    const approverRole = await this.getSubmitterRole(ctx, db);
    const approverRank = this.getRoleRank(approverRole);

    let nextStatus = 'pending_finance';
    let nextLevel = currentLevelNum + 1;
    let nextRoleName = 'Finance Verification';

    if (currentStatus === 'pending_finance') {
      // Finance is approving
      nextStatus = 'approved';
      nextRoleName = 'Approved';
    } else if (isCurrentlyAtLevel) {
      if (levels && levels.length > 0) {
        const nextLvlIndex = levels.findIndex((l: any) => Number(l.levelOrder ?? l.level_order) > currentLevelNum);
        if (nextLvlIndex >= 0) {
          const nextLvl = levels[nextLvlIndex];
          nextLevel = Number(nextLvl.levelOrder ?? nextLvl.level_order ?? (currentLevelNum + 1));
          const lvlType = String(nextLvl.approverType || nextLvl.approver_type || nextLvl.approverRole || nextLvl.approver_role || '').toLowerCase();
          if (lvlType === 'finance' || lvlType.includes('finance')) {
            nextStatus = 'pending_finance';
            nextRoleName = 'Finance Verification';
          } else if (lvlType === 'team_lead' || lvlType.includes('team_lead')) {
            nextStatus = 'pending_level_1';
            nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Team Lead Review');
          } else if (['department_head', 'reporting_manager', 'manager', 'reporting_officer', 'dept_head'].some(x => lvlType.includes(x))) {
            nextStatus = 'pending_level_2';
            nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'Manager Approval');
          } else if (['hr', 'hr_admin', 'hr_manager', 'admin'].some(x => lvlType.includes(x))) {
            nextStatus = 'pending_level_3';
            nextRoleName = String(nextLvl.stepName || nextLvl.step_name || 'HR Approval');
          } else {
            nextStatus = `pending_level_${nextLevel}`;
            nextRoleName = String(nextLvl.stepName || nextLvl.step_name || nextLvl.approverRole || nextLvl.approver_role || `Level ${nextLevel} Approver`).trim();
          }
        } else {
          const settings = await this.getSettings(ctx);
          if (settings.requireFinanceApproval) {
            nextStatus = 'pending_finance';
            nextRoleName = 'Finance Verification';
          } else {
            nextStatus = 'approved';
            nextRoleName = 'Approved';
          }
        }
      } else {
        const settings = await this.getSettings(ctx);
        if (settings.requireFinanceApproval) {
          nextStatus = 'pending_finance';
          nextRoleName = 'Finance Verification';
        } else {
          nextStatus = 'approved';
          nextRoleName = 'Approved';
        }
      }
    } else {
      // Override / direct status set (admin)
      nextStatus = status === 'pending_manager' ? 'pending_level_1' : status;
      nextRoleName = nextStatus;
    }

    await db('travel_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({
        status: nextStatus,
        current_level: nextLevel,
        current_approver_role: nextRoleName,
        workflow_id: workflow ? Number(workflow.id) : (travelReq.workflow_id || null),
        approver_id: ctx.userId || null,
        approver_notes: notes || null,
        updated_at: new Date()
      });
    const row = await db('travel_requests as tr')
      .leftJoin('employees as e', 'tr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('tr.id', id)
      .select('tr.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name')
      .first();

    const mapped = this.mapTravelRequest(row);
    const isFinal = nextStatus === 'approved' || nextStatus === 'pending_finance';
    return {
      ...mapped,
      id: `tr_${row.id}`,
      claimNumber: row.request_number || `TRV-${row.id}`,
      nextStepName: nextRoleName,
      isFinalStep: isFinal,
      currentApproverRole: nextRoleName,
      status: nextStatus,
      message: nextStatus === 'approved'
        ? 'Travel request fully approved'
        : (nextStatus === 'pending_finance'
          ? 'Travel request approved and forwarded to Finance Verification'
          : `Travel request approved and forwarded to next approver: ${nextRoleName}`)
    };
  }

  async getTravelAdvances(ctx: TenantContext, employeeId?: number, filters?: { status?: string; departmentId?: number; search?: string }) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    let query = db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.organization_id', ctx.organizationId)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name', 'tr.request_number', 'tr.purpose as travel_purpose')
      .orderBy('ta.created_at', 'desc');

    const vis = await this.getPeopleVisibility(ctx, 'ta.employee_id', employeeId);
    query = this.applyVisibilityToQuery(query, vis);

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'pending_finance' || filters.status === 'pending') {
        query = query.whereIn('ta.status', ['pending_finance', 'pending', 'requested']);
      } else if (filters.status === 'approved') {
        query = query.whereIn('ta.status', ['approved', 'disbursed']);
      } else if (filters.status === 'rejected') {
        query = query.where('ta.status', 'rejected');
      } else {
        query = query.where('ta.status', filters.status);
      }
    }

    if (filters?.departmentId) {
      query = query.where('e.current_department_id', filters.departmentId);
    }

    if (filters?.search) {
      const s = `%${filters.search.toLowerCase()}%`;
      query = query.where(function (this: any) {
        this.whereRaw('LOWER(ta.purpose) LIKE ?', [s])
          .orWhereRaw('LOWER(ta.advance_number) LIKE ?', [s])
          .orWhereRaw('LOWER(e.first_name) LIKE ?', [s])
          .orWhereRaw('LOWER(e.last_name) LIKE ?', [s])
          .orWhereRaw('LOWER(e.employee_code) LIKE ?', [s]);
      });
    }

    const rows = await query;
    return (rows || []).map((r: any) => this.mapTravelAdvance(r));
  }

  async createTravelAdvance(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const config = await this.getConfig(ctx);
    const advNum = await ExpenseConfigService.nextNumber(ctx.organizationId, 'travel_advance', config.travelAdvanceNumberPrefix, config.numberSequenceDigits);
    const amt = Number(data.advanceAmount || 0);

    if (data.travelRequestId) {
      const tr = await db('travel_requests').where('id', data.travelRequestId).where('organization_id', ctx.organizationId).first();
      if (!tr) throw new Error('Selected travel request does not exist');
      if (String(tr.status || '').toLowerCase() === 'rejected') {
        throw new Error('Rejected travel requests cannot be linked to an advance request');
      }
    }

    const submittedByRole = await this.getSubmitterRole(ctx, db);
    const { workflow, levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, amt, emp?.current_department_id);

    let initialStatus = config.defaultAdvanceStatus || 'pending_finance';
    let initialLevel = 1;
    let initialRole = 'Finance Verification';
    let workflowId: number | null = null;

    if (levels && levels.length > 0) {
      const resolvedWF = this.resolveInitialWorkflowStatus(submittedByRole, levels, {
        requireManagerApproval: true,
        requireFinanceApproval: true
      });
      initialStatus = resolvedWF.status;
      initialLevel = resolvedWF.currentLevel;
      initialRole = resolvedWF.currentApproverRole;
      workflowId = workflow ? Number(workflow.id) : resolvedWF.workflowId;
    }

    const [id] = await db('travel_advances').insert({
      uuid: uuidv4(),
      advance_number: advNum,
      organization_id: ctx.organizationId,
      employee_id: emp?.id ?? null,
      submitted_by_user_id: ctx.userId || null,
      submitted_by_role: submittedByRole,
      travel_request_id: data.travelRequestId || null,
      advance_amount: amt,
      approved_amount: 0,
      settled_amount: 0,
      balance_amount: 0,
      purpose: data.purpose || 'Travel Advance Request',
      status: initialStatus,
      current_level: initialLevel,
      current_approver_role: initialRole,
      workflow_id: workflowId,
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.id', id)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name', 'tr.request_number', 'tr.purpose as travel_purpose')
      .first();
    return this.mapTravelAdvance(row);
  }

  async approveTravelAdvance(ctx: TenantContext, id: number, data: { comments?: string; approvedAmount?: number }) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const config = await this.getConfig(ctx);
    const advance = await db('travel_advances').where('id', id).where('organization_id', ctx.organizationId).first();
    if (!advance) throw new Error('Travel advance not found');

    const currentStatus = String(advance.status || '').toLowerCase();
    if (['approved', 'disbursed', 'rejected'].includes(currentStatus)) {
      throw new Error('This advance is already processed and cannot be modified');
    }

    const requestedAmt = Number(advance.advance_amount ?? advance.advanceAmount ?? 0);
    let approvedAmt = (data.approvedAmount !== undefined && data.approvedAmount !== null && Number(data.approvedAmount) >= 0)
      ? Number(data.approvedAmount)
      : requestedAmt;

    if (requestedAmt > 0 && approvedAmt > requestedAmt) {
      approvedAmt = requestedAmt;
    }
    if (approvedAmt < 0) {
      approvedAmt = 0;
    }

    const approverEmp = await this.getEmployeeForCtx(ctx);
    const approverName = approverEmp
      ? `${approverEmp.first_name || ''} ${approverEmp.last_name || ''}`.trim()
      : 'Finance Team';

    const emp = advance.employee_id ? await db('employees').where('id', advance.employee_id).first().catch(() => null) : null;
    const { levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, requestedAmt, emp?.current_department_id);
    const currentLevelNum = this.getCurrentLevelNum(advance.status, advance.current_level);

    let nextStatus = 'approved';
    let nextLevelNum = currentLevelNum;
    let nextRoleName = 'Finance Verification';

    if (levels && levels.length > 0) {
      const nextLevel = levels.find((l: any) => Number(l.level_order || 0) > currentLevelNum);
      if (nextLevel) {
        const lvlOrder = Number(nextLevel.level_order || 1);
        nextStatus = `pending_level_${lvlOrder}`;
        nextLevelNum = lvlOrder;
        nextRoleName = String(nextLevel.step_name || nextLevel.approver_role || `Level ${lvlOrder} Approver`).trim();
      } else {
        nextStatus = 'approved';
      }
    }

    if (nextStatus === 'approved') {
      await db('travel_advances').where('id', id).where('organization_id', ctx.organizationId).update({
        status: 'approved',
        approved_amount: approvedAmt,
        balance_amount: approvedAmt,
        current_level: nextLevelNum,
        current_approver_role: 'Approved',
        finance_approver_id: ctx.userId || null,
        finance_notes: data.comments || null,
        finance_approved_at: new Date(),
        disbursed_at: new Date(),
        updated_at: new Date()
      });
    } else {
      await db('travel_advances').where('id', id).where('organization_id', ctx.organizationId).update({
        status: nextStatus,
        current_level: nextLevelNum,
        current_approver_role: nextRoleName,
        finance_notes: data.comments || null,
        updated_at: new Date()
      });
    }

    const row = await db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.id', id)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name', 'tr.request_number', 'tr.purpose as travel_purpose')
      .first();

    const msg = nextStatus === 'approved'
      ? `Travel advance approved by ${approverName}. Amount disbursed: ${ExpenseConfigService.formatAmount(approvedAmt, config)}`
      : `Travel advance approved by ${approverName} and forwarded to next approver: ${nextRoleName}`;

    return { ...this.mapTravelAdvance(row), message: msg };
  }

  async rejectTravelAdvance(ctx: TenantContext, id: number, reason: string) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const advance = await db('travel_advances').where('id', id).where('organization_id', ctx.organizationId).first();
    if (!advance) throw new Error('Travel advance not found');
    const currentStatus = String(advance.status || '').toLowerCase();
    if (['approved', 'disbursed', 'rejected'].includes(currentStatus)) throw new Error('This advance is already processed');

    await db('travel_advances').where('id', id).where('organization_id', ctx.organizationId).update({
      status: 'rejected',
      rejection_reason: reason || 'Rejected by approver',
      finance_approver_id: ctx.userId || null,
      finance_approved_at: new Date(),
      updated_at: new Date()
    });

    const row = await db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.id', id)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'd.name as department_name', 'tr.request_number', 'tr.purpose as travel_purpose')
      .first();
    return { ...this.mapTravelAdvance(row), message: 'Travel advance rejected' };
  }

  // --- MILEAGE CLAIMS ---
  async getMileageClaims(ctx: TenantContext, employeeId?: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    let query = db('mileage_claims as mc')
      .leftJoin('employees as e', 'mc.employee_id', 'e.id')
      .where('mc.organization_id', ctx.organizationId)
      .select('mc.*', 'e.first_name', 'e.last_name', 'e.employee_code')
      .orderBy('mc.created_at', 'desc');

    const vis = await this.getPeopleVisibility(ctx, 'mc.employee_id', employeeId);
    query = this.applyVisibilityToQuery(query, vis);
    const rows = await query;
    return (rows || []).map((r: any) => this.mapMileageClaim(r));
  }

  private numOr(v: any, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private async listMileageRatesByDesignation(db: any, organizationId: number, fallbackCar: number, fallbackBike: number) {
    const rows = await db('designations as d')
      .leftJoin('expense_mileage_designation_rates as emdr', function (this: any) {
        this.on('emdr.designation_id', '=', 'd.id').andOn('emdr.organization_id', '=', db.raw('?', [organizationId]));
      })
      .where('d.organization_id', organizationId)
      .select(
        'd.id as designationId',
        'd.name as designationName',
        'emdr.rate_car as rateCar',
        'emdr.rate_bike as rateBike'
      )
      .orderBy('d.name', 'asc');

    return (rows || []).map((r: any) => ({
      designationId: Number(r.designationId),
      designationName: r.designationName,
      rateCar: this.numOr(r.rateCar, fallbackCar),
      rateBike: this.numOr(r.rateBike, fallbackBike)
    }));
  }

  private async resolveEmployeeMileageRates(
    ctx: TenantContext,
    db: any,
    fallbackCar: number,
    fallbackBike: number
  ): Promise<{ rateCar: number; rateBike: number; designationId: number | null; designationName: string | null }> {
    try {
      let emp: any = null;
      if (ctx.userId) {
        const user = await db('users').where('id', ctx.userId).first();
        emp = await db('employees')
          .where('organization_id', ctx.organizationId)
          .where(function (this: any) {
            if (user?.email) this.where('email', user.email);
            this.orWhere('id', ctx.userId);
          })
          .first();
      }

      if (!emp || !emp.current_designation_id) {
        return { rateCar: fallbackCar, rateBike: fallbackBike, designationId: null, designationName: null };
      }

      const desig = await db('designations')
        .where('id', emp.current_designation_id)
        .where('organization_id', ctx.organizationId)
        .first();

      const desigRate = await db('expense_mileage_designation_rates')
        .where('designation_id', emp.current_designation_id)
        .where('organization_id', ctx.organizationId)
        .first();

      return {
        rateCar: desigRate?.rate_car != null ? this.numOr(desigRate.rate_car, fallbackCar) : fallbackCar,
        rateBike: desigRate?.rate_bike != null ? this.numOr(desigRate.rate_bike, fallbackBike) : fallbackBike,
        designationId: emp.current_designation_id ? Number(emp.current_designation_id) : null,
        designationName: desig?.name || null,
      };
    } catch {
      return { rateCar: fallbackCar, rateBike: fallbackBike, designationId: null, designationName: null };
    }
  }

  async getMileageRates(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const config = await this.getConfig(ctx);
    const defaultCar = config.mileageRateCar;
    const defaultBike = config.mileageRateBike;

    const designations = await this.listMileageRatesByDesignation(db, ctx.organizationId, defaultCar, defaultBike);

    return {
      defaultCar,
      defaultBike,
      designations
    };
  }

  async updateMileageRates(ctx: TenantContext, payload: {
    defaultCar?: number;
    defaultBike?: number;
    designationRates?: Array<{ designationId: number; rateCar: number; rateBike: number }>;
  }) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const config = await this.getConfig(ctx);

    const nextCar = payload.defaultCar !== undefined ? Number(payload.defaultCar) : config.mileageRateCar;
    const nextBike = payload.defaultBike !== undefined ? Number(payload.defaultBike) : config.mileageRateBike;

    await this.updateSettings(ctx, {
      mileageRateCar: nextCar,
      mileageRateBike: nextBike
    });

    if (Array.isArray(payload.designationRates)) {
      for (const row of payload.designationRates) {
        const dId = Number(row.designationId);
        if (!dId) continue;
        const car = Number(row.rateCar);
        const bike = Number(row.rateBike);
        if (Number.isNaN(car) || Number.isNaN(bike)) continue;

        const existing = await db('expense_mileage_designation_rates')
          .where('organization_id', ctx.organizationId)
          .where('designation_id', dId)
          .first();

        if (existing) {
          await db('expense_mileage_designation_rates')
            .where('id', existing.id)
            .update({
              rate_car: car,
              rate_bike: bike,
              updated_at: new Date()
            });
        } else {
          await db('expense_mileage_designation_rates').insert({
            organization_id: ctx.organizationId,
            designation_id: dId,
            rate_car: car,
            rate_bike: bike,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    }

    return this.getMileageRates(ctx);
  }

  async createMileageClaim(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const config = await this.getConfig(ctx);

    let rate = data.vehicleType === 'bike' ? config.mileageRateBike : config.mileageRateCar;
    const desId = emp?.current_designation_id || emp?.currentDesignationId;
    if (desId) {
      const customRate = await db('expense_mileage_designation_rates')
        .where('organization_id', ctx.organizationId)
        .where('designation_id', Number(desId))
        .first()
        .catch(() => null);
      if (customRate) {
        if (data.vehicleType === 'bike' && customRate.rate_bike !== null && customRate.rate_bike !== undefined) {
          rate = Number(customRate.rate_bike);
        } else if (data.vehicleType !== 'bike' && customRate.rate_car !== null && customRate.rate_car !== undefined) {
          rate = Number(customRate.rate_car);
        }
      }
    }

    const dist = Number(data.distanceKm || 0);
    const calculatedAmount = Number((dist * rate).toFixed(2));

    // Validate against Mileage category & Expense Policies
    const mileageCat = await db('expense_categories')
      .where('organization_id', ctx.organizationId)
      .where(function() {
        this.whereRaw('LOWER(name) LIKE ?', ['%mileage%']).orWhereRaw('LOWER(code) = ?', ['mileage']);
      })
      .first();
    const mileageCatId = mileageCat ? Number(mileageCat.id) : 0;
    const validation = await this.validatePolicyForClaim(ctx, mileageCatId, calculatedAmount, false);
    if (!validation.isValid && validation.violations && validation.violations.length > 0) {
      const limitViolation = validation.violations.find((v: string) => v.toLowerCase().includes('limit') || v.toLowerCase().includes('exceeds'));
      if (limitViolation) {
        throw new Error(`Policy limit exceeded: ${limitViolation}`);
      }
    }

    // Detect submitter role (same as expense claims) for proper workflow routing
    const mileageSubmittedByRole = await this.getSubmitterRole(ctx, db);

    // Resolve initial workflow status (same engine as expense claims)
    const mileageWfItems = [{ categoryId: null, claimedAmount: calculatedAmount, policyValidated: true }];
    const mileageWf = await this.resolveSubmitStatus(ctx, mileageWfItems, false, mileageSubmittedByRole, emp?.current_department_id);

    let empId = emp?.id ?? null;
    if (!empId) {
      try {
        const firstEmp = await db('employees')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .first('id')
          .catch(() => null);
        if (firstEmp?.id) empId = Number(firstEmp.id);
      } catch { /* ignore fallback */ }
    }

    if (!data.fromLocation || !data.toLocation || Number(data.distanceKm || 0) <= 0) {
      throw new Error('Please enter valid trip location details and distance.');
    }

    const insertRes = await db('mileage_claims').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: empId,
      submitted_by_user_id: ctx.userId || null,
      submitted_by_role: mileageSubmittedByRole,
      trip_date: data.tripDate || new Date().toISOString().slice(0, 10),
      from_location: data.fromLocation,
      to_location: data.toLocation,
      vehicle_type: data.vehicleType || 'car',
      distance_km: dist,
      rate_per_km: rate,
      calculated_amount: calculatedAmount,
      purpose: data.purpose || null,
      status: mileageWf.status,
      current_level: mileageWf.currentLevel,
      current_approver_role: mileageWf.currentRole,
      workflow_id: mileageWf.workflowId,
      created_at: new Date(),
      updated_at: new Date()
    });
    const id = Number(Array.isArray(insertRes) ? insertRes[0] : insertRes);
    const row = await db('mileage_claims as mc')
      .leftJoin('employees as e', 'mc.employee_id', 'e.id')
      .where('mc.id', id)
      .select('mc.*', 'e.first_name', 'e.last_name', 'e.employee_code')
      .first();
    return this.mapMileageClaim(row);
  }

  async approveMileageClaim(ctx: TenantContext, id: number, comments?: string) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const claim = await db('mileage_claims').where('id', id).where('organization_id', ctx.organizationId).first();
    if (!claim) throw new Error('Mileage claim not found');

    // Prevent submitter from approving their own claim
    const emp = await this.getEmployeeForCtx(ctx);
    if (emp && claim.employee_id && Number(claim.employee_id) === Number(emp.id)) {
      throw new Error('You cannot approve your own mileage claim.');
    }

    const calculatedAmt = Number(claim.calculated_amount || 0);
    const { levels } = await this.getWorkflowLevelsForClaim(db, ctx.organizationId, calculatedAmt);
    await this.assertApproverMatchesWorkflowLevel(ctx, claim, levels);

    const approverRole = await this.getSubmitterRole(ctx, db);
    const approverRank = this.getRoleRank(approverRole);

    const currentLevelNum = this.getCurrentLevelNum(claim.status, claim.current_level);
    let nextStatus = 'pending_finance';
    let nextLevel = currentLevelNum + 1;
    let nextRole = 'Finance Verification';
    let isFinalStep = true;

    let foundNext = false;
    if (levels && levels.length > 0) {
      for (let i = currentLevelNum; i < levels.length; i++) {
        const lvl = levels[i];
        const lvlType = String(lvl.approverType || lvl.approver_type || lvl.approverRole || lvl.approver_role || '').toLowerCase();
        const lvlStep = String(lvl.stepName || lvl.step_name || '').toLowerCase();
        let lvlRank = 0;
        if (lvlType === 'reporting_manager') {
          if (lvlStep.includes('team') || lvlStep.includes('lead')) lvlRank = 1;
          else if (i === 0 && levels.length > 1) lvlRank = 1;
          else lvlRank = 2;
        } else {
          lvlRank = this.getRoleRank(lvlType);
        }

        if (lvlType === 'finance' || lvlType.includes('finance')) {
          nextStatus = 'pending_finance';
          nextRole = 'Finance Verification';
          nextLevel = Number(lvl.levelOrder ?? lvl.level_order ?? (i + 1));
          foundNext = true;
          isFinalStep = true;
          break;
        }

        if (lvlRank > approverRank) {
          nextLevel = Number(lvl.levelOrder ?? lvl.level_order ?? (i + 1));
          nextStatus = `pending_level_${nextLevel}`;
          nextRole = String(lvl.stepName || lvl.step_name || lvl.approverRole || lvl.approver_role || `Level ${nextLevel} Approver`).trim();
          foundNext = true;
          isFinalStep = false;
          break;
        }
      }
    }

    if (!foundNext) {
      const settings = await this.getSettings(ctx);
      if (currentLevelNum === 1) {
        nextStatus = 'pending_level_2';
        nextLevel = 2;
        nextRole = 'Manager Approval';
        isFinalStep = false;
      } else if (settings.requireFinanceApproval) {
        nextStatus = 'pending_finance';
        nextLevel = Math.max(currentLevelNum, 2);
        nextRole = 'Finance Verification';
        isFinalStep = true;
      } else {
        nextStatus = 'approved';
        nextLevel = Math.max(currentLevelNum, 2);
        nextRole = 'Approved';
        isFinalStep = true;
      }
    }

    await db('mileage_claims').where('id', id).update({
      status: nextStatus,
      current_level: isFinalStep ? currentLevelNum : nextLevel,
      current_approver_role: nextRole,
      approver_id: ctx.userId || null,
      approver_notes: comments || null,
      updated_at: new Date()
    });

    const row = await db('mileage_claims as mc')
      .leftJoin('employees as e', 'mc.employee_id', 'e.id')
      .where('mc.id', id)
      .select('mc.*', 'e.first_name', 'e.last_name', 'e.employee_code')
      .first();
    return {
      ...this.mapMileageClaim(row),
      isFinalStep,
      message: isFinalStep
        ? (nextStatus === 'pending_finance' ? 'Mileage claim sent to Finance Verification' : 'Mileage claim approved')
        : `Mileage claim approved and forwarded to: ${nextRole}`
    };
  }

  async rejectMileageClaim(ctx: TenantContext, id: number, reason: string) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    if (!reason || !reason.trim()) throw new Error('Rejection reason is mandatory');
    const claim = await db('mileage_claims').where('id', id).where('organization_id', ctx.organizationId).first();
    if (!claim) throw new Error('Mileage claim not found');

    await db('mileage_claims').where('id', id).update({
      status: 'rejected',
      rejection_reason: reason,
      approver_id: ctx.userId || null,
      updated_at: new Date()
    });

    const row = await db('mileage_claims as mc')
      .leftJoin('employees as e', 'mc.employee_id', 'e.id')
      .where('mc.id', id)
      .select('mc.*', 'e.first_name', 'e.last_name', 'e.employee_code')
      .first();
    return { ...this.mapMileageClaim(row), message: 'Mileage claim rejected' };
  }

  // --- DASHBOARD ANALYTICS ---
  async getDashboardSummary(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    const statsRaw = await db('expense_claims')
      .where('organization_id', ctx.organizationId)
      .select('status')
      .count({ count: '*' })
      .sum({ totalClaimed: 'total_claimed_amount', totalApproved: 'total_approved_amount', totalPaid: 'paid_amount' })
      .groupBy('status');

    let totalExpenses = 0;
    let pendingApproval = 0;
    let approvedExpenses = 0;
    let approvedCount = 0;
    let rejectedExpenses = 0;
    let rejectedCount = 0;
    let paymentPending = 0;
    let totalReimbursedAmount = 0;

    for (const row of statsRaw) {
      const cnt = Number(row.count || 0);
      const claimed = Number(row.totalClaimed || 0);
      const approved = Number(row.totalApproved || 0);
      const paid = Number(row.totalPaid || 0);

      totalExpenses += claimed;

      if (['submitted', 'pending', 'pending_manager', 'pending_finance'].includes(row.status) || String(row.status || '').startsWith('pending_level_')) {
        pendingApproval += cnt;
      } else if (['approved', 'payment_pending'].includes(row.status)) {
        approvedExpenses += (approved || claimed);
        approvedCount += cnt;
        if (row.status === 'payment_pending') paymentPending += (approved || claimed);
      } else if (row.status === 'rejected') {
        rejectedExpenses += claimed;
        rejectedCount += cnt;
      } else if (row.status === 'paid' || row.status === 'reimbursed') {
        totalReimbursedAmount += (paid || approved || claimed);
      }
    }

    // Monthly trends (last 6 months)
    const monthlyTrends = await db('expense_claims')
      .where('organization_id', ctx.organizationId)
      .select(db.raw("DATE_FORMAT(claim_date, '%b %Y') as month"), db.raw("SUM(total_claimed_amount) as claimed"), db.raw("SUM(total_approved_amount) as approved"))
      .groupByRaw("DATE_FORMAT(claim_date, '%Y-%m'), DATE_FORMAT(claim_date, '%b %Y')")
      .orderByRaw("DATE_FORMAT(claim_date, '%Y-%m') DESC")
      .limit(6);

    // Category-wise expenses
    const categoryExpenses = await db('expense_claim_items as eci')
      .leftJoin('expense_claims as ec', 'eci.claim_id', 'ec.id')
      .leftJoin('expense_categories as cat', 'eci.category_id', 'cat.id')
      .where('ec.organization_id', ctx.organizationId)
      .select(db.raw("COALESCE(cat.name, 'Uncategorized') as categoryName"), db.raw("SUM(eci.claimed_amount) as totalAmount"))
      .groupBy('cat.name')
      .orderBy('totalAmount', 'desc');

    // Department-wise expenses
    const departmentExpenses: Array<{ departmentName: string; totalAmount: number }> = (await db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('ec.organization_id', ctx.organizationId)
      .select(db.raw("COALESCE(d.name, 'Unassigned') as departmentName"), db.raw("SUM(ec.total_claimed_amount) as totalAmount"))
      .groupBy('d.name')
      .orderBy('totalAmount', 'desc')) as any;

    // Also include all organization departments so real departments appear even if 0 expenses
    const orgDepartments = await db('departments').where('organization_id', ctx.organizationId).select('name');
    for (const d of orgDepartments) {
      if (!departmentExpenses.some((x) => (x.departmentName || '').toLowerCase() === (d.name || '').toLowerCase())) {
        departmentExpenses.push({
          departmentName: d.name,
          totalAmount: 0
        });
      }
    }

    // Policy violations count
    const violationsCount = await db('expense_claim_items as eci')
      .leftJoin('expense_claims as ec', 'eci.claim_id', 'ec.id')
      .where('ec.organization_id', ctx.organizationId)
      .where('eci.policy_validated', false)
      .count({ count: '*' })
      .first();

    return {
      kpis: {
        totalExpenses,
        pendingApproval,
        approvedExpenses,
        approvedCount,
        rejectedExpenses,
        rejectedCount,
        paymentPending,
        totalReimbursedAmount
      },
      charts: {
        monthlyTrends: monthlyTrends.reverse(),
        categoryExpenses,
        departmentExpenses,
        policyViolationsCount: Number(violationsCount?.count || 0)
      }
    };
  }

  // --- REPORTS ---
  async getReports(ctx: TenantContext, filters: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();

    const reportType = String(filters.reportType || 'employee');

    // Helper to apply common date / dept / category filters
    const applyCommonFilters = (q: any) => {
      if (filters.startDate) q = q.where('ec.claim_date', '>=', filters.startDate);
      if (filters.endDate) q = q.where('ec.claim_date', '<=', filters.endDate);
      if (filters.departmentId) q = q.where('e.current_department_id', filters.departmentId);
      if (filters.categoryId) q = q.where('ec.category_id', filters.categoryId);
      if (filters.status) q = q.where('ec.status', filters.status);
      return q;
    };

    // --- DEPARTMENT-WISE AGGREGATION ---
    if (reportType === 'department') {
      let q = db('expense_claims as ec')
        .leftJoin('employees as e', 'ec.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('ec.organization_id', ctx.organizationId);
      q = applyCommonFilters(q);
      const rows = await q
        .select(
          db.raw("COALESCE(d.name, 'Unassigned') as departmentName"),
          db.raw('COUNT(ec.id) as totalClaims'),
          db.raw('SUM(ec.total_claimed_amount) as totalClaimed'),
          db.raw('SUM(ec.total_approved_amount) as totalApproved'),
          db.raw('SUM(ec.paid_amount) as totalPaid'),
          db.raw("SUM(CASE WHEN ec.status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount"),
          db.raw("SUM(CASE WHEN ec.status = 'paid' THEN 1 ELSE 0 END) as paidCount")
        )
        .groupBy('d.name')
        .orderBy('totalClaimed', 'desc');
      return (rows || []).map((r: any) => ({
        departmentName: r.departmentName,
        totalClaims: Number(r.totalClaims || 0),
        totalClaimed: Number(r.totalClaimed || 0),
        totalApproved: Number(r.totalApproved || 0),
        totalPaid: Number(r.totalPaid || 0),
        rejectedCount: Number(r.rejectedCount || 0),
        paidCount: Number(r.paidCount || 0),
      }));
    }

    // --- CATEGORY-WISE AGGREGATION ---
    if (reportType === 'category') {
      let q = db('expense_claim_items as eci')
        .leftJoin('expense_claims as ec', 'eci.claim_id', 'ec.id')
        .leftJoin('expense_categories as cat', 'eci.category_id', 'cat.id')
        .where('ec.organization_id', ctx.organizationId);
      if (filters.startDate) q = q.where('ec.claim_date', '>=', filters.startDate);
      if (filters.endDate) q = q.where('ec.claim_date', '<=', filters.endDate);
      if (filters.departmentId) {
        q = q.leftJoin('employees as e2', 'ec.employee_id', 'e2.id')
          .where('e2.current_department_id', filters.departmentId);
      }
      const rows = await q
        .select(
          db.raw("COALESCE(cat.name, 'Uncategorized') as categoryName"),
          db.raw('COUNT(DISTINCT ec.id) as totalClaims'),
          db.raw('COUNT(eci.id) as totalItems'),
          db.raw('SUM(eci.claimed_amount) as totalClaimed'),
          db.raw('SUM(eci.approved_amount) as totalApproved'),
          db.raw("SUM(CASE WHEN eci.policy_validated = 0 THEN 1 ELSE 0 END) as violationsCount")
        )
        .groupBy('cat.name')
        .orderBy('totalClaimed', 'desc');
      return (rows || []).map((r: any) => ({
        categoryName: r.categoryName,
        totalClaims: Number(r.totalClaims || 0),
        totalItems: Number(r.totalItems || 0),
        totalClaimed: Number(r.totalClaimed || 0),
        totalApproved: Number(r.totalApproved || 0),
        violationsCount: Number(r.violationsCount || 0),
      }));
    }

    // --- MONTHLY TRENDS AGGREGATION ---
    if (reportType === 'monthly') {
      let q = db('expense_claims as ec')
        .leftJoin('employees as e', 'ec.employee_id', 'e.id')
        .where('ec.organization_id', ctx.organizationId);
      q = applyCommonFilters(q);
      const rows = await q
        .select(
          db.raw("DATE_FORMAT(ec.claim_date, '%b %Y') as month"),
          db.raw("DATE_FORMAT(ec.claim_date, '%Y-%m') as monthKey"),
          db.raw('COUNT(ec.id) as totalClaims'),
          db.raw('SUM(ec.total_claimed_amount) as totalClaimed'),
          db.raw('SUM(ec.total_approved_amount) as totalApproved'),
          db.raw('SUM(ec.paid_amount) as totalPaid'),
          db.raw("SUM(CASE WHEN ec.status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount")
        )
        .groupByRaw("DATE_FORMAT(ec.claim_date, '%Y-%m'), DATE_FORMAT(ec.claim_date, '%b %Y')")
        .orderBy('monthKey', 'asc')
        .limit(24);
      return (rows || []).map((r: any) => ({
        month: r.month,
        monthKey: r.monthKey,
        totalClaims: Number(r.totalClaims || 0),
        totalClaimed: Number(r.totalClaimed || 0),
        totalApproved: Number(r.totalApproved || 0),
        totalPaid: Number(r.totalPaid || 0),
        rejectedCount: Number(r.rejectedCount || 0),
      }));
    }

    // --- POLICY VIOLATIONS REPORT ---
    if (reportType === 'violations') {
      let q = db('expense_claim_items as eci')
        .leftJoin('expense_claims as ec', 'eci.claim_id', 'ec.id')
        .leftJoin('employees as e', 'ec.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .leftJoin('expense_categories as cat', 'eci.category_id', 'cat.id')
        .where('ec.organization_id', ctx.organizationId)
        .where('eci.policy_validated', false);
      if (filters.startDate) q = q.where('ec.claim_date', '>=', filters.startDate);
      if (filters.endDate) q = q.where('ec.claim_date', '<=', filters.endDate);
      if (filters.departmentId) q = q.where('e.current_department_id', filters.departmentId);
      const rows = await q
        .select(
          'ec.claim_number as claimNumber',
          'ec.title as claimTitle',
          'ec.status',
          db.raw("CONCAT(e.first_name, ' ', e.last_name) as employeeName"),
          'e.employee_code as employeeCode',
          db.raw("COALESCE(d.name, 'Unassigned') as departmentName"),
          db.raw("COALESCE(cat.name, 'Uncategorized') as categoryName"),
          'eci.claimed_amount as claimedAmount',
          'eci.policy_violations as policyViolations',
          'eci.employee_justification as employeeJustification',
          'ec.claim_date as claimDate'
        )
        .orderBy('ec.claim_date', 'desc')
        .limit(500);
      return (rows || []).map((r: any) => ({
        claimNumber: r.claimNumber,
        claimTitle: r.claimTitle,
        status: r.status,
        employeeName: r.employeeName,
        employeeCode: r.employeeCode,
        departmentName: r.departmentName,
        categoryName: r.categoryName,
        claimedAmount: Number(r.claimedAmount || 0),
        policyViolations: r.policyViolations ? (() => { try { return JSON.parse(r.policyViolations); } catch { return [r.policyViolations]; } })() : [],
        employeeJustification: r.employeeJustification,
        claimDate: r.claimDate,
      }));
    }

    // --- REIMBURSEMENT REPORT ---
    if (reportType === 'reimbursement') {
      let q = db('expense_claims as ec')
        .leftJoin('employees as e', 'ec.employee_id', 'e.id')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('ec.organization_id', ctx.organizationId)
        .whereIn('ec.status', ['payment_pending', 'paid', 'approved']);
      q = applyCommonFilters(q);
      const rows = await q
        .select(
          'ec.claim_number as claimNumber',
          'ec.title',
          'ec.status',
          'ec.total_claimed_amount as totalClaimed',
          'ec.total_approved_amount as totalApproved',
          'ec.paid_amount as paidAmount',
          'ec.payment_method as paymentMethod',
          'ec.payment_reference as paymentReference',
          'ec.payment_date as paymentDate',
          'ec.approved_at as approvedAt',
          'ec.reimbursed_at as reimbursedAt',
          db.raw("CONCAT(e.first_name, ' ', e.last_name) as employeeName"),
          'e.employee_code as employeeCode',
          db.raw("COALESCE(d.name, 'Unassigned') as departmentName")
        )
        .orderBy('ec.claim_date', 'desc')
        .limit(500);
      return (rows || []).map((r: any) => ({
        claimNumber: r.claimNumber,
        title: r.title,
        status: r.status,
        totalClaimed: Number(r.totalClaimed || 0),
        totalApproved: Number(r.totalApproved || 0),
        paidAmount: Number(r.paidAmount || 0),
        paymentMethod: r.paymentMethod,
        paymentReference: r.paymentReference,
        paymentDate: r.paymentDate,
        approvedAt: r.approvedAt,
        reimbursedAt: r.reimbursedAt,
        employeeName: r.employeeName,
        employeeCode: r.employeeCode,
        departmentName: r.departmentName,
      }));
    }

    // --- DEFAULT: EMPLOYEE-WISE FLAT CLAIM LIST ---
    let query = db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('expense_categories as cat', 'ec.category_id', 'cat.id')
      .where('ec.organization_id', ctx.organizationId)
      .select(
        'ec.*',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'd.name as department_name',
        'cat.name as category_name'
      )
      .orderBy('ec.claim_date', 'desc');

    query = applyCommonFilters(query);
    if (filters.employeeId) query = query.where('ec.employee_id', filters.employeeId);
    const rows = await query;
    return (rows || []).map((r: any) => this.mapClaim(r));
  }

  // --- SETTINGS ---
  private mapExpenseSettings(settings: any) {
    if (!settings) return settings;
    return {
      ...settings,
      autoApprovalThreshold: Number(settings.auto_approval_threshold ?? settings.autoApprovalThreshold ?? 500),
      mileageRateCar: Number(settings.mileage_rate_car ?? settings.mileageRateCar ?? 12),
      mileageRateBike: Number(settings.mileage_rate_bike ?? settings.mileageRateBike ?? 6),
      requireManagerApproval: Boolean(settings.require_manager_approval ?? settings.requireManagerApproval ?? true),
      requireFinanceApproval: Boolean(settings.require_finance_approval ?? settings.requireFinanceApproval ?? true),
      multiLevelApproval: Boolean(settings.multi_level_approval ?? settings.multiLevelApproval ?? true),
      enableTravelModule: Boolean(settings.enable_travel_module ?? settings.enableTravelModule ?? true),
      enableMileageModule: Boolean(settings.enable_mileage_module ?? settings.enableMileageModule ?? true),
      currencySymbol: settings.currency_symbol || '₹',
      currencyCode: settings.currency_code || 'INR',
      currencyLocale: settings.currency_locale || 'en-IN',
      claimNumberPrefix: settings.claim_number_prefix || 'EXP',
      travelRequestNumberPrefix: settings.travel_request_number_prefix || 'TRV',
      travelAdvanceNumberPrefix: settings.travel_advance_number_prefix || 'ADV',
      defaultPaymentMethod: settings.default_payment_method || 'bank_transfer',
      defaultAdvanceStatus: settings.default_advance_status || 'pending_finance',
      workflowFallbackMaxAmount: Number(settings.workflow_fallback_max_amount || 10000000),
      numberSequenceDigits: Number(settings.number_sequence_digits || 6)
    };
  }

  async getSettings(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    let settings = await db('expense_settings').where('organization_id', ctx.organizationId).first();
    if (!settings) {
      const hasTravelCol = await db.schema.hasColumn('expense_settings', 'enable_travel_module').catch(() => false);
      const hasMileageCol = await db.schema.hasColumn('expense_settings', 'enable_mileage_module').catch(() => false);

      const initData: any = {
        organization_id: ctx.organizationId,
        auto_approval_threshold: 500.00,
        mileage_rate_car: 12.00,
        mileage_rate_bike: 6.00,
        require_manager_approval: true,
        require_finance_approval: true,
        multi_level_approval: true,
        updated_at: new Date()
      };

      if (hasTravelCol) initData.enable_travel_module = true;
      if (hasMileageCol) initData.enable_mileage_module = true;

      await db('expense_settings').insert(initData);
      settings = await db('expense_settings').where('organization_id', ctx.organizationId).first();
    }
    const mapped = this.mapExpenseSettings(settings);
    const fallbackCar = this.numOr(mapped.mileageRateCar, 12);
    const fallbackBike = this.numOr(mapped.mileageRateBike, 6);
    const mileageRatesByDesignation = await this.listMileageRatesByDesignation(db, ctx.organizationId, fallbackCar, fallbackBike);
    const myMileage = await this.resolveEmployeeMileageRates(ctx, db, fallbackCar, fallbackBike);
    const cfg = await this.getConfig(ctx);
    return {
      ...mapped,
      labels: cfg.labels,
      mileageRatesByDesignation,
      myMileageRateCar: myMileage.rateCar,
      myMileageRateBike: myMileage.rateBike,
      myDesignationId: myMileage.designationId,
      myDesignationName: myMileage.designationName,
    };
  }

  async updateSettings(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const existing = await db('expense_settings').where('organization_id', ctx.organizationId).first();

    const updateData: any = {
      auto_approval_threshold: data.autoApprovalThreshold ?? 500,
      mileage_rate_car: data.mileageRateCar ?? 12,
      mileage_rate_bike: data.mileageRateBike ?? 6,
      require_manager_approval: Boolean(data.requireManagerApproval),
      require_finance_approval: Boolean(data.requireFinanceApproval),
      multi_level_approval: Boolean(data.multiLevelApproval),
      updated_at: new Date()
    };

    const hasTravelCol = await db.schema.hasColumn('expense_settings', 'enable_travel_module').catch(() => false);
    if (hasTravelCol) {
      updateData.enable_travel_module = data.enableTravelModule !== undefined ? Boolean(data.enableTravelModule) : true;
    }

    const hasMileageCol = await db.schema.hasColumn('expense_settings', 'enable_mileage_module').catch(() => false);
    if (hasMileageCol) {
      updateData.enable_mileage_module = data.enableMileageModule !== undefined ? Boolean(data.enableMileageModule) : true;
    }

    if (data.currencySymbol !== undefined) updateData.currency_symbol = data.currencySymbol;
    if (data.currencyCode !== undefined) updateData.currency_code = data.currencyCode;
    if (data.currencyLocale !== undefined) updateData.currency_locale = data.currencyLocale;
    if (data.claimNumberPrefix !== undefined) updateData.claim_number_prefix = data.claimNumberPrefix;
    if (data.travelRequestNumberPrefix !== undefined) updateData.travel_request_number_prefix = data.travelRequestNumberPrefix;
    if (data.travelAdvanceNumberPrefix !== undefined) updateData.travel_advance_number_prefix = data.travelAdvanceNumberPrefix;
    if (data.defaultPaymentMethod !== undefined) updateData.default_payment_method = data.defaultPaymentMethod;
    if (data.defaultAdvanceStatus !== undefined) updateData.default_advance_status = data.defaultAdvanceStatus;
    if (data.workflowFallbackMaxAmount !== undefined) updateData.workflow_fallback_max_amount = data.workflowFallbackMaxAmount;
    if (data.numberSequenceDigits !== undefined) updateData.number_sequence_digits = data.numberSequenceDigits;

    // Upsert override display labels (portable across DB engines)
    if (data.labels && typeof data.labels === 'object') {
      for (const [labelKey, labelValue] of Object.entries(data.labels)) {
        if (typeof labelValue !== 'string') continue;
        const existingLabel = await db('expense_config_labels')
          .where({ organization_id: ctx.organizationId, label_key: labelKey })
          .first()
          .catch(() => null);
        if (existingLabel) {
          await db('expense_config_labels')
            .where({ organization_id: ctx.organizationId, label_key: labelKey })
            .update({ label_value: labelValue, updated_at: new Date() })
            .catch(() => null);
        } else {
          await db('expense_config_labels')
            .insert({
              organization_id: ctx.organizationId,
              label_key: labelKey,
              label_value: labelValue,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .catch(() => null);
        }
      }
    }

    if (!existing) {
      await db('expense_settings').insert({
        organization_id: ctx.organizationId,
        ...updateData
      });
    } else {
      await db('expense_settings')
        .where('organization_id', ctx.organizationId)
        .update(updateData);
    }

    if (Array.isArray(data.categoryThresholds)) {
      const hasAutoCol = await db.schema.hasColumn('expense_categories', 'auto_approval_threshold').catch(() => false);
      if (hasAutoCol) {
        for (const row of data.categoryThresholds) {
          const id = Number(row.id);
          if (!id) continue;
          await db('expense_categories')
            .where('id', id)
            .where('organization_id', ctx.organizationId)
            .update({
              auto_approval_threshold: Math.max(0, Number(row.autoApprovalThreshold) || 0),
              updated_at: new Date(),
            });
        }
      }
    }

    if (Array.isArray(data.mileageRatesByDesignation)) {
      const rows: Array<{ designationId: number; rateCar: number; rateBike: number }> = [];
      const seen = new Set<number>();
      for (const row of data.mileageRatesByDesignation) {
        const rateCar = Math.max(0, this.numOr(row.rateCar ?? row.rate_car, data.mileageRateCar ?? 12));
        const rateBike = Math.max(0, this.numOr(row.rateBike ?? row.rate_bike, data.mileageRateBike ?? 6));
        const ids = [
          ...(Array.isArray(row.designationIds) ? row.designationIds : []),
          row.designationId ?? row.designation_id,
        ]
          .map((id: any) => Number(id))
          .filter((id: number) => id && !seen.has(id));
        for (const designationId of ids) {
          seen.add(designationId);
          rows.push({ designationId, rateCar, rateBike });
        }
      }

      await db('expense_mileage_designation_rates').where('organization_id', ctx.organizationId).del();
      if (rows.length > 0) {
        await db('expense_mileage_designation_rates').insert(
          rows.map((row) => ({
            organization_id: ctx.organizationId,
            designation_id: row.designationId,
            rate_car: row.rateCar,
            rate_bike: row.rateBike,
            created_at: new Date(),
            updated_at: new Date(),
          }))
        );
      }
    }

    return this.getSettings(ctx);
  }

  // --- DYNAMIC APPROVAL WORKFLOWS ---
  async getWorkflows(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const workflows = await db('expense_workflows as ew')
      .leftJoin('departments as d', 'ew.department_id', 'd.id')
      .where('ew.organization_id', ctx.organizationId)
      .select('ew.*', 'd.name as department_name')
      .orderBy('ew.id', 'desc');

    for (const wf of workflows) {
      const levels = await db('expense_workflow_levels')
        .where('workflow_id', wf.id)
        .orderBy('level_order', 'asc');
      wf.levels = levels;
      wf.targetRole = wf.target_role || wf.targetRole || 'all';
      wf.departmentId = wf.department_id || wf.departmentId || null;
      wf.departmentName = wf.department_name || wf.departmentName || 'All Departments';
      wf.minAmount = wf.min_amount ?? wf.minAmount;
      wf.maxAmount = wf.max_amount ?? wf.maxAmount;
      wf.isActive = Boolean(wf.is_active ?? wf.isActive);
    }
    return workflows;
  }

  async createWorkflow(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const [wfId] = await db('expense_workflows').insert({
      organization_id: ctx.organizationId,
      name: data.name,
      target_role: data.targetRole || 'all',
      description: data.description || null,
      min_amount: data.minAmount || 0,
      max_amount: data.maxAmount || 10000000,
      department_id: data.departmentId || null,
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      created_at: new Date(),
      updated_at: new Date()
    });

    if (data.levels && Array.isArray(data.levels)) {
      let idx = 1;
      for (const lvl of data.levels) {
        await db('expense_workflow_levels').insert({
          workflow_id: wfId,
          level_order: idx++,
          approver_type: lvl.approverType || 'reporting_manager',
          approver_role: lvl.approverRole || 'Reporting Manager',
          step_name: lvl.stepName || `Level ${idx - 1} Approval`,
          is_mandatory: lvl.isMandatory !== undefined ? Boolean(lvl.isMandatory) : true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    return this.getWorkflows(ctx).then(wfs => wfs.find((w: any) => w.id === wfId));
  }

  async updateWorkflow(ctx: TenantContext, id: number, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_workflows')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({
        name: data.name,
        target_role: data.targetRole || 'all',
        description: data.description,
        min_amount: data.minAmount,
        max_amount: data.maxAmount,
        department_id: data.departmentId || null,
        is_active: Boolean(data.isActive),
        updated_at: new Date()
      });

    if (data.levels && Array.isArray(data.levels)) {
      await db('expense_workflow_levels').where('workflow_id', id).delete();
      let idx = 1;
      for (const lvl of data.levels) {
        await db('expense_workflow_levels').insert({
          workflow_id: id,
          level_order: idx++,
          approver_type: lvl.approverType || 'reporting_manager',
          approver_role: lvl.approverRole || 'Approver',
          step_name: lvl.stepName || `Step ${idx - 1}`,
          is_mandatory: lvl.isMandatory !== undefined ? Boolean(lvl.isMandatory) : true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    return this.getWorkflows(ctx).then(wfs => wfs.find((w: any) => w.id === id));
  }

  async deleteWorkflow(ctx: TenantContext, id: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_workflow_levels').where('workflow_id', id).delete();
    await db('expense_workflows').where('id', id).where('organization_id', ctx.organizationId).delete();
    return { success: true };
  }
}
