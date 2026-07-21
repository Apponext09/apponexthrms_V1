import { v4 as uuidv4 } from 'uuid';
import { FullFinalSettlementRepository } from '../repositories/FullFinalSettlementRepository';
import { EmployeeLoanRepository } from '../repositories/EmployeeLoanRepository';
import { SalaryAdvanceRepository } from '../repositories/SalaryAdvanceRepository';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

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

    await this.auditService.log(ctx, 'full_final_settlements', settlement.id, 'create', { settlement });

    return settlement;
  }

  async calculateSettlement(ctx: TenantContext, settlementId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    // Calculate leave encashment (simplified)
    const leaveEncashment = this.calculateLeaveEncashment(settlement);

    // Calculate gratuity (simplified - 15 days per year, max 10 lakh)
    const gratuity = this.calculateGratuity(settlement);

    // Get outstanding loans and advances
    const loans = await this.loanRepo.getForEmployee(ctx, settlement.employee_id);
    const advances = await this.advanceRepo.getForEmployee(ctx, settlement.employee_id);

    const totalLoanOutstanding = loans.reduce((sum, l) => sum + (l.outstanding_amount || 0), 0);
    const totalAdvanceOutstanding = advances
      .filter(a => a.status === 'approved')
      .reduce((sum, a) => sum + (a.advance_amount - this.calculateRecoveredAmount(a)), 0);

    const totalDeductions = totalLoanOutstanding + totalAdvanceOutstanding + settlement.other_deductions;
    const totalSettlementAmount = leaveEncashment + gratuity + settlement.bonus_settlement + settlement.notice_period_recovery - totalDeductions;

    const updated = await this.settlementRepo.update(ctx, settlementId, {
      leave_encashment_amount: leaveEncashment,
      gratuity_amount: gratuity,
      total_settlement_amount: Math.max(0, totalSettlementAmount),
      updated_by: ctx.userId
    });

    return updated;
  }

  private calculateLeaveEncashment(settlement: any): number {
    // Simplified: 5000 per day (should be based on actual salary)
    // In production, fetch from leave balance and employee salary
    return 0; // TODO: Integrate with leave service
  }

  private calculateGratuity(settlement: any): number {
    // India: 15 days salary per year of service (capped at 10L)
    // Simplified calculation
    return 0; // TODO: Calculate based on service years and salary
  }

  private calculateRecoveredAmount(advance: any): number {
    // Simplified - should track actual recoveries from payroll
    return 0;
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

    // Create workflow
    const workflow = await this.WorkflowExecutionService.createInstance(ctx, {
      workflow_type: 'full_final_settlement',
      reference_type: 'full_final_settlements',
      reference_id: settlementId,
      description: `Full & Final settlement for employee ${settlement.employee_id}`,
      priority: 'high'
    });

    await this.settlementRepo.update(ctx, settlementId, {
      workflow_instance_id: workflow.id,
      updated_by: ctx.userId
    });

    // Notify
    await this.notificationService.send(ctx, {
      type: 'settlement_submitted',
      recipient_type: 'role',
      recipient_id: 'finance_manager',
      title: 'Settlement Approval Required',
      message: `Full & Final settlement submitted for employee ${settlement.employee_id}`,
      action_url: `/payroll/settlements/${settlementId}`
    });

    return updated;
  }

  async approveSettlement(ctx: TenantContext, settlementId: number, approverId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    const updated = await this.settlementRepo.update(ctx, settlementId, {
      status: 'approved',
      approved_by: approverId,
      approval_date: new Date().toISOString(),
      updated_by: ctx.userId
    });

    if (settlement.workflow_instance_id) {
      await this.WorkflowExecutionService.completeInstance(ctx, settlement.workflow_instance_id, 'approved');
    }

    return updated;
  }

  async processSettlement(ctx: TenantContext, settlementId: number) {
    const settlement = await this.settlementRepo.getById(ctx, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');

    if (settlement.status !== 'approved') {
      throw new ValidationError('Only approved settlements can be processed');
    }

    return this.settlementRepo.update(ctx, settlementId, {
      status: 'processed',
      processed_date: new Date().toISOString(),
      updated_by: ctx.userId
    });
  }

  async getSettlement(ctx: TenantContext, settlementId: number) {
    return this.settlementRepo.getById(ctx, settlementId);
  }
}



