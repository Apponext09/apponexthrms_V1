import { v4 as uuidv4 } from 'uuid';
import { AttendanceRegularizationRepository } from '../repositories/AttendanceRegularizationRepository';
import { AttendanceRecordRepository } from '../repositories/AttendanceRecordRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

// Workflow service will be injected for integration
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
    type: string;
    requestDate: string;
    reason: string;
    attendanceRecordId?: number;
    supportingDocumentUrl?: string;
  }): Promise<any> {
    // Validate request type
    const validTypes = ['missed_punch', 'late_arrival', 'early_departure', 'work_from_home', 'manual_correction'];
    if (!validTypes.includes(input.type)) {
      throw new ValidationError(`Invalid regularization type: ${input.type}`);
    }

    const request = await this.regularizationRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      attendance_record_id: input.attendanceRecordId || null,
      regularization_type: input.type,
      request_date: input.requestDate,
      reason_description: input.reason,
      supporting_document_url: input.supportingDocumentUrl || null,
      status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: request.id,
      afterState: { type: input.type, date: input.requestDate },
    });

    // TODO: Trigger workflow instance for approval
    // await this.workflowService.createInstance({
    //   workflowCode: 'ATTENDANCE_REGULARIZATION',
    //   initiatorId: ctx.userId,
    //   entityId: request.id,
    //   context: { employeeId: input.employeeId, type: input.type },
    // });

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

    const now = new Date().toISOString();
    const approved = await this.regularizationRepo.update(ctx, requestId, {
      status: 'approved',
      approved_by: ctx.userId,
      approval_date: now,
      approval_comments: comments || null,
    });

    // If associated with attendance record, update it as regularized
    if (request.attendance_record_id) {
      await this.recordRepo.update(ctx, request.attendance_record_id, {
        is_regularized: true,
        regularization_request_id: request.id,
      });
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
      approval_comments: reason || null,
    });

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
