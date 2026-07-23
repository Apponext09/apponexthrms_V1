import { v4 as uuidv4 } from 'uuid';
import { AttendanceRecordRepository, type AttendanceRecord, type AttendanceStatus } from '../repositories/AttendanceRecordRepository';
import { AttendanceSessionRepository } from '../repositories/AttendanceSessionRepository';
import { AttendanceBreakRepository } from '../repositories/AttendanceBreakRepository';
import { EmployeeShiftAssignmentRepository } from '../repositories/EmployeeShiftAssignmentRepository';
import { AttendancePoliciesMappingRepository } from '../repositories/AttendancePoliciesMappingRepository';
import { GeofenceRepository } from '../repositories/GeofenceRepository';
import { GeoFenceService } from './GeoFenceService';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

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

export class AttendanceService {
  private recordRepo: AttendanceRecordRepository;
  private sessionRepo: AttendanceSessionRepository;
  private breakRepo: AttendanceBreakRepository;
  private shiftAssignmentRepo: EmployeeShiftAssignmentRepository;
  private policyMappingRepo: AttendancePoliciesMappingRepository;
  private geofenceRepo: GeofenceRepository;
  private geofenceService: GeoFenceService;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.recordRepo = new AttendanceRecordRepository();
    this.sessionRepo = new AttendanceSessionRepository();
    this.breakRepo = new AttendanceBreakRepository();
    this.shiftAssignmentRepo = new EmployeeShiftAssignmentRepository();
    this.policyMappingRepo = new AttendancePoliciesMappingRepository();
    this.geofenceRepo = new GeofenceRepository();
    this.geofenceService = new GeoFenceService();
    this.notificationService = new NotificationService();
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
  }): Promise<AttendanceRecord> {
    const today = getLocalYYYYMMDD();
    const now = getLocalNowString();

    let geofenceMatched: boolean | null = null;
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
      } catch (e) {
        console.warn('[AttendanceService] geofence check error:', e);
        geofenceMatched = false;
      }
    }

    // Get or create today's attendance record
    let record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, today);
    if (!record) {
      record = await this.recordRepo.create(ctx, {
        uuid: uuidv4(),
        employee_id: input.employeeId,
        check_in_date: today,
        check_in_time: now,
        check_in_location_id: input.checkInLocation || null,
        check_in_method: input.method,
        status: 'present',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);
    } else {
      // Update existing record with check-in time
      record = await this.recordRepo.update(ctx, record.id, {
        check_in_time: now,
        check_in_location_id: input.checkInLocation || null,
        check_in_method: input.method,
        status: 'present',
      });
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
      afterState: { checkInTime: now, method: input.method, geofenceMatched },
    });

    // Send notification for successful check-in
    try {
      await this.notificationService.sendNotification(ctx, {
        recipientId: input.employeeId,
        eventCode: 'ATTENDANCE_CHECK_IN_SUCCESS',
        variables: { checkInTime: new Date(now).toLocaleTimeString() },
      });
    } catch (e) {}

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

    let geofenceMatched: boolean | null = null;
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
      } catch (e) {
        console.warn('[AttendanceService] geofence check error:', e);
        geofenceMatched = false;
      }
    }

    // Calculate duration
    const checkInTime = new Date(existingCheckInTime).getTime();
    const checkOutTime = new Date(now).getTime();
    const durationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));

    // Get break duration
    const totalBreakMinutes = await this.breakRepo.getTotalBreakDuration(ctx, record.id);
    const workDurationMinutes = durationMinutes - totalBreakMinutes;

    record = await this.recordRepo.update(ctx, record.id, {
      check_out_time: now,
      check_out_location_id: input.checkOutLocation || null,
      check_out_method: input.method,
      duration_minutes: durationMinutes,
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
   * Start a break
   */
  async breakIn(ctx: TenantContext, input: {
    employeeId: number;
    breakType?: string;
  }): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, input.employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    // Create break record
    await this.breakRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      break_start_time: now,
      break_type: input.breakType || 'lunch',
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

    return record;
  }

  /**
   * End a break
   */
  async breakOut(ctx: TenantContext, employeeId: number): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const record = await this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
    if (!record) {
      throw new NotFoundError('No check-in found for today');
    }

    const activeBreak = await this.breakRepo.getActiveBreak(ctx, record.id);
    if (!activeBreak) {
      throw new NotFoundError('No active break found');
    }

    const breakStartTime = new Date(activeBreak.break_start_time).getTime();
    const breakEndTime = new Date(now).getTime();
    const breakDurationMinutes = Math.floor((breakEndTime - breakStartTime) / (1000 * 60));

    await this.breakRepo.update(ctx, activeBreak.id, {
      break_end_time: now,
      break_duration_minutes: breakDurationMinutes,
      status: 'completed',
    });

    // Create session record
    await this.sessionRepo.create(ctx, {
      uuid: uuidv4(),
      attendance_record_id: record.id,
      session_type: 'break_out',
      session_timestamp: now,
    } as any);

    return record;
  }

  /**
   * Get today's attendance record
   */
  async getTodayRecord(ctx: TenantContext, employeeId: number): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.recordRepo.getByEmployeeAndDate(ctx, employeeId, today);
  }

  /**
   * Get attendance history for an employee
   */
  async getHistory(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.recordRepo.getEmployeeHistory(ctx, employeeId, options);
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
    return this.recordRepo.getByDateRange(ctx, employeeId, startDate, endDate, options);
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
    const record = await this.getTodayRecord(ctx, employeeId);
    return {
      isCheckedIn: !!record && !!(record.checkInTime ?? record.check_in_time),
      isCheckedOut: !!record && !!(record.checkOutTime ?? record.check_out_time),
      checkInTime: record ? (record.checkInTime ?? record.check_in_time) : null,
      checkOutTime: record ? (record.checkOutTime ?? record.check_out_time) : null,
      duration: record ? (record.durationMinutes ?? record.duration_minutes) : null,
    };
  }
}
