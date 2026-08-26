import { v4 as uuidv4 } from 'uuid';
import { LeaveAccrualRepository } from '../repositories/LeaveAccrualRepository';
import { LeaveBalanceService } from './LeaveBalanceService';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext } from '../../../db/types';
import { toLocalYYYYMMDD, calculateFinancialYearEnd, calculateFinancialYearStart } from '../utils/dateUtils';
import { getOrgLeaveSettings } from '../utils/settingsResolver';
import { getKnex } from '../../../db/knex';
import { subscribeEvent, publishEvent } from '../../../realtime/eventBus';
import { evaluateConditionGroup } from '../utils/ruleEngine';

export class LeaveAccrualService {
  private accrualRepo: LeaveAccrualRepository;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private balanceService: LeaveBalanceService;
  private auditService: AuditService;
  private static terminationHookRegistered = false;

  constructor() {
    this.accrualRepo = new LeaveAccrualRepository();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.balanceService = new LeaveBalanceService();
    this.auditService = new AuditService();

    if (!LeaveAccrualService.terminationHookRegistered) {
      subscribeEvent('EmployeeTerminatedEvent', (payload: any) => this.handleEmployeeTerminated(payload));
      subscribeEvent('employee.terminated', (payload: any) => this.handleEmployeeTerminated(payload));
      LeaveAccrualService.terminationHookRegistered = true;
    }
  }

