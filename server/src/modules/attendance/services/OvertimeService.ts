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
   * Get all overtime / holiday work requests for HR & Admin panel with employee & department info
   */
  async getAllRequests(ctx: TenantContext, options?: ListQueryOptions) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let query = db('overtime_requests as ot')
      .leftJoin('employees as e', 'ot.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('ot.organization_id', ctx.organizationId)
      .whereNull('ot.deleted_at')
      .select(
        'ot.id',
        'ot.uuid',
        'ot.employee_id as employeeId',
        'ot.overtime_date as overtimeDate',
        'ot.overtime_hours as overtimeHours',
        'ot.overtime_type as overtimeType',
        'ot.reason_description as reason',
        'ot.approval_status as approvalStatus',
        'ot.approved_by as approvedBy',
        'ot.approval_date as approvalDate',
        'ot.created_at as createdAt',
        db.raw("CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employeeName"),
        'e.employee_code as employeeCode',
        'e.avatar_url as avatarUrl',
        'd.name as departmentName'
      )
      .orderBy('ot.created_at', 'desc');

    if (options?.filters?.approval_status) {
      query = query.where('ot.approval_status', options.filters.approval_status);
    }

    const items = await query;
    return { items };
  }

  /**
   * Approve overtime
   */
  async approve(ctx: TenantContext, requestId: number): Promise<any> {
    const request = await this.overtimeRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Overtime request not found');
    }

    const currentStatus = (request as any).approvalStatus || request.approval_status;
    if (currentStatus !== 'pending') {
      throw new ValidationError('Only pending requests can be approved');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const approved = await this.overtimeRepo.update(ctx, requestId, {
      approval_status: 'approved',
      approved_by: ctx.userId,
      approval_date: now,
    });

    // Data Sync: Backfill attendance_records.overtime_minutes if attendance record exists
    try {
      const otMins = Math.round(Number((request as any).overtimeHours ?? request.overtime_hours ?? 0) * 60);
      const empId = Number((request as any).employeeId ?? request.employee_id);
      const otDate = String((request as any).overtimeDate ?? request.overtime_date ?? '');

      if (otMins > 0 && empId && otDate) {
        const { getKnex } = await import('../../../db/knex');
        const db = getKnex();
        await db('attendance_records')
          .where('employee_id', empId)
          .where('organization_id', ctx.organizationId)
          .whereRaw('DATE(check_in_date) = ?', [otDate.slice(0, 10)])
          .update({ overtime_minutes: otMins });
      }
    } catch (syncErr) {
      console.warn('[OvertimeService.approve] Failed to sync attendance_records overtime_minutes:', syncErr);
    }

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

    const currentStatus = (request as any).approvalStatus || request.approval_status;
    if (currentStatus !== 'pending') {
      throw new ValidationError('Only pending requests can be rejected');
    }

    const rejected = await this.overtimeRepo.update(ctx, requestId, {
      approval_status: 'rejected',
    });

    // Data Sync: Zero out attendance_records.overtime_minutes if rejected
    try {
      const empId = Number((request as any).employeeId ?? request.employee_id);
      const otDate = String((request as any).overtimeDate ?? request.overtime_date ?? '');
      if (empId && otDate) {
        const { getKnex } = await import('../../../db/knex');
        const db = getKnex();
        await db('attendance_records')
          .where('employee_id', empId)
          .where('organization_id', ctx.organizationId)
          .whereRaw('DATE(check_in_date) = ?', [otDate.slice(0, 10)])
          .update({ overtime_minutes: 0 });
      }
    } catch (syncErr) {
      console.warn('[OvertimeService.reject] Failed to reset attendance_records overtime_minutes:', syncErr);
    }

    await this.auditService.log(ctx, {
      action: 'REJECT_OVERTIME',
      entityType: 'OVERTIME',
      entityId: requestId,
      afterState: { status: 'rejected' },
    });

    return rejected;
  }


}
