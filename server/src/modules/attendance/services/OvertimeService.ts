import { v4 as uuidv4 } from 'uuid';
import { OvertimeRequestRepository } from '../repositories/OvertimeRequestRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class OvertimeService {
  private overtimeRepo: OvertimeRequestRepository;
  private auditService: AuditService;

  constructor() {
    this.overtimeRepo = new OvertimeRequestRepository();
    this.auditService = new AuditService();
  }

  /**
   * Request overtime
   */
  async requestOvertime(ctx: TenantContext, input: {
    employeeId: number;
    overtimeDate: string;
    overtimeHours: number;
    overtimeType: string;
    reason?: string;
    compOffEligible?: boolean;
  }): Promise<any> {
    const validTypes = ['extra_hours', 'weekend_work', 'holiday_work'];
    if (!validTypes.includes(input.overtimeType)) {
      throw new ValidationError(`Invalid overtime type: ${input.overtimeType}`);
    }

    if (input.overtimeHours <= 0) {
      throw new ValidationError('Overtime hours must be greater than 0');
    }

    const request = await this.overtimeRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      overtime_date: input.overtimeDate,
      overtime_hours: input.overtimeHours,
      overtime_type: input.overtimeType,
      reason_description: input.reason || null,
      comp_off_eligible: input.compOffEligible !== false,
      approval_status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'REQUEST_OVERTIME',
      entityType: 'OVERTIME',
      entityId: request.id,
      afterState: { hours: input.overtimeHours, type: input.overtimeType },
    });

    // TODO: Trigger workflow for approval
    // await this.workflowService.createInstance({...});

    return request;
  }

  /**
   * Get requests by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.overtimeRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Get pending requests
   */
  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.overtimeRepo.getPendingRequests(ctx, options);
  }

  /**
   * Approve overtime
   */
  async approve(ctx: TenantContext, requestId: number): Promise<any> {
    const request = await this.overtimeRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Overtime request not found');
    }

    if (request.approval_status !== 'pending') {
      throw new ValidationError('Only pending requests can be approved');
    }

    const now = new Date().toISOString();
    const approved = await this.overtimeRepo.update(ctx, requestId, {
      approval_status: 'approved',
      approved_by: ctx.userId,
      approval_date: now,
    });

    await this.auditService.log(ctx, {
      action: 'APPROVE_OVERTIME',
      entityType: 'OVERTIME',
      entityId: requestId,
      afterState: { status: 'approved' },
    });

    return approved;
  }

  /**
   * Reject overtime
   */
  async reject(ctx: TenantContext, requestId: number): Promise<any> {
    const request = await this.overtimeRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Overtime request not found');
    }

    if (request.approval_status !== 'pending') {
      throw new ValidationError('Only pending requests can be rejected');
    }

    const rejected = await this.overtimeRepo.update(ctx, requestId, {
      approval_status: 'rejected',
    });

    await this.auditService.log(ctx, {
      action: 'REJECT_OVERTIME',
      entityType: 'OVERTIME',
      entityId: requestId,
      afterState: { status: 'rejected' },
    });

    return rejected;
  }

  /**
   * Get comp-off balance
   */
  async getCompOffBalance(ctx: TenantContext, employeeId: number): Promise<number> {
    return this.overtimeRepo.getCompOffBalance(ctx, employeeId);
  }

  /**
   * Use comp-off
   */
  async useCompOff(ctx: TenantContext, requestId: number): Promise<any> {
    const request = await this.overtimeRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Overtime request not found');
    }

    if (!request.comp_off_eligible || request.comp_off_used) {
      throw new ValidationError('Comp-off not available or already used');
    }

    const updated = await this.overtimeRepo.update(ctx, requestId, { comp_off_used: true });

    await this.auditService.log(ctx, {
      action: 'USE_COMP_OFF',
      entityType: 'OVERTIME',
      entityId: requestId,
      afterState: { compOffUsed: true },
    });

    return updated;
  }
}