  /**
   * Evaluates Calendar-specific allocation rules before crediting leave
   * Returns { shouldAccrue: boolean, finalAccrual: number }
   */
  private async evaluateCalendarAllocationRules(
    ctx: TenantContext,
    assignment: any,
    baseAccrual: number,
    accrualType: 'monthly' | 'quarterly' | 'yearly',
    todayStr: string
  ): Promise<{ shouldAccrue: boolean, finalAccrual: number }> {
    const db = getKnex();
    
    // Fetch leave_type and employee
    const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
    const employee = await db('employees').where('id', assignment.employee_id).first();
    
    if (!leaveType || !employee) return { shouldAccrue: true, finalAccrual: baseAccrual };

    let allocationSettings: any = {};
    if (leaveType.allocation_settings) {
      try {
        allocationSettings = typeof leaveType.allocation_settings === 'string'
          ? JSON.parse(leaveType.allocation_settings)
          : leaveType.allocation_settings;
      } catch (e) {}
    }

    // Dynamic Rule Engine Evaluation (Only When)
    if (allocationSettings.onlyWhen || allocationSettings.only_when) {
      const isEligible = evaluateConditionGroup(allocationSettings.onlyWhen || allocationSettings.only_when, employee);
      if (!isEligible) {
        return { shouldAccrue: false, finalAccrual: 0 };
      }
    }

    let finalAccrual = baseAccrual;

    // Rule 1: Consider allocation cutoff when employee leaves (Resignation Date vs Last Working Day)
    const exitCutoff = allocationSettings.whenEmployeeLeaves || (allocationSettings.considerAllocationTillResignedDate ? 'resignation_date' : 'none');
    if (exitCutoff === 'resignation_date' || allocationSettings.considerAllocationTillResignedDate) {
      const activeExit = await db('exit_requests')
        .where('employee_id', assignment.employee_id)
        .whereIn('status', ['initiated', 'approved'])
        .whereNull('deleted_at')
        .first();
      
      const resDate = employee.resignation_date || employee.resignationDate;
      if (activeExit || (resDate && new Date(resDate) <= new Date(todayStr))) {
        return { shouldAccrue: false, finalAccrual: 0 };
      }
    } else if (exitCutoff === 'last_working_day') {
      const lwd = employee.last_working_date || employee.lastWorkingDate;
      if (lwd && new Date(lwd) <= new Date(todayStr)) {
        return { shouldAccrue: false, finalAccrual: 0 };
      }
    }

    // Rule 2: Fixed Ratio formula (Earn X leaves for every Y payable days worked)
    const isFixedRatio = allocationSettings.baseEarningOn === 'fixed_ratio' ||
      allocationSettings.baseEarningOn === 'fixed_ratio_days_worked' ||
      (allocationSettings.earnLeaves && allocationSettings.forEveryDaysWorked);

    if (isFixedRatio) {
      const earnLeaves = parseFloat(allocationSettings.earnLeaves || 1);
      const forEveryDays = parseFloat(allocationSettings.forEveryDaysWorked || 20);

      if (!isNaN(earnLeaves) && !isNaN(forEveryDays) && forEveryDays > 0) {
        // Query payable days worked in previous month or quarter
        let startDate = new Date(todayStr);
        let endDate = new Date(todayStr);
        if (accrualType === 'yearly') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (accrualType === 'quarterly') {
          startDate.setMonth(startDate.getMonth() - 3);
        } else {
          startDate.setMonth(startDate.getMonth() - 1);
        }

        const countAsWorkingDays = allocationSettings.countedAs !== 'calendar_days';

        try {
          const hasAtt = await db.schema.hasTable('attendance_records');
          let payableDays = 0;
          if (hasAtt) {
            const attQuery = db('attendance_records')
              .where('employee_id', assignment.employee_id)
              .where('check_in_date', '>=', toLocalYYYYMMDD(startDate))
              .where('check_in_date', '<', toLocalYYYYMMDD(endDate))
              .whereNull('deleted_at');

            if (countAsWorkingDays) {
              attQuery.whereIn('status', ['present', 'half_day', 'work_from_home']);
            }
            const attRecords = await attQuery.select('status');
            for (const att of attRecords) {
              if (att.status === 'half_day') payableDays += 0.5;
              else payableDays += 1;
            }
          } else {
            // Fallback default: approximate full working days (22 days per month)
            payableDays = accrualType === 'yearly' ? 250 : accrualType === 'quarterly' ? 65 : 22;
          }

          finalAccrual = (payableDays / forEveryDays) * earnLeaves;
        } catch (e) {
          finalAccrual = (22 / forEveryDays) * earnLeaves;
        }
      }
    }

    // Rule 3: Initial Allocation Date Range (Prorata cut-off)
    const isProRataEnabled = allocationSettings.initialAllocationDateRange || allocationSettings.disableProRata === false;
    if (isProRataEnabled && accrualType === 'monthly' && !isFixedRatio) {
      const cutOffDayStr = allocationSettings.leaveProrataDays || allocationSettings.considerFullMonthBeforeDay;
      const dateType = allocationSettings.leaveProrataDateType || allocationSettings.considerFullMonthIfDateOf; // 'Joining' or 'Confirmation'
      
      if (cutOffDayStr) {
        const cutOffDay = parseInt(cutOffDayStr, 10);
        let targetDate: Date | null = null;

        if (dateType === 'Confirmation' && employee.confirmation_date) {
          targetDate = new Date(employee.confirmation_date);
        } else if (dateType === 'Joining' && employee.date_of_joining) {
          targetDate = new Date(employee.date_of_joining);
        }

        if (targetDate && !isNaN(cutOffDay)) {
          const todayDate = new Date(todayStr);
          if (targetDate.getMonth() === todayDate.getMonth() && targetDate.getFullYear() === todayDate.getFullYear()) {
            if (targetDate.getDate() > cutOffDay) {
              return { shouldAccrue: false, finalAccrual: 0 };
            }
          }
        }
      }
    }

    // Rule 4: Minimum Working Days
    if (allocationSettings.minWorkingDays) {
      const minDays = parseInt(allocationSettings.minWorkingDays, 10);
      if (!isNaN(minDays) && minDays > 0) {
        try {
          const hasAttendance = await db.schema.hasTable('attendance_logs');
          if (hasAttendance) {
            let startDate = new Date(todayStr);
            let endDate = new Date(todayStr);
            if (accrualType === 'yearly') {
              startDate.setFullYear(startDate.getFullYear() - 1);
            } else if (accrualType === 'monthly') {
              startDate.setMonth(startDate.getMonth() - 1);
            }
            
            const presentCount = await db('attendance_logs')
              .where('employee_id', assignment.employee_id)
              .where('status', 'Present')
              .where('log_date', '>=', toLocalYYYYMMDD(startDate))
              .where('log_date', '<', toLocalYYYYMMDD(endDate))
              .count('id as count')
              .first();
              
            const count = presentCount ? parseInt(String((presentCount as any).count || 0), 10) : 0;
            if (count < minDays) {
              return { shouldAccrue: false, finalAccrual: 0 };
            }
          }
        } catch(e) {}
      }
    }

    // Rule 5: Round Off Math (Round Up / Round Down / Nearest)
    const isRoundOff = allocationSettings.leaveRoundOff || allocationSettings.roundOff;
    if (isRoundOff) {
      const roundRule = (allocationSettings.roundOffType || allocationSettings.roundOffOption || 'nearest').toLowerCase();
      if (roundRule.includes('up') || roundRule === 'round_up' || roundRule === 'ceil') {
        finalAccrual = Math.ceil(finalAccrual);
      } else if (roundRule.includes('down') || roundRule === 'round_down' || roundRule === 'floor') {
        finalAccrual = Math.floor(finalAccrual);
      } else {
        // Nearest: round to nearest 0.5 or integer
        finalAccrual = Math.round(finalAccrual * 2) / 2;
      }
    }

    return { shouldAccrue: true, finalAccrual };
  }

