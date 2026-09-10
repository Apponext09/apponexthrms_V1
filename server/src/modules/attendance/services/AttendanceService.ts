import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/common/lib/logger';
import { AttendanceRecordRepository, type AttendanceRecord, type AttendanceStatus } from '../repositories/AttendanceRecordRepository';
import { AttendanceSessionRepository } from '../repositories/AttendanceSessionRepository';
import { AttendanceBreakRepository } from '../repositories/AttendanceBreakRepository';
import { EmployeeShiftAssignmentRepository } from '../repositories/EmployeeShiftAssignmentRepository';
import { AttendancePoliciesMappingRepository } from '../repositories/AttendancePoliciesMappingRepository';
import { GeofenceRepository } from '../repositories/GeofenceRepository';
import { GeoFenceService } from './GeoFenceService';
import { HolidayCalendarService } from '../../master/services/HolidayCalendarService';
import { ShiftService } from './ShiftService';
import { NotificationService } from '../../notifications/services/notification.service';
import { LateMarkNotificationService } from '../../notifications/services/lateMarkNotificationService';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { getKnex } from '../../../db/knex';

const formatMysqlDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const getLocalYYYYMMDD = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalNowString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hrs}:${mins}:${secs}`;
};

/**
 * Parse a shift time string (e.g. "09:30", "09:30:00", "09:30 AM") into
 * a Date object on the given local date (YYYY-MM-DD). Returns null if unparseable.
 */
const parseShiftTime = (timeStr: string | null | undefined, dateStr: string): Date | null => {
  if (!timeStr) return null;
  const s = String(timeStr).trim();

  // Handle AM/PM format: "09:30 AM" or "9:30 PM"
  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
  }

  // Handle 24h format: "09:30" or "09:30:00"
  const h24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d, parseInt(h24[1], 10), parseInt(h24[2], 10), 0, 0);
  }

  return null;
};

export type EntryStatus = 'on_time' | 'late' | 'half_day' | 'no_shift';

export interface ShiftEntryResult {
  status: 'present' | 'half_day';
  isLate: boolean;
  entryStatus: EntryStatus;
  /** ISO-like label for grace deadline e.g. "09:15" */
  graceDeadlineLabel: string;
  /** ISO-like label for half-day start e.g. "13:30" */
  halfDayDeadlineLabel: string;
  lateMinutes: number;
}

/**
 * Compute attendance status from shift + actual check-in time.
 *
 * Rules:
 *   checkIn <= shiftStart + gracePeriodMins  → Full Day, NOT late
 *   checkIn <= halfDayDeadline               → Full Day, IS late
 *   checkIn >  halfDayDeadline               → Half Day, IS late
 *
 * halfDayDeadline = shiftStart + floor(durationHours * 60 / 2) minutes
 * If durationHours is missing, defaults to 4.5 hours after shift start.
 */
const computeShiftEntryStatus = (
  shift: {
    start_time?: string | null;
    startTime?: string | null;
    grace_period_minutes?: number | null;
    gracePeriodMinutes?: number | null;
    duration_hours?: number | string | null;
    durationHours?: number | string | null;
  },
  checkInNow: Date,
  todayStr: string
): ShiftEntryResult => {
  const NO_SHIFT: ShiftEntryResult = {
    status: 'present',
    isLate: false,
    entryStatus: 'no_shift',
    graceDeadlineLabel: '--',
    halfDayDeadlineLabel: '--',
    lateMinutes: 0,
  };

  const rawStartTime = shift.start_time || shift.startTime;
  const shiftStart = parseShiftTime(rawStartTime, todayStr);
  if (!shiftStart) return NO_SHIFT;

  const graceMins = Math.max(0, Number(shift.grace_period_minutes ?? shift.gracePeriodMinutes ?? 0));
  const durationHours = Number(shift.duration_hours ?? shift.durationHours ?? 8.5);

  // Grace deadline: employee can still punch full-day without late mark
  const graceDeadline = new Date(shiftStart.getTime() + graceMins * 60 * 1000);

  // Half-day cutoff: defaults to 2 hours after shift start (e.g. 09:00 AM -> 11:00 AM cutoff)
  // or reads explicit half_day_start_time / halfDayStartTime if specified
  let rosterRules: any = null;
  if ((shift as any).roster_pattern || (shift as any).rosterPattern) {
    try {
      const raw = (shift as any).roster_pattern || (shift as any).rosterPattern;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      rosterRules = parsed?.globalAttendanceRules || null;
    } catch { }
  }

  const rawHalfDayTime = (shift as any).half_day_start_time || (shift as any).halfDayStartTime || rosterRules?.halfDayStartTime || rosterRules?.half_day_start_time;
  let halfDayDeadline: Date;
  if (rawHalfDayTime) {
    const parsedHalfDay = parseShiftTime(rawHalfDayTime, todayStr);
    halfDayDeadline = parsedHalfDay || new Date(shiftStart.getTime() + 2 * 60 * 60 * 1000);
  } else {
    // Default cutoff is 2 hours after shift start (e.g. 09:00 AM shift -> 11:00 AM)
    halfDayDeadline = new Date(shiftStart.getTime() + 2 * 60 * 60 * 1000);
  }


  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const nowMs = checkInNow.getTime();
  const shiftMs = shiftStart.getTime();
  const lateMinutes = nowMs > shiftMs ? Math.floor((nowMs - shiftMs) / 60000) : 0;

  let res: ShiftEntryResult;
  if (nowMs <= graceDeadline.getTime()) {
    // On time — within grace period
    res = {
      status: 'present',
      isLate: false,
      entryStatus: 'on_time',
      graceDeadlineLabel: fmt(graceDeadline),
      halfDayDeadlineLabel: fmt(halfDayDeadline),
      lateMinutes: 0,
    };
  } else if (nowMs <= halfDayDeadline.getTime()) {
    // After grace but before half-day: Full Day with Late Entry
    res = {
      status: 'present',
      isLate: true,
      entryStatus: 'late',
      graceDeadlineLabel: fmt(graceDeadline),
      halfDayDeadlineLabel: fmt(halfDayDeadline),
      lateMinutes,
    };
  } else {
    // After half-day cutoff: Half Day
    res = {
      status: 'half_day',
      isLate: true,
      entryStatus: 'half_day',
      graceDeadlineLabel: fmt(graceDeadline),
      halfDayDeadlineLabel: fmt(halfDayDeadline),
      lateMinutes,
    };
  }

  console.log(`[ShiftEntryCalc] ShiftStart: ${fmt(shiftStart)} | GraceDeadline: ${res.graceDeadlineLabel} | HalfDayDeadline: ${res.halfDayDeadlineLabel} | Now: ${fmt(checkInNow)} → Result: ${res.entryStatus} (${res.status}, isLate: ${res.isLate})`);
  return res;

};

export class AttendanceService {
  private recordRepo: AttendanceRecordRepository;
  private sessionRepo: AttendanceSessionRepository;
  private breakRepo: AttendanceBreakRepository;
  private shiftAssignmentRepo: EmployeeShiftAssignmentRepository;
  private policyMappingRepo: AttendancePoliciesMappingRepository;
  private geofenceRepo: GeofenceRepository;
  private geofenceService: GeoFenceService;
  private shiftService: ShiftService;
  private notificationService: NotificationService;
  private lateMarkNotificationService: LateMarkNotificationService;
  private auditService: AuditService;

  constructor() {
    this.recordRepo = new AttendanceRecordRepository();
    this.sessionRepo = new AttendanceSessionRepository();
    this.breakRepo = new AttendanceBreakRepository();
    this.shiftAssignmentRepo = new EmployeeShiftAssignmentRepository();
    this.policyMappingRepo = new AttendancePoliciesMappingRepository();
    this.geofenceRepo = new GeofenceRepository();
    this.geofenceService = new GeoFenceService();
    this.shiftService = new ShiftService();
    this.notificationService = new NotificationService();
    this.lateMarkNotificationService = new LateMarkNotificationService();
    this.auditService = new AuditService();
  }

  /**
   * Resolve whether a given date is a public holiday or weekly off for an employee,
   * using the priority-based HolidayCalendarService which respects calendar assignments
   * (location, department, company, org fallback).
   *
   * Also evaluates multi-tier punch permission:
   *   1. Org-wide setting: allow_holiday_punch_by_default
   *   2. Employee-level override: employee_attendance_locations.allow_holiday_punch / allow_weekoff_punch
   *   3. Shift assigned for today (shift override implicitly allows)
   *   4. Optional holidays (Restricted/RH) never block check-in
   *
   * Returns structured result with `isHoliday`, `isWeekOff`, `isPunchAllowed`, and `reason`.
   */
  private async resolveHolidayStatus(
    ctx: TenantContext,
    employeeId: number,
    date: string  // YYYY-MM-DD
  ): Promise<{
    isHoliday: boolean;
    isWeekOff: boolean;
    holidayName?: string;
    holidayType?: string;
    isOptional?: boolean;
    isPunchAllowed: boolean;
    punchAllowedReason?: string;
    hasPendingRequest?: boolean;
  }> {
    try {
      const db = getKnex();
      const holidayCalSvc = new HolidayCalendarService();

      // 1. Resolve employee's assigned calendar using full priority chain
      const calResult = await holidayCalSvc.getCalendarForEmployee(null, ctx, employeeId);
      if (!calResult) {
        // No calendar assigned — no restrictions
        return { isHoliday: false, isWeekOff: false, isPunchAllowed: true, punchAllowedReason: 'No holiday calendar assigned' };
      }

      // 2. Check if today is a holiday or week-off
      const offDayResult = await holidayCalSvc.isHolidayOrWeekOff(null, ctx, calResult.calendarId, date);

      if (!offDayResult.isOff) {
        return { isHoliday: false, isWeekOff: false, isPunchAllowed: true };
      }

      const isHoliday = offDayResult.type === 'Holiday';
      const isWeekOff = offDayResult.type === 'WeekOff';

      // 3. Optional holidays (Restricted/RH) never block check-in
      if (isHoliday && offDayResult.isOptional) {
        return {
          isHoliday: true,
          isWeekOff: false,
          holidayName: offDayResult.name,
          holidayType: offDayResult.holidayType,
          isOptional: true,
          isPunchAllowed: true,
          punchAllowedReason: 'Optional/Restricted Holiday does not block check-in',
        };
      }

      // 4. Check org-wide setting: allow_holiday_punch_by_default
      const orgSetting = await db('organization_leave_settings')
        .where('organization_id', ctx.organizationId)
        .first('allow_holiday_punch_by_default')
        .catch(() => null);
      const orgAllowsHolidayPunch = !!(orgSetting?.allow_holiday_punch_by_default);

      if (orgAllowsHolidayPunch) {
        return {
          isHoliday,
          isWeekOff,
          holidayName: offDayResult.name,
          holidayType: offDayResult.holidayType,
          isPunchAllowed: true,
          punchAllowedReason: 'Org setting: Holiday punch allowed by default',
        };
      }

      // 5. Check employee-level override in employee_attendance_locations
      const empLocation = await db('employee_attendance_locations')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .first('allow_holiday_punch', 'allow_weekoff_punch')
        .catch(() => null);

      const empAllowHoliday = !!(empLocation?.allow_holiday_punch);
      const empAllowWeekOff = !!(empLocation?.allow_weekoff_punch);

      if (isHoliday && empAllowHoliday) {
        return {
          isHoliday: true,
          isWeekOff: false,
          holidayName: offDayResult.name,
          holidayType: offDayResult.holidayType,
          isPunchAllowed: true,
          punchAllowedReason: 'Employee granted holiday punch permission',
          hasPendingRequest: false,
        };
      }

      if (isWeekOff && empAllowWeekOff) {
        return {
          isHoliday: false,
          isWeekOff: true,
          holidayName: offDayResult.name,
          isPunchAllowed: true,
          punchAllowedReason: 'Employee granted week-off punch permission',
          hasPendingRequest: false,
        };
      }

      // 6. Check approved or pending overtime/holiday work requests for today
      const overtimeReq = await db('overtime_requests')
        .where('organization_id', ctx.organizationId)
        .where('employee_id', employeeId)
        .whereRaw('DATE(overtime_date) = ?', [date])
        .whereNull('deleted_at')
        .first('approval_status', 'reason_description')
        .catch(() => null);

      const statusVal = overtimeReq?.approvalStatus || overtimeReq?.approval_status;

      if (statusVal === 'approved') {
        return {
          isHoliday,
          isWeekOff,
          holidayName: offDayResult.name,
          holidayType: offDayResult.holidayType,
          isPunchAllowed: true,
          punchAllowedReason: 'Approved Holiday Work Request',
          hasPendingRequest: false,
        };
      }

      const hasPendingRequest = statusVal === 'pending';

      // 7. Block punch — not authorized
      return {
        isHoliday,
        isWeekOff,
        holidayName: offDayResult.name,
        holidayType: offDayResult.holidayType,
        isPunchAllowed: false,
        hasPendingRequest,
      };
    } catch (e) {
      console.warn('[AttendanceService] resolveHolidayStatus error (non-fatal):', e);
      return { isHoliday: false, isWeekOff: false, isPunchAllowed: true, hasPendingRequest: false };
    }
  }

  /**
   * Check in an employee
   */
  async checkIn(ctx: TenantContext, input: {
    employeeId: number;
    checkInLocation?: number;
    method: string;
    latitude?: number;
    longitude?: number;
    shiftId?: number;
  }): Promise<AttendanceRecord> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    let assignedShiftId: number | null = input.shiftId || null;
    let resolvedShift: any = null;
    if (!assignedShiftId) {
      try {
        const assignedShift = await this.shiftService.getEmployeeShift(ctx, input.employeeId, today);
        if (assignedShift) {
          assignedShiftId = assignedShift.shift_id || assignedShift.shiftId || assignedShift.id || null;
          resolvedShift = assignedShift;
        }
      } catch (shiftErr) {
        console.warn('[AttendanceService] Failed to fetch assigned shift for employee check-in:', shiftErr);
      }
    } else {
      // shiftId was provided directly — fetch its details so we can compute grace period
      try {
        resolvedShift = await this.shiftService.getShiftById(ctx, assignedShiftId);
      } catch { }
    }

    let geofenceMatched: boolean | null = null;
    let matchedLocationId: number | null = input.checkInLocation || null;
    let matchedLocationName: string | null = null;

    if (input.latitude != null && input.longitude != null) {
      try {
        const geoValidation = await this.geofenceService.validateCheckInLocation(
          ctx,
          input.employeeId,
          input.latitude,
          input.longitude,
          now
        );
        geofenceMatched = geoValidation.valid;
        if (geoValidation.locationId) {
          matchedLocationId = geoValidation.locationId;
        }
        if (geoValidation.locationName) {
          matchedLocationName = geoValidation.locationName;
        }
      } catch (e: any) {
        console.warn('[AttendanceService] geofence check warning:', e);
      }
    }

    if (matchedLocationId) {
      try {
        const locExists = await this.geofenceRepo.getById(ctx, matchedLocationId);
        if (!locExists) matchedLocationId = null;
      } catch {
        matchedLocationId = null;
      }
    }

    // ── Holiday & Week-Off Punch Gate ─────────────────────────────────────────
    const holidayStatus = await this.resolveHolidayStatus(ctx, input.employeeId, today);

    // Determine if the punch is on a restricted day (holiday or week-off)
    const isRestrictedDay = holidayStatus.isHoliday || holidayStatus.isWeekOff;

    if (isRestrictedDay && !holidayStatus.isPunchAllowed) {
      // Punch is blocked — employee/org has no permission override and no shift assigned
      const dayLabel = holidayStatus.isHoliday
        ? `public holiday (${holidayStatus.holidayName})`
        : `weekly off (${holidayStatus.holidayName ?? 'Week Off'})`;
      throw new ValidationError(
        `Today is a ${dayLabel}. Attendance punch is disabled. Contact HR to enable holiday work permission.`
      );
    }

    if (!isRestrictedDay && !resolvedShift) {
      // Normal working day but no shift assigned → block check-in
      throw new ValidationError(
        'No shift is assigned for today. Please contact HR to assign a shift before marking attendance.'
      );
    }

    // If punch is allowed on holiday/week-off → attach a note for payroll tracking
    const holidayNote = isRestrictedDay && holidayStatus.isPunchAllowed
      ? `${holidayStatus.isHoliday ? 'Holiday' : 'Week-Off'} Work: ${holidayStatus.holidayName ?? ''}`
      : null;

    // ── Grace Period + Half-Day Status Computation ────────────────────────────
    const checkInDateObj = new Date();
    const entryResult = computeShiftEntryStatus(
      resolvedShift || {},
      checkInDateObj,
      today
    );

    const attendanceStatus = entryResult.status;          // 'present' | 'half_day'
    const isLateFlag = entryResult.isLate;
    const entryNotes = entryResult.entryStatus === 'late'
      ? `Late Entry (+${entryResult.lateMinutes} mins)`
      : entryResult.entryStatus === 'half_day'
        ? `Half Day (arrived after ${entryResult.halfDayDeadlineLabel})`
        : null;

    const cleanMethod = (() => {
      const m = String(input.method || 'web').toLowerCase();
      if (m.includes('web') || m.includes('portal')) return 'web';
      if (m.includes('face') || m.includes('bio')) return 'biometric';
      if (m.includes('qr')) return 'qr';
      if (m.includes('gps')) return 'gps';
      if (m.includes('mob')) return 'mobile';
      return m.slice(0, 10);
    })();

    // Get or create today's attendance record
    // Merge holiday note into entry notes
    const finalNotes = holidayNote
      ? (entryNotes ? `${holidayNote} | ${entryNotes}` : holidayNote)
      : entryNotes;

    let record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, today);
    if (!record) {
      record = await this.recordRepo.create(ctx, {
        uuid: uuidv4(),
        employee_id: input.employeeId,
        shift_id: assignedShiftId,
        check_in_date: today,
        check_in_time: now,
        check_in_location_id: matchedLocationId,
        check_in_method: cleanMethod,
        status: attendanceStatus,
        is_late: isLateFlag,
        notes: finalNotes,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);
    } else {
      // Update existing record with check-in time and computed status
      record = await this.recordRepo.update(ctx, record.id, {
        check_in_time: now,
        check_in_location_id: matchedLocationId,
        check_in_method: cleanMethod,
        status: attendanceStatus,
        is_late: isLateFlag,
        notes: finalNotes,
        ...(assignedShiftId ? { shift_id: assignedShiftId } : {}),
      });
    }

    // Attach entryResult to the record for callers (biometric verify-punch handler can read this)
    (record as any)._entryResult = entryResult;

    // ── Late Auto-Deduction Assignment ─────────────────────────────────────────
    // If the employee is late, check the late_updations table for matching rules
    // and apply "Half Day" or "No Pay" status accordingly.
    if (isLateFlag) {
      try {
        const db = getKnex();
        const lateUpdationRules = await db('late_updations')
          .where('organization_id', ctx.organizationId)
          .where('status', 'active');

        if (lateUpdationRules.length > 0) {
          // Fetch employee details for eligibility matching
          const employee = await db('employees')
            .where('id', input.employeeId)
            .where('organization_id', ctx.organizationId)
            .first();

          if (employee) {
            const safeParseJsonArr = (val: any): any[] => {
              if (!val) return [];
              if (typeof val === 'string') {
                try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
              }
              return Array.isArray(val) ? val : [];
            };

            // Parse check-in time into HH:MM for comparison
            const checkInDate = new Date();
            const checkInHHMM = `${String(checkInDate.getHours()).padStart(2, '0')}:${String(checkInDate.getMinutes()).padStart(2, '0')}`;

            for (const rule of lateUpdationRules) {
              const threshold = rule.late_coming_after || '09:30';

              // Skip if check-in is before the threshold
              if (checkInHHMM <= threshold) continue;

              // Check location eligibility (match either branch ID or location ID)
              const ruleLocations = safeParseJsonArr(rule.locations);
              if (ruleLocations.length > 0 &&
                !ruleLocations.includes(Number(employee.current_location_id)) &&
                !ruleLocations.includes(Number(employee.current_branch_id))) {
                continue;
              }

              // Check department eligibility
              const ruleDepartments = safeParseJsonArr(rule.departments);
              if (ruleDepartments.length > 0 && !ruleDepartments.includes(Number(employee.current_department_id))) continue;

              // Check grade eligibility
              const ruleGrades = safeParseJsonArr(rule.grades);
              if (ruleGrades.length > 0 && !ruleGrades.includes(employee.grade)) continue;

              // Check employee status eligibility
              const ruleStatuses = safeParseJsonArr(rule.employee_statuses);
              if (ruleStatuses.length > 0 && !ruleStatuses.includes(employee.status)) continue;

              // Check shift eligibility
              const ruleShifts = safeParseJsonArr(rule.shifts);
              if (ruleShifts.length > 0) {
                const shiftAssignment = await db('employee_shift_assignments')
                  .where('employee_id', input.employeeId)
                  .first();
                if (!shiftAssignment || !ruleShifts.includes(Number(shiftAssignment.shift_id))) continue;
              }

              // ✅ Matched! Apply the late updation rule
              const updateFor = rule.update_for || 'Half Day';
              const newStatus = updateFor === 'No Pay' ? 'absent' : 'half_day';
              const lateNote = `Late Updation Applied: ${rule.name} (arrived after ${threshold}, marked as ${updateFor})`;

              // Update attendance record status
              await this.recordRepo.update(ctx, record.id, {
                status: newStatus as any,
                notes: lateNote,
              });
              (record as any).status = newStatus;
              (record as any).notes = lateNote;

              // If auto_apply_leave is enabled, create a leave ledger deduction
              if (rule.auto_apply_leave) {
                try {
                  const hasLedger = await db.schema.hasTable('leave_ledger_entries');
                  if (hasLedger) {
                    // Find LWP or first available leave type for deduction
                    const lwpType = await db('leave_types')
                      .where('organization_id', ctx.organizationId)
                      .where(function (this: any) {
                        this.whereRaw("LOWER(leave_name) = 'lwp'")
                          .orWhereRaw("LOWER(leave_code) = 'lwp'")
                          .orWhereRaw("LOWER(leave_name) = 'loss of pay'")
                          .orWhereRaw("LOWER(leave_name) = 'leave without pay'");
                      })
                      .first();

                    const deductAmount = updateFor === 'Half Day' ? 0.5 : 1.0;

                    if (lwpType) {
                      await db('leave_ledger_entries').insert({
                        organization_id: ctx.organizationId,
                        employee_id: input.employeeId,
                        leave_type_id: lwpType.id,
                        transaction_type: 'DEBIT',
                        amount: deductAmount,
                        reason: `Auto Late Deduction: ${rule.name} (${today})`,
                        created_by: ctx.userId,
                        created_at: new Date(),
                      });
                    }
                  }
                } catch (ledgerErr) {
                  console.warn('[AttendanceService] Late auto-deduction leave ledger error:', ledgerErr);
                }
              }

              // Stop after first matching rule
              break;
            }
          }
        }
      } catch (lateErr) {
        console.warn('[AttendanceService] Late auto-deduction assignment error:', lateErr);
      }
    }

    // Create session record
    await this.sessionRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      session_type: 'check_in',
      session_timestamp: now,
      device_latitude: input.latitude || null,
      device_longitude: input.longitude || null,
      geofence_matched: geofenceMatched,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CHECK_IN',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      afterState: {
        checkInTime: now,
        method: input.method,
        geofenceMatched,
        entryStatus: entryResult.entryStatus,
        isLate: isLateFlag,
        attendanceStatus,
      },
    });

    // ── Late-Mark Multi-Recipient Notification ─────────────────────────────────
    // Sends in-app push notifications to: the employee (self), their reporting
    // manager (team lead), all HR-role users in the org, and the org admin.
    // Only fires when the employee was actually late (isLateFlag = true).
    if (isLateFlag && entryResult.lateMinutes > 0) {
      try {
        // Resolve display name from employees table
        const db = getKnex();
        const empRow = await db('employees')
          .where('id', input.employeeId)
          .where('organization_id', ctx.organizationId)
          .select('first_name', 'last_name')
          .first();

        const employeeName = empRow
          ? `${empRow.first_name || ''} ${empRow.last_name || ''}`.trim()
          : `Employee #${input.employeeId}`;

        await this.lateMarkNotificationService.sendLateMarkNotifications(ctx, {
          employeeId: input.employeeId,
          employeeUserId: ctx.userId,
          employeeName,
          lateByMinutes: entryResult.lateMinutes,
          attendanceRecordId: record.id,
        });
      } catch (e) {
        logger.warn('[AttendanceService] Late-mark notification failed (non-fatal)', e);
      }
    }

    return record;
  }

  /**
   * Check out an employee
   */
  async checkOut(ctx: TenantContext, input: {
    employeeId: number;
    checkOutLocation?: number;
    method: string;
    latitude?: number;
    longitude?: number;
  }): Promise<AttendanceRecord> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    let record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const existingCheckInTime = record.checkInTime ?? record.check_in_time;
    if (!existingCheckInTime) {
      throw new ValidationError('Employee has not checked in');
    }

    // Auto-close any active/paused break so checkout is never blocked by an unfinished
    // break (e.g. an employee going on half-day leave mid-break must still be able to check out).
    const openBreaks = await this.breakRepo.getByRecord(ctx, record.id);
    const openBreak = openBreaks.find(b => b.status === 'active' || b.status === 'paused');
    if (openBreak) {
      const rawStartTime = openBreak.break_start_time || (openBreak as any).breakStartTime || openBreak.created_at;
      let breakStartTime = NaN;
      if (rawStartTime instanceof Date) {
        breakStartTime = rawStartTime.getTime();
      } else if (typeof rawStartTime === 'number') {
        breakStartTime = rawStartTime;
      } else if (typeof rawStartTime === 'string') {
        const isoStart = rawStartTime.includes('T') ? rawStartTime : rawStartTime.replace(' ', 'T');
        breakStartTime = new Date(isoStart).getTime();
        if (isNaN(breakStartTime)) {
          breakStartTime = new Date(rawStartTime).getTime();
        }
      }

      const parsedEndTime = new Date(now.replace(' ', 'T')).getTime();
      const breakEndTime = !isNaN(parsedEndTime) ? parsedEndTime : Date.now();
      let breakDurationMinutes = 1;
      if (!isNaN(breakStartTime) && !isNaN(breakEndTime) && breakEndTime > breakStartTime) {
        breakDurationMinutes = Math.max(1, Math.floor((breakEndTime - breakStartTime) / (1000 * 60)));
      }
      if (isNaN(breakDurationMinutes) || !isFinite(breakDurationMinutes)) {
        breakDurationMinutes = 1;
      }

      await this.breakRepo.update(ctx, openBreak.id, {
        break_end_time: now,
        break_duration_minutes: breakDurationMinutes,
        break_type: openBreak.break_type || 'General Break',
        status: 'completed',
      } as any);

      await this.sessionRepo.create(ctx, {
        uuid: uuidv4(),
        attendance_record_id: record.id,
        session_type: 'break_out',
        session_timestamp: now,
        session_notes: openBreak.break_type || 'General Break',
      } as any);
    }

    let geofenceMatched: boolean | null = null;
    let matchedLocationId: number | null = input.checkOutLocation || null;

    if (input.latitude != null && input.longitude != null) {
      try {
        const geoValidation = await this.geofenceService.validateCheckInLocation(
          ctx,
          input.employeeId,
          input.latitude,
          input.longitude,
          now
        );
        geofenceMatched = geoValidation.valid;
        if (!geoValidation.valid) {
          throw new ValidationError(geoValidation.message);
        }
        if (geoValidation.locationId) {
          matchedLocationId = geoValidation.locationId;
        }
      } catch (e: any) {
        if (e instanceof ValidationError) {
          throw e;
        }
        console.warn('[AttendanceService] geofence check warning:', e);
      }
    }

    // Calculate duration
    if (matchedLocationId) {
      try {
        const locExists = await this.geofenceRepo.getById(ctx, matchedLocationId);
        if (!locExists) matchedLocationId = null;
      } catch {
        matchedLocationId = null;
      }
    }

    const checkInTime = new Date(existingCheckInTime).getTime();
    const checkOutTime = new Date(now).getTime();
    const durationMinutes = Math.max(0, Math.floor((checkOutTime - checkInTime) / (1000 * 60)));

    // Get actual recorded break duration — do NOT default to any assumed value
    const totalBreakMinutes = await this.breakRepo.getTotalBreakDuration(ctx, record.id);
    // workDurationMinutes = gross duration minus any actual breaks taken
    const workDurationMinutes = Math.max(0, durationMinutes - totalBreakMinutes);

    const cleanOutMethod = (() => {
      const m = String(input.method || 'web').toLowerCase();
      if (m.includes('web') || m.includes('portal')) return 'web';
      if (m.includes('face') || m.includes('bio')) return 'biometric';
      if (m.includes('qr')) return 'qr';
      if (m.includes('gps')) return 'gps';
      if (m.includes('mob')) return 'mobile';
      return m.slice(0, 10);
    })();

    // ── AUTO OT CALCULATION ────────────────────────────────────────────────
    // Non-fatal: any failure here NEVER blocks checkout. Employee always gets their record.
    let overtimeMinutes = 0;
    let isAutoApproved = false;
    try {
      const { OTRuleService } = await import('./OTRuleService');
      const otRuleService = new OTRuleService();
      const otRule = await otRuleService.getEligibleRule(ctx, input.employeeId);

      if (otRule) {
        const db = getKnex();

        // ── Shift timing & Roster/Type configuration ───────────────────────
        const shiftRow = await db('employee_shift_assignments as esa')
          .join('shift_templates as st', 'st.id', 'esa.shift_id')
          .where('esa.employee_id', input.employeeId)
          .where('esa.organization_id', ctx.organizationId)
          .where('esa.effective_from', '<=', today)
          .where((q: any) =>
            q.whereNull('esa.effective_to').orWhere('esa.effective_to', '>=', today)
          )
          .orderBy('esa.effective_from', 'desc')
          .select('st.start_time', 'st.end_time', 'st.shift_type', 'st.roster_pattern')
          .first()
          .catch(() => null);

        const parseShiftTime = (timeStr: string, dateStr: string): Date => {
          return new Date(`${dateStr}T${timeStr}`);
        };
        let shiftStart = shiftRow?.start_time
          ? parseShiftTime(String(shiftRow.start_time), today) : null;
        let shiftEnd = shiftRow?.end_time
          ? parseShiftTime(String(shiftRow.end_time), today) : null;

        // Overnight shift handling: if shift end time is before/equal shift start time, shift ends on next calendar day
        if (shiftStart && shiftEnd && shiftEnd.getTime() <= shiftStart.getTime()) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }

        // ── Day type detection (Holiday & Weekly Off / Roster Rest Day) ──
        let isHoliday = false;
        try {
          // Direct DB check: is today in any holidays table for this org?
          const holRow = await db('holidays')
            .join('holiday_calendars as hc', 'hc.id', 'holidays.holiday_calendar_id')
            .where('hc.organization_id', ctx.organizationId)
            .whereNull('holidays.deleted_at')
            .whereRaw('DATE(holidays.holiday_date) = ?', [today])
            .first()
            .catch(() => null);
          isHoliday = !!holRow;
        } catch { /* skip */ }

        const dateObj = new Date(today);
        const dow = dateObj.getDay(); // 0=Sun, 6=Sat
        let isWeekend = false;

        // 1. If employee has a Roster Shift, check their Shift Roster Pattern:
        if (shiftRow?.shift_type === 'roster' || shiftRow?.roster_pattern) {
          const isWorking = this.shiftService.isWorkingDay(dateObj, shiftRow.roster_pattern);
          isWeekend = !isWorking; // If not a working day in roster, it's their rest day!
        } else {
          // 2. For General Shift: Check weekly_off_rules from Holiday Calendars
          try {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weekDayName = dayNames[dow];

            const weekOffRule = await db('weekly_off_rules as wor')
              .join('holiday_calendars as hc', 'hc.id', 'wor.calendar_id')
              .where('wor.organization_id', ctx.organizationId)
              .where('wor.week_day', weekDayName)
              .whereNull('wor.deleted_at')
              .first()
              .catch(() => null);

            if (weekOffRule) {
              const isAlt = Boolean(weekOffRule.is_alternate || weekOffRule.isAlternate);
              if (isAlt) {
                const dayOfMonth = dateObj.getDate();
                const nthWeekday = Math.floor((dayOfMonth - 1) / 7) + 1;
                const altWeeksStr = String(weekOffRule.alternate_weeks || weekOffRule.alternateWeeks || '');
                isWeekend = altWeeksStr.includes(String(nthWeekday));
              } else {
                isWeekend = true;
              }
            } else {
              isWeekend = (dow === 0); // Fallback: Sunday is weekly off
            }
          } catch {
            isWeekend = (dow === 0);
          }
        }

        const dayType: 'normal' | 'holiday' | 'weekend' =
          isHoliday ? 'holiday' : isWeekend ? 'weekend' : 'normal';

        // ── Weekly OT already accrued this week ─────────────────────────
        const dowNum = new Date(today).getDay();
        const daysFromMonday = dowNum === 0 ? 6 : dowNum - 1;
        const weekStartDate = new Date(today);
        weekStartDate.setDate(weekStartDate.getDate() - daysFromMonday);
        const weekStart = weekStartDate.toISOString().slice(0, 10);

        const weeklyRow = await db('attendance_records')
          .where('employee_id', input.employeeId)
          .where('organization_id', ctx.organizationId)
          .where('check_in_date', '>=', weekStart)
          .where('check_in_date', '<', today)
          .sum('overtime_minutes as total')
          .first()
          .catch(() => null);
        const alreadyAccruedWeeklyMinutes = Number((weeklyRow as any)?.total || 0);

        // ── Calculate OT ────────────────────────────────────────────────
        overtimeMinutes = otRuleService.calculateOvertimeMinutes({
          rule:                        otRule,
          checkInTime:                 new Date(existingCheckInTime),
          checkOutTime:                new Date(now),
          workDurationMinutes,
          shiftStartTime:              shiftStart,
          shiftEndTime:                shiftEnd,
          dayType,
          alreadyAccruedWeeklyMinutes,
        });

        // ── Upsert overtime_request record (prevent duplicate insertion) ─
        if (overtimeMinutes > 0) {
          const autoApproveEnabled = Boolean((otRule as any).autoOtApprove ?? (otRule as any).auto_ot_approve);
          const minMins = (otRule as any).autoApproveMinMinutes ?? (otRule as any).auto_approve_min_minutes;
          const maxMins = (otRule as any).autoApproveMaxMinutes ?? (otRule as any).auto_approve_max_minutes;

          const autoApprove =
            autoApproveEnabled &&
            (minMins == null || overtimeMinutes >= minMins) &&
            (maxMins == null || overtimeMinutes <= maxMins);

          isAutoApproved = autoApprove;

          const overtimeType = dayType === 'holiday'
            ? 'holiday_work' : dayType === 'weekend' ? 'weekend_work' : 'extra_hours';

          const existingReq = await db('overtime_requests')
            .where({
              employee_id: input.employeeId,
              organization_id: ctx.organizationId,
              overtime_date: today,
              source: 'auto_checkout',
            })
            .first()
            .catch(() => null);

          if (existingReq) {
            await db('overtime_requests')
              .where('id', existingReq.id)
              .update({
                overtime_hours:   parseFloat((overtimeMinutes / 60).toFixed(2)),
                overtime_minutes: overtimeMinutes,
                overtime_type:    overtimeType,
                day_type:         dayType,
                approval_status:  autoApprove ? 'approved' : 'pending',
                approved_by:      autoApprove ? ctx.userId : null,
                approval_date:    autoApprove
                  ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
                updated_at:       new Date(),
                updated_by:       ctx.userId,
              });
          } else {
            await db('overtime_requests').insert({
              uuid:                 uuidv4(),
              employee_id:          input.employeeId,
              organization_id:      ctx.organizationId,
              overtime_date:        today,
              overtime_hours:       parseFloat((overtimeMinutes / 60).toFixed(2)),
              overtime_minutes:     overtimeMinutes,
              overtime_type:        overtimeType,
              day_type:             dayType,
              source:               'auto_checkout',
              approval_status:      autoApprove ? 'approved' : 'pending',
              approved_by:          autoApprove ? ctx.userId : null,
              approval_date:        autoApprove
                ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
              created_by:           ctx.userId,
              updated_by:           ctx.userId,
            });
          }
        }
      }
    } catch (otErr) {
      logger.warn('[AttendanceService.checkOut] OT calculation failed (non-fatal):', otErr);
    }
    // ── END AUTO OT ────────────────────────────────────────────────────────

    record = await this.recordRepo.update(ctx, record.id, {
      check_out_time:        now,
      check_out_location_id: matchedLocationId,
      check_out_method:      cleanOutMethod,
      duration_minutes:      durationMinutes,
      break_time_minutes:    totalBreakMinutes,
      work_duration_minutes: workDurationMinutes,
      overtime_minutes:      isAutoApproved ? overtimeMinutes : 0,
    });

    // Create session record
    await this.sessionRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      session_type: 'check_out',
      session_timestamp: now,
      device_latitude: input.latitude || null,
      device_longitude: input.longitude || null,
      geofence_matched: geofenceMatched,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CHECK_OUT',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      afterState: { checkOutTime: now, workDuration: workDurationMinutes, geofenceMatched },
    });

    return record;
  }

  /**
   * Start a break (break type will be selected when stopping the break)
   */
  async breakIn(ctx: TenantContext, input: {
    employeeId: number;
  }): Promise<any> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const existingBreaks = await this.breakRepo.getByRecord(ctx, record.id);
    const activeBreak = existingBreaks.find(b => b.status === 'active' || b.status === 'paused');
    if (activeBreak) {
      throw new ValidationError('You are already on an active break');
    }

    // Dynamic shift break allowance check
    let assignedBreakMinutes = 60;
    try {
      const assignedShift = await this.shiftService.getEmployeeShift(ctx, input.employeeId, today);
      if (assignedShift && (assignedShift.break_duration_minutes || assignedShift.breakDurationMinutes)) {
        assignedBreakMinutes = Number(assignedShift.break_duration_minutes || assignedShift.breakDurationMinutes);
      }
    } catch (e) { }

    const totalUsed = existingBreaks
      .filter(b => b.status === 'completed')
      .reduce((acc, b) => acc + (Number(b.break_duration_minutes) || 0), 0);

    if (totalUsed >= assignedBreakMinutes) {
      throw new ValidationError(`Daily break quota for today (${assignedBreakMinutes} Mins) has already been fully used.`);
    }

    const remainingBreakMinutes = Math.max(0, assignedBreakMinutes - totalUsed);

    // Create break record with NO break type (type is selected when break ends)
    const breakRecord = await this.breakRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      break_start_time: now,
      break_type: null,
      break_setting_id: null,
      status: 'active',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Create session record
    await this.sessionRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      session_type: 'break_in',
      session_timestamp: now,
    } as any);

    return {
      ...record,
      activeBreak: breakRecord,
      assignedBreakMinutes,
      totalUsedMinutes: totalUsed,
      remainingBreakMinutes,
    };
  }

  /**
   * Pause an active break
   */
  async pauseBreak(ctx: TenantContext, employeeId: number): Promise<any> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const existingBreaks = await this.breakRepo.getByRecord(ctx, record.id);
    const activeBreak = existingBreaks.find(b => b.status === 'active');
    if (!activeBreak) {
      throw new ValidationError('No active break found to pause');
    }

    await this.breakRepo.update(ctx, activeBreak.id, {
      status: 'paused',
    });

    try {
      await this.sessionRepo.create(ctx, {
        uuid: uuidv4(),
        attendance_record_id: record.id,
        session_type: 'break_out',
        session_notes: 'break_pause',
        session_timestamp: now,
      } as any);
    } catch (e) {
      console.warn('[AttendanceService] Failed to log break_pause session:', e);
    }

    return { ...record, activeBreak: { ...activeBreak, status: 'paused' } };
  }

  /**
   * Resume a paused break
   */
  async resumeBreak(ctx: TenantContext, employeeId: number): Promise<any> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const existingBreaks = await this.breakRepo.getByRecord(ctx, record.id);
    const pausedBreak = existingBreaks.find(b => b.status === 'paused');
    if (!pausedBreak) {
      throw new ValidationError('No paused break found to resume');
    }

    await this.breakRepo.update(ctx, pausedBreak.id, {
      status: 'active',
    });

    try {
      await this.sessionRepo.create(ctx, {
        uuid: uuidv4(),
        attendance_record_id: record.id,
        session_type: 'break_in',
        session_notes: 'break_resume',
        session_timestamp: now,
      } as any);
    } catch (e) {
      console.warn('[AttendanceService] Failed to log break_resume session:', e);
    }

    return { ...record, activeBreak: { ...pausedBreak, status: 'active' } };
  }

  /**
   * End a break — break type is selected at this point and saved
   */
  async breakOut(ctx: TenantContext, employeeId: number, options?: {
    breakTypeName?: string;
    breakSettingId?: number;
  }): Promise<AttendanceRecord> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const existingBreaks = await this.breakRepo.getByRecord(ctx, record.id);
    const activeBreak = existingBreaks.find(b => b.status === 'active' || b.status === 'paused');
    if (!activeBreak) {
      throw new NotFoundError('No active or paused break found');
    }

    const rawStartTime = activeBreak.break_start_time || (activeBreak as any).breakStartTime || activeBreak.created_at;
    let breakStartTime = NaN;

    if (rawStartTime instanceof Date) {
      breakStartTime = rawStartTime.getTime();
    } else if (typeof rawStartTime === 'number') {
      breakStartTime = rawStartTime;
    } else if (typeof rawStartTime === 'string') {
      const isoStart = rawStartTime.includes('T') ? rawStartTime : rawStartTime.replace(' ', 'T');
      breakStartTime = new Date(isoStart).getTime();
      if (isNaN(breakStartTime)) {
        breakStartTime = new Date(rawStartTime).getTime();
      }
    }

    const parsedEndTime = new Date(now.replace(' ', 'T')).getTime();
    const breakEndTime = !isNaN(parsedEndTime) ? parsedEndTime : Date.now();
    let breakDurationMinutes = 1;
    if (!isNaN(breakStartTime) && !isNaN(breakEndTime) && breakEndTime > breakStartTime) {
      breakDurationMinutes = Math.max(1, Math.floor((breakEndTime - breakStartTime) / (1000 * 60)));
    }
    if (isNaN(breakDurationMinutes) || !isFinite(breakDurationMinutes)) {
      breakDurationMinutes = 1;
    }

    // Resolve break type name — use provided name, fallback to existing, then 'General Break'
    const resolvedBreakType = options?.breakTypeName ||
      activeBreak.break_type ||
      'General Break';

    await this.breakRepo.update(ctx, activeBreak.id, {
      break_end_time: now,
      break_duration_minutes: breakDurationMinutes,
      break_type: resolvedBreakType,
      ...(options?.breakSettingId ? { break_setting_id: options.breakSettingId } : {}),
      status: 'completed',
    } as any);

    // Automatically recalculate and sync cumulative break duration in DB
    const totalBreakMinutes = await this.breakRepo.getTotalBreakDuration(ctx, record.id);
    await this.recordRepo.update(ctx, record.id, {
      break_time_minutes: totalBreakMinutes,
    });

    // Create session record
    await this.sessionRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      session_type: 'break_out',
      session_timestamp: now,
      session_notes: resolvedBreakType,
    } as any);

    return record;
  }

  /**
   * Get break logs — employee-wise, date-wise, break-type-wise breakdown for reports
   */
  async getBreakLogs(ctx: TenantContext, filters: {
    companyId?: number;
    locationId?: number;
    departmentId?: number;
    reportingManagerId?: number;
    employeeId?: number;
    startDate?: string;
    endDate?: string;
    breakTypeName?: string;
  }): Promise<any[]> {
    return this.breakRepo.getBreakLogs(ctx, filters);
  }

  /**
   * Get today's attendance record
   */
  async getTodayRecord(ctx: TenantContext, employeeId: number): Promise<AttendanceRecord | null> {
    const today = getLocalYYYYMMDD();
    return this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
  }

  /**
   * Enrich attendance records with real location names from attendance_geofences/locations
   */
  private async attachLocationNames(ctx: TenantContext, records: any[]) {
    if (!records || records.length === 0) return records;
    try {
      const { db } = await import('../../../db/knex');
      const [locationsAtt, geofences, locationsGen, branches] = await Promise.all([
        db('attendance_locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('attendance_geofences').where('organization_id', ctx.organizationId).catch(() => []),
        db('locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('branches').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      ]);

      const locMap = new Map<number, string>();
      for (const loc of locationsGen) {
        const id = Number(loc.id);
        const name = loc.name || loc.location_name || loc.locationName;
        if (id && name) locMap.set(id, name);
      }
      for (const b of branches) {
        const id = Number(b.id);
        const name = b.name;
        if (id && name) locMap.set(id, name);
      }
      for (const loc of locationsAtt) {
        const id = Number(loc.id);
        const name = loc.location_name || loc.locationName || loc.name;
        if (id && name) locMap.set(id, name);
      }
      for (const g of geofences) {
        const geoId = Number(g.id);
        const locId = Number(g.location_id || g.locationId);
        const name = g.geofence_name || g.geofenceName || g.location_name || g.locationName;
        if (geoId && name) locMap.set(geoId, name);
        if (locId && name) locMap.set(locId, name);
      }

      return records.map((rec: any) => {
        const inLocId = rec.check_in_location_id ?? rec.checkInLocationId;
        const outLocId = rec.check_out_location_id ?? rec.checkOutLocationId;

        const checkInLocName = inLocId ? (locMap.get(Number(inLocId)) || rec.check_in_location_name || rec.checkInLocationName || `Location ${inLocId}`) : (rec.check_in_location_name || rec.checkInLocationName || null);
        const checkOutLocName = outLocId ? (locMap.get(Number(outLocId)) || rec.check_out_location_name || rec.checkOutLocationName || `Location ${outLocId}`) : (rec.check_out_location_name || rec.checkOutLocationName || null);

        return {
          ...rec,
          checkInLocationName: checkInLocName,
          check_in_location_name: checkInLocName,
          checkOutLocationName: checkOutLocName,
          check_out_location_name: checkOutLocName,
        };
      });
    } catch (e) {
      console.warn('[AttendanceService] attachLocationNames warning:', e);
      return records;
    }
  }

  /**
   * Get attendance history for an employee
   */
  async getHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    const res = await this.recordRepo.getEmployeeHistory(ctx, employeeId, options);
    res.items = await this.attachLocationNames(ctx, res.items);
    return res;
  }

  /**
   * Get attendance by date range
   */
  async getByDateRange(
    ctx: TenantContext,
    employeeId: number,
    startDate: string,
    endDate: string,
    options?: ListQueryOptions
  ) {
    const res = await this.recordRepo.getByDateRange(ctx, employeeId, startDate, endDate, options);
    res.items = await this.attachLocationNames(ctx, res.items);
    return res;
  }

  /**
   * Mark attendance manually
   */
  async markAttendance(ctx: TenantContext, input: {
    employeeId: number;
    date: string;
    status: AttendanceStatus;
  }): Promise<AttendanceRecord> {
    let record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, input.date);

    if (!record) {
      record = await this.recordRepo.create(ctx, {
        uuid: uuidv4(),
        employee_id: input.employeeId,
        check_in_date: input.date,
        status: input.status,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);
    } else {
      record = await this.recordRepo.update(ctx, record.id, { status: input.status });
    }

    // Audit log
    await this.auditService.log(ctx, {
      action: 'MARK_ATTENDANCE',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      afterState: { status: input.status },
    });

    return record;
  }

  /**
   * Get today's check-in status
   */
  async getCheckInStatus(ctx: TenantContext, employeeId: number) {
    const today = getLocalYYYYMMDD();
    const record = await this.getTodayRecord(ctx, employeeId);
    let activeBreak = null;
    let totalBreakMinutes = 0;
    let assignedBreakMinutes = 60;
    let resolvedShift: any = null;

    try {
      resolvedShift = await this.shiftService.getEmployeeShift(ctx, employeeId, today);
      if (resolvedShift && (resolvedShift.break_duration_minutes || resolvedShift.breakDurationMinutes)) {
        assignedBreakMinutes = Number(resolvedShift.break_duration_minutes || resolvedShift.breakDurationMinutes);
      }
    } catch (e) {
      console.warn('[AttendanceService] getCheckInStatus shift error:', e);
    }

    // Resolve holiday / week-off status for today with full permission check
    const holidayStatus = await this.resolveHolidayStatus(ctx, employeeId, today);
    const hasShift = !!resolvedShift;
    const isRestrictedDay = holidayStatus.isHoliday || holidayStatus.isWeekOff;
    // Punch is blocked when: restricted day without permission, OR no shift on a normal working day
    const isAttendanceBlocked = (isRestrictedDay && !holidayStatus.isPunchAllowed) || (!hasShift && !isRestrictedDay);

    if (record) {
      try {
        const existingBreaks = await this.breakRepo.getByRecord(ctx, record.id);
        activeBreak = existingBreaks.find(b => b.status === 'active' || b.status === 'paused') || null;
        totalBreakMinutes = await this.breakRepo.getTotalBreakDuration(ctx, record.id);
      } catch (e) {
        console.warn('[AttendanceService] getCheckInStatus break error:', e);
      }
    }

    const remainingBreakMinutes = Math.max(0, assignedBreakMinutes - totalBreakMinutes);
    const isBreakQuotaExhausted = remainingBreakMinutes <= 0 && !activeBreak;

    // Compute live shift entry status (what zone is the employee in right now)
    const nowForStatus = new Date();
    const liveEntry = computeShiftEntryStatus(resolvedShift || {}, nowForStatus, today);

    const fmt = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const shiftInfo = resolvedShift ? {
      shiftName: resolvedShift.shift_name || resolvedShift.shiftName || null,
      startTime: resolvedShift.start_time || resolvedShift.startTime || null,
      endTime: resolvedShift.end_time || resolvedShift.endTime || null,
      gracePeriodMinutes: Number(resolvedShift.grace_period_minutes ?? resolvedShift.gracePeriodMinutes ?? 0),
      durationHours: Number(resolvedShift.duration_hours ?? resolvedShift.durationHours ?? 8.5),
      graceDeadline: liveEntry.graceDeadlineLabel,
      halfDayDeadline: liveEntry.halfDayDeadlineLabel,
      currentEntryStatus: liveEntry.entryStatus,   // 'on_time' | 'late' | 'half_day' | 'no_shift'
      lateMinutesNow: liveEntry.lateMinutes,
    } : null;

    return {
      isCheckedIn: !!record && !!(record.checkInTime ?? record.check_in_time),
      isCheckedOut: !!record && !!(record.checkOutTime ?? record.check_out_time),
      checkInTime: record ? (record.checkInTime ?? record.check_in_time) : null,
      checkOutTime: record ? (record.checkOutTime ?? record.check_out_time) : null,
      duration: record ? (record.durationMinutes ?? record.duration_minutes) : null,
      isOnBreak: !!activeBreak,
      // ── Holiday & Week-Off Gate fields ────────────────────────────────────────
      isHoliday: holidayStatus.isHoliday,
      isWeekOff: holidayStatus.isWeekOff,
      holidayName: holidayStatus.holidayName ?? null,
      holidayType: holidayStatus.holidayType ?? null,
      isPunchAllowedOnHoliday: holidayStatus.isPunchAllowed,
      holidayPunchReason: holidayStatus.punchAllowedReason ?? null,
      hasPendingRequest: holidayStatus.hasPendingRequest ?? false,
      hasShift,
      isAttendanceBlocked,
      isBreakPaused: activeBreak?.status === 'paused',
      isBreakCompleted: isBreakQuotaExhausted,
      isBreakQuotaExhausted,
      assignedBreakMinutes,
      totalBreakMinutes,
      remainingBreakMinutes,
      activeBreak: activeBreak ? {
        id: activeBreak.id,
        breakStartTime: activeBreak.break_start_time || (activeBreak as any).breakStartTime,
        breakType: activeBreak.break_type || (activeBreak as any).breakType,
        status: activeBreak.status,
      } : null,
      shiftInfo,
    };
  }

  /**
   * Get filter options for reports from database.
   * When companyId is provided, cascades departments, employees, locations and
   * reporting officers to that company scope only.
   * Companies list always returns all companies for the org (used for the top-level picker).
   */
  async getReportFilterOptions(ctx: TenantContext, companyId?: string | number | null, inputDeptIds?: number[] | string[]) {
    try {
      const { db } = await import('../../../db/knex');

      const isValidCompanyId = companyId != null && String(companyId) !== 'all' && String(companyId) !== 'undefined';

      // ── 1. Companies ─────────────────────────────────────────────────────────
      // Always load all companies for the org so the company dropdown is always populated.
      const [companyRows, currentOrg] = await Promise.all([
        db('company')
          .where(function () {
            this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
          })
          .whereNull('deleted_at')
          .orderBy('is_parent', 'desc')
          .select('company_id', 'name')
          .catch(() => []),
        db('organizations').where('id', ctx.organizationId).first().catch(() => null),
      ]);

      const companies = companyRows.length > 0
        ? companyRows.map((c: any) => ({ id: String(c.companyId ?? c.company_id), name: c.name }))
        : [{ id: String(ctx.organizationId), name: currentOrg?.name || 'Primary Organization' }];

      // ── 2. Locations ─────────────────────────────────────────────────────────
      let locationQuery = db('locations')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where('status', 'active');
      if (isValidCompanyId) {
        locationQuery = locationQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }
      const locationRows = await locationQuery.select('id', 'name').orderBy('name', 'asc').catch(() => []);
      const formattedLocations = locationRows.map((l: any) => ({
        id: String(l.id),
        name: l.name,
      }));

      // ── 3. Departments ───────────────────────────────────────────────────────
      let departmentQuery = db('departments')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
      if (isValidCompanyId) {
        departmentQuery = departmentQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }
      const departmentRows = await departmentQuery.select('id', 'name').orderBy('name', 'asc').catch(() => []);
      const departmentIds = departmentRows.map((d: any) => d.id);
      const formattedDepartments = departmentRows.map((d: any) => ({
        id: String(d.id),
        name: d.name || `Department ${d.id}`,
      }));

      // ── 4. Reporting Officers ─────────────────────────────────────────────────
      let officerQuery = db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where(function () {
          this.whereIn('id', function () {
            this.select('reporting_manager_id')
              .from('employees')
              .where('organization_id', ctx.organizationId)
              .whereNull('deleted_at')
              .whereNotNull('reporting_manager_id');
          }).orWhereIn('access_role', ['organization_admin', 'hr_admin', 'hr_manager', 'department_head', 'manager', 'team_lead']);
        });

      if (isValidCompanyId) {
        officerQuery = officerQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }

      const officerRows = await officerQuery
        .select('id', 'first_name', 'last_name', 'employee_code')
        .orderBy('first_name', 'asc')
        .catch(() => []);

      const formattedReportingOfficers = officerRows.map((e: any) => ({
        id: String(e.id),
        name: `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || `Officer ${e.id}`,
      }));

      // ── 5. Employees ─────────────────────────────────────────────────────────
      let employeeQuery = db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where(function () {
          this.where('is_ceo', 0).orWhereNull('is_ceo');
        });
      if (isValidCompanyId) {
        employeeQuery = employeeQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }
      const filterDepts = (inputDeptIds && inputDeptIds.length > 0) ? inputDeptIds : departmentIds;
      if (filterDepts && filterDepts.length > 0) {
        employeeQuery = employeeQuery.whereIn('current_department_id', filterDepts);
      }
      const employeeRows = await employeeQuery.select('id', 'first_name', 'last_name', 'employee_code').orderBy('first_name', 'asc').catch(() => []);
      const formattedEmployees = employeeRows.map((e: any) => ({
        id: String(e.id),
        name: `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || `Employee ${e.id}`,
        code: e.employeeCode ?? e.employee_code ?? '',
      }));

      return {
        companies,
        locations: formattedLocations,
        departments: formattedDepartments,
        reportingOfficers: formattedReportingOfficers,
        employees: formattedEmployees,
      };
    } catch (error) {
      console.error('[AttendanceService] Error in getReportFilterOptions:', error);
      return {
        companies: [{ id: String(ctx.organizationId), name: 'Primary Organization' }],
        locations: [],
        departments: [],
        reportingOfficers: [],
        employees: [],
      };
    }
  }

  /**
   * Get tabular attendance report from database
   */
  async getTabularReportData(ctx: TenantContext, params: any) {
    const {
      fromDate,
      toDate,
      status: filterStatus,
      statusFilters,
      workType,
    } = params || {};

    const sf = typeof statusFilters === 'string'
      ? (() => { try { return JSON.parse(statusFilters); } catch { return {}; } })()
      : (statusFilters || {});

    const rawEmp = params?.employees ?? params?.['employees[]'] ?? params?.employeeId ?? params?.employee_id;
    const rawLoc = params?.locations ?? params?.['locations[]'] ?? params?.locationId ?? params?.location_id;
    const rawDept = params?.departments ?? params?.['departments[]'] ?? params?.departmentId ?? params?.department_id;
    const rawRo = params?.reportingOfficers ?? params?.['reportingOfficers[]'] ?? params?.reportingOfficerId ?? params?.reporting_officer_id;
    const rawCompany = params?.companies ?? params?.['companies[]'] ?? params?.companyId ?? params?.company_id;

    const isAllCompanies = String(rawCompany).includes('all') || rawCompany === 'all' || !rawCompany || (Array.isArray(rawCompany) && rawCompany.length === 0);

    const { db } = await import('../../../db/knex');

    const parseIds = (val: any): number[] => {
      if (!val) return [];
      let rawArr: any[] = [];
      if (Array.isArray(val)) {
        rawArr = val;
      } else if (typeof val === 'object' && val !== null) {
        rawArr = Object.values(val);
      } else if (typeof val === 'string') {
        rawArr = val.split(',');
      } else if (typeof val === 'number') {
        rawArr = [val];
      }

      return rawArr
        .map((x: any) => {
          if (typeof x === 'number') return x;
          const str = String(x).trim();
          if (!str || str === '[object Object]') return NaN;
          if (/^\d+$/.test(str)) return parseInt(str, 10);
          const match = str.match(/\d+/);
          return match ? parseInt(match[0], 10) : NaN;
        })
        .filter((n: number) => !isNaN(n));
    };

    const parseStrings = (val: any): string[] => {
      if (!val) return [];
      let rawArr: any[] = [];
      if (Array.isArray(val)) {
        rawArr = val;
      } else if (typeof val === 'object' && val !== null) {
        rawArr = Object.values(val);
      } else if (typeof val === 'string') {
        rawArr = val.split(',');
      }
      return rawArr.map((x: any) => String(x).trim()).filter((s) => s && s !== '[object Object]');
    };

    const targetEmpIds = parseIds(rawEmp);
    const targetEmpStrings = parseStrings(rawEmp);
    const targetDeptIds = parseIds(rawDept);
    const targetRoIds = parseIds(rawRo);
    const targetCompanyIds = isAllCompanies ? [] : parseIds(rawCompany);

    // 1. Fetch matching employees from DB
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .where(function () {
        this.where('is_ceo', 0).orWhereNull('is_ceo');
      });

    if (targetCompanyIds.length > 0) {
      empQuery = empQuery.where(function () {
        this.whereIn('company_id', targetCompanyIds).orWhereNull('company_id');
      });
    }

    if (filterStatus && filterStatus !== 'both' && filterStatus !== 'choose' && filterStatus !== 'all') {
      if (filterStatus === 'active') {
        empQuery = empQuery.whereIn('status', ['active', 'onboarding', 'probation', 'notice']);
      } else if (['inactive', 'terminated', 'exit', 'alumni'].includes(filterStatus)) {
        empQuery = empQuery.where('status', filterStatus);
      }
    }
    if (targetEmpIds.length > 0 || targetEmpStrings.length > 0) {
      empQuery = empQuery.where((builder) => {
        if (targetEmpIds.length > 0) {
          builder.whereIn('id', targetEmpIds);
        }
        if (targetEmpStrings.length > 0) {
          builder.orWhereIn('employee_code', targetEmpStrings);
        }
      });
    }
    if (targetDeptIds.length > 0) {
      empQuery = empQuery.whereIn('current_department_id', targetDeptIds);
    }
    if (targetRoIds.length > 0) {
      empQuery = empQuery.whereIn('reporting_manager_id', targetRoIds);
    }

    const employeeList = await empQuery.catch(() => []);
    if (employeeList.length === 0) {
      return [];
    }

    const matchedEmpIds = employeeList.map((e: any) => e.id);
    const empMap = new Map<number, any>();
    employeeList.forEach((e: any) => empMap.set(e.id, e));

    const deptRows = await db('departments')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .catch(() => []);
    const deptMap = new Map<number, string>();
    deptRows.forEach((d: any) => deptMap.set(Number(d.id), d.name));

    const endStr = toDate || new Date().toISOString().split('T')[0];
    let startStr = fromDate;
    if (!startStr) {
      const d = new Date(endStr);
      d.setDate(d.getDate() - 14);
      startStr = d.toISOString().split('T')[0];
    }

    // 2. Fetch actual attendance records, shift assignments, and break data from DB
    const [dbRecords, shiftAssignments, breakRows] = await Promise.all([
      db('attendance_records')
        .leftJoin('attendance_locations as in_loc', 'attendance_records.check_in_location_id', 'in_loc.id')
        .leftJoin('attendance_locations as out_loc', 'attendance_records.check_out_location_id', 'out_loc.id')
        .leftJoin('employees as emp', 'attendance_records.employee_id', 'emp.id')
        .leftJoin('attendance_locations as emp_loc', 'emp.current_location_id', 'emp_loc.id')
        .leftJoin('shift_templates as st_rec', 'attendance_records.shift_id', 'st_rec.id')
        .where('attendance_records.organization_id', ctx.organizationId)
        .whereIn('attendance_records.employee_id', matchedEmpIds)
        .select(
          'attendance_records.*',
          'in_loc.location_name as check_in_location_name',
          'out_loc.location_name as check_out_location_name',
          'emp_loc.location_name as emp_location_name',
          'st_rec.shift_name as rec_shift_name',
          'st_rec.start_time as rec_shift_start_time',
          'st_rec.end_time as rec_shift_end_time'
        )
        .orderBy('attendance_records.id', 'desc')
        .catch(() => []),

      db('employee_shift_assignments as esa')
        .join('shift_templates as st', 'st.id', 'esa.shift_id')
        .where('esa.organization_id', ctx.organizationId)
        .whereIn('esa.employee_id', matchedEmpIds)
        .whereNull('esa.deleted_at')
        .select(
          'esa.employee_id',
          'esa.assignment_start_date',
          'esa.assignment_end_date',
          'st.shift_name',
          'st.start_time',
          'st.end_time',
          'st.duration_hours'
        )
        .catch(() => []),

      // Fetch all break records (all statuses) to compute real break hours
      db('attendance_breaks')
        .whereIn(
          'attendance_record_id',
          db('attendance_records')
            .where('organization_id', ctx.organizationId)
            .whereIn('employee_id', matchedEmpIds)
            .select('id')
        )
        .whereNull('deleted_at')
        .select('attendance_record_id', 'break_duration_minutes', 'break_start_time', 'break_end_time', 'status', 'updated_at')
        .catch(() => [])
    ]);

    // Build a map: attendance_record_id → total break minutes
    // Handles all three statuses:
    //   'completed'  → use stored break_duration_minutes
    //   'active'     → elapsed from break_start_time to now
    //   'paused'     → pauseBreak() only writes status, not duration;
    //                  calculate elapsed from break_start_time to updated_at
    const breakMinsMap = new Map<number, number>();
    for (const br of breakRows) {
      const recId = Number(br.attendance_record_id);
      let mins = 0;

      if (br.status === 'completed' && br.break_duration_minutes != null) {
        // Preferred: stored computed duration
        mins = Number(br.break_duration_minutes);
      } else if (br.status === 'active' && br.break_start_time) {
        // Still in progress — calculate up to right now
        const startMs = new Date(br.break_start_time).getTime();
        if (!isNaN(startMs)) {
          mins = Math.floor((Date.now() - startMs) / 60000);
        }
      } else if (br.status === 'paused' && br.break_start_time) {
        // Paused: pauseBreak() never writes break_duration_minutes.
        // Use break_end_time (when set) or updated_at as the pause moment.
        const startMs = new Date(br.break_start_time).getTime();
        const pauseMoment = br.break_end_time || br.updated_at;
        const endMs = pauseMoment ? new Date(pauseMoment).getTime() : Date.now();
        if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
          mins = Math.floor((endMs - startMs) / 60000);
        }
      }

      if (!isNaN(mins) && mins > 0) {
        breakMinsMap.set(recId, (breakMinsMap.get(recId) || 0) + mins);
      }
    }

    const getDateStrKey = (val: any): string => {
      if (!val) return '';
      if (val instanceof Date && !isNaN(val.getTime())) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const str = String(val).trim();
      const match = str.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      return str.slice(0, 10);
    };

    const recordMap = new Map<string, any>();
    for (const rec of dbRecords) {
      const checkInDate = rec.check_in_date || rec.checkInDate;
      const checkInTime = rec.check_in_time || rec.checkInTime;
      const empId = rec.employee_id || rec.employeeId;
      const dateKey = getDateStrKey(checkInDate || checkInTime);
      if (dateKey && empId) {
        const key = `${Number(empId)}_${dateKey}`;
        if (!recordMap.has(key)) {
          recordMap.set(key, rec);
        }
      }
    }

    const getDatesInRange = (sStr: string, eStr: string): string[] => {
      const result: string[] = [];
      const partsS = sStr.split('-').map(Number);
      const partsE = eStr.split('-').map(Number);
      if (partsS.length !== 3 || partsE.length !== 3) return result;

      const dt = new Date(partsS[0], partsS[1] - 1, partsS[2], 12, 0, 0);
      const endDt = new Date(partsE[0], partsE[1] - 1, partsE[2], 12, 0, 0);

      while (dt <= endDt && result.length <= 90) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        result.push(`${y}-${m}-${d}`);
        dt.setDate(dt.getDate() + 1);
      }
      return result;
    };

    const dates = getDatesInRange(startStr, endStr);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const rows: any[] = [];
    let rowIdCounter = 1;

    const [locationsGen, locationsAtt, geofencesList, branchesList, shiftTemplatesList] = await Promise.all([
      db('locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      db('attendance_locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      db('attendance_geofences').where('organization_id', ctx.organizationId).catch(() => []),
      db('branches').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      db('shift_templates').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
    ]);

    const defaultOrgShift = shiftTemplatesList.find((s: any) => s.is_default || s.isDefault) || shiftTemplatesList[0];

    const locationNameMap = new Map<number, string>();
    locationsGen.forEach((l: any) => locationNameMap.set(Number(l.id), l.name || l.location_name));
    locationsAtt.forEach((l: any) => locationNameMap.set(Number(l.id), l.location_name || l.name));
    branchesList.forEach((b: any) => locationNameMap.set(Number(b.id), b.name));
    geofencesList.forEach((g: any) => {
      const gId = Number(g.id);
      const lId = Number(g.location_id || g.locationId);
      const gName = g.geofence_name || g.geofenceName || g.location_name || g.locationName;
      if (gId && gName) locationNameMap.set(gId, gName);
      if (lId && gName) locationNameMap.set(lId, gName);
    });

    // ── Pre-fetch holiday dates for the report range (org-wide, non-optional) ────────────
    // We fetch all calendars for the org (both location-specific and default)
    // so that any holiday that applies to any employee in this org is included.
    // Per-employee location filtering would require N+1 queries; org-wide is a
    // safe conservative approach for report generation.
    const reportHolidaySet = new Map<string, string>(); // holiday_date -> holiday_name
    try {
      const reportYear = parseInt(startStr.split('-')[0], 10);
      const calendarIds = await db('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where('year', reportYear)
        .select('id')
        .catch(() => []);
      const calIds = calendarIds.map((c: any) => Number(c.id));
      if (calIds.length > 0) {
        const holidayRows = await db('holidays')
          .whereIn('holiday_calendar_id', calIds)
          .where('holiday_date', '>=', startStr)
          .where('holiday_date', '<=', endStr)
          .where('is_optional', false)
          .select('holiday_date', 'holiday_name')
          .catch(() => []);
        holidayRows.forEach((h: any) => {
          const d = h.holiday_date || h.holidayDate;
          const n = h.holiday_name || h.holidayName;
          if (d) reportHolidaySet.set(String(d).slice(0, 10), n || 'Holiday');
        });
      }
    } catch (e) {
      console.warn('[TabularReport] Failed to fetch holiday set (non-fatal):', e);
    }

    for (const dateStr of dates) {
      const parts = dateStr.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      const dayOfWeekNum = dateObj.getDay();
      const dayName = daysOfWeek[dayOfWeekNum];
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

      for (const emp of employeeList) {
        const empId = Number(emp.id);
        const empName = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() || `Employee ${empId}`;
        const dbRec = recordMap.get(`${empId}_${dateStr}`);

        let dayStatus: string;
        let isLate = 'No';
        let actualTiming = '-- - --';
        let actualWorkingHours = '00:00';
        let lateMins = '00:00';
        let breakHoursForRow = '00:00';
        const normalizeLocationName = (locName: string | null | undefined): string => {
          if (!locName || locName === 'Primary Office' || locName === 'Primary Office - Corporate HQ') {
            return 'Kosqu Technolab';
          }
          return locName;
        };

        const empRawLoc = emp.location_name || emp.locationName || dbRec?.emp_location_name || dbRec?.empLocationName;
        const empDefaultLoc = normalizeLocationName(empRawLoc);
        let checkInLoc = empDefaultLoc;
        let checkOutLoc = empDefaultLoc;
        let formattedIn: string | null = null;
        let formattedOut: string | null = null;


        if (dbRec) {
          const rawStatus = dbRec.status || 'present';
          dayStatus = rawStatus === 'present'
            ? 'Full Day'
            : rawStatus === 'half_day'
              ? 'Half Day'
              : rawStatus === 'absent'
                ? 'Absent'
                : rawStatus === 'on_leave'
                  ? 'Leave'
                  : rawStatus === 'weekly_off'
                    ? 'Week Off'
                    : 'Full Day';

          isLate = (dbRec.is_late || dbRec.isLate) ? 'Yes' : 'No';
          lateMins = (dbRec.is_late || dbRec.isLate) ? '00:15' : '00:00';

          const inTime = dbRec.check_in_time || dbRec.checkInTime;
          const outTime = dbRec.check_out_time || dbRec.checkOutTime;

          const inLocId = dbRec.check_in_location_id || dbRec.checkInLocationId;
          const outLocId = dbRec.check_out_location_id || dbRec.checkOutLocationId;

          const rawInLoc = (inLocId ? locationNameMap.get(Number(inLocId)) : null) || dbRec.check_in_location_name || dbRec.checkInLocationName || dbRec.check_in_location || dbRec.checkInLocation || dbRec.location;
          const rawOutLoc = (outLocId ? locationNameMap.get(Number(outLocId)) : null) || dbRec.check_out_location_name || dbRec.checkOutLocationName || dbRec.check_out_location || dbRec.checkOutLocation || dbRec.location;

          const resolvedInLoc = normalizeLocationName(rawInLoc);
          const resolvedOutLoc = normalizeLocationName(rawOutLoc);

          if (resolvedInLoc) {
            checkInLoc = resolvedInLoc;
          }
          if (resolvedOutLoc) {
            checkOutLoc = resolvedOutLoc;
          }

          const formatTimeStr = (t: any): string | null => {
            if (!t) return null;
            if (t instanceof Date && !isNaN(t.getTime())) {
              const hh = String(t.getHours()).padStart(2, '0');
              const mm = String(t.getMinutes()).padStart(2, '0');
              return `${hh}:${mm}`;
            }
            const str = String(t).trim();
            if (str.includes(' ')) {
              const parts = str.split(' ');
              const timePart = parts[parts.length - 1];
              if (timePart && timePart.includes(':')) {
                return timePart.slice(0, 5);
              }
            }
            if (str.includes('T')) {
              const timePart = str.split('T')[1];
              if (timePart && timePart.includes(':')) {
                return timePart.slice(0, 5);
              }
            }
            if (str.includes(':')) {
              const parts = str.split(':');
              return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
            return str.length >= 5 ? str.slice(0, 5) : str;
          };

          formattedIn = formatTimeStr(inTime);
          formattedOut = formatTimeStr(outTime);

          if (formattedIn && formattedOut) {
            actualTiming = `${formattedIn} - ${formattedOut}`;
          } else if (formattedIn) {
            actualTiming = `${formattedIn} - Active`;
          } else if (formattedOut) {
            actualTiming = `Pending - ${formattedOut}`;
          } else {
            actualTiming = '-- - --';
          }

          let durationMins = 0;
          if (dbRec.work_duration_minutes !== undefined && dbRec.work_duration_minutes !== null) {
            durationMins = Number(dbRec.work_duration_minutes);
          } else if (dbRec.duration_minutes !== undefined && dbRec.duration_minutes !== null) {
            durationMins = Number(dbRec.duration_minutes);
          } else if (inTime && outTime) {
            const dIn = new Date(inTime);
            const dOut = new Date(outTime);
            if (!isNaN(dIn.getTime()) && !isNaN(dOut.getTime()) && dOut >= dIn) {
              durationMins = Math.floor((dOut.getTime() - dIn.getTime()) / (1000 * 60));
            }
          }

          // Primary: sum from individual break records in breakMinsMap
          // Fallback: break_time_minutes synced to attendance_records by breakOut()
          const mapBreakMins = breakMinsMap.get(Number(dbRec.id)) || 0;
          const recStoredBreakMins = Number(dbRec.break_time_minutes || dbRec.breakTimeMinutes || 0);
          const recBreakMins = mapBreakMins > 0 ? mapBreakMins : recStoredBreakMins;

          const netMins = Math.max(0, durationMins - recBreakMins);
          const hrs = Math.floor(netMins / 60).toString().padStart(2, '0');
          const mins = (netMins % 60).toString().padStart(2, '0');
          actualWorkingHours = `${hrs}:${mins}`;

          if (recBreakMins <= 0) {
            breakHoursForRow = '--';
          } else if (recBreakMins < 60) {
            breakHoursForRow = `${recBreakMins} mins`;
          } else {
            const bH = Math.floor(recBreakMins / 60);
            const bM = recBreakMins % 60;
            breakHoursForRow = bM > 0 ? `${bH}h ${bM}m` : `${bH}h`;
          }
        } else {
          // No attendance record for this date — check if holiday or week-off or absent
          const isHolidayDate = reportHolidaySet.has(dateStr);
          dayStatus = isWeekend ? 'Week Off' : isHolidayDate ? 'Holiday' : 'Absent';
          actualTiming = '-- - --';
          actualWorkingHours = '00:00';
        }

        const shortHours = dayStatus === 'Half Day' ? '04:30' : dayStatus === 'Absent' ? '09:00' : '00:00';
        const totalBreakHours = breakHoursForRow;

        const isFalse = (val: any) => val === false || val === 'false' || val === 0 || val === '0';
        const isTrue = (val: any) => val === true || val === 'true' || val === 1 || val === '1';

        if (sf) {
          const hasPositiveStatusFilter = (
            isTrue(sf.present) || isTrue(sf.halfDay) || isTrue(sf.absent) || isTrue(sf.leave) || isTrue(sf.expected)
          );

          if (hasPositiveStatusFilter) {
            let statusMatch = false;
            if (isTrue(sf.present) && dayStatus === 'Full Day') statusMatch = true;
            if (isTrue(sf.halfDay) && dayStatus === 'Half Day') statusMatch = true;
            if (isTrue(sf.absent) && dayStatus === 'Absent') statusMatch = true;
            if (isTrue(sf.leave) && dayStatus === 'Leave') statusMatch = true;
            if (isTrue(sf.expected) && (dayStatus === 'Week Off' || dayStatus === 'Holiday')) statusMatch = true;

            if (!statusMatch) continue;
          }

          if (isTrue(sf.lateMark) && isLate !== 'Yes') continue;
          if (isTrue(sf.shortWorkingHour) && (shortHours === '00:00' || dayStatus === 'Full Day')) continue;
        }

        if (workType === 'full_day' && dayStatus !== 'Full Day') continue;
        if (workType === 'half_day' && dayStatus !== 'Half Day') continue;

        const deptId = emp.current_department_id || emp.currentDepartmentId;
        const departmentName = deptId ? (deptMap.get(Number(deptId)) || 'General') : 'General';

        const formatDisplayTime = (tStr: any): string => {
          if (!tStr) return '';
          const str = String(tStr).trim();
          if (str.includes('AM') || str.includes('PM') || str.includes('am') || str.includes('pm')) return str;
          if (str.includes(':')) {
            const parts = str.split(':');
            let h = parseInt(parts[0], 10);
            const m = parts[1] || '00';
            if (isNaN(h)) return str;
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
          }
          return str;
        };

        const resolveEmpShift = (eId: number, dStr: string, recordObj?: any) => {
          // 1. Check if the attendance record itself specifies a shift
          if (recordObj && (recordObj.rec_shift_name || recordObj.shift_name || recordObj.shiftName)) {
            const sName = recordObj.rec_shift_name || recordObj.shift_name || recordObj.shiftName;
            const sIn = recordObj.rec_shift_start_time || recordObj.shift_start_time ? formatDisplayTime(recordObj.rec_shift_start_time || recordObj.shift_start_time) : '--';
            const sOut = recordObj.rec_shift_end_time || recordObj.shift_end_time ? formatDisplayTime(recordObj.rec_shift_end_time || recordObj.shift_end_time) : '--';
            const dur = Number(recordObj.rec_shift_duration_hours || recordObj.recShiftDurationHours || recordObj.duration_hours || 0);
            return { shiftName: sName, startTime: sIn, endTime: sOut, durationHours: dur };
          }

          // 2. Filter shift assignments for this employee
          const empAssignments = shiftAssignments.filter((sa: any) => Number(sa.employee_id || sa.employeeId) === eId);

          if (empAssignments.length > 0) {
            // Find assignment covering the date
            const dateMatch = empAssignments.find((sa: any) => {
              const sDate = sa.assignment_start_date ? getDateStrKey(sa.assignment_start_date) : '';
              const eDate = sa.assignment_end_date ? getDateStrKey(sa.assignment_end_date) : '';
              if (sDate && sDate > dStr) return false;
              if (eDate && eDate < dStr) return false;
              return true;
            });

            const saMatch = dateMatch || empAssignments[0]; // Fall back to employee's assigned shift
            if (saMatch) {
              const sName = saMatch.shift_name || saMatch.shiftName || 'Standard Shift';
              const sIn = saMatch.start_time || saMatch.startTime ? formatDisplayTime(saMatch.start_time || saMatch.startTime) : '--';
              const sOut = saMatch.end_time || saMatch.endTime ? formatDisplayTime(saMatch.end_time || saMatch.endTime) : '--';
              const dur = Number(saMatch.duration_hours || saMatch.durationHours || 9);
              return { shiftName: sName, startTime: sIn, endTime: sOut, durationHours: dur };
            }
          }

          // 3. Fall back to organization's default shift template if available
          if (defaultOrgShift) {
            const sName = defaultOrgShift.shift_name || defaultOrgShift.name || 'General Shift';
            const sIn = defaultOrgShift.start_time ? formatDisplayTime(defaultOrgShift.start_time) : '09:00 AM';
            const sOut = defaultOrgShift.end_time ? formatDisplayTime(defaultOrgShift.end_time) : '06:00 PM';
            const dur = Number(defaultOrgShift.duration_hours || defaultOrgShift.durationHours || 9);
            return { shiftName: sName, startTime: sIn, endTime: sOut, durationHours: dur };
          }

          // 4. Final fallback
          return { shiftName: 'General Shift', startTime: '09:00 AM', endTime: '06:00 PM', durationHours: 9 };
        };

        const currentShift = resolveEmpShift(empId, dateStr, dbRec);
        const isUnassigned = currentShift.shiftName === 'Unassigned';
        const shiftLabel = isUnassigned
          ? 'Unassigned'
          : `${currentShift.shiftName} (${currentShift.startTime} - ${currentShift.endTime})`;
        const expTimingLabel = isUnassigned
          ? '--'
          : `${currentShift.startTime} - ${currentShift.endTime}`;

        // Derive expected hours from shift duration_hours; fall back to '--' when unassigned
        const expHoursValue = (() => {
          if (isUnassigned || !currentShift.durationHours) return '--';
          const totalMins = Math.round(currentShift.durationHours * 60);
          const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
          const m = (totalMins % 60).toString().padStart(2, '0');
          return `${h}:${m}`;
        })();

        rows.push({
          id: String(rowIdCounter++),
          date: dateStr,
          employeeName: empName,
          payrollCycle: 'Monthly',
          shift: shiftLabel,
          expTiming: expTimingLabel,
          actualTiming,
          checkInTime: formattedIn || '--',
          checkOutTime: formattedOut || (formattedIn ? 'Active' : '--'),
          expHours: expHoursValue,
          actualHours: actualWorkingHours,
          shortHours,
          bufferMins: '00:00:00',
          lateMins,
          totalBreakHours,
          actualWorkingHours,
          isLate,
          dayStatus,
          day: dayName,
          checkInLocation: checkInLoc,
          checkOutLocation: checkOutLoc,
          employeeCode: emp.employee_code || emp.employeeCode || '',
          departmentName,
        });
      }
    }

    return rows;
  }


  /**
   * Get timelog matrix report data from database
   */
  async getTimelogMatrixReportData(ctx: TenantContext, params: any) {
    const {
      fromDate,
      toDate,
      status: filterStatus,
    } = params || {};

    const rawEmp = params?.employees ?? params?.['employees[]'] ?? params?.employeeId ?? params?.employee_id;
    const rawLoc = params?.locations ?? params?.['locations[]'] ?? params?.locationId ?? params?.location_id;
    const rawDept = params?.departments ?? params?.['departments[]'] ?? params?.departmentId ?? params?.department_id;
    const rawRo = params?.reportingOfficers ?? params?.['reportingOfficers[]'] ?? params?.reportingOfficerId ?? params?.reporting_officer_id;

    const { db } = await import('../../../db/knex');

    const parseIds = (val: any): number[] => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : String(val).split(',');
      return arr
        .map((x: any) => {
          if (typeof x === 'number') return x;
          const str = String(x).trim();
          if (!str) return NaN;
          if (/^\d+$/.test(str)) return parseInt(str, 10);
          const match = str.match(/\d+/);
          return match ? parseInt(match[0], 10) : NaN;
        })
        .filter((n: number) => !isNaN(n));
    };

    const parseStrings = (val: any): string[] => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : String(val).split(',');
      return arr.map((x: any) => String(x).trim()).filter(Boolean);
    };

    const rawCompany = params?.companies ?? params?.['companies[]'] ?? params?.companyId ?? params?.company_id;

    const targetEmpIds = parseIds(rawEmp);
    const targetEmpStrings = parseStrings(rawEmp);
    const targetDeptIds = parseIds(rawDept);
    const targetLocIds = parseIds(rawLoc);
    const targetRoIds = parseIds(rawRo);
    const targetCompanyIds = parseIds(rawCompany);
    const saturdayRule = params?.saturdayRule || params?.saturday_rule || 'all_off';

    // 1. Fetch matching employees from DB (Excluding CEO)
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .where(function () {
        this.where('is_ceo', 0).orWhereNull('is_ceo');
      });

    if (targetCompanyIds.length > 0) {
      empQuery = empQuery.where(function () {
        this.whereIn('company_id', targetCompanyIds).orWhereNull('company_id');
      });
    } else if (ctx.companyId) {
      empQuery = empQuery.where(function () {
        this.where('company_id', ctx.companyId).orWhereNull('company_id');
      });
    }

    if (filterStatus && filterStatus !== 'choose' && filterStatus !== 'both') {
      if (['active', 'inactive', 'onboarding', 'terminated'].includes(filterStatus)) {
        empQuery = empQuery.where('status', filterStatus);
      }
    }
    if (targetEmpIds.length > 0 || targetEmpStrings.length > 0) {
      empQuery = empQuery.where((builder) => {
        if (targetEmpIds.length > 0) {
          builder.whereIn('id', targetEmpIds);
        }
        if (targetEmpStrings.length > 0) {
          builder.orWhereIn('employee_code', targetEmpStrings);
        }
      });
    }
    if (targetDeptIds.length > 0) {
      empQuery = empQuery.whereIn('current_department_id', targetDeptIds);
    }
    if (targetRoIds.length > 0) {
      empQuery = empQuery.whereIn('reporting_manager_id', targetRoIds);
    }
    if (targetLocIds.length > 0) {
      empQuery = empQuery.where((builder) => {
        builder.whereIn('current_branch_id', targetLocIds).orWhereIn('current_location_id', targetLocIds);
      });
    }

    const employeeList = await empQuery.catch(() => []);
    if (employeeList.length === 0) {
      return [];
    }

    const matchedEmpIds = employeeList.map((e: any) => e.id);

    // Fetch org and location mappings
    const [currentOrg, branchesList, locationsList] = await Promise.all([
      db('organizations').where('id', ctx.organizationId).first().catch(() => null),
      db('branches').whereNull('deleted_at').catch(() => []),
      db('locations').whereNull('deleted_at').catch(() => []),
    ]);

    const defaultLocName = currentOrg?.location || 'Navi Mumbai';
    const branchMap = new Map<number, string>();
    branchesList.forEach((b: any) => branchMap.set(b.id, b.name));
    locationsList.forEach((l: any) => branchMap.set(l.id, l.name || l.location_name));

    // Determine date range
    const endStr = toDate || new Date().toISOString().split('T')[0];
    let startStr = fromDate;
    if (!startStr) {
      const d = new Date(endStr);
      d.setDate(d.getDate() - 14);
      startStr = d.toISOString().split('T')[0];
    }

    const getDatesInRange = (sStr: string, eStr: string): string[] => {
      const dates: string[] = [];
      const partsStart = sStr.split('-');
      const partsEnd = eStr.split('-');
      if (partsStart.length !== 3 || partsEnd.length !== 3) return dates;
      const start = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]));
      const end = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]));
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;

      const curr = new Date(start);
      while (curr <= end && dates.length <= 90) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
      return dates;
    };

    const dates = getDatesInRange(startStr, endStr);

    // Fetch actual attendance records & approved leaves from DB
    const [dbRecords, approvedLeaveRows] = await Promise.all([
      db('attendance_records')
        .where('organization_id', ctx.organizationId)
        .whereIn('employee_id', matchedEmpIds)
        .where('check_in_date', '>=', startStr)
        .where('check_in_date', '<=', endStr)
        .whereNull('deleted_at')
        .select(
          'id', 'employee_id', 'check_in_date', 'check_in_time', 'check_out_time',
          'status', 'duration_minutes', 'work_duration_minutes', 'break_time_minutes'
        )
        .catch(() => []),

      db('leave_applications')
        .leftJoin('leave_types', 'leave_applications.leave_type_id', 'leave_types.id')
        .where('leave_applications.organization_id', ctx.organizationId)
        .whereIn('leave_applications.employee_id', matchedEmpIds)
        .where('leave_applications.status', 'approved')
        .whereNull('leave_applications.deleted_at')
        .where(function () {
          this.where('leave_applications.application_start_date', '<=', endStr)
            .andWhere('leave_applications.application_end_date', '>=', startStr);
        })
        .select(
          'leave_applications.employee_id',
          'leave_applications.application_start_date',
          'leave_applications.application_end_date',
          'leave_applications.is_half_day',
          'leave_types.name as leave_type_name',
          'leave_types.code as leave_type_code'
        )
        .catch(() => [])
    ]);

    // Build leave lookup map: `${empId}_${dateStr}` → leave object
    const leaveMap = new Map<string, any>();
    for (const l of approvedLeaveRows) {
      const eId = Number(l.employee_id || l.employeeId);
      const sStr = String(l.application_start_date || l.applicationStartDate || '').slice(0, 10);
      const eStr = String(l.application_end_date || l.applicationEndDate || '').slice(0, 10);
      if (eId && sStr && eStr) {
        const lDates = getDatesInRange(sStr, eStr);
        for (const ld of lDates) {
          if (ld >= startStr && ld <= endStr) {
            leaveMap.set(`${eId}_${ld}`, l);
          }
        }
      }
    }

    // ── Helper: parse any timestamp value → 'HH:MM' string (IST-aware) ────
    const toHHMM = (t: any): string | null => {
      if (!t) return null;
      let d: Date;
      if (t instanceof Date) {
        d = t;
      } else {
        const str = String(t).trim();
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if (match) {
          d = new Date(
            parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]),
            parseInt(match[4]), parseInt(match[5])
          );
        } else {
          d = new Date(str);
        }
      }
      if (isNaN(d.getTime())) return null;
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    // ── Helper: total minutes to 'HH:MM' ────
    const minsToHHMM = (mins: number): string => {
      if (mins <= 0) return '00:00';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Build lookup: `${empId}_${dateStr}` → attendance record
    const recordLookup = new Map<string, any>();
    dbRecords.forEach((r: any) => {
      const empId = r.employee_id || r.employeeId;
      const rawDate = r.check_in_date || r.checkInDate;
      let dateKey = '';
      if (rawDate instanceof Date) {
        const y = rawDate.getUTCFullYear();
        const m = String(rawDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getUTCDate()).padStart(2, '0');
        dateKey = `${y}-${m}-${d}`;
      } else if (rawDate) {
        dateKey = String(rawDate).slice(0, 10);
      }
      if (dateKey && empId) {
        recordLookup.set(`${empId}_${dateKey}`, r);
      }
    });

    // ── Pre-fetch holiday dates for the matrix report range ────────────────────────────
    const matrixHolidaySet = new Map<string, string>(); // date -> holiday name
    try {
      const matrixYear = parseInt(startStr.split('-')[0], 10);
      const matrixCalIds = await db('holiday_calendars')
        .where('organization_id', ctx.organizationId)
        .where('year', matrixYear)
        .select('id')
        .catch(() => []);
      const mCalIds = matrixCalIds.map((c: any) => Number(c.id));
      if (mCalIds.length > 0) {
        const mHolidays = await db('holidays')
          .whereIn('holiday_calendar_id', mCalIds)
          .where('holiday_date', '>=', startStr)
          .where('holiday_date', '<=', endStr)
          .where('is_optional', false)
          .select('holiday_date', 'holiday_name')
          .catch(() => []);
        mHolidays.forEach((h: any) => {
          const d = h.holiday_date || h.holidayDate;
          const n = h.holiday_name || h.holidayName;
          if (d) matrixHolidaySet.set(String(d).slice(0, 10), n || 'Holiday');
        });
      }
    } catch (e) {
      console.warn('[MatrixReport] Failed to fetch holiday set (non-fatal):', e);
    }

    return employeeList.map((emp: any) => {
      const empId = emp.id;
      const fn = emp.first_name || emp.firstName || '';
      const ln = emp.last_name || emp.lastName || '';
      const fullName = `${fn} ${ln}`.trim();
      const empName = fullName || `Employee ${empId}`;
      const empCode = emp.employee_code || emp.employeeCode || `EMP${String(empId).padStart(4, '0')}`;
      const empBranchId = emp.current_branch_id || emp.currentBranchId || emp.current_location_id || emp.currentLocationId;
      const location = (empBranchId ? branchMap.get(Number(empBranchId)) : null) || defaultLocName;

      const dailyStatus: { [d: string]: string } = {};
      const dailyTimings: { [d: string]: string } = {};

      // Per-week accumulators (1-based week index = Math.floor(dIdx / 7) + 1)
      const weeklyWorkMins: { [wn: number]: number } = {};
      const weeklyWorkDays: { [wn: number]: number } = {};

      let presentDays = 0;
      let lwp = 0;
      let pl = 0;
      let plv = 0;
      let wo = 0;
      let totalHoliday = 0;
      let grandWorkMins = 0;
      let grandBreakMins = 0;
      let grandWorkingDayCount = 0;

      dates.forEach((dateStr, dIdx) => {
        const weekNum = Math.floor(dIdx / 7) + 1;
        if (!weeklyWorkMins[weekNum]) { weeklyWorkMins[weekNum] = 0; weeklyWorkDays[weekNum] = 0; }

        const parts = dateStr.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayOfWeek = dt.getDay(); // 0=Sun, 6=Sat

        const key = `${empId}_${dateStr}`;
        const rec = recordLookup.get(key);
        const approvedLeave = leaveMap.get(key);

        // Determine if Saturday is off based on saturdayRule
        let isSaturdayOff = true;
        if (dayOfWeek === 6) {
          const dayOfMonth = dt.getDate();
          const saturdayOccurrence = Math.ceil(dayOfMonth / 7);
          if (saturdayRule === 'all_working' || saturdayRule === 'working') {
            isSaturdayOff = false;
          } else if (saturdayRule === 'alternate_off' || saturdayRule === 'second_fourth_off') {
            isSaturdayOff = (saturdayOccurrence === 2 || saturdayOccurrence === 4);
          } else if (saturdayRule === 'first_third_off') {
            isSaturdayOff = (saturdayOccurrence === 1 || saturdayOccurrence === 3);
          } else {
            isSaturdayOff = true;
          }
        }

        const isWeekendOffDay = dayOfWeek === 0 || (dayOfWeek === 6 && isSaturdayOff);

        if (isWeekendOffDay && !rec) {
          dailyStatus[dateStr] = 'W/O';
          dailyTimings[dateStr] = 'Week-Off';
          wo += 1;
          return;
        }

        if (!rec) {
          // No attendance punch on working day / working weekend
          if (approvedLeave) {
            const lCode = String(approvedLeave.leave_type_code || approvedLeave.leave_type_name || '').toUpperCase();
            if (lCode.includes('LWP') || lCode.includes('UNPAID')) {
              dailyStatus[dateStr] = 'LWP';
              dailyTimings[dateStr] = '00:00-00:00';
              lwp += 1;
            } else if (lCode.includes('PRIVILEGE') || lCode.includes('PLV')) {
              dailyStatus[dateStr] = 'PLV';
              dailyTimings[dateStr] = '00:00-00:00';
              plv += 1;
            } else {
              dailyStatus[dateStr] = 'PL';
              dailyTimings[dateStr] = '00:00-00:00';
              pl += 1;
            }
          } else if (matrixHolidaySet.has(dateStr)) {
            const holName = matrixHolidaySet.get(dateStr) || 'Holiday';
            dailyStatus[dateStr] = 'Holiday';
            dailyTimings[dateStr] = holName;
            totalHoliday += 1;
          } else {
            // Not Present
            dailyStatus[dateStr] = 'NP';
            dailyTimings[dateStr] = '00:00-00:00';
          }
          return;
        }

        const st: string = rec.status || 'present';

        // Compute timing strings from DB timestamps
        const inHHMM = toHHMM(rec.check_in_time || rec.checkInTime);
        const outHHMM = toHHMM(rec.check_out_time || rec.checkOutTime);

        // Compute work duration in minutes
        let workMins = 0;
        const wDuration = rec.work_duration_minutes ?? rec.workDurationMinutes;
        const duration = rec.duration_minutes ?? rec.durationMinutes;
        if (wDuration != null && wDuration > 0) {
          workMins = Number(wDuration);
        } else if (duration != null && duration > 0) {
          workMins = Number(duration);
        } else if ((rec.check_in_time || rec.checkInTime) && (rec.check_out_time || rec.checkOutTime)) {
          const dIn = new Date(rec.check_in_time || rec.checkInTime);
          const dOut = new Date(rec.check_out_time || rec.checkOutTime);
          if (!isNaN(dIn.getTime()) && !isNaN(dOut.getTime()) && dOut > dIn) {
            workMins = Math.floor((dOut.getTime() - dIn.getTime()) / 60000);
          }
        }

        const breakMins = Number(rec.break_time_minutes ?? rec.breakTimeMinutes) || 0;
        const netMins = Math.max(0, workMins - breakMins);

        if (st === 'weekly_off') {
          dailyStatus[dateStr] = 'W/O';
          dailyTimings[dateStr] = 'Week-Off';
          wo += 1;
        } else if (st === 'holiday') {
          dailyStatus[dateStr] = 'Holiday';
          dailyTimings[dateStr] = '00:00-00:00';
          totalHoliday += 1;
        } else if (st === 'on_leave') {
          const lCode = String(approvedLeave?.leave_type_code || approvedLeave?.leave_type_name || '').toUpperCase();
          if (lCode.includes('LWP') || lCode.includes('UNPAID')) {
            dailyStatus[dateStr] = 'LWP';
            lwp += 1;
          } else if (lCode.includes('PRIVILEGE') || lCode.includes('PLV')) {
            dailyStatus[dateStr] = 'PLV';
            plv += 1;
          } else {
            dailyStatus[dateStr] = 'PL';
            pl += 1;
          }
          dailyTimings[dateStr] = '00:00-00:00';
        } else if (st === 'absent') {
          dailyStatus[dateStr] = 'LWP';
          dailyTimings[dateStr] = '00:00-00:00';
          lwp += 1;
        } else if (st === 'half_day') {
          dailyStatus[dateStr] = 'HD';
          dailyTimings[dateStr] = inHHMM && outHHMM
            ? `${inHHMM}-${outHHMM}`
            : inHHMM ? `${inHHMM}-Active` : '00:00-00:00';
          presentDays += 0.5;
          weeklyWorkMins[weekNum] += netMins;
          weeklyWorkDays[weekNum] += 1;
          grandWorkMins += netMins;
          grandBreakMins += breakMins;
          grandWorkingDayCount += 1;
        } else {
          // present / work_from_home / sick → treat as present
          dailyStatus[dateStr] = 'P';
          dailyTimings[dateStr] = inHHMM && outHHMM
            ? `${inHHMM}-${outHHMM}`
            : inHHMM ? `${inHHMM}-Active` : '00:00-00:00';
          presentDays += 1;
          weeklyWorkMins[weekNum] += netMins;
          weeklyWorkDays[weekNum] += 1;
          grandWorkMins += netMins;
          grandBreakMins += breakMins;
          grandWorkingDayCount += 1;
        }
      });

      // Build weekly HH:MM totals & averages
      const weekNums = [...new Set(dates.map((_, dIdx) => Math.floor(dIdx / 7) + 1))];
      const weeklyTotalHours: { [wn: number]: string } = {};
      const weeklyAvgHours: { [wn: number]: string } = {};
      weekNums.forEach((wn) => {
        const total = weeklyWorkMins[wn] || 0;
        const days = weeklyWorkDays[wn] || 0;
        weeklyTotalHours[wn] = minsToHHMM(total);
        weeklyAvgHours[wn] = days > 0 ? minsToHHMM(Math.round(total / days)) : '00:00';
      });

      const grandTotal = minsToHHMM(grandWorkMins);
      const grandAverage = grandWorkingDayCount > 0
        ? minsToHHMM(Math.round(grandWorkMins / grandWorkingDayCount))
        : '00:00';
      const totalBreakHoursStr = minsToHHMM(grandBreakMins);
      const actualWorkHours = minsToHHMM(Math.max(0, grandWorkMins - grandBreakMins));

      const payableDays = presentDays + pl + plv + wo + totalHoliday;

      return {
        id: `emp-mat-${empId}`,
        location,
        employeeName: empName,
        employeeCode: empCode,
        dailyStatus,
        dailyTimings,
        weeklyTotalHours,
        weeklyAvgHours,
        grandTotal,
        grandAverage,
        totalBreakHours: totalBreakHoursStr,
        actualWorkHours,
        presentDays,
        lwp,
        pl,
        plv,
        totalHoliday,
        payableDays,
      };
    });
  }

  /**
   * Dedicated CEO / Executive Admin attendance punches query.
   * Returns ONLY real database check-in records for the Organization Admin / CEO.
   */
  async getCeoPunches(ctx: TenantContext): Promise<any[]> {
    const db = getKnex();

    // 1. Find dedicated CEO employee row or Org Admin user
    const ceoEmp = await db('employees')
      .where({ organization_id: ctx.organizationId, is_ceo: true })
      .whereNull('deleted_at')
      .first()
      .catch(() => null);

    const org = await db('organizations').where('id', ctx.organizationId).first().catch(() => null);

    let adminUser: any = null;
    if (ctx.userId) {
      adminUser = await db('users').where('id', ctx.userId).first().catch(() => null);
    }
    if (!adminUser) {
      adminUser = await db('users')
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .where('users.organization_id', ctx.organizationId)
        .where('roles.code', 'organization_admin')
        .select('users.*')
        .first()
        .catch(() => null);
    }

    const adminUserId = adminUser ? Number(adminUser.id) : ctx.userId;
    const ceoEmpId = ceoEmp?.id || adminUser?.employee_id || null;

    const ceoName = ceoEmp
      ? [ceoEmp.firstName || ceoEmp.first_name, ceoEmp.lastName || ceoEmp.last_name].filter(Boolean).join(' ')
      : [adminUser?.firstName || adminUser?.first_name, adminUser?.lastName || adminUser?.last_name].filter(Boolean).join(' ') || org?.ownerName || org?.owner_name || 'Harsh Gawali (CEO)';
    const ceoCode = ceoEmp?.employee_code || ceoEmp?.employeeCode || `CEO-${ctx.organizationId}-${adminUserId}`;

    // 2. Query attendance_records strictly for CEO (is_ceo_punch = 1 OR employee_id = ceoEmpId)
    const dbRecords = await db('attendance_records')
      .leftJoin('attendance_locations as in_loc', 'attendance_records.check_in_location_id', 'in_loc.id')
      .where('attendance_records.organization_id', ctx.organizationId)
      .where(function () {
        this.where('attendance_records.is_ceo_punch', 1)
          .orWhere('attendance_records.is_ceo_punch', true);
        if (ceoEmpId) {
          this.orWhere('attendance_records.employee_id', ceoEmpId);
        }
      })
      .select(
        'attendance_records.*',
        'in_loc.location_name as check_in_location_name'
      )
      .orderBy('attendance_records.created_at', 'desc')
      .catch(() => []);


    return dbRecords.map((r: any) => {
      const rawIn = r.check_in_time || r.checkInTime || r.created_at;
      const rawOut = r.check_out_time || r.checkOutTime;

      let formattedIn = '--:--';
      let formattedOut = '--:--';
      let totalHours = '--';

      if (rawIn) {
        const dIn = new Date(rawIn);
        if (!isNaN(dIn.getTime())) {
          formattedIn = dIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else {
          formattedIn = String(rawIn).slice(11, 16);
        }
      }

      if (rawOut) {
        const dOut = new Date(rawOut);
        if (!isNaN(dOut.getTime())) {
          formattedOut = dOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else {
          formattedOut = String(rawOut).slice(11, 16);
        }
      }

      if (rawIn && rawOut) {
        const dIn = new Date(rawIn);
        const dOut = new Date(rawOut);
        if (!isNaN(dIn.getTime()) && !isNaN(dOut.getTime())) {
          const diffMs = dOut.getTime() - dIn.getTime();
          if (diffMs > 0) {
            const hrs = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            totalHours = `${hrs}h ${mins}m`;
          }
        }
      }
      //Date format yyyy-mm-dd

      let rawDate = r.check_in_date || r.checkInDate || rawIn;
      let formattedDate = '';
      if (rawDate) {
        if (typeof rawDate === 'string') {
          // dateStrings:true → mysql2 returns '2026-09-04' or '2026-09-04 15:54:29'
          formattedDate = String(rawDate).slice(0, 10);
        } else {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            formattedDate = `${y}-${m}-${day}`;
          } else {
            formattedDate = String(rawDate).slice(0, 10);
          }
        }
      }
      if (!formattedDate) formattedDate = getLocalYYYYMMDD();


      const isCheckedOut = Boolean(rawOut);

      return {
        id: String(r.id),
        date: formattedDate,
        employeeId: String(r.employee_id || ceoEmpId || adminUserId),
        employeeName: ceoName,
        employeeCode: ceoCode,
        checkInTime: formattedIn,
        checkOutTime: formattedOut,
        totalHours,
        checkInLocation: r.check_in_location_name || r.notes || 'Executive Boundary / Headquarters',
        checkInMethod: r.check_in_method || 'biometric',
        status: isCheckedOut ? 'Completed' : (rawIn ? 'Checked In' : 'Pending'),
      };


    });
  }

}
