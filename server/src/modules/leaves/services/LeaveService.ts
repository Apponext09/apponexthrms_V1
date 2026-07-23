import { v4 as uuidv4 } from 'uuid';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { LeaveApplicationDayRepository } from '../repositories/LeaveApplicationDayRepository';
import { LeaveBalanceRepository } from '../repositories/LeaveBalanceRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveAccrualRepository } from '../repositories/LeaveAccrualRepository';
import { LeaveCancellationRepository } from '../repositories/LeaveCancellationRepository';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../../common/errors/index';
import { AuditService } from '../../audit/audit.service';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';
import { NotificationService } from '../../notifications/services/notification.service';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import type { LeaveApplication } from '../repositories/LeaveApplicationRepository';

interface ApplyLeaveInput {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  isHourly?: boolean;
  hourlyDuration?: number;
  supportingDocumentUrl?: string;
}

interface CancelLeaveInput {
  applicationId: number;
  reason: string;
  requiresApproval?: boolean;
}

export class LeaveService {
  private applicationRepo: LeaveApplicationRepository;
  private applicationDayRepo: LeaveApplicationDayRepository;
  private balanceRepo: LeaveBalanceRepository;
  private balanceService: LeaveBalanceService;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private accrualRepo: LeaveAccrualRepository;
  private cancellationRepo: LeaveCancellationRepository;
  private auditService: AuditService;
  private WorkflowExecutionService: WorkflowExecutionService;
  private notificationService: NotificationService;

  constructor() {
    this.applicationRepo = new LeaveApplicationRepository();
    this.applicationDayRepo = new LeaveApplicationDayRepository();
    this.balanceRepo = new LeaveBalanceRepository();
    this.balanceService = new LeaveBalanceService();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.accrualRepo = new LeaveAccrualRepository();
    this.cancellationRepo = new LeaveCancellationRepository();
    this.auditService = new AuditService();
    this.WorkflowExecutionService = new WorkflowExecutionService();
    this.notificationService = new NotificationService();
  }

  /**
   * Apply for leave
   */
  async applyLeave(ctx: TenantContext, input: ApplyLeaveInput): Promise<LeaveApplication> {
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);

    // Soft policy check — warn but don't block if assignment missing
    const assignment = await this.assignmentRepo.getForEmployeeAndLeaveType(
      ctx,
      input.employeeId,
      input.leaveTypeId
    ).catch(() => null);

    // Auto-initialize balance if not present (using service for correct FY end calculation)
    let balance = await this.balanceRepo.getBalance(ctx, input.employeeId, input.leaveTypeId, fyStart).catch(() => null);
    if (!balance) {
      const defaultQuotas: Record<number, number> = { 1: 12, 2: 12, 3: 15, 4: 10 };
      const quota = defaultQuotas[input.leaveTypeId] ?? 12;
      try {
        await this.balanceService.initializeBalance(ctx, input.employeeId, input.leaveTypeId, fyStart, quota);
        balance = await this.balanceRepo.getBalance(ctx, input.employeeId, input.leaveTypeId, fyStart).catch(() => null);
      } catch (e) {
        console.warn('[LeaveService] Could not auto-init balance:', e);
      }
    }

    // Calculate days
    const totalDays = this.calculateLeaveDays(input.startDate, input.endDate, input.isHalfDay);

    // Balance check (skip if no balance record found — allow optimistically)
    if (balance && balance.available_balance < totalDays && assignment && !assignment.can_take_negative) {
      throw new ValidationError(`Insufficient leave balance. Available: ${balance.available_balance}, Required: ${totalDays}`);
    }

    // Create application with status 'submitted' so it shows in approval queue
    const application = await this.applicationRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      leave_type_id: input.leaveTypeId,
      application_start_date: input.startDate,
      application_end_date: input.endDate,
      total_days: totalDays,
      is_half_day: input.isHalfDay || false,
      half_day_period: input.halfDayPeriod || null,
      is_hourly: input.isHourly || false,
      hourly_duration: input.hourlyDuration || null,
      reason_description: input.reason || null,
      supporting_document_url: input.supportingDocumentUrl || null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by_user_id: ctx.userId,
      is_sandwich_day: false,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Create application days
    const days = this.generateApplicationDays(
      input.startDate,
      input.endDate,
      input.isHalfDay,
      input.halfDayPeriod || 'first_half'
    );
    if (days.length > 0) {
      await this.applicationDayRepo.createBulk(
        ctx,
        days.map((day) => ({
          organization_id: ctx.organizationId,
          application_id: application.id,
          leave_date: day.date,
          day_type: day.type,
          is_holiday: day.isHoliday,
          is_weekend: day.isWeekend,
          status: 'pending',
          notes: null,
        }))
      ).catch((e: any) => console.warn('[LeaveService] applicationDayRepo.createBulk warn:', e));
    }

