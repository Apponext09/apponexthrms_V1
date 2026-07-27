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
    const isUnique = await this.shiftRepo.isCodeUnique(ctx, input.shiftCode, input.shiftType);
    if (!isUnique) {
      throw new ValidationError(`Shift code '${input.shiftCode}' already exists`);
    }

    const rawRoster = input.rosterPattern ?? (input as any).roster_pattern ?? (
      (input as any).daysIncluded || (input as any).excludedWorkingPattern
        ? {
            daysIncluded: (input as any).daysIncluded,
            excludedWorkingPattern: (input as any).excludedWorkingPattern,
            globalAttendanceRules: (input as any).globalAttendanceRules,
            behaviorToggles: (input as any).behaviorToggles,
            totalTime: (input as any).totalTime,
            logBreakTime: (input as any).logBreakTime,
            actualHours: (input as any).actualHours,
          }
        : null
    );

    const rosterPattern = rawRoster
      ? (typeof rawRoster === 'string'
          ? rawRoster
          : JSON.stringify(rawRoster))
      : null;

    const isRosterType = input.shiftType === 'roster';
    let shiftName = input.shiftName.trim();
    if (isRosterType && !shiftName.toLowerCase().includes('roster')) {
      shiftName = `${shiftName} (Roster)`;
    }

    const shift = await this.shiftRepo.create(ctx, {
      uuid: uuidv4(),
      shift_name: shiftName,
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
      description: input.description || (input as any).desc || null,
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
      const targetType = input.shiftType || existing.shift_type;
      const isUnique = await this.shiftRepo.isCodeUnique(ctx, input.shiftCode, targetType, shiftId);
      if (!isUnique) {
        throw new ValidationError(`Shift code '${input.shiftCode}' already exists`);
      }
    }

    const rawRoster = input.rosterPattern !== undefined
      ? input.rosterPattern
      : ((input as any).roster_pattern !== undefined
          ? (input as any).roster_pattern
          : ((input as any).daysIncluded || (input as any).excludedWorkingPattern
              ? {
                  daysIncluded: (input as any).daysIncluded,
                  excludedWorkingPattern: (input as any).excludedWorkingPattern,
                  globalAttendanceRules: (input as any).globalAttendanceRules,
                  behaviorToggles: (input as any).behaviorToggles,
                  totalTime: (input as any).totalTime,
                  logBreakTime: (input as any).logBreakTime,
                  actualHours: (input as any).actualHours,
                }
              : undefined));

    const rosterPattern = rawRoster !== undefined
      ? (rawRoster === null
          ? null
          : typeof rawRoster === 'string'
            ? rawRoster
            : JSON.stringify(rawRoster))
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
    employeeId?: number;
    employee_id?: number;
    employeeIds?: number[];
    shiftId?: number;
    shift_id?: number;
    startDate?: string;
    assignmentStartDate?: string;
    assignment_start_date?: string;
    endDate?: string;
    effectiveUntil?: string;
    assignmentEndDate?: string;
    assignment_end_date?: string;
    rotationId?: number;
    moveFromDate?: string;
  }): Promise<any> {
    const empIds: number[] = input.employeeIds && Array.isArray(input.employeeIds) && input.employeeIds.length > 0
      ? input.employeeIds
      : [input.employeeId || input.employee_id].filter((id): id is number => typeof id === 'number' && !isNaN(id));

    if (empIds.length === 0) {
      throw new ValidationError('Employee ID is required for shift assignment');
    }

    const targetShiftId = input.shiftId || input.shift_id;
    if (!targetShiftId) {
      throw new ValidationError('Shift ID is required for shift assignment');
    }

    const startDate = input.startDate || input.assignmentStartDate || input.assignment_start_date || new Date().toISOString().split('T')[0];
    const endDate = input.endDate || input.effectiveUntil || input.assignmentEndDate || input.assignment_end_date || null;

    // Verify shift exists
    const shift = await this.shiftRepo.getById(ctx, targetShiftId);
    if (!shift) throw new NotFoundError('Shift template not found');

    const createdAssignments: EmployeeShiftAssignment[] = [];

    for (const empId of empIds) {
      // Only invalidate previous assignments if they overlap exactly for a single-day roster assignment,
      // or if it's an open-ended/multi-day assignment, invalidate them to prevent duplicates.
      const previousAssignments = await this.assignmentRepo.getEmployeeAssignments(ctx, empId);
      for (const assignment of previousAssignments.items) {
        if (assignment.is_current) {
          let overlaps = false;
          const oldStart = assignment.assignment_start_date ? String(assignment.assignment_start_date).slice(0, 10) : null;
          const oldEnd = assignment.assignment_end_date ? String(assignment.assignment_end_date).slice(0, 10) : null;
          const newStart = startDate ? String(startDate).slice(0, 10) : null;
          const newEnd = endDate ? String(endDate).slice(0, 10) : null;
          
          if (input.moveFromDate) {
            const moveDate = String(input.moveFromDate).slice(0, 10);
            if (oldStart === moveDate && oldEnd === moveDate) {
              overlaps = true;
            }
          }

          if (newStart && newStart === newEnd) {
            // It's a single day assignment (e.g. roster drag and drop)
            if (oldStart === newStart && oldEnd === newEnd) {
              overlaps = true;
            }
          } else {
            // For ongoing general assignments, invalidate previous active ones
            overlaps = true;
          }

          if (overlaps) {
            await this.assignmentRepo.update(ctx, assignment.id, { is_current: false });
          }
        }
      }

      const assignment = await this.assignmentRepo.create(ctx, {
        uuid: uuidv4(),
        employee_id: empId,
        shift_id: targetShiftId,
        shift_rotation_id: input.rotationId || null,
        assignment_start_date: startDate,
        assignment_end_date: endDate,
        is_current: true,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

      await this.auditService.log(ctx, {
        action: 'ASSIGN_SHIFT',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: assignment.id,
        afterState: { employeeId: empId, shiftId: targetShiftId },
      });

      createdAssignments.push(assignment);
    }

    return createdAssignments.length === 1 ? createdAssignments[0] : createdAssignments;
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
  async getEmployeeShift(ctx: TenantContext, employeeId: number, date?: string): Promise<any | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.assignmentRepo.getAssignmentByDate(ctx, employeeId, targetDate);
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(ctx: TenantContext, assignmentId: number): Promise<boolean> {
    await this.assignmentRepo.update(ctx, assignmentId, {
      is_current: false,
      deleted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    await this.auditService.log(ctx, {
      action: 'DELETE_SHIFT_ASSIGNMENT',
      entityType: 'SHIFT_ASSIGNMENT',
      entityId: assignmentId,
      afterState: { deleted: true },
    });

    return true;
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
  async requestShiftSwap(ctx: TenantContext, requesterEmployeeId: number, input: {
    requestShiftDate: string;
    requestedShiftId: number;
    swapWithEmployeeId: number;
    swapShiftDate?: string;
    swapShiftId?: number;
    reason?: string;
  }): Promise<any> {
    let requesting = await this.assignmentRepo.getAssignmentByDate(ctx, requesterEmployeeId, input.requestShiftDate);
    if (!requesting) {
      const defaultShift = await this.shiftRepo.getDefaultShift(ctx);
      if (defaultShift) {
        const [year, month, day] = input.requestShiftDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const isWorking = this.isWorkingDay(dateObj, defaultShift.rosterPattern);
        if (isWorking) {
          requesting = {
            shiftId: defaultShift.id,
            shiftName: defaultShift.shiftName,
            shiftCode: defaultShift.shiftCode,
          };
        }
      }
    }
    if (!requesting) {
      throw new ValidationError('You do not have a shift assigned on the requested date');
    }

    let swapping = await this.assignmentRepo.getAssignmentByDate(
      ctx,
      input.swapWithEmployeeId,
      input.swapShiftDate || input.requestShiftDate
    );
    if (!swapping) {
      const defaultShift = await this.shiftRepo.getDefaultShift(ctx);
      if (defaultShift) {
        const targetDate = input.swapShiftDate || input.requestShiftDate;
        const [year, month, day] = targetDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const isWorking = this.isWorkingDay(dateObj, defaultShift.rosterPattern);
        if (isWorking) {
          swapping = {
            shiftId: defaultShift.id,
            shiftName: defaultShift.shiftName,
            shiftCode: defaultShift.shiftCode,
          };
        }
      }
    }
    if (!swapping) {
      throw new ValidationError('Swap employee does not have a shift assigned on that date');
    }

    const swap = await this.swapRepo.create(ctx, {
      uuid: uuidv4(),
      employee_id: requesterEmployeeId,
      request_shift_date: input.requestShiftDate,
      requested_shift_id: input.requestedShiftId,
      swap_with_employee_id: input.swapWithEmployeeId,
      swap_shift_date: input.swapShiftDate || input.requestShiftDate,
      swap_shift_id: input.swapShiftId || swapping.shiftId,
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

  /**
   * Get employee shifts expanded day-by-day in a range
   */
  async getEmployeeShiftsInRange(
    ctx: TenantContext,
    employeeId: number,
    fromDate: string,
    toDate: string
  ): Promise<any[]> {
    const assignments = await this.assignmentRepo.db('employee_shift_assignments')
      .where('employee_shift_assignments.organization_id', ctx.organizationId)
      .whereNull('employee_shift_assignments.deleted_at')
      .join('shift_templates as st', 'st.id', 'employee_shift_assignments.shift_id')
      .where('employee_shift_assignments.employee_id', employeeId)
      .where('employee_shift_assignments.assignment_start_date', '<=', toDate)
      .where((q) =>
        q.whereNull('employee_shift_assignments.assignment_end_date')
          .orWhere('employee_shift_assignments.assignment_end_date', '>=', fromDate)
      )
      .select([
        'employee_shift_assignments.*',
        'st.shift_name',
        'st.shift_code',
        'st.start_time',
        'st.end_time',
        'st.duration_hours',
        'st.is_night_shift',
        'st.is_flexible',
        'st.color',
        'st.description',
        'st.roster_pattern',
        'st.grace_period_minutes',
        'st.break_duration_minutes',
        'st.flexible_start_range_start',
        'st.flexible_start_range_end'
      ]);

    const result: any[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Find covering assignment
      const activeAssign = assignments.find(a => {
        const aStart = this.formatDate(a.assignmentStartDate);
        const aEnd = a.assignmentEndDate ? this.formatDate(a.assignmentEndDate) : null;
        return dateStr >= aStart && (aEnd === null || dateStr <= aEnd);
      });

      if (activeAssign) {
        const isWorking = this.isWorkingDay(d, activeAssign.rosterPattern);
        result.push({
          date: dateStr,
          isOffDay: !isWorking,
          shiftId: activeAssign.shiftId,
          shiftName: activeAssign.shiftName,
          shiftCode: activeAssign.shiftCode,
          startTime: activeAssign.startTime,
          endTime: activeAssign.endTime,
          color: activeAssign.color,
          isNightShift: Boolean(activeAssign.isNightShift),
          isFlexible: Boolean(activeAssign.isFlexible),
          breakDurationMinutes: activeAssign.breakDurationMinutes,
          gracePeriodMinutes: activeAssign.gracePeriodMinutes,
          flexibleStartRangeStart: activeAssign.flexibleStartRangeStart,
          flexibleStartRangeEnd: activeAssign.flexibleStartRangeEnd,
          description: activeAssign.description
        });
      } else {
        result.push({
          date: dateStr,
          isOffDay: true,
          shiftId: null,
          shiftName: 'No Shift Assigned',
          shiftCode: 'OFF',
          startTime: null,
          endTime: null,
          color: '#94A3B8',
          isNightShift: false,
          isFlexible: false,
          breakDurationMinutes: 0,
          gracePeriodMinutes: 0,
          flexibleStartRangeStart: null,
          flexibleStartRangeEnd: null,
          description: 'No active shift assignment for this date'
        });
      }
    }

    return result;
  }

  /**
   * Helper to check if a date is a working day under a shift template's roster pattern
   */
  isWorkingDay(date: Date, rosterPattern: any): boolean {
    if (!rosterPattern) {
      const day = date.getDay();
      return day >= 1 && day <= 5; // Mon-Fri
    }

    const pattern = typeof rosterPattern === 'string' ? JSON.parse(rosterPattern) : rosterPattern;
    const daysIncluded = pattern.daysIncluded || ['mon', 'tue', 'wed', 'thu', 'fri'];
    
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayName = daysMap[date.getDay()];

    if (daysIncluded.includes(dayName)) {
      return true;
    }

    if (pattern.excludedWorkingPattern && pattern.excludedWorkingPattern[dayName]) {
      const dayRule = pattern.excludedWorkingPattern[dayName];
      if (dayName === 'sat') {
        const dayOfMonth = date.getDate();
        const weekIndex = Math.ceil(dayOfMonth / 7);
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const isLast = (dayOfMonth + 7) > lastDayOfMonth;

        if (weekIndex === 1 && dayRule.first) return true;
        if (weekIndex === 2 && dayRule.second) return true;
        if (weekIndex === 3 && dayRule.third) return true;
        if (weekIndex === 4 && dayRule.fourth) return true;
        if (weekIndex === 5 && dayRule.fifth) return true;
        if (isLast && dayRule.last) return true;
      }
    }

    return false;
  }

  /**
   * Get employee roster pattern info
   */
  async getEmployeeRosterPatternInfo(ctx: TenantContext, employeeId: number): Promise<any> {
    const assignment = await this.assignmentRepo.getCurrentAssignment(ctx, employeeId);
    if (!assignment) {
      return null;
    }

    const shift = await this.shiftRepo.getById(ctx, assignment.shiftId);
    if (!shift || !shift.rosterPattern) {
      return null;
    }

    const rosterPattern = typeof shift.rosterPattern === 'string'
      ? JSON.parse(shift.rosterPattern)
      : shift.rosterPattern;

    const today = new Date();
    const isTodayWorking = this.isWorkingDay(today, rosterPattern);

    let nextChangeDate: string | null = null;
    const testDate = new Date(today);
    
    for (let i = 1; i <= 30; i++) {
      testDate.setDate(testDate.getDate() + 1);
      const isWorking = this.isWorkingDay(testDate, rosterPattern);
      if (isWorking !== isTodayWorking) {
        nextChangeDate = testDate.toISOString().split('T')[0];
        break;
      }
    }

    const dayOfMonth = today.getDate();
    const weekIndex = Math.ceil(dayOfMonth / 7);

    return {
      rosterPattern,
      shiftName: shift.shiftName,
      shiftCode: shift.shiftCode,
      color: shift.color,
      currentWeek: weekIndex,
      currentStatus: isTodayWorking ? 'working' : 'off',
      nextChangeDate,
    };
  }

  /**
   * Safe utility to format date object/string as YYYY-MM-DD local
   */
  formatDate(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        return dateVal.substring(0, 10);
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().substring(0, 10);
    }
    
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  }
}
