import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/common/lib/logger';
import { AttendanceRecordRepository, type AttendanceRecord, type AttendanceStatus } from '../repositories/AttendanceRecordRepository';
import { AttendanceSessionRepository } from '../repositories/AttendanceSessionRepository';
import { AttendanceBreakRepository } from '../repositories/AttendanceBreakRepository';
import { EmployeeShiftAssignmentRepository } from '../repositories/EmployeeShiftAssignmentRepository';
import { AttendancePoliciesMappingRepository } from '../repositories/AttendancePoliciesMappingRepository';
import { GeofenceRepository } from '../repositories/GeofenceRepository';
import { GeoFenceService } from './GeoFenceService';
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
        notes: entryNotes,
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
        notes: entryNotes,
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

    record = await this.recordRepo.update(ctx, record.id, {
      check_out_time: now,
      check_out_location_id: matchedLocationId,
      check_out_method: cleanOutMethod,
      duration_minutes: durationMinutes,
      break_time_minutes: totalBreakMinutes,
      work_duration_minutes: workDurationMinutes,
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
  async getReportFilterOptions(ctx: TenantContext, companyId?: string | number | null) {
    try {
      const { db } = await import('../../../db/knex');
      console.log('[FilterOptions] companyId received:', companyId, '| organizationId:', ctx.organizationId);

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
      const formattedDepartments = departmentRows.map((d: any) => ({
        id: String(d.id),
        name: d.name || `Department ${d.id}`,
      }));

      // ── 4. Reporting Officers ─────────────────────────────────────────────────
      let assignedManagerQuery = db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .whereNotNull('reporting_manager_id');
      if (isValidCompanyId) {
        assignedManagerQuery = assignedManagerQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
      }
      const assignedManagerIdRows = await assignedManagerQuery.distinct('reporting_manager_id').select('reporting_manager_id').catch(() => []);
      const assignedManagerIds = assignedManagerIdRows
        .map((r: any) => Number(r.reportingManagerId ?? r.reporting_manager_id))
        .filter(Boolean);

      let formattedReportingOfficers: { id: string; name: string }[] = [];
      if (assignedManagerIds.length > 0) {
        const managerRows = await db('employees')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .whereIn('id', assignedManagerIds)
          .select('id', 'first_name', 'last_name', 'employee_code')
          .orderBy('first_name', 'asc')
          .catch(() => []);

        formattedReportingOfficers = managerRows.map((e: any) => ({
          id: String(e.id),
          name: `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || `Officer ${e.id}`,
        }));
      }

      // ── 5. Employees ─────────────────────────────────────────────────────────
      let employeeQuery = db('employees')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
      if (isValidCompanyId) {
        employeeQuery = employeeQuery.where(function () {
          this.where('company_id', companyId).orWhereNull('company_id');
        });
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

    const targetEmpIds = parseIds(rawEmp);
    const targetEmpStrings = parseStrings(rawEmp);
    const targetDeptIds = parseIds(rawDept);
    const targetRoIds = parseIds(rawRo);
    const targetCompanyIds = isAllCompanies ? [] : parseIds(rawCompany);

    // 1. Fetch matching employees from DB
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

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
          'st.end_time'
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

    const [locationsGen, locationsAtt, geofencesList, branchesList] = await Promise.all([
      db('locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      db('attendance_locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
      db('attendance_geofences').where('organization_id', ctx.organizationId).catch(() => []),
      db('branches').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
    ]);

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
        const empDefaultLoc = emp.location_name || emp.locationName || dbRec?.emp_location_name || dbRec?.empLocationName || 'Primary Office';
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

          const resolvedInLoc = (inLocId ? locationNameMap.get(Number(inLocId)) : null) || dbRec.check_in_location_name || dbRec.checkInLocationName || dbRec.check_in_location || dbRec.checkInLocation || dbRec.location;
          const resolvedOutLoc = (outLocId ? locationNameMap.get(Number(outLocId)) : null) || dbRec.check_out_location_name || dbRec.checkOutLocationName || dbRec.check_out_location || dbRec.checkOutLocation || dbRec.location;

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
          dayStatus = isWeekend ? 'Week Off' : 'Absent';
          actualTiming = '-- - --';
          actualWorkingHours = '00:00';
        }

        const shortHours = dayStatus === 'Half Day' ? '04:30' : dayStatus === 'Absent' ? '09:00' : '00:00';
        const totalBreakHours = breakHoursForRow;

        const isFalse = (val: any) => val === false || val === 'false' || val === 0 || val === '0';
        const isTrue = (val: any) => val === true || val === 'true' || val === 1 || val === '1';

        if (sf && sf.present !== undefined && isFalse(sf.present) && dayStatus === 'Full Day') continue;
        if (sf && sf.halfDay !== undefined && isFalse(sf.halfDay) && dayStatus === 'Half Day') continue;
        if (sf && sf.absent !== undefined && isFalse(sf.absent) && dayStatus === 'Absent') continue;
        if (sf && sf.leave !== undefined && isFalse(sf.leave) && dayStatus === 'Leave') continue;
        if (sf && sf.expected !== undefined && isFalse(sf.expected) && (dayStatus === 'Week Off' || dayStatus === 'Holiday')) continue;

        if (sf && sf.lateMark !== undefined && isTrue(sf.lateMark) && isLate !== 'Yes') continue;
        if (sf && sf.shortWorkingHour !== undefined && isTrue(sf.shortWorkingHour) && (shortHours === '00:00' || dayStatus === 'Full Day')) continue;

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
          if (recordObj && recordObj.rec_shift_name) {
            const sName = recordObj.rec_shift_name;
            const sIn = recordObj.rec_shift_start_time ? formatDisplayTime(recordObj.rec_shift_start_time) : '09:00 AM';
            const sOut = recordObj.rec_shift_end_time ? formatDisplayTime(recordObj.rec_shift_end_time) : '06:00 PM';
            return { shiftName: sName, startTime: sIn, endTime: sOut };
          }
          const saMatch = shiftAssignments.find((sa: any) => {
            if (Number(sa.employee_id) !== eId) return false;
            const sDate = sa.assignment_start_date ? getDateStrKey(sa.assignment_start_date) : '';
            const eDate = sa.assignment_end_date ? getDateStrKey(sa.assignment_end_date) : '';
            if (sDate && sDate > dStr) return false;
            if (eDate && eDate < dStr) return false;
            return true;
          });
          if (saMatch) {
            return {
              shiftName: saMatch.shift_name || 'General Shift',
              startTime: saMatch.start_time ? formatDisplayTime(saMatch.start_time) : '09:00 AM',
              endTime: saMatch.end_time ? formatDisplayTime(saMatch.end_time) : '06:00 PM',
            };
          }
          return {
            shiftName: 'General Shift',
            startTime: '09:00 AM',
            endTime: '06:00 PM',
          };
        };

        const currentShift = resolveEmpShift(empId, dateStr, dbRec);
        const shiftLabel = `${currentShift.shiftName} (${currentShift.startTime} - ${currentShift.endTime})`;
        const expTimingLabel = `${currentShift.startTime} - ${currentShift.endTime}`;

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
          expHours: '09:00',
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

    // 1. Fetch matching employees from DB
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

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

    // Fetch actual attendance records from DB (including break_time_minutes)
    const dbRecords = await db('attendance_records')
      .where('organization_id', ctx.organizationId)
      .whereIn('employee_id', matchedEmpIds)
      .where('check_in_date', '>=', startStr)
      .where('check_in_date', '<=', endStr)
      .whereNull('deleted_at')
      .select(
        'id', 'employee_id', 'check_in_date', 'check_in_time', 'check_out_time',
        'status', 'duration_minutes', 'work_duration_minutes', 'break_time_minutes'
      )
      .catch(() => []);

    // ── Helper: parse any timestamp value → 'HH:MM' string (IST-aware) ────
    const toHHMM = (t: any): string | null => {
      if (!t) return null;
      let d: Date;
      if (t instanceof Date) {
        d = t;
      } else {
        const str = String(t).trim();
        // MySQL returns timestamps as 'YYYY-MM-DD HH:MM:SS' in local time
        // new Date() on that interprets as UTC, so we must parse manually
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if (match) {
          // Parse as local time to avoid UTC offset shift
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
        // MySQL Date type comes back as a JS Date at midnight UTC
        // Add 1 day's offset protection: use UTC date components
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

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend
          dailyStatus[dateStr] = 'W/O';
          dailyTimings[dateStr] = 'Week-Off';
          wo += 1;
          return;
        }

        if (!rec) {
          // Working day but no attendance record → Not Present
          dailyStatus[dateStr] = 'NP';
          dailyTimings[dateStr] = '00:00-00:00';
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
          // Compute from timestamps
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
          dailyStatus[dateStr] = 'PL';
          dailyTimings[dateStr] = '00:00-00:00';
          pl += 1;
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

    // 1. Find Organization Admin user account & linked employee record
    const org = await db('organizations').where('id', ctx.organizationId).first().catch(() => null);

    let adminUser = await db('users')
      .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
      .leftJoin('roles', 'user_roles.role_id', 'roles.id')
      .where('users.organization_id', ctx.organizationId)
      .where(function () {
        this.where('roles.code', 'organization_admin')
          .orWhere('users.id', ctx.userId)
          .orWhereRaw('LOWER(users.email) = ?', [org?.email?.toLowerCase() || '']);
      })
      .select('users.*')
      .first()
      .catch(() => null);

    if (!adminUser) {
      adminUser = await db('users')
        .where('organization_id', ctx.organizationId)
        .first()
        .catch(() => null);
    }

    const adminUserId = adminUser ? Number(adminUser.id) : ctx.userId;
    const adminEmpId = adminUser?.employee_id ? Number(adminUser.employee_id) : null;

    let adminEmp: any = null;
    if (adminEmpId) {
      adminEmp = await db('employees').where('id', adminEmpId).first().catch(() => null);
    }
    if (!adminEmp && adminUser?.email) {
      adminEmp = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereRaw('LOWER(email) = ?', [adminUser.email.toLowerCase()])
        .first()
        .catch(() => null);
    }

    const ceoName = [adminUser?.first_name || adminEmp?.first_name, adminUser?.last_name || adminEmp?.last_name]
      .filter(Boolean)
      .join(' ') || org?.owner_name || 'Organization Admin';
    const ceoCode = adminEmp?.employee_code || adminEmp?.employeeCode || `ADM-${adminUserId}`;

    // 2. Query attendance_records by created_by = adminUserId OR employee_id = adminEmpId
    const dbRecords = await db('attendance_records')
      .leftJoin('attendance_locations as in_loc', 'attendance_records.check_in_location_id', 'in_loc.id')
      .where('attendance_records.organization_id', ctx.organizationId)
      .whereNotNull('attendance_records.check_in_time')
      .where(function () {
        this.where('attendance_records.created_by', adminUserId);
        if (adminEmpId) {
          this.orWhere('attendance_records.employee_id', adminEmpId);
        }
      })
      .select(
        'attendance_records.*',
        'in_loc.location_name as check_in_location_name'
      )
      .orderBy('attendance_records.check_in_time', 'desc')
      .catch(() => []);

    return dbRecords.map((r: any) => {
      const rawIn = r.check_in_time || r.checkInTime || r.created_at;
      let formattedIn = '--:--';
      if (rawIn) {
        const d = new Date(rawIn);
        if (!isNaN(d.getTime())) {
          formattedIn = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else {
          formattedIn = String(rawIn).slice(11, 16);
        }
      }

      const rawDate = r.check_in_date || r.checkInDate || (rawIn ? String(rawIn).split('T')[0] : getLocalYYYYMMDD());

      return {
        id: String(r.id),
        date: rawDate,
        employeeId: String(r.employee_id || adminEmpId || adminUserId),
        employeeName: ceoName,
        employeeCode: ceoCode,
        checkInTime: formattedIn,
        checkInLocation: r.check_in_location_name || r.notes || 'Executive Boundary / Headquarters',
        checkInMethod: r.check_in_method || 'biometric',
        status: 'Checked In',
      };
    });
  }
}