    // Audit log (non-blocking)
    this.auditService.log(ctx, {
      action: 'applied',
      entityType: 'application',
      entityId: application.id,
      afterState: { totalDays, employeeId: input.employeeId },
    }).catch(() => {});

    return application;
  }

  /**
   * Submit leave application
   */
  async submitLeaveApplication(ctx: TenantContext, applicationId: number): Promise<LeaveApplication> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'draft') {
      throw new ValidationError('Only draft applications can be submitted');
    }

    // Create workflow instance for approval
    const workflowInstance = await this.WorkflowExecutionService.startWorkflow(ctx, {
      workflowCode: 'leave_approval', // Leave approval workflow code - must match a published workflow
      entityType: 'leave_application',
      entityId: applicationId,
      metadata: { initiatedBy: ctx.userId },
    });

    // Update application
    const updated = await this.applicationRepo.update(ctx, applicationId, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by_user_id: ctx.userId,
      workflow_instance_id: workflowInstance.id,
    } as any);

    // Send notification to approvers
    await this.notificationService.sendNotification(ctx, {
      type: 'leave_submitted',
      recipientId: application.employee_id,
      entityType: 'leave_application',
      entityId: applicationId,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'submitted',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'submitted' },
    });

    return updated;
  }

  /**
   * Get leave application
   */
  async getApplication(ctx: TenantContext, applicationId: number): Promise<LeaveApplication> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }
    return application;
  }

  /**
   * List my leaves
   */
  async getMyLeaves(ctx: TenantContext, options?: ListQueryOptions) {
    const result = await this.applicationRepo.getForEmployee(ctx, ctx.userId, options);
    return result;
  }

  /**
   * Cancel leave
   */
  async cancelLeave(ctx: TenantContext, input: CancelLeaveInput): Promise<void> {
    const application = await this.applicationRepo.getById(ctx, input.applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (!['approved', 'submitted'].includes(application.status)) {
      throw new ValidationError('Only approved or submitted leaves can be cancelled');
    }

    // Create cancellation record
    const cancellation = await this.cancellationRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      application_id: input.applicationId,
      cancellation_reason: input.reason,
      cancellation_requested_at: new Date().toISOString(),
      status: input.requiresApproval ? 'pending' : 'approved',
      approved_by: input.requiresApproval ? null : ctx.userId,
      approval_date: input.requiresApproval ? null : new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Update application
    if (!input.requiresApproval) {
      await this.applicationRepo.update(ctx, input.applicationId, {
        status: 'cancelled',
        cancelled_by: ctx.userId,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: input.reason,
      } as any);

      // Restore balance
      const fyStart = this.calculateFinancialYearStart(
        application.application_start_date
      );
      const balance = await this.balanceRepo.getBalance(
        ctx,
        application.employee_id,
        application.leave_type_id,
        fyStart
      );

      if (balance) {
        await this.balanceRepo.updateAvailableBalance(
          ctx,
          balance.id,
          balance.consumed_balance - application.total_days,
          balance.pending_approval_balance - application.total_days
        );
      }
    }

    // Audit log
    await this.auditService.log(ctx, {
      action: 'cancelled',
      entityType: 'cancellation',
      entityId: cancellation.id,
      afterState: { cancellationId: cancellation.id },
    });
  }

  /**
   * Withdraw leave
   */
  async withdrawLeave(ctx: TenantContext, applicationId: number, reason: string): Promise<void> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'draft') {
      throw new ValidationError('Only draft applications can be withdrawn');
    }

    await this.applicationRepo.update(ctx, applicationId, {
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
      withdrawn_by: ctx.userId,
      withdrawn_reason: reason,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'withdrawn',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'withdrawn' },
    });
  }

  /**
   * Helper: Calculate financial year start
   */
  private calculateFinancialYearStart(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();

    // Assuming April start (Indian financial year)
    if (month < 3) {
      return `${year - 1}-04-01`;
    }
    return `${year}-04-01`;
  }

  /**
   * Helper: Calculate leave days
   */
  private calculateLeaveDays(startDate: string, endDate: string, isHalfDay: boolean): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return isHalfDay ? daysDiff - 0.5 : daysDiff;
  }

  /**
   * Helper: Generate application days
   */
  private generateApplicationDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    halfDayPeriod: string
  ): Array<{ date: string; type: 'full_day' | 'half_day_first_half' | 'half_day_second_half'; isHoliday: boolean; isWeekend: boolean }> {
    const days: Array<{ date: string; type: 'full_day' | 'half_day_first_half' | 'half_day_second_half'; isHoliday: boolean; isWeekend: boolean }> = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let dayType: 'full_day' | 'half_day_first_half' | 'half_day_second_half' = 'full_day';
      if (isHalfDay && dateStr === endDate) {
        dayType = halfDayPeriod === 'first_half' ? 'half_day_first_half' : 'half_day_second_half';
      }

      days.push({
        date: dateStr,
        type: dayType,
        isHoliday: false,
        isWeekend,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}


