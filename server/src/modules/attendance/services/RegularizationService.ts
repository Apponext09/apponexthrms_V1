import { v4 as uuidv4 } from 'uuid';
import { AttendanceRegularizationRepository } from '../repositories/AttendanceRegularizationRepository';
import { AttendanceRecordRepository } from '../repositories/AttendanceRecordRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { db } from '../../../db/knex';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';

export class RegularizationService {
  private regularizationRepo: AttendanceRegularizationRepository;
  private recordRepo: AttendanceRecordRepository;
  private auditService: AuditService;
  private workflowExecutionService: WorkflowExecutionService;

  constructor() {
    this.regularizationRepo = new AttendanceRegularizationRepository();
    this.recordRepo = new AttendanceRecordRepository();
    this.auditService = new AuditService();
    this.workflowExecutionService = new WorkflowExecutionService();
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
      if (hours < 1 || hours > 12 || Number(minutes) > 59) return null;
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const formattedHours = String(hours).padStart(2, '0');
      return `${dateStr} ${formattedHours}:${minutes}:00`;
    }

    // Check 24-hour HH:mm format
    const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      if (Number(match24[1]) > 23 || Number(match24[2]) > 59) return null;
      const hours = String(parseInt(match24[1], 10)).padStart(2, '0');
      const minutes = match24[2];
      return `${dateStr} ${hours}:${minutes}:00`;
    }

    return null;
  }

  /** Stored request values may be SQL datetimes; retain only their clock time
   * before applying them to the attendance date. */
  private applyTimeForDate(dateStr: string, value?: string | null): string | null {
    if (!value) return null;
    const dateTimeMatch = String(value).match(/^\d{4}-\d{2}-\d{2}[ T](\d{1,2}:\d{2})(?::\d{2})?$/);
    return this.formatDateTime(dateStr, dateTimeMatch ? dateTimeMatch[1] : value);
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || (input.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate))) {
      throw new ValidationError('Request dates must use YYYY-MM-DD format');
    }
    const endDate = input.isDateRange ? (input.endDate || input.date) : input.date;
    if (endDate < input.date) throw new ValidationError('End date cannot be before start date');
    if (!this.formatDateTime(input.date, input.checkIn) || !this.formatDateTime(endDate, input.checkOut)) {
      throw new ValidationError('Check-in and check-out must be valid times (for example 09:30 or 09:30 AM)');
    }

    // Fetch employee details to get reporting manager, organization, and company
    const empRow = await db('employees').where('id', input.employeeId).first();
    const managerId = empRow ? (empRow.reporting_manager_id || empRow.reportingManagerId || null) : null;
    const orgId = empRow ? (empRow.organization_id || empRow.organizationId || ctx.organizationId || ctx.companyId || 8) : (ctx.organizationId || ctx.companyId || 8);
    const compId = empRow ? (empRow.company_id || empRow.companyId || orgId) : orgId;

    // If manager exists, start stage 1: pending_manager; else start stage 2: pending_hr
    const initialStatus = managerId ? 'pending_manager' : 'pending_hr';

    // A range deliberately becomes one request per day. This preserves a
    // complete approval trail and lets HR approve/reject individual days.
    const dates: string[] = [];
    for (let cursor = new Date(`${input.date}T00:00:00Z`), last = new Date(`${endDate}T00:00:00Z`); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    if (dates.length > 31) throw new ValidationError('A work hour request can cover at most 31 days');

    const requests = await db.transaction(async (trx) => {
      const created: any[] = [];
      for (const requestDate of dates) {
        const duplicate = await trx('attendance_regularizations')
          .where({ organization_id: orgId, employee_id: input.employeeId, request_date: requestDate })
          .whereNotIn('status', ['rejected'])
          .first();
        if (duplicate) throw new ValidationError(`A work hour request already exists for ${requestDate}`);
        const payload = {
          uuid: uuidv4(), organization_id: orgId, company_id: compId, employee_id: input.employeeId,
          attendance_record_id: dates.length === 1 ? (input.attendanceRecordId || null) : null,
          request_date: requestDate, is_date_range: dates.length > 1, end_date: dates.length > 1 ? endDate : null,
          requested_check_in_time: this.formatDateTime(requestDate, input.checkIn),
          requested_check_out_time: this.formatDateTime(requestDate, input.checkOut),
          actual_check_in_time: dates.length === 1 && input.actualCheckIn ? this.formatDateTime(requestDate, input.actualCheckIn) : null,
          actual_check_out_time: dates.length === 1 && input.actualCheckOut ? this.formatDateTime(requestDate, input.actualCheckOut) : null,
          reason: input.reason, day_type: input.dayType || 'Full Day', comment: input.comment || null,
          status: initialStatus, manager_id: managerId, created_by: ctx.userId || input.employeeId, updated_by: ctx.userId || input.employeeId,
        };
        const [id] = await trx('attendance_regularizations').insert(payload);
        created.push({ ...payload, id });
      }
      return created;
    });
    // Use the same configured workflow engine as expense requests whenever an
    // attendance-regularization workflow has been published. Organisations
    // without one continue on the established Manager -> HR fallback.
    let workflow = await db('workflows')
      .where({ organization_id: orgId, type: 'attendance_regularization', status: 'published', is_published: true })
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
      .first();
    if (workflow) {
      const firstStep = await db('workflow_steps')
        .where({ organization_id: orgId, workflow_id: workflow.id, step_number: 1 })
        .whereNull('deleted_at')
        .first();
      // An incomplete draft-like configuration must never strand a request.
      if (!firstStep || !['specific_user', 'reporting_manager', 'department_head', 'user_role'].includes(firstStep.approver_type)) workflow = null;
    }
    for (const request of requests) {
      if (workflow) {
        const instance = await this.workflowExecutionService.startWorkflow(ctx, {
          workflowCode: workflow.workflow_code,
          entityType: 'attendance_regularization',
          entityId: Number(request.id),
          metadata: { employeeId: input.employeeId, requestDate: request.request_date, requestType: 'work_hour_request' },
        });
        await this.regularizationRepo.update(ctx, request.id, { workflow_instance_id: instance.id, status: 'pending_workflow' } as any);
        request.workflow_instance_id = instance.id;
        request.status = 'pending_workflow';
      }
      await this.auditService.log(ctx, { action: 'CREATE_REGULARIZATION', entityType: 'REGULARIZATION', entityId: request.id, afterState: { date: request.request_date, reason: input.reason, status: request.status } });
    }
    return requests.length === 1 ? requests[0] : requests;
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
  async getManagerPendingRequests(ctx: TenantContext, managerEmployeeId: number) {
    let managerEmp = await db('employees').where('id', managerEmployeeId).first();
    if (!managerEmp && ctx.userId) {
      const user = await db('users').where('id', ctx.userId).first();
      if (user && user.email) {
        managerEmp = await db('employees')
          .where((b) => b.where('email', user.email).orWhere('work_email', user.email))
          .first();
      }
    }
    const resolvedManagerEmpId = managerEmp ? Number(managerEmp.id) : managerEmployeeId;
    const managerDeptId = managerEmp ? (managerEmp.current_department_id || managerEmp.currentDepartmentId || managerEmp.department_id || managerEmp.departmentId) : undefined;

    return this.regularizationRepo.getManagerPendingRequests(ctx, resolvedManagerEmpId, managerDeptId);
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

  /** Final callback used by the configured workflow engine. */
  async completeConfiguredWorkflow(ctx: TenantContext, requestId: number, outcome: 'approved' | 'rejected', comments?: string): Promise<any> {
    const request = await this.regularizationRepo.getById(ctx, requestId);
    if (!request) throw new NotFoundError('Regularization request not found');
    if (request.status === 'approved' || request.status === 'rejected') return request;

    const update: any = {
      status: outcome,
      updated_by: ctx.userId,
      hr_comments: comments || `Workflow ${outcome}`,
      hr_approved_by: ctx.userId,
      hr_approved_at: new Date(),
    };
    const completed = await this.regularizationRepo.update(ctx, requestId, update);
    if (outcome === 'approved') await this.applyRegularizationToAttendanceRecords(ctx, request);
    await this.auditService.log(ctx, { action: `WORKFLOW_${outcome.toUpperCase()}_REGULARIZATION`, entityType: 'REGULARIZATION', entityId: requestId, afterState: { status: outcome } });
    return completed;
  }

  /**
   * Helper to sync attendance_records upon final HR approval
   */
  private async applyRegularizationToAttendanceRecords(ctx: TenantContext, req: any): Promise<void> {
    const orgId = req.organization_id || req.organizationId || req.company_id || req.companyId || ctx.organizationId || 1;
    const reqDate = req.request_date || req.requestDate;
    const empId = req.employee_id || req.employeeId;
    const reasonText = req.reason || '';

    const dateStr = String(reqDate).slice(0, 10);

      // Format check-in & check-out timestamp strings
      const checkInVal = req.requested_check_in_time || req.requestedCheckInTime;
      const checkOutVal = req.requested_check_out_time || req.requestedCheckOutTime;
      const reqInTime = this.applyTimeForDate(dateStr, checkInVal) || `${dateStr} 09:30:00`;
      const reqOutTime = this.applyTimeForDate(dateStr, checkOutVal) || `${dateStr} 18:30:00`;

      // Check if record exists
      const existingRecord = await db('attendance_records')
        .where('employee_id', empId)
        .where((qb) => {
          qb.where('check_in_date', dateStr).orWhereRaw('DATE(check_in_time) = ?', [dateStr]);
        })
        .first();

      const statusVal = String(reasonText).toLowerCase().includes('home') ? 'work_from_home' : 'present';

      if (existingRecord) {
        await db('attendance_records')
          .where('id', existingRecord.id)
          .update({
            check_in_time: reqInTime,
            check_out_time: reqOutTime,
            is_regularized: true,
            regularization_request_id: req.id,
            status: statusVal,
            updated_at: new Date(),
          });
      } else {
        await db('attendance_records').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: orgId,
          employee_id: empId,
          check_in_date: dateStr,
          check_in_time: reqInTime,
          check_out_time: reqOutTime,
          status: statusVal,
          is_regularized: true,
          regularization_request_id: req.id,
          created_at: new Date(),
          updated_at: new Date(),
        });
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
