import { v4 as uuidv4 } from 'uuid';
import { AttendanceRegularizationRepository } from '../repositories/AttendanceRegularizationRepository';
import { AttendanceRecordRepository } from '../repositories/AttendanceRecordRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { db } from '../../../db/knex';

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
   * Helper to format time strings (e.g. "11:57 AM" or "09:30") into a ISO/Datetime string for DB storage
   */
  private formatDateTime(dateStr: string, timeStr?: string | null): string | null {
    if (!timeStr || !timeStr.trim()) return null;
    const cleanTime = timeStr.trim();

    // Check 12-hour AM/PM format (e.g. 11:57 AM or 09:30 PM)
    const ampmMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const formattedHours = String(hours).padStart(2, '0');
      return `${dateStr} ${formattedHours}:${minutes}:00`;
    }

    // Check 24-hour HH:mm format
    const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = String(parseInt(match24[1], 10)).padStart(2, '0');
      const minutes = match24[2];
      return `${dateStr} ${hours}:${minutes}:00`;
    }

    return `${dateStr} ${cleanTime}`;
  }

  /**
   * Create a regularization request
   */
  async createRequest(ctx: TenantContext, input: {
    employeeId: number;
    date: string;
    isDateRange?: boolean;
    endDate?: string;
    checkIn: string;
    checkOut: string;
    actualCheckIn?: string;
    actualCheckOut?: string;
    reason: string;
    dayType?: string;
    comment?: string;
    attendanceRecordId?: number;
  }): Promise<any> {
    // Fetch employee details to get reporting manager, organization, and company
    const empRow = await db('employees').where('id', input.employeeId).first();
    const managerId = empRow ? (empRow.reporting_manager_id || empRow.reportingManagerId || null) : null;
    const orgId = empRow ? (empRow.organization_id || empRow.organizationId || ctx.organizationId || ctx.companyId || 8) : (ctx.organizationId || ctx.companyId || 8);
    const compId = empRow ? (empRow.company_id || empRow.companyId || orgId) : orgId;

    // If manager exists, start stage 1: pending_manager; else start stage 2: pending_hr
    const initialStatus = managerId ? 'pending_manager' : 'pending_hr';

    const requestedCheckIn = this.formatDateTime(input.date, input.checkIn);
    const requestedCheckOut = this.formatDateTime(input.endDate || input.date, input.checkOut);
    const actualCheckIn = input.actualCheckIn ? this.formatDateTime(input.date, input.actualCheckIn) : null;
    const actualCheckOut = input.actualCheckOut ? this.formatDateTime(input.endDate || input.date, input.actualCheckOut) : null;

    const request = await this.regularizationRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: orgId,
      company_id: compId,
      employee_id: input.employeeId,
      attendance_record_id: input.attendanceRecordId || null,
      request_date: input.date,
      is_date_range: !!input.isDateRange,
      end_date: input.isDateRange ? (input.endDate || input.date) : null,
      requested_check_in_time: requestedCheckIn || input.checkIn,
      requested_check_out_time: requestedCheckOut || input.checkOut,
      actual_check_in_time: actualCheckIn || input.actualCheckIn || null,
      actual_check_out_time: actualCheckOut || input.actualCheckOut || null,
      reason: input.reason,
      day_type: input.dayType || 'Full Day',
      comment: input.comment || null,
      status: initialStatus,
      manager_id: managerId,
      created_by: ctx.userId || input.employeeId,
      updated_by: ctx.userId || input.employeeId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: request.id,
      afterState: { date: input.date, reason: input.reason, status: initialStatus },
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
   * Get requests pending Manager review
   */
  async getManagerPendingRequests(ctx: TenantContext, managerUserId: number) {
    // Find manager's employee record ID
    const managerEmp = await db('employees').where('id', managerUserId).first();
    const managerEmpId = managerEmp ? managerEmp.id : managerUserId;
    const managerDeptId = managerEmp ? (managerEmp.department_id || managerEmp.departmentId) : undefined;

    return this.regularizationRepo.getManagerPendingRequests(ctx, managerEmpId, managerDeptId);
  }

  /**
   * Get requests pending HR review
   */
  async getHRPendingRequests(ctx: TenantContext) {
    return this.regularizationRepo.getHRPendingRequests(ctx);
  }

  /**
   * Manager Approve (Stage 1) -> Moves request to pending_hr / manager_approved
   */
  async managerApprove(ctx: TenantContext, requestId: number, comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    if (request.status !== 'pending_manager' && request.status !== ('pending' as any)) {
      throw new ValidationError('Only requests pending manager review can be approved by manager');
    }

    const now = new Date();
    const updated = await this.regularizationRepo.update(ctx, requestId, {
      status: 'pending_hr',
      manager_approved_by: ctx.userId,
      manager_approved_at: now as any,
      manager_comments: comments || 'Approved by Manager',
    } as any);

    await this.auditService.log(ctx, {
      action: 'MANAGER_APPROVE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'pending_hr' },
    });

    return updated;
  }

  /**
   * Manager Reject (Stage 1) -> Moves request to rejected
   */
  async managerReject(ctx: TenantContext, requestId: number, comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    const now = new Date();
    const rejected = await this.regularizationRepo.update(ctx, requestId, {
      status: 'rejected',
      manager_approved_by: ctx.userId,
      manager_approved_at: now as any,
      manager_comments: comments || 'Rejected by Manager',
    } as any);

    await this.auditService.log(ctx, {
      action: 'MANAGER_REJECT_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'rejected' },
    });

    return rejected;
  }

  /**
   * HR Approve (Stage 2 or Direct Override) -> Final Approval + Updates Attendance Records
   */
  async hrApprove(ctx: TenantContext, requestId: number, comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    if (request.status === 'approved') {
      throw new ValidationError('Request is already approved');
    }

    const now = new Date();
    const approved = await this.regularizationRepo.update(ctx, requestId, {
      status: 'approved',
      hr_approved_by: ctx.userId,
      hr_approved_at: now as any,
      hr_comments: comments || 'Approved by HR',
    } as any);

    // Regularize Attendance Records for date or date range
    await this.applyRegularizationToAttendanceRecords(ctx, request);

    await this.auditService.log(ctx, {
      action: 'HR_APPROVE_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'approved' },
    });

    return approved;
  }

  /**
   * HR Reject -> Sets status to rejected
   */
  async hrReject(ctx: TenantContext, requestId: number, comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) {
      throw new NotFoundError('Regularization request not found');
    }

    const now = new Date();
    const rejected = await this.regularizationRepo.update(ctx, requestId, {
      status: 'rejected',
      hr_approved_by: ctx.userId,
      hr_approved_at: now as any,
      hr_comments: comments || 'Rejected by HR',
    } as any);

    await this.auditService.log(ctx, {
      action: 'HR_REJECT_REGULARIZATION',
      entityType: 'REGULARIZATION',
      entityId: requestId,
      afterState: { status: 'rejected' },
    });

    return rejected;
  }

  /**
   * Helper to sync attendance_records upon final HR approval
   */
  private async applyRegularizationToAttendanceRecords(ctx: TenantContext, req: any): Promise<void> {
    const orgId = req.organization_id || req.company_id || ctx.organizationId || 1;
    const startDate = new Date(req.request_date);
    const endDate = req.is_date_range && req.end_date ? new Date(req.end_date) : startDate;

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().split('T')[0];

      // Format check-in & check-out timestamp strings
      const reqInTime = req.requested_check_in_time ? this.formatDateTime(dateStr, req.requested_check_in_time) : `${dateStr} 09:30:00`;
      const reqOutTime = req.requested_check_out_time ? this.formatDateTime(dateStr, req.requested_check_out_time) : `${dateStr} 18:30:00`;

      // Check if record exists
      const existingRecord = await db('attendance_records')
        .where('employee_id', req.employee_id)
        .where((qb) => {
          qb.where('check_in_date', dateStr).orWhereRaw('DATE(check_in_time) = ?', [dateStr]);
        })
        .first();

      if (existingRecord) {
        await db('attendance_records')
          .where('id', existingRecord.id)
          .update({
            check_in_time: reqInTime,
            check_out_time: reqOutTime,
            is_regularized: true,
            regularization_request_id: req.id,
            status: req.reason && req.reason.toLowerCase().includes('home') ? 'work_from_home' : 'present',
            updated_at: new Date(),
          });
      } else {
        await db('attendance_records').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: orgId,
          employee_id: req.employee_id,
          check_in_date: dateStr,
          check_in_time: reqInTime,
          check_out_time: reqOutTime,
          status: req.reason && req.reason.toLowerCase().includes('home') ? 'work_from_home' : 'present',
          is_regularized: true,
          regularization_request_id: req.id,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      curr.setDate(curr.getDate() + 1);
    }
  }

  /**
   * Admin Logs
   */
  async getAdminLogs(ctx: TenantContext, options: any) {
    return this.regularizationRepo.getAdminLogs(ctx, options);
  }

  /**
   * Get single request
   */
  async getRequest(ctx: TenantContext, requestId: number): Promise<any | null> {
    return this.regularizationRepo.getById(ctx, requestId);
  }
}
