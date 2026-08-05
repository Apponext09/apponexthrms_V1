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
import { getOrgLeaveSettings } from '../utils/settingsResolver';
import axios from 'axios';

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
  isBackdated?: boolean;
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

  private async getStartMonthForLeaveType(ctx: TenantContext, trx: any, leaveTypeId: number, defaultMonth: number): Promise<number> {
    const leaveType = await trx('leave_types').where('id', leaveTypeId).first();
    if (leaveType && leaveType.allocation_settings) {
      try {
        const parsed = typeof leaveType.allocation_settings === 'string'
          ? JSON.parse(leaveType.allocation_settings)
          : leaveType.allocation_settings;
        if (parsed && typeof parsed === 'object') {
          if (parsed.considerLeaveCalendarYear) {
            return 1; // Calendar Year always starts in Jan
          }
          if (parsed.considerLeaveStartYearAsFrom) {
            return parseInt(parsed.leaveStartMonth, 10) || 4;
          }
        }
      } catch (e) {}
    }
    return defaultMonth;
  }

  /**
   * Helper: Resolve or Create Leave Policy Assignment dynamically from Mappings
   */
  private async resolveOrCreateAssignment(
    trx: any,
    ctx: TenantContext,
    employeeId: number,
    employee: any,
    leaveTypeId: number
  ): Promise<any> {
    // 1. Check existing active assignment
    const assignment = await trx('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('leave_type_id', leaveTypeId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .first();

    if (assignment) {
      return assignment;
    }

    // 2. Query mappings matching employee attributes ordered by priority desc
    const mappings = await trx('leave_policy_mappings')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('priority', 'desc');

    // Fetch employee's role IDs from user_roles
    const user = await trx('users').where('employee_id', employeeId).first();
    const roleIds: number[] = [];
    if (user) {
      const uRoles = await trx('user_roles').where('user_id', user.id).select('role_id');
      roleIds.push(...uRoles.map((ur: any) => ur.role_id));
    }

    let matchedMapping = null;
    for (const mapping of mappings) {
      if (mapping.role_id && !roleIds.includes(mapping.role_id)) {
        continue;
      }
      if (mapping.designation_id && String(mapping.designation_id) !== String(employee.current_designation_id || employee.currentDesignationId)) {
        continue;
      }
      if (mapping.department_id && String(mapping.department_id) !== String(employee.current_department_id || employee.currentDepartmentId)) {
        continue;
      }
      if (mapping.employment_type && mapping.employment_type !== employee.employment_type) {
        continue;
      }
      matchedMapping = mapping;
      break;
    }

    let policyId = null;
    if (matchedMapping) {
      policyId = matchedMapping.leave_policy_id;
    } else {
      const defaultPolicy = await trx('leave_policies')
        .where('organization_id', ctx.organizationId)
        .where('is_default', true)
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();
      if (defaultPolicy) {
        policyId = defaultPolicy.id;
      }
    }

    if (!policyId) {
      return null;
    }

    const leaveType = await trx('leave_types')
      .where('id', leaveTypeId)
      .first();

    if (!leaveType) {
      return null;
    }

    const [insertedId] = await trx('leave_policy_assignments').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      leave_policy_id: policyId,
      leave_type_id: leaveTypeId,
      annual_quota: leaveType.annual_quota || leaveType.annualQuota || 12,
      carry_forward_enabled: leaveType.carry_forward_enabled || leaveType.carryForwardEnabled || false,
      carry_forward_limit: leaveType.carry_forward_limit || leaveType.carryForwardLimit || null,
      encashment_enabled: leaveType.encashment_enabled || leaveType.encashmentEnabled || false,
      encashment_limit: leaveType.encashment_limit || leaveType.encashmentLimit || null,
      sandwich_policy_enabled: leaveType.sandwich_rule_enabled || leaveType.sandwichRuleEnabled || false,
      probation_excluded: false,
      assignment_start_date: employee.date_of_joining || employee.dateOfJoining || toLocalYYYYMMDD(new Date()),
      is_active: true,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await trx('leave_policy_assignments')
      .where('id', insertedId)
      .first();
  }

  /**
   * Helper to check array overlap for Eligibility Engine
   */
  private checkEmploymentEligibility(employee: any, settings: any): boolean {
    if (!settings || Object.keys(settings).length === 0) return true; // No rules set

    const hasOverlap = (employeeVal: any, ruleArray: any[]) => {
      if (!ruleArray || !Array.isArray(ruleArray) || ruleArray.length === 0) return true;
      if (!employeeVal) return false;
      const eArray = Array.isArray(employeeVal) ? employeeVal : [employeeVal];
      return eArray.some(e => ruleArray.includes(e) || ruleArray.includes(String(e)) || ruleArray.includes(Number(e)));
    };

    if (!hasOverlap(employee.current_department_id || employee.currentDepartmentId, settings.departments)) return false;
    if (!hasOverlap(employee.current_location_id || employee.currentLocationId, settings.locations)) return false;
    if (!hasOverlap(employee.employment_type || employee.employmentType || (employee as any).employee_type, settings.employeeTypes)) return false;
    if (!hasOverlap(employee.status, settings.employeeStatuses)) return false;

    return true;
  }

  /**
   * Apply for leave
   */
  async applyLeave(ctx: TenantContext, input: ApplyLeaveInput): Promise<LeaveApplication> {
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

      // Fetch active leave type to check settings
      const leaveType = await trx('leave_types')
        .where('id', input.leaveTypeId)
        .where('status', 'active')
        .whereNull('deleted_at')
        .first();

      if (!leaveType) {
        throw new ValidationError('Leave category not found or inactive.');
      }

      const parseDoubleJson = (val: any) => {
        if (!val) return {};
        let parsed = val;
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(e) {} }
        if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(e) {} }
        return parsed || {};
      };

      const allocationSettings = parseDoubleJson(leaveType.allocationSettings || leaveType.allocation_settings);

      // Resolve location-specific settings for financial/holiday year start
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee.currentLocationId || employee.current_location_id);
      
      let startMonth = settings.holidayYearStartMonth;
      if (allocationSettings.considerLeaveCalendarYear) {
        startMonth = 1;
      } else if (allocationSettings.considerLeaveStartYearAsFrom) {
        startMonth = parseInt(allocationSettings.leaveStartMonth, 10) || 4;
      }

      const fyStart = calculateFinancialYearStart(input.startDate, startMonth);

      // 3.5 Check Blackout Periods Gating
      const start = input.startDate;
      const end = input.endDate;
      const deptId = employee.currentDepartmentId || employee.current_department_id || null;
      const locId = employee.currentLocationId || employee.current_location_id || null;

      const overlappingBlackout = await trx('leave_blackout_periods')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where((builder) => {
          builder.where('start_date', '<=', end)
            .andWhere('end_date', '>=', start);
        })
        .where((builder) => {
          builder.whereNull('applicable_department_id')
            .orWhere('applicable_department_id', deptId);
        })
        .where((builder) => {
          builder.whereNull('applicable_location_id')
            .orWhere('applicable_location_id', locId);
        })
        .first();

      if (overlappingBlackout) {
        throw new ValidationError(`The requested dates overlap with a restricted blackout period: ${overlappingBlackout.reason || 'Restricted period'}`);
      }
      const applicationSettings = parseDoubleJson(leaveType.applicationSettings || leaveType.application_settings);
      const employmentAllocSettings = parseDoubleJson(leaveType.employmentAllocationSettings || leaveType.employment_allocation_settings);
      const employmentAppSettings = parseDoubleJson(leaveType.employmentApplicationSettings || leaveType.employment_application_settings);

      // EMPLOYMENT ELIGIBILITY VALIDATION
      if (!this.checkEmploymentEligibility(employee, employmentAppSettings)) {
        throw new ValidationError('You are not eligible to apply for this leave type based on your current employment configuration (Department, Grade, Location, etc).');
      }

      // SUPPORTING DOCUMENTS VALIDATION
      if (applicationSettings.supportingDocumentsRequired) {
        if (!input.documentUrl && (!input.attachments || input.attachments.length === 0)) {
          throw new ValidationError('Supporting documents are required for this leave category.');
        }
      }

      // UNCATEGORIZED CONFIRMATION RULE
      if (allocationSettings.allocateLeaveIfConfirmationDatePresent) {
        if (employee.status === 'resigned' || (employee.resignation_date && new Date(employee.resignation_date) <= new Date())) {
          if (!employee.confirmation_date && !employee.confirmationDate) {
            throw new ValidationError('This leave type cannot be allocated to resigned employees without a confirmation date.');
          }
        }
      }

      // GENDER APPLICABILITY VALIDATION
      const leaveGender = (leaveType.gender_applicable || leaveType.genderApplicable || 'all').toLowerCase();
      if (leaveGender !== 'all') {
        const empGender = (employee.gender || '').toLowerCase();
        if (empGender !== leaveGender) {
          throw new ValidationError(
            `This leave type is only applicable for ${leaveGender} employees.`
          );
        }
      }

      // Fetch or dynamically create applicable LeavePolicy Assignment
      const assignment = await this.resolveOrCreateAssignment(
        trx,
        ctx,
        input.employeeId,
        employee,
        input.leaveTypeId
      );

      if (!assignment) {
        throw new ValidationError('No active leave policy assignment found or could be dynamically resolved for this employee and leave category.');
      }

      // ADVANCE NOTICE / GRACE PERIOD VALIDATION
      if (settings.leaveApplicationDateRestriction) {
        const todayValidationDate = new Date();
        todayValidationDate.setHours(0,0,0,0);
        const startD = new Date(input.startDate);
        startD.setHours(0,0,0,0);
        const diffTime = startD.getTime() - todayValidationDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (applicationSettings.category === 'planned' && applicationSettings.daysInAdvance) {
          const advDays = parseInt(applicationSettings.daysInAdvance, 10);
          if (!isNaN(advDays) && advDays > 0) {
            let reqDays = advDays;
            if (applicationSettings.daysInAdvanceUnit === 'Weeks') reqDays = advDays * 7;
            if (applicationSettings.daysInAdvanceUnit === 'Months') reqDays = advDays * 30;
            if (diffDays < reqDays) {
              throw new ValidationError(`Planned leaves require an advance notice of at least ${reqDays} days.`);
            }
          }
        } else if (applicationSettings.category === 'unplanned' && applicationSettings.gracePeriod) {
          const graceDays = parseInt(applicationSettings.gracePeriod, 10);
          if (!isNaN(graceDays) && graceDays > 0 && diffDays < 0) {
            // If backdated
            if (Math.abs(diffDays) > graceDays) {
              throw new ValidationError(`Unplanned leaves cannot be backdated beyond the grace period of ${graceDays} days.`);
            }
          }
        }
      }

      // GAP BETWEEN APPLICATION VALIDATION
      if (applicationSettings.gapBetweenApplication) {
        const gapVal = parseInt(applicationSettings.gapBetweenApplication, 10);
        if (!isNaN(gapVal) && gapVal > 0) {
          let reqGap = gapVal;
          if (applicationSettings.gapBetweenApplicationUnit === 'Weeks') reqGap = gapVal * 7;
          if (applicationSettings.gapBetweenApplicationUnit === 'Months') reqGap = gapVal * 30;
          
          const lastLeave = await trx('leave_applications')
            .where('employee_id', input.employeeId)
            .where('leave_type_id', input.leaveTypeId)
            .whereIn('status', ['approved', 'submitted'])
            .whereNull('deleted_at')
            .orderBy('application_end_date', 'desc')
            .first();

          if (lastLeave) {
            const lastEnd = new Date(lastLeave.application_end_date);
            lastEnd.setHours(0,0,0,0);
            const gapDiff = Math.ceil((startD.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24));
            if (gapDiff >= 0 && gapDiff < reqGap) {
              throw new ValidationError(`A gap of at least ${reqGap} days is required between applications of this leave type.`);
            }
          }
        }
      }

      // Calculate total leave days and daily records inside the transaction context (with lock held)
      const isSandwichEnabled = !!(leaveType.sandwich_rule_enabled || leaveType.sandwichRuleEnabled) && !allocationSettings.excludeLeaveFromSandwichPolicy;
      const { totalDays: computedTotalDays, days } = await this.calculateLeaveDaysAndBreakdown(
        trx,
        ctx,
        input.employeeId,
        employee.currentLocationId,
        input.leaveTypeId,
        input.startDate,
        input.endDate,
        input.isHalfDay,
        input.halfDayPeriod || 'first_half',
        isSandwichEnabled,
        !!assignment.prefix_suffix_rule_enabled,
        !!applicationSettings.excludeWeekend,
        !!applicationSettings.excludeHoliday
      );

      let totalDays = computedTotalDays;
      if (input.isHourly && input.hourlyDuration) {
        totalDays = input.hourlyDuration / 8;
      }

      if (totalDays <= 0) {
        throw new ValidationError('Leave duration must be greater than 0 days (all requested days are weekends/holidays).');
      }

      // MIN/MAX DAYS VALIDATION
      if (applicationSettings.minDaysAllowed) {
        const minD = parseFloat(applicationSettings.minDaysAllowed);
        if (!isNaN(minD) && totalDays < minD) {
          throw new ValidationError(`You must apply for a minimum of ${minD} days for this leave type.`);
        }
      }
      if (applicationSettings.maxDaysAllowed) {
        const maxD = parseFloat(applicationSettings.maxDaysAllowed);
        if (!isNaN(maxD) && totalDays > maxD) {
          throw new ValidationError(`You cannot apply for more than ${maxD} days at once for this leave type.`);
        }
      }

      // MULTIPLE OF ONE VALIDATION
      if (applicationSettings.applyInMultipleOfOne) {
        if (totalDays % 1 !== 0) {
          throw new ValidationError(`This leave type can only be applied in full days (Multiple of One). Half days are not allowed.`);
        }
      }

      // BEFORE CONFIRMATION VALIDATION
      if (applicationSettings.beforeConfirmation || applicationSettings.restrictBeforeConfirmation || applicationSettings.applyLeaveBeforeConfirmationDate) {
        if (!employee.confirmation_date && !employee.confirmationDate) {
          throw new ValidationError(`You cannot apply for this leave category before your confirmation date.`);
        }
      }

      // APPLY FROM SPECIFIC DATE VALIDATION
      if (applicationSettings.applyLeaveFromThisDate) {
        const thresholdDate = new Date(applicationSettings.applyLeaveFromThisDate);
        thresholdDate.setHours(0,0,0,0);
        if (startD < thresholdDate) {
          throw new ValidationError(`You cannot apply for this leave for dates before ${thresholdDate.toLocaleDateString()}.`);
        }
      }

      // CANCEL FUTURE APPLIED LEAVE ON RESIGNATION VALIDATION
      if (applicationSettings.cancelFutureAppliedLeaveOnResignation) {
        const resignationDate = employee.resignation_date || employee.resignationDate;
        if (resignationDate) {
          const resDate = new Date(resignationDate);
          resDate.setHours(0,0,0,0);
          if (startD >= resDate) {
            throw new ValidationError('You cannot apply for leave for dates after your resignation date.');
          }
        }
      }

      // RESTRICT BEFORE OR AFTER WEEKEND / HOLIDAY
      if (
        applicationSettings.restrictBeforeOrAfterHoliday ||
        applicationSettings.restrictBeforeAfterHoliday ||
        applicationSettings.restrictBeforeOrAfterWeekend ||
        applicationSettings.restrictBeforeAfterWeekend
      ) {
        // We check the first day and last day in the breakdown to see if they are adjacent to a weekend/holiday
        const firstDayStr = days[0]?.date;
        const lastDayStr = days[days.length - 1]?.date;
        
        if (firstDayStr && lastDayStr) {
          const prevDay = new Date(firstDayStr);
          prevDay.setDate(prevDay.getDate() - 1);
          
          const nextDay = new Date(lastDayStr);
          nextDay.setDate(nextDay.getDate() + 1);

          if (applicationSettings.restrictBeforeOrAfterWeekend || applicationSettings.restrictBeforeAfterWeekend) {
            const isPrevWeekend = [0, 6].includes(prevDay.getDay()); // Assuming standard Sat/Sun for simple check
            const isNextWeekend = [0, 6].includes(nextDay.getDay());
            if (isPrevWeekend || isNextWeekend) {
              throw new ValidationError(`You cannot apply for this leave immediately before or after a weekend.`);
            }
          }
          
          if (applicationSettings.restrictBeforeOrAfterHoliday || applicationSettings.restrictBeforeAfterHoliday) {
            // Check holiday table
            const adjacentHolidays = await trx('holidays')
              .where('organization_id', ctx.organizationId)
              .whereNull('deleted_at')
              .whereIn('holiday_date', [toLocalYYYYMMDD(prevDay), toLocalYYYYMMDD(nextDay)])
              .first();
            if (adjacentHolidays) {
              throw new ValidationError(`You cannot apply for this leave immediately before or after a public holiday.`);
            }
          }
        }
      }

      // NUMBER OF TIMES / LEAVES LIMITS (PER MONTH / YEAR)
      if (applicationSettings.noOfTimesEmployeeCanApply) {
        const timesLimit = parseInt(applicationSettings.noOfTimesEmployeeCanApply, 10);
        const timesUnit = applicationSettings.noOfTimesEmployeeCanApplyUnit; // 'Per Month' | 'Per Year'
        if (!isNaN(timesLimit) && timesLimit > 0 && timesUnit) {
          const appQuery = trx('leave_applications')
            .where('employee_id', input.employeeId)
            .where('leave_type_id', input.leaveTypeId)
            .whereIn('status', ['approved', 'submitted', 'pending_manager', 'pending_hr'])
            .whereNull('deleted_at');
          
          if (timesUnit === 'Per Month') {
            appQuery.whereRaw(`EXTRACT(MONTH FROM application_start_date) = ?`, [startD.getMonth() + 1])
                    .whereRaw(`EXTRACT(YEAR FROM application_start_date) = ?`, [startD.getFullYear()]);
          } else if (timesUnit === 'Per Year') {
            appQuery.whereRaw(`EXTRACT(YEAR FROM application_start_date) = ?`, [startD.getFullYear()]);
          }

          const countRes = await appQuery.count('id as count').first();
          const count = countRes ? parseInt(String((countRes as any).count || 0), 10) : 0;
          
          if (count >= timesLimit) {
            throw new ValidationError(`You have reached the maximum limit of applying for this leave type (${timesLimit} times ${timesUnit}).`);
          }
        }
      }

      if (applicationSettings.noOfLeavesEmployeeCanApply) {
        const daysLimit = parseFloat(applicationSettings.noOfLeavesEmployeeCanApply);
        const daysUnit = applicationSettings.noOfLeavesEmployeeCanApplyUnit; // 'Per Month' | 'Per Year'
        if (!isNaN(daysLimit) && daysLimit > 0 && daysUnit) {
          const sumQuery = trx('leave_applications')
            .where('employee_id', input.employeeId)
            .where('leave_type_id', input.leaveTypeId)
            .whereIn('status', ['approved', 'submitted', 'pending_manager', 'pending_hr'])
            .whereNull('deleted_at');
          
          if (daysUnit === 'Per Month') {
            sumQuery.whereRaw(`EXTRACT(MONTH FROM application_start_date) = ?`, [startD.getMonth() + 1])
                    .whereRaw(`EXTRACT(YEAR FROM application_start_date) = ?`, [startD.getFullYear()]);
          } else if (daysUnit === 'Per Year') {
            sumQuery.whereRaw(`EXTRACT(YEAR FROM application_start_date) = ?`, [startD.getFullYear()]);
          }

          const sumRes = await sumQuery.sum('total_days as sum').first();
          const sumDays = sumRes ? parseFloat(String((sumRes as any).sum || 0)) : 0;
          
          if ((sumDays + totalDays) > daysLimit) {
            throw new ValidationError(`You have reached the maximum limit of leave days for this type (${daysLimit} days ${daysUnit}). You have already applied for ${sumDays} days.`);
          }
        }
      }

      // 3.5 TEAM CONFLICT MANAGEMENT & CONCURRENT LEAVE CAP VALIDATION
      const maxConcurrent = assignment.max_team_members_on_leave_simultaneously;
      let hasConflict = false;
      let overlappingCount = 0;

      if (maxConcurrent !== null && maxConcurrent !== undefined && maxConcurrent > 0 && deptId) {
        const overlappingApplications = await trx('leave_applications as la')
          .join('employees as e', 'la.employee_id', 'e.id')
          .where('la.organization_id', ctx.organizationId)
          .where('e.current_department_id', deptId)
          .whereNot('la.employee_id', input.employeeId)
          .whereIn('la.status', ['approved', 'submitted', 'pending_manager', 'pending_hr'])
          .whereNull('la.deleted_at')
          .whereNull('e.deleted_at')
          .andWhere((q) => {
            q.where('la.application_start_date', '<=', input.endDate)
              .andWhere('la.application_end_date', '>=', input.startDate);
          })
          .countDistinct('la.employee_id as count')
          .first();

        overlappingCount = overlappingApplications ? parseInt(String((overlappingApplications as any).count || 0), 10) : 0;

        if (overlappingCount >= maxConcurrent) {
          const capMode = assignment.concurrent_leave_cap_mode || 'hard_block';
          if (capMode === 'hard_block') {
            throw new ValidationError(
              `Leave application exceeds the maximum team limit. There are already ${overlappingCount} team members scheduled to be on leave during this period (Limit: ${maxConcurrent}).`
            );
          } else if (capMode === 'warning') {
            hasConflict = true;
          }
        }
      }

      // 4. NOTICE PERIOD EXCLUSION VALIDATION
      if (assignment.notice_period_excluded) {
        const activeExit = await trx('exit_requests')
          .where('employee_id', input.employeeId)
          .where('organization_id', ctx.organizationId)
          .whereIn('status', ['initiated', 'approved'])
          .whereNull('deleted_at')
          .first();
        if (activeExit) {
          throw new ValidationError('Leaves of this category cannot be applied for during notice period.');
        }
      }

      // 4.5 PROBATION PERIOD EXCLUSION VALIDATION
      if (assignment.probation_excluded || assignment.probationExcluded) {
        const isProbation = employee.status === 'probation' || 
          (employee.probationEndDate && new Date(employee.probationEndDate) > new Date()) || 
          (employee.probation_end_date && new Date(employee.probation_end_date) > new Date());
        if (isProbation) {
          throw new ValidationError('Leaves of this category cannot be applied for during probation period.');
        }
      }

      // 4.6 MINIMUM SERVICE REQUIRED VALIDATION (Non-Calendar)
      if (allocationSettings.minServiceRequired && allocationSettings.minServiceRequiredUnit && allocationSettings.minServiceRequiredUnit !== 'Select') {
        const minService = parseInt(allocationSettings.minServiceRequired, 10);
        if (!isNaN(minService) && minService > 0 && (employee.dateOfJoining || employee.date_of_joining)) {
          const doj = new Date(employee.dateOfJoining || employee.date_of_joining);
          const today = new Date();
          let diffMonths = (today.getFullYear() - doj.getFullYear()) * 12 + (today.getMonth() - doj.getMonth());
          if (today.getDate() < doj.getDate()) {
            diffMonths--;
          }
          
          let isValid = true;
          if (allocationSettings.minServiceRequiredUnit === 'Months') {
            isValid = diffMonths >= minService;
          } else if (allocationSettings.minServiceRequiredUnit === 'Years') {
            isValid = diffMonths >= (minService * 12);
          } else if (allocationSettings.minServiceRequiredUnit === 'Days') {
            const diffDays = Math.floor((today.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24));
            isValid = diffDays >= minService;
          }

          if (!isValid) {
            throw new ValidationError(`You must complete ${minService} ${allocationSettings.minServiceRequiredUnit} of service to apply for this leave.`);
          }
        }
      }

      // 4.7 NO. OF TIMES IN SERVICE VALIDATION (Non-Calendar)
      if (allocationSettings.noOfTimesInService) {
        const limit = parseInt(allocationSettings.noOfTimesInService, 10);
        if (!isNaN(limit) && limit > 0) {
          const timesApplied = await trx('leave_applications')
            .where('employee_id', input.employeeId)
            .where('leave_type_id', input.leaveTypeId)
            .whereIn('status', ['submitted', 'approved', 'pending_manager', 'pending_hr'])
            .whereNull('deleted_at')
            .count('id as count')
            .first();
            
          const count = timesApplied ? parseInt(String((timesApplied as any).count || 0), 10) : 0;
          if (count >= limit) {
            throw new ValidationError(`You have reached the maximum limit (${limit} times) for applying this leave type during your service.`);
          }
        }
      }

      // 5. MAXIMUM CONSECUTIVE LEAVES VALIDATION
      if (assignment.max_consecutive_days !== null && assignment.max_consecutive_days > 0) {
        if (totalDays > assignment.max_consecutive_days) {
          throw new ValidationError(`You cannot apply for more than ${assignment.max_consecutive_days} consecutive days of this leave type.`);
        }
      }

      // 6. BACKDATED & FUTURE BOOKING LIMITS VALIDATION
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const appStart = new Date(input.startDate);
      appStart.setHours(0, 0, 0, 0);

      const maxBackdated = assignment.max_backdated_days !== null && assignment.max_backdated_days >= 0 
        ? assignment.max_backdated_days 
        : (allocationSettings.requestLeaveWithinDays ? parseInt(allocationSettings.requestLeaveWithinDays, 10) : null);

      if (maxBackdated !== null && !isNaN(maxBackdated)) {
        const diffTime = todayDate.getTime() - appStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > maxBackdated) {
          throw new ValidationError(`You cannot apply for leaves backdated more than ${maxBackdated} days.`);
        }
      }

      if (assignment.max_future_days !== null && assignment.max_future_days >= 0) {
        const diffTime = appStart.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > assignment.max_future_days) {
          throw new ValidationError(`You cannot apply for leaves more than ${assignment.max_future_days} days in advance.`);
        }
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

      // 7. Overlap validation check: Block if any overlapping approved or submitted leaves exist
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

      // 7.5 LEAVE CLUBBING VALIDATION (Org-Level Setting)
      if (settings.leaveClubbingRules && Array.isArray(settings.leaveClubbingRules) && settings.leaveClubbingRules.length > 0) {
        const currentLeaveName = (leaveType.leave_name || leaveType.leaveName || '').trim();

        for (const rule of settings.leaveClubbingRules) {
          const clubbedTypes: string[] = Array.isArray(rule.leaveTypes) ? rule.leaveTypes.map((t: string) => t.trim()) : [];
          const maxDays = parseFloat(rule.maxDays) || 0;

          if (maxDays < 0 || clubbedTypes.length < 2) continue;
          if (!clubbedTypes.includes(currentLeaveName)) continue;

          // Find leave_type IDs for all the OTHER clubbed leave types
          const otherClubbedNames = clubbedTypes.filter(n => n !== currentLeaveName);
          const otherTypes = await trx('leave_types')
            .where('organization_id', ctx.organizationId)
            .whereIn('leave_name', otherClubbedNames)
            .whereNull('deleted_at')
            .select('id', 'leave_name');

          if (otherTypes.length === 0) continue;

          const otherTypeIds = otherTypes.map((t: any) => t.id);

          // Check for adjacent or overlapping leaves of the other clubbed types
          // "Adjacent" means the other leave ends on the day before this starts, or starts the day after this ends
          const adjacencyStart = new Date(input.startDate);
          adjacencyStart.setDate(adjacencyStart.getDate() - 1);
          const adjacencyEnd = new Date(input.endDate);
          adjacencyEnd.setDate(adjacencyEnd.getDate() + 1);

          const adjacentLeaves = await trx('leave_applications')
            .where('employee_id', input.employeeId)
            .whereIn('leave_type_id', otherTypeIds)
            .whereIn('status', ['approved', 'submitted', 'pending_manager', 'pending_hr'])
            .whereNull('deleted_at')
            .andWhere((q: any) => {
              q.where('application_start_date', '<=', toLocalYYYYMMDD(adjacencyEnd))
                .andWhere('application_end_date', '>=', toLocalYYYYMMDD(adjacencyStart));
            })
            .select('total_days', 'leave_type_id');

          if (adjacentLeaves.length > 0) {
            const adjacentTotalDays = adjacentLeaves.reduce((sum: number, l: any) => sum + (parseFloat(l.total_days || l.totalDays) || 0), 0);
            const combinedDays = adjacentTotalDays + totalDays;
            const otherNames = otherTypes.map((t: any) => t.leave_name || t.leaveName).join(', ');

            if (maxDays === 0) {
              // Rule A: Clubbing is NOT allowed at all
              throw new ValidationError(
                `${currentLeaveName} cannot be combined with ${otherNames} per organization policy.`
              );
            } else if (combinedDays > maxDays) {
              // Rule B: Maximum Limit
              throw new ValidationError(
                `The combined duration of these leaves exceeds the maximum limit of ${maxDays} days.`
              );
            }
          }
        }
      }

      // 7.6 LEAVE RESTRICTION VALIDATION (Org-Level Setting)
      if (settings.leaveRestrictionRules && Array.isArray(settings.leaveRestrictionRules) && settings.leaveRestrictionRules.length > 0) {
        const currentLeaveName = (leaveType.leave_name || leaveType.leaveName || '').trim();

        for (const rule of settings.leaveRestrictionRules) {
          const allowLeave = (rule.allowLeaveType || '').trim();
          const whenTypes: string[] = Array.isArray(rule.whenLeaveTypes) ? rule.whenLeaveTypes.map((t: string) => t.trim()) : [];
          const numDays = parseFloat(rule.numDays) || 0;

          if (!allowLeave || whenTypes.length === 0 || numDays < 0) continue;
          if (allowLeave !== currentLeaveName) continue;

          // Find leave_type IDs for the "when" leave types
          const whenLeaveTypes = await trx('leave_types')
            .where('organization_id', ctx.organizationId)
            .whereIn('leave_name', whenTypes)
            .whereNull('deleted_at')
            .select('id', 'leave_name', 'annual_quota');

          if (whenLeaveTypes.length === 0) continue;

          const whenTypeIds = whenLeaveTypes.map((t: any) => t.id);

          // Query current available balances of the "when" leave types for the employee
          const balances = await trx('leave_balances')
            .where('organization_id', ctx.organizationId)
            .where('employee_id', input.employeeId)
            .whereIn('leave_type_id', whenTypeIds)
            .where('financial_year_start', fyStart)
            .whereNull('deleted_at');

          let availableSum = 0;
          for (const tId of whenTypeIds) {
            const bal = balances.find((b: any) => (b.leave_type_id || b.leaveTypeId) === tId);
            if (bal) {
              availableSum += parseFloat(bal.availableBalance || bal.available_balance || 0);
            } else {
              // If no balance row exists, assume full annual quota for that leave type (since it's not consumed yet)
              const lt = whenLeaveTypes.find((l: any) => l.id === tId);
              if (lt) {
                availableSum += parseFloat(lt.annualQuota || lt.annual_quota || 0);
              }
            }
          }

          // If available balance is greater than the configured restriction limit (e.g. > 0), block the application
          if (availableSum > numDays) {
            const whenNames = whenLeaveTypes.map((t: any) => t.leave_name || t.leaveName).join(', ');
            throw new ValidationError(
              `You cannot apply for ${currentLeaveName} because you still have active ${whenNames} balance remaining.`
            );
          }
        }
      }

      // 8. Lock the balance row to prevent race conditions
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

      // 9. Balance validation check & Fallback Logic
      const availableBalance = balance ? parseFloat(balance.availableBalance || balance.available_balance || 0) : 0;
      
      let lopDays = 0;
      let poolLeaveTypeId: number | null = null;
      const paidType = allocationSettings.noPayment ? 'unpaid' : (leaveType.paidType || leaveType.paid_type || 'paid');

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

      // Check if applicant is a Manager or Department Head
      const applicantUser = await trx('users')
        .where('employee_id', input.employeeId)
        .first();

      let isApplicantManager = false;
      if (applicantUser) {
        const applicantRoles = await trx('user_roles')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('user_roles.user_id', applicantUser.id)
          .select('roles.code');
        isApplicantManager = applicantRoles.some(
          (r: any) => r.code === 'manager' || r.code === 'department_head'
        );
      }

      const initialStatus = isApplicantManager ? 'pending_hr' : 'pending_manager';

      // Check for active delegate approver
      let delegatedToUserId: number | null = null;
      const mgrEmpId = employee.reporting_manager_id || employee.reportingManagerId;
      if (mgrEmpId) {
        const managerUser = await trx('users')
          .where('employee_id', mgrEmpId)
          .first();

        if (managerUser) {
          const todayStr = toLocalYYYYMMDD(new Date());
          const delegation = await trx('leave_delegations')
            .where('organization_id', ctx.organizationId)
            .where('delegated_by_user_id', managerUser.id)
            .where('delegation_start_date', '<=', todayStr)
            .where('delegation_end_date', '>=', todayStr)
            .where('status', 'active')
            .whereNull('deleted_at')
            .first();

          if (delegation) {
            delegatedToUserId = delegation.delegated_to_user_id;
          }
        }
      }

      // Determine if the application contains any sandwich days
      const hasSandwich = days.some(d => d.isSandwichDay);

      // Check if backdated leave and check locked payroll
      const today = new Date();
      const startDateObj = new Date(input.startDate);
      const isBackdated = input.isBackdated || (
        startDateObj.getFullYear() < today.getFullYear() || 
        (startDateObj.getFullYear() === today.getFullYear() && startDateObj.getMonth() < today.getMonth())
      );

      let requiresPayrollArrears = false;
      if (isBackdated) {
        const leaveMonth = input.startDate.substring(0, 7);
        const port = process.env.PORT || '3000';
        let isLocked = false;

        // Try HTTP first
        try {
          const checkRes = await axios.get(`http://localhost:${port}/api/v1/payroll/is-locked?month=${leaveMonth}`, {
            headers: { 'x-tenant-id': String(ctx.organizationId) }
          });
          isLocked = checkRes.data.locked;
        } catch (err) {
          // Fallback: direct DB check
          const payrollRun = await trx('payroll_runs')
            .where('organization_id', ctx.organizationId)
            .where('status', 'locked')
            .where('run_month', 'like', `${leaveMonth}%`)
            .first();
          isLocked = !!payrollRun;
        }

        if (isLocked) {
          requiresPayrollArrears = true;
          // Post adjustment event to Payroll
          try {
            await axios.post(`http://localhost:${port}/api/v1/payroll/arrears-adjustment`, {
              employeeId: input.employeeId,
              leaveTypeId: input.leaveTypeId,
              deficitDays: totalDays,
              exitDate: input.endDate
            }, {
              headers: { 'x-tenant-id': String(ctx.organizationId) }
            });
          } catch (err) {
            console.error('[LeaveService] Failed to post arrears-adjustment event to payroll service:', (err as Error).message);
          }
        }
      }

      // 10. Insert Leave Application
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
        delegated_to_user_id: delegatedToUserId,
        is_backdated: isBackdated,
        requires_payroll_arrears: requiresPayrollArrears,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 10.5 If delegated, write to leave_approvals table as an audit log entry
      if (delegatedToUserId && mgrEmpId) {
        const mgrUser = await trx('users')
          .where('employee_id', mgrEmpId)
          .first();
        await trx('leave_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          application_id: applicationId,
          approver_id: mgrUser ? mgrUser.id : mgrEmpId,
          approver_role: 'manager',
          status: 'delegated',
          comments: `Leave approval delegated to user ID ${delegatedToUserId}.`,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // 11. Insert Daily Breakdown Records
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

      // 12. Create RESERVATION ledger entry
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

      // 13. Update pending and available balances on leave_balances (no Math.max floored clamp)
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

      if (createdApp) {
        (createdApp as any).team_conflict_warning = hasConflict;
        (createdApp as any).overlapping_count = overlappingCount;
      }

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

      // Resolve location-specific settings for financial/holiday year start
      const employee = await trx('employees').where('id', app.employeeId).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.currentLocationId || employee.current_location_id) : null);
      const startMonth = await this.getStartMonthForLeaveType(ctx, trx, app.leaveTypeId, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(app.applicationStartDate), startMonth);

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
    sandwichRuleEnabled: boolean,
    prefixSuffixRuleEnabled: boolean,
    excludeWeekend: boolean = false,
    excludeHoliday: boolean = false
  ): Promise<{
    totalDays: number;
    days: Array<{ date: string; type: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'; isHoliday: boolean; isWeekend: boolean; isSandwichDay: boolean; isPrefixSuffixDay?: boolean }>;
  }> {
    // 1. Fetch organization weekly work pattern from settings (resolving location fallback)
    const settings = await getOrgLeaveSettings(ctx.organizationId, locationId);
    const weeklyWorkPattern = settings.weeklyWorkPattern || getDefaultWeeklyWorkPattern();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weeklyOffDays: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dayName = dayNames[i];
      const pattern = weeklyWorkPattern[dayName];
      if (pattern) {
        if (pattern.isWorking === false || pattern.is_working === false) {
          weeklyOffDays.push(i);
        }
      } else {
        // Fallback: Default Sunday and Saturday as week off if pattern for that day is missing
        if (i === 0 || i === 6) {
          weeklyOffDays.push(i);
        }
      }
    }

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

    // Check if policy has entitlement_includes_public_holidays enabled and leave code is EL/PL
    const assignment = await trx('leave_policy_assignments as lpa')
      .join('leave_policies as lp', 'lpa.leave_policy_id', 'lp.id')
      .join('leave_types as lt', 'lpa.leave_type_id', 'lt.id')
      .where({
        'lpa.employee_id': employeeId,
        'lpa.leave_type_id': leaveTypeId,
        'lpa.is_active': true,
      })
      .select(
        'lp.entitlement_includes_public_holidays as includesPublicHolidays',
        'lt.leave_code as leaveCode'
      )
      .first();

    const includesHolidays = assignment
      ? Boolean(assignment.includesPublicHolidays || assignment.entitlement_includes_public_holidays)
      : false;
    const leaveCode = assignment ? String(assignment.leaveCode || assignment.leave_code || '').toUpperCase() : '';

    // Helper functions for checking weekend/holiday
    const isWeekend = (d: Date): boolean => weeklyOffDays.includes(d.getDay());
    const isHoliday = (dateStr: string): boolean => {
      if (holidayDates.has(dateStr)) {
        if (includesHolidays && (leaveCode === 'EL' || leaveCode === 'PL')) {
          return false; // Treat as normal consumed leave day
        }
        return true;
      }
      return false;
    };
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

    const isDateLeaveCovered = (dateStr: string): boolean => {
      return currentApplicationLeaveDays.has(dateStr) || existingLeaveDays.has(dateStr);
    };

    // Helper to find sandwich status
    const checkIsSandwiched = (dateStr: string): boolean => {
      const prev = new Date(dateStr);
      prev.setDate(prev.getDate() - 1);
      let prevStr = toLocalYYYYMMDD(prev);
      while (isWeekendOrHoliday(prev, prevStr)) {
        prev.setDate(prev.getDate() - 1);
        prevStr = toLocalYYYYMMDD(prev);
      }
      if (!isDateLeaveCovered(prevStr)) return false;

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
    const days: Array<{ date: string; type: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'; isHoliday: boolean; isWeekend: boolean; isSandwichDay: boolean; isPrefixSuffixDay?: boolean }> = [];

    for (const dateStr of dates) {
      const dObj = new Date(dateStr);
      const isWeekOff = isWeekend(dObj);
      const isPubHoliday = isHoliday(dateStr);

      let isSandwich = false;
      if ((isWeekOff || isPubHoliday) && sandwichRuleEnabled) {
        isSandwich = checkIsSandwiched(dateStr);
      }

      let isPrefixSuffix = false;
      if ((isWeekOff || isPubHoliday) && prefixSuffixRuleEnabled && !isSandwich) {
        const prevDay = new Date(dateStr);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = toLocalYYYYMMDD(prevDay);

        const nextDay = new Date(dateStr);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = toLocalYYYYMMDD(nextDay);

        isPrefixSuffix = isDateLeaveCovered(prevDayStr) || isDateLeaveCovered(nextDayStr);
      }

      let dayType: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF' = 'FULL';
      if (isHalfDay && dateStr === endDate) {
        dayType = halfDayPeriod === 'first_half' ? 'FIRST_HALF' : 'SECOND_HALF';
      }

      if (!isWeekOff && !isPubHoliday) {
        totalDays += dayType === 'FULL' ? 1.0 : 0.5;
      } else if (isSandwich || isPrefixSuffix) {
        // Evaluate exclusions
        if (isWeekOff && excludeWeekend) {
          // Excluded weekend
        } else if (isPubHoliday && excludeHoliday) {
          // Excluded holiday
        } else {
          totalDays += 1.0;
        }
      }

      days.push({
        date: dateStr,
        type: dayType,
        isHoliday: isPubHoliday,
        isWeekend: isWeekOff,
        isSandwichDay: isSandwich,
        isPrefixSuffixDay: isPrefixSuffix,
      });
    }

    return { totalDays, days };
  }

  /**
   * Request Leave Encashment
   */
  async requestLeaveEncashment(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    encashmentDays: number,
    reason: string
  ): Promise<any> {
    const result = await withTransaction(async (trx) => {
      // 1. Fetch employee
      const employee = await trx('employees')
        .where({ id: employeeId, organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .first();

      if (!employee) {
        throw new ValidationError('Employee record not found.');
      }

      // Resolve location-specific settings for financial/holiday year start
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee.currentLocationId || employee.current_location_id);
      const startMonth = await this.getStartMonthForLeaveType(ctx, trx, leaveTypeId, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(new Date()), startMonth);

      // 2. Fetch leave type
      const leaveType = await trx('leave_types')
        .where({ id: leaveTypeId, status: 'active' })
        .whereNull('deleted_at')
        .first();

      if (!leaveType) {
        throw new ValidationError('Leave category not found or inactive.');
      }

      // 3. Resolve active policy assignment
      const assignment = await this.resolveOrCreateAssignment(trx, ctx, employeeId, employee, leaveTypeId);
      if (!assignment) {
        throw new ValidationError('No active policy assignment resolved.');
      }

      // Self-healing: Enable encashment for Privilege Leave for older accounts
      if (leaveType.leave_code === 'PL' || leaveType.leaveCode === 'PL') {
        if (!assignment.encashment_enabled && !assignment.encashmentEnabled) {
          await trx('leave_policy_assignments')
            .where('id', assignment.id)
            .update({ encashment_enabled: 1, encashment_limit: 15 });
          assignment.encashment_enabled = 1;
          assignment.encashmentEnabled = 1;
          assignment.encashment_limit = 15;
          assignment.encashmentLimit = 15;
        }
      }

      if (!assignment.encashment_enabled && !assignment.encashmentEnabled) {
        throw new ValidationError('Leave encashment is not enabled for this leave category.');
      }

      const limit = assignment.encashment_limit || assignment.encashmentLimit || 0;
      if (limit > 0 && encashmentDays > limit) {
        throw new ValidationError(`You cannot encash more than ${limit} days of this leave category.`);
      }

      // 4. Check balance sufficiency
      let balance = await trx('leave_balances')
        .where({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          financial_year_start: fyStart,
        })
        .forUpdate()
        .first();

      const availableBalance = balance ? parseFloat(balance.available_balance || balance.availableBalance || 0) : 0;
      if (availableBalance < encashmentDays) {
        throw new ValidationError(`Insufficient balance. Available balance: ${availableBalance} days.`);
      }

      // 5. Calculate base rate
      const compensation = await trx('employee_compensation')
        .where({ employee_id: employeeId })
        .first();
      const baseSalary = compensation ? parseFloat(compensation.baseSalary || compensation.base_salary || 0) : 0;
      const dailyRate = baseSalary > 0 ? parseFloat((baseSalary / 30).toFixed(2)) : 1000.0;
      const totalAmount = parseFloat((dailyRate * encashmentDays).toFixed(2));

      // 6. Insert encashment request
      const encashmentUuid = uuidv4();
      const ledgerUuid = uuidv4();

      const [encashmentId] = await trx('leave_encashments').insert({
        uuid: encashmentUuid,
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        financial_year_start: fyStart,
        leave_type_id: leaveTypeId,
        encashment_days: encashmentDays,
        daily_rate: dailyRate,
        total_amount: totalAmount,
        encashment_date: new Date(),
        processed: false,
        status: 'pending',
        reason: reason || null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 7. Deduct from available balance (reserve/lock it)
      if (balance) {
        const newAvailable = parseFloat((availableBalance - encashmentDays).toFixed(2));
        const currentPending = parseFloat((balance.pending_approval_balance || balance.pendingApprovalBalance || 0));
        const newPending = parseFloat((currentPending + encashmentDays).toFixed(2));
        
        await trx('leave_balances')
          .where('id', balance.id)
          .update({
            available_balance: newAvailable,
            pending_approval_balance: newPending,
            updated_at: new Date(),
            updated_by: ctx.userId,
          });
      }

      // 8. Log in ledger
      await trx('leave_ledger_entries').insert({
        uuid: ledgerUuid,
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        transaction_type: 'RESERVATION',
        amount: -encashmentDays,
        reference_id: `encashment:${encashmentId}`,
        effective_date: new Date(),
        created_by: ctx.userId,
        remarks: `Leave encashment request reservation for ${encashmentDays} days`,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return { id: encashmentId, totalAmount };
    });

    return result;
  }

  /**
   * Process Leave Encashment Request (Approve/Reject)
   */
  async processLeaveEncashment(
    ctx: TenantContext,
    encashmentId: number,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<void> {
    await withTransaction(async (trx) => {
      const request = await trx('leave_encashments')
        .where({ id: encashmentId, organization_id: ctx.organizationId })
        .forUpdate()
        .first();

      if (!request) {
        throw new ValidationError('Leave encashment request not found.');
      }

      if (request.status !== 'pending') {
        throw new ValidationError(`This request has already been ${request.status}.`);
      }

      const empId = request.employee_id || request.employeeId;
      const leaveTypeId = request.leave_type_id || request.leaveTypeId;
      const fyStart = request.financial_year_start || request.financialYearStart;
      const reqDays = parseFloat(request.encashment_days || request.encashmentDays);

      const balance = await trx('leave_balances')
        .where({
          employee_id: empId,
          leave_type_id: leaveTypeId,
          financial_year_start: fyStart,
        })
        .forUpdate()
        .first();

      if (action === 'approve') {
        // Approve
        await trx('leave_encashments')
          .where('id', encashmentId)
          .update({
            status: 'approved',
            updated_by: ctx.userId,
            updated_at: new Date(),
          });

        if (balance) {
          const currentConsumed = parseFloat((balance.consumed_balance || balance.consumedBalance || 0));
          const currentPending = parseFloat((balance.pending_approval_balance || balance.pendingApprovalBalance || 0));
          const currentEncashed = parseFloat((balance.encashed_balance || balance.encashedBalance || 0));
          
          await trx('leave_balances')
            .where('id', balance.id)
            .update({
              pending_approval_balance: Math.max(0, currentPending - reqDays),
              encashed_balance: parseFloat((currentEncashed + reqDays).toFixed(2)),
              updated_at: new Date(),
              updated_by: ctx.userId,
            });
        }

        // Convert reservation ledger entry to usage/encashment
        await trx('leave_ledger_entries')
          .where({
            employee_id: empId,
            leave_type_id: leaveTypeId,
            reference_id: `encashment:${encashmentId}`,
            transaction_type: 'RESERVATION',
          })
          .update({
            transaction_type: 'ENCASHMENT',
            remarks: `Approved Leave encashment payout: ${reqDays} days. Notes: ${notes || ''}`,
            updated_at: new Date(),
          });

      } else {
        // Reject
        await trx('leave_encashments')
          .where('id', encashmentId)
          .update({
            status: 'rejected',
            reason: notes || null,
            updated_by: ctx.userId,
            updated_at: new Date(),
          });

        // Release locked balance
        if (balance) {
          const currentAvailable = parseFloat((balance.available_balance || balance.availableBalance || 0));
          const currentPending = parseFloat((balance.pending_approval_balance || balance.pendingApprovalBalance || 0));
          
          await trx('leave_balances')
            .where('id', balance.id)
            .update({
              available_balance: parseFloat((currentAvailable + reqDays).toFixed(2)),
              pending_approval_balance: Math.max(0, currentPending - reqDays),
              updated_at: new Date(),
              updated_by: ctx.userId,
            });
        }

        // Delete/Void ledger reservation
        await trx('leave_ledger_entries')
          .where({
            employee_id: empId,
            leave_type_id: leaveTypeId,
            reference_id: `encashment:${encashmentId}`,
          })
          .update({
            deleted_at: new Date(),
            updated_at: new Date(),
          });
      }
    });
  }
}


