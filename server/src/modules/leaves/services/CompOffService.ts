import { v4 as uuidv4 } from 'uuid';
import { CompOffBalanceRepository } from '../repositories/CompOffBalanceRepository';
import { CompOffRequestRepository } from '../repositories/CompOffRequestRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import type { CompOffBalance } from '../repositories/CompOffBalanceRepository';
import { toLocalYYYYMMDD } from '../utils/dateUtils';
import { getKnex } from '../../../db/knex';
import { subscribeEvent } from '../../../realtime/eventBus';

interface EarnCompOffInput {
  employeeId: number;
  earnedDate: string;
  hours: number;
  reason: string;
}

interface RequestCompOffInput {
  employeeId: number;
  compOffId: number;
  reason?: string;
}

export class CompOffService {
  private balanceRepo: CompOffBalanceRepository;
  private requestRepo: CompOffRequestRepository;
  private auditService: AuditService;
  private static compOffHookRegistered = false;

  constructor() {
    this.balanceRepo = new CompOffBalanceRepository();
    this.requestRepo = new CompOffRequestRepository();
    this.auditService = new AuditService();

    if (!CompOffService.compOffHookRegistered) {
      subscribeEvent('AttendanceOvertimeLoggedEvent', (payload: any) => this.handleAttendanceOvertime(payload));
      subscribeEvent('HolidayWorkLoggedEvent', (payload: any) => this.handleHolidayWork(payload));
      CompOffService.compOffHookRegistered = true;
    }
  }

  /**
   * Earn comp off (e.g., for weekend/holiday work)
   */
  async earnCompOff(ctx: TenantContext, input: EarnCompOffInput): Promise<CompOffBalance> {
    // Calculate expiry (6 months from earned date)
    const earnedDate = new Date(input.earnedDate);
    const expiryDate = new Date(earnedDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    const balance = await this.balanceRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      comp_off_earned_date: input.earnedDate,
      comp_off_earned_hours: input.hours,
      comp_off_expires_at: toLocalYYYYMMDD(expiryDate),
      comp_off_used_date: null,
      comp_off_used_hours: null,
      status: 'available',
      reason: input.reason,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'earned',
      entityType: 'comp_off',
      entityId: balance.id,
      afterState: { hours: input.hours, reason: input.reason },
    });

