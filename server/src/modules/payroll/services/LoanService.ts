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
  loanType: 'personal' | 'vehicle' | 'home' | 'education';
  loanAmount: number;
  loanDate: string;
  tenureMonths: number;
  interestRate?: number;
  status?: 'pending' | 'active' | 'approved' | 'rejected';
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

    // Calculate EMI and total amount
    const rate = (input.interestRate || 0) / 100 / 12;
    const emi = rate > 0
      ? (loanAmount * rate * Math.pow(1 + rate, tenureMonths)) /
        (Math.pow(1 + rate, tenureMonths) - 1)
      : loanAmount / tenureMonths;

    const totalAmount = emi * tenureMonths;
    const db = getKnex();

    const creatorUser = await db('users').where('id', ctx.userId).first().catch(() => null);
    const creatorEmp = creatorUser?.employee_id
      ? await db('employees').where('id', creatorUser.employee_id).first().catch(() => null)
      : await db('employees').whereRaw('LOWER(email) = ?', [creatorUser?.email?.toLowerCase() || '']).first().catch(() => null);

    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', ctx.userId)
      .select('r.code')
      .catch(() => []);
    const roleCodes = userRoles.map((r: any) => r.code);
    const isOrgAdmin = roleCodes.includes('organization_admin') || roleCodes.includes('super_admin');

    let targetEmpId = input.employeeId || creatorEmp?.id || ctx.userId;
    let loanStatus = input.status || 'pending';

    if (!isOrgAdmin && creatorEmp?.id) {
      targetEmpId = creatorEmp.id;
      loanStatus = 'pending';
    }

    const calculatedEmi = Math.round(emi * 100) / 100;
    const calculatedTotal = Math.round(totalAmount * 100) / 100;
    const firstUser = await db('users').first().catch(() => null);
    const validUserId = (ctx.userId && ctx.userId > 0) ? ctx.userId : (creatorUser?.id || firstUser?.id || 35);

    // Use the context organization ID — never undefined
    const orgId = ctx.organizationId;

    const [insertedId] = await db('employee_loans').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: targetEmpId,
      loan_type: (input.loanType || 'personal').toString(),
      amount: loanAmount,
      loan_amount: loanAmount,
      loan_date: input.loanDate || new Date().toISOString().slice(0, 10),
      tenure_months: tenureMonths,
      interest_rate: input.interestRate || 0,
      monthly_emi: calculatedEmi,
      emi: calculatedEmi,
      total_amount_with_interest: calculatedTotal,
      repaid_amount: 0,
      outstanding_amount: calculatedTotal,
      reason: (input as any).reason || 'Personal Financial Request',
      status: loanStatus,
      created_by: validUserId,
      updated_by: validUserId
    }).catch(async (err: any) => {
      // Fallback insert if extra columns don't exist
      return await db('employee_loans').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: targetEmpId,
        loan_type: 'personal_loan',
        amount: loanAmount,
        tenure_months: tenureMonths,
        interest_rate: input.interestRate || 0,
        monthly_emi: calculatedEmi,
        reason: (input as any).reason || 'Personal Financial Request',
        status: loanStatus,
        created_by: validUserId
      });
    });

    const loan = await db('employee_loans').where('id', insertedId).first();

    // Create repayment schedule if loan is immediately active or approved
    if (loanStatus === 'active' || loanStatus === 'approved') {
      await this.createRepaymentSchedule(ctx, loan);
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loan.id,
      afterState: { loan }
    });

    return loan;
  }

  async approveLoan(ctx: TenantContext, loanId: number) {
    const db = getKnex();
    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', ctx.userId)
      .select('r.code');
    const roleCodes = userRoles.map((r: any) => r.code);
    const isOrgAdmin = roleCodes.includes('organization_admin') || roleCodes.includes('super_admin');

    if (!isOrgAdmin) {
      throw new ValidationError('Only Organization Admin has permission to approve loan requests.');
    }

    const loan = await this.loanRepo.getById(ctx, loanId);
    if (!loan) throw new NotFoundError('Loan not found');

    const updated = await this.loanRepo.update(ctx, loanId, {
      status: 'active',
      updated_by: ctx.userId
    });

    const existingSchedule = await this.repaymentRepo.getForLoan(ctx, loanId);
    if (!existingSchedule || existingSchedule.length === 0) {
      await this.createRepaymentSchedule(ctx, loan);
    }

    await this.auditService.log(ctx, {
      action: 'APPROVE',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loanId,
      afterState: { loan: updated }
    });

    const recipientEmpId = loan.employee_id || loan.employeeId || loan.created_by || loan.createdBy;
    if (recipientEmpId) {
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'loan_approved',
        recipientId: recipientEmpId,
        variables: {
          loanId: String(loanId),
          amount: String(loan.loan_amount || loan.loanAmount || 0),
          status: 'active'
        }
      }).catch(() => {});
    }

    return updated;
  }

  async rejectLoan(ctx: TenantContext, loanId: number) {
    const db = getKnex();
    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', ctx.userId)
      .select('r.code');
    const roleCodes = userRoles.map((r: any) => r.code);
    const isOrgAdmin = roleCodes.includes('organization_admin') || roleCodes.includes('super_admin');

    if (!isOrgAdmin) {
      throw new ValidationError('Only Organization Admin has permission to reject loan requests.');
    }

    const loan = await this.loanRepo.getById(ctx, loanId);
    if (!loan) throw new NotFoundError('Loan not found');

    const updated = await this.loanRepo.update(ctx, loanId, {
      status: 'rejected',
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'REJECT',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loanId,
      afterState: { loan: updated }
    });

    const recipientEmpId = loan.employee_id || loan.employeeId || loan.created_by || loan.createdBy;
    if (recipientEmpId) {
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'loan_rejected',
        recipientId: recipientEmpId,
        variables: {
          loanId: String(loanId),
          amount: String(loan.loan_amount || loan.loanAmount || 0),
          status: 'rejected'
        }
      }).catch(() => {});
    }

    return updated;
  }

  private async createRepaymentSchedule(ctx: TenantContext, loan: any) {
    const loanDateStr = loan.loan_date || loan.loanDate || new Date().toISOString().split('T')[0];
    const startDate = new Date(loanDateStr);
    const tenureMonths = Number(loan.tenure_months || loan.tenureMonths || 12);
    const interestRate = Number(loan.interest_rate || loan.interestRate || 0);
    const outstandingAmount = Number(loan.outstanding_amount || loan.outstandingAmount || loan.loan_amount || loan.loanAmount || 0);
    const emi = Number(loan.emi || (tenureMonths > 0 ? outstandingAmount / tenureMonths : 0));

    for (let i = 1; i <= tenureMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = interestRate > 0
        ? Math.round((outstandingAmount * (interestRate / 100 / 12)) * 100) / 100
        : 0;

      const principalAmount = Math.round((emi - interestAmount) * 100) / 100;

      await this.repaymentRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        loan_id: loan.id,
        emi_number: i,
        emi_amount: Math.round(emi * 100) / 100,
        interest_amount: interestAmount,
        principal_amount: principalAmount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
        created_by: ctx.userId,
        updated_by: ctx.userId
      });
    }
  }

  async getLoan(ctx: TenantContext, loanId: number) {
    return this.loanRepo.getById(ctx, loanId);
  }

  async getEmployeeLoans(ctx: TenantContext, employeeId?: number) {
    const db = getKnex();
    // Strictly filter by the requesting org only — no cross-org data leaks
    const activeOrgId = ctx.organizationId;
    let query = db('employee_loans')
      .leftJoin('employees', 'employee_loans.employee_id', 'employees.id')
      .where('employee_loans.organization_id', activeOrgId)
      .whereNull('employee_loans.deleted_at');

    if (employeeId && !isNaN(employeeId) && employeeId > 0) {
      query = query.where('employee_loans.employee_id', employeeId);
    }

    const loans = await query
      .select(
        'employee_loans.*',
        'employees.first_name as firstName',
        'employees.last_name as lastName',
        'employees.employee_code as employeeCode',
        'employees.email as email'
      )
      .orderBy('employee_loans.created_at', 'desc');

    return loans.map(l => {
      const empId = l.employeeId || l.employee_id;
      const fn = l.firstName || l.first_name || '';
      const ln = l.lastName || l.last_name || '';
      const name = `${fn} ${ln}`.trim() || l.email || `Employee #${empId}`;
      const code = l.employeeCode || l.employee_code || `EMP-${empId}`;
      const amount = Number(l.loanAmount || l.loan_amount || 0);

      return {
        ...l,
        employee_id: empId,
        employeeId: empId,
        first_name: fn,
        firstName: fn,
        last_name: ln,
        lastName: ln,
        employee_name: name,
        employeeName: name,
        employee_code: code,
        employeeCode: code,
        loan_amount: amount,
        loanAmount: amount,
        loan_type: l.loanType || l.loan_type,
        loanType: l.loanType || l.loan_type,
        tenure_months: l.tenureMonths || l.tenure_months,
        tenureMonths: l.tenureMonths || l.tenure_months,
        interest_rate: l.interestRate || l.interest_rate,
        interestRate: l.interestRate || l.interest_rate,
        outstanding_amount: Number(l.outstandingAmount || l.outstanding_amount || 0),
        outstandingAmount: Number(l.outstandingAmount || l.outstanding_amount || 0),
        repaid_amount: Number(l.repaidAmount || l.repaid_amount || 0),
        repaidAmount: Number(l.repaidAmount || l.repaid_amount || 0),
      };
    });
  }

  async getActiveLoans(ctx: TenantContext, employeeId?: number) {
    if (!employeeId || isNaN(employeeId)) {
      return this.loanRepo.getActiveLoansForPayroll(ctx);
    }
    return this.loanRepo.getActiveLoans(ctx, employeeId);
  }

  async getRepaymentSchedule(ctx: TenantContext, loanId: number) {
    return this.repaymentRepo.getForLoan(ctx, loanId);
  }

  async getNextEMI(ctx: TenantContext, loanId: number) {
    return this.repaymentRepo.getNextEMI(ctx, loanId);
  }

  async processRepayment(ctx: TenantContext, loanId: number, amount: number, payrollRunId?: number) {
    const loan = await this.loanRepo.getById(ctx, loanId);
    if (!loan) throw new NotFoundError('Loan not found');

    const emi = await this.repaymentRepo.getNextEMI(ctx, loanId);
    if (!emi) {
      throw new ValidationError('No pending EMIs for this loan');
    }

    // Mark EMI as paid
    await this.repaymentRepo.update(ctx, emi.id, {
      status: 'paid',
      paid_date: new Date().toISOString(),
      updated_by: ctx.userId
    });

    // Update loan
    const newRepaidAmount = loan.repaid_amount + amount;
    const newOutstandingAmount = Math.max(0, loan.outstanding_amount - amount);

    await this.loanRepo.update(ctx, loanId, {
      repaid_amount: newRepaidAmount,
      outstanding_amount: newOutstandingAmount,
      status: newOutstandingAmount <= 0 ? 'closed' : 'active',
      updated_by: ctx.userId
    });

    return { loan, emi, newOutstandingAmount };
  }

  async closeLoan(ctx: TenantContext, loanId: number) {
    const loan = await this.loanRepo.getById(ctx, loanId);
    if (!loan) throw new NotFoundError('Loan not found');

    await this.loanRepo.update(ctx, loanId, {
      status: 'closed',
      outstanding_amount: 0,
      updated_by: ctx.userId
    });

    await this.notificationService.sendNotification(ctx, {
      eventCode: 'loan_closed',
      recipientId: loan.employee_id,
      variables: { loanId: String(loanId), loanType: loan.loan_type }
    } as any);

    return loan;
  }
}


