import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { calculateFinancialYearStart } from '../utils/dateUtils';
import { LeaveApprovalRepository } from '../repositories/LeaveApprovalRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { getOrgLeaveSettings } from '../utils/settingsResolver';
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

    const approverUser = await db('users').where({ id: approverId }).first();
    const approverEmployeeId = approverUser ? (approverUser.employee_id || (approverUser as any).employeeId) : null;
    if (!approverEmployeeId) {
      throw new ValidationError('Approver employee profile not found');
    }

    if (!['submitted', 'pending_manager', 'pending_hr', 'escalated'].includes(application.status)) {
      throw new ValidationError(`Cannot approve leave application with status '${application.status}'`);
    }

    const employeeId = application.employee_id || (application as any).employeeId;
    const leaveTypeId = application.leave_type_id || (application as any).leaveTypeId;
    const totalDays = application.total_days || (application as any).totalDays;
    const fyStart = await this.getFyStartForLeaveType(ctx, db, employeeId, leaveTypeId);

    // Fetch org settings for approval levels
    const setting = await db('organization_settings')
      .where('organization_id', ctx.organizationId)
      .where('setting_key', 'LEAVE_APPROVAL_LEVELS')
      .whereNull('deleted_at')
      .first();
    const rawVal = setting ? (setting.settingValue !== undefined ? setting.settingValue : setting.setting_value) : null;
    const approvalLevels = rawVal !== null && rawVal !== undefined ? parseInt(String(rawVal), 10) : 2;

    let isFinalApproval = false;
    let nextStatus: 'pending_hr' | 'approved' = 'approved';

    if (approvalLevels === 2) {
      if (application.status === 'submitted' || application.status === 'pending_manager') {
        nextStatus = 'pending_hr';
        isFinalApproval = false;
      } else if (application.status === 'pending_hr') {
        nextStatus = 'approved';
        isFinalApproval = true;
      }
    } else {
      nextStatus = 'approved';
      isFinalApproval = true;
    }

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
            approver_id: approverEmployeeId,
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
        let adminNotes = '';
        if (isFinalApproval) {
          adminNotes = await this.processNegativeBalancePolicy(ctx, trx, application, leaveType, excessDays);
        }

        await trx('leave_applications')
          .where('id', applicationId)
          .update({
            status: nextStatus,
            l1_approved_by: isFinalApproval ? undefined : approverId,
            l1_approval_date: isFinalApproval ? undefined : new Date(),
            l2_approved_by: isFinalApproval ? approverId : undefined,
            l2_approval_date: isFinalApproval ? new Date() : undefined,
            approved_by: isFinalApproval ? approverId : undefined,
            approval_date: isFinalApproval ? new Date() : undefined,
            admin_notes: adminNotes
          });

        const appLopDays = application.lop_days || (application as any).lopDays;
        if (isFinalApproval && appLopDays && parseFloat(String(appLopDays)) > 0) {
          const lopDays = parseFloat(String(appLopDays));
          const applyDate = new Date(application.application_start_date || (application as any).applicationStartDate);
          await trx('leave_lop_records').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: employeeId,
            leave_application_id: applicationId,
            lop_days: lopDays,
            month: applyDate.getMonth() + 1,
            year: applyDate.getFullYear(),
            status: 'pending_payroll',
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        await trx('leave_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          leave_application_id: applicationId,
          approval_level: 1,
          approver_id: approverEmployeeId,
          status: 'approved',
          approval_date: new Date(),
          comments: comment || `Approved with policy adjustment: ${adminNotes}`
        });
      });
    } else {
      // Standard approval (no negative balance policy or no excess)
      await db.transaction(async (trx) => {
        // Update balance
        let currentBal = await trx('leave_balances')
          .where({ employee_id: employeeId, leave_type_id: leaveTypeId, financial_year_start: fyStart })
          .first();

        if (!currentBal) {
          currentBal = await trx('leave_balances')
            .where({ employee_id: employeeId, leave_type_id: leaveTypeId })
            .orderBy('id', 'desc')
            .first();
        }

        if (isFinalApproval && currentBal) {
          const totalDaysNum = parseFloat(String(totalDays)) || 0;
          const newConsumed = (parseFloat(currentBal.consumed_balance || currentBal.consumedBalance) || 0) + totalDaysNum;
          const opening = (parseFloat(currentBal.opening_balance || currentBal.openingBalance || currentBal.allocated_balance || currentBal.allocatedBalance) || 0) + (parseFloat(currentBal.carry_forward_balance || currentBal.carryForwardBalance) || 0);
          const newAvailable = Math.max(0, opening - newConsumed);
          const newPending = Math.max(0, (parseFloat(currentBal.pending_approval_balance || currentBal.pendingApprovalBalance) || 0) - totalDaysNum);

          await trx('leave_balances')
            .where('id', currentBal.id)
            .update({
              consumed_balance: newConsumed,
              available_balance: newAvailable,
              pending_approval_balance: newPending,
              last_updated_at: new Date()
            });
        }

        await trx('leave_applications')
          .where('id', applicationId)
          .update({
            status: nextStatus,
            l1_approved_by: isFinalApproval ? undefined : approverId,
            l1_approval_date: isFinalApproval ? undefined : new Date(),
            l2_approved_by: isFinalApproval ? approverId : undefined,
            l2_approval_date: isFinalApproval ? new Date() : undefined,
            approved_by: isFinalApproval ? approverId : undefined,
            approval_date: isFinalApproval ? new Date() : undefined,
          });

        const appLopDays = application.lop_days || (application as any).lopDays;
        if (isFinalApproval && appLopDays && parseFloat(String(appLopDays)) > 0) {
          const lopDays = parseFloat(String(appLopDays));
          const applyDate = new Date(application.application_start_date || (application as any).applicationStartDate);
          await trx('leave_lop_records').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: employeeId,
            leave_application_id: applicationId,
            lop_days: lopDays,
            month: applyDate.getMonth() + 1,
            year: applyDate.getFullYear(),
            status: 'pending_payroll',
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        await trx('leave_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          leave_application_id: applicationId,
          approval_level: 1,
          approver_id: approverEmployeeId,
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

    const approverUser = await db('users').where({ id: approverId }).first();
    const approverEmployeeId = approverUser ? (approverUser.employee_id || (approverUser as any).employeeId) : null;
    if (!approverEmployeeId) {
      throw new ValidationError('Approver employee profile not found');
    }

    if (application.status !== 'pending_hr_override') {
      throw new ValidationError('Only applications pending HR override can be processed');
    }

    const employeeId = application.employee_id || (application as any).employeeId;
    const leaveTypeId = application.leave_type_id || (application as any).leaveTypeId;
    const totalDays = application.total_days || (application as any).totalDays;
    const fyStart = await this.getFyStartForLeaveType(ctx, db, employeeId, leaveTypeId);

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
            last_updated_at: new Date()
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
            last_updated_at: new Date()
          });

        await trx('leave_lop_records').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_application_id: applicationId,
          lop_days: excessDays,
          month: new Date(application.application_start_date).getMonth() + 1,
          year: new Date(application.application_start_date).getFullYear(),
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
        approver_id: approverEmployeeId,
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
    const fyStart = await this.getFyStartForLeaveType(ctx, trx, employeeId, leaveTypeId);

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
          last_updated_at: new Date()
        });

      // Insert LOP record
      await trx('leave_lop_records').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_application_id: application.id,
        lop_days: excessDays,
        month: new Date(application.application_start_date).getMonth() + 1,
        year: new Date(application.application_start_date).getFullYear(),
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
          last_updated_at: new Date()
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

      const poolFyStart = await this.getFyStartForLeaveType(ctx, trx, employeeId, poolFromId);
      const poolBalance = await trx('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: poolFromId, financial_year_start: poolFyStart })
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
            last_updated_at: new Date()
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
          last_updated_at: new Date()
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
    const db = getKnex();
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Leave application not found');
    }

    const approverUser = await db('users').where({ id: approverId }).first();
    const approverEmployeeId = approverUser ? (approverUser.employee_id || (approverUser as any).employeeId) : null;
    if (!approverEmployeeId) {
      throw new ValidationError('Approver employee profile not found');
    }

    if (!['submitted', 'pending_manager', 'pending_hr', 'escalated'].includes(application.status)) {
      throw new ValidationError(`Only submitted or pending applications can be rejected. Current status: ${application.status}`);
    }

    // Create approval record
    await this.approvalRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      leave_application_id: applicationId,
      approval_level: 1,
      approver_id: approverEmployeeId,
      status: 'rejected',
      approval_date: new Date(),
      rejection_reason: reason || null,
    } as any);

    // Update balance (non-blocking)
    await this.balanceService.updateBalanceOnRejection(
      ctx,
      application.employee_id || (application as any).employeeId,
      application.leave_type_id || (application as any).leaveTypeId,
      application.total_days || (application as any).totalDays
    ).catch((e: any) => console.warn('[LeaveApprovalService] balance update on rejection warn:', e));

    // Update application
    await this.applicationRepo.update(ctx, applicationId, {
      status: 'rejected',
      rejection_reason: reason,
    } as any);

    // Send notification (non-blocking)
    this.notificationService.sendNotification(ctx, {
      type: 'leave_rejected',
      recipientId: application.employee_id || (application as any).employeeId,
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
   * Auto-process pending leave approvals that have been inactive for more than N days.
   */
  async autoProcessInactivityApprovals(ctx: TenantContext, thresholdDays: number = 3): Promise<{ processedCount: number }> {
    const db = getKnex();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

    const inactiveApplications = await db('leave_applications')
      .whereIn('status', ['submitted', 'pending_manager', 'pending_hr'])
      .where('submitted_at', '<', cutoffDate)
      .whereNull('deleted_at');

    let processedCount = 0;

    for (const app of inactiveApplications) {
      try {
        // Auto-approve the application on behalf of the system admin (user ID 1)
        await this.approveLeave(
          ctx,
          app.id,
          1,
          `System Auto-Approval: Inactivity limit of ${thresholdDays} days reached.`
        );
        processedCount++;
      } catch (error) {
        console.error(`[LeaveApprovalService] Error auto-processing leave application ${app.id}:`, error);
      }
    }

    return { processedCount };
  }

  /**
   * Get approval history for application
   */
  async getApprovalHistory(ctx: TenantContext, applicationId: number) {
    return this.approvalRepo.getForApplication(ctx, applicationId);
  }

  /**
   * Background scanner job for auto-escalations of pending leaves
   */
  async scanAndProcessAutoEscalations(ctx: TenantContext): Promise<{ escalatedCount: number }> {
    const db = getKnex();
    const now = new Date();
    
    // 1. Fetch pending leave applications with active policy assignments having auto_escalation_days
    const pendingLeaves = await db('leave_applications as la')
      .join('leave_policy_assignments as lpa', function() {
        this.on('la.employee_id', '=', 'lpa.employee_id')
          .andOn('la.leave_type_id', '=', 'lpa.leave_type_id')
          .andOn('lpa.is_active', '=', db.raw('true'))
          .andOnNull('lpa.deleted_at');
      })
      .whereIn('la.status', ['pending_manager', 'pending_hr'])
      .whereNull('la.deleted_at')
      .whereNotNull('lpa.auto_escalation_days')
      .select(
        'la.id',
        'la.organization_id',
        'la.employee_id',
        'la.status',
        'la.submitted_at',
        'la.workflow_instance_id',
        'lpa.auto_escalation_days'
      );

    let escalatedCount = 0;

    for (const app of pendingLeaves) {
      const submittedAt = app.submitted_at ? new Date(app.submitted_at) : new Date();
      const diffTime = now.getTime() - submittedAt.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays > app.auto_escalation_days) {
        await db.transaction(async (trx) => {
          const employee = await trx('employees')
            .where('id', app.employee_id)
            .first();

          let nextApproverUserId = null;
          let roleName = 'hr';

          if (employee && employee.reporting_manager_id) {
            const manager = await trx('employees')
              .where('id', employee.reporting_manager_id)
              .first();

            if (manager && manager.reporting_manager_id) {
              const skipLevelUser = await trx('users')
                .where('employee_id', manager.reporting_manager_id)
                .first();
              
              if (skipLevelUser) {
                nextApproverUserId = skipLevelUser.id;
                roleName = 'skip_level_manager';
              }
            }
          }

          if (!nextApproverUserId) {
            const hrUser = await trx('users as u')
              .join('user_roles as ur', 'u.id', 'ur.user_id')
              .join('roles as r', 'ur.role_id', 'r.id')
              .where('u.organization_id', app.organization_id)
              .whereIn('r.code', ['hr', 'hr_manager', 'tenant_admin', 'system_admin', 'organization_admin'])
              .whereNull('u.deleted_at')
              .select('u.id')
              .first();

            if (hrUser) {
              nextApproverUserId = hrUser.id;
              roleName = 'hr';
            }
          }

          if (nextApproverUserId) {
            // Update status of application
            await trx('leave_applications')
              .where('id', app.id)
              .update({
                status: 'escalated',
                updated_at: new Date(),
              });

            // Update existing pending approvals
            await trx('leave_approvals')
              .where('application_id', app.id)
              .where('status', 'pending')
              .update({
                status: 'escalated',
                comments: `Escalated after ${app.auto_escalation_days} days of inactivity.`,
                updated_at: new Date(),
              });

            // Insert new pending approval row for the escalated approver
            await trx('leave_approvals').insert({
              uuid: uuidv4(),
              organization_id: app.organization_id,
              application_id: app.id,
              approver_id: nextApproverUserId,
              approver_role: roleName,
              status: 'pending',
              comments: `Auto-escalated from manager level.`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // Send notification
            await this.notificationService.sendNotification(ctx, {
              type: 'leave_escalated',
              recipientId: nextApproverUserId,
              entityType: 'leave_application',
              entityId: app.id,
            } as any).catch(() => {});

            escalatedCount++;
          }
        });
      }
    }

    return { escalatedCount };
  }

  /**
   * Helper: Resolve financial/holiday year start month dynamically for a leave type
   */
  private async getFyStartForLeaveType(ctx: TenantContext, db: any, employeeId: number, leaveTypeId: number): Promise<string> {
    const employee = await db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    
    let startMonth = settings.holidayYearStartMonth;
    const leaveType = await db('leave_types').where('id', leaveTypeId).first();
    if (leaveType && leaveType.allocation_settings) {
      try {
        const parsed = typeof leaveType.allocation_settings === 'string'
          ? JSON.parse(leaveType.allocation_settings)
          : leaveType.allocation_settings;
        if (parsed && typeof parsed === 'object') {
          if (parsed.considerLeaveStartYearAsFrom) {
            startMonth = parseInt(parsed.leaveStartMonth, 10) || 4;
          } else {
            startMonth = 1; // Default to 1st January
          }
        }
      } catch (e) {}
    }
    
    return calculateFinancialYearStart(new Date().toISOString().split('T')[0], startMonth);
  }
}

