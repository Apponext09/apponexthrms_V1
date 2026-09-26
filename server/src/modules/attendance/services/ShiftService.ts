import { v4 as uuidv4 } from "uuid";
import {
  ShiftTemplateRepository,
  type ShiftTemplate,
} from "../repositories/ShiftTemplateRepository";
import {
  EmployeeShiftAssignmentRepository,
  type EmployeeShiftAssignment,
} from "../repositories/EmployeeShiftAssignmentRepository";
import { ShiftSwapRequestRepository } from "../repositories/ShiftSwapRequestRepository";
import { ShiftRotationRepository } from "../repositories/ShiftRotationRepository";
import { AuditService } from "../../audit/audit.service";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../../common/errors/index";
import { withTransaction } from "../../../db/knex";
import type { Knex } from "knex";
import type { TenantContext, ListQueryOptions } from "../../../db/types";

export class ShiftService {
  private shiftRepo: ShiftTemplateRepository;
  private assignmentRepo: EmployeeShiftAssignmentRepository;
  private swapRepo: ShiftSwapRequestRepository;
  private rotationRepo: ShiftRotationRepository;
  private auditService: AuditService;

  /**
   * BaseRepository.getById() reads by raw SQL and does not exclude
   * soft-deleted rows (that filter only lives in list()). Shift lookups
   * route through getById in several places, so treat a soft-deleted
   * shift template as not-found here rather than widening the shared
   * base class for every other module that relies on its current behavior.
   */
  private isSoftDeleted(record: any): boolean {
    return !!(record && (record.deletedAt || record.deleted_at));
  }

  /**
   * Validate shift time/duration fields shared by createShift and updateShift.
   * `effective*` values are the fully-resolved fields (input merged over any
   * existing record, for updates) so partial updates are validated correctly.
   */
  /** shift_templates.shift_type is an ENUM — an out-of-list value is a raw DB "Data truncated" 500. */
  private static readonly SHIFT_TYPES = [
    "fixed",
    "flexible",
    "night",
    "roster",
  ];

  private validateShiftFields(effective: {
    isFlexible?: boolean;
    isNightShift?: boolean;
    shiftType?: string;
    startTime?: string | null;
    endTime?: string | null;
    durationHours?: number;
    gracePeriodMinutes?: number;
    breakDurationMinutes?: number;
  }): void {
    const { isFlexible, isNightShift } = effective;

    if (
      effective.shiftType !== undefined &&
      !ShiftService.SHIFT_TYPES.includes(effective.shiftType)
    ) {
      throw new ValidationError(
        `Invalid shift type '${effective.shiftType}'. Must be one of: ${ShiftService.SHIFT_TYPES.join(", ")}.`,
      );
    }
    // Times may arrive as "HH:MM" (client input) or "HH:MM:SS" (an existing
    // DB record's value used as a fallback for a partial update) — normalize
    // both to "HH:MM" before comparing, or "10:00" vs "10:00:00" never match.
    const startTime = effective.startTime
      ? effective.startTime.slice(0, 5)
      : effective.startTime;
    const endTime = effective.endTime
      ? effective.endTime.slice(0, 5)
      : effective.endTime;

    if (!isFlexible && startTime && endTime) {
      if (startTime === endTime) {
        throw new ValidationError(
          "Shift end time must be different from the start time.",
        );
      }
      if (endTime < startTime && !isNightShift) {
        throw new ValidationError(
          "Shift end time is before the start time. If this shift crosses midnight, mark it as a night shift; otherwise correct the times.",
        );
      }
    }

    if (effective.durationHours !== undefined) {
      if (
        !Number.isFinite(effective.durationHours) ||
        effective.durationHours <= 0 ||
        effective.durationHours > 24
      ) {
        throw new ValidationError(
          "Duration must be a number greater than 0 and no more than 24 hours.",
        );
      }
    }
    if (effective.gracePeriodMinutes !== undefined) {
      if (
        !Number.isFinite(effective.gracePeriodMinutes) ||
        effective.gracePeriodMinutes < 0 ||
        effective.gracePeriodMinutes > 180
      ) {
        throw new ValidationError(
          "Grace period must be between 0 and 180 minutes.",
        );
      }
    }
    if (effective.breakDurationMinutes !== undefined) {
      if (
        !Number.isFinite(effective.breakDurationMinutes) ||
        effective.breakDurationMinutes < 0 ||
        effective.breakDurationMinutes > 480
      ) {
        throw new ValidationError(
          "Break duration must be between 0 and 480 minutes.",
        );
      }
    }
  }

