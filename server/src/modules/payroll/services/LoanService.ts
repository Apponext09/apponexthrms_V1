import { v4 as uuidv4 } from 'uuid';
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
    if (input.loanAmount <= 0) {
      throw new ValidationError('Loan amount must be greater than 0');
    }

    if (input.tenureMonths <= 0) {
      throw new ValidationError('Tenure must be greater than 0');
    }

    // Calculate EMI and total amount
    const rate = (input.interestRate || 0) / 100 / 12;
    const emi = rate > 0
      ? (input.loanAmount * rate * Math.pow(1 + rate, input.tenureMonths)) /
        (Math.pow(1 + rate, input.tenureMonths) - 1)
      : input.loanAmount / input.tenureMonths;

    const totalAmount = emi * input.tenureMonths;

    const loan = await this.loanRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      loan_type: input.loanType,
      loan_amount: input.loanAmount,
      loan_date: input.loanDate,
      tenure_months: input.tenureMonths,
      interest_rate: input.interestRate,
      emi: Math.round(emi * 100) / 100,
      total_amount_with_interest: Math.round(totalAmount * 100) / 100,
      repaid_amount: 0,
      outstanding_amount: Math.round(totalAmount * 100) / 100,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    // Create repayment schedule
    await this.createRepaymentSchedule(ctx, loan);

    await this.auditService.log(ctx, 'employee_loans', loan.id, 'create', { loan });

    return loan;
  }

  private async createRepaymentSchedule(ctx: TenantContext, loan: any) {
    const startDate = new Date(loan.loan_date);

    for (let i = 1; i <= loan.tenure_months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const interestAmount = loan.interest_rate
        ? Math.round((loan.outstanding_amount * (loan.interest_rate / 100 / 12)) * 100) / 100
        : 0;

      const principalAmount = Math.round((loan.emi - interestAmount) * 100) / 100;

      await this.repaymentRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        loan_id: loan.id,
        emi_number: i,
        emi_amount: loan.emi,
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

  async getEmployeeLoans(ctx: TenantContext, employeeId: number) {
    return this.loanRepo.getForEmployee(ctx, employeeId);
  }

  async getActiveLoans(ctx: TenantContext, employeeId: number) {
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

    await this.notificationService.send(ctx, {
      type: 'loan_closed',
      recipient_type: 'employee',
      recipient_id: loan.employee_id.toString(),
      title: 'Loan Closed',
      message: `Your ${loan.loan_type} loan has been closed`,
      action_url: `/payroll/loans/${loanId}`
    });

    return loan;
  }
}


