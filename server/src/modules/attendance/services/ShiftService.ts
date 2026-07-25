import { v4 as uuidv4 } from 'uuid';
import { ShiftTemplateRepository, type ShiftTemplate } from '../repositories/ShiftTemplateRepository';
import { EmployeeShiftAssignmentRepository, type EmployeeShiftAssignment } from '../repositories/EmployeeShiftAssignmentRepository';
import { ShiftSwapRequestRepository } from '../repositories/ShiftSwapRequestRepository';
import { ShiftRotationRepository } from '../repositories/ShiftRotationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class ShiftService {
  private shiftRepo: ShiftTemplateRepository;
  private assignmentRepo: EmployeeShiftAssignmentRepository;
  private swapRepo: ShiftSwapRequestRepository;
  private rotationRepo: ShiftRotationRepository;
  private auditService: AuditService;

  constructor() {
    this.shiftRepo = new ShiftTemplateRepository();
    this.assignmentRepo = new EmployeeShiftAssignmentRepository();
    this.swapRepo = new ShiftSwapRequestRepository();
    this.rotationRepo = new ShiftRotationRepository();
    this.auditService = new AuditService();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHIFT TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new shift template
   */
  async createShift(ctx: TenantContext, input: {
    shiftName: string;
    shiftCode: string;
    shiftType: string;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
    gracePeriodMinutes?: number;
    breakDurationMinutes?: number;
    isNightShift?: boolean;
    isFlexible?: boolean;
    flexibleStartRangeStart?: string;
    flexibleStartRangeEnd?: string;
    color?: string;
    description?: string;
    rosterPattern?: any;
    isDefault?: boolean;
  }): Promise<ShiftTemplate> {
    const isUnique = await this.shiftRepo.isCodeUnique(ctx, input.shiftCode);
    if (!isUnique) {
      throw new ValidationError(`Shift code '${input.shiftCode}' already exists`);
    }

    const rosterPattern = input.rosterPattern
      ? (typeof input.rosterPattern === 'string'
          ? input.rosterPattern
          : JSON.stringify(input.rosterPattern))
      : null;

    const shift = await this.shiftRepo.create(ctx, {
      uuid: uuidv4(),
      shift_name: input.shiftName,
      shift_code: input.shiftCode,
      shift_type: input.shiftType,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      duration_hours: input.durationHours || 8,
      grace_period_minutes: input.gracePeriodMinutes || 0,
      break_duration_minutes: input.breakDurationMinutes || 60,
      is_night_shift: input.isNightShift || false,
      is_flexible: input.isFlexible || false,
      flexible_start_range_start: input.flexibleStartRangeStart || null,
      flexible_start_range_end: input.flexibleStartRangeEnd || null,
      color: input.color || '#3B82F6',
      description: input.description || null,
      roster_pattern: rosterPattern,
      is_default: input.isDefault || false,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SHIFT_TEMPLATE',
      entityId: shift.id,
      afterState: { shiftName: input.shiftName, shiftCode: input.shiftCode, shiftType: input.shiftType },
    });

    return shift;
  }

  /**
   * Update an existing shift template
   */
  async updateShift(ctx: TenantContext, shiftId: number, input: {
    shiftName?: string;
    shiftCode?: string;
    shiftType?: string;
    startTime?: string | null;
    endTime?: string | null;
    durationHours?: number;
    gracePeriodMinutes?: number;
    breakDurationMinutes?: number;
    isNightShift?: boolean;
    isFlexible?: boolean;
    flexibleStartRangeStart?: string | null;
    flexibleStartRangeEnd?: string | null;
    color?: string;
    description?: string | null;
    rosterPattern?: any | null;
    isDefault?: boolean;
    status?: 'active' | 'inactive';
  }): Promise<ShiftTemplate> {
    const existing = await this.shiftRepo.getById(ctx, shiftId);
    if (!existing) {
      throw new NotFoundError(`Shift template not found`);
    }

    // If code is changing, ensure uniqueness
    if (input.shiftCode && input.shiftCode !== existing.shift_code) {
      const isUnique = await this.shiftRepo.isCodeUnique(ctx, input.shiftCode, shiftId);
      if (!isUnique) {
        throw new ValidationError(`Shift code '${input.shiftCode}' already exists`);
      }
    }

    const rosterPattern = input.rosterPattern !== undefined
      ? (input.rosterPattern === null ? null
          : typeof input.rosterPattern === 'string'
            ? input.rosterPattern
            : JSON.stringify(input.rosterPattern))
      : undefined;

    const updateData: Partial<ShiftTemplate> = {};
    if (input.shiftName !== undefined)              updateData.shift_name = input.shiftName;
    if (input.shiftCode !== undefined)              updateData.shift_code = input.shiftCode;
    if (input.shiftType !== undefined)              updateData.shift_type = input.shiftType as any;
    if (input.startTime !== undefined)              updateData.start_time = input.startTime;
    if (input.endTime !== undefined)                updateData.end_time = input.endTime;
    if (input.durationHours !== undefined)          updateData.duration_hours = input.durationHours;
    if (input.gracePeriodMinutes !== undefined)     updateData.grace_period_minutes = input.gracePeriodMinutes;
    if (input.breakDurationMinutes !== undefined)   updateData.break_duration_minutes = input.breakDurationMinutes;
    if (input.isNightShift !== undefined)           updateData.is_night_shift = input.isNightShift;
    if (input.isFlexible !== undefined)             updateData.is_flexible = input.isFlexible;
    if (input.flexibleStartRangeStart !== undefined) updateData.flexible_start_range_start = input.flexibleStartRangeStart;
    if (input.flexibleStartRangeEnd !== undefined)  updateData.flexible_start_range_end = input.flexibleStartRangeEnd;
    if (input.color !== undefined)                  updateData.color = input.color;
    if (input.description !== undefined)            updateData.description = input.description;
    if (rosterPattern !== undefined)                updateData.roster_pattern = rosterPattern;
    if (input.isDefault !== undefined)              updateData.is_default = input.isDefault;
    if (input.status !== undefined)                 updateData.status = input.status;

    const updated = await this.shiftRepo.updateShift(ctx, shiftId, updateData);
    if (!updated) throw new NotFoundError('Shift template not found after update');

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'SHIFT_TEMPLATE',
      entityId: shiftId,
      beforeState: { shiftName: existing.shift_name, status: existing.status },
      afterState: { shiftName: input.shiftName, status: input.status },
    });

    return updated;
  }

  /**
   * Delete (soft-delete) a shift template
   */
  async deleteShift(ctx: TenantContext, shiftId: number): Promise<void> {
    const existing = await this.shiftRepo.getById(ctx, shiftId);
    if (!existing) {
      throw new NotFoundError('Shift template not found');
    }

    // Check no active assignments
    const activeAssignments = await this.assignmentRepo.getByShift(ctx, shiftId);
    if (activeAssignments.items.length > 0) {
      throw new ValidationError(
        `Cannot delete shift: ${activeAssignments.items.length} employee(s) are currently assigned to it`
      );
    }

    await this.shiftRepo.softDelete(ctx, shiftId);

    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'SHIFT_TEMPLATE',
      entityId: shiftId,
      beforeState: { shiftName: existing.shift_name },
    });
  }

  /**
   * Toggle shift status
   */
  async toggleShiftStatus(ctx: TenantContext, shiftId: number, status: 'active' | 'inactive') {
    const existing = await this.shiftRepo.getById(ctx, shiftId);
    if (!existing) throw new NotFoundError('Shift template not found');
    return this.shiftRepo.toggleStatus(ctx, shiftId, status);
  }

  /**
   * Get all shifts with employee count
   */
  async getAllShifts(ctx: TenantContext, options?: ListQueryOptions) {
    return this.shiftRepo.getShiftsWithCounts(ctx, options);
  }

  /**
   * Get active shifts
   */
  async getActiveShifts(ctx: TenantContext, options?: ListQueryOptions) {
    return this.shiftRepo.getActiveShifts(ctx, options);
  }

  /**
   * Get shift by ID
   */
  async getShift(ctx: TenantContext, shiftId: number): Promise<ShiftTemplate | null> {
    return this.shiftRepo.getById(ctx, shiftId);
  }

  /**
   * Get shifts by type
   */
  async getShiftsByType(ctx: TenantContext, shiftType: string, options?: ListQueryOptions) {
    return this.shiftRepo.getByType(ctx, shiftType, options);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ASSIGNMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assign shift to employee
   */
  async assignShift(ctx: TenantContext, input: {
    employeeId: number;
    shiftId: number;
    startDate: string;
    endDate?: string;
    rotationId?: number;
  }): Promise<EmployeeShiftAssignment> {
    // Verify shift exists
    const shift = await this.shiftRepo.getById(ctx, input.shiftId);
    if (!shift) throw new NotFoundError('Shift template not found');

    // Mark previous assignments as not current
    const previousAssignments = await this.assignmentRepo.getEmployeeAssignments(ctx, input.employeeId);
    for (const assignment of previousAssignments.items) {
      if (assignment.is_current) {
        await this.assignmentRepo.update(ctx, assignment.id, { is_current: false });
      }
    }

    const assignment = await this.assignmentRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: input.employeeId,
      shift_id: input.shiftId,
      shift_rotation_id: input.rotationId || null,
      assignment_start_date: input.startDate,
      assignment_end_date: input.endDate || null,
      is_current: true,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'ASSIGN_SHIFT',
      entityType: 'SHIFT_ASSIGNMENT',
      entityId: assignment.id,
      afterState: { employeeId: input.employeeId, shiftId: input.shiftId },
    });

    return assignment;
  }

  /**
   * Get all assignments (admin view) with employee + shift details joined
   */
  async getAllAssignments(
    ctx: TenantContext,
    options?: ListQueryOptions & { isCurrent?: boolean; shiftId?: number; search?: string }
  ) {
    return this.assignmentRepo.getAllWithJoins(ctx, options);
  }

  /**
   * Get employee's current shift
   */
  async getEmployeeShift(ctx: TenantContext, employeeId: number, date?: string): Promise<EmployeeShiftAssignment | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.assignmentRepo.getAssignmentByDate(ctx, employeeId, targetDate);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SWAP REQUESTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all swap requests (admin view) with full joins
   */
  async getAllSwapRequests(
    ctx: TenantContext,
    options?: ListQueryOptions & { status?: string; search?: string }
  ) {
    return this.swapRepo.getAllWithJoins(ctx, options);
  }

  /**
   * Request shift swap (employee-facing)
   */
  async requestShiftSwap(ctx: TenantContext, input: {
    requestShiftDate: string;
    requestedShiftId: number;
    swapWithEmployeeId: number;
    swapShiftDate?: string;
    swapShiftId?: number;
    reason?: string;
  }): Promise<any> {
    const requesting = await this.assignmentRepo.getAssignmentByDate(ctx, ctx.userId, input.requestShiftDate);
    if (!requesting) {
      throw new ValidationError('You do not have a shift assigned on the requested date');
    }

    const swapping = await this.assignmentRepo.getAssignmentByDate(
      ctx,
      input.swapWithEmployeeId,
      input.swapShiftDate || input.requestShiftDate
    );
    if (!swapping) {
      throw new ValidationError('Swap employee does not have a shift assigned on that date');
    }

    const swap = await this.swapRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: ctx.userId,
      request_shift_date: input.requestShiftDate,
      requested_shift_id: input.requestedShiftId,
      swap_with_employee_id: input.swapWithEmployeeId,
      swap_shift_date: input.swapShiftDate || input.requestShiftDate,
      swap_shift_id: input.swapShiftId || swapping.shift_id,
      reason: input.reason || null,
      status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'REQUEST_SHIFT_SWAP',
      entityType: 'SHIFT_SWAP',
      entityId: swap.id,
      afterState: { requestDate: input.requestShiftDate, swapWith: input.swapWithEmployeeId },
    });

    return swap;
  }

  /**
   * Approve shift swap (admin)
   */
  async approveShiftSwap(ctx: TenantContext, swapId: number): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) throw new NotFoundError('Shift swap request not found');
    if (swap.status !== 'pending') throw new ValidationError('Only pending swap requests can be approved');

    const updated = await this.swapRepo.update(ctx, swapId, {
      status: 'approved',
      approved_by: ctx.userId,
      approval_date: new Date().toISOString(),
      updated_by: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'APPROVE_SHIFT_SWAP',
      entityType: 'SHIFT_SWAP',
      entityId: swapId,
      afterState: { status: 'approved' },
    });

    return updated;
  }

  /**
   * Reject shift swap (admin)
   */
  async rejectShiftSwap(ctx: TenantContext, swapId: number, reason?: string): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) throw new NotFoundError('Shift swap request not found');
    if (swap.status !== 'pending') throw new ValidationError('Only pending swap requests can be rejected');

    const updated = await this.swapRepo.update(ctx, swapId, {
      status: 'rejected',
      updated_by: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'REJECT_SHIFT_SWAP',
      entityType: 'SHIFT_SWAP',
      entityId: swapId,
      afterState: { status: 'rejected', reason },
    });

    return updated;
  }
}
