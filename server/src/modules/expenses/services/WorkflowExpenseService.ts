import { ValidationError } from '../../../common/errors/index';
import { EXPENSE_VALIDATION_MESSAGES } from '../expense.global.validation';
import { v4 as uuid } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { ExpenseService, type ClaimInput } from './ExpenseService';
import { ExpenseConfigService } from './ExpenseConfigService';
import { assertStepActor, entityTables, json, money, requestTypes, selectWorkflow, type ExpenseRequestType } from './ExpenseWorkflowRules';

const adminRoles = ['ceo', 'organization_admin', 'admin', 'super_admin', 'hr', 'hr_admin', 'hr_manager'];
const financeRoles = ['finance', 'finance_manager', 'accounts'];
const selfApprovalRoles = ['ceo', 'organization_admin', 'hr', 'hr_admin', 'hr_manager'];
const pending = (s: string) => s === 'pending_finance' || s.startsWith('pending_level_');
const date = (v: any) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v) throw new ValidationError('Enter a valid date');
  return String(v);
};
const aliases: Record<string, string[]> = { ceo: ['ceo', 'organization_admin'], hr: ['hr', 'hr_admin', 'hr_manager'], finance: financeRoles, admin: ['admin', 'organization_admin'] };

/** All expense request mutations and visibility go through this service. No role bypass. */
export class WorkflowExpenseService extends ExpenseService {
  async roles(ctx: TenantContext, db: any = getKnex()): Promise<string[]> {
    const rows = await db('user_roles as ur').join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.organization_id', ctx.organizationId).where('ur.user_id', ctx.userId).select('r.code');
    const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first();
    const result = [...new Set([...rows.map((r: any) => r.code), user?.role].filter(Boolean).map(String))];
    for (const [key, values] of Object.entries(aliases)) if (values.some(r => result.includes(r))) result.push(key);
    return [...new Set(result)];
  }

  async assertAccess(ctx: TenantContext, kind: 'configure' | 'reports' | 'pay', db: any = getKnex()) {
    const roles = await this.roles(ctx, db);
    const allowed = kind === 'pay' ? financeRoles : kind === 'reports' ? [...adminRoles, ...financeRoles] : adminRoles;
    if (!roles.some(r => allowed.includes(r))) throw Object.assign(new ValidationError('You do not have permission for this expense operation'), { statusCode: 403 });
  }