    return balance;
  }

  /**
   * Request comp off usage
   */
  async requestCompOff(ctx: TenantContext, input: RequestCompOffInput): Promise<number> {
    const compOff = await this.balanceRepo.getById(ctx, input.compOffId);
    if (!compOff) {
      throw new NotFoundError('Comp off balance not found');
    }

    if (compOff.status !== 'available') {
      throw new ValidationError('Comp off is not available');
    }

    // Check expiry
    if (compOff.comp_off_expires_at && new Date(compOff.comp_off_expires_at) < new Date()) {
      throw new ValidationError('Comp off has expired');
    }

    // Check if already requested (prevent duplicate pending requests)
    const existingPending = await this.requestRepo.query(ctx)
      .where('comp_off_id', input.compOffId)
      .where('status', 'pending')
      .first();
    if (existingPending) {
      throw new ValidationError('A pending request already exists for this comp-off credit');
    }

    const request = await this.requestRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: input.employeeId,
      comp_off_id: input.compOffId,
      request_date: toLocalYYYYMMDD(new Date()),
      reason: input.reason || null,
      workflow_instance_id: null,
      status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'requested',
      entityType: 'comp_off',
      entityId: request.id,
      afterState: { compOffId: input.compOffId },
    });

    return request.id;
  }

  /**
   * Approve comp off request
   */
  async approveCompOffRequest(ctx: TenantContext, requestId: number): Promise<void> {
    const request = await this.requestRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Comp off request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Only pending requests can be approved');
    }

    // Update request
    await this.requestRepo.update(ctx, requestId, {
      status: 'approved',
    } as any);

    // Update comp off balance
    await this.balanceRepo.update(ctx, request.comp_off_id, {
      status: 'used',
      comp_off_used_date: toLocalYYYYMMDD(new Date()),
      comp_off_used_hours: (await this.balanceRepo.getById(ctx, request.comp_off_id))?.comp_off_earned_hours || 0,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'approved',
      entityType: 'comp_off',
      entityId: request.id,
      afterState: { status: 'approved' },
    });
  }

  /**
   * Reject comp off request
   */
  async rejectCompOffRequest(ctx: TenantContext, requestId: number, reason: string): Promise<void> {
    const request = await this.requestRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Comp off request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Only pending requests can be rejected');
    }

    // Update request
    await this.requestRepo.update(ctx, requestId, {
      status: 'rejected',
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'rejected',
      entityType: 'comp_off',
      entityId: request.id,
      afterState: { status: 'rejected', reason },
    });
  }

  /**
   * Get comp off balance for employee
   */
  async getBalanceForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.balanceRepo.getForEmployee(ctx, employeeId, options);
  }

  /**
   * Get pending requests for employee
   */
  async getPendingRequestsForEmployee(ctx: TenantContext, employeeId: number) {
    return this.requestRepo.query(ctx)
      .where('employee_id', employeeId)
      .where('status', 'pending')
      .orderBy('created_at', 'desc');
  }

  /**
   * Get available comp off for employee
   */
  async getAvailableForEmployee(ctx: TenantContext, employeeId: number): Promise<CompOffBalance[]> {
    return this.balanceRepo.getAvailableForEmployee(ctx, employeeId);
  }

  /**
   * Get total available hours
   */
  async getTotalAvailableHours(ctx: TenantContext, employeeId: number): Promise<number> {
    return this.balanceRepo.getTotalAvailableHours(ctx, employeeId);
  }

  /**
   * Check for expired comp offs and update status
   */
  async checkAndExpireCompOffs(ctx: TenantContext): Promise<void> {
    const today = toLocalYYYYMMDD(new Date());
    const query = this.balanceRepo.query(ctx)
      .where('status', 'available')
      .where('comp_off_expires_at', '<', today);

    const expiredCompOffs = await query as any;

    for (const compOff of expiredCompOffs) {
      await this.balanceRepo.update(ctx, compOff.id, {
        status: 'expired',
      } as any);

      // Audit log
      await this.auditService.log(ctx, {
        action: 'expired',
        entityType: 'comp_off',
        entityId: compOff.id,
        afterState: { status: 'expired' },
      });
    }
  }

  /**
   * Handle overtime event to credit Comp-Off
   */
  async handleAttendanceOvertime(payload: any): Promise<void> {
    const db = getKnex();
    const ctx = payload.ctx || { organizationId: payload.organizationId || 1, userId: 1, roles: [] };
    const employeeId = payload.employeeId || payload.employee_id;
    const dateStr = payload.date || payload.checkInDate || toLocalYYYYMMDD(new Date());
    const hours = payload.hours || payload.overtimeHours || 0;
    
    if (!employeeId || hours <= 0) return;

    // Check policy assignment
    const assignment = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .first();

    const validityDays = assignment ? (assignment.comp_off_validity_days || 60) : 60;

    const earnedDate = new Date(dateStr);
    const expiryDate = new Date(earnedDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    const idempotencyKey = `COMPOFF-OT-${employeeId}-${dateStr}`;

    const existing = await db('comp_off_balances')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('comp_off_earned_date', dateStr)
      .where('reason', 'like', '%Overtime%')
      .first();

    if (existing) return;

    await db.transaction(async (trx) => {
      // Resolve leave type id
      const leaveType = await trx('leave_types')
        .where('code', 'COMP_OFF')
        .orWhere('leave_name', 'like', '%Comp%')
        .first();
      const leaveTypeId = leaveType ? leaveType.id : 5;

      // 1. Create comp off balance
      await trx('comp_off_balances').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        comp_off_earned_date: dateStr,
        comp_off_earned_hours: hours,
        comp_off_expires_at: toLocalYYYYMMDD(expiryDate),
        status: 'available',
        reason: `Automated Overtime Comp-Off credit: ${hours} hours worked.`,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 2. Insert into leave_ledger_entries
      await trx('leave_ledger_entries').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        transaction_type: 'COMP_OFF_CREDIT',
        amount: hours / 8, // hours to days conversion
        effective_date: dateStr,
        reference_id: idempotencyKey,
        remarks: `Automated Overtime Comp-Off: ${hours} hours earned. Expiry: ${toLocalYYYYMMDD(expiryDate)}`,
        created_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 3. Update Balance
      let balance = await trx('leave_balances')
        .where('employee_id', employeeId)
        .where('leave_type_id', leaveTypeId)
        .first();

      const creditDays = hours / 8;

      if (!balance) {
        // Initialize balance
        const fyStart = `${new Date(dateStr).getFullYear()}-04-01`;
        const fyEnd = `${new Date(dateStr).getFullYear() + 1}-03-31`;
        await trx('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: 0,
          credited_balance: creditDays,
          consumed_balance: 0,
          available_balance: creditDays,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        const newCredited = parseFloat(String(balance.credited_balance || 0)) + creditDays;
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
    });
  }

  /**
   * Handle holiday work event to credit Comp-Off
   */
  async handleHolidayWork(payload: any): Promise<void> {
    const db = getKnex();
    const ctx = payload.ctx || { organizationId: payload.organizationId || 1, userId: 1, roles: [] };
    const employeeId = payload.employeeId || payload.employee_id;
    const dateStr = payload.date || payload.checkInDate || toLocalYYYYMMDD(new Date());
    const hours = payload.hours || payload.workHours || 8;
    
    if (!employeeId || hours <= 0) return;

    // Check policy assignment
    const assignment = await db('leave_policy_assignments')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('is_active', true)
      .whereNull('deleted_at')
      .first();

    const validityDays = assignment ? (assignment.comp_off_validity_days || 60) : 60;

    const earnedDate = new Date(dateStr);
    const expiryDate = new Date(earnedDate);
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    const idempotencyKey = `COMPOFF-HOL-${employeeId}-${dateStr}`;

    const existing = await db('comp_off_balances')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('comp_off_earned_date', dateStr)
      .where('reason', 'like', '%Holiday%')
      .first();

    if (existing) return;

    await db.transaction(async (trx) => {
      // Resolve leave type id
      const leaveType = await trx('leave_types')
        .where('code', 'COMP_OFF')
        .orWhere('leave_name', 'like', '%Comp%')
        .first();
      const leaveTypeId = leaveType ? leaveType.id : 5;

      // 1. Create comp off balance
      await trx('comp_off_balances').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        comp_off_earned_date: dateStr,
        comp_off_earned_hours: hours,
        comp_off_expires_at: toLocalYYYYMMDD(expiryDate),
        status: 'available',
        reason: `Automated Holiday Work Comp-Off credit: ${hours} hours worked.`,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 2. Insert into leave_ledger_entries
      await trx('leave_ledger_entries').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        transaction_type: 'COMP_OFF_CREDIT',
        amount: hours / 8, // hours to days conversion
        effective_date: dateStr,
        reference_id: idempotencyKey,
        remarks: `Automated Holiday Work Comp-Off: ${hours} hours earned. Expiry: ${toLocalYYYYMMDD(expiryDate)}`,
        created_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 3. Update Balance
      let balance = await trx('leave_balances')
        .where('employee_id', employeeId)
        .where('leave_type_id', leaveTypeId)
        .first();

      const creditDays = hours / 8;

      if (!balance) {
        // Initialize balance
        const fyStart = `${new Date(dateStr).getFullYear()}-04-01`;
        const fyEnd = `${new Date(dateStr).getFullYear() + 1}-03-31`;
        await trx('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: 0,
          credited_balance: creditDays,
          consumed_balance: 0,
          available_balance: creditDays,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        const newCredited = parseFloat(String(balance.credited_balance || 0)) + creditDays;
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
    });
  }
}
