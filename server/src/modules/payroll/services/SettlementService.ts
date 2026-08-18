import { v4 as uuidv4 } from 'uuid';
import { FullFinalSettlementRepository } from '../repositories/FullFinalSettlementRepository';
import { EmployeeLoanRepository } from '../repositories/EmployeeLoanRepository';
import { SalaryAdvanceRepository } from '../repositories/SalaryAdvanceRepository';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { getKnex } from '../../../db/knex';
import { withSnakeAliases } from './PayrollService';

interface CreateSettlementInput {
  employeeId: number;
  exitDate: string;
  noticePeriodDays?: number;
}

export class SettlementService {
  private settlementRepo: FullFinalSettlementRepository;
  private loanRepo: EmployeeLoanRepository;
  private advanceRepo: SalaryAdvanceRepository;
  private WorkflowExecutionService: WorkflowExecutionService;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.settlementRepo = new FullFinalSettlementRepository();
    this.loanRepo = new EmployeeLoanRepository();
    this.advanceRepo = new SalaryAdvanceRepository();
    this.WorkflowExecutionService = new WorkflowExecutionService();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
  }

  async createSettlement(ctx: TenantContext, input: CreateSettlementInput) {
    const existing = await this.settlementRepo.getForEmployee(ctx, input.employeeId);
    if (existing && existing.status !== 'processed') {
      throw new ValidationError('An active settlement already exists for this employee');
    }

    const settlement = await this.settlementRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      exit_date: input.exitDate,
      notice_period_days: input.noticePeriodDays || 0,
      notice_period_recovery: 0,
      leave_encashment_amount: 0,
      gratuity_amount: 0,
      bonus_settlement: 0,
      asset_recovery_amount: 0,
      other_deductions: 0,
      total_settlement_amount: 0,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'FULL_FINAL_SETTLEMENT',
      entityId: settlement.id,
      afterState: { settlement }
    });

    return settlement;
  }

  async calculateSettlement(ctx: TenantContext, settlementId: number) {
    const db = getKnex();
    // The global postProcessResponse hook camelCases every query result, but
    // this whole method was written reading snake_case column names
    // (struct.basic_monthly, emp.date_of_joining, emp.gross_salary, etc.) —
    // every one of those was silently undefined, which is the real reason
    // "basicMonthly" always fell through to the hardcoded ₹35,000 fallback
    // regardless of what the employee's actual salary structure said.
    const settlement = withSnakeAliases(await this.settlementRepo.getById(ctx, settlementId));
    if (!settlement) throw new NotFoundError('Settlement not found');

    const empId = settlement.employee_id;

    // 1. Fetch Employee record for tenure calculation
    const emp = withSnakeAliases(await db('employees').where('id', empId).first().catch(() => null));
    const joiningDate = emp?.date_of_joining ? new Date(emp.date_of_joining) : (emp?.created_at ? new Date(emp.created_at) : new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000));
    const exitDate = settlement.exit_date ? new Date(settlement.exit_date) : new Date();

    const diffTime = Math.max(0, exitDate.getTime() - joiningDate.getTime());
    const tenureYears = Math.round((diffTime / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;

    // 2. Fetch Employee Basic Salary — must read the CURRENT active structure
    //    mapping (employee_salary_structures.is_current), the same pattern
    //    PayrollService and SalaryRevisionService use. This was instead
    //    reading the legacy salary_structures table directly by employee_id
    //    (a stale/duplicate path), and if nothing turned up there, it
    //    fabricated a flat ₹35,000 and paid gratuity/encashment on it as if
    //    it were real — a fake number silently becoming real money.
    const dataWarnings: string[] = [];
    let basicMonthly = 0;
    const structMapping = await db('employee_salary_structures as ess')
      .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where({ 'ess.employee_id': empId, 'ess.is_current': true })
      .whereNull('ess.deleted_at')
      .select('ss.*')
      .first()
      .catch(() => null);
    const struct = withSnakeAliases(structMapping || await db('salary_structures').where('employee_id', empId).whereNull('deleted_at').orderBy('id', 'desc').first().catch(() => null));

    if (struct && Number(struct.basic_monthly) > 0) {
      basicMonthly = Number(struct.basic_monthly);
    } else if (emp && Number(emp.gross_salary) > 0) {
      basicMonthly = Math.round(Number(emp.gross_salary) * 0.5);
    } else if (emp && Number(emp.annual_ctc) > 0) {
      basicMonthly = Math.round((Number(emp.annual_ctc) / 12) * 0.5);
    } else {
      basicMonthly = 0;
      dataWarnings.push('No salary structure or CTC found for this employee — gratuity and leave encashment could not be calculated. Assign a salary structure first.');
    }

    // 3. Fetch Leave Balances & Calculate Leave Encashment — same principle:
    //    an employee with genuinely zero leave balance rows on file is not
    //    the same as "assume 12 days and pay out for them."
    let leaveBalanceDays = 0;
    try {
      const lbRows = await db('leave_balances').where('employee_id', empId).catch(() => []);
      if (Array.isArray(lbRows) && lbRows.length > 0) {
        leaveBalanceDays = lbRows.reduce((sum, lb: any) => sum + (Number(lb.balance) || Number(lb.remaining_days) || 0), 0);
      } else {
        dataWarnings.push('No leave balance records found for this employee — leave encashment defaulted to 0 days. Verify manually before finalizing.');
      }
    } catch {
      dataWarnings.push('Could not read leave balance records — leave encashment defaulted to 0 days. Verify manually before finalizing.');
    }

    const leaveEncashment = Math.round((basicMonthly / 26) * Math.max(0, leaveBalanceDays));

    // 4. Calculate Gratuity using Dynamic Gratuity Rules Configuration
    let gratuity = 0;
    let appliedGratuityRuleName = 'Statutory Gratuity (Default)';
    try {
      await this.ensureGratuityTable();
      const rules = await db('payroll_gratuity_rules')
        .where('organization_id', ctx.organizationId)
        .where('is_active', true)
        .whereNull('deleted_at')
        .orderBy('id', 'desc');

      // Find matching rule based on employee department / grade / location / employment_type
      let matchedRule = rules.find((r: any) => {
        let depts = []; try { depts = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch {}
        let locs = []; try { locs = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch {}
        let grades = []; try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch {}

        const deptMatch = depts.length === 0 || depts.includes('All') || (emp?.department_id && depts.includes(String(emp.department_id))) || (emp?.department_name && depts.includes(emp.department_name));
        const locMatch = locs.length === 0 || locs.includes('All') || (emp?.location_id && locs.includes(String(emp.location_id))) || (emp?.location_name && locs.includes(emp.location_name));
        const gradeMatch = grades.length === 0 || grades.includes('All') || (emp?.grade_id && grades.includes(String(emp.grade_id))) || (emp?.grade_name && grades.includes(emp.grade_name));

        return deptMatch && locMatch && gradeMatch;
      }) || rules[0];

      if (matchedRule) {
        appliedGratuityRuleName = matchedRule.name || 'Custom Gratuity Policy';
        const op = matchedRule.eligible_years_operator || '>=';
        const thresholdYears = Number(matchedRule.eligible_years_value ?? 5);
        const rounding = matchedRule.rounding_rule || 'round_up';

        // Apply Rounding Rule
        let finalTenureYears = tenureYears;
        const fraction = tenureYears - Math.floor(tenureYears);
        if (rounding === 'round_up' || rounding === 'Round Up') {
          // > 6 months (0.5 year) rounds up to next full year (Indian Gratuity Standard)
          finalTenureYears = fraction >= 0.5 ? Math.ceil(tenureYears) : Math.floor(tenureYears);
        } else if (rounding === 'round_down' || rounding === 'Round Down') {
          finalTenureYears = Math.floor(tenureYears);
        } else if (rounding === 'nearest' || rounding === 'Nearest') {
          finalTenureYears = Math.round(tenureYears);
        }

        // Check Eligibility
        let isEligible = false;
        if (op === '>=' || op === 'Greater than equal to') isEligible = finalTenureYears >= thresholdYears;
        else if (op === '>' || op === 'Greater than') isEligible = finalTenureYears > thresholdYears;
        else if (op === '=' || op === 'Equal to') isEligible = finalTenureYears === thresholdYears;
        else if (op === '<=' || op === 'Less than equal to') isEligible = finalTenureYears <= thresholdYears;
        else isEligible = finalTenureYears >= thresholdYears;

        if (isEligible && finalTenureYears > 0) {
          // Standard Formula: (15 * Basic * TenureYears) / 26
          const rawGratuity = Math.round(((15 * basicMonthly) / 26) * finalTenureYears);
          gratuity = Math.min(2000000, rawGratuity); // Capped at ₹20 Lakhs statutory limit
        }
      } else if (tenureYears >= 5) {
        // Fallback standard statutory calculation
        const rawGratuity = Math.round(((15 * basicMonthly) / 26) * tenureYears);
        gratuity = Math.min(2000000, rawGratuity);
      }
    } catch {
      if (tenureYears >= 5) {
        const rawGratuity = Math.round(((15 * basicMonthly) / 26) * tenureYears);
        gratuity = Math.min(2000000, rawGratuity);
      }
    }

    // 5. Get outstanding loans and advances
    const loans = await this.loanRepo.getForEmployee(ctx, empId).catch(() => []);
    const advances = await this.advanceRepo.getForEmployee(ctx, empId).catch(() => []);

    const totalLoanOutstanding = Array.isArray(loans)
      ? (loans as any[]).reduce((sum: number, l: any) => sum + (Number(l.outstandingAmount ?? l.outstanding_amount) || 0), 0)
      : 0;
    const totalAdvanceOutstanding = Array.isArray(advances)
      ? (advances as any[]).filter((a: any) => a.status === 'approved').reduce((sum: number, a: any) => sum + (Number(a.advanceAmount ?? a.advance_amount) || 0), 0)
      : 0;

    const totalDeductions = totalLoanOutstanding + totalAdvanceOutstanding + Number(settlement.asset_recovery_amount || 0) + Number(settlement.other_deductions || 0);
    const totalEarnings = leaveEncashment + gratuity + Number(settlement.bonus_settlement || 0) + Number(settlement.notice_period_recovery || 0);
    const totalSettlementAmount = Math.max(0, totalEarnings - totalDeductions);

    const updated = await this.settlementRepo.update(ctx, settlementId, {
      leave_encashment_amount: leaveEncashment,
      gratuity_amount: gratuity,
      total_settlement_amount: totalSettlementAmount,
      updated_by: ctx.userId
    });

    return {
      ...updated,
      tenureYears,
      leaveBalanceDays,
      basicMonthly,
      totalLoanOutstanding,
      totalAdvanceOutstanding,
      totalDeductions,
      totalEarnings,
      dataWarnings
    };
  }

  async submitForApproval(ctx: TenantContext, settlementId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    if (settlement.status !== 'draft') {
      throw new ValidationError('Only draft settlements can be submitted');
    }

    const updated = await this.settlementRepo.update(ctx, settlementId, {
      status: 'submitted',
      updated_by: ctx.userId
    });

    // Create workflow instance safely
    try {
      const workflowInstance = await this.WorkflowExecutionService.startWorkflow(ctx, {
        workflowCode: 'full_final_settlement',
        entityType: 'full_final_settlements',
        entityId: settlementId,
        metadata: { priority: 'high' }
      });

      await this.settlementRepo.update(ctx, settlementId, {
        workflow_instance_id: workflowInstance.id,
        updated_by: ctx.userId
      });
    } catch (e) {}

    // Send Notification
    try {
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'settlement_submitted',
        recipientId: settlement.employee_id,
        variables: { settlementId: String(settlementId) }
      } as any);
    } catch (e) {}

    return updated;
  }

  async approveSettlement(ctx: TenantContext, settlementId: number, approverId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    const updated = await this.settlementRepo.update(ctx, settlementId, {
      status: 'approved',
      approved_by: approverId || ctx.userId,
      approval_date: new Date().toISOString(),
      updated_by: ctx.userId
    });

    if (settlement.workflow_instance_id) {
      await this.WorkflowExecutionService.completeInstance(ctx, settlement.workflow_instance_id, 'approved').catch(() => {});
    }

    return updated;
  }

  async processSettlement(ctx: TenantContext, settlementId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    if (settlement.status !== 'approved' && settlement.status !== 'submitted') {
      throw new ValidationError('Only approved or submitted settlements can be processed');
    }

    return this.settlementRepo.update(ctx, settlementId, {
      status: 'processed',
      processed_date: new Date().toISOString(),
      updated_by: ctx.userId
    });
  }

  async getSettlement(ctx: TenantContext, settlementId: number) {
    const db = getKnex();
    const settlement = withSnakeAliases(await this.settlementRepo.getById(ctx, settlementId));
    if (!settlement) return null;

    const emp = withSnakeAliases(await db('employees').where('id', settlement.employee_id).first().catch(() => null));
    return {
      ...settlement,
      employee_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${settlement.employee_id}`,
      employee_code: emp?.employee_code || `EMP-${settlement.employee_id}`,
      department: emp?.department_name || emp?.department || 'Operations'
    };
  }

  async listSettlements(ctx: TenantContext, filters: { employeeId?: number; status?: string }) {
    const listFilters: any = {};
    if (filters.employeeId) listFilters.employee_id = filters.employeeId;
    if (filters.status) listFilters.status = filters.status;

    const result = await this.settlementRepo.list(ctx, { filters: listFilters });
    return result.items;
  }

  async getSettlements(ctx: TenantContext, employeeId?: number) {
    try {
      const db = getKnex();

      let tableName = 'full_and_final_settlements';
      const hasAnd = await db.schema.hasTable('full_and_final_settlements');
      if (!hasAnd) {
        const hasFinal = await db.schema.hasTable('full_final_settlements');
        if (hasFinal) {
          tableName = 'full_final_settlements';
        } else {
          return [];
        }
      }

      const activeOrgId = (ctx?.organizationId && Number(ctx.organizationId) > 0) ? Number(ctx.organizationId) : 68;
      let query = db(tableName)
        .leftJoin('employees', `${tableName}.employee_id`, 'employees.id')
        .where(`${tableName}.organization_id`, activeOrgId);

      const hasDeletedAt = await db.schema.hasColumn(tableName, 'deleted_at');
      if (hasDeletedAt) {
        query = query.whereNull(`${tableName}.deleted_at`);
      }

      if (employeeId && !isNaN(employeeId) && employeeId > 0) {
        query = query.where(`${tableName}.employee_id`, employeeId);
      }

      const settlements = await query
        .select(
          `${tableName}.*`,
          'employees.first_name',
          'employees.last_name',
          'employees.employee_code',
          'employees.email',
          'employees.date_of_joining'
        )
        .orderBy(`${tableName}.created_at`, 'desc');

      // The query result is camelCased (global postProcessResponse hook) —
      // reading s.first_name/s.last_name/s.employee_id here always resolved
      // to undefined, so employee_name was always the literal string
      // "Employee #undefined" regardless of who the settlement was for.
      return settlements.map((s: any) => {
        const firstName = s.firstName ?? s.first_name ?? '';
        const lastName = s.lastName ?? s.last_name ?? '';
        const empId = s.employeeId ?? s.employee_id;
        const name = `${firstName} ${lastName}`.trim() || `Employee #${empId}`;

        // The UI read a non-existent "employment_duration" field, so it
        // always fell back to a hardcoded literal ("03 Years 04 Months 12
        // Days") for every settlement regardless of the actual employee.
        // Compute the real figure from date_of_joining → exit_date.
        let employmentDuration = '—';
        const joiningRaw = s.dateOfJoining ?? s.date_of_joining;
        const exitRaw = s.exitDate ?? s.exit_date;
        if (joiningRaw) {
          const joinDate = new Date(joiningRaw);
          const endDate = exitRaw ? new Date(exitRaw) : new Date();
          let months = (endDate.getFullYear() - joinDate.getFullYear()) * 12 + (endDate.getMonth() - joinDate.getMonth());
          let days = endDate.getDate() - joinDate.getDate();
          if (days < 0) {
            months -= 1;
            const daysInPrevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
            days += daysInPrevMonth;
          }
          const years = Math.floor(months / 12);
          const remMonths = months % 12;
          employmentDuration = `${String(years).padStart(2, '0')} Years ${String(remMonths).padStart(2, '0')} Months ${String(Math.max(0, days)).padStart(2, '0')} Days`;
        }

        return {
          ...s,
          employment_duration: employmentDuration,
          employmentDuration,
          employee_name: name,
          employeeName: name,
          employeeCode: s.employeeCode ?? s.employee_code ?? `EMP-${empId}`
        };
      });
    } catch (err) {
      console.warn('[SettlementService] Warning fetching settlements:', err);
      return [];
    }
  }

  // Multi-tier manager team settlement resolution per AGENTS.md rule
  async getTeamSettlements(ctx: TenantContext, managerUserId: number) {
    const db = getKnex();
    try {
      const managerUser = await db('users').where('id', managerUserId).first().catch(() => null);
      const managerEmpId = managerUser?.employeeId || managerUser?.employee_id;
      const managerDeptId = managerUser?.departmentId || managerUser?.department_id;

      const teamLeadIds: number[] = [];
      if (managerEmpId) {
        const leads = await db('employees').where('reporting_manager_id', managerEmpId).select('id').catch(() => []);
        leads.forEach((l: any) => teamLeadIds.push(l.id));
      }

      let empQuery = db('employees').whereNull('deleted_at');
      if (managerDeptId || managerEmpId || teamLeadIds.length > 0) {
        empQuery = empQuery.where(builder => {
          if (managerDeptId) builder.orWhere('current_department_id', managerDeptId).orWhere('department_id', managerDeptId);
          if (managerEmpId) builder.orWhere('reporting_manager_id', managerEmpId);
          if (teamLeadIds.length > 0) builder.orWhereIn('reporting_manager_id', teamLeadIds);
        });
      }

      const teamEmps = await empQuery.select('id').catch(() => []);
      const teamEmpIds = teamEmps.map((e: any) => e.id);

      // A manager with zero resolvable reports (or no reports with an active
      // settlement) must see an empty list, not every other team's exit and
      // financial data — this used to fall back to "return everything" so
      // the view was "never blank," which is a real cross-team data leak.
      if (teamEmpIds.length === 0) return [];

      const allSettlements = await this.getSettlements(ctx, undefined);
      return allSettlements.filter((s: any) => teamEmpIds.includes(Number(s.employee_id)));
    } catch (e) {
      return [];
    }
  }

  // EXIT REQUEST — Employee/Manager/Team Lead submits to HR for processing
  async submitExitRequest(ctx: TenantContext, input: {
    employeeId: number;
    exitDate: string;
    reason: string;
    noticePeriodDays?: number;
    requestedByUserId: number;
  }) {
    const db = getKnex();
    const tableName = 'full_final_settlements';

    // Check if an active exit request or settlement already exists
    const existing = await this.settlementRepo.getForEmployee(ctx, input.employeeId);
    if (existing && existing.status !== 'processed') {
      throw new ValidationError('An active settlement or exit request already exists for this employee');
    }

    // Create settlement record in 'exit_requested' status.
    // .returning('*') is a no-op on MySQL (knex just warns and ignores it),
    // so this used to return the bare insert ID instead of a settlement
    // object — fetch the row back explicitly instead.
    const [insertedId] = await db(tableName).insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      exit_date: input.exitDate,
      notice_period_days: input.noticePeriodDays || 30,
      notice_period_recovery: 0,
      leave_encashment_amount: 0,
      gratuity_amount: 0,
      bonus_settlement: 0,
      asset_recovery_amount: 0,
      other_deductions: 0,
      total_settlement_amount: 0,
      status: 'exit_requested',
      settlement_notes: input.reason || '',
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    return db(tableName).where('id', insertedId).first();
  }

  // HR fetches all pending exit requests to convert to full settlements
  async getPendingExitRequests(ctx: TenantContext) {
    const db = getKnex();
    const tableName = 'full_final_settlements';
    try {
      // employees also has an organization_id column — after the join,
      // the unqualified where({organization_id: ...}) shorthand made MySQL
      // reject the whole query as "ambiguous column," which this method's
      // catch-and-return-[] swallowed silently. HR's exit-request queue was
      // therefore always empty regardless of how many requests existed.
      const rows = await db(tableName)
        .where(`${tableName}.organization_id`, ctx.organizationId)
        .where(`${tableName}.status`, 'exit_requested')
        .whereNull(`${tableName}.deleted_at`)
        .leftJoin('employees', `${tableName}.employee_id`, 'employees.id')
        .select(
          `${tableName}.*`,
          'employees.first_name',
          'employees.last_name',
          'employees.employee_code',
          'employees.email'
        )
        .orderBy(`${tableName}.created_at`, 'desc');

      // Same camelCase read bug as getSettlements — s.first_name/s.last_name
      // were always undefined, so every row showed "Employee #undefined"
      // regardless of who actually requested the exit.
      return rows.map((s: any) => {
        const firstName = s.firstName ?? s.first_name ?? '';
        const lastName = s.lastName ?? s.last_name ?? '';
        const empId = s.employeeId ?? s.employee_id;
        return {
          ...s,
          employee_name: `${firstName} ${lastName}`.trim() || `Employee #${empId}`,
          employeeCode: s.employeeCode ?? s.employee_code ?? `EMP-${empId}`
        };
      });
    } catch (e) {
      return [];
    }
  }

  // Admin approves a SUBMITTED settlement (status must be 'submitted')
  async adminApproveSettlement(ctx: TenantContext, settlementId: number, adminUserId: number) {
    const db = getKnex();
    const tableName = 'full_final_settlements';
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');
    if (settlement.status !== 'submitted') throw new ValidationError('Settlement must be in submitted status for admin approval');

    await db(tableName).where('id', settlementId).update({
      status: 'approved',
      approved_by: adminUserId,
      approval_date: new Date().toISOString().split('T')[0],
      updated_by: adminUserId,
      updated_at: new Date()
    });

    return { ...settlement, status: 'approved', approved_by: adminUserId };
  }

  // Admin rejects a submitted settlement
  async adminRejectSettlement(ctx: TenantContext, settlementId: number, adminUserId: number, reason?: string) {
    const db = getKnex();
    const tableName = 'full_final_settlements';
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    // Was resetting to 'draft' — indistinguishable from a settlement that
    // was never submitted at all, and the UI's "Reverse" tab (which filters
    // for a rejected/reverse status) was permanently empty as a result.
    await db(tableName).where('id', settlementId).update({
      status: 'rejected',
      settlement_notes: reason ? `Rejected by Admin: ${reason}` : 'Rejected by Admin',
      updated_at: new Date()
    });

    return { ...settlement, status: 'rejected' };
  }

  // ── GRATUITY POLICY RULES (Auto-Ensures DB Table & CRUD) ───────────────
  async ensureGratuityTable() {
    const db = getKnex();
    const hasTable = await db.schema.hasTable('payroll_gratuity_rules');
    if (!hasTable) {
      await db.schema.createTable('payroll_gratuity_rules', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable();
        table.integer('organization_id').unsigned().notNullable();
        table.string('name', 255).notNullable().defaultTo('Standard Gratuity Policy');
        table.string('eligible_years_operator', 20).defaultTo('>=');
        table.decimal('eligible_years_value', 5, 2).defaultTo(5.0);
        table.string('rounding_rule', 50).defaultTo('round_up');
        table.text('formula').defaultTo('(15 * [Basic] * [Tenure]) / 26');
        table.json('companies').nullable();
        table.json('locations').nullable();
        table.json('departments').nullable();
        table.json('grades').nullable();
        table.json('employment_types').nullable();
        table.boolean('is_active').defaultTo(true);
        table.integer('created_by').nullable();
        table.integer('updated_by').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
    }
  }

  async getGratuityRules(ctx: TenantContext) {
    const db = getKnex();
    await this.ensureGratuityTable();
    const rows = await db('payroll_gratuity_rules')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('id', 'desc');

    return rows.map((r: any) => {
      let comps = []; try { comps = typeof r.companies === 'string' ? JSON.parse(r.companies) : (r.companies || []); } catch {}
      let locs = []; try { locs = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch {}
      let depts = []; try { depts = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch {}
      let grades = []; try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch {}
      let empTypes = []; try { empTypes = typeof r.employment_types === 'string' ? JSON.parse(r.employment_types) : (r.employment_types || []); } catch {}

      return {
        ...r,
        companies: comps,
        locations: locs,
        departments: depts,
        grades: grades,
        employmentTypes: empTypes,
        eligibleYearsOperator: r.eligible_years_operator || '>=',
        eligibleYearsValue: Number(r.eligible_years_value ?? 5),
        roundingRule: r.rounding_rule || 'round_up',
        isActive: Boolean(r.is_active ?? true)
      };
    });
  }

  async saveGratuityRule(ctx: TenantContext, data: any) {
    const db = getKnex();
    await this.ensureGratuityTable();
    const id = data.id ? Number(data.id) : null;

    const payload = {
      name: data.name || 'Standard Gratuity Policy',
      eligible_years_operator: data.eligibleYearsOperator || data.eligible_years_operator || '>=',
      eligible_years_value: Number(data.eligibleYearsValue ?? data.eligible_years_value ?? 5),
      rounding_rule: data.roundingRule || data.rounding_rule || 'round_up',
      formula: data.formula || '(15 * [Basic] * [Tenure]) / 26',
      companies: JSON.stringify(data.companies || ['All']),
      locations: JSON.stringify(data.locations || ['All']),
      departments: JSON.stringify(data.departments || ['All']),
      grades: JSON.stringify(data.grades || ['All']),
      employment_types: JSON.stringify(data.employmentTypes || data.employment_types || ['Regular']),
      is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
      updated_by: ctx.userId,
      updated_at: new Date()
    };

    if (id) {
      await db('payroll_gratuity_rules')
        .where('id', id)
        .where('organization_id', ctx.organizationId)
        .update(payload);
      return { id, ...payload };
    } else {
      const [insertedId] = await db('payroll_gratuity_rules').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        created_by: ctx.userId,
        created_at: new Date(),
        ...payload
      });
      return { id: insertedId, ...payload };
    }
  }

  async deleteGratuityRule(ctx: TenantContext, id: number) {
    const db = getKnex();
    await this.ensureGratuityTable();
    await db('payroll_gratuity_rules')
      .where('id', id)
      .where('organization_id', ctx.organizationId)
      .update({ deleted_at: new Date(), is_active: false });
    return { success: true, message: 'Gratuity rule deleted' };
  }
}








