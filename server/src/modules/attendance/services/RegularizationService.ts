import { v4 as uuidv4 } from 'uuid';
import { AttendanceRegularizationRepository } from '../repositories/AttendanceRegularizationRepository';
import { AttendanceRecordRepository } from '../repositories/AttendanceRecordRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class RegularizationService {
  private regularizationRepo: AttendanceRegularizationRepository;
  private recordRepo: AttendanceRecordRepository;
  private auditService: AuditService;

  constructor() {
    this.regularizationRepo = new AttendanceRegularizationRepository();
    this.recordRepo = new AttendanceRecordRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a regularization request
   */
  async createRequest(ctx: TenantContext, input: {
    employeeId: number;
    date: string;
    checkIn: string;
    checkOut: string;
    reason: string;
    attendanceRecordId?: number;
  }): Promise<any> {
    const orgId = ctx.tenantId || 3;

    // Combine date and time to ISO string or MySQL datetime format
    const requestedCheckIn = input.checkIn ? `${input.date} ${input.checkIn}:00` : null;
    const requestedCheckOut = input.checkOut ? `${input.date} ${input.checkOut}:00` : null;

    const request = await this.regularizationRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: input.employeeId,
      attendance_record_id: input.attendanceRecordId || null,
      request_date: input.date,
      requested_check_in_time: requestedCheckIn,
      requested_check_out_time: requestedCheckOut,
      reason: input.reason,
      status: 'pending',
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: request.id,
      afterState: { date: input.date, reason: input.reason },
    });

    return request;
  }

  /**
   * Get requests by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.regularizationRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Get pending requests
   */
  async getPendingRequests(ctx: TenantContext, options?: ListQueryOptions) {
    return this.regularizationRepo.getPendingRequests(ctx, options);
  }

  /**
   * Approve regularization
   */
  async approve(ctx: TenantContext, requestId: number, comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Only pending requests can be approved');
    }

    const now = new Date();
    const approved = await this.regularizationRepo.update(ctx, requestId, {
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: now.toISOString() as any,
    } as any);

    // If associated with attendance record, update it as regularized
    if (request.attendance_record_id) {
      await this.recordRepo.update(ctx, request.attendance_record_id, {
        is_regularized: true,
        regularization_request_id: request.id,
      } as any);
    }

    await this.auditService.log(ctx, {
      action: 'APPROVE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'approved' },
    });

    return approved;
  }

  /**
   * Reject regularization
   */
  async reject(ctx: TenantContext, requestId: number, reason?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Only pending requests can be rejected');
    }

    const rejected = await this.regularizationRepo.update(ctx, requestId, {
      status: 'rejected',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString() as any,
    } as any);

    await this.auditService.log(ctx, {
      action: 'REJECT_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'rejected' },
    });

    return rejected;
  }

  /**
   * Get regularization request by ID
   */
  async getRequest(ctx: TenantContext, requestId: number): Promise<any | null> {
    return this.regularizationRepo.getById(ctx, requestId);
  }
}
