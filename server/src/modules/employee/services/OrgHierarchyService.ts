import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { ValidationError } from '../../../common/errors/index';
import { v4 as uuidv4 } from 'uuid';

export interface HierarchyRuleBackend {
  id: string;
  designationOrRole: string;
  allowedParentDesignations: string[];
  departmentScope?: string;
  hierarchyLevel: number;
}

export const DEFAULT_BACKEND_HIERARCHY_RULES: HierarchyRuleBackend[] = [
  { id: 'rule-ceo', designationOrRole: 'CEO', allowedParentDesignations: [], hierarchyLevel: 1 },
  { id: 'rule-coo', designationOrRole: 'COO', allowedParentDesignations: ['CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 2 },
  { id: 'rule-cto', designationOrRole: 'CTO', allowedParentDesignations: ['COO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 2 },
  { id: 'rule-cfo', designationOrRole: 'CFO', allowedParentDesignations: ['COO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 2 },
  { id: 'rule-it-head', designationOrRole: 'IT Head', allowedParentDesignations: ['CTO', 'CEO', 'COO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-pm', designationOrRole: 'Project Manager', allowedParentDesignations: ['IT Head', 'Department Manager', 'Department Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 4 },
  { id: 'rule-tl', designationOrRole: 'Team Leader', allowedParentDesignations: ['Project Manager', 'Department Manager', 'IT Head', 'Department Head', 'Manager', 'HR Manager', 'Finance Manager', 'Organization Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 5 },
  { id: 'rule-employee', designationOrRole: 'Employee', allowedParentDesignations: ['Team Leader'], hierarchyLevel: 6 },
  { id: 'rule-intern', designationOrRole: 'Intern', allowedParentDesignations: ['Employee', 'HR Executive', 'Accountant'], hierarchyLevel: 7 },
  { id: 'rule-dept-head', designationOrRole: 'Department Head', allowedParentDesignations: ['CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-dept-mgr', designationOrRole: 'Department Manager', allowedParentDesignations: ['Department Head', 'IT Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-mgr', designationOrRole: 'Manager', allowedParentDesignations: ['Department Head', 'IT Head', 'HR Manager', 'Finance Manager', 'CTO', 'COO', 'CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-hr-mgr', designationOrRole: 'HR Manager', allowedParentDesignations: ['CEO', 'COO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-hr-exec', designationOrRole: 'HR Executive', allowedParentDesignations: ['HR Manager', 'Department Manager', 'Department Head', 'COO', 'CEO'], hierarchyLevel: 4 },
  { id: 'rule-fin-mgr', designationOrRole: 'Finance Manager', allowedParentDesignations: ['CFO', 'CEO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
  { id: 'rule-accountant', designationOrRole: 'Accountant', allowedParentDesignations: ['Finance Manager', 'Department Manager', 'Department Head', 'CFO', 'CEO'], hierarchyLevel: 4 },
  { id: 'rule-org-mgr', designationOrRole: 'Organization Manager', allowedParentDesignations: ['CEO', 'COO', 'ORGANIZATION ADMIN'], hierarchyLevel: 3 },
];

export class OrgHierarchyService {
  /**
   * Fetch configured hierarchy rules for an organization
   */
  async getHierarchyRules(ctx: TenantContext): Promise<HierarchyRuleBackend[]> {
    const db = getKnex();
    try {
      const setting = await db('organization_settings')
        .where({
          organization_id: ctx.organizationId,
          setting_key: 'org_hierarchy_rules',
        })
        .whereNull('deleted_at')
        .first();

      if (setting && setting.setting_value) {
        const val = typeof setting.setting_value === 'string' ? JSON.parse(setting.setting_value) : setting.setting_value;
        if (Array.isArray(val) && val.length > 0) {
          return val;
        }
      }
    } catch (err) {
      console.warn('[OrgHierarchyService] Failed to read org_hierarchy_rules setting, using default rules:', err);
    }
    return DEFAULT_BACKEND_HIERARCHY_RULES;
  }

  /**
   * Update hierarchy rules for an organization
   */
  async saveHierarchyRules(ctx: TenantContext, rules: HierarchyRuleBackend[]): Promise<void> {
    const db = getKnex();
    const settingValue = JSON.stringify(rules);

    const existing = await db('organization_settings')
      .where({
        organization_id: ctx.organizationId,
        setting_key: 'org_hierarchy_rules',
      })
      .first();

    if (existing) {
      await db('organization_settings')
        .where('id', existing.id)
        .update({
          setting_value: settingValue,
          updated_by: ctx.userId,
          updated_at: new Date(),
          deleted_at: null,
        });
    } else {
      await db('organization_settings').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        setting_key: 'org_hierarchy_rules',
        setting_value: settingValue,
        setting_type: 'json',
        description: 'Configurable Organization Hierarchy Rules',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  /**
   * Helper to normalize position key
   */
  normalizePositionKey(designation?: string, accessRole?: string): string {
    const role = (accessRole || '').toLowerCase().trim();
    const desig = (designation || '').toLowerCase().trim();

    if (role === 'coo' || desig.includes('coo') || desig.includes('chief operating officer')) return 'COO';
    if (role === 'cto' || desig.includes('cto') || desig.includes('chief technology officer')) return 'CTO';
    if (role === 'cfo' || desig.includes('cfo') || desig.includes('chief financial officer')) return 'CFO';
    if (role === 'cxo' || role === 'ceo' || role === 'organization_admin' || role === 'super_admin' || desig.includes('ceo') || desig.includes('chief executive') || desig.includes('organization admin') || desig.includes('organization administrator')) return 'CEO';

    if (desig.includes('it head') || desig.includes('head of it') || (role === 'department_head' && desig.includes('it'))) return 'IT Head';
    if (desig.includes('hr manager') || (role === 'hr_manager' && !desig.includes('executive'))) return 'HR Manager';
    if (desig.includes('hr executive')) return 'HR Executive';
    if (desig.includes('finance manager')) return 'Finance Manager';
    if (desig.includes('accountant') || desig.includes('account')) return 'Accountant';
    if (desig.includes('organization manager') || desig.includes('org manager')) return 'Organization Manager';

    if (desig.includes('dept head') || desig.includes('department head') || desig.includes('head of department') || desig.includes('vp') || desig.includes('vice president') || desig.includes('director')) return 'Department Head';
    if (desig.includes('project manager') || desig.includes('product manager') || desig.includes('engineering manager') || desig.includes('pm')) return 'Project Manager';
    if (role === 'department_head' || desig.includes('manager') || desig.includes('head')) return 'Department Manager';

    if (role === 'team_lead' || desig.includes('team lead') || desig.includes('team leader') || desig.includes('tech lead') || desig.includes('lead engineer') || desig.includes('module lead')) return 'Team Leader';
    if (role === 'intern' || desig.includes('intern') || desig.includes('trainee') || desig.includes('apprentice')) return 'Intern';

    return 'Employee';
  }

  /**
   * Validate reporting manager assignment on backend
   */
  async validateReportingManagerUpdate(
    ctx: TenantContext,
    activeEmployeeId: number,
    targetManagerId: number | null
  ): Promise<void> {
    const sourcePos = await this.getEmployeePositionKey(ctx, activeEmployeeId);

    // Target is Org Admin / Top Root / null
    if (!targetManagerId || targetManagerId === 999999) {
      if (sourcePos === 'Employee') {
        throw new ValidationError('This Employee cannot be assigned to the selected position. Employees can only report directly to a Team Leader.');
      }
      if (sourcePos === 'Intern') {
        throw new ValidationError('This Intern cannot be assigned to the selected position. Interns can only report directly to an Employee.');
      }
      const rules = await this.getHierarchyRules(ctx);
      const rule = rules.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase()) ||
        DEFAULT_BACKEND_HIERARCHY_RULES.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase());
      const allowedParents = rule?.allowedParentDesignations || [];
      const allowsAdmin = allowedParents.some((p) => ['ceo', 'organization admin'].includes(p.toLowerCase()));
      if (!allowsAdmin && sourcePos !== 'CEO') {
        throw new ValidationError(`${sourcePos}s cannot report directly to Organization Admin. According to the organization hierarchy, please select the appropriate manager level.`);
      }
      return;
    }

    const db = getKnex();

    // 1. Self Reporting Check
    if (Number(activeEmployeeId) === Number(targetManagerId)) {
      throw new ValidationError('An employee cannot be assigned as their own reporting manager.');
    }

    // 2. Circular Reporting Check
    let currentId: number | null = targetManagerId;
    const visited = new Set<number>();
    visited.add(Number(targetManagerId));

    while (currentId) {
      const parent = await db('employees')
        .where('id', currentId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();

      if (!parent || !parent.reporting_manager_id) break;

      const numParentMgr = Number(parent.reporting_manager_id);
      if (numParentMgr === Number(activeEmployeeId)) {
        throw new ValidationError('Circular reporting relationship detected. An employee cannot report to their own sub-report/descendant.');
      }

      if (visited.has(numParentMgr)) break; // Prevents infinite loop in existing data
      visited.add(numParentMgr);
      currentId = numParentMgr;
    }

    // 3. Role/Designation Hierarchy Validation Check
    const targetPos = await this.getEmployeePositionKey(ctx, targetManagerId);

    // Department Boundary Validation (Same Department Reporting Only for non-executives)
    const isExecutiveRole = (pos: string) => ['CEO', 'COO', 'CTO', 'CFO', 'ORGANIZATION ADMIN'].includes(pos.toUpperCase());

    if (!isExecutiveRole(sourcePos) && !isExecutiveRole(targetPos)) {
      const activeEmp = await db('employees').where('id', activeEmployeeId).first();
      const targetMgr = await db('employees').where('id', targetManagerId).first();

      if (activeEmp && targetMgr) {
        const srcDeptId = activeEmp.current_department_id;
        const tgtDeptId = targetMgr.current_department_id;

        if (srcDeptId && tgtDeptId && Number(srcDeptId) !== Number(tgtDeptId)) {
          throw new ValidationError('Cross-department reporting is not allowed. Employees can only report to managers within their own department.');
        }
      }
    }

    if (sourcePos === 'Employee') {
      if (targetPos === 'Team Leader') {
        return;
      }
      throw new ValidationError('This Employee cannot be assigned to the selected position. Employees can only report directly to a Team Leader.');
    }

    if (sourcePos === 'Intern') {
      if (['Employee', 'HR Executive', 'Accountant'].includes(targetPos)) {
        return;
      }
      throw new ValidationError('This Intern cannot be assigned to the selected position. Interns can only report directly to an Employee.');
    }

    const rules = await this.getHierarchyRules(ctx);
    const rule = rules.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase()) ||
      DEFAULT_BACKEND_HIERARCHY_RULES.find((r) => r.designationOrRole.toLowerCase() === sourcePos.toLowerCase());

    const allowedParents = rule?.allowedParentDesignations || [];
    const isAllowed = allowedParents.some((p) => p.toLowerCase() === targetPos.toLowerCase());

    if (!isAllowed) {
      const expectedStr = allowedParents.join(' or ') || 'its immediate manager';
      throw new ValidationError(`${sourcePos}s can report only to ${expectedStr}. Assigned position (${targetPos}) is not valid under the configured organization hierarchy.`);
    }
  }

  /**
   * Helper to resolve exact position key for an employee considering DB designation and roles
   */
  async getEmployeePositionKey(ctx: TenantContext, employeeId: number): Promise<string> {
    const db = getKnex();
    const emp = await db('employees')
      .leftJoin('designations', 'employees.current_designation_id', 'designations.id')
      .where('employees.id', employeeId)
      .where('employees.organization_id', ctx.organizationId)
      .select('employees.*', 'designations.name as designation_name')
      .first();

    if (!emp) return 'Employee';

    if (emp.is_ceo === 1 || (emp as any).isCeo === 1 || (emp.employee_code && String(emp.employee_code).toUpperCase().includes('CEO'))) {
      return 'CEO';
    }

    let accessRole = (emp as any).access_role || (emp as any).accessRole;
    let desigTitle = emp.designation_name || emp.job_title || (emp as any).designation;

    const user = await db('users')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .first();

    if (user) {
      if (!desigTitle) desigTitle = user.designation;

      if (user) {
        let highestRole = user.role || 'employee';
        let highestPriority = 0;
        const userRoles = await db('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where(function (this: any) {
            this.where('user_roles.organization_id', ctx.organizationId).orWhereNull('user_roles.organization_id');
          })
          .where('user_roles.user_id', user.id)
          .whereIn('roles.code', ['employee', 'team_lead', 'hr_manager', 'department_head', 'cto', 'cfo', 'coo', 'cxo', 'intern', 'consultant', 'finance'])
          .select('roles.code');

        const rolePriority: Record<string, number> = {
          ceo: 8, organization_admin: 8, super_admin: 8, cto: 6, cfo: 6, coo: 6, cxo: 6,
          hr_manager: 5, department_head: 4, team_lead: 3, finance: 3, intern: 2, consultant: 2, employee: 1,
        };
        for (const ur of userRoles) {
          const priority = rolePriority[ur.code] || 0;
          if (priority > highestPriority) {
            highestPriority = priority;
            highestRole = ur.code;
          }
        }
        accessRole = highestRole;
      }
    }

    return this.normalizePositionKey(desigTitle, accessRole);
  }
}
