import { v4 as uuidv4 } from 'uuid';
import { LeaveBalanceRepository } from '../repositories/LeaveBalanceRepository';
import { LeavePolicyAssignmentRepository } from '../repositories/LeavePolicyAssignmentRepository';
import { LeaveApplicationRepository } from '../repositories/LeaveApplicationRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import type { LeaveBalance } from '../repositories/LeaveBalanceRepository';

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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
    return this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);
  }

  /**
   * Get all balances for employee
   */
  async getBalancesForEmployee(ctx: TenantContext, employeeId: number) {
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
    return this.balanceRepo.list(ctx, {
      filters: {
        employee_id: employeeId,
        financial_year_start: fyStart,
      },
    });
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
    const fyEnd = this.calculateFinancialYearEnd(fyStart);

    return this.balanceRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      financial_year_start: fyStart,
      financial_year_end: fyEnd,
      opening_balance: openingBalance,
      credited_balance: 0,
      consumed_balance: 0,
      available_balance: openingBalance,
      carry_forward_balance: 0,
      encashed_balance: 0,
      expired_balance: 0,
      pending_approval_balance: 0,
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
    const balance = await this.balanceRepo.getBalance(ctx, employeeId, leaveTypeId, fyStart);

    if (!balance) {
      throw new NotFoundError('Leave balance not found');
    }

    const newPending = Math.max(0, balance.pending_approval_balance - rejectedDays);

    return this.balanceRepo.update(ctx, balance.id, {
      pending_approval_balance: newPending,
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
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
    const fyStart = this.calculateFinancialYearStart(new Date().toISOString().split('T')[0]);
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
   * Helper: Calculate financial year end
   */
  private calculateFinancialYearEnd(fyStart: string): string {
    const year = parseInt(fyStart.substring(0, 4));
    return `${year + 1}-03-31`;
  }
}