  /**
   * Reject an exact duplicate active shift (same category + identical
   * start/end times) within the organization. Scoped to an exact match
   * rather than general interval overlap — two shifts genuinely covering
   * different day patterns can legitimately share identical hours, so a
   * broader overlap rule would need a product decision this fix doesn't
   * make; an exact duplicate, however, is never useful and is what
   * TC-SHF-03 / S-2 specifically flagged.
   */
  private async assertNoDuplicateTimeRange(
    ctx: TenantContext,
    params: {
      shiftType?: string;
      startTime?: string | null;
      endTime?: string | null;
      excludeShiftId?: number;
    },
  ): Promise<void> {
    const { shiftType, excludeShiftId } = params;
    if (!params.startTime || !params.endTime) return;
    const startTime = params.startTime.slice(0, 5);
    const endTime = params.endTime.slice(0, 5);

    const isRoster = shiftType === "roster";
    const { items } = await this.shiftRepo.getActiveShifts(ctx, {
      pageSize: 500,
    });
    const duplicate = items.find((s: any) => {
      if (excludeShiftId && s.id === excludeShiftId) return false;
      const sStart = (s.startTime || s.start_time || "").slice(0, 5);
      const sEnd = (s.endTime || s.end_time || "").slice(0, 5);
      const sIsRoster = (s.shiftType || s.shift_type) === "roster";
      return sIsRoster === isRoster && sStart === startTime && sEnd === endTime;
    }) as any;

    if (duplicate) {
      const name = duplicate.shiftName || duplicate.shift_name;
      throw new ConflictError(
        `A shift named "${name}" already uses ${startTime}–${endTime}. Choose a different time range or edit the existing shift instead.`,
      );
    }
  }

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
  async createShift(
    ctx: TenantContext,
    input: {
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
      attendanceRules?: any;
      timezone?: string;
      isDefault?: boolean;
    },
  ): Promise<ShiftTemplate> {
    const isUnique = await this.shiftRepo.isCodeUnique(
      ctx,
      input.shiftCode,
      input.shiftType,
    );
    if (!isUnique) {
      throw new ConflictError(`Shift code '${input.shiftCode}' already exists`);
    }

    this.validateShiftFields({
      isFlexible: input.isFlexible,
      isNightShift: input.isNightShift,
      shiftType: input.shiftType,
      startTime: input.startTime,
      endTime: input.endTime,
      durationHours: input.durationHours,
      gracePeriodMinutes: input.gracePeriodMinutes,
      breakDurationMinutes: input.breakDurationMinutes,
    });

    await this.assertNoDuplicateTimeRange(ctx, {
      shiftType: input.shiftType,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    const rawRoster =
      input.rosterPattern ??
      (input as any).roster_pattern ??
      ((input as any).daysIncluded || (input as any).excludedWorkingPattern
        ? {
            daysIncluded: (input as any).daysIncluded,
            excludedWorkingPattern: (input as any).excludedWorkingPattern,
            globalAttendanceRules: (input as any).globalAttendanceRules,
            behaviorToggles: (input as any).behaviorToggles,
            totalTime: (input as any).totalTime,
            logBreakTime: (input as any).logBreakTime,
            actualHours: (input as any).actualHours,
          }
        : null);

    const rosterPattern = rawRoster
      ? typeof rawRoster === "string"
        ? rawRoster
        : JSON.stringify(rawRoster)
      : null;
    const attendanceRulesInput = input.attendanceRules ??
      (input as any).attendance_rules ?? {
        globalAttendanceRules:
          (input as any).globalAttendanceRules ??
          rawRoster?.globalAttendanceRules ??
          {},
        behaviorToggles:
          (input as any).behaviorToggles ?? rawRoster?.behaviorToggles ?? {},
      };

    const isRosterType = input.shiftType === "roster";
    let shiftName = input.shiftName.trim();
    if (isRosterType && !shiftName.toLowerCase().includes("roster")) {
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
      color: input.color || "#3B82F6",
      description: input.description || (input as any).desc || null,
      roster_pattern: rosterPattern,
      attendance_rules: JSON.stringify(attendanceRulesInput),
      attendance_rules_version: 1,
      timezone: input.timezone || (input as any).timezone || null,
      is_default: input.isDefault || false,
      status: "active",
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: "CREATE",
      entityType: "SHIFT_TEMPLATE",
      entityId: shift.id,
      afterState: {
        shiftName: input.shiftName,
        shiftCode: input.shiftCode,
        shiftType: input.shiftType,
      },
    });

    return shift;
  }

  /**
   * Update an existing shift template
   */
  async updateShift(
    ctx: TenantContext,
    shiftId: number,
    input: {
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
      attendanceRules?: any | null;
      timezone?: string | null;
      isDefault?: boolean;
      status?: "active" | "inactive";
    },
  ): Promise<ShiftTemplate> {
    const existing = await this.shiftRepo.getById(ctx, shiftId);
    if (!existing || this.isSoftDeleted(existing)) {
      throw new NotFoundError(`Shift template not found`);
    }

    // If code is changing, ensure uniqueness
    if (input.shiftCode && input.shiftCode !== existing.shift_code) {
      const targetType = input.shiftType || existing.shift_type;
      const isUnique = await this.shiftRepo.isCodeUnique(
        ctx,
        input.shiftCode,
        targetType,
        shiftId,
      );
      if (!isUnique) {
        throw new ConflictError(
          `Shift code '${input.shiftCode}' already exists`,
        );
      }
    }

    const existingAny = existing as any;
    const effectiveShiftType =
      input.shiftType !== undefined
        ? input.shiftType
        : (existingAny.shiftType ?? existingAny.shift_type);
    const effectiveStartTime =
      input.startTime !== undefined
        ? input.startTime
        : (existingAny.startTime ?? existingAny.start_time);
    const effectiveEndTime =
      input.endTime !== undefined
        ? input.endTime
        : (existingAny.endTime ?? existingAny.end_time);

    this.validateShiftFields({
      isFlexible:
        input.isFlexible !== undefined
          ? input.isFlexible
          : (existingAny.isFlexible ?? existingAny.is_flexible),
      isNightShift:
        input.isNightShift !== undefined
          ? input.isNightShift
          : (existingAny.isNightShift ?? existingAny.is_night_shift),
      shiftType: input.shiftType,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      durationHours: input.durationHours,
      gracePeriodMinutes: input.gracePeriodMinutes,
      breakDurationMinutes: input.breakDurationMinutes,
    });

    // Only re-check for a duplicate time range if the times (or category)
    // actually changed — an unrelated field edit shouldn't be blocked by a
    // shift that has coexisted with this one all along.
    if (
      input.startTime !== undefined ||
      input.endTime !== undefined ||
      input.shiftType !== undefined
    ) {
      await this.assertNoDuplicateTimeRange(ctx, {
        shiftType: effectiveShiftType,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        excludeShiftId: shiftId,
      });
    }

    const rawRoster =
      input.rosterPattern !== undefined
        ? input.rosterPattern
        : (input as any).roster_pattern !== undefined
          ? (input as any).roster_pattern
          : (input as any).daysIncluded || (input as any).excludedWorkingPattern
            ? {
                daysIncluded: (input as any).daysIncluded,
                excludedWorkingPattern: (input as any).excludedWorkingPattern,
                globalAttendanceRules: (input as any).globalAttendanceRules,
                behaviorToggles: (input as any).behaviorToggles,
                totalTime: (input as any).totalTime,
                logBreakTime: (input as any).logBreakTime,
                actualHours: (input as any).actualHours,
              }
            : undefined;

    const rosterPattern =
      rawRoster !== undefined
        ? rawRoster === null
          ? null
          : typeof rawRoster === "string"
            ? rawRoster
            : JSON.stringify(rawRoster)
        : undefined;

    const attendanceRulesRaw =
      input.attendanceRules !== undefined
        ? input.attendanceRules
        : (input as any).attendance_rules !== undefined
          ? (input as any).attendance_rules
          : (input as any).globalAttendanceRules ||
              (input as any).behaviorToggles
            ? {
                globalAttendanceRules:
                  (input as any).globalAttendanceRules || {},
                behaviorToggles: (input as any).behaviorToggles || {},
              }
            : rawRoster !== undefined && rawRoster !== null
              ? {
                  globalAttendanceRules: rawRoster.globalAttendanceRules || {},
                  behaviorToggles: rawRoster.behaviorToggles || {},
                }
              : undefined;

    const updateData: Partial<ShiftTemplate> = {};
    if (input.shiftName !== undefined) updateData.shift_name = input.shiftName;
    if (input.shiftCode !== undefined) updateData.shift_code = input.shiftCode;
    if (input.shiftType !== undefined)
      updateData.shift_type = input.shiftType as any;
    if (input.startTime !== undefined) updateData.start_time = input.startTime;
    if (input.endTime !== undefined) updateData.end_time = input.endTime;
    if (input.durationHours !== undefined)
      updateData.duration_hours = input.durationHours;
    if (input.gracePeriodMinutes !== undefined)
      updateData.grace_period_minutes = input.gracePeriodMinutes;
    if (input.breakDurationMinutes !== undefined)
      updateData.break_duration_minutes = input.breakDurationMinutes;
    if (input.isNightShift !== undefined)
      updateData.is_night_shift = input.isNightShift;
    if (input.isFlexible !== undefined)
      updateData.is_flexible = input.isFlexible;
    if (input.flexibleStartRangeStart !== undefined)
      updateData.flexible_start_range_start = input.flexibleStartRangeStart;
    if (input.flexibleStartRangeEnd !== undefined)
      updateData.flexible_start_range_end = input.flexibleStartRangeEnd;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (rosterPattern !== undefined) updateData.roster_pattern = rosterPattern;
    if (attendanceRulesRaw !== undefined) {
      (updateData as any).attendance_rules =
        attendanceRulesRaw === null ? null : JSON.stringify(attendanceRulesRaw);
      (updateData as any).attendance_rules_version = 1;
    }
    if (input.timezone !== undefined)
      (updateData as any).timezone = input.timezone;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await this.shiftRepo.updateShift(ctx, shiftId, updateData);
    if (!updated)
      throw new NotFoundError("Shift template not found after update");

    await this.auditService.log(ctx, {
      action: "UPDATE",
      entityType: "SHIFT_TEMPLATE",
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
    if (!existing || this.isSoftDeleted(existing)) {
      throw new NotFoundError("Shift template not found");
    }

    // Check no active assignments
    const activeAssignments = await this.assignmentRepo.getByShift(
      ctx,
      shiftId,
    );
    if (activeAssignments.items.length > 0) {
      throw new ConflictError(
        `Cannot delete shift: ${activeAssignments.items.length} employee(s) are currently assigned to it. ` +
          `Reassign them or mark the shift Inactive instead.`,
      );
    }

    await this.shiftRepo.delete(ctx, shiftId);

    await this.auditService.log(ctx, {
      action: "DELETE",
      entityType: "SHIFT_TEMPLATE",
      entityId: shiftId,
      beforeState: { shiftName: existing.shift_name },
    });
  }

  /**
   * Toggle shift status
   */
  async toggleShiftStatus(
    ctx: TenantContext,
    shiftId: number,
    status: "active" | "inactive",
  ) {
    const existing = await this.shiftRepo.getById(ctx, shiftId);
    if (!existing || this.isSoftDeleted(existing))
      throw new NotFoundError("Shift template not found");
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
  async getShift(
    ctx: TenantContext,
    shiftId: number,
  ): Promise<ShiftTemplate | null> {
    const shift = await this.shiftRepo.getById(ctx, shiftId);
    return shift && !this.isSoftDeleted(shift) ? shift : null;
  }

  /**
   * Get shifts by type
   */
  async getShiftsByType(
    ctx: TenantContext,
    shiftType: string,
    options?: ListQueryOptions,
  ) {
    return this.shiftRepo.getByType(ctx, shiftType, options);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ASSIGNMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Assign shift to employee
   */
  async assignShift(
    ctx: TenantContext,
    input: {
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
      sourceAssignmentId?: number;
      confirmReassignment?: boolean;
      confirm_reassignment?: boolean;
    },
  ): Promise<any> {
    const empIds: number[] =
      input.employeeIds &&
      Array.isArray(input.employeeIds) &&
      input.employeeIds.length > 0
        ? input.employeeIds
        : [input.employeeId || input.employee_id].filter(
            (id): id is number => typeof id === "number" && !isNaN(id),
          );

    if (empIds.length === 0) {
      throw new ValidationError("Employee ID is required for shift assignment");
    }

    const targetShiftId = input.shiftId || input.shift_id;
    if (!targetShiftId) {
      throw new ValidationError("Shift ID is required for shift assignment");
    }

    const startDate =
      input.startDate ||
      input.assignmentStartDate ||
      input.assignment_start_date ||
      new Date().toISOString().split("T")[0];
    const endDate =
      input.endDate ||
      input.effectiveUntil ||
      input.assignmentEndDate ||
      input.assignment_end_date ||
      null;

    // Verify shift exists
    const shift = await this.shiftRepo.getById(ctx, targetShiftId);
    if (!shift || this.isSoftDeleted(shift))
      throw new NotFoundError("Shift template not found");

    const toYMD = (d: any) => {
      if (!d) return null;
      if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d))
        return d.slice(0, 10);
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      return String(d).slice(0, 10);
    };

    // ── Detection pass: work out which currently-active assignments this
    // call would end, without mutating anything yet, so an unconfirmed
    // reassignment can be rejected before any employee's shift changes.
    const overlapsByEmployee = new Map<number, any[]>();
    for (const empId of empIds) {
      const previousAssignments =
        await this.assignmentRepo.getEmployeeAssignments(ctx, empId);
      const toEnd: any[] = [];

      for (const assignment of previousAssignments.items as any[]) {
        // Knex's global postProcessResponse camelCases every non-raw query
        // result, so a plain list() result carries isCurrent/assignmentStartDate,
        // not is_current/assignment_start_date — fall back to snake_case only
        // for safety.
        const isCurrent = assignment.isCurrent ?? assignment.is_current;
        if (!isCurrent) continue;

        let overlaps = false;
        const oldStart = toYMD(
          assignment.assignmentStartDate ?? assignment.assignment_start_date,
        );
        const oldEnd = toYMD(
          assignment.assignmentEndDate ?? assignment.assignment_end_date,
        );
        const newStart = toYMD(startDate);
        const newEnd = toYMD(endDate);

        if (
          input.sourceAssignmentId &&
          assignment.id === input.sourceAssignmentId
        ) {
          overlaps = true;
        } else if (input.moveFromDate) {
          const moveDate = toYMD(input.moveFromDate);
          if (oldStart === moveDate && oldEnd === moveDate) {
            overlaps = true;
          }
        }

        if (!overlaps) {
          if (newStart && newStart === newEnd) {
            // It's a single day assignment (e.g. roster drag and drop)
            if (oldStart === newStart && oldEnd === newEnd) {
              overlaps = true;
            }
          } else {
            // For ongoing general assignments, invalidate previous active ones
            overlaps = true;
          }
        }

        if (overlaps) toEnd.push(assignment);
      }

      overlapsByEmployee.set(empId, toEnd);
    }

    // sourceAssignmentId / moveFromDate moves are the assignment's own
    // continuation (e.g. dragging a roster tile to a new date), not a
    // reassignment away from a different shift — never worth a confirmation
    // prompt even though they technically "end" the prior row.
    const isSelfMove = Boolean(input.sourceAssignmentId || input.moveFromDate);
    const conflicts = isSelfMove
      ? []
      : empIds.flatMap((empId) =>
          (overlapsByEmployee.get(empId) || []).map((a) => ({
            employeeId: empId,
            assignmentId: a.id,
            previousShiftId: a.shift_id,
            assignmentStartDate: a.assignment_start_date,
            assignmentEndDate: a.assignment_end_date,
          })),
        );

    if (
      conflicts.length > 0 &&
      !(input.confirmReassignment || input.confirm_reassignment)
    ) {
      throw new ConflictError(
        `${conflicts.length} selected employee(s) already have an active shift assignment that this action would end. Confirm to proceed.`,
        { conflicts },
      );
    }

    // ── Mutation pass: end the assignments identified above, then create
    // the new one, per employee.
    const createdAssignments: EmployeeShiftAssignment[] = [];

    for (const empId of empIds) {
      for (const assignment of overlapsByEmployee.get(empId) || []) {
        await this.assignmentRepo.update(ctx, assignment.id, {
          is_current: false,
        });
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
        action: "ASSIGN_SHIFT",
        entityType: "SHIFT_ASSIGNMENT",
        entityId: assignment.id,
        afterState: { employeeId: empId, shiftId: targetShiftId },
      });

      createdAssignments.push(assignment);
    }

    return createdAssignments.length === 1
      ? createdAssignments[0]
      : createdAssignments;
  }

  /**
   * Get all assignments (admin view) with employee + shift details joined
   */
  async getAllAssignments(
    ctx: TenantContext,
    options?: ListQueryOptions & {
      isCurrent?: boolean;
      shiftId?: number;
      search?: string;
    },
  ) {
    return this.assignmentRepo.getAllWithJoins(ctx, options);
  }

  /**
   * Get employee's current shift
   */
  async getEmployeeShift(
    ctx: TenantContext,
    employeeId: number,
    date?: string,
  ): Promise<any | null> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return this.assignmentRepo.getAssignmentByDate(ctx, employeeId, targetDate);
  }

  /**
   * Get a shift template by its primary-key ID.
   * Returns null if not found.
   */
  async getShiftById(
    ctx: TenantContext,
    shiftId: number,
  ): Promise<ShiftTemplate | null> {
    try {
      const shift = await this.shiftRepo.getById(ctx, shiftId);
      return shift && !this.isSoftDeleted(shift) ? shift : null;
    } catch {
      return null;
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(
    ctx: TenantContext,
    assignmentId: number,
  ): Promise<boolean> {
    const existing = await this.assignmentRepo.getById(ctx, assignmentId);
    if (!existing || this.isSoftDeleted(existing)) {
      throw new NotFoundError("Shift assignment not found");
    }

    await this.assignmentRepo.update(ctx, assignmentId, {
      is_current: false,
      deleted_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    });

    await this.auditService.log(ctx, {
      action: "DELETE_SHIFT_ASSIGNMENT",
      entityType: "SHIFT_ASSIGNMENT",
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
    options?: ListQueryOptions & {
      status?: string;
      search?: string;
      employeeId?: number;
    },
  ) {
    return this.swapRepo.getAllWithJoins(ctx, options);
  }

  /**
   * Get swap requests sent to the employee to approve
   */
  async getSwapRequestsToApprove(
    ctx: TenantContext,
    options?: ListQueryOptions & {
      status?: string;
      swapWithEmployeeId: number;
    },
  ) {
    return this.swapRepo.getAllWithJoins(ctx, options);
  }

  /**
   * Request shift swap (employee-facing)
   */
  async requestShiftSwap(
    ctx: TenantContext,
    requesterEmployeeId: number,
    input: {
      requestShiftDate: string;
      requestedShiftId: number;
      swapWithEmployeeId: number;
      swapShiftDate?: string;
      swapShiftId?: number;
      reason?: string;
    },
  ): Promise<any> {
    let requesting = await this.assignmentRepo.getAssignmentByDate(
      ctx,
      requesterEmployeeId,
      input.requestShiftDate,
    );
    if (!requesting) {
      const defaultShift = await this.shiftRepo.getDefaultShift(ctx);
      if (defaultShift) {
        const [year, month, day] = input.requestShiftDate
          .split("-")
          .map(Number);
        const dateObj = new Date(year, month - 1, day);
        const isWorking = this.isWorkingDay(
          dateObj,
          defaultShift.roster_pattern,
        );
        if (isWorking) {
          requesting = {
            shiftId: defaultShift.id,
            shiftName: defaultShift.shift_name,
            shiftCode: defaultShift.shift_code,
          };
        }
      }
    }
    if (!requesting) {
      throw new ValidationError(
        "You do not have a shift assigned on the requested date",
      );
    }

    let swapping = await this.assignmentRepo.getAssignmentByDate(
      ctx,
      input.swapWithEmployeeId,
      input.swapShiftDate || input.requestShiftDate,
    );
    if (!swapping) {
      const defaultShift = await this.shiftRepo.getDefaultShift(ctx);
      if (defaultShift) {
        const targetDate = input.swapShiftDate || input.requestShiftDate;
        const [year, month, day] = targetDate.split("-").map(Number);
        const dateObj = new Date(year, month - 1, day);
        const isWorking = this.isWorkingDay(
          dateObj,
          defaultShift.roster_pattern,
        );
        if (isWorking) {
          swapping = {
            shiftId: defaultShift.id,
            shiftName: defaultShift.shift_name,
            shiftCode: defaultShift.shift_code,
          };
        }
      }
    }
    if (!swapping) {
      throw new ValidationError(
        "Swap employee does not have a shift assigned on that date",
      );
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
      status: "pending",
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: "REQUEST_SHIFT_SWAP",
      entityType: "SHIFT_SWAP",
      entityId: swap.id,
      afterState: {
        requestDate: input.requestShiftDate,
        swapWith: input.swapWithEmployeeId,
      },
    });

    return swap;
  }

  /**
   * Approve shift swap (admin)
   */
  async approveShiftSwap(ctx: TenantContext, swapId: number): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) throw new NotFoundError("Shift swap request not found");
    if (swap.status !== "pending")
      throw new ValidationError("Only pending swap requests can be approved");

    const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Both single-day reassignments and the swap request's own status update
    // happen inside one transaction: if either assignment fails, nothing is
    // left half-applied (previously these were two independent assignShift()
    // calls with no rollback if the second failed after the first succeeded).
    // This intentionally re-implements only the narrow single-day-move case
    // assignShift() handles via moveFromDate — not the general bulk/overlap
    // logic — since that logic runs through the repository layer, which has
    // no transaction support to thread a shared trx through.
    await withTransaction(async (trx) => {
      await this.applySingleDaySwapAssignment(
        trx,
        ctx,
        (swap as any).employeeId,
        (swap as any).swapShiftId,
        (swap as any).requestShiftDate,
      );
      await this.applySingleDaySwapAssignment(
        trx,
        ctx,
        (swap as any).swapWithEmployeeId,
        (swap as any).requestedShiftId,
        (swap as any).swapShiftDate,
      );

      const count = await trx("shift_swap_requests")
        .where({ id: swapId, organization_id: ctx.organizationId })
        .update({
          status: "approved",
          approved_by: ctx.userId,
          approval_date: nowSql,
          updated_by: ctx.userId,
          updated_at: nowSql,
        });
      if (!count) throw new NotFoundError("Shift swap request not found");
    });

    const updated = await this.swapRepo.getById(ctx, swapId);

    await this.auditService.log(ctx, {
      action: "APPROVE_SHIFT_SWAP",
      entityType: "SHIFT_SWAP",
      entityId: swapId,
      afterState: { status: "approved" },
    });

    return updated;
  }

  /**
   * Ends any current assignment exactly matching the given single day and
   * inserts the new one — the transaction-safe equivalent of calling
   * assignShift() with startDate === endDate === moveFromDate === date.
   */
  private async applySingleDaySwapAssignment(
    trx: Knex.Transaction,
    ctx: TenantContext,
    employeeId: number,
    shiftId: number,
    date: string,
  ): Promise<void> {
    const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

    await trx("employee_shift_assignments")
      .where({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        is_current: true,
        assignment_start_date: date,
        assignment_end_date: date,
      })
      .update({
        is_current: false,
        updated_by: ctx.userId,
        updated_at: nowSql,
      });

    const insertPayload: Record<string, unknown> = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      shift_id: shiftId,
      assignment_start_date: date,
      assignment_end_date: date,
      is_current: true,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: nowSql,
      updated_at: nowSql,
    };
    if (ctx.companyId) insertPayload.company_id = ctx.companyId;

    await trx("employee_shift_assignments").insert(insertPayload);
  }

  /**
   * Reject shift swap (admin)
   */
  async rejectShiftSwap(
    ctx: TenantContext,
    swapId: number,
    reason?: string,
  ): Promise<any> {
    const swap = await this.swapRepo.getById(ctx, swapId);
    if (!swap) throw new NotFoundError("Shift swap request not found");
    if (swap.status !== "pending")
      throw new ValidationError("Only pending swap requests can be rejected");

    const updated = await this.swapRepo.update(ctx, swapId, {
      status: "rejected",
      updated_by: ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: "REJECT_SHIFT_SWAP",
      entityType: "SHIFT_SWAP",
      entityId: swapId,
      afterState: { status: "rejected", reason },
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
    toDate: string,
  ): Promise<any[]> {
    const assignments = await this.assignmentRepo.getEmployeeShiftsInRange(
      ctx,
      employeeId,
      fromDate,
      toDate,
    );
    const defaultShift = await this.shiftRepo
      .getDefaultShift(ctx)
      .catch(() => null);

    const result: any[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      // Find covering assignment
      const activeAssign = assignments.find((a) => {
        const aStart = this.formatDate(a.assignmentStartDate);
        const aEnd = a.assignmentEndDate
          ? this.formatDate(a.assignmentEndDate)
          : null;
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
          description: activeAssign.description,
        });
      } else if (defaultShift) {
        const isWorking = this.isWorkingDay(d, defaultShift.roster_pattern);
        result.push({
          date: dateStr,
          isOffDay: !isWorking,
          shiftId: defaultShift.id,
          shiftName: defaultShift.shift_name,
          shiftCode: defaultShift.shift_code,
          startTime: defaultShift.start_time,
          endTime: defaultShift.end_time,
          color: defaultShift.color || "#3B82F6",
          isNightShift: Boolean(defaultShift.is_night_shift),
          isFlexible: Boolean(defaultShift.is_flexible),
          breakDurationMinutes: defaultShift.break_duration_minutes,
          gracePeriodMinutes: defaultShift.grace_period_minutes,
          flexibleStartRangeStart: defaultShift.flexible_start_range_start,
          flexibleStartRangeEnd: defaultShift.flexible_start_range_end,
          description: defaultShift.description,
        });
      } else {
        result.push({
          date: dateStr,
          isOffDay: true,
          shiftId: null,
          shiftName: "No Shift Assigned",
          shiftCode: "OFF",
          startTime: null,
          endTime: null,
          color: "#94A3B8",
          isNightShift: false,
          isFlexible: false,
          breakDurationMinutes: 0,
          gracePeriodMinutes: 0,
          flexibleStartRangeStart: null,
          flexibleStartRangeEnd: null,
          description: "No active shift assignment for this date",
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

    const pattern =
      typeof rosterPattern === "string"
        ? JSON.parse(rosterPattern)
        : rosterPattern;
    const daysIncluded = pattern.daysIncluded || [
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
    ];

    const daysMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const dayName = daysMap[date.getDay()];

    if (daysIncluded.includes(dayName)) {
      return true;
    }

    if (
      pattern.excludedWorkingPattern &&
      pattern.excludedWorkingPattern[dayName]
    ) {
      const dayRule = pattern.excludedWorkingPattern[dayName];
      if (dayName === "sat") {
        const dayOfMonth = date.getDate();
        const weekIndex = Math.ceil(dayOfMonth / 7);
        const lastDayOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
        const isLast = dayOfMonth + 7 > lastDayOfMonth;

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
  async getEmployeeRosterPatternInfo(
    ctx: TenantContext,
    employeeId: number,
  ): Promise<any> {
    const assignment = await this.assignmentRepo.getCurrentAssignment(
      ctx,
      employeeId,
    );
    if (!assignment) {
      return null;
    }

    const shiftId = (assignment as any).shiftId || assignment.shift_id;
    const shift = await this.shiftRepo.getById(ctx, shiftId);
    if (!shift || !shift.roster_pattern) {
      return null;
    }

    const rosterPattern =
      typeof shift.roster_pattern === "string"
        ? JSON.parse(shift.roster_pattern)
        : shift.roster_pattern;

    const today = new Date();
    const isTodayWorking = this.isWorkingDay(today, rosterPattern);

    let nextChangeDate: string | null = null;
    const testDate = new Date(today);

    for (let i = 1; i <= 30; i++) {
      testDate.setDate(testDate.getDate() + 1);
      const isWorking = this.isWorkingDay(testDate, rosterPattern);
      if (isWorking !== isTodayWorking) {
        nextChangeDate = testDate.toISOString().split("T")[0];
        break;
      }
    }

    const dayOfMonth = today.getDate();
    const weekIndex = Math.ceil(dayOfMonth / 7);

    return {
      rosterPattern,
      shiftName: shift.shift_name,
      shiftCode: shift.shift_code,
      color: shift.color,
      currentWeek: weekIndex,
      currentStatus: isTodayWorking ? "working" : "off",
      nextChangeDate,
    };
  }

  /**
   * Safe utility to format date object/string as YYYY-MM-DD local
   */
  formatDate(dateVal: any): string {
    if (!dateVal) return "";
    if (typeof dateVal === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        return dateVal.substring(0, 10);
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().substring(0, 10);
    }

    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return "";
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, "0");
      const day = String(dateVal.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return "";
  }
}
