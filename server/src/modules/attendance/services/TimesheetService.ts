import { v4 as uuidv4 } from 'uuid';
import { TimesheetRepository } from '../repositories/TimesheetRepository';
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class TimesheetService {
  private timesheetRepo: TimesheetRepository;
  private entryRepo: TimesheetEntryRepository;
  private auditService: AuditService;

  constructor() {
    this.timesheetRepo = new TimesheetRepository();
    this.entryRepo = new TimesheetEntryRepository();
    this.auditService = new AuditService();
  }

  /**
   * Create a timesheet
   */
  async createTimesheet(ctx: TenantContext, input: {
    employeeId: number;
    periodStart: string;
    periodEnd: string;
  }): Promise<any> {
    // Check if timesheet already exists for this period
    const existing = await this.timesheetRepo.getByPeriod(ctx, input.employeeId, input.periodStart, input.periodEnd);
    if (existing) {
      throw new ValidationError('Timesheet already exists for this period');
    }

    const timesheet = await this.timesheetRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      timesheet_period_start: input.periodStart,
      timesheet_period_end: input.periodEnd,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE_TIMESHEET',
      entityType: 'TIMESHEET',
      entityId: timesheet.id,
      afterState: { periodStart: input.periodStart, periodEnd: input.periodEnd },
    });

    return timesheet;
  }

  /**
   * Add entry to timesheet
   */
  async addEntry(ctx: TenantContext, input: {
    timesheetId: number;
    entryDate: string;
    taskName: string;
    hoursSpent: number;
    isBillable?: boolean;
    billableRate?: number;
    taskDescription?: string;
    effortCategory?: string;
    projectId?: number;
  }): Promise<any> {
    const timesheet = await this.timesheetRepo.getById(ctx, input.timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'draft') {
      throw new ValidationError('Can only add entries to draft timesheets');
    }

    if (input.hoursSpent <= 0) {
      throw new ValidationError('Hours spent must be greater than 0');
    }

    const entry = await this.entryRepo.create(ctx, {
      uuid: uuidv4(),
      timesheet_id: input.timesheetId,
      entry_date: input.entryDate,
      task_name: input.taskName,
      task_description: input.taskDescription || null,
      hours_spent: input.hoursSpent,
      is_billable: input.isBillable !== false,
      billable_rate: input.billableRate || null,
      effort_category: input.effortCategory || null,
      project_id: input.projectId || null,
      entry_status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Update timesheet totals
    await this.recalculateTimesheet(ctx, input.timesheetId);

    return entry;
  }

  /**
   * Update entry
   */
  async updateEntry(ctx: TenantContext, entryId: number, input: Partial<any>): Promise<any> {
    const entry = await this.entryRepo.getById(ctx, entryId);
    if (!entry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    const updated = await this.entryRepo.update(ctx, entryId, input);

    // Recalculate timesheet
    await this.recalculateTimesheet(ctx, entry.timesheet_id);

    return updated;
  }

  /**
   * Delete entry
   */
  async deleteEntry(ctx: TenantContext, entryId: number): Promise<void> {
    const entry = await this.entryRepo.getById(ctx, entryId);
    if (!entry) {
      throw new NotFoundError('Timesheet entry not found');
    }

    await this.entryRepo.softDelete(ctx, entryId);

    // Recalculate timesheet
    await this.recalculateTimesheet(ctx, entry.timesheet_id);
  }

  /**
   * Get timesheet
   */
  async getTimesheet(ctx: TenantContext, timesheetId: number): Promise<any | null> {
    return this.timesheetRepo.getById(ctx, timesheetId);
  }

  /**
   * Get employee timesheets
   */
  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.timesheetRepo.getByEmployee(ctx, employeeId, options);
  }

  /**
   * Get entries for timesheet
   */
  async getEntries(ctx: TenantContext, timesheetId: number): Promise<any[]> {
    return this.entryRepo.getByTimesheet(ctx, timesheetId);
  }

  /**
   * Submit timesheet
   */
  async submit(ctx: TenantContext, timesheetId: number): Promise<any> {
    const timesheet = await this.timesheetRepo.getById(ctx, timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'draft') {
      throw new ValidationError('Only draft timesheets can be submitted');
    }

    const now = new Date().toISOString();
    const updated = await this.timesheetRepo.update(ctx, timesheetId, {
      status: 'submitted',
      submitted_by: ctx.userId,
      submitted_at: now,
    });

    await this.auditService.log(ctx, {
      action: 'SUBMIT_TIMESHEET',
      entityType: 'TIMESHEET',
      entityId: timesheetId,
      afterState: { status: 'submitted' },
    });

    return updated;
  }

  /**
   * Approve timesheet
   */
  async approve(ctx: TenantContext, timesheetId: number): Promise<any> {
    const timesheet = await this.timesheetRepo.getById(ctx, timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'submitted') {
      throw new ValidationError('Only submitted timesheets can be approved');
    }

    const now = new Date().toISOString();
    const updated = await this.timesheetRepo.update(ctx, timesheetId, {
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: now,
    });

    await this.auditService.log(ctx, {
      action: 'APPROVE_TIMESHEET',
      entityType: 'TIMESHEET',
      entityId: timesheetId,
      afterState: { status: 'approved' },
    });

    return updated;
  }

  /**
   * Reject timesheet
   */
  async reject(ctx: TenantContext, timesheetId: number, reason: string): Promise<any> {
    const timesheet = await this.timesheetRepo.getById(ctx, timesheetId);
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'submitted') {
      throw new ValidationError('Only submitted timesheets can be rejected');
    }

    const updated = await this.timesheetRepo.update(ctx, timesheetId, {
      status: 'rejected',
      rejection_reason: reason,
    });

    await this.auditService.log(ctx, {
      action: 'REJECT_TIMESHEET',
      entityType: 'TIMESHEET',
      entityId: timesheetId,
      afterState: { status: 'rejected' },
    });

    return updated;
  }

  /**
   * Recalculate timesheet totals
   */
  private async recalculateTimesheet(ctx: TenantContext, timesheetId: number): Promise<void> {
    const total = await this.entryRepo.getTotalHours(ctx, timesheetId);
    const billable = await this.entryRepo.getBillableHours(ctx, timesheetId);

    await this.timesheetRepo.update(ctx, timesheetId, {
      total_hours: total,
      billable_hours: billable,
      non_billable_hours: total - billable,
    });
  }
}
