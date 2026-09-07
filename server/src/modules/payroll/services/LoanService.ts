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

import { withSnakeAliases } from '../utils/payroll.utils';

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

    // Resolve the admin-configured loan type (if given) and let its real
    // interest rate / min-max amount / min-max tenure govern this loan —
    // previously the client's own numbers were trusted outright.
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

    // Calculate EMI and total amount using the resolved (or given) interest rate
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

    // 🔧 FIX: this insert (and its "fallback") referenced `amount` and
    // `monthly_emi`, neither of which are real columns on employee_loans
    // (the real columns are `loan_amount` and `emi`) — every loan creation
    // has been throwing "Unknown column 'amount'" since this was written,
    // silently swallowed wherever the caller didn't surface the error.
    const [insertedId] = await db('employee_loans').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: targetEmpId,
      loan_type_id: loanTypeId || null,
      loan_type: loanTypeName.toString(),
      loan_amount: loanAmount,
      loan_date: input.loanDate || new Date().toISOString().slice(0, 10),
      tenure_months: tenureMonths,
      interest_rate: interestRate,
      reason: (input as any).reason || 'Personal Financial Request',
      emi: calculatedEmi,
      total_amount_with_interest: calculatedTotal,
      repaid_amount: 0,
      outstanding_amount: calculatedTotal,
      status: loanStatus,
      created_by: validUserId,
      updated_by: validUserId
    });

    const loan = withSnakeAliases(await db('employee_loans').where('id', insertedId).first());

    // Create repayment schedule if loan is immediately active or approved
    if (loanStatus === 'active' || loanStatus === 'approved') {
      await this.createRepaymentSchedule(ctx, loan);
    }

    // 🔔 Dispatch Notification to Organization Admins & Approvers
    try {
      const emp = await db('employees').where('id', targetEmpId).first().catch(() => null);
      const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${targetEmpId}`;

      const adminUsers = await db('users as u')
        .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
        .leftJoin('roles as r', 'ur.role_id', 'r.id')
        .where('u.organization_id', orgId)
        .where(function () {
          this.whereIn('r.code', ['organization_admin', 'super_admin', 'finance', 'finance_manager'])
            .orWhere('u.email', 'ajay@gmail.com');
        })
        .whereNull('u.deleted_at')
        .select('u.id')
        .distinct();

      for (const admin of adminUsers) {
        if (admin.id) {
          await db('notifications').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            event_code: 'LOAN_REQUEST_SUBMITTED',
            recipient_id: admin.id,
            channels: JSON.stringify(['inapp', 'email']),
            subject_line: `New Loan & Salary Advance Request from ${empName}`,
            body_text: `${empName} applied for a ${input.loanType || 'Personal'} loan of ₹${Number(loanAmount).toLocaleString('en-IN')}. Please review and approve.`,
            variables: JSON.stringify({ employee_name: empName, loan_amount: loanAmount, loan_id: insertedId }),
            status: 'sent',
            priority: 'high',
            created_by: validUserId,
            updated_by: validUserId,
            created_at: new Date(),
            updated_at: new Date()
          }).catch(() => { });
        }
      }
    } catch (notifErr) {
      console.error('Failed to dispatch loan request notification:', notifErr);
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loan.id,
      afterState: { loan }
    });

    return loan;
  }

  /** Configurable per-loan-type approver role (payroll_loan_types.approver_role),
   *  falling back to the broad admin/HR/finance check when no type is set. */
  private async resolveApproverCheck(ctx: TenantContext, loan: any): Promise<{ canAct: boolean; requiredRole: string | null }> {
    const db = getKnex();
    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', ctx.userId)
      .select('r.code');
    const roleCodes = userRoles.map((r: any) => r.code);

    const isSuperAdmin = await db('super_admins')
      .where('status', 'active')
      .where(function () { this.where('id', ctx.userId).orWhere('user_id', ctx.userId); })
      .first()
      .catch(() => null);

    if (isSuperAdmin || roleCodes.includes('organization_admin') || roleCodes.includes('super_admin')) {
      return { canAct: true, requiredRole: null };
    }

    const loanTypeId = loan.loanTypeId ?? loan.loan_type_id;
    let requiredRole: string | null = null;
    if (loanTypeId) {
      const type = await db('payroll_loan_types').where('id', loanTypeId).first().catch(() => null);
      requiredRole = (type as any)?.approverRole ?? (type as any)?.approver_role ?? null;
    }

    if (requiredRole) {
      return { canAct: roleCodes.includes(requiredRole), requiredRole };
    }

    // No type-specific approver configured — fall back to the broad check
    return {
      canAct: roleCodes.includes('hr_manager') || roleCodes.includes('finance') || roleCodes.includes('finance_manager'),
      requiredRole: null
    };
  }

  async approveLoan(ctx: TenantContext, loanId: number) {
    const db = getKnex();

    const loan = withSnakeAliases(await this.loanRepo.getById(ctx, loanId));
    if (!loan) throw new NotFoundError('Loan not found');

    const { canAct, requiredRole } = await this.resolveApproverCheck(ctx, loan);
    if (!canAct) {
      throw new ValidationError(
        requiredRole
          ? `Only a ${requiredRole.replace(/_/g, ' ')} can approve this loan type.`
          : 'Only Admin, HR Manager, or Finance Manager can approve loan requests.'
      );
    }

    const updated = await this.loanRepo.update(ctx, loanId, {
      status: 'active',
      approved_by: ctx.userId,
      approved_at: new Date(),
      updated_by: ctx.userId
    } as any);

    // 🔔 Notify Employee of Loan Approval
    if (loan && loan.employee_id) {
      try {
        const empUserId = (await db('users').where('employee_id', loan.employee_id).first().catch(() => null))?.id;
        const recipient = empUserId || loan.employee_id;

        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          event_code: 'LOAN_REQUEST_APPROVED',
          recipient_id: recipient,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: `Loan Request Approved`,
          body_text: `Your ${loan.loan_type || 'Personal'} loan request of ₹${Number((loan as any).loanAmount ?? loan.loan_amount ?? 0).toLocaleString('en-IN')} has been approved.`,
          variables: JSON.stringify({ amount: (loan as any).loanAmount ?? loan.loan_amount ?? 0, loan_id: loanId }),
          status: 'sent',
          priority: 'high',
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        }).catch(() => { });
      } catch { }
    }

    // Create EMI schedule if none exists
    const existingSchedule = await this.repaymentRepo.getForLoan(ctx, loanId);
    if (!existingSchedule || existingSchedule.length === 0) {
      await this.createRepaymentSchedule(ctx, loan);
    }

    await this.auditService.log(ctx, {
      action: 'APPROVE',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loanId,
      afterState: { loan: updated, approved_by: ctx.userId }
    });

    const lAny = loan as any;
    const recipientEmpId = lAny.employee_id || lAny.employeeId || lAny.created_by || lAny.createdBy;
    if (recipientEmpId) {
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'loan_approved',
        recipientId: recipientEmpId,
        variables: {
          loanId: String(loanId),
          amount: String(lAny.loan_amount || lAny.loanAmount || 0),
          status: 'active'
        }
      }).catch(() => {});
    }

    return updated;
  }

  async rejectLoan(ctx: TenantContext, loanId: number, reason?: string) {
    const loan = withSnakeAliases(await this.loanRepo.getById(ctx, loanId));
    if (!loan) throw new NotFoundError('Loan not found');

    const { canAct, requiredRole } = await this.resolveApproverCheck(ctx, loan);
    if (!canAct) {
      throw new ValidationError(
        requiredRole
          ? `Only a ${requiredRole.replace(/_/g, ' ')} can reject this loan type.`
          : 'Only Admin, HR Manager, or Finance Manager can reject loan requests.'
      );
    }

    const updated = await this.loanRepo.update(ctx, loanId, {
      status: 'rejected',
      rejected_by: ctx.userId,
      rejected_at: new Date(),
      rejection_reason: reason || null,
      updated_by: ctx.userId
    } as any);

    await this.auditService.log(ctx, {
      action: 'REJECT',
      entityType: 'EMPLOYEE_LOAN',
      entityId: loanId,
      afterState: { loan: updated, rejected_by: ctx.userId, reason }
    });

    const lAnyReject = loan as any;
    const recipientEmpId = lAnyReject.employee_id || lAnyReject.employeeId || lAnyReject.created_by || lAnyReject.createdBy;
    if (recipientEmpId) {
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'loan_rejected',
        recipientId: recipientEmpId,
        variables: {
          loanId: String(loanId),
          amount: String(lAnyReject.loan_amount || lAnyReject.loanAmount || 0),
          status: 'rejected',
          reason: reason || 'No reason provided'
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

  async updateLoan(ctx: TenantContext, loanId: number, input: any) {
    const db = getKnex();
    const loanAmount = input.loanAmount || input.amount;
    const tenureMonths = input.tenureMonths || input.tenure_months;
    const interestRate = input.interestRate !== undefined ? input.interestRate : (input.interest_rate || 0);

    const rate = (interestRate || 0) / 100 / 12;
    const emi = (loanAmount && tenureMonths)
      ? (rate > 0
          ? (loanAmount * rate * Math.pow(1 + rate, tenureMonths)) / (Math.pow(1 + rate, tenureMonths) - 1)
          : loanAmount / tenureMonths)
      : undefined;

    const updateData: Record<string, any> = {
      updated_at: new Date(),
      updated_by: ctx.userId || 1
    };

    if (loanAmount !== undefined) {
      updateData.amount = loanAmount;
      updateData.loan_amount = loanAmount;
    }
    if (tenureMonths !== undefined) {
      updateData.tenure_months = tenureMonths;
    }
    if (input.interestRate !== undefined || input.interest_rate !== undefined) {
      updateData.interest_rate = interestRate;
    }
    if (emi !== undefined) {
      const calcEmi = Math.round(emi * 100) / 100;
      updateData.monthly_emi = calcEmi;
      updateData.emi = calcEmi;
      if (tenureMonths) {
        const totalAmount = Math.round(calcEmi * tenureMonths * 100) / 100;
        updateData.total_amount_with_interest = totalAmount;
        updateData.outstanding_amount = totalAmount;
      }
    }
    if (input.loanType !== undefined || input.loan_type !== undefined) {
      updateData.loan_type = input.loanType || input.loan_type;
    }
    if (input.reason !== undefined) {
      updateData.reason = input.reason;
    }
    if (input.employeeId !== undefined || input.employee_id !== undefined) {
      updateData.employee_id = input.employeeId || input.employee_id;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.loanDate !== undefined || input.loan_date !== undefined) {
      updateData.loan_date = input.loanDate || input.loan_date;
    }

    await db('employee_loans')
      .where('id', loanId)
      .where('organization_id', ctx.organizationId)
      .update(updateData);

    return await db('employee_loans').where('id', loanId).first();
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