  private async applicant(ctx: TenantContext, db: any) {
    const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
    if (!user || (user.status && user.status !== 'active')) throw new ValidationError('Active submitting user not found');
    const employee = user.employeeId ? await db('employees').where({ id: user.employeeId, organization_id: ctx.organizationId }).whereNull('deleted_at').first() :
      await db('employees').where({ email: user.email, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
    return { employee, employeeId: employee?.id ?? null, departmentId: employee?.currentDepartmentId ?? null,
      reportingManagerId: employee?.reportingManagerId ?? null, companyId: ctx.companyId ?? employee?.companyId ?? null,
      locationId: employee?.currentLocationId ?? null, gradeId: employee?.gradeId ?? employee?.grade,
      employeeType: employee?.employmentType, roles: await this.roles(ctx, db) };
  }

  private async employeeUser(db: any, org: number, id: number): Promise<number> {
    const employee = await db('employees').where({ id, organization_id: org }).whereNull('deleted_at').first();
    if (!employee || !['active', 'probation', 'notice'].includes(String(employee.status).toLowerCase())) throw new ValidationError('Workflow approver has no active employee record');
    const users = await db('users').where('organization_id', org).whereNull('deleted_at')
      .where((q: any) => q.where('employee_id', id).orWhere('email', employee.email)).select('id', 'status');
    const active = users.filter((u: any) => !u.status || String(u.status).toLowerCase() === 'active');
    if (active.length !== 1) throw new ValidationError('Workflow approver must have exactly one active user account');
    return Number(active[0].id);
  }

  private async resolveSteps(ctx: TenantContext, db: any, workflow: any, applicant: any) {
    const definitions = await db('workflow_steps').where({ organization_id: ctx.organizationId, workflow_id: workflow.id }).whereNull('deleted_at').orderBy('step_number');
    if (!definitions.length) throw new ValidationError('Workflow has no approval steps');
    const steps: any[] = [];
    for (const d of definitions) {
      const config: any = json(d.resolverConfig);
      const type = config.type || d.approverType;
      let userIds: number[] = [];
      let primaryEmployeeId: number | null = null;
      if (['team_lead', 'reporting_manager', 'reporting_officer', 'manager_chain'].includes(type)) {
        let employee = applicant.employee;
        const depth = type === 'manager_chain' ? Number(config.depth ?? 2) : Number(config.depth ?? 1);
        if (!Number.isInteger(depth) || depth < 1 || depth > 10) throw new ValidationError('Invalid reporting manager depth');
        const visited = new Set<number>([Number(employee?.id)]);
        for (let i = 0; i < depth; i++) {
          if (!employee?.reportingManagerId) throw new ValidationError(`Missing reporting manager for step ${d.stepName}. Set the employee's team lead / reporting chain.`);
          const id = Number(employee.reportingManagerId);
          if (visited.has(id)) throw new ValidationError('Circular reporting manager hierarchy');
          visited.add(id);
          employee = await db('employees').where({ id, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
        }
        primaryEmployeeId = Number(employee?.id);
        userIds = [await this.employeeUser(db, ctx.organizationId, primaryEmployeeId)];
      } else if (type === 'specific_employee') {
        primaryEmployeeId = Number(config.employeeId);
        userIds = [await this.employeeUser(db, ctx.organizationId, primaryEmployeeId)];
      } else if (type === 'specific_user') {
        const user = await db('users').where({ id: d.approverId, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
        if (!user || (user.status && user.status !== 'active')) throw new ValidationError('Configured workflow user is not active');
        userIds = [Number(user.id)];
        primaryEmployeeId = user.employeeId ?? null;
      } else if (type === 'department_head') {
        const department = await db('departments').where({ id: config.departmentId || d.approverDepartmentId || applicant.departmentId, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
        if (!department?.departmentHeadId) throw new ValidationError('Department head is not configured');
        primaryEmployeeId = Number(department.departmentHeadId);
        userIds = [await this.employeeUser(db, ctx.organizationId, primaryEmployeeId)];
      } else if (type === 'user_role' || type === 'role') {
        const role = d.approverRoleId ? await db('roles').where('id', d.approverRoleId).first() : null;
        if (['team_lead', 'manager'].includes(role?.code || config.roleCode)) throw new ValidationError('Team lead and manager steps must use the claimant reporting chain, not a department-wide role group');
        let q = db('user_roles as ur').join('users as u', 'ur.user_id', 'u.id').join('roles as r', 'ur.role_id', 'r.id')
          .where('ur.organization_id', ctx.organizationId).where('u.organization_id', ctx.organizationId).whereNull('u.deleted_at');
        if (d.approverRoleId) q = q.where('r.id', d.approverRoleId);
        else q = q.whereIn('r.code', aliases[config.roleCode] || [config.roleCode]);
        if (config.departmentId) q = q.join('employees as e', 'u.employee_id', 'e.id').where('e.current_department_id', config.departmentId);
        const users = await q.select('u.id', 'u.status');
        userIds = users.filter((u: any) => !u.status || u.status === 'active').map((u: any) => Number(u.id));
      } else throw new ValidationError(`Unsupported approver resolver: ${type}`);
      const explicitlyNamedApprover = type === 'specific_employee' || type === 'specific_user';
      const allowSubmitterApproval = explicitlyNamedApprover
        && applicant.roles.some((role: string) => selfApprovalRoles.includes(role))
        && userIds.map(Number).includes(Number(ctx.userId));
      userIds = [...new Set(userIds)].filter(id => id !== Number(ctx.userId) || allowSubmitterApproval);
      if (!userIds.length) throw new ValidationError(`No independent approver for step ${d.stepName}; self approval is prohibited`);
      let fallback: any = null;
      if (config.fallback === 'primary_manager_when_on_leave') {
        if (userIds.length !== 1 || !primaryEmployeeId) throw new ValidationError('Absence fallback requires one employee approver');
        const employee = await db('employees').where({ id: primaryEmployeeId, organization_id: ctx.organizationId }).first();
        if (!employee?.reportingManagerId) throw new ValidationError('Absent approver fallback manager is not configured');
        const fallbackUserId = await this.employeeUser(db, ctx.organizationId, Number(employee.reportingManagerId));
        if (fallbackUserId === Number(ctx.userId) || userIds.includes(fallbackUserId)) throw new ValidationError('Fallback cannot be the claimant or primary approver');
        fallback = { userId: fallbackUserId, primaryEmployeeId };
      }
      if (!['single_person', 'any_one_person', 'all_people'].includes(d.approvalMode)) throw new ValidationError('Unsupported approval mode; configure a sequential person or group step');
      steps.push({ name: d.stepName, type, userIds, fallback, mode: d.approvalMode || 'single_person',
        finance: config.finance === true || config.roleCode === 'finance', canReturn: config.canReturn !== false,
        allowSubmitterApproval,
        approvedBy: [] });
    }
    return steps;
  }

  private async effectiveAssignees(ctx: TenantContext, db: any, step: any) {
    if (!step) return { ids: [] as number[], absence: null as any };
    if (step.fallback) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const leave = await db('leave_applications').where({ organization_id: ctx.organizationId, employee_id: step.fallback.primaryEmployeeId, status: 'approved' })
        .where('application_start_date', '<=', today).where('application_end_date', '>=', today).whereNull('deleted_at').first();
      // Partial-day leave cannot establish all-day absence.
      if (leave && !leave.isHalfDay && !leave.isHourly && Number(leave.totalDays ?? 1) >= 1) return { ids: [Number(step.fallback.userId)], absence: { leaveId: leave.id, primaryUserIds: step.userIds } };
    }
    return { ids: step.userIds as number[], absence: null as any };
  }

  private async prepare(ctx: TenantContext, db: any, type: ExpenseRequestType, amount: number) {
    const applicant = await this.applicant(ctx, db);
    const allDefinitions = await db('workflows').where({ organization_id: ctx.organizationId, type }).whereNull('deleted_at');
    // A company-bound definition can never route a request submitted in another company.
    const definitions = allDefinitions.filter((w: any) => !w.companyId || Number(w.companyId) === Number(applicant.companyId));
    const workflow = selectWorkflow(definitions, applicant, type, amount);
    if (workflow.approvalPattern !== 'sequential') throw new ValidationError('Expense approvals require a sequential workflow');
    const steps = await this.resolveSteps(ctx, db, workflow, applicant);
    return { applicant, workflow, snapshot: { workflowName: workflow.workflowName, applicant, steps } };
  }

  private async attach(ctx: TenantContext, db: any, type: ExpenseRequestType, id: number, prepared: any) {
    const { applicant, workflow, snapshot } = prepared;
    // Do not retain employee personal data in routing evidence.
    delete snapshot.applicant.employee;
    const [runId] = await db('expense_approval_runs').insert({ organization_id: ctx.organizationId, company_id: applicant.companyId,
      entity_type: type, entity_id: id, workflow_id: workflow.id, workflow_version: workflow.versionNumber || 1,
      submitter_user_id: ctx.userId, employee_id: applicant.employeeId, snapshot: JSON.stringify(snapshot), current_step: 0, status: 'pending' });
    await db(entityTables[type]).where({ id, organization_id: ctx.organizationId }).update({ approval_run_id: runId, workflow_id: workflow.id,
      current_level: 1, current_approver_role: snapshot.steps[0].name, status: snapshot.steps[0].finance ? 'pending_finance' : 'pending_level_1' });
    await this.event(ctx, db, runId, 'submitted', 1, '', { workflowVersion: workflow.versionNumber });
  }

  private async event(ctx: TenantContext, db: any, runId: number, action: string, step: number, comments?: string, details?: any) {
    await db('expense_approval_events').insert({ organization_id: ctx.organizationId, run_id: runId, step_number: step,
      actor_user_id: ctx.userId, action, comments: comments || null, details: JSON.stringify(details || {}) });
  }

  private async policy(ctx: TenantContext, db: any, applicant: any, categoryId: number | null, amount: number, receipt: any, justification: any, context?: { items: any[]; expenseDate: string; excludeId?: number }) {
    const category = categoryId ? await db('expense_categories').where({ id: categoryId, organization_id: ctx.organizationId, is_active: true }).first() : null;
    if (categoryId && !category) throw new ValidationError('Select an active expense category belonging to your organization');
    if (category?.isReceiptMandatory && amount >= Number(category.minAmountForReceipt) && !receipt) throw new ValidationError('Receipt is required for this category');
    const policies = await db('expense_policies').where({ organization_id: ctx.organizationId, is_active: true });
    const violations: string[] = [];
    if (Number(category?.spendingLimit) > 0 && amount > Number(category.spendingLimit)) violations.push('Category spending limit exceeded');
    for (const p of policies) {
      if (p.categoryId && Number(p.categoryId) !== Number(categoryId)) continue;
      if (p.departmentId && Number(p.departmentId) !== Number(applicant.departmentId)) continue;
      if (p.grade && String(p.grade).toLowerCase() !== 'all' && String(p.grade).toLowerCase() !== String(applicant.employee?.grade).toLowerCase()) continue;
      if (p.designation && String(p.designation).toLowerCase() !== 'all') {
        const designation = await db('designations').where({ id: applicant.employee?.currentDesignationId || 0, organization_id: ctx.organizationId }).first();
        if (String(p.designation).toLowerCase() !== String(designation?.name).toLowerCase() && String(p.designation) !== String(designation?.id)) continue;
      }
      if (p.location && String(p.location).toLowerCase() !== 'all') {
        const location = await db('locations').where({ id: applicant.locationId || 0, organization_id: ctx.organizationId }).first();
        if (String(p.location).toLowerCase() !== String(location?.name).toLowerCase() && String(p.location) !== String(location?.id)) continue;
      }
      if (Number(p.requireReceiptAbove) > 0 && amount > Number(p.requireReceiptAbove) && !receipt) throw new ValidationError('Receipt is required by expense policy');
      const applicableItems = context?.items.filter(it => !p.categoryId || Number(it.categoryId) === Number(p.categoryId));
      const claimAmount = applicableItems ? applicableItems.reduce((sum, it) => sum + money(it.claimedAmount), 0) : amount;
      if (Number(p.maxLimitPerClaim) > 0 && claimAmount > Number(p.maxLimitPerClaim)) {
        if (!p.allowException) throw new ValidationError(`Policy limit exceeded: ${p.policyName}`);
        violations.push(`Policy limit exceeded: ${p.policyName}`);
      }
      if (context && Number(p.maxLimitPerMonth) > 0) {
        const month = context.expenseDate.slice(0, 7);
        let spent = db('expense_claim_items as i').join('expense_claims as c', 'c.id', 'i.claim_id')
          .where('c.organization_id', ctx.organizationId).where('c.submitted_by_user_id', ctx.userId)
          .whereNotIn('c.status', ['draft', 'rejected', 'returned']).where('i.expense_date', '>=', `${month}-01`).whereRaw("DATE_FORMAT(i.expense_date, '%Y-%m') = ?", [month]);
        if (context.excludeId) spent = spent.whereNot('c.id', context.excludeId);
        if (p.categoryId) spent = spent.where('i.category_id', p.categoryId);
        const used = await spent.sum({ amount: 'i.claimed_amount' }).first();
        const proposed = (applicableItems || []).filter(it => String(it.expenseDate || context.expenseDate).slice(0, 7) === month).reduce((sum, it) => sum + money(it.claimedAmount), 0);
        if (Number(used?.amount || 0) + proposed > Number(p.maxLimitPerMonth)) {
          if (!p.allowException) throw new ValidationError(`Monthly policy limit exceeded: ${p.policyName}`);
          violations.push(`Monthly policy limit exceeded: ${p.policyName}`);
        }
      }
    }
    if (violations.length && !String(justification || '').trim()) throw new ValidationError('Justification is required for policy exceptions');
    return { policy_validated: violations.length === 0, policy_violations: violations.length ? JSON.stringify(violations) : null };
  }

  private async save(ctx: TenantContext, type: ExpenseRequestType, input: any, id?: number): Promise<any> {
    const db = getKnex();
    const config = await ExpenseConfigService.load(ctx.organizationId, db);
    const number = !id && type !== 'mileage_claim' ? await ExpenseConfigService.nextNumber(ctx.organizationId, type === 'expense_claim' ? 'claim' : type,
      `${type === 'expense_claim' ? config.claimNumberPrefix : type === 'travel_request' ? config.travelRequestNumberPrefix : config.travelAdvanceNumberPrefix}-${ctx.organizationId}`, config.numberSequenceDigits) : undefined;
    const savedId = await db.transaction(async trx => {
      // Serialize submissions for the same claimant so monthly limits cannot be
      // exceeded by two concurrent requests reading the same previous balance.
      await trx('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).forUpdate().first();
      const existing = id ? await trx(entityTables[type]).where({ id, organization_id: ctx.organizationId }).forUpdate().first() : null;
      if (id && (!existing || Number(existing.submittedByUserId) !== Number(ctx.userId) || !['draft', 'returned'].includes(existing.status))) throw new ValidationError('Only the claimant can edit a draft or returned request');
      const applicant = await this.applicant(ctx, trx);
      const isDraft = type === 'expense_claim' && Boolean(input.isDraft);
      const base: any = { submitted_by_user_id: ctx.userId, employee_id: applicant.employeeId, company_id: applicant.companyId, submitted_by_role: applicant.roles[0] || 'employee', updated_at: new Date() };
      let amount = 0;
      let items: any[] = [];
      if (type === 'expense_claim') {
        if (String(input.title || '').trim().length < 3) throw new ValidationError('Expense title must contain at least 3 characters');
        const claimDate = date(input.claimDate);
        if (claimDate >= new Date().toISOString().slice(0, 10)) throw new ValidationError('Expense date must be a previous date');
        const rawItems = input.items?.length ? input.items : [{ categoryId: input.categoryId, claimedAmount: input.amount, expenseDate: claimDate, receiptUrl: input.receiptUrl }];
        for (const it of rawItems) {
          const value = money(it.claimedAmount);
          const expenseDate = date(it.expenseDate || claimDate);
          if (expenseDate >= new Date().toISOString().slice(0, 10)) throw new ValidationError('Expense item date must be a previous date');
          if (!it.categoryId) throw new ValidationError('Category is required');
          const policy = await this.policy(ctx, trx, applicant, Number(it.categoryId), value, it.receiptUrl || input.receiptUrl, it.employeeJustification, { items: rawItems, expenseDate, excludeId: id });
          items.push({ category_id: it.categoryId, expense_date: expenseDate, claimed_amount: value, approved_amount: 0, rejected_amount: 0,
            receipt_url: it.receiptUrl || input.receiptUrl || null, merchant_name: it.merchantName || null, description: it.description || null,
            receipt_file_name: it.receiptFileName || null, receipt_file_type: it.receiptFileType || null, receipt_file_size: it.receiptFileSize || null,
            project_cost_center: it.projectCostCenter || null, employee_justification: it.employeeJustification || null, ...policy, status: isDraft ? 'draft' : 'pending' });
          amount += value;
        }
        amount = money(amount);
        Object.assign(base, { title: input.title.trim(), claim_date: claimDate, category_id: items[0].category_id, total_claimed_amount: amount,
          total_approved_amount: 0, total_rejected_amount: 0, description: input.description || null, payment_method: input.paymentMethod || config.defaultPaymentMethod,
          receipt_url: input.receiptUrl || items[0].receipt_url, merchant_name: input.merchantName || items[0].merchant_name,
          project_cost_center: input.projectCostCenter || null, travel_request_id: input.travelRequestId || null, travel_advance_id: input.travelAdvanceId || null,
          submitted_at: isDraft ? null : new Date(), return_comments: null, rejection_reason: null });
      } else if (type === 'travel_request') {
        if (!String(input.fromLocation || '').trim() || !String(input.toLocation || '').trim() || !String(input.purpose || '').trim()) throw new ValidationError('Travel locations and purpose are required');
        const start = date(input.startDate), end = date(input.endDate);
        if (end < start) throw new ValidationError('Travel end date cannot be before start date');
        amount = money(input.estimatedBudget, true);
        Object.assign(base, { from_location: input.fromLocation, to_location: input.toLocation, purpose: input.purpose, start_date: start, end_date: end, estimated_budget: amount });
      } else if (type === 'travel_advance') {
        amount = money(input.advanceAmount);
        if (!String(input.purpose || '').trim()) throw new ValidationError('Advance purpose is required');
        Object.assign(base, { travel_request_id: input.travelRequestId || null, advance_amount: amount, approved_amount: 0, settled_amount: 0, balance_amount: 0, purpose: input.purpose });
      } else {
        if (!['car', 'bike'].includes(input.vehicleType) || !input.fromLocation || !input.toLocation) throw new ValidationError('Valid vehicle and trip locations are required');
        const rateRow = applicant.employee?.currentDesignationId ? await trx('expense_mileage_designation_rates').where({ organization_id: ctx.organizationId, designation_id: applicant.employee.currentDesignationId }).first() : null;
        const rate = money(input.vehicleType === 'bike' ? rateRow?.rateBike ?? config.mileageRateBike : rateRow?.rateCar ?? config.mileageRateCar);
        const distance = money(input.distanceKm);
        amount = money(distance * rate);
        Object.assign(base, { trip_date: date(input.tripDate), from_location: input.fromLocation, to_location: input.toLocation, vehicle_type: input.vehicleType, distance_km: distance, rate_per_km: rate, calculated_amount: amount, purpose: input.purpose || null });
      }
      for (const [field, table] of [['travelRequestId', 'travel_requests'], ['travelAdvanceId', 'travel_advances']]) {
        if (input[field]) {
          const linked = await trx(table).where({ id: input[field], organization_id: ctx.organizationId, submitted_by_user_id: ctx.userId }).first();
          if (!linked || (field === 'travelRequestId' ? linked.status !== 'approved' : linked.status !== 'disbursed')) throw new ValidationError('Linked travel must belong to you and be approved; linked advances must be disbursed');
        }
      }
      const prepared = isDraft ? null : await this.prepare(ctx, trx, type, amount);
      if (!id) {
        Object.assign(base, { uuid: uuid(), organization_id: ctx.organizationId, status: 'draft' });
        if (number) base[type === 'expense_claim' ? 'claim_number' : type === 'travel_request' ? 'request_number' : 'advance_number'] = number;
        [id] = await trx(entityTables[type]).insert(base);
      } else {
        await trx(entityTables[type]).where({ id, organization_id: ctx.organizationId }).update({ ...base, status: 'draft', approval_run_id: null });
      }
      if (type === 'expense_claim') {
        await trx('expense_claim_items').where('claim_id', id).delete();
        await trx('expense_claim_items').insert(items.map(it => ({ ...it, claim_id: id })));
      }
      if (prepared) await this.attach(ctx, trx, type, Number(id), prepared);
      return Number(id);
    });
    return this.detail(ctx, type, savedId);
  }

  async createClaim(ctx: TenantContext, input: ClaimInput) { return this.save(ctx, 'expense_claim', input); }
  async updateClaim(ctx: TenantContext, id: number, input: ClaimInput) { return this.save(ctx, 'expense_claim', input, id); }
  async createTravelRequest(ctx: TenantContext, input: any) { return this.save(ctx, 'travel_request', input); }
  async updateTravelRequest(ctx: TenantContext, id: number, input: any) { return this.save(ctx, 'travel_request', input, id); }
  async createTravelAdvance(ctx: TenantContext, input: any) { return this.save(ctx, 'travel_advance', input); }
  async createMileageClaim(ctx: TenantContext, input: any) { return this.save(ctx, 'mileage_claim', input); }

  private async decorate(ctx: TenantContext, db: any, type: ExpenseRequestType, row: any) {
    const run = row.approvalRunId ? await db('expense_approval_runs').where({ id: row.approvalRunId, organization_id: ctx.organizationId }).first() : null;
    const snapshot: any = run ? json(run.snapshot) : {};
    const step = snapshot.steps?.[run?.currentStep];
    const effective = run?.status === 'pending' ? await this.effectiveAssignees(ctx, db, step) : { ids: [], absence: null };
    const own = Number(row.submittedByUserId) === Number(ctx.userId);
    const currentRoles = own && step?.allowSubmitterApproval ? await this.roles(ctx, db) : [];
    const permittedSelfApproval = own && step?.allowSubmitterApproval && currentRoles.some(role => selfApprovalRoles.includes(role));
    const canApprove = (!own || permittedSelfApproval) && run?.status === 'pending' && effective.ids.includes(Number(ctx.userId)) && !step?.approvedBy?.includes(Number(ctx.userId));
    const applicant = row.employeeId ? await db('employees').where({ id: row.employeeId, organization_id: ctx.organizationId }).first() : null;
    const user = await db('users').where({ id: row.submittedByUserId || 0, organization_id: ctx.organizationId }).first();
    const dept = snapshot.applicant?.departmentId || applicant?.currentDepartmentId;
    const department = dept ? await db('departments').where({ id: dept, organization_id: ctx.organizationId }).first() : null;
    const currentApprovers = effective.ids.length ? await db('users').where('organization_id', ctx.organizationId).whereIn('id', effective.ids).select('id', 'first_name', 'last_name') : [];
    return { ...row, entityType: type, firstName: applicant?.firstName || user?.firstName, lastName: applicant?.lastName || user?.lastName,
      employeeCode: applicant?.employeeCode, departmentName: department?.name, departmentId: dept,
      canApprove: Boolean(canApprove), canReject: Boolean(canApprove && !own), canReturn: Boolean(canApprove && !own && step.canReturn), canEdit: own && ['draft', 'returned'].includes(row.status), currentStepFinance: Boolean(step?.finance),
      selfApprovalStep: Boolean(canApprove && own),
      requiresAbsenceReason: Boolean(canApprove && effective.absence), currentApprovers, workflowName: snapshot.workflowName,
      workflowVersion: run?.workflowVersion, currentApproverRole: run?.status === 'pending' ? step?.name : row.currentApproverRole,
      needsWorkflowMigration: !run && !['draft', 'paid', 'reimbursed', 'disbursed', 'settled', 'rejected'].includes(row.status), _run: run, _own: own };
  }

  private publicRow(row: any) { const { _run, _own, ...rest } = row; return rest; }

  private async detail(ctx: TenantContext, type: ExpenseRequestType, id: number, reportAccess = false): Promise<any> {
    const db = getKnex();
    const row = await db(entityTables[type]).where({ id, organization_id: ctx.organizationId }).first();
    if (!row) throw new ValidationError('Request not found');
    const result = await this.decorate(ctx, db, type, row);
    if (ctx.companyId && (result._run?.companyId || row.companyId) && Number(result._run?.companyId || row.companyId) !== Number(ctx.companyId)) throw new ValidationError('Request not found');
    if (!reportAccess && !result._own && !result.canApprove) throw new ValidationError('Request not found or not assigned to you');
    if (reportAccess) await this.assertAccess(ctx, 'reports', db);
    if (type === 'expense_claim') result.items = await db('expense_claim_items').where('claim_id', id);
    if (result._run) result.timeline = await db('expense_approval_events as a').leftJoin('users as u', 'a.actor_user_id', 'u.id')
      .where('a.organization_id', ctx.organizationId).where('a.run_id', result._run.id).orderBy('a.id').select('a.*', 'u.first_name as approver_name');
    return this.publicRow(result);
  }

  private async list(ctx: TenantContext, type: ExpenseRequestType, params: any = {}) {
    const db = getKnex();
    const rows = await db(entityTables[type]).where('organization_id', ctx.organizationId).orderBy('created_at', 'desc');
    const output: any[] = [];
    const paymentQueue = params.mode === 'payments';
    if (paymentQueue) await this.assertAccess(ctx, 'pay', db);
    for (const row of rows) {
      const value = await this.decorate(ctx, db, type, row);
      if (ctx.companyId && (value._run?.companyId || row.companyId) && Number(value._run?.companyId || row.companyId) !== Number(ctx.companyId)) continue;
      const inbox = params.mode === 'approvals' || params.status === 'pending_approvals';
      if (params.mode === 'my_expenses' || params.mode === 'my') { if (!value._own) continue; }
      else if (paymentQueue) { if (value._run?.status !== 'approved' || row.status !== 'payment_pending') continue; }
      else if (inbox) { if (!value.canApprove) continue; }
      else if (!value._own && !value.canApprove) continue;
      // A requested employee filter can only narrow access, never broaden it.
      if (params.employeeId && Number(params.employeeId) !== Number(row.employeeId)) continue;
      if (params.departmentId && Number(params.departmentId) !== Number(value.departmentId)) continue;
      if (params.status && !['all', 'pending_approvals', 'pending_manager'].includes(params.status) && row.status !== params.status) continue;
      if (params.search && !`${value.firstName} ${value.lastName} ${row.title || row.purpose || ''} ${row.claimNumber || row.requestNumber || row.advanceNumber || ''}`.toLowerCase().includes(String(params.search).toLowerCase())) continue;
      output.push(this.publicRow(value));
    }
    return output;
  }

  async getClaims(ctx: TenantContext, params: any = {}) {
    const claims = await this.list(ctx, 'expense_claim', params);
    if (params.mode === 'my_expenses') return claims;
    for (const type of ['travel_request', 'travel_advance', 'mileage_claim'] as ExpenseRequestType[]) {
      for (const row of await this.list(ctx, type, params)) claims.push({ ...row, id: `${type === 'travel_request' ? 'tr' : type === 'travel_advance' ? 'ta' : 'mc'}_${row.id}`,
        claimNumber: row.requestNumber || row.advanceNumber || `Mileage-${row.id}`, title: row.purpose || `${row.fromLocation} → ${row.toLocation}`,
        claimDate: row.tripDate || row.startDate || row.createdAt, totalClaimedAmount: Number(row.estimatedBudget ?? row.advanceAmount ?? row.calculatedAmount),
        totalApprovedAmount: Number(row.approvedAmount ?? row.calculatedAmount ?? row.estimatedBudget ?? 0), items: [] });
    }
    return claims;
  }
  private reference(id: number | string): { type: ExpenseRequestType; id: number } {
    const match = /^(tr|ta|mc)_(\d+)$/.exec(String(id));
    const number = Number(match ? match[2] : id);
    if (!Number.isSafeInteger(number) || number < 1) throw new ValidationError('Invalid request identifier');
    return { type: match ? ({ tr: 'travel_request', ta: 'travel_advance', mc: 'mileage_claim' } as const)[match[1]] : 'expense_claim', id: number };
  }
  async getClaimById(ctx: TenantContext, id: number | string) {
    const ref = this.reference(id);
    const row = await this.detail(ctx, ref.type, ref.id);
    return { ...row, id, claimNumber: row.claimNumber || row.requestNumber || row.advanceNumber || `Mileage-${row.id}`, totalClaimedAmount: Number(row.totalClaimedAmount ?? row.estimatedBudget ?? row.advanceAmount ?? row.calculatedAmount) };
  }
  async getTravelRequests(ctx: TenantContext, employeeId?: number, filters: any = {}) { return this.list(ctx, 'travel_request', { ...filters, employeeId }); }
  async getTravelAdvances(ctx: TenantContext, employeeId?: number, filters: any = {}) { return this.list(ctx, 'travel_advance', { ...filters, employeeId }); }
  async getMileageClaims(ctx: TenantContext, employeeId?: number) { return this.list(ctx, 'mileage_claim', { employeeId }); }

  async resubmitLegacy(ctx: TenantContext, reference: string) {
    const ref = this.reference(reference);
    await getKnex().transaction(async trx => {
      const row = await trx(entityTables[ref.type]).where({ id: ref.id, organization_id: ctx.organizationId }).forUpdate().first();
      if (!row || Number(row.submittedByUserId) !== Number(ctx.userId)) throw new ValidationError('Only the original submitting user may resubmit this request');
      if (row.approvalRunId || ['paid', 'reimbursed', 'disbursed', 'settled', 'rejected', 'draft'].includes(row.status)) throw new ValidationError('This request is not eligible for legacy resubmission');
      if (ctx.companyId && row.companyId && Number(ctx.companyId) !== Number(row.companyId)) throw new ValidationError('Request not found');
      const amount = money(row.totalClaimedAmount ?? row.estimatedBudget ?? row.advanceAmount ?? row.calculatedAmount, ref.type === 'travel_request');
      const prepared = await this.prepare(ctx, trx, ref.type, amount);
      if (ref.type === 'expense_claim') {
        const items = await trx('expense_claim_items').where('claim_id', ref.id);
        if (!items.length) throw new ValidationError('Legacy claim has no expense lines; correct it before resubmission');
        for (const item of items) await this.policy(ctx, trx, prepared.applicant, item.categoryId, Number(item.claimedAmount), item.receiptUrl, item.employeeJustification);
        await trx('expense_claim_items').where('claim_id', ref.id).update({ approved_amount: 0, rejected_amount: 0, status: 'pending' });
        await trx('expense_claims').where('id', ref.id).update({ total_approved_amount: 0, total_rejected_amount: 0, approved_at: null, rejection_reason: null });
      }
      await this.attach(ctx, trx, ref.type, ref.id, prepared);
    });
    return this.detail(ctx, ref.type, ref.id);
  }

  async decide(ctx: TenantContext, type: ExpenseRequestType, id: number, action: 'approve' | 'reject' | 'return', body: any = {}) {
    const db = getKnex();
    const result = await db.transaction(async trx => {
      const row = await trx(entityTables[type]).where({ id, organization_id: ctx.organizationId }).forUpdate().first();
      if (!row?.approvalRunId) throw new ValidationError('This legacy request must be reviewed and resubmitted into a published workflow');
      const run = await trx('expense_approval_runs').where({ id: row.approvalRunId, organization_id: ctx.organizationId }).forUpdate().first();
      if (!run || (ctx.companyId && run.companyId && Number(run.companyId) !== Number(ctx.companyId))) throw new ValidationError('Request not found');
      const snapshot: any = json(run.snapshot);
      const step = snapshot.steps[run.currentStep];
      const effective = await this.effectiveAssignees(ctx, trx, step);
      const actor = await trx('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).whereNull('deleted_at').first();
      if (!actor || (actor.status && actor.status !== 'active')) throw new ValidationError('Approver account is inactive');
      const own = Number(run.submitterUserId) === Number(ctx.userId);
      const currentRoles = own ? await this.roles(ctx, trx) : [];
      const permittedSelfApproval = action === 'approve' && step.allowSubmitterApproval === true
        && currentRoles.some(role => selfApprovalRoles.includes(role));
      assertStepActor(run, ctx.userId, effective.ids, { allowSelfApproval: permittedSelfApproval });
      if (step.approvedBy.includes(Number(ctx.userId))) throw new ValidationError('You have already approved this step');
      const comments = String(body.comments || body.reason || '').trim();
      if ((action !== 'approve' || effective.absence) && !comments) throw new ValidationError('A reason is required');
      if (action === 'return' && !step.canReturn) throw new ValidationError('This workflow step does not permit return');
      if (action === 'return' && !['expense_claim', 'travel_request'].includes(type)) throw new ValidationError('Return is supported for expense claims and travel requests');
      if (body.items?.length && (!step.finance || type !== 'expense_claim')) throw new ValidationError('Only the assigned finance step can adjust line items');
      if (body.approvedAmount !== undefined && !step.finance) throw new ValidationError('Only the assigned finance step can adjust the approved amount');
      if (action === 'approve' && step.finance && type === 'expense_claim') {
        const items = await trx('expense_claim_items').where('claim_id', id);
        const updates = new Map<number, any>();
        for (const item of body.items || []) {
          if (updates.has(Number(item.id)) || !items.some((i: any) => Number(i.id) === Number(item.id))) throw new ValidationError('Invalid or duplicate claim line item');
          updates.set(Number(item.id), item);
        }
        let approved = 0;
        for (const item of items) {
          const update = updates.get(Number(item.id));
          const value = update ? money(update.approvedAmount, true) : Number(snapshot.financeApprovedAmount !== undefined ? item.approvedAmount : item.claimedAmount);
          if (value > Number(item.claimedAmount)) throw new ValidationError('Approved amount exceeds claimed amount');
          if (value !== Number(item.claimedAmount) && !String(update?.adjustmentReason || item.adjustmentReason || '').trim()) throw new ValidationError('Adjustment reason required');
          approved += value;
          await trx('expense_claim_items').where({ id: item.id, claim_id: id }).update({ approved_amount: value, rejected_amount: money(Number(item.claimedAmount) - value, true), adjustment_reason: update?.adjustmentReason || item.adjustmentReason || null });
        }
        await trx('expense_claims').where({ id, organization_id: ctx.organizationId }).update({ total_approved_amount: approved, total_rejected_amount: money(Number(row.totalClaimedAmount) - approved, true) });
        snapshot.financeApprovedAmount = approved;
      }
      if (action === 'approve' && step.finance && type === 'travel_advance') {
        const value = body.approvedAmount === undefined ? Number(row.advanceAmount) : money(body.approvedAmount, true);
        if (value > Number(row.advanceAmount)) throw new ValidationError('Approved advance cannot exceed requested amount');
        snapshot.financeApprovedAmount = value;
      }
      if (action === 'approve') step.approvedBy.push(Number(ctx.userId));
      const finishedStep = action === 'approve' && (step.mode !== 'all_people' || effective.ids.every(id => step.approvedBy.includes(id)));
      const next = finishedStep ? Number(run.currentStep) + 1 : Number(run.currentStep);
      const finished = action === 'approve' && next === snapshot.steps.length;
      const runStatus = action === 'reject' ? 'rejected' : action === 'return' ? 'returned' : finished ? 'approved' : 'pending';
      const nextStep = snapshot.steps[next];
      const status = runStatus === 'pending' ? (nextStep.finance ? 'pending_finance' : `pending_level_${next + 1}`) : finished ? (type === 'travel_request' ? 'approved' : 'payment_pending') : runStatus;
      await trx('expense_approval_runs').where({ id: run.id, organization_id: ctx.organizationId }).update({ snapshot: JSON.stringify(snapshot), status: runStatus, current_step: next, updated_at: new Date() });
      const update: any = { status, current_level: finished ? null : next + 1, current_approver_role: finished ? 'Approved for payment' : nextStep?.name || status, updated_at: new Date() };
      if (action === 'reject') update.rejection_reason = comments;
      if (action === 'return' && type === 'expense_claim') update.return_comments = comments;
      if (finished && type === 'expense_claim') {
        update.total_approved_amount = snapshot.financeApprovedAmount ?? Number(row.totalClaimedAmount); update.approved_at = new Date();
        if (snapshot.financeApprovedAmount === undefined) await trx('expense_claim_items').where('claim_id', id).update({ approved_amount: trx.ref('claimed_amount'), rejected_amount: 0, status: 'approved' });
        else await trx('expense_claim_items').where('claim_id', id).update({ status: 'approved' });
      }
      if (finished && type === 'travel_advance') update.approved_amount = snapshot.financeApprovedAmount ?? Number(row.advanceAmount);
      await trx(entityTables[type]).where({ id, organization_id: ctx.organizationId }).update(update);
      await this.event(ctx, trx, run.id, action, Number(run.currentStep) + 1, comments, { absence: effective.absence, primaryUserIds: step.userIds, finishedStep, selfApproval: own && permittedSelfApproval });
      return { status, nextStepName: finished ? 'Approved' : nextStep?.name || status, isFinalStep: finished, message: finished ? 'All workflow steps completed' : action === 'approve' ? 'Approval recorded' : `Request ${runStatus}` };
    });
    return result;
  }

  async approveClaimByManager(ctx: TenantContext, id: number | string, comments?: string, options?: any): Promise<any> {
    if (options?.isAbsenteeOverride) throw new ValidationError('Absence fallback is resolved from the workflow and approved leave automatically');
    const ref = this.reference(id); return this.decide(ctx, ref.type, ref.id, 'approve', { comments });
  }
  async verifyAndApproveByFinance(ctx: TenantContext, id: number | string, body: any): Promise<any> {
    const ref = this.reference(id);
    // This endpoint cannot confer finance or approval authority; decide checks the actual assignment.
    return this.decide(ctx, ref.type, ref.id, 'approve', body);
  }
  async rejectClaim(ctx: TenantContext, id: number | string, reason: string): Promise<any> { const ref = this.reference(id); return this.decide(ctx, ref.type, ref.id, 'reject', { reason }); }
  async returnClaimForCorrection(ctx: TenantContext, id: number | string, comments: string): Promise<any> { const ref = this.reference(id); return this.decide(ctx, ref.type, ref.id, 'return', { comments }); }
  async updateTravelRequestStatus(ctx: TenantContext, id: number, action: string, notes?: string): Promise<any> {
    const mapped = ({ approve: 'approve', approved: 'approve', rejected: 'reject', returned: 'return' } as const)[action];
    if (!mapped) throw new ValidationError('Invalid travel workflow action');
    return this.decide(ctx, 'travel_request', id, mapped, { comments: notes });
  }
  async approveTravelAdvance(ctx: TenantContext, id: number, data: any): Promise<any> { return this.decide(ctx, 'travel_advance', id, 'approve', data); }
  async rejectTravelAdvance(ctx: TenantContext, id: number, reason: string): Promise<any> { return this.decide(ctx, 'travel_advance', id, 'reject', { reason }); }
  async approveMileageClaim(ctx: TenantContext, id: number, comments?: string): Promise<any> { return this.decide(ctx, 'mileage_claim', id, 'approve', { comments }); }
  async rejectMileageClaim(ctx: TenantContext, id: number, reason: string): Promise<any> { return this.decide(ctx, 'mileage_claim', id, 'reject', { reason }); }
  async bulkApproveClaims(ctx: TenantContext, ids: (number | string)[], comments?: string) {
    const approved: (number | string)[] = [], failed: { id: number | string; message: string }[] = [];
    for (const id of [...new Set(ids)]) { try { await this.approveClaimByManager(ctx, id, comments); approved.push(id); } catch (e: any) { failed.push({ id, message: e.message }); } }
    return { approved, failed };
  }

  async processReimbursement(ctx: TenantContext, id: number | string, body: any): Promise<any> {
    const ref = this.reference(id);
    if (ref.type === 'travel_request') throw new ValidationError('Travel authorization is not a payable claim');
    return getKnex().transaction(async trx => {
      await this.assertAccess(ctx, 'pay', trx);
      const row = await trx(entityTables[ref.type]).where({ id: ref.id, organization_id: ctx.organizationId }).forUpdate().first();
      if (!row?.approvalRunId || row.status !== 'payment_pending') throw new ValidationError('Payment requires a fully approved, unpaid workflow');
      const run = await trx('expense_approval_runs').where({ id: row.approvalRunId, organization_id: ctx.organizationId, status: 'approved' }).forUpdate().first();
      if (!run || (ctx.companyId && run.companyId && Number(run.companyId) !== Number(ctx.companyId))) throw new ValidationError('Approved workflow not found');
      if (Number(run.submitterUserId) === Number(ctx.userId)) throw new ValidationError('You cannot disburse your own request');
      const approved = money(row.totalApprovedAmount ?? row.approvedAmount ?? row.calculatedAmount, true);
      const advance = ref.type === 'expense_claim' && row.travelAdvanceId ? await trx('travel_advances').where({ id: row.travelAdvanceId, organization_id: ctx.organizationId, submitted_by_user_id: run.submitterUserId }).forUpdate().first() : null;
      if (row.travelAdvanceId && (!advance || !['disbursed', 'settled'].includes(advance.status))) throw new ValidationError('Linked advance is not available for settlement');
      const advanceApplied = advance ? money(Math.min(approved, Number(advance.balanceAmount)), true) : 0;
      const amount = money(body.paidAmount, true);
      if (amount !== money(approved - advanceApplied, true)) throw new ValidationError('Payment must equal the approved amount less the available linked advance. Refresh the payment report.');
      const reference = String(body.paymentReference || '').trim();
      if (!reference || reference.length > 100) throw new ValidationError('A payment or settlement reference of 1–100 characters is required');
      if (!['bank_transfer', 'cash', 'payroll', 'online'].includes(body.paymentMethod)) throw new ValidationError('Invalid payment method');
      const config = await ExpenseConfigService.load(ctx.organizationId, trx);
      if (date(body.paymentDate) > new Date().toISOString().slice(0, 10)) throw new ValidationError('Payment date cannot be in the future');
      await trx('expense_payments').insert({ organization_id: ctx.organizationId, run_id: run.id, paid_by_user_id: ctx.userId, amount, advance_applied: advanceApplied,
        currency: config.currencyCode, payment_date: date(body.paymentDate), method: body.paymentMethod, reference });
      const update: any = { status: ref.type === 'travel_advance' ? 'disbursed' : 'paid', updated_at: new Date() };
      if (ref.type === 'expense_claim') Object.assign(update, { paid_amount: amount, payment_date: body.paymentDate, payment_method: body.paymentMethod, payment_reference: reference, reimbursed_at: new Date() });
      if (ref.type === 'travel_advance') Object.assign(update, { disbursed_at: new Date(), balance_amount: amount });
      if (advance && advanceApplied > 0) await trx('travel_advances').where({ id: advance.id, organization_id: ctx.organizationId }).update({
        settled_amount: money(Number(advance.settledAmount) + advanceApplied, true), balance_amount: money(Number(advance.balanceAmount) - advanceApplied, true),
        status: Number(advance.balanceAmount) === advanceApplied ? 'settled' : 'disbursed', updated_at: new Date(),
      });
      await trx(entityTables[ref.type]).where({ id: ref.id, organization_id: ctx.organizationId }).update(update);
      await this.event(ctx, trx, run.id, 'disbursed', run.currentStep, reference, { amount, advanceApplied, method: body.paymentMethod });
      return { status: update.status, message: 'Payment recorded', paidAmount: amount };
    });
  }

  async getPaymentCycle(ctx: TenantContext, filters: any = {}) {
    const db = getKnex();
    await this.assertAccess(ctx, 'reports', db);
    let query = db('expense_approval_runs as r').leftJoin('expense_payments as p', 'p.run_id', 'r.id')
      .join('users as u', 'u.id', 'r.submitter_user_id').leftJoin('users as payer', 'payer.id', 'p.paid_by_user_id')
      .where('r.organization_id', ctx.organizationId).where('r.status', 'approved').whereNot('r.entity_type', 'travel_request')
      .select('r.*', 'p.amount as paid_amount', 'p.advance_applied', 'p.currency', 'p.payment_date', 'p.method', 'p.reference', 'p.paid_by_user_id', 'payer.first_name as paid_by_name', 'u.first_name', 'u.last_name');
    if (ctx.companyId) query = query.where('r.company_id', ctx.companyId);
    if (filters.startDate) query = query.where('p.payment_date', '>=', date(filters.startDate));
    if (filters.endDate) query = query.where('p.payment_date', '<=', date(filters.endDate));
    if (filters.status === 'paid') query = query.whereNotNull('p.id');
    if (filters.status === 'payment_pending') query = query.whereNull('p.id');
    const rows = await query.orderBy('r.updated_at', 'desc');
    const roles = await this.roles(ctx, db);
    const result = [];
    for (const row of rows) {
      const entity = await db(entityTables[row.entityType as ExpenseRequestType]).where({ id: row.entityId, organization_id: ctx.organizationId }).first();
      if (!entity || Number(entity.approvalRunId) !== Number(row.id)) continue;
      const snapshot: any = json(row.snapshot);
      const gross = Number(entity.totalApprovedAmount ?? entity.approvedAmount ?? entity.calculatedAmount);
      const advance = row.entityType === 'expense_claim' && entity.travelAdvanceId ? await db('travel_advances').where({ id: entity.travelAdvanceId, organization_id: ctx.organizationId, submitted_by_user_id: row.submitterUserId }).first() : null;
      const advanceApplied = row.paymentDate ? Number(row.advanceApplied || 0) : Math.min(gross, Number(advance?.balanceAmount || 0));
      result.push({ id: row.id, requestId: `${row.entityType === 'expense_claim' ? '' : row.entityType === 'travel_advance' ? 'ta_' : 'mc_'}${row.entityId}`,
        entityType: row.entityType, requestNumber: entity.claimNumber || entity.advanceNumber || `Mileage-${row.entityId}`,
        employeeName: `${row.firstName || ''} ${row.lastName || ''}`.trim(), departmentId: snapshot.applicant?.departmentId,
        workflowName: snapshot.workflowName, workflowVersion: row.workflowVersion, approvedAt: row.updatedAt,
        approvedAmount: gross, advanceApplied, payableAmount: money(gross - advanceApplied, true), paidAmount: Number(row.paidAmount || 0),
        paymentDate: row.paymentDate, paymentReference: row.reference, paymentMethod: row.method, currency: row.currency,
        paidBy: row.paidByName, status: row.paymentDate ? 'paid' : 'payment_pending',
        canDisburse: !row.paymentDate && Number(row.submitterUserId) !== Number(ctx.userId) && roles.some(r => financeRoles.includes(r)) });
    }
    // Historical payments remain visible, but never gain workflow approval or
    // disbursement authority retroactively. Unknown payer details stay unknown.
    if (filters.status !== 'payment_pending') for (const type of ['expense_claim', 'travel_advance', 'mileage_claim'] as ExpenseRequestType[]) {
      let query = db(entityTables[type]).where('organization_id', ctx.organizationId).whereNull('approval_run_id').whereIn('status', ['paid', 'reimbursed', 'disbursed', 'settled']);
      if (ctx.companyId) query = query.where('company_id', ctx.companyId);
      for (const entity of await query) {
        const paidDate = String(entity.paymentDate || entity.disbursedAt || entity.reimbursedAt || '').slice(0, 10);
        if (filters.startDate && (!paidDate || paidDate < filters.startDate)) continue;
        if (filters.endDate && (!paidDate || paidDate > filters.endDate)) continue;
        const user = entity.submittedByUserId ? await db('users').where({ id: entity.submittedByUserId, organization_id: ctx.organizationId }).first() : null;
        const employee = entity.employeeId ? await db('employees').where({ id: entity.employeeId, organization_id: ctx.organizationId }).first() : null;
        const amount = Number(entity.totalApprovedAmount ?? entity.approvedAmount ?? entity.calculatedAmount ?? 0);
        result.push({ id: `legacy_${type}_${entity.id}`, requestId: `${type === 'expense_claim' ? '' : type === 'travel_advance' ? 'ta_' : 'mc_'}${entity.id}`, entityType: type,
          requestNumber: entity.claimNumber || entity.advanceNumber || `Mileage-${entity.id}`, employeeName: `${user?.firstName || employee?.firstName || ''} ${user?.lastName || employee?.lastName || ''}`.trim(),
          workflowName: 'Legacy record (no saved workflow)', workflowVersion: null, approvedAmount: amount, paidAmount: Number(entity.paidAmount ?? entity.approvedAmount ?? entity.calculatedAmount ?? 0),
          payableAmount: 0, advanceApplied: 0, paymentDate: paidDate || null, paymentReference: entity.paymentReference || null, paymentMethod: entity.paymentMethod || null,
          paidBy: 'Not recorded in legacy payment ledger', status: 'paid', canDisburse: false, legacy: true });
      }
    }
    return result;
  }

  async getDashboardSummary(ctx: TenantContext): Promise<any> {
    const mine = await this.list(ctx, 'expense_claim', { mode: 'my' });
    const sum = (rows: any[], key: string) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);
    const approved = mine.filter(r => ['approved', 'payment_pending', 'paid', 'reimbursed'].includes(r.status));
    return { kpis: { totalExpenses: sum(mine, 'totalClaimedAmount'), pendingApproval: mine.filter(r => pending(r.status)).length,
      approvedExpenses: sum(approved, 'totalApprovedAmount'), approvedCount: approved.length,
      rejectedExpenses: sum(mine.filter(r => r.status === 'rejected'), 'totalClaimedAmount'), rejectedCount: mine.filter(r => r.status === 'rejected').length,
      paymentPending: sum(mine.filter(r => r.status === 'payment_pending'), 'totalApprovedAmount'), totalReimbursedAmount: sum(mine, 'paidAmount') },
      charts: { monthlyTrends: [], categoryExpenses: [], departmentExpenses: [], policyViolationsCount: 0 },
      totalClaims: mine.length, claimsCount: mine.length, pendingCount: mine.filter(r => pending(r.status)).length,
      totalClaimed: mine.reduce((n, r) => n + Number(r.totalClaimedAmount), 0), totalPendingAmount: mine.filter(r => pending(r.status)).reduce((n, r) => n + Number(r.totalClaimedAmount), 0),
      totalApprovedAmount: mine.reduce((n, r) => n + Number(r.totalApprovedAmount || 0), 0), totalReimbursedAmount: mine.reduce((n, r) => n + Number(r.paidAmount || 0), 0), monthlyTrend: [], categoryBreakdown: [], departmentBreakdown: [] };
  }
  async getReports(ctx: TenantContext, filters: any): Promise<any> { await this.assertAccess(ctx, 'reports'); return super.getReports(ctx, filters); }

  async validatePolicyForClaim(ctx: TenantContext, categoryId: number, amount: number, receiptProvided: boolean) {
    try {
      const db = getKnex();
      const result = await this.policy(ctx, db, await this.applicant(ctx, db), categoryId || null, money(amount, true), receiptProvided, 'Policy preview');
      const violations: string[] = result.policy_violations ? JSON.parse(result.policy_violations) : [];
      return { isValid: !violations.length, violations, allowException: true };
    } catch (e: any) {
      if (!(e instanceof ValidationError)) throw e;
      return { isValid: false, violations: [e.message], allowException: false };
    }
  }

  async getSettings(ctx: TenantContext): Promise<any> {
    const settings = await super.getSettings(ctx), db = getKnex();
    const config = await ExpenseConfigService.load(ctx.organizationId, db);
    const applicant = await this.applicant(ctx, db);
    const designationId = applicant.employee?.currentDesignationId;
    const rate = designationId ? await db('expense_mileage_designation_rates').where({ organization_id: ctx.organizationId, designation_id: designationId }).first() : null;
    const designation = designationId ? await db('designations').where({ organization_id: ctx.organizationId, id: designationId }).first() : null;
    return { ...settings, ...config, autoApprovalThreshold: 0, workflowMandatory: true,
      myMileageRateCar: Number(rate?.rateCar ?? config.mileageRateCar), myMileageRateBike: Number(rate?.rateBike ?? config.mileageRateBike), myDesignationName: designation?.name || null };
  }

  async updateSettings(ctx: TenantContext, input: any): Promise<any> {
    await this.assertAccess(ctx, 'configure');
    for (const key of ['mileageRateCar', 'mileageRateBike']) if (input[key] !== undefined) money(input[key], true);
    for (const key of ['claimNumberPrefix', 'travelRequestNumberPrefix', 'travelAdvanceNumberPrefix']) if (input[key] !== undefined && !/^[A-Za-z0-9_-]{1,20}$/.test(input[key])) throw new ValidationError('Number prefixes must contain 1–20 letters, digits, underscores or hyphens');
    if (input.numberSequenceDigits !== undefined && (!Number.isInteger(Number(input.numberSequenceDigits)) || input.numberSequenceDigits < 1 || input.numberSequenceDigits > 12)) throw new ValidationError('Number sequence digits must be 1–12');
    return super.updateSettings(ctx, { ...input, autoApprovalThreshold: 0, requireManagerApproval: true, requireFinanceApproval: true, multiLevelApproval: true });
  }

  async getWorkflows(ctx: TenantContext): Promise<any[]> {
    await this.assertAccess(ctx, 'configure');
    const db = getKnex();
    const rows = await db('workflows').where('organization_id', ctx.organizationId).whereIn('type', [...requestTypes]).whereNull('deleted_at').orderBy('id', 'desc');
    for (const w of rows) {
      const c: any = json(w.expenseConfig), f: any = json(w.applicabilityFilters);
      Object.assign(w, c, { name: w.workflowName, requestType: w.type, isActive: w.status === 'published' && Boolean(w.isPublished), departmentId: f.departmentIds?.[0] || null,
        employeeIds: f.employeeIds || [], reportingManagerIds: f.reportingManagerIds || [], applicabilityFilters: f });
      const steps = await db('workflow_steps').where({ workflow_id: w.id, organization_id: ctx.organizationId }).whereNull('deleted_at').orderBy('step_number');
      w.levels = steps.map((s: any) => ({ ...json(s.resolverConfig), levelOrder: s.stepNumber, stepName: s.stepName,
        approverType: json(s.resolverConfig).type || s.approverType, approvalMode: s.approvalMode, approverId: s.approverId, approverRoleId: s.approverRoleId, isMandatory: true }));
    }
    return rows;
  }

  private async saveWorkflow(ctx: TenantContext, input: any, id?: number) {
    await this.assertAccess(ctx, 'configure');
    if (!requestTypes.includes(input.requestType) || !String(input.name || '').trim() || !input.levels?.length) throw new ValidationError('Workflow name, request type and approval steps are required');
    if (!Number.isInteger(Number(input.priority ?? 0))) throw new ValidationError('Workflow priority must be an integer');
    const min = money(input.minAmount ?? 0, true), max = input.maxAmount == null ? null : money(input.maxAmount, true);
    if (max !== null && max < min) throw new ValidationError('Maximum amount cannot be below minimum');
    const db = getKnex();
    const workflowId = await db.transaction(async trx => {
      const existing = id ? await trx('workflows').where({ id, organization_id: ctx.organizationId }).whereIn('type', [...requestTypes]).whereNull('deleted_at').forUpdate().first() : null;
      if (id && !existing) throw new ValidationError('Workflow not found');
      const filters = { ...(input.applicabilityFilters || {}), departmentIds: input.departmentId ? [Number(input.departmentId)] : [], employeeIds: input.employeeIds || [], reportingManagerIds: input.reportingManagerIds || [] };
      for (const [field, table] of [['departmentIds', 'departments'], ['employeeIds', 'employees'], ['reportingManagerIds', 'employees']]) {
        const ids: number[] = filters[field].map(Number);
        if (ids.some(v => !Number.isSafeInteger(v) || v < 1)) throw new ValidationError('Invalid workflow scope');
        if (ids.length) { const rows = await trx(table).where('organization_id', ctx.organizationId).whereIn('id', ids).whereNull('deleted_at'); if (rows.length !== new Set(ids).size) throw new ValidationError('Workflow scope must belong to your organization'); }
      }
      if (filters.employeeIds.length && (filters.departmentIds.length || filters.reportingManagerIds.length)) {
        const scopedEmployees = await trx('employees').where('organization_id', ctx.organizationId)
          .whereIn('id', filters.employeeIds.map(Number)).whereNull('deleted_at')
          .select('id', 'current_department_id', 'reporting_manager_id');
        const hasMatchingEmployee = scopedEmployees.some((employee: any) =>
          (!filters.departmentIds.length || filters.departmentIds.map(Number).includes(Number(employee.currentDepartmentId)))
          && (!filters.reportingManagerIds.length || filters.reportingManagerIds.map(Number).includes(Number(employee.reportingManagerId))));
        if (!hasMatchingEmployee) throw new ValidationError(EXPENSE_VALIDATION_MESSAGES.WORKFLOW_SCOPE_CONFLICT.message);
      }
      const active = input.isActive !== false;
      const data: any = { workflow_name: input.name.trim(), type: input.requestType, description: input.description || null,
        applicability_filters: JSON.stringify(filters), expense_config: JSON.stringify({ minAmount: min, maxAmount: max, priority: Number(input.priority || 0), targetRole: input.targetRole || 'all' }),
        approval_pattern: 'sequential', status: active ? 'published' : 'draft', is_active: active, is_published: active,
        version_number: Number(existing?.versionNumber || 0) + 1, published_by: active ? ctx.userId : null, published_at: active ? new Date() : null, updated_by: ctx.userId, updated_at: new Date() };
      if (!id) { [id] = await trx('workflows').insert({ ...data, uuid: uuid(), workflow_code: `expense_${uuid()}`, organization_id: ctx.organizationId, created_by: ctx.userId }); }
      else await trx('workflows').where({ id, organization_id: ctx.organizationId }).update(data);
      // Runs contain complete immutable snapshots. Step definitions can be edited safely.
      const previous = await trx('workflow_steps').where({ workflow_id: id, organization_id: ctx.organizationId });
      for (let i = 0; i < input.levels.length; i++) {
        const level = input.levels[i];
        const type = level.approverType;
        if (!['team_lead', 'reporting_manager', 'manager_chain', 'specific_employee', 'specific_user', 'department_head', 'user_role', 'role'].includes(type)) throw new ValidationError('Select a supported approver resolver');
        if (!String(level.stepName || '').trim()) throw new ValidationError('Approval step name is required');
        const resolver: any = { type, depth: type === 'manager_chain' ? Number(level.depth || 2) : 1, employeeId: level.employeeId,
          roleCode: level.roleCode, departmentId: level.departmentId, finance: Boolean(level.finance), fallback: level.fallback || null, canReturn: level.canReturn !== false };
        if (type === 'specific_employee') await this.employeeUser(trx, ctx.organizationId, Number(level.employeeId));
        if (type === 'specific_user') {
          const user = await trx('users').where({ id: Number(level.approverId) || 0, organization_id: ctx.organizationId, status: 'active' }).whereNull('deleted_at').first();
          if (!user) throw new ValidationError('Named approver must be an active user in your organization');
        }
        if (level.departmentId && !await trx('departments').where({ id: level.departmentId, organization_id: ctx.organizationId }).whereNull('deleted_at').first()) throw new ValidationError('Step department must belong to your organization');
        if (['role', 'user_role'].includes(type) && !level.roleCode && !level.approverRoleId) throw new ValidationError('Role is required for a role step');
        if (['role', 'user_role'].includes(type)) {
          const role = await trx('roles').where((q: any) => q.where('organization_id', ctx.organizationId).orWhereNull('organization_id')).whereNull('deleted_at')
            .where(level.approverRoleId ? { id: level.approverRoleId } : { code: level.roleCode }).first();
          if (!role) throw new ValidationError('Select a role belonging to this organization');
          if (['team_lead', 'manager'].includes(role.code)) throw new ValidationError('Use the claimant reporting chain for team lead and manager steps');
        }
        if (resolver.fallback && resolver.fallback !== 'primary_manager_when_on_leave') throw new ValidationError('Invalid absence fallback');
        const stepData: any = { step_number: i + 1, step_name: level.stepName.trim(), approver_type: type === 'specific_employee' ? 'specific_user' : ['team_lead', 'manager_chain'].includes(type) ? 'reporting_manager' : type === 'role' ? 'user_role' : type,
          approver_id: type === 'specific_user' ? level.approverId : null, approver_role_id: level.approverRoleId || null, resolver_config: JSON.stringify(resolver),
          approval_mode: level.approvalMode === 'all_people' ? 'all_people' : 'any_one_person', is_final_step: i === input.levels.length - 1, updated_by: ctx.userId, deleted_at: null };
        const old = previous.find((p: any) => Number(p.stepNumber) === i + 1);
        if (old) await trx('workflow_steps').where({ id: old.id, organization_id: ctx.organizationId }).update(stepData);
        else await trx('workflow_steps').insert({ ...stepData, uuid: uuid(), organization_id: ctx.organizationId, workflow_id: id, created_by: ctx.userId });
      }
      await trx('workflow_steps').where({ workflow_id: id, organization_id: ctx.organizationId }).where('step_number', '>', input.levels.length).update({ deleted_at: new Date() });
      return Number(id);
    });
    return (await this.getWorkflows(ctx)).find(w => Number(w.id) === workflowId);
  }
  async createWorkflow(ctx: TenantContext, data: any) { return this.saveWorkflow(ctx, data); }
  async updateWorkflow(ctx: TenantContext, id: number, data: any) { return this.saveWorkflow(ctx, data, id); }
  async deleteWorkflow(ctx: TenantContext, id: number): Promise<any> {
    await this.assertAccess(ctx, 'configure');
    await getKnex()('workflows').where({ id, organization_id: ctx.organizationId }).whereIn('type', [...requestTypes]).update({ status: 'archived', is_published: false, is_active: false });
    return { success: true };
  }
}
