import { v4 as uuidv4 } from 'uuid';
import { CompOffBalanceRepository } from '../repositories/CompOffBalanceRepository';
import { CompOffRequestRepository } from '../repositories/CompOffRequestRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { AuditService } from '../../audit/audit.service';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import type { CompOffBalance } from '../repositories/CompOffBalanceRepository';
import { toLocalYYYYMMDD } from '../utils/dateUtils';

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

  constructor() {
    this.balanceRepo = new CompOffBalanceRepository();
    this.requestRepo = new CompOffRequestRepository();
    this.auditService = new AuditService();
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
}
