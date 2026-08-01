import { v4 as uuidv4 } from 'uuid';
import { LeaveBalanceRepository } from '../repositories/LeaveBalanceRepository';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import type { LeaveBalance } from '../repositories/LeaveBalanceRepository';
import { calculateFinancialYearStart, calculateFinancialYearEnd, toLocalYYYYMMDD } from '../utils/dateUtils';
import { getOrgLeaveSettings } from '../utils/settingsResolver';

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
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(new Date()), settings.holidayYearStartMonth);
    return this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);
  }

  /**
   * Get all balances for employee
   */
  async getBalancesForEmployee(ctx: TenantContext, employeeId: number) {
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    const fyStart = calculateFinancialYearStart(toLocalYYYYMMDD(new Date()), settings.holidayYearStartMonth);
    let balances = await this.balanceRepo.list(ctx, {
      filters: {
        employee_id: employeeId,
        financial_year_start: fyStart,
      },
    });

    if (!balances || !balances.items || balances.items.length === 0) {
      const defaultTypes = [
        { id: 1, quota: 12 }, // Casual Leave
        { id: 2, quota: 12 }, // Sick Leave
        { id: 3, quota: 15 }, // Earned Leave
        { id: 4, quota: 10 }, // Privilege Leave
      ];

      for (const t of defaultTypes) {
        try {
          await this.initializeBalance(ctx, employeeId, t.id, fyStart, t.quota);
        } catch (e) {
          console.warn('[LeaveBalanceService] init balance warning:', e);
        }
      }

      balances = await this.balanceRepo.list(ctx, {
        filters: {
          employee_id: employeeId,
          financial_year_start: fyStart,
        },
      });
    }

    return balances;
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

    // Resolve start month from location settings
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    const startMonth = settings.holidayYearStartMonth;

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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0]);
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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0]);
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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0]);
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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0]);
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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, new Date().toISOString().split('T')[0]);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newCredited = balance.credited_balance + accrualDays;
    const newAvailable = balance.opening_balance + newCredited + balance.carry_forward_balance - balance.encashed_balance - balance.consumed_balance;

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
    const fyStart = await this.getFyStartForEmployee(ctx, employeeId, toLocalYYYYMMDD(new Date()));
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
   * Helper: Resolve financial year start for an employee dynamically
   */
  private async getFyStartForEmployee(ctx: TenantContext, employeeId: number, dateStr: string): Promise<string> {
    const employee = await this.balanceRepo.db('employees').where('id', employeeId).first();
    const settings = await getOrgLeaveSettings(ctx.organizationId, employee ? (employee.current_location_id || employee.currentLocationId) : null);
    return calculateFinancialYearStart(dateStr, settings.holidayYearStartMonth);
  }
}
