import { v4 as uuidv4 } from 'uuid';
import { LeaveApprovalRepository } from '../repositories/LeaveApprovalRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/services/notification.service';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class LeaveApprovalService {
  private approvalRepo: LeaveApprovalRepository;
  private applicationRepo: LeaveApplicationRepository;
  private balanceService: LeaveBalanceService;
  private auditService: AuditService;
  private notificationService: NotificationService;

  constructor() {
    this.approvalRepo = new LeaveApprovalRepository();
    this.applicationRepo = new LeaveApplicationRepository();
    this.balanceService = new LeaveBalanceService();
    this.auditService = new AuditService();
    this.notificationService = new NotificationService();
  }

  /**
   * Get pending approvals for user
   */
  async getApprovalQueue(ctx: TenantContext, userId: number, options?: ListQueryOptions) {
    return this.applicationRepo.getPendingForApprover(ctx, userId, options);
  }

  /**
   * Approve leave application
   */
  async approveLeave(
    ctx: TenantContext,
    applicationId: number,
    approverId: number,
    comment?: string
  ): Promise<void> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'submitted') {
      throw new ValidationError('Only submitted applications can be approved');
    }

    // Create approval record
    await this.approvalRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      leave_application_id: applicationId,
      approval_level: 1,
      approver_id: approverId,
      status: 'approved',
      approval_date: new Date(),
      comments: comment || null,
    } as any);

    // Update balance (non-blocking — balance may not exist for all employees)
    await this.balanceService.updateBalanceOnApproval(
      ctx,
      application.employeeId || application.employee_id,
      application.leaveTypeId || application.leave_type_id,
      application.totalDays || application.total_days
    ).catch((e: any) => console.warn('[LeaveApprovalService] balance update on approval warn:', e));

    // Update application
    await this.applicationRepo.update(ctx, applicationId, {
      status: 'approved',
      approved_by: approverId,
      approval_date: new Date(),
    } as any);

    // Send notification (non-blocking)
    this.notificationService.sendNotification(ctx, {
      type: 'leave_approved',
      recipientId: application.employee_id,
      entityType: 'leave_application',
      entityId: applicationId,
    } as any).catch(() => {});

    // Audit log (non-blocking)
    this.auditService.log(ctx, {
      action: 'approved',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'approved', approverId },
    }).catch(() => {});
  }

  /**
   * Reject leave application
   */
  async rejectLeave(
    ctx: TenantContext,
    applicationId: number,
    approverId: number,
    reason: string
  ): Promise<void> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'submitted') {
      throw new ValidationError('Only submitted applications can be rejected');
    }

    // Create approval record
    await this.approvalRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      leave_application_id: applicationId,
      approval_level: 1,
      approver_id: approverId,
      status: 'rejected',
      approval_date: new Date(),
      rejection_reason: reason || null,
    } as any);

    // Update balance (non-blocking)
    await this.balanceService.updateBalanceOnRejection(
      ctx,
      application.employeeId || application.employee_id,
      application.leaveTypeId || application.leave_type_id,
      application.totalDays || application.total_days
    ).catch((e: any) => console.warn('[LeaveApprovalService] balance update on rejection warn:', e));

    // Update application
    await this.applicationRepo.update(ctx, applicationId, {
      status: 'rejected',
      rejection_reason: reason,
    } as any);

    // Send notification (non-blocking)
    this.notificationService.sendNotification(ctx, {
      type: 'leave_rejected',
      recipientId: application.employee_id,
      entityType: 'leave_application',
      entityId: applicationId,
      metadata: { reason },
    } as any).catch(() => {});

    // Audit log (non-blocking)
    this.auditService.log(ctx, {
      action: 'rejected',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'rejected', reason },
    }).catch(() => {});
  }

  /**
   * Count pending approvals
   */
  async countPending(ctx: TenantContext, userId: number): Promise<number> {
    return this.applicationRepo.countPending(ctx, userId);
  }

  /**
   * Get approval history for application
   */
  async getApprovalHistory(ctx: TenantContext, applicationId: number) {
    return this.approvalRepo.getForApplication(ctx, applicationId);
  }
}

