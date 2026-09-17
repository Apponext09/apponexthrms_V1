import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../../../common/errors/index';
import { WorkflowRepository } from '../repositories/WorkflowRepository';
import { WorkflowStepRepository } from '../repositories/WorkflowStepRepository';
import { db } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export interface ApplicabilityFilters {
  companyIds?: number[];
  companyLocationIds?: number[];
  departmentIds?: number[];
  gradeIds?: number[];
  employeeTypes?: string[];
  employeeIds?: number[];
}

export interface StepFormPermissions {
  isClearanceForm?: boolean;
  allowAddExtraAmount?: boolean;
  allowViewPreviousExtraAmount?: boolean;
  canSeeAssets?: boolean;
  canChangeResignationDate?: boolean;
  showNoticePeriodDetail?: boolean;
  allowEditNoticePeriodInfo?: boolean;
  showApprovalForm?: boolean;
  includeFnfTemplate?: boolean;
  recoveryAmount?: boolean;
}

export interface EscalationRecipient {
  type: 'employee' | 'reporting_officer' | 'self' | 'custom_email';
  userIds?: number[];
  departmentIds?: number[];
  customEmail?: string;
}

export interface EscalationConfig {
  ifNotApprovedWithinDays?: number;
  remindEveryDays?: number;
  scheduledDayOfMonth?: number;
  approvalMode?: 'manual' | 'auto';
  recipients?: EscalationRecipient[];
}

export interface NotificationEventConfig {
  recipients?: EscalationRecipient[];
}

export interface NotificationConfig {
  application?: NotificationEventConfig;
  approve?: NotificationEventConfig;
  reject?: NotificationEventConfig;
  cancel?: NotificationEventConfig;
}

export interface CreateWorkflowSettingInput {
  workflowName: string;
  workflowType: string;
  approvalType: 'manual' | 'auto';
  isActive: boolean;
  applicabilityFilters?: ApplicabilityFilters;
}

export interface CreateStepInput {
  workflowId: number;
  stepNumber?: number;
  stepType: 'reporting_officer' | 'employee' | 'department' | 'role';
  stepName?: string;
  approverId?: number;
  approverRoleId?: number;
  approverDepartmentId?: number;
  formPermissions?: StepFormPermissions;
  escalationConfig?: EscalationConfig;
  notificationConfig?: NotificationConfig;
}

