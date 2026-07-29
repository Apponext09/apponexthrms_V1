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
import { withTransaction } from '../../../db/knex';
import { calculateFinancialYearStart, calculateFinancialYearEnd, toLocalYYYYMMDD } from '../utils/dateUtils';

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
    const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(new Date()));

    const applicationUuid = uuidv4();
    const ledgerUuid = uuidv4();

    // Wrap the balance check + insert + ledger reservation + balance update in a single transaction
    const application = await withTransaction(async (trx) => {
      // 1. Ensure employee leave lock row exists
      await trx.raw(
        'INSERT IGNORE INTO employee_leave_locks (employee_id, organization_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [input.employeeId, ctx.organizationId]
      );

      // 2. Lock the dedicated lock row for this employee to serialize all concurrent leave applications
      await trx('employee_leave_locks')
        .where('employee_id', input.employeeId)
        .forUpdate()
        .first();

      // 3. Fetch employee to check joining date for proration (non-locking) and get currentLocationId
      const employee = await trx('employees')
        .where('organization_id', ctx.organizationId)
        .where('id', input.employeeId)
        .whereNull('deleted_at')
        .first();

      if (!employee) {
        throw new ValidationError('Employee record not found.');
      }

      // Fetch active leave type to check sandwich_rule_enabled
      const leaveType = await trx('leave_types')
        .where('id', input.leaveTypeId)
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();

      if (!leaveType) {
        throw new ValidationError('Leave category not found or inactive.');
      }

      // Calculate total leave days and daily records inside the transaction context (with lock held)
      const { totalDays, days } = await this.calculateLeaveDaysAndBreakdown(
        trx,
        ctx,
        input.employeeId,
        employee.currentLocationId,
        input.leaveTypeId,
        input.startDate,
        input.endDate,
        input.isHalfDay,
        input.halfDayPeriod || 'first_half',
        !!leaveType.sandwichRuleEnabled
      );

      if (totalDays <= 0) {
        throw new ValidationError('Leave duration must be greater than 0 days (all requested days are weekends/holidays).');
      }

      // Check sick leave medical certificate requirement threshold
      const lCode = (leaveType.leaveCode || leaveType.leave_code || '').toUpperCase();
      if (lCode === 'SL') {
        const thresholdSetting = await trx('organization_settings')
          .where('organization_id', ctx.organizationId)
          .where('setting_key', 'sick_leave_doc_threshold')
          .first();
        
        let threshold = 3;
        if (thresholdSetting) {
          const val = thresholdSetting.settingValue !== undefined ? thresholdSetting.settingValue : thresholdSetting.setting_value;
          const parsed = typeof val === 'string' ? parseInt(val, 10) : Number(val);
          if (!isNaN(parsed)) {
            threshold = parsed;
          }
        }
        
        if (totalDays >= threshold && !input.supportingDocumentUrl) {
          throw new ValidationError(`Medical certificate is required for Sick Leave of ${threshold} or more days.`);
        }
      }

      // 4. Fetch the applicable LeavePolicy Assignment for this employee and leave type
      const assignment = await trx('leave_policy_assignments')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', input.employeeId)
        .where('leave_type_id', input.leaveTypeId)
        .where('is_active', true)
        .whereNull('deleted_at')
        .first();

      if (!assignment) {
        throw new ValidationError('No active leave policy assignment found for this employee and leave category.');
      }

      // 5. Overlap validation check: Block if any overlapping approved or submitted leaves exist
      const overlappingApp = await trx('leave_applications')
        .where('employee_id', input.employeeId)
        .whereIn('status', ['submitted', 'approved'])
        .whereNull('deleted_at')
        .andWhere((q) => {
          q.where('application_start_date', '<=', input.endDate)
           .andWhere('application_end_date', '>=', input.startDate);
        })
        .first();

      if (overlappingApp) {
        const start = overlappingApp.applicationStartDate || overlappingApp.application_start_date;
        const end = overlappingApp.applicationEndDate || overlappingApp.application_end_date;
        const startStr = start ? toLocalYYYYMMDD(start) : '';
        const endStr = end ? toLocalYYYYMMDD(end) : '';
        throw new ValidationError(`Leave request overlaps with an existing request (${startStr} to ${endStr}).`);
      }

      // 6. Lock the balance row to prevent race conditions
      let balance = await trx('leave_balances')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', input.employeeId)
        .where('leave_type_id', input.leaveTypeId)
        .where('financial_year_start', fyStart)
        .whereNull('deleted_at')
        .forUpdate()
        .first();

      // Auto-initialize balance if not present using policy entitlement
      if (!balance) {
        let quota = assignment.annualQuota;

        // Proration logic on joining mid-cycle
        const joinDate = new Date(employee.dateOfJoining);
        const fyStartDate = new Date(fyStart);
        const fyEndDate = new Date(calculateFinancialYearEnd(fyStart));
        
        if (joinDate > fyStartDate && joinDate <= fyEndDate) {
          // Mid-cycle joiner proration
          const joinYear = joinDate.getFullYear();
          const joinMonth = joinDate.getMonth(); // 0-indexed
          const endYear = fyEndDate.getFullYear();
          const endMonth = fyEndDate.getMonth();
          
          const totalMonths = (endYear - joinYear) * 12 + (endMonth - joinMonth) + 1;
          const remainingMonths = Math.max(1, Math.min(12, totalMonths));
          
          quota = parseFloat(((assignment.annualQuota / 12) * remainingMonths).toFixed(2));
        }

        const fyEnd = calculateFinancialYearEnd(fyStart);
        
        const [insertedBalanceId] = await trx('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: input.employeeId,
          leave_type_id: input.leaveTypeId,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: quota,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: quota,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          last_updated_at: new Date(),
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        });

        // Refetch and lock the newly initialized balance row
        balance = await trx('leave_balances')
          .where('id', insertedBalanceId)
          .forUpdate()
          .first();
      }

      // 7. Balance validation check & Fallback Logic
      const availableBalance = balance ? parseFloat(balance.availableBalance || balance.available_balance || 0) : 0;
      
      let lopDays = 0;
      let poolLeaveTypeId: number | null = null;
      const paidType = leaveType.paidType || leaveType.paid_type || 'paid';

      if (paidType === 'unpaid') {
        lopDays = totalDays;
      } else if (paidType === 'half_paid') {
        if (availableBalance >= totalDays) {
          lopDays = totalDays * 0.5;
        } else {
          const excessDays = totalDays - availableBalance;
          const usedBalance = Math.max(0, availableBalance);
          lopDays = usedBalance * 0.5;

          if (leaveType.pool_from_leave_type_id || leaveType.poolFromLeaveTypeId) {
            poolLeaveTypeId = leaveType.pool_from_leave_type_id || leaveType.poolFromLeaveTypeId;
          } else if (leaveType.allow_negative_balance || leaveType.allowNegativeBalance) {
            lopDays += excessDays * 0.5;
          } else {
            lopDays += excessDays;
          }
        }
      } else {
        if (availableBalance < totalDays) {
          const excessDays = totalDays - availableBalance;
          
          if (leaveType && (leaveType.pool_from_leave_type_id || leaveType.poolFromLeaveTypeId)) {
            poolLeaveTypeId = leaveType.pool_from_leave_type_id || leaveType.poolFromLeaveTypeId;
          } else if (leaveType && (leaveType.allow_negative_balance || leaveType.allowNegativeBalance)) {
            // Allow negative
          } else {
            // LOP
            lopDays = excessDays;
          }
        }
      }

      // Fetch org setting for approval levels (for future use or UI context)
      const setting = await trx('organization_settings')
        .where('organization_id', ctx.organizationId)
        .where('setting_key', 'LEAVE_APPROVAL_LEVELS')
        .whereNull('deleted_at')
        .first();
      
      const rawVal = setting ? (setting.settingValue !== undefined ? setting.settingValue : setting.setting_value) : null;
      const approvalLevels = rawVal !== null && rawVal !== undefined ? parseInt(String(rawVal), 10) : 2;
      const initialStatus = 'pending_manager';

      // Determine if the application contains any sandwich days
      const hasSandwich = days.some(d => d.isSandwichDay);

      // 8. Insert Leave Application
      const [applicationId] = await trx('leave_applications').insert({
        uuid: applicationUuid,
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
        status: initialStatus,
        lop_days: lopDays,
        pool_leave_type_id: poolLeaveTypeId,
        submitted_at: new Date(),
        submitted_by_user_id: ctx.userId,
        is_sandwich_day: hasSandwich ? 1 : 0,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 9. Insert Daily Breakdown Records
      if (days.length > 0) {
        await trx('leave_application_days').insert(
          days.map((day) => ({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            application_id: applicationId,
            leave_date: day.date,
            day_type: day.type,
            is_holiday: day.isHoliday ? 1 : 0,
            is_weekend: day.isWeekend ? 1 : 0,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
          }))
        );
      }

      // 10. Create RESERVATION ledger entry
      await trx('leave_ledger_entries').insert({
        uuid: ledgerUuid,
        organization_id: ctx.organizationId,
        employee_id: input.employeeId,
        leave_type_id: input.leaveTypeId,
        transaction_type: 'RESERVATION',
        amount: -totalDays,
        reference_id: String(applicationId),
        effective_date: toLocalYYYYMMDD(new Date()),
        remarks: `Reservation for leave request from ${input.startDate} to ${input.endDate}`,
        created_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 11. Update pending and available balances on leave_balances (no Math.max floored clamp)
      if (balance) {
        const newPending = (parseFloat(balance.pendingApprovalBalance) || 0) + totalDays;
        const newAvailable = (parseFloat(balance.availableBalance) || 0) - totalDays;

        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            pending_approval_balance: newPending,
            available_balance: newAvailable,
            last_updated_at: new Date(),
            updated_at: new Date(),
          });
      }

      // Retrieve the inserted record in standard format
      const createdApp = await trx('leave_applications')
        .where('id', applicationId)
        .first();

      return createdApp;
    });

    // Audit log (non-blocking)
    this.auditService.log(ctx, {
      action: 'applied',
      entityType: 'application',
      entityId: application.id,
      afterState: { totalDays: parseFloat(application.totalDays), employeeId: input.employeeId },
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
   * Cancel leave application (only pending/submitted requests)
   */
  async cancelLeave(ctx: TenantContext, applicationId: number): Promise<LeaveApplication> {
    const application = await withTransaction(async (trx) => {
      // 1. Fetch application details
      const app = await trx('leave_applications')
        .where('organization_id', ctx.organizationId)
        .where('id', applicationId)
        .whereNull('deleted_at')
        .first();

      if (!app) {
        throw new NotFoundError('Leave application not found.');
      }

      // Check allowed statuses: Only allow cancelling if 'submitted' or 'pending' (not approved yet)
      if (!['submitted', 'pending', 'pending_manager', 'pending_hr'].includes(app.status)) {
        throw new ValidationError(`Cannot cancel leave application with status '${app.status}'. Only pending/submitted requests can be cancelled.`);
      }

      // Derive the financial year start from app.applicationStartDate
      const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(app.applicationStartDate));

      // 2. Ensure employee leave lock row exists
      await trx.raw(
        'INSERT IGNORE INTO employee_leave_locks (employee_id, organization_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [app.employeeId, ctx.organizationId]
      );

      // 3. Lock the dedicated lock row for this employee to serialize operations
      await trx('employee_leave_locks')
        .where('employee_id', app.employeeId)
        .forUpdate()
        .first();

      // 4. Lock the balance row to prevent race conditions (filtered by the application's cycle year)
      const balance = await trx('leave_balances')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', app.employeeId)
        .where('leave_type_id', app.leaveTypeId)
        .where('financial_year_start', fyStart)
        .whereNull('deleted_at')
        .forUpdate()
        .first();

      const totalDays = parseFloat(app.totalDays) || 0;

      // 5. Update pending and available balances on leave_balances
      if (balance) {
        const pendingApprovalBalance = parseFloat(balance.pendingApprovalBalance) || 0;
        if (pendingApprovalBalance < totalDays) {
          throw new ValidationError(`Inconsistent leave balance: Application requests cancellation of ${totalDays} days, but pending balance is only ${pendingApprovalBalance} days.`);
        }
        const newPending = pendingApprovalBalance - totalDays;
        const newAvailable = (parseFloat(balance.availableBalance) || 0) + totalDays;

        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            pending_approval_balance: newPending,
            available_balance: newAvailable,
            last_updated_at: new Date(),
            updated_at: new Date(),
          });
      }

      // 6. Insert RESERVATION_RELEASE ledger entry
      await trx('leave_ledger_entries').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: app.employeeId,
        leave_type_id: app.leaveTypeId,
        transaction_type: 'RESERVATION_RELEASE',
        amount: totalDays, // positive value to release the reserved negative amount
        reference_id: String(applicationId),
        effective_date: app.applicationStartDate,
        created_by: ctx.userId,
        remarks: `Cancellation release of reservation for application ID ${applicationId}`,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 7. Update leave application status to 'cancelled'
      await trx('leave_applications')
        .where('id', applicationId)
        .update({
          status: 'cancelled',
          cancelled_by: ctx.userId,
          cancelled_at: new Date(),
          updated_by: ctx.userId,
          updated_at: new Date(),
        });

      // Fetch and return the updated application
      const updatedApp = await trx('leave_applications')
        .where('id', applicationId)
        .first();

      return updatedApp;
    });

    // Audit log (non-blocking)
    this.auditService.log(ctx, {
      action: 'cancelled',
      entityType: 'application',
      entityId: applicationId,
      afterState: { status: 'cancelled', employeeId: application.employeeId },
    }).catch(() => {});

    return application;
  }

  /**
   * Helper: Calculate leave days and day-by-day details timezone-safely and using configuration
   */
  private async calculateLeaveDaysAndBreakdown(
    trx: any,
    ctx: TenantContext,
    employeeId: number,
    locationId: number | null,
    leaveTypeId: number,
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    halfDayPeriod: string,
    sandwichRuleEnabled: boolean
  ): Promise<{
    totalDays: number;
    days: Array<{ date: string; type: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'; isHoliday: boolean; isWeekend: boolean; isSandwichDay: boolean }>;
  }> {
    // 1. Fetch organization weekly off setting
    const setting = await trx('organization_settings')
      .where('organization_id', ctx.organizationId)
      .where('setting_key', 'weekly_off_days')
      .whereNull('deleted_at')
      .first();

    const weeklyOffDays: number[] = setting && Array.isArray(setting.settingValue)
      ? setting.settingValue.map((v: any) => parseInt(v, 10))
      : [0, 6]; // Default to Sunday, Saturday (0 and 6)

    // 2. Fetch holiday calendar resolution
    const startYear = new Date(startDate).getFullYear();
    let calendar = null;
    if (locationId) {
      calendar = await trx('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where('year', startYear)
        .where('applicable_location_id', locationId)
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();
    }
    if (!calendar) {
      calendar = await trx('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where('year', startYear)
        .where('is_default', true)
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();
    }

    const holidayDates = new Set<string>();
    if (calendar) {
      const holidays = await trx('holidays')
        .where('organization_id', ctx.organizationId)
        .where('holiday_calendar_id', calendar.id)
        .whereNull('deleted_at');
      for (const h of holidays) {
        holidayDates.add(toLocalYYYYMMDD(h.holidayDate));
      }
    }

    // Helper functions for checking weekend/holiday
    const isWeekend = (d: Date): boolean => weeklyOffDays.includes(d.getDay());
    const isHoliday = (dateStr: string): boolean => holidayDates.has(dateStr);
    const isWeekendOrHoliday = (d: Date, dateStr: string): boolean => isWeekend(d) || isHoliday(dateStr);

    // 3. Fetch existing leave days within margin for sandwich checks
    const marginStart = toLocalYYYYMMDD(new Date(new Date(startDate).getTime() - 15 * 24 * 60 * 60 * 1000));
    const marginEnd = toLocalYYYYMMDD(new Date(new Date(endDate).getTime() + 15 * 24 * 60 * 60 * 1000));

    const existingDayRows = await trx('leave_application_days as lad')
      .join('leave_applications as la', 'lad.application_id', 'la.id')
      .where('la.employee_id', employeeId)
      .whereIn('la.status', ['submitted', 'approved'])
      .whereNull('la.deleted_at')
      .whereNull('lad.deleted_at')
      .where('lad.leave_date', '>=', marginStart)
      .where('lad.leave_date', '<=', marginEnd)
      .select('lad.leave_date', 'lad.is_weekend', 'lad.is_holiday');

    const existingLeaveDays = new Set<string>();
    for (const row of existingDayRows) {
      if (!row.isWeekend && !row.isHoliday) {
        existingLeaveDays.add(toLocalYYYYMMDD(row.leaveDate));
      }
    }

    // 4. Generate candidate days in requested range
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dates.push(toLocalYYYYMMDD(current));
      current.setDate(current.getDate() + 1);
    }

    // Identify requested working leave days in this application
    const currentApplicationLeaveDays = new Set<string>();
    for (const dateStr of dates) {
      const dObj = new Date(dateStr);
      if (!isWeekendOrHoliday(dObj, dateStr)) {
        currentApplicationLeaveDays.add(dateStr);
      }
    }

    // Helper to check if a non-weekend/non-holiday date is covered by leave
    const isDateLeaveCovered = (dateStr: string): boolean => {
      return currentApplicationLeaveDays.has(dateStr) || existingLeaveDays.has(dateStr);
    };

    // Helper to find sandwich status
    const checkIsSandwiched = (dateStr: string): boolean => {
      // Find first working day before
      const prev = new Date(dateStr);
      prev.setDate(prev.getDate() - 1);
      let prevStr = toLocalYYYYMMDD(prev);
      while (isWeekendOrHoliday(prev, prevStr)) {
        prev.setDate(prev.getDate() - 1);
        prevStr = toLocalYYYYMMDD(prev);
      }
      if (!isDateLeaveCovered(prevStr)) return false;

      // Find first working day after
      const next = new Date(dateStr);
      next.setDate(next.getDate() + 1);
      let nextStr = toLocalYYYYMMDD(next);
      while (isWeekendOrHoliday(next, nextStr)) {
        next.setDate(next.getDate() + 1);
        nextStr = toLocalYYYYMMDD(next);
      }
      if (!isDateLeaveCovered(nextStr)) return false;

      return true;
    };

    // 5. Build breakdown and sum total days
    let totalDays = 0;
    const days: Array<{ date: string; type: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'; isHoliday: boolean; isWeekend: boolean; isSandwichDay: boolean }> = [];

    for (const dateStr of dates) {
      const dObj = new Date(dateStr);
      const isWeekOff = isWeekend(dObj);
      const isPubHoliday = isHoliday(dateStr);

      let isSandwich = false;
      if ((isWeekOff || isPubHoliday) && sandwichRuleEnabled) {
        isSandwich = checkIsSandwiched(dateStr);
      }

      let dayType: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF' = 'FULL';
      if (isHalfDay && dateStr === endDate) {
        dayType = halfDayPeriod === 'first_half' ? 'FIRST_HALF' : 'SECOND_HALF';
      }

      // Compute day count contribution
      if (!isWeekOff && !isPubHoliday) {
        // Working day: 1.0 or 0.5
        totalDays += dayType === 'FULL' ? 1.0 : 0.5;
      } else if (isSandwich) {
        // Sandwiched weekend/holiday: counts as 1.0 day of leave
        totalDays += 1.0;
      }

      days.push({
        date: dateStr,
        type: dayType,
        isHoliday: isPubHoliday,
        isWeekend: isWeekOff,
        isSandwichDay: isSandwich,
      });
    }

    return { totalDays, days };
  }
}