  /**
   * Evaluates Payroll Conditions before crediting leave
   * Returns true if accrual should proceed, false if it should be blocked.
   */
  private async evaluatePayrollConditions(
    ctx: TenantContext,
    assignment: any,
    todayStr: string
  ): Promise<boolean> {
    const db = getKnex();
    
    // Fetch leave_type to get payroll_settings
    const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
    if (!leaveType) return true;

    let payrollSettings: any = {};
    const rawPayroll = leaveType.payrollSettings || leaveType.payroll_settings;
    if (rawPayroll) {
      try {
        let parsed = rawPayroll;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        payrollSettings = parsed;
      } catch (e) {}
    }

    if (!payrollSettings.conditionOn || payrollSettings.conditionOn === 'Choose') {
      return true; // No payroll condition configured
    }

    const { conditionOn, operator, value1, considerMonths, reverseCondition } = payrollSettings;
    if (!operator || operator === 'Choose' || value1 === undefined || value1 === null || value1 === '') {
      return true;
    }

    const val1 = parseFloat(value1);
    if (isNaN(val1)) return true;

    const months = parseInt(considerMonths || '0', 10);
    const endDate = new Date(todayStr);
    const startDate = new Date(todayStr);
    if (!isNaN(months) && months > 0) {
      startDate.setMonth(startDate.getMonth() - months);
    } else {
      // Default to 1 month if not specified but condition exists
      startDate.setMonth(startDate.getMonth() - 1);
    }

    let actualValue = 0;

    if (conditionOn === 'attendance_days') {
      try {
        const hasAttendance = await db.schema.hasTable('attendance_logs');
        if (hasAttendance) {
          const presentCount = await db('attendance_logs')
            .where('employee_id', assignment.employee_id)
            .where('status', 'Present')
            .where('log_date', '>=', toLocalYYYYMMDD(startDate))
            .where('log_date', '<', toLocalYYYYMMDD(endDate))
            .count('id as count')
            .first();
          actualValue = presentCount ? parseFloat(String((presentCount as any).count || 0)) : 0;
        }
      } catch (e) {}
    } else if (conditionOn === 'total_lop_days') {
      const lopCount = await db('leave_applications')
        .where('employee_id', assignment.employee_id)
        .whereIn('status', ['approved', 'submitted'])
        .where('paid_type', 'unpaid')
        .whereNull('deleted_at')
        .where('application_start_date', '>=', toLocalYYYYMMDD(startDate))
        .where('application_start_date', '<', toLocalYYYYMMDD(endDate))
        .sum('total_days as sum')
        .first();
      actualValue = lopCount ? parseFloat(String((lopCount as any).sum || 0)) : 0;
    } else if (conditionOn === 'leave_balance') {
      const balance = await this.balanceService.getBalance(ctx, assignment.employee_id, assignment.leave_type_id);
      actualValue = balance ? parseFloat(String(balance.current_balance || 0)) : 0;
    }

    let conditionMet = false;
    switch (operator) {
      case 'greater_than': conditionMet = actualValue > val1; break;
      case 'less_than': conditionMet = actualValue < val1; break;
      case 'equal_to': conditionMet = actualValue === val1; break;
      case 'not_equal_to': conditionMet = actualValue !== val1; break;
    }

    // If reverseCondition is true, we flip the result
    const isRuleTriggered = !!reverseCondition ? !conditionMet : conditionMet;

    // If the rule is triggered, we BLOCK accrual
    if (isRuleTriggered) {
      return false;
    }

    return true;
  }

  /**
   * Evaluates if the employee meets the Employment Allocation Settings (Eligibility Engine)
   */
  private async evaluateEmploymentEligibility(
    employee: any,
    leaveType: any
  ): Promise<boolean> {
    if (!leaveType || !employee) return true;

    let settings: any = {};
    const rawAlloc = leaveType.employmentAllocationSettings || leaveType.employment_allocation_settings;
    if (rawAlloc) {
      try {
        let parsed = rawAlloc;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        settings = parsed;
      } catch (e) {}
    }

    if (!settings || Object.keys(settings).length === 0) return true; // No rules set

    // Helper to check array overlap
    const hasOverlap = (employeeVal: any, ruleArray: any[]) => {
      if (!ruleArray || !Array.isArray(ruleArray) || ruleArray.length === 0) return true; // If array is empty, it means no restriction for this field
      if (!employeeVal) return false; // Employee has no value but rule expects one
      
      // employeeVal might be an array or string/number. Handle both.
      const eArray = Array.isArray(employeeVal) ? employeeVal : [employeeVal];
      return eArray.some(e => ruleArray.includes(e) || ruleArray.includes(String(e)) || ruleArray.includes(Number(e)));
    };

    const deptMatch = hasOverlap(employee.current_department_id || employee.currentDepartmentId, settings.departments);
    if (!deptMatch) return false;

    const locMatch = hasOverlap(employee.current_location_id || employee.currentLocationId, settings.locations);
    if (!locMatch) return false;

    const typeMatch = hasOverlap(employee.employment_type || employee.employmentType || (employee as any).employee_type, settings.employeeTypes);
    if (!typeMatch) return false;

    const statusMatch = hasOverlap(employee.status, settings.employeeStatuses);
    if (!statusMatch) return false;

    const gradeMatch = hasOverlap(employee.current_grade_id || employee.currentGradeId, settings.grades);
    if (!gradeMatch) return false;

    return true;
  }

