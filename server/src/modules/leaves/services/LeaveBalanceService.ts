import { v4 as uuidv4 } from 'uuid';
import { LeaveBalanceRepository } from '../repositories/LeaveBalanceRepository';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import type { LeaveBalance } from '../repositories/LeaveBalanceRepository';
import { calculateFinancialYearStart, calculateFinancialYearEnd, toLocalYYYYMMDD } from '../utils/dateUtils';
import { getOrgLeaveSettings } from '../utils/settingsResolver';
import { evaluateConditionGroup } from '../utils/ruleEngine';

export class LeaveBalanceService {
  private balanceRepo: LeaveBalanceRepository;
  private assignmentRepo: LeavePolicyAssignmentRepository;
  private applicationRepo: LeaveApplicationRepository;

  constructor() {
    this.balanceRepo = new LeaveBalanceRepository();
    this.assignmentRepo = new LeavePolicyAssignmentRepository();
    this.applicationRepo = new LeaveApplicationRepository();
  }

  /**
   * Get current balance for employee and leave type
   */
  async getBalance(ctx: TenantContext, employeeId: number, leaveTypeId: number): Promise<LeaveBalance | null> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, toLocalYYYYMMDD(new Date()), leaveTypeId);
    return this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);
  }

  /**
   * Get all balances for employee
   */
  async getBalancesForEmployee(ctx: TenantContext, employeeId: number) {
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    
    // Fetch all leave balances for the employee
    const allBalances = await this.balanceRepo.db('leave_balances')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .whereNull('deleted_at');

    const activeBalances: LeaveBalance[] = [];
    
    // Fetch all active leave types
    const leaveTypes = await this.balanceRepo.db('leave_types')
      .where('organization_id', ctx.organizationId)
      .orWhereNull('organization_id')
      .where('status', 'active')
      .whereNull('deleted_at');

    for (const lt of leaveTypes) {
      if (employee) {
        // Parse allocation_settings for rules & gender
        let allocSettings: any = {};
        if (lt.allocation_settings) {
          try {
            allocSettings = typeof lt.allocation_settings === 'string'
              ? JSON.parse(lt.allocation_settings)
              : lt.allocation_settings;
          } catch (e) {}
        }

        // 1. Gender applicability check
        const genderApplicable = (lt.gender_applicable || lt.genderApplicable || allocSettings.gender || 'all').toString().toLowerCase();
        if (genderApplicable !== 'all' && genderApplicable !== 'both' && employee.gender) {
          if (employee.gender.toLowerCase() !== genderApplicable) {
            continue;
          }
        }

        // 2. Advanced Allocation Conditions (onlyWhen rule tree)
        if (allocSettings.onlyWhen || allocSettings.only_when) {
          const isEligible = evaluateConditionGroup(allocSettings.onlyWhen || allocSettings.only_when, employee);
          if (!isEligible) {
            continue;
          }
        }

        // 3. Employment Allocation Settings (Scope filter: Companies, Departments, Locations, Grades, EmployeeTypes)
        let empSettings: any = {};
        const rawEmpSettings = lt.employment_allocation_settings || lt.employmentAllocationSettings;
        if (rawEmpSettings) {
          try {
            empSettings = typeof rawEmpSettings === 'string' ? JSON.parse(rawEmpSettings) : rawEmpSettings;
          } catch (e) {}
        }
        if (empSettings && Object.keys(empSettings).length > 0) {
          const hasOverlap = (employeeVal: any, ruleArray: any[]) => {
            if (!ruleArray || !Array.isArray(ruleArray) || ruleArray.length === 0) return true;
            if (!employeeVal) return false;
            const eArray = Array.isArray(employeeVal) ? employeeVal : [employeeVal];
            return eArray.some(e => ruleArray.includes(e) || ruleArray.includes(String(e)) || ruleArray.includes(Number(e)));
          };

          if (!hasOverlap(employee.organization_id || employee.organizationId, empSettings.companies || empSettings.organizations)) continue;
          if (!hasOverlap(employee.current_department_id || employee.currentDepartmentId, empSettings.departments)) continue;
          if (!hasOverlap(employee.current_location_id || employee.currentLocationId, empSettings.locations)) continue;
          if (!hasOverlap(employee.employment_type || employee.employmentType, empSettings.employeeTypes)) continue;
          if (!hasOverlap(employee.current_grade_id || employee.currentGradeId, empSettings.grades)) continue;
        }
      }

      const startMonth = await this.getStartMonthForLeaveType(ctx, lt.id, settings.holidayYearStartMonth);
      const expectedFyStart = calculateFinancialYearStart(toLocalYYYYMMDD(new Date()), startMonth);
      
      let balance = allBalances.find(b => b.leave_type_id === lt.id && b.financial_year_start === expectedFyStart);
      
      if (!balance) {
        // Initialize balance if not found
        try {
          const quota = lt.annual_quota || 12;
          balance = await this.initializeBalance(ctx, employeeId, lt.id, expectedFyStart, quota);
        } catch (e) {
          console.warn('[LeaveBalanceService] init balance warning:', e);
        }
      }
      
      if (balance) {
        activeBalances.push(balance);
      }
    }

    return {
      items: activeBalances,
      meta: {
        page: 1,
        pageSize: activeBalances.length,
        total: activeBalances.length,
        hasMore: false,
        totalPages: 1
      }
    };
  }

  /**
   * Check if employee has available balance
   */
  async hasAvailableBalance(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    daysNeeded: number
  ): Promise<boolean> {
    const balance = await this.getBalance(ctx, employeeId, leaveTypeId);
    if (!balance) {
      return false;
    }
    return balance.available_balance >= daysNeeded;
  }

  /**
   * Initialize balance for employee
   */
  async initializeBalance(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    fyStart: string,
    openingBalance: number
  ): Promise<LeaveBalance> {
    // Get FY end
    const fyEnd = calculateFinancialYearEnd(fyStart);

    // Resolve start month from leave type / location settings
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    const startMonth = await this.getStartMonthForLeaveType(ctx, leaveTypeId, settings.holidayYearStartMonth);

    // Calculate previous financial year start dynamically
    const startYear = parseInt(fyStart.split('-')[0], 10);
    const prevFyStart = `${startYear - 1}-${String(startMonth).padStart(2, '0')}-01`;

    let carriedOverNegative = 0;
    try {
      const prevBalance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, prevFyStart);
      if (prevBalance && (prevBalance.carried_forward_negative_days || (prevBalance as any).carriedForwardNegativeDays)) {
        carriedOverNegative = parseFloat(prevBalance.carried_forward_negative_days || (prevBalance as any).carriedForwardNegativeDays) || 0;
      }
    } catch (e) {
      console.warn('[LeaveBalanceService] Error looking up previous year balance:', e);
    }

    // Resolve policy to check for earned leave entitlement percent scaling
    const assignment = await this.balanceRepo.db('leave_policy_assignments')
      .where({ employee_id: employeeId, leave_type_id: leaveTypeId, is_active: true })
      .first();

    let scaledOpening = openingBalance;
    if (assignment) {
      const policy = await this.balanceRepo.db('leave_policies').where('id', assignment.leave_policy_id).first();
      if (policy && policy.earned_leave_entitlement_percent !== null) {
        scaledOpening = openingBalance * (parseFloat(policy.earned_leave_entitlement_percent) / 100);
      }
    }

    const finalOpening = Math.max(0, scaledOpening - carriedOverNegative);
    const finalAvailable = finalOpening;
    const carryForwardBal = -carriedOverNegative;

    return this.balanceRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      financial_year_start: fyStart,
      financial_year_end: fyEnd,
      opening_balance: finalOpening,
      credited_balance: 0,
      consumed_balance: 0,
      available_balance: finalAvailable,
      carry_forward_balance: carryForwardBal,
      encashed_balance: 0,
      expired_balance: 0,
      pending_approval_balance: 0,
      carried_forward_negative_days: 0, // Reset for the new year
      last_updated_at: new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Update balance on leave approval
   */
  async updateBalanceOnApproval(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    approvedDays: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0], leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newConsumed = balance.consumed_balance + approvedDays;
    const newAvailable = balance.opening_balance + balance.credited_balance + balance.carry_forward_balance - balance.encashed_balance - newConsumed;
    const newPending = Math.max(0, balance.pending_approval_balance - approvedDays);

    return this.balanceRepo.update(ctx, balance.id, {
      consumed_balance: newConsumed,
      available_balance: newAvailable,
      pending_approval_balance: newPending,
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Update balance on leave rejection
   */
  async updateBalanceOnRejection(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    rejectedDays: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0], leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const pendingVal = parseFloat(String(balance.pending_approval_balance || 0));
    const availableVal = parseFloat(String(balance.available_balance || 0));
    const newPending = Math.max(0, pendingVal - rejectedDays);
    const newAvailable = availableVal + rejectedDays;

    return this.balanceRepo.update(ctx, balance.id, {
      pending_approval_balance: newPending,
      available_balance: newAvailable,
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Update balance on leave cancellation
   */
  async updateBalanceOnCancellation(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    cancelledDays: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0], leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newConsumed = Math.max(0, balance.consumed_balance - cancelledDays);
    const newAvailable = balance.opening_balance + balance.credited_balance + balance.carry_forward_balance - balance.encashed_balance - newConsumed;

    return this.balanceRepo.update(ctx, balance.id, {
      consumed_balance: newConsumed,
      available_balance: newAvailable,
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Add pending balance for submitted application
   */
  async addPendingBalance(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    days: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0], leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newPending = balance.pending_approval_balance + days;
    const newAvailable = balance.available_balance - days;

    return this.balanceRepo.update(ctx, balance.id, {
      pending_approval_balance: newPending,
      available_balance: Math.max(0, newAvailable),
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Credit leave accrual
   */
  async creditAccrual(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    accrualDays: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0], leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    let newCredited = balance.credited_balance + accrualDays;
    let newAvailable = balance.opening_balance + newCredited + balance.carry_forward_balance - balance.encashed_balance - balance.consumed_balance;

    // Check continuous max balance cap from allocation settings
    try {
      const db = this.balanceRepo.db;
      const leaveType = await db('leave_types').where('id', leaveTypeId).first();
      if (leaveType?.allocation_settings) {
        const parsed = typeof leaveType.allocation_settings === 'string' ? JSON.parse(leaveType.allocation_settings) : leaveType.allocation_settings;
        const maxCapStr = parsed.neverLetBalanceExceed || parsed.maxBalanceCap;
        if (maxCapStr) {
          const maxCap = parseFloat(maxCapStr);
          if (!isNaN(maxCap) && maxCap > 0) {
            newAvailable = Math.min(newAvailable, maxCap);
          }
        }
      }
    } catch (e) {}

    return this.balanceRepo.update(ctx, balance.id, {
      credited_balance: newCredited,
      available_balance: newAvailable,
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Encash leave
   */
  async encashLeave(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    encashedDays: number
  ): Promise<LeaveBalance> {
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, toLocalYYYYMMDD(new Date()), leaveTypeId);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newEncashed = balance.encashed_balance + encashedDays;
    const newAvailable = balance.opening_balance + balance.credited_balance + balance.carry_forward_balance - newEncashed - balance.consumed_balance;

    return this.balanceRepo.update(ctx, balance.id, {
      encashed_balance: newEncashed,
      available_balance: newAvailable,
      last_updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);
  }

  /**
   * Helper: Get start month of financial year for a leave type
   */
  private async getStartMonthForLeaveType(ctx: TenantContext, leaveTypeId: number, defaultMonth: number): Promise<number> {
    const db = this.balanceRepo.db;
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
   * Helper: Resolve financial year start for an employee dynamically
   */
  private async getFyStartForEmployee(ctx: TenantContext, employeeId: number, dateStr: string, leaveTypeId?: number): Promise<string> {
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    const startMonth = leaveTypeId
      ? await this.getStartMonthForLeaveType(ctx, leaveTypeId, settings.holidayYearStartMonth)
      : settings.holidayYearStartMonth;
    return calculateFinancialYearStart(dateStr, startMonth);
  }
}
