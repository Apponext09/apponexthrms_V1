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

  /**
   * Create a shift template
   */
  async createShift(ctx: TenantContext, input: {
    shiftName: string;
    shiftCode: string;
    shiftType: string;
    startTime?: string;
    endTime?: string;
    durationHours: number;
    gracePeriodMinutes?: number;
    breakDurationMinutes?: number;
    isNightShift?: boolean;
    isFlexible?: boolean;
    flexibleStartRangeStart?: string;
    flexibleStartRangeEnd?: string;
    color?: string;
    description?: string;
    isDefault?: boolean;
  }): Promise<ShiftTemplate> {
    const isUnique = await this.shiftRepo.isCodeUnique(ctx, input.shiftCode);
    if (!isUnique) {
      throw new ValidationError(`Shift code '${input.shiftCode}' already exists`);
    }

    const shift = await this.shiftRepo.create(ctx, {
      uuid: uuidv4(),
      shift_name: input.shiftName,
      shift_code: input.shiftCode,
      shift_type: input.shiftType,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      duration_hours: input.durationHours,
      grace_period_minutes: input.gracePeriodMinutes || 0,
      break_duration_minutes: input.breakDurationMinutes || 60,
      is_night_shift: input.isNightShift || false,
      is_flexible: input.isFlexible || false,
      flexible_start_range_start: input.flexibleStartRangeStart || null,
      flexible_start_range_end: input.flexibleStartRangeEnd || null,
      color: input.color || '#3B82F6',
      description: input.description || null,
      is_default: input.isDefault || false,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SHIFT_TEMPLATE',
      entityId: shift.id,
      afterState: { shiftName: input.shiftName, shiftCode: input.shiftCode },
    });

    return shift;
  }

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
   * Get employee's current shift
   */
  async getEmployeeShift(ctx: TenantContext, employeeId: number, date?: string): Promise<EmployeeShiftAssignment | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.assignmentRepo.getAssignmentByDate(ctx, employeeId, targetDate);
  }

  /**
   * Get shifts by type
   */
  async getShiftsByType(ctx: TenantContext, shiftType: string, options?: ListQueryOptions) {
    return this.shiftRepo.getByType(ctx, shiftType, options);
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
   * Request shift swap
   */
  async requestShiftSwap(ctx: TenantContext, input: {
    requestShiftDate: string;
    requestedShiftId: number;
    swapWithEmployeeId: number;
    swapShiftDate?: string;
    swapShiftId?: number;
    reason?: string;
  }): Promise<any> {
    // Check if requesting employee has assignment on that date
    const requesting = await this.assignmentRepo.getAssignmentByDate(ctx, ctx.userId, input.requestShiftDate);
    if (!requesting) {
      throw new ValidationError('You do not have a shift assigned on the requested date');
    }

    // Check if swap employee has assignment
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
   * Approve shift swap
   */
  async approveShiftSwap(ctx: TenantContext, swapId: number): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) {
      throw new NotFoundError('Shift swap request not found');
    }

    if (swap.status !== 'pending') {
      throw new ValidationError('Only pending swap requests can be approved');
    }

    const updated = await this.swapRepo.update(ctx, swapId, {
      status: 'approved',
      approved_by: ctx.userId,
      approval_date: new Date().toISOString(),
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
   * Reject shift swap
   */
  async rejectShiftSwap(ctx: TenantContext, swapId: number): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) {
      throw new NotFoundError('Shift swap request not found');
    }

    if (swap.status !== 'pending') {
      throw new ValidationError('Only pending swap requests can be rejected');
    }

    const updated = await this.swapRepo.update(ctx, swapId, { status: 'rejected' });

    await this.auditService.log(ctx, {
      action: 'REJECT_SHIFT_SWAP',
      entityType: 'SHIFT_SWAP',
      entityId: swapId,
      afterState: { status: 'rejected' },
    });

    return updated;
  }
}