function safeParseJson(str: string | null | undefined, fallback: any = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function mapToDbApproverType(type: string): string {
  switch (type) {
    case 'reporting_officer': return 'reporting_manager';
    case 'employee': return 'specific_user';
    case 'department': return 'department_head';
    case 'role': return 'user_role';
    default: return type;
  }
}

function mapFromDbApproverType(type: string): string {
  switch (type) {
    case 'reporting_manager': return 'reporting_officer';
    case 'specific_user': return 'employee';
    case 'department_head': return 'department';
    case 'user_role': return 'role';
    default: return type;
  }
}

export class WorkflowSettingsService {
  private workflowRepo: WorkflowRepository;
  private stepRepo: WorkflowStepRepository;

  constructor() {
    this.workflowRepo = new WorkflowRepository();
    this.stepRepo = new WorkflowStepRepository();
  }

  // --- Workflow CRUD ---------------------------------------------------------

  async createWorkflowSetting(ctx: TenantContext, input: CreateWorkflowSettingInput) {
    const type = input.workflowType || 'general';
    const code = `wf_${type.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    const workflow = await this.workflowRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_code: code,
      workflow_name: input.workflowName,
      type: type,
      status: 'draft',
      approval_pattern: 'sequential',
      auto_approve_after_days: input.approvalType === 'auto' ? 0 : null,
      notify_on_completion: true,
      max_escalation_levels: 3,
      is_active: input.isActive ? 1 : 0,
      applicability_filters: input.applicabilityFilters
        ? JSON.stringify(input.applicabilityFilters)
        : null,
      approval_type: input.approvalType,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);
    return workflow;
  }

  async updateWorkflowSetting(ctx: TenantContext, id: number, input: Partial<CreateWorkflowSettingInput>) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) throw new NotFoundError('Workflow not found');

    const updateData: any = { updated_by: ctx.userId };
    if (input.workflowName !== undefined) updateData.workflow_name = input.workflowName;
    if (input.workflowType !== undefined) updateData.type = input.workflowType;
    if (input.approvalType !== undefined) updateData.approval_type = input.approvalType;
    if (input.isActive !== undefined) updateData.is_active = input.isActive ? 1 : 0;
    if (input.applicabilityFilters !== undefined) {
      updateData.applicability_filters = JSON.stringify(input.applicabilityFilters);
    }

    return this.workflowRepo.update(ctx, id, updateData);
  }

  async deleteWorkflowSetting(ctx: TenantContext, id: number) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) throw new NotFoundError('Workflow not found');
    return this.workflowRepo.update(ctx, id, { deleted_at: new Date() } as any);
  }

  async listWorkflowSettings(ctx: TenantContext, options: {
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { page = 1, pageSize = 20, type, search } = options;
    const result = await this.workflowRepo.list(ctx, {
      page,
      pageSize,
      search,
      filters: type ? { type } : {},
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    const rawItems = (result as any).items || (result as any).data || result || [];
    const items = rawItems.map((w: any) => ({
      ...w,
      applicabilityFilters: safeParseJson(w.applicability_filters),
    }));

    return { items, total: (result as any).total ?? items.length, page, pageSize };
  }

  async getWorkflowSetting(ctx: TenantContext, id: number) {
    const workflow = await this.workflowRepo.getById(ctx, id);
    if (!workflow) throw new NotFoundError('Workflow not found');
    const steps = await this.getWorkflowSteps(ctx, id);
    return {
      ...workflow,
      applicabilityFilters: safeParseJson((workflow as any).applicability_filters),
      steps,
    };
  }

  // --- Step CRUD -------------------------------------------------------------

  async getWorkflowSteps(ctx: TenantContext, workflowId: number) {
    const steps = await this.stepRepo.getAllSteps(ctx, workflowId);
    return steps.map((s: any) => ({
      ...s,
      approver_type: mapFromDbApproverType(s.approver_type),
      formPermissions: safeParseJson(s.form_permissions),
      escalationConfig: safeParseJson(s.escalation_config),
      notificationConfig: safeParseJson(s.notification_config),
    }));
  }

  async addStep(ctx: TenantContext, input: CreateStepInput) {
    const existingSteps = await this.stepRepo.getAllSteps(ctx, input.workflowId);
    const stepNumber = input.stepNumber ?? existingSteps.length + 1;
    const stepName = input.stepName || this.getDefaultStepName(input.stepType);

    // The last configured step completes the workflow. When a new step is
    // appended, it becomes the new final step.
    await (this.stepRepo as any).query(ctx)
      .where('workflow_id', input.workflowId)
      .whereNull('deleted_at')
      .update({ is_final_step: false });

    // The UI selects an employee record; approvals are assigned to the linked
    // authenticated user record.
    let approverId = input.approverId;
    if (input.stepType === 'employee' && input.approverId) {
      const user = await db('users')
        .where({ organization_id: ctx.organizationId, employee_id: input.approverId })
        .whereNull('deleted_at')
        .first('id');
      if (!user) throw new NotFoundError('The selected employee does not have an active user account');
      approverId = Number(user.id);
    }

    const step = await this.stepRepo.create(ctx, {
      uuid: uuidv4(),
      workflow_id: input.workflowId,
      step_number: stepNumber,
      step_name: stepName,
      approver_type: mapToDbApproverType(input.stepType),
      approver_id: approverId ?? null,
      approver_role_id: input.approverRoleId ?? null,
      approver_department_id: input.approverDepartmentId ?? null,
      approval_mode: 'single_person',
      can_delegate: true,
      can_reject: true,
      can_reassign: false,
      is_final_step: true,
      action_on_approval: 'proceed',
      action_on_rejection: 'reject',
      form_permissions: input.formPermissions ? JSON.stringify(input.formPermissions) : null,
      escalation_config: input.escalationConfig ? JSON.stringify(input.escalationConfig) : null,
      notification_config: input.notificationConfig ? JSON.stringify(input.notificationConfig) : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    return {
      ...step,
      approver_type: input.stepType,
      formPermissions: input.formPermissions ?? {},
      escalationConfig: input.escalationConfig ?? {},
      notificationConfig: input.notificationConfig ?? {},
    };
  }

  async updateStep(ctx: TenantContext, stepId: number, input: Partial<CreateStepInput>) {
    const updateData: any = { updated_by: ctx.userId };
    if (input.stepName !== undefined) updateData.step_name = input.stepName;
    if (input.stepType !== undefined) updateData.approver_type = mapToDbApproverType(input.stepType);
    if (input.approverId !== undefined) updateData.approver_id = input.approverId;
    if (input.approverRoleId !== undefined) updateData.approver_role_id = input.approverRoleId;
    if (input.approverDepartmentId !== undefined) updateData.approver_department_id = input.approverDepartmentId;
    if (input.formPermissions !== undefined) updateData.form_permissions = JSON.stringify(input.formPermissions);
    if (input.escalationConfig !== undefined) updateData.escalation_config = JSON.stringify(input.escalationConfig);
    if (input.notificationConfig !== undefined) updateData.notification_config = JSON.stringify(input.notificationConfig);

    return this.stepRepo.update(ctx, stepId, updateData);
  }

  async deleteStep(ctx: TenantContext, stepId: number, workflowId: number) {
    await this.stepRepo.update(ctx, stepId, { deleted_at: new Date() } as any);
    const remaining = await this.stepRepo.getAllSteps(ctx, workflowId);
    for (let i = 0; i < remaining.length; i++) {
      await this.stepRepo.update(ctx, remaining[i].id, {
        step_number: i + 1,
        updated_by: ctx.userId,
      } as any);
    }
    return { success: true };
  }

  async reorderSteps(ctx: TenantContext, workflowId: number, stepIds: number[]) {
    for (let i = 0; i < stepIds.length; i++) {
      await this.stepRepo.update(ctx, stepIds[i], {
        step_number: i + 1,
        updated_by: ctx.userId,
      } as any);
    }
    return this.getWorkflowSteps(ctx, workflowId);
  }

  // --- Recipient Lookup ------------------------------------------------------

  async getRecipientOptions(ctx: TenantContext, query?: string) {
    let usersQuery = db('employees')
      .where('employees.organization_id', ctx.organizationId)
      .whereNull('employees.deleted_at')
      .whereIn('employees.status', ['active', 'probation', 'confirmed', 'Active'])
      .select(
        'employees.id',
        'employees.employee_code',
        db.raw("CONCAT(employees.first_name, ' ', COALESCE(employees.last_name, '')) as full_name"),
        'employees.current_department_id'
      );

    if (query) {
      usersQuery = usersQuery.whereRaw(
        "CONCAT(employees.first_name, ' ', COALESCE(employees.last_name, '')) LIKE ?",
        [`%${query}%`]
      );
    }
    const users = await usersQuery.limit(50);

    const departments = await db('departments')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select('id', 'name')
      .orderBy('name', 'asc');

    let roles: any[] = [];
    try {
      const roleRows = await db('roles')
        .where(function () {
          this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
        })
        .whereNull('deleted_at')
        .select('id', 'name', 'code')
        .orderBy('name', 'asc');

      roles = roleRows.map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        display_name: r.name,
        code: r.code,
      }));
    } catch {
      roles = [];
    }

    return { users, departments, roles };
  }

  async getApplicabilityOptions(ctx: TenantContext) {
    let companies: any[] = [];
    try {
      const targetTable = (await db.schema.hasTable('company'))
        ? 'company'
        : (await db.schema.hasTable('companies'))
        ? 'companies'
        : 'organizations';

      let rows: any[] = [];
      if (targetTable === 'company' || targetTable === 'companies') {
        rows = await db(targetTable)
          .where(function () {
            this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
          })
          .whereNull('deleted_at')
          .select('*');
      } else {
        rows = await db('organizations').where('id', ctx.organizationId).whereNull('deleted_at').select('*');
      }

      companies = rows.map((r: any) => ({
        id: Number(r.companyId || r.company_id || r.id),
        name: String(r.name || r.companyName || r.company_name || r.employerName || r.employer_name || `Company #${r.companyId || r.id}`).trim(),
        code: String(r.code || r.companyCode || r.company_code || ''),
      }));
    } catch {
      companies = [];
    }

    let departments: any[] = [];
    try {
      departments = await db('departments')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'name', 'code')
        .orderBy('name', 'asc');
    } catch {
      departments = [];
    }

    let grades: any[] = [];
    try {
      grades = await db('grades')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'name', 'code')
        .orderBy('name', 'asc');
    } catch {
      grades = [];
    }

    let employeeTypes: string[] = ['Full Time', 'Part Time', 'Intern', 'Contract', 'Consultant', 'Probation'];
    try {
      const etRows = await db('employee_types')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('name');
      if (etRows.length > 0) {
        employeeTypes = etRows.map(r => r.name || r.type);
      }
    } catch {
      // fallback
    }

    let employees: any[] = [];
    try {
      const empRows = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select('id', 'employee_code', 'first_name', 'last_name')
        .orderBy('first_name', 'asc');

      employees = empRows.map((e: any) => {
        const fn = e.firstName || e.first_name || '';
        const ln = e.lastName || e.last_name || '';
        const code = e.employeeCode || e.employee_code || '';
        const fullName = `${fn} ${ln}`.trim() || `Employee #${e.id}`;
        return {
          id: Number(e.id),
          fullName,
          employeeCode: code,
        };
      });
    } catch {
      employees = [];
    }

    return { companies, departments, grades, employeeTypes, employees };
  }

  // --- Helpers ---------------------------------------------------------------

  private getDefaultStepName(type: string): string {
    switch (type) {
      case 'reporting_officer': return 'Reporting Officer';
      case 'employee': return 'Employee';
      case 'department': return 'Department Head';
      case 'role': return 'Role';
      default: return 'Approval Step';
    }
  }
}