  /**
   * Process monthly leave accruals
   */
  async accrueMonthlyLeaves(ctx: TenantContext, organizationId: number): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());
    const db = getKnex();

    // Get all active assignments
    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true);

    for (const assignment of assignments) {
      const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
      if (!leaveType || leaveType.status === 'inactive') continue;

      let allocSettings: any = {};
      if (leaveType.allocation_settings) {
        try {
          allocSettings = typeof leaveType.allocation_settings === 'string'
            ? JSON.parse(leaveType.allocation_settings)
            : leaveType.allocation_settings;
        } catch (e) {}
      }

      // If explicitly quarterly or yearly, skip monthly loop
      const periodicity = allocSettings.entitlementPeriodicity || 'Monthly';
      if (periodicity === 'Quarterly' || periodicity === 'Yearly') continue;

      const baseMonthly = assignment.monthly_accrual !== null && assignment.monthly_accrual !== undefined && parseFloat(String(assignment.monthly_accrual)) > 0
        ? parseFloat(String(assignment.monthly_accrual))
        : (allocSettings.entitlementDays ? parseFloat(allocSettings.entitlementDays) / 12 : (assignment.annual_quota || 12) / 12);

      // Evaluate Calendar Allocation Rules (Ratio formula, Only When, Resignation cutoff, Rounding)
      const { shouldAccrue, finalAccrual } = await this.evaluateCalendarAllocationRules(ctx, assignment, baseMonthly, 'monthly', today);
      
      if (!shouldAccrue || finalAccrual <= 0) continue;

      // Check Employment Eligibility
      const employeeData = await db('employees').where('id', assignment.employee_id).first();
      if (!employeeData) continue;
      const isEligible = await this.evaluateEmploymentEligibility(employeeData, leaveType);
      if (!isEligible) continue;

      // Evaluate Payroll Conditions
      const payrollOk = await this.evaluatePayrollConditions(ctx, assignment, today);
      if (!payrollOk) continue;

      const settings = await getOrgLeaveSettings(ctx.organizationId, employeeData.current_location_id || employeeData.currentLocationId);
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(today, startMonth);
      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota || 12
        );
      }

      // Create accrual record
      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'monthly',
        accrued_days: finalAccrual,
        policy_id: assignment.leave_policy_id,
        processed: true,
        notes: `Monthly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
      } as any);

      // Credit accrual
      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        finalAccrual
      );

      // Audit log
      await this.auditService.log(ctx, {
        action: 'applied',
        entityType: 'application',
        entityId: accrual.id,
        afterState: { days: finalAccrual, type: 'monthly' },
      });
    }
  }

  /**
   * Process quarterly leave accruals
   */
  async accrueQuarterlyLeaves(ctx: TenantContext): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());
    const db = getKnex();

    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true);

    for (const assignment of assignments) {
      const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
      if (!leaveType || leaveType.status === 'inactive') continue;

      let allocSettings: any = {};
      if (leaveType.allocation_settings) {
        try {
          allocSettings = typeof leaveType.allocation_settings === 'string'
            ? JSON.parse(leaveType.allocation_settings)
            : leaveType.allocation_settings;
        } catch (e) {}
      }

      const periodicity = allocSettings.entitlementPeriodicity;
      if (periodicity !== 'Quarterly') continue;

      const baseQuarterly = assignment.quarterly_accrual !== null && assignment.quarterly_accrual !== undefined && parseFloat(String(assignment.quarterly_accrual)) > 0
        ? parseFloat(String(assignment.quarterly_accrual))
        : (allocSettings.entitlementDays ? parseFloat(allocSettings.entitlementDays) / 4 : (assignment.annual_quota || 12) / 4);

      // Evaluate Calendar Allocation Rules
      const { shouldAccrue, finalAccrual } = await this.evaluateCalendarAllocationRules(ctx, assignment, baseQuarterly, 'quarterly', today);
      
      if (!shouldAccrue || finalAccrual <= 0) continue;

      // Check Employment Eligibility
      const employeeData = await db('employees').where('id', assignment.employee_id).first();
      if (!employeeData) continue;
      const isEligible = await this.evaluateEmploymentEligibility(employeeData, leaveType);
      if (!isEligible) continue;

      // Evaluate Payroll Conditions
      const payrollOk = await this.evaluatePayrollConditions(ctx, assignment, today);
      if (!payrollOk) continue;

      const settings = await getOrgLeaveSettings(ctx.organizationId, employeeData.current_location_id || employeeData.currentLocationId);
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(today, startMonth);
      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota || 12
        );
      }

      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'quarterly',
        accrued_days: finalAccrual,
        policy_id: assignment.leave_policy_id,
        processed: true,
        notes: `Quarterly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
      } as any);

      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        finalAccrual
      );
    }
  }

  /**
   * Process yearly leave accruals
   */
  async accrueYearlyLeaves(ctx: TenantContext): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());
    const db = getKnex();

    const assignments = await this.assignmentRepo
      .query(ctx)
      .where('is_active', true);

    for (const assignment of assignments) {
      const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
      if (!leaveType || leaveType.status === 'inactive') continue;

      let allocSettings: any = {};
      if (leaveType.allocation_settings) {
        try {
          allocSettings = typeof leaveType.allocation_settings === 'string'
            ? JSON.parse(leaveType.allocation_settings)
            : leaveType.allocation_settings;
        } catch (e) {}
      }

      const periodicity = allocSettings.entitlementPeriodicity;
      if (periodicity !== 'Yearly') continue;

      const employee = await db('employees').where('id', assignment.employee_id).first();
      if (!employee) continue;

      const baseYearly = assignment.yearly_accrual !== null && assignment.yearly_accrual !== undefined && parseFloat(String(assignment.yearly_accrual)) > 0
        ? parseFloat(String(assignment.yearly_accrual))
        : (allocSettings.entitlementDays ? parseFloat(allocSettings.entitlementDays) : (assignment.annual_quota || 12));

      // Evaluate Calendar Allocation Rules
      const { shouldAccrue, finalAccrual } = await this.evaluateCalendarAllocationRules(ctx, assignment, baseYearly, 'yearly', today);
      
      if (!shouldAccrue || finalAccrual <= 0) continue;

      const settings = await getOrgLeaveSettings(ctx.organizationId, employee.current_location_id || employee.currentLocationId);
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(today, startMonth);

      let balance = await this.balanceService.getBalance(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id
      );

      if (!balance) {
        balance = await this.balanceService.initializeBalance(
          ctx,
          assignment.employee_id,
          assignment.leave_type_id,
          fyStart,
          assignment.annual_quota || 12
        );
      }

      const accrual = await this.accrualRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: assignment.employee_id,
        leave_type_id: assignment.leave_type_id,
        accrual_date: today,
        accrual_type: 'yearly',
        accrued_days: finalAccrual,
        policy_id: assignment.leave_policy_id,
        processed: true,
        notes: `Yearly accrual for ${new Date().toLocaleDateString()}`,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
      } as any);

      await this.balanceService.creditAccrual(
        ctx,
        assignment.employee_id,
        assignment.leave_type_id,
        finalAccrual
      );
    }
  }



  /**
   * Process anniversary-based leave accruals
   */
  async accrueAnniversaryLeaves(ctx: TenantContext): Promise<void> {
    const db = getKnex();
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    const todayStr = toLocalYYYYMMDD(today);

    // Fetch active employees who started on this month and day
    const employees = await db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .whereRaw(`DATE_FORMAT(date_of_joining, '%m-%d') = ?`, [`${todayMonth}-${todayDay}`]);

    for (const emp of employees) {
      // Find active policy assignments that use anniversary-based accrual
      const assignments = await db('leave_policy_assignments')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', emp.id)
        .where('is_active', true)
        .where('accrual_method', 'anniversary_based')
        .whereNull('deleted_at');

      for (const assignment of assignments) {
        const policy = await db('leave_policies').where('id', assignment.leave_policy_id).first();
        let scalePercent = null;
        if (policy && policy.earned_leave_entitlement_percent !== null) {
          scalePercent = parseFloat(policy.earned_leave_entitlement_percent);
        }

        const baseAccrualDays = assignment.accrual_rate !== null && assignment.accrual_rate !== undefined 
          ? parseFloat(String(assignment.accrual_rate)) 
          : (assignment.annual_quota || 0);

        let accrualDays = baseAccrualDays;
        if (scalePercent !== null) {
          accrualDays = (assignment.annual_quota || baseAccrualDays) * (scalePercent / 100);
        }
          
        if (accrualDays <= 0) continue;

        const idempotencyKey = `ANNIV-${emp.id}-${assignment.leave_type_id}-${year}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (existing) continue;

        await db.transaction(async (trx) => {
          // 1. Create leave accrual record
          const [accrualId] = await trx('leave_accruals').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: emp.id,
            leave_type_id: assignment.leave_type_id,
            accrual_date: todayStr,
            accrual_type: 'anniversary',
            accrued_days: accrualDays,
            policy_id: assignment.leave_policy_id,
            processed: true,
            notes: `Anniversary accrual for joining date ${emp.date_of_joining}`,
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // 2. Create ledger entry
          await trx('leave_ledger_entries').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: emp.id,
            leave_type_id: assignment.leave_type_id,
            transaction_type: 'ACCRUAL',
            amount: accrualDays,
            effective_date: todayStr,
            reference_id: idempotencyKey,
            remarks: `Anniversary accrual for joining date ${emp.date_of_joining}`,
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // 3. Update Leave Balance
          const employee = await trx('employees').where('id', emp.id).first();
          const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
          const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
          const fyStart = calculateFinancialYearStart(todayStr, startMonth);
          let balance = await trx('leave_balances')
            .where('employee_id', emp.id)
            .where('leave_type_id', assignment.leave_type_id)
            .where('financial_year_start', fyStart)
            .first();

          if (!balance) {
            // Initialize balance
            const fyEnd = calculateFinancialYearEnd(fyStart);
            await trx('leave_balances').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: emp.id,
              leave_type_id: assignment.leave_type_id,
              financial_year_start: fyStart,
              financial_year_end: fyEnd,
              opening_balance: assignment.annual_quota || 0,
              credited_balance: accrualDays,
              consumed_balance: 0,
              available_balance: (assignment.annual_quota || 0) + accrualDays,
              carry_forward_balance: 0,
              encashed_balance: 0,
              expired_balance: 0,
              pending_approval_balance: 0,
              hours_worked_accumulator: 0,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });
          } else {
            const newCredited = parseFloat(String(balance.credited_balance || 0)) + accrualDays;
            const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));
            await trx('leave_balances')
              .where('id', balance.id)
              .update({
                credited_balance: newCredited,
                available_balance: newAvailable,
                last_updated_at: new Date().toISOString(),
                updated_at: new Date(),
              });
          }

          // Audit log
          await this.auditService.log(ctx, {
            action: 'applied',
            entityType: 'application',
            entityId: accrualId,
            afterState: { days: accrualDays, type: 'anniversary' },
          });
        });
      }
    }
  }

  /**
   * Nightly reconciliation worker for hours-worked accrual
   */
  async reconcileHoursWorkedAccruals(ctx: TenantContext): Promise<void> {
    const db = getKnex();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toLocalYYYYMMDD(yesterday);

    const assignments = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .where('accrual_method', 'accrued_per_hours_worked')
      .whereNull('deleted_at');

    for (const assignment of assignments) {
      const employee = await db('employees').where('id', assignment.employee_id).first();
      const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
      
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(yesterdayStr, startMonth);
      
      let balance = await db('leave_balances')
        .where('employee_id', assignment.employee_id)
        .where('leave_type_id', assignment.leave_type_id)
        .where('financial_year_start', fyStart)
        .first();

      if (!balance) {
        // Initialize balance if missing
        const fyEnd = calculateFinancialYearEnd(fyStart);
        const [insertedId] = await db('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: assignment.employee_id,
          leave_type_id: assignment.leave_type_id,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: assignment.annual_quota || 0,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: assignment.annual_quota || 0,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          hours_worked_accumulator: 0,
          last_reconciled_attendance_date: null,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
        
        balance = await db('leave_balances').where('id', insertedId).first();
      }

      // Determine reconciliation startDate
      let startDateStr = '';
      if (balance.last_reconciled_attendance_date) {
        const nextDay = new Date(balance.last_reconciled_attendance_date);
        nextDay.setDate(nextDay.getDate() + 1);
        startDateStr = toLocalYYYYMMDD(nextDay);
      } else {
        startDateStr = toLocalYYYYMMDD(new Date(assignment.assignment_start_date));
      }

      if (startDateStr > yesterdayStr) continue;

      // Query approved attendance records duration
      const attendanceSummary = await db('attendance_records')
        .where('employee_id', assignment.employee_id)
        .where('check_in_date', '>=', startDateStr)
        .where('check_in_date', '<=', yesterdayStr)
        .whereIn('status', ['present', 'half_day', 'work_from_home'])
        .whereNull('deleted_at')
        .select('work_duration_minutes');

      const totalMinutes = attendanceSummary.reduce((acc: number, cur: any) => acc + (cur.work_duration_minutes || 0), 0);
      const newHoursWorked = totalMinutes / 60;

      const currentAccumulator = parseFloat(String(balance.hours_worked_accumulator || 0));
      const totalAccumulatedHours = currentAccumulator + newHoursWorked;

      const threshold = assignment.accrual_rate !== null && parseFloat(String(assignment.accrual_rate)) > 0 
        ? parseFloat(String(assignment.accrual_rate)) 
        : 30.0; // 30 hours threshold default
        
      const crossings = Math.floor(totalAccumulatedHours / threshold);
      const remainder = totalAccumulatedHours % threshold;

      if (crossings > 0) {
        // Compute dynamically: 1 hour leave = 1 / fullTimeHours days leave
        const creditPerCrossing = 1 / settings.fullTimeHours;
        const totalCredit = crossings * creditPerCrossing;

        const idempotencyKey = `HOURS-${assignment.employee_id}-${assignment.leave_type_id}-${yesterdayStr}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (!existing) {
          await db.transaction(async (trx) => {
            // 1. Create accrual record
            const [accrualId] = await trx('leave_accruals').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: assignment.employee_id,
              leave_type_id: assignment.leave_type_id,
              accrual_date: yesterdayStr,
              accrual_type: 'monthly', // map to standard accrual type
              accrued_days: totalCredit,
              policy_id: assignment.leave_policy_id,
              processed: true,
              notes: `Accrual of ${totalCredit} days based on hours worked threshold crossings (${crossings} times).`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 2. Create ledger entry
            await trx('leave_ledger_entries').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: assignment.employee_id,
              leave_type_id: assignment.leave_type_id,
              transaction_type: 'ACCRUAL',
              amount: totalCredit,
              effective_date: yesterdayStr,
              reference_id: idempotencyKey,
              remarks: `Accrued from ${totalAccumulatedHours.toFixed(2)} hours worked. Accumulator remainder: ${remainder.toFixed(2)}`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 3. Update Balance
            const newCredited = parseFloat(String(balance.credited_balance || 0)) + totalCredit;
            const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));

            await trx('leave_balances')
              .where('id', balance.id)
              .update({
                credited_balance: newCredited,
                available_balance: newAvailable,
                hours_worked_accumulator: remainder,
                last_reconciled_attendance_date: yesterdayStr,
                last_updated_at: new Date().toISOString(),
                updated_at: new Date(),
              });

            // Audit log
            await this.auditService.log(ctx, {
              action: 'applied',
              entityType: 'application',
              entityId: accrualId,
              afterState: { days: totalCredit, type: 'hours_worked' },
            });
          });
        }
      } else {
        // Just update accumulator & last reconciled date
        await db('leave_balances')
          .where('id', balance.id)
          .update({
            hours_worked_accumulator: remainder,
            last_reconciled_attendance_date: yesterdayStr,
            last_updated_at: new Date().toISOString(),
            updated_at: new Date(),
          });
      }
    }
  }

  /**
   * Handle Employee Termination Event (Full & Final proration)
   */
  async handleEmployeeTerminated(payload: { ctx: TenantContext; employeeId: number; exitDate: string }): Promise<void> {
    const { ctx, employeeId, exitDate } = payload;
    const db = getKnex();

    const emp = await db('employees').where('id', employeeId).whereNull('deleted_at').first();
    if (!emp) return;

    // Base logic for exit date
    const exit = new Date(exitDate);
    const joindDate = emp.date_of_joining ? new Date(emp.date_of_joining) : new Date();

    // Fetch active assignments
    const assignments = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('is_active', true)
      .whereNull('deleted_at');

    for (const assignment of assignments) {
      // Determine current financial year cycle start & end
      const settings = await getOrgLeaveSettings(ctx.organizationId, emp.current_location_id || emp.currentLocationId);
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      
      const cycleStartStr = calculateFinancialYearStart(exitDate, startMonth);
      const cycleEndStr = calculateFinancialYearEnd(cycleStartStr);

      const cycleStart = new Date(cycleStartStr);
      const cycleEnd = new Date(cycleEndStr);

      // Total days in current cycle
      const totalDaysInCycle = Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Days worked in cycle (from start of cycle or joining date, whichever is later, to exit date)
      const actualStart = joindDate > cycleStart ? joindDate : cycleStart;
      const daysWorkedInCycle = Math.ceil((exit.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const prorationRatio = Math.min(1.0, Math.max(0.0, daysWorkedInCycle / totalDaysInCycle));

      const annualEntitlement = assignment.annual_quota || 0;
      const earnedEntitlement = annualEntitlement * prorationRatio;

      const balance = await this.balanceService.getBalance(ctx, employeeId, assignment.leave_type_id);
      const usedDays = balance ? parseFloat(String(balance.consumed_balance || 0)) : 0;

      if (usedDays > earnedEntitlement) {
        const deficit = usedDays - earnedEntitlement;
        const idempotencyKey = `FF-${employeeId}-${assignment.leave_type_id}`;

        // Check if already processed
        const existing = await db('leave_ledger_entries')
          .where('organization_id', ctx.organizationId)
          .where('reference_id', idempotencyKey)
          .first();

        if (!existing) {
          await db.transaction(async (trx) => {
            // 1. Write negative MANUAL_ADJUSTMENT ledger entry
            await trx('leave_ledger_entries').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: employeeId,
              leave_type_id: assignment.leave_type_id,
              transaction_type: 'MANUAL_ADJUSTMENT',
              amount: -deficit,
              effective_date: exitDate,
              reference_id: idempotencyKey,
              remarks: `Deficit deduction on termination (proration: earned ${earnedEntitlement.toFixed(2)}, used ${usedDays}).`,
              created_by: ctx.userId || 1,
              updated_by: ctx.userId || 1,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // 2. Deduct from balance
            if (balance) {
              const newCredited = parseFloat(String(balance.credited_balance || 0)) - deficit;
              const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));

              await trx('leave_balances')
                .where('id', balance.id)
                .update({
                  credited_balance: newCredited,
                  available_balance: newAvailable,
                  last_updated_at: new Date().toISOString(),
                  updated_at: new Date(),
                });
            }

            // 3. Expose/publish the deficit payload for Full & Final Payroll deduction
            publishEvent('payroll.ff_deficit_detected', {
              employeeId,
              leaveTypeId: assignment.leave_type_id,
              deficitDays: deficit,
              earnedEntitlement,
              usedDays,
              exitDate,
            });
          });
        }
      }
    }
  }

  /**
   * Helper: Get start month of financial year for a leave type
   */
  private async getStartMonthForLeaveType(ctx: TenantContext, leaveTypeId: number, defaultMonth: number): Promise<number> {
    const db = this.assignmentRepo.db;
    const leaveType = await db('leave_types').where('id', leaveTypeId).first();
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
   * Reconcile auto non-calendar rules based on daily hours worked on Week Off / Holiday / Working Day
   */
  async reconcileNonCalendarRulesAccruals(ctx: TenantContext): Promise<void> {
    const db = this.assignmentRepo.db;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toLocalYYYYMMDD(yesterday);

    // Fetch all active assignments
    const assignments = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('is_active', true)
      .whereNull('deleted_at');

    for (const assignment of assignments) {
      const leaveType = await db('leave_types').where('id', assignment.leave_type_id).first();
      if (!leaveType || leaveType.leave_classification !== 'non-calendar') continue;

      let allocSettings: any = {};
      try {
        allocSettings = typeof leaveType.allocation_settings === 'string'
          ? JSON.parse(leaveType.allocation_settings)
          : leaveType.allocation_settings;
      } catch (e) {
        continue;
      }

      // Check if rules are present and credit type is auto
      const rules = allocSettings?.nonCalendarRules;
      if (!rules || !Array.isArray(rules) || rules.length === 0 || allocSettings.creditType !== 'auto') {
        continue;
      }

      const employee = await db('employees').where('id', assignment.employee_id).first();
      if (!employee) continue;

      const settings = await getOrgLeaveSettings(ctx.organizationId, employee.current_location_id || employee.currentLocationId);
      const startMonth = await this.getStartMonthForLeaveType(ctx, assignment.leave_type_id, settings.holidayYearStartMonth);
      const fyStart = calculateFinancialYearStart(yesterdayStr, startMonth);

      let balance = await db('leave_balances')
        .where('employee_id', assignment.employee_id)
        .where('leave_type_id', assignment.leave_type_id)
        .where('financial_year_start', fyStart)
        .first();

      if (!balance) {
        // Initialize balance if missing
        const fyEnd = calculateFinancialYearEnd(fyStart);
        const [insertedId] = await db('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: assignment.employee_id,
          leave_type_id: assignment.leave_type_id,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: assignment.annual_quota || 0,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: assignment.annual_quota || 0,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          last_reconciled_attendance_date: null,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
        
        balance = await db('leave_balances').where('id', insertedId).first();
      }

      let startDateStr = '';
      if (balance.last_reconciled_attendance_date) {
        const nextDay = new Date(balance.last_reconciled_attendance_date);
        nextDay.setDate(nextDay.getDate() + 1);
        startDateStr = toLocalYYYYMMDD(nextDay);
      } else {
        startDateStr = toLocalYYYYMMDD(new Date(assignment.assignment_start_date));
      }

      if (startDateStr > yesterdayStr) continue;

      // Query attendance records in the reconciliation range
      const attendances = await db('attendance_records')
        .where('employee_id', assignment.employee_id)
        .where('check_in_date', '>=', startDateStr)
        .where('check_in_date', '<=', yesterdayStr)
        .whereNull('deleted_at')
        .orderBy('check_in_date', 'asc');

      let totalCredit = 0;

      for (const att of attendances) {
        const workDurationHours = (att.work_duration_minutes || 0) / 60;
        const attStatus = att.status; // 'present', 'absent', 'week_off', 'holiday', etc.

        // Resolve if it matches any configured rule
        for (const rule of rules) {
          let matchesDayType = false;
          if (rule.dayType === 'Working Day' && ['present', 'half_day', 'work_from_home'].includes(attStatus)) {
            matchesDayType = true;
          } else if (rule.dayType === 'Week Off' && attStatus === 'week_off') {
            matchesDayType = true;
          } else if (rule.dayType === 'Holiday' && attStatus === 'holiday') {
            matchesDayType = true;
          }

          if (matchesDayType && workDurationHours >= rule.hourStart && workDurationHours <= rule.hourEnd) {
            totalCredit += parseFloat(rule.allocateLeaves || 0);
            break; // Stop evaluating rules for this attendance date
          }
        }
      }

      if (totalCredit > 0) {
        await db.transaction(async (trx) => {
          // 1. Create ledger entry
          const ledgerUuid = uuidv4();
          await trx('leave_ledger_entries').insert({
            uuid: ledgerUuid,
            organization_id: ctx.organizationId,
            employee_id: assignment.employee_id,
            leave_type_id: assignment.leave_type_id,
            transaction_type: 'ACCRUAL',
            amount: totalCredit,
            effective_date: yesterdayStr,
            remarks: `Auto non-calendar rule credit up to ${yesterdayStr}`,
            reference_id: `NONCAL-${assignment.employee_id}-${assignment.leave_type_id}-${yesterdayStr}`,
            created_by: ctx.userId || 1,
            created_at: new Date(),
            updated_at: new Date(),
          });

          // 2. Update balance
          const newCredited = parseFloat(String(balance.credited_balance || 0)) + totalCredit;
          const newAvailable = parseFloat(String(balance.opening_balance || 0)) + newCredited + parseFloat(String(balance.carry_forward_balance || 0)) - parseFloat(String(balance.encashed_balance || 0)) - parseFloat(String(balance.consumed_balance || 0));

          await trx('leave_balances')
            .where('id', balance.id)
            .update({
              credited_balance: newCredited,
              available_balance: newAvailable,
              last_reconciled_attendance_date: yesterdayStr,
              last_updated_at: new Date().toISOString(),
              updated_at: new Date(),
            });
        });
      } else {
        // Just advance the reconciliation pointer
        await db('leave_balances')
          .where('id', balance.id)
          .update({
            last_reconciled_attendance_date: yesterdayStr,
            updated_at: new Date(),
          });
      }
    }
  }
}
