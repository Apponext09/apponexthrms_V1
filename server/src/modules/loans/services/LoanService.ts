import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { EmployeeLoanRepository } from '../repositories/EmployeeLoanRepository';
import { LoanRepaymentRepository } from '../repositories/LoanRepaymentRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

interface CreateLoanInput {
  employeeId: number;
  loanType: string;
  loanTypeId?: string;
  loanAmount: number;
  loanDate: string;
  tenureMonths: number;
  interestRate?: number;
  status?: 'pending' | 'active' | 'approved' | 'rejected';
}

function withSnakeAliases(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(withSnakeAliases);
  const out: Record<string, any> = { ...obj };
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (!(snake in out)) out[snake] = v;
  }
  return out;
}

export class LoanService {
  private loanRepo: EmployeeLoanRepository;
  private repaymentRepo: LoanRepaymentRepository;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.loanRepo = new EmployeeLoanRepository();
    this.repaymentRepo = new LoanRepaymentRepository();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
  }

  async createLoan(ctx: TenantContext, input: CreateLoanInput) {
    const loanAmount = input.loanAmount || (input as any).amount || 0;
    const tenureMonths = input.tenureMonths || (input as any).tenure_months || 1;

    if (loanAmount <= 0) {
      throw new ValidationError('Loan amount must be greater than 0');
    }

    if (tenureMonths <= 0) {
      throw new ValidationError('Tenure must be greater than 0');
    }

    const db = getKnex();

    const loanTypeId = input.loanTypeId || (input as any).loan_type_id;
    let resolvedType: any = null;
    let interestRate = input.interestRate || 0;
    let loanTypeName = input.loanType || 'personal';

    if (loanTypeId) {
      resolvedType = withSnakeAliases(await db('payroll_loan_types')
        .where({ id: loanTypeId, organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null));

      if (!resolvedType) {
        throw new ValidationError('Selected loan type was not found');
      }

      const minAmount = Number(resolvedType.minAmount ?? 0);
      const maxAmount = Number(resolvedType.maxAmount ?? Infinity);
      const minTerm = Number(resolvedType.minTermMonths ?? 1);
      const maxTerm = Number(resolvedType.maxTermMonths ?? Infinity);

      if (loanAmount < minAmount || loanAmount > maxAmount) {
        throw new ValidationError(`Loan amount must be between ₹${minAmount.toLocaleString('en-IN')} and ₹${maxAmount.toLocaleString('en-IN')} for this loan type`);
      }
      if (tenureMonths < minTerm || tenureMonths > maxTerm) {
        throw new ValidationError(`Tenure must be between ${minTerm} and ${maxTerm} months for this loan type`);
      }

      interestRate = Number(resolvedType.interestRate ?? 0);
      loanTypeName = resolvedType.name || loanTypeName;
    }

    const rate = interestRate / 100 / 12;
    const emi = rate > 0
      ? (loanAmount * rate * Math.pow(1 + rate, tenureMonths)) /
        (Math.pow(1 + rate, tenureMonths) - 1)
      : loanAmount / tenureMonths;

    const totalAmount = emi * tenureMonths;

    const creatorUser = await db('users').where('id', ctx.userId).first().catch(() => null);
    const creatorUserEmpId = creatorUser?.employeeId ?? creatorUser?.employee_id;
    const creatorEmp = creatorUserEmpId
      ? await db('employees').where('id', creatorUserEmpId).first().catch(() => null)
      : await db('employees').whereRaw('LOWER(email) = ?', [creatorUser?.email?.toLowerCase() || '']).first().catch(() => null);

    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', ctx.userId)
      .where('ur.organization_id', ctx.organizationId)
      .pluck('r.code')
      .catch(() => []);

    const isHRorAdmin = userRoles.some((r: string) => ['organization_admin', 'super_admin', 'admin', 'hr', 'hr_admin', 'hr_manager'].includes(r)) ||
      creatorUser?.role === 'admin' || creatorUser?.role === 'organization_admin' || creatorUser?.role === 'super_admin';

    const isSelfRequest = creatorEmp && Number(creatorEmp.id) === Number(input.employeeId);
    const initialStatus = isHRorAdmin && !isSelfRequest && input.status === 'active' ? 'active' : 'pending';

    const loanData: Record<string, any> = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      loan_type: loanTypeName,
      loan_amount: loanAmount,
      loan_date: input.loanDate,
      tenure_months: tenureMonths,
      interest_rate: interestRate,
      monthly_emi: emi,
      emi_amount: emi,
      total_amount: totalAmount,
      balance_amount: totalAmount,
      status: initialStatus,
      disbursement_date: initialStatus === 'active' ? input.loanDate : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    };
    if (loanTypeId) {
      loanData.loan_type_id = Number(loanTypeId);
    }

    const [id] = await db('employee_loans').insert(loanData);
    const loan = await this.loanRepo.findById(ctx, id);

    if (initialStatus === 'active') {
      await this.generateRepaymentSchedule(ctx, id, loanData);
    }

    await this.auditService.log(ctx, {
      action: 'LOAN_CREATED',
      entity: 'employee_loan',
      entityId: id,
      details: { input, initialStatus },
    });

    return loan;
  }

  async getEmployeeLoans(ctx: TenantContext, employeeId?: number) {
    const db = getKnex();
    let query = db('employee_loans as el')
      .leftJoin('employees as e', 'el.employee_id', 'e.id')
      .where('el.organization_id', ctx.organizationId)
      .whereNull('el.deleted_at')
      .select(
        'el.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code'
      )
      .orderBy('el.created_at', 'desc');

    if (employeeId) {
      query = query.where('el.employee_id', employeeId);
    }

    const rows = await query;
    return rows.map(withSnakeAliases);
  }

  async getActiveLoans(ctx: TenantContext, employeeId?: number) {
    const db = getKnex();
    let query = db('employee_loans as el')
      .leftJoin('employees as e', 'el.employee_id', 'e.id')
      .where('el.organization_id', ctx.organizationId)
      .where('el.status', 'active')
      .whereNull('el.deleted_at')
      .select(
        'el.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code'
      );

    if (employeeId) {
      query = query.where('el.employee_id', employeeId);
    }

    const rows = await query;
    return rows.map(withSnakeAliases);
  }

  async getLoan(ctx: TenantContext, id: number) {
    const db = getKnex();
    const loan = await db('employee_loans as el')
      .leftJoin('employees as e', 'el.employee_id', 'e.id')
      .where('el.id', id)
      .where('el.organization_id', ctx.organizationId)
      .whereNull('el.deleted_at')
      .select(
        'el.*',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.employee_code'
      )
      .first();

    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    return withSnakeAliases(loan);
  }

  async updateLoan(ctx: TenantContext, id: number, data: any) {
    const loan = await this.getLoan(ctx, id);
    if (!loan) throw new NotFoundError('Loan not found');

    const db = getKnex();
    const updateData: Record<string, any> = {
      updated_by: ctx.userId,
      updated_at: new Date(),
    };

    if (data.status) updateData.status = data.status;
    if (data.loan_amount || data.loanAmount) updateData.loan_amount = data.loan_amount || data.loanAmount;
    if (data.tenure_months || data.tenureMonths) updateData.tenure_months = data.tenure_months || data.tenureMonths;
    if (data.interest_rate !== undefined || data.interestRate !== undefined) {
      updateData.interest_rate = data.interest_rate !== undefined ? data.interest_rate : data.interestRate;
    }
    if (data.rejection_reason || data.rejectionReason) updateData.rejection_reason = data.rejection_reason || data.rejectionReason;

    await db('employee_loans')
      .where({ id, organization_id: ctx.organizationId })
      .update(updateData);

    return this.getLoan(ctx, id);
  }

  async approveLoan(ctx: TenantContext, id: number) {
    const loan = await this.getLoan(ctx, id);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (loan.status !== 'pending') {
      throw new ValidationError('Only pending loans can be approved');
    }

    const db = getKnex();
    const now = new Date();
    await db('employee_loans')
      .where({ id, organization_id: ctx.organizationId })
      .update({
        status: 'active',
        approved_by: ctx.userId,
        approved_at: now,
        disbursement_date: now.toISOString().slice(0, 10),
        updated_by: ctx.userId,
        updated_at: now,
      });

    await this.generateRepaymentSchedule(ctx, id, loan);

    await this.auditService.log(ctx, {
      action: 'LOAN_APPROVED',
      entity: 'employee_loan',
      entityId: id,
    });

    return this.getLoan(ctx, id);
  }

  async rejectLoan(ctx: TenantContext, id: number, reason?: string) {
    const loan = await this.getLoan(ctx, id);
    if (!loan) {
      throw new NotFoundError('Loan not found');
    }

    if (loan.status !== 'pending') {
      throw new ValidationError('Only pending loans can be rejected');
    }

    const db = getKnex();
    const now = new Date();
    await db('employee_loans')
      .where({ id, organization_id: ctx.organizationId })
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        updated_by: ctx.userId,
        updated_at: now,
      });

    await this.auditService.log(ctx, {
      action: 'LOAN_REJECTED',
      entity: 'employee_loan',
      entityId: id,
      details: { reason },
    });

    return this.getLoan(ctx, id);
  }

  async getRepaymentSchedule(ctx: TenantContext, loanId: number) {
    const repayments = await this.repaymentRepo.findByLoan(ctx, loanId);
    return repayments.map(withSnakeAliases);
  }

  async getNextEmi(ctx: TenantContext, loanId: number) {
    const db = getKnex();
    const next = await db('loan_repayments')
      .where({ loan_id: loanId, organization_id: ctx.organizationId, status: 'pending' })
      .whereNull('deleted_at')
      .orderBy('installment_number', 'asc')
      .first();

    return next ? withSnakeAliases(next) : null;
  }

  private async generateRepaymentSchedule(ctx: TenantContext, loanId: number, loan: any) {
    const db = getKnex();
    const tenureMonths = Number(loan.tenure_months || loan.tenureMonths || 1);
    const emi = Number(loan.monthly_emi || loan.emi_amount || loan.emi || 0);
    const startDate = new Date(loan.disbursement_date || loan.loan_date || new Date());

    const repayments = [];
    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      repayments.push({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        loan_id: loanId,
        employee_id: loan.employee_id || loan.employeeId,
        installment_number: i,
        due_date: dueDate.toISOString().slice(0, 10),
        amount: emi,
        status: 'pending',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    }

    if (repayments.length > 0) {
      await db('loan_repayments').insert(repayments);
    }
  }

  async getLoanTypes(ctx: TenantContext) {
    const db = getKnex();
    const rows = await db('payroll_loan_types')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('id', 'asc');
    return rows.map(withSnakeAliases);
  }

  async saveLoanType(ctx: TenantContext, data: any) {
    const db = getKnex();
    const name = data.name || data.loanTypeName || data.loan_type_name;
    if (!name) throw new ValidationError('Loan type name is required');

    const payload: Record<string, any> = {
      organization_id: ctx.organizationId,
      name,
      code: (data.code || name.replace(/\s+/g, '_').toUpperCase()).slice(0, 30),
      description: data.description || '',
      interest_rate: Number(data.interestRate ?? data.interest_rate ?? 0),
      max_amount: Number(data.maxAmount ?? data.max_amount ?? 500000),
      min_amount: Number(data.minAmount ?? data.min_amount ?? 1000),
      max_term_months: Number(data.maxTermMonths ?? data.max_term_months ?? 60),
      min_term_months: Number(data.minTermMonths ?? data.min_term_months ?? 1),
      is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      updated_at: new Date(),
    };

    if (data.id) {
      await db('payroll_loan_types').where({ id: data.id, organization_id: ctx.organizationId }).update(payload);
      return db('payroll_loan_types').where({ id: data.id }).first();
    } else {
      payload.uuid = uuidv4();
      payload.created_at = new Date();
      const [id] = await db('payroll_loan_types').insert(payload);
      return db('payroll_loan_types').where({ id }).first();
    }
  }

  async deleteLoanType(ctx: TenantContext, id: number) {
    const db = getKnex();
    await db('payroll_loan_types')
      .where({ id, organization_id: ctx.organizationId })
      .update({ deleted_at: new Date() });
    return { success: true };
  }
}
