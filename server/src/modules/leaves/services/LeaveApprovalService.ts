import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { calculateFinancialYearStart } from '../utils/dateUtils';
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
  /**
   * Approve leave application
   */
  async approveLeave(
    ctx: TenantContext,
    applicationId: number,
    approverId: number,
    comment?: string
  ): Promise<void> {
    const db = getKnex();
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'submitted') {
      throw new ValidationError('Only submitted applications can be approved');
    }

    const employeeId = application.employeeId || application.employee_id;
    const leaveTypeId = application.leaveTypeId || application.leave_type_id;
    const totalDays = application.totalDays || application.total_days;
    const fyStart = calculateFinancialYearStart(new Date().toISOString().split('T')[0]);

    // Fetch leave type
    const leaveType = await db('leave_types').where('id', leaveTypeId).first();
    const hasNeg = leaveType ? Boolean(leaveType.allow_negative_balance || leaveType.allowNegativeBalance) : false;
    const action = leaveType ? (leaveType.negative_balance_action || leaveType.negativeBalanceAction) : null;

    // Get current balance
    const balance = await db('leave_balances')
      .where({ employee_id: employeeId, leave_type_id: leaveTypeId, financial_year_start: fyStart })
      .first();

    const currentAvail = balance ? parseFloat(balance.available_balance || balance.availableBalance || 0) : 0;
    // Since totalDays was already subtracted on submission, actual available before reservation is:
    const actualAvailBeforeReservation = currentAvail + totalDays;
    const excessDays = Math.max(0, totalDays - actualAvailBeforeReservation);

    if (hasNeg && excessDays > 0) {
      if (action === 'MANUAL_APPROVAL_REQUIRED') {
        // Flag for HR override and stop balance update
        await db.transaction(async (trx) => {
          await trx('leave_applications')
            .where('id', applicationId)
            .update({
              status: 'pending_hr_override',
              admin_notes: `Exceeded available balance by ${excessDays} days. Requires manual HR override.`
            });

          await trx('leave_approvals').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            leave_application_id: applicationId,
            approval_level: 1,
            approver_id: approverId,
            status: 'pending',
            approval_date: new Date(),
            comments: comment || 'Flagged: Exceeded available balance. Forwarded for manual HR override.'
          });
        });

        // Send notification
        this.notificationService.sendNotification(ctx, {
          type: 'leave_pending_override',
          recipientId: employeeId,
          entityType: 'leave_application',
          entityId: applicationId,
        } as any).catch(() => {});

        return;
      }

      // Process LOP, Carry Forward, or Pool
      await db.transaction(async (trx) => {
        const adminNotes = await this.processNegativeBalancePolicy(ctx, trx, application, leaveType, excessDays);

        await trx('leave_applications')
          .where('id', applicationId)
          .update({
            status: 'approved',
            approved_by: approverId,
            approval_date: new Date(),
            admin_notes: adminNotes
          });

        await trx('leave_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          leave_application_id: applicationId,
          approval_level: 1,
          approver_id: approverId,
          status: 'approved',
          approval_date: new Date(),
          comments: comment || `Approved with policy adjustment: ${adminNotes}`
        });
      });
    } else {
      // Standard approval (no negative balance policy or no excess)
      await db.transaction(async (trx) => {
        // Update balance
        const currentBal = await trx('leave_balances')
          .where({ employee_id: employeeId, leave_type_id: leaveTypeId, financial_year_start: fyStart })
          .first();

        if (currentBal) {
          const newConsumed = (parseFloat(currentBal.consumed_balance) || 0) + totalDays;
          const newAvailable = (parseFloat(currentBal.available_balance) || 0); // Already subtracted on submission
          const newPending = Math.max(0, (parseFloat(currentBal.pending_approval_balance) || 0) - totalDays);

          await trx('leave_balances')
            .where('id', currentBal.id)
            .update({
              consumed_balance: newConsumed,
              available_balance: newAvailable,
              pending_approval_balance: newPending,
              last_updated_at: new Date().toISOString()
            });
        }

        await trx('leave_applications')
          .where('id', applicationId)
          .update({
            status: 'approved',
            approved_by: approverId,
            approval_date: new Date(),
          });

        await trx('leave_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          leave_application_id: applicationId,
          approval_level: 1,
          approver_id: approverId,
          status: 'approved',
          approval_date: new Date(),
          comments: comment || null,
        });
      });
    }

    // Send notification
    this.notificationService.sendNotification(ctx, {
      type: 'leave_approved',
      recipientId: employeeId,
      entityType: 'leave_application',
      entityId: applicationId,
    } as any).catch(() => {});

    // Audit log
    this.auditService.log(ctx, {
      action: 'approved',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'approved', approverId },
    }).catch(() => {});
  }

  /**
   * Process HR override decision for manual override policy
   */
  async hrOverride(
    ctx: TenantContext,
    applicationId: number,
    approverId: number,
    decision: 'grant_without_deduction' | 'convert_to_lop',
    comment?: string
  ): Promise<void> {
    const db = getKnex();
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    if (application.status !== 'pending_hr_override') {
      throw new ValidationError('Only applications pending HR override can be processed');
    }

    const employeeId = application.employeeId || application.employee_id;
    const leaveTypeId = application.leaveTypeId || application.leave_type_id;
    const totalDays = application.totalDays || application.total_days;
    const fyStart = calculateFinancialYearStart(new Date().toISOString().split('T')[0]);

    // Fetch leave type
    const leaveType = await db('leave_types').where('id', leaveTypeId).first();

    // Get current balance
    const balance = await db('leave_balances')
      .where({ employee_id: employeeId, leave_type_id: leaveTypeId, financial_year_start: fyStart })
      .first();

    if (!balance) {
      throw new ValidationError('Leave balance record not found');
    }

    const currentAvail = parseFloat(balance.available_balance || balance.availableBalance || 0);
    const actualAvailBeforeReservation = currentAvail + totalDays;
    const excessDays = Math.max(0, totalDays - actualAvailBeforeReservation);

    await db.transaction(async (trx) => {
      let adminNotes = '';

      if (decision === 'grant_without_deduction') {
        // Consume only non-excess days, floor at 0 available
        const nonExcess = totalDays - excessDays;
        const newConsumed = (parseFloat(balance.consumed_balance) || 0) + nonExcess;
        const newAvailable = 0;
        const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);

        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            consumed_balance: newConsumed,
            available_balance: newAvailable,
            pending_approval_balance: newPending,
            last_updated_at: new Date().toISOString()
          });

        adminNotes = 'Approved without deduction (HR Override)';
      } 
      else if (decision === 'convert_to_lop') {
        // Behave like LOP: floor balance at 0, record LOP days
        const nonExcess = totalDays - excessDays;
        const newConsumed = (parseFloat(balance.consumed_balance) || 0) + nonExcess;
        const newAvailable = 0;
        const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);

        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            consumed_balance: newConsumed,
            available_balance: newAvailable,
            pending_approval_balance: newPending,
            last_updated_at: new Date().toISOString()
          });

        await trx('leave_lop_records').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_application_id: applicationId,
          lop_days: excessDays,
          month: new Date(application.application_start_date || application.applicationStartDate).getMonth() + 1,
          year: new Date(application.application_start_date || application.applicationStartDate).getFullYear(),
          status: 'pending_payroll',
          created_at: new Date(),
          updated_at: new Date()
        });

        adminNotes = `${excessDays} days converted to LOP (HR Override)`;
      }

      await trx('leave_applications')
        .where('id', applicationId)
        .update({
          status: 'approved',
          approved_by: approverId,
          approval_date: new Date(),
          admin_notes: adminNotes
        });

      await trx('leave_approvals').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        leave_application_id: applicationId,
        approval_level: 1,
        approver_id: approverId,
        status: 'approved',
        approval_date: new Date(),
        comments: comment || `HR Override decision: ${decision === 'grant_without_deduction' ? 'Granted without deduction' : 'Converted to LOP'}`
      });
    });

    // Send notification
    this.notificationService.sendNotification(ctx, {
      type: 'leave_approved',
      recipientId: employeeId,
      entityType: 'leave_application',
      entityId: applicationId,
    } as any).catch(() => {});
  }

  /**
   * Process LOP, Carry Forward, or Pool calculation helper
   */
  private async processNegativeBalancePolicy(
    ctx: TenantContext,
    trx: any,
    application: any,
    leaveType: any,
    excessDays: number
  ): Promise<string> {
    const employeeId = application.employeeId || application.employee_id;
    const leaveTypeId = application.leaveTypeId || application.leave_type_id;
    const totalDays = application.totalDays || application.total_days;
    const fyStart = calculateFinancialYearStart(new Date().toISOString().split('T')[0]);

    let adminNotes = '';

    const balance = await trx('leave_balances')
      .where({ employee_id: employeeId, leave_type_id: leaveTypeId, financial_year_start: fyStart })
      .first();

    if (!balance) {
      throw new ValidationError('Leave balance record not found');
    }

    const action = leaveType.negativeBalanceAction || leaveType.negative_balance_action;

    if (action === 'LOP') {
      const nonExcess = totalDays - excessDays;
      const newConsumed = (parseFloat(balance.consumed_balance) || 0) + nonExcess;
      const newAvailable = 0;
      const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);

      await trx('leave_balances')
        .where('id', balance.id)
        .update({
          consumed_balance: newConsumed,
          available_balance: newAvailable,
          pending_approval_balance: newPending,
          last_updated_at: new Date().toISOString()
        });

      // Insert LOP record
      await trx('leave_lop_records').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_application_id: application.id,
        lop_days: excessDays,
        month: new Date(application.application_start_date || application.applicationStartDate).getMonth() + 1,
        year: new Date(application.application_start_date || application.applicationStartDate).getFullYear(),
        status: 'pending_payroll',
        created_at: new Date(),
        updated_at: new Date()
      });

      adminNotes = `${excessDays} days converted to LOP`;
    } 
    else if (action === 'CARRY_FORWARD') {
      const newConsumed = (parseFloat(balance.consumed_balance) || 0) + totalDays;
      const newAvailable = (parseFloat(balance.available_balance) || 0); // Keep already negative balance
      const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);
      const newCFNegative = (parseFloat(balance.carried_forward_negative_days) || 0) + excessDays;

      await trx('leave_balances')
        .where('id', balance.id)
        .update({
          consumed_balance: newConsumed,
          available_balance: newAvailable,
          pending_approval_balance: newPending,
          carried_forward_negative_days: newCFNegative,
          last_updated_at: new Date().toISOString()
        });

      adminNotes = `${excessDays} days carried forward`;
    } 
    else if (action === 'POOL_FROM_OTHER_LEAVE') {
      const poolFromId = leaveType.poolFromLeaveTypeId || leaveType.pool_from_leave_type_id;
      if (!poolFromId) {
        throw new ValidationError('Pool leave category not configured.');
      }

      const poolType = await trx('leave_types').where('id', poolFromId).first();
      const poolName = poolType ? (poolType.leaveName || poolType.leave_name) : 'other category';

      const poolBalance = await trx('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: poolFromId, financial_year_start: fyStart })
        .first();

      const poolAvail = poolBalance ? (parseFloat(poolBalance.available_balance) || 0) : 0;
      const pooledDays = Math.min(excessDays, poolAvail);
      const remainingShortfall = excessDays - pooledDays;

      // 1. Deduct from pool balance if available
      if (pooledDays > 0 && poolBalance) {
        const poolConsumed = (parseFloat(poolBalance.consumed_balance) || 0) + pooledDays;
        const poolAvailable = (parseFloat(poolBalance.available_balance) || 0) - pooledDays;

        await trx('leave_balances')
          .where('id', poolBalance.id)
          .update({
            consumed_balance: poolConsumed,
            available_balance: poolAvailable,
            last_updated_at: new Date().toISOString()
          });

        // Insert ledger entry for pooled balance debit
        await trx('leave_ledger_entries').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_type_id: poolFromId,
          transaction_type: 'DEBIT',
          amount: -pooledDays,
          reference_id: String(application.id),
          effective_date: new Date().toISOString().split('T')[0],
          remarks: `Excess days pooled from ${poolName} for leave application ID ${application.id}`,
          created_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // 2. primary leave type consumes up to available balance
      const nonExcess = totalDays - excessDays;
      const newConsumed = (parseFloat(balance.consumed_balance) || 0) + nonExcess;
      const newAvailable = 0;
      const newPending = Math.max(0, (parseFloat(balance.pending_approval_balance) || 0) - totalDays);

      await trx('leave_balances')
        .where('id', balance.id)
        .update({
          consumed_balance: newConsumed,
          available_balance: newAvailable,
          pending_approval_balance: newPending,
          last_updated_at: new Date().toISOString()
        });

      // 3. remaining shortfall converted to LOP
      if (remainingShortfall > 0) {
        await trx('leave_lop_records').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_application_id: application.id,
          lop_days: remainingShortfall,
          month: new Date(application.application_start_date || application.applicationStartDate).getMonth() + 1,
          year: new Date(application.application_start_date || application.applicationStartDate).getFullYear(),
          status: 'pending_payroll',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      adminNotes = `${pooledDays} days adjusted from ${poolName} balance`;
      if (remainingShortfall > 0) {
        adminNotes += `, ${remainingShortfall} days converted to LOP`;
      }
    }

    return adminNotes;
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

