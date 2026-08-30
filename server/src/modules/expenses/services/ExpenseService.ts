import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import { ExpenseDbService } from './ExpenseDbService';

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
    type: 'all' | 'eq' | 'none' | 'dept' | 'reportees' | 'submitter';
    column?: string;
    value?: number;
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
    if (!emp) {
      return {
        type: 'submitter',
        column: employeeIdColumn.replace('employee_id', 'submitted_by_user_id'),
        value: Number(ctx.userId),
      };
    }

    const deptId = emp.current_department_id ?? emp.currentDepartmentId;
    const isDeptHead = allRoles.some((c: string) => ['department_head', 'dept_head'].includes(c) || c.includes('department_head'));
    if (isDeptHead && deptId) {
      return { type: 'dept', value: Number(deptId) };
    }
    const isManagerLike = allRoles.some((c: string) => ['manager', 'team_lead'].includes(c) || c.includes('team_lead') || c.includes('manager'));
    if (isManagerLike) {
      return { type: 'reportees', value: Number(emp.id) };
    }
    return { type: 'eq', column: employeeIdColumn, value: Number(emp.id) };
  }

  private applyVisibilityToQuery(query: any, vis: {
    type: 'all' | 'eq' | 'none' | 'dept' | 'reportees' | 'submitter';
    column?: string;
    value?: number;
  }) {
    if (vis.type === 'all') return query;
    if (vis.type === 'none') return query.whereRaw('1 = 0');
    if (vis.type === 'dept') return query.where('e.current_department_id', vis.value);
    if (vis.type === 'reportees') return query.where('e.reporting_manager_id', vis.value);
    if (vis.type === 'submitter' && vis.column) return query.where(vis.column, vis.value);
    if (vis.type === 'eq' && vis.column) return query.where(vis.column, vis.value);
    return query;
  }

  private async assertCanManageEmployeeClaim(ctx: TenantContext, claim: any) {
    if (!claim) throw new Error('Claim not found');
    if (Number(claim.organization_id ?? claim.organizationId) !== Number(ctx.organizationId)) {
      throw new Error('Claim not found');
    }
    const vis = await this.getPeopleVisibility(ctx, 'ec.employee_id');
    if (vis.type === 'all') return;
    const db = getKnex();
    const claimEmpId = Number(claim.employee_id ?? claim.employeeId);
    const emp = await db('employees').where('id', claimEmpId).where('organization_id', ctx.organizationId).first();
    if (!emp) throw new Error('You can only act on claims for your team.');
    const deptId = emp.current_department_id ?? emp.currentDepartmentId;
    const managerId = emp.reporting_manager_id ?? emp.reportingManagerId;
    if (vis.type === 'dept' && Number(deptId) === vis.value) return;
    if (vis.type === 'reportees' && Number(managerId) === vis.value) return;
    if (vis.type === 'eq' && claimEmpId === vis.value) return;
    throw new Error('You can only act on claims for your team.');
  }

  private mapCategory(row: any) {
    if (!row) return row;
    return {
      ...row,
      spendingLimit: Number(row.spending_limit ?? row.spendingLimit ?? 0),
      isReceiptMandatory: Boolean(row.is_receipt_mandatory ?? row.isReceiptMandatory),
      minAmountForReceipt: Number(row.min_amount_for_receipt ?? row.minAmountForReceipt ?? 0),
      autoApprovalThreshold: Number(row.auto_approval_threshold ?? row.autoApprovalThreshold ?? 0),
      isActive: row.is_active !== undefined ? Boolean(row.is_active) : Boolean(row.isActive ?? true),
    };
  }

  // --- EXPENSE CATEGORIES ---
  async getCategories(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const rows = await db('expense_categories')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .orderBy('id', 'asc');
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
      spending_limit: data.spendingLimit || 0,
      is_receipt_mandatory: Boolean(data.isReceiptMandatory),
      min_amount_for_receipt: data.minAmountForReceipt || 0,
      auto_approval_threshold: data.autoApprovalThreshold ?? 0,
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      created_at: new Date(),
      updated_at: new Date()
    });
    return this.mapCategory(await db('expense_categories').where('id', id).first());
  }

  async updateCategory(ctx: TenantContext, categoryId: number, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_categories')
      .where('id', categoryId)
      .where('organization_id', ctx.organizationId)
      .update({
        name: data.name,
        code: data.code,
        description: data.description,
        spending_limit: data.spendingLimit,
        is_receipt_mandatory: Boolean(data.isReceiptMandatory),
        min_amount_for_receipt: data.minAmountForReceipt,
        ...(data.autoApprovalThreshold !== undefined
          ? { auto_approval_threshold: Number(data.autoApprovalThreshold) || 0 }
          : {}),
        is_active: data.isActive,
        updated_at: new Date()
      });
    return this.mapCategory(await db('expense_categories').where('id', categoryId).first());
  }

  async deleteCategory(ctx: TenantContext, categoryId: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_categories')
      .where('id', categoryId)
      .where('organization_id', ctx.organizationId)
      .update({ is_active: false, updated_at: new Date() });
    return { success: true };
  }

  // --- EXPENSE POLICIES ---
  private mapExpensePolicy(row: any) {
    if (!row) return row;
    return {
      ...row,
      policyName: row.policy_name || row.policyName,
      categoryId: row.category_id || row.categoryId,
      categoryName: row.category_name || row.categoryName,
      grade: row.grade,
      designation: row.designation,
      departmentId: row.department_id || row.departmentId,
      location: row.location,
      maxLimitPerClaim: row.max_limit_per_claim ?? row.maxLimitPerClaim,
      maxLimitPerMonth: row.max_limit_per_month ?? row.maxLimitPerMonth,
      requireReceiptAbove: row.require_receipt_above ?? row.requireReceiptAbove,
      allowException: row.allow_exception ?? row.allowException,
      isActive: row.is_active ?? row.isActive,
      createdAt: row.created_at || row.createdAt
    };
  }

  async getPolicies(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const rows = await db('expense_policies as ep')
      .leftJoin('expense_categories as ec', 'ep.category_id', 'ec.id')
      .where('ep.organization_id', ctx.organizationId)
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
      max_limit_per_claim: data.maxLimitPerClaim || 0,
      max_limit_per_month: data.maxLimitPerMonth || 0,
      require_receipt_above: data.requireReceiptAbove || 0,
      allow_exception: data.allowException !== undefined ? Boolean(data.allowException) : true,
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('expense_policies').where('id', id).first();
    return this.mapExpensePolicy(row);
  }

  async updatePolicy(ctx: TenantContext, policyId: number, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_policies')
      .where('id', policyId)
      .where('organization_id', ctx.organizationId)
      .update({
        policy_name: data.policyName,
        category_id: data.categoryId || null,
        grade: data.grade,
        designation: data.designation,
        department_id: data.departmentId || null,
        location: data.location,
        max_limit_per_claim: data.maxLimitPerClaim,
        max_limit_per_month: data.maxLimitPerMonth,
        require_receipt_above: data.requireReceiptAbove,
        allow_exception: data.allowException,
        is_active: data.isActive,
        updated_at: new Date()
      });
    const row = await db('expense_policies').where('id', policyId).first();
    return this.mapExpensePolicy(row);
  }

  async deletePolicy(ctx: TenantContext, policyId: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    await db('expense_policies')
      .where('id', policyId)
      .where('organization_id', ctx.organizationId)
      .delete();
    return { success: true };
  }

  async validatePolicyForClaim(ctx: TenantContext, categoryId: number, amount: number, receiptProvided: boolean) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const category = categoryId ? await db('expense_categories').where('id', categoryId).first() : null;
    const policies = await db('expense_policies')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .where(function () {
        this.whereNull('category_id').orWhere('category_id', categoryId);
      });

    const violations: string[] = [];

    if (category) {
      if (category.spending_limit > 0 && amount > category.spending_limit) {
        violations.push(`Amount ₹${amount} exceeds category limit ₹${category.spending_limit}`);
      }
      if (category.is_receipt_mandatory && amount >= category.min_amount_for_receipt && !receiptProvided) {
        violations.push(`Receipt mandatory for ${category.name} above ₹${category.min_amount_for_receipt}`);
      }
    }

    for (const pol of policies) {
      if (pol.max_limit_per_claim > 0 && amount > pol.max_limit_per_claim) {
        violations.push(`Amount exceeds policy limit of ₹${pol.max_limit_per_claim} for ${pol.policy_name}`);
      }
      if (pol.require_receipt_above > 0 && amount > pol.require_receipt_above && !receiptProvided) {
        violations.push(`Receipt mandatory for amounts over ₹${pol.require_receipt_above} per policy '${pol.policy_name}'`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations
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
        query = this.applyVisibilityToQuery(query, vis);
      }
    } else {
      const vis = await this.getPeopleVisibility(ctx, 'ec.employee_id', params.employeeId);
      query = this.applyVisibilityToQuery(query, vis);
    }

    if (params.status && params.status !== 'all') {
      if (params.status === 'pending_manager') {
        query = query.whereIn('ec.status', ['submitted', 'pending_manager']);
      } else if (params.status === 'pending_finance') {
        query = query.whereIn('ec.status', ['pending_finance', 'approved']);
      } else if (params.status === 'pending_approvals') {
        query = query.whereIn('ec.status', ['submitted', 'pending_manager', 'pending_finance', 'approved']);
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
      const items = await db('expense_claim_items as eci')
        .leftJoin('expense_categories as c', 'eci.category_id', 'c.id')
        .where('eci.claim_id', claim.id)
        .select('eci.*', 'c.name as category_name');
      claim.items = items;
      claim.itemCount = items.length;
    }

    return (claims || []).map((c: any) => this.mapClaim(c));
  }

  async getClaimById(ctx: TenantContext, claimId: number) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();

    const claim = await db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('users as u', 'ec.submitted_by_user_id', 'u.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
      .leftJoin('expense_categories as cat', 'ec.category_id', 'cat.id')
      .leftJoin('travel_requests as tr', 'ec.travel_request_id', 'tr.id')
      .leftJoin('travel_advances as ta', 'ec.travel_advance_id', 'ta.id')
      .where('ec.id', claimId)
      .select(
        'ec.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code',
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

  private async resolveSubmitStatus(
    ctx: TenantContext,
    items: Array<{ categoryId?: number | null; claimedAmount: number; policyValidated?: boolean }>,
    isDraft: boolean
  ): Promise<string> {
    if (isDraft) return 'draft';
    const settings = await this.getSettings(ctx);
    if (!settings.requireManagerApproval) {
      return settings.requireFinanceApproval ? 'pending_finance' : 'payment_pending';
    }

    const db = getKnex();
    for (const item of items) {
      if (item.policyValidated === false) return 'pending_manager';
      let threshold = 0;
      if (item.categoryId) {
        const cat = await db('expense_categories').where('id', item.categoryId).first().catch(() => null);
        threshold = Number(cat?.auto_approval_threshold ?? cat?.autoApprovalThreshold ?? 0);
      }
      if (threshold <= 0 || Number(item.claimedAmount) > threshold) {
        return 'pending_manager';
      }
    }

    return settings.requireFinanceApproval ? 'pending_finance' : 'payment_pending';
  }

  async createClaim(ctx: TenantContext, input: ClaimInput) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const empId = emp ? emp.id : null;

    const claimNumber = `EXP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
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
        approvedAmount: amt,
        rejectedAmount: 0,
        policyValidated: validation.isValid,
        policyViolations: validation.violations.length > 0 ? JSON.stringify(validation.violations) : null
      });
    }

    const orgId = ctx.organizationId;
    const status = await this.resolveSubmitStatus(ctx, validatedItems, isDraft);

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
      total_approved_amount: isDraft ? 0 : totalClaimed,
      total_rejected_amount: 0,
      payment_method: input.paymentMethod || 'bank_transfer',
      merchant_name: input.merchantName || null,
      description: input.description || null,
      project_cost_center: input.projectCostCenter || null,
      receipt_url: input.receiptUrl || null,
      travel_request_id: input.travelRequestId || null,
      travel_advance_id: input.travelAdvanceId || null,
      status: status,
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
        : (status === 'pending_manager' ? 'Claim submitted for approval' : 'Claim auto-approved based on category threshold'),
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
    let newStatus = isSubmit ? 'pending_manager' : 'draft';

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

    newStatus = await this.resolveSubmitStatus(ctx, validatedItems, !isSubmit);

    await db('expense_claims')
      .where('id', claimId)
      .update({
        title: input.title || existing.title,
        category_id: input.categoryId || existing.category_id,
        claim_date: input.claimDate || existing.claim_date,
        total_claimed_amount: totalClaimed,
        total_approved_amount: isSubmit ? totalClaimed : 0,
        payment_method: input.paymentMethod || existing.payment_method,
        merchant_name: input.merchantName || existing.merchant_name,
        description: input.description || existing.description,
        project_cost_center: input.projectCostCenter || existing.project_cost_center,
        receipt_url: input.receiptUrl || existing.receipt_url,
        travel_request_id: input.travelRequestId || existing.travel_request_id,
        travel_advance_id: input.travelAdvanceId || existing.travel_advance_id,
        status: newStatus,
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
      action: isSubmit ? 'Resubmitted Claim' : 'Updated Draft',
      comments: isSubmit ? 'Claim resubmitted with updated items' : 'Draft updated',
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  // --- APPROVAL ACTIONS ---
  async approveClaimByManager(ctx: TenantContext, claimId: number, comments?: string) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim);

    const nextStatus = 'pending_finance';
    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: nextStatus,
        updated_at: new Date()
      });

    await db('expense_claim_items').where('claim_id', claimId).update({ status: 'manager_approved' });

    const approverName = await this.getApproverName(ctx, 'Reporting Manager');
    await db('expense_approval_logs').insert({
      claim_id: claimId,
      approver_id: ctx?.userId || null,
      approver_name: approverName,
      approver_role: 'Reporting Manager',
      action: 'Approved by Manager',
      comments: comments || 'Claim approved and forwarded to Finance for verification.',
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  async bulkApproveClaims(ctx: TenantContext, ids: number[], comments?: string) {
    const approved: number[] = [];
    const failed: Array<{ id: number; message: string }> = [];

    for (const id of ids) {
      try {
        const db = getKnex();
        const claim = await db('expense_claims').where('id', id).first();
        if (!claim) throw new Error('Claim not found');
        const status = claim.status;
        if (['submitted', 'pending_manager'].includes(status)) {
          await this.approveClaimByManager(ctx, id, comments);
        } else if (status === 'pending_finance') {
          await this.verifyAndApproveByFinance(ctx, id, {
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

  async verifyAndApproveByFinance(ctx: TenantContext, claimId: number, body: { items?: Array<{ id: number; approvedAmount: number; adjustmentReason?: string }>; comments?: string }) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim);

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

    const nextStatus = 'payment_pending';

    await db('expense_claims')
      .where('id', claimId)
      .update({
        status: nextStatus,
        total_approved_amount: totalApproved,
        total_rejected_amount: totalRejected,
        approved_at: new Date(),
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
      action: 'Verified & Approved by Finance',
      comments: body.comments || `Finance verified claim. Approved amount: ₹${totalApproved.toLocaleString('en-IN')}`,
      created_at: new Date()
    });

    return this.getClaimById(ctx, claimId);
  }

  async rejectClaim(ctx: TenantContext, claimId: number, reason: string) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    if (!reason || !reason.trim()) throw new Error('Rejection reason is mandatory');
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim);

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

  async returnClaimForCorrection(ctx: TenantContext, claimId: number, comments: string) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    if (!comments || !comments.trim()) throw new Error('Correction comments are mandatory');
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim);

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
  async processReimbursement(ctx: TenantContext, claimId: number, body: { paymentDate: string; paidAmount: number; paymentMethod: string; paymentReference: string }) {
    await this.ensureInitialized(ctx?.organizationId || 1);
    const db = getKnex();
    const claim = await db('expense_claims').where('id', claimId).first();
    if (!claim) throw new Error('Claim not found');
    await this.assertCanManageEmployeeClaim(ctx, claim);

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
        payment_reference: body.paymentReference || null,
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
      comments: `Payment processed via ${body.paymentMethod || 'Bank Transfer'}. Ref #${body.paymentReference || 'N/A'}. Amount: ₹${paidAmt.toLocaleString('en-IN')}`,
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
      firstName: row.first_name || row.firstName || row.submitter_first_name || row.submitterFirstName,
      lastName: row.last_name || row.lastName || row.submitter_last_name || row.submitterLastName,
      employeeCode: row.employee_code || row.employeeCode,
      requestNumber: row.request_number || row.requestNumber,
      travelPurpose: row.travel_purpose || row.travelPurpose,
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

  async getTravelRequests(ctx: TenantContext, employeeId?: number) {
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
    const rows = await query;
    return (rows || []).map((r: any) => this.mapTravelRequest(r));
  }

  async createTravelRequest(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const reqNum = `TRV-${Date.now().toString().slice(-6)}`;

    const [id] = await db('travel_requests').insert({
      uuid: uuidv4(),
      request_number: reqNum,
      organization_id: ctx.organizationId,
      employee_id: emp?.id ?? null,
      submitted_by_user_id: ctx.userId || null,
      from_location: data.fromLocation,
      to_location: data.toLocation,
      purpose: data.purpose,
      start_date: data.startDate,
      end_date: data.endDate,
      estimated_budget: data.estimatedBudget || 0,
      status: 'pending',
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

  async updateTravelRequestStatus(ctx: TenantContext, id: number, status: string, notes?: string) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const existing = await db('travel_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .first();
    if (!existing) throw new Error('Travel request not found');

    let nextStatus = status;
    const current = String(existing.status || '').toLowerCase();
    if (status === 'approved' && (current === 'pending' || current === 'submitted')) {
      nextStatus = 'pending_finance';
    }

    await db('travel_requests')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({
        status: nextStatus,
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

  async getTravelAdvances(ctx: TenantContext, employeeId?: number) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    let query = db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.organization_id', ctx.organizationId)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'tr.request_number', 'tr.purpose as travel_purpose')
      .orderBy('ta.created_at', 'desc');

    const vis = await this.getPeopleVisibility(ctx, 'ta.employee_id', employeeId);
    query = this.applyVisibilityToQuery(query, vis);
    const rows = await query;
    return (rows || []).map((r: any) => this.mapTravelAdvance(r));
  }

  async createTravelAdvance(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);
    const advNum = `ADV-${Date.now().toString().slice(-6)}`;
    const amt = Number(data.advanceAmount || 0);

    const [id] = await db('travel_advances').insert({
      uuid: uuidv4(),
      advance_number: advNum,
      organization_id: ctx.organizationId,
      employee_id: emp?.id ?? null,
      submitted_by_user_id: ctx.userId || null,
      travel_request_id: data.travelRequestId || null,
      advance_amount: amt,
      approved_amount: amt,
      settled_amount: 0,
      balance_amount: amt,
      purpose: data.purpose || 'Travel Advance Request',
      status: 'requested',
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('travel_advances as ta')
      .leftJoin('employees as e', 'ta.employee_id', 'e.id')
      .leftJoin('travel_requests as tr', 'ta.travel_request_id', 'tr.id')
      .where('ta.id', id)
      .select('ta.*', 'e.first_name', 'e.last_name', 'e.employee_code', 'tr.request_number', 'tr.purpose as travel_purpose')
      .first();
    return this.mapTravelAdvance(row);
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

  async createMileageClaim(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const emp = await this.getEmployeeForCtx(ctx);

    const settings = await db('expense_settings').where('organization_id', ctx.organizationId).first();
    const numOr = (v: any, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const carRate = settings ? numOr(settings.mileageRateCar ?? settings.mileage_rate_car, 12) : 12;
    const bikeRate = settings ? numOr(settings.mileageRateBike ?? settings.mileage_rate_bike, 6) : 6;

    const vehicle = (data.vehicleType || 'car').toLowerCase();
    const rate = numOr(data.ratePerKm, vehicle === 'bike' ? bikeRate : carRate);
    const distance = numOr(data.distanceKm, 0);
    const calculatedAmount = Number((distance * rate).toFixed(2));

    const [id] = await db('mileage_claims').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: emp?.id ?? null,
      submitted_by_user_id: ctx.userId || null,
      trip_date: data.tripDate || new Date().toISOString().slice(0, 10),
      from_location: data.fromLocation,
      to_location: data.toLocation,
      vehicle_type: vehicle,
      distance_km: distance,
      rate_per_km: rate,
      calculated_amount: calculatedAmount,
      purpose: data.purpose || null,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });
    const row = await db('mileage_claims as mc')
      .leftJoin('employees as e', 'mc.employee_id', 'e.id')
      .where('mc.id', id)
      .select('mc.*', 'e.first_name', 'e.last_name', 'e.employee_code')
      .first();
    return this.mapMileageClaim(row);
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

      if (['submitted', 'pending_manager', 'pending_finance'].includes(row.status)) {
        pendingApproval += cnt;
      } else if (['approved', 'payment_pending'].includes(row.status)) {
        approvedExpenses += approved;
        approvedCount += cnt;
        if (row.status === 'payment_pending') paymentPending += cnt;
      } else if (row.status === 'rejected') {
        rejectedExpenses += claimed;
        rejectedCount += cnt;
      } else if (row.status === 'paid') {
        totalReimbursedAmount += paid;
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
    const departmentExpenses = await db('expense_claims as ec')
      .leftJoin('employees as e', 'ec.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('ec.organization_id', ctx.organizationId)
      .select(db.raw("COALESCE(d.name, 'General') as departmentName"), db.raw("SUM(ec.total_claimed_amount) as totalAmount"))
      .groupBy('d.name')
      .orderBy('totalAmount', 'desc');

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

    if (filters.startDate) query = query.where('ec.claim_date', '>=', filters.startDate);
    if (filters.endDate) query = query.where('ec.claim_date', '<=', filters.endDate);
    if (filters.departmentId) query = query.where('e.current_department_id', filters.departmentId);
    if (filters.employeeId) query = query.where('ec.employee_id', filters.employeeId);
    if (filters.categoryId) query = query.where('ec.category_id', filters.categoryId);
    if (filters.status) query = query.where('ec.status', filters.status);

    return query;
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
      enableMileageModule: Boolean(settings.enable_mileage_module ?? settings.enableMileageModule ?? true)
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
    return this.mapExpenseSettings(settings);
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

    return this.getSettings(ctx);
  }

  // --- DYNAMIC APPROVAL WORKFLOWS ---
  async getWorkflows(ctx: TenantContext) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const workflows = await db('expense_workflows')
      .where('organization_id', ctx.organizationId)
      .orderBy('id', 'desc');

    for (const wf of workflows) {
      const levels = await db('expense_workflow_levels')
        .where('workflow_id', wf.id)
        .orderBy('level_order', 'asc');
      wf.levels = levels;
    }
    return workflows;
  }

  async createWorkflow(ctx: TenantContext, data: any) {
    await this.ensureInitialized(ctx.organizationId);
    const db = getKnex();
    const [wfId] = await db('expense_workflows').insert({
      organization_id: ctx.organizationId,
      name: data.name,
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
