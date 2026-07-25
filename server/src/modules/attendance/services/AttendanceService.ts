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
    const now = formatMysqlDateTime();

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
    const now = formatMysqlDateTime();

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
    const today = getLocalYYYYMMDD();
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

  /**
   * Get filter options for reports from database
   */
  async getReportFilterOptions(ctx: TenantContext) {
    try {
      const { db } = await import('../../../db/knex');
      const [settingsLocations, branches, attendanceLocations, departments, employees, orgs, currentOrg] = await Promise.all([
        db('locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('branches').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('attendance_locations').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('departments').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('employees').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []),
        db('organizations').whereNull('deleted_at').select('id', 'name').catch(() => []),
        db('organizations').where('id', ctx.organizationId).first().catch(() => null),
      ]);

      const companies = orgs.length > 0
        ? orgs.map((o: any) => ({ id: String(o.id), name: o.name }))
        : [{ id: String(ctx.organizationId), name: currentOrg?.name || 'Primary Organization' }];

      // Filter locations belonging strictly to this organization including currentOrg.location
      const seenLocNames = new Set<string>();
      const formattedLocations: { id: string; name: string }[] = [];

      if (currentOrg && currentOrg.location) {
        seenLocNames.add(currentOrg.location);
        formattedLocations.push({
          id: `org_loc_${currentOrg.id}`,
          name: currentOrg.location,
        });
      }

      const allRawLocs = [...settingsLocations, ...branches, ...attendanceLocations];
      for (const item of allRawLocs) {
        const name = item.name || item.locationName || item.location_name;
        if (name && !seenLocNames.has(name)) {
          seenLocNames.add(name);
          formattedLocations.push({ id: String(item.id), name });
        }
      }

      const formattedDepartments = (departments || []).map((d: any) => ({
        id: String(d.id),
        name: d.name || `Department ${d.id}`,
      }));

      // Gather IDs of employees who have direct reports assigned to them
      const managerIdsSet = new Set(
        employees.map((e: any) => e.reportingManagerId || e.reporting_manager_id).filter(Boolean)
      );

      // Join user_roles to find users with leadership roles (hr_manager, department_head, team_lead)
      const userRoleRows = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .join('users', 'user_roles.user_id', 'users.id')
        .whereIn('roles.code', ['department_head', 'hr_manager', 'team_lead'])
        .select('users.employee_id', 'users.employeeId', 'roles.code')
        .catch(() => []);

      const leaderEmpIdsSet = new Set<number>();
      const leaderRoleMap = new Map<number, string>();
      for (const ur of userRoleRows) {
        const empId = Number(ur.employeeId || ur.employee_id);
        if (empId) {
          leaderEmpIdsSet.add(empId);
          leaderRoleMap.set(empId, ur.code);
        }
      }

      managerIdsSet.forEach((id) => leaderEmpIdsSet.add(Number(id)));

      // 1. Reporting Officers: ONLY HR, Manager (department_head), Team Lead
      const formattedReportingOfficers = (employees || [])
        .filter((e: any) => {
          const empId = Number(e.id);
          const isLeaderRole = ['department_head', 'hr_manager', 'team_lead'].includes(e.accessRole || e.access_role);
          return isLeaderRole || leaderEmpIdsSet.has(empId);
        })
        .map((e: any) => {
          const name = `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() || `Officer ${e.id}`;
          const roleCode = leaderRoleMap.get(Number(e.id)) || e.accessRole || e.access_role || '';
          let roleTag = 'Manager';
          if (roleCode === 'hr_manager') roleTag = 'HR';
          else if (roleCode === 'team_lead') roleTag = 'Team Lead';
          else if (roleCode === 'department_head') roleTag = 'Dept Manager';
          return {
            id: String(e.id),
            name: `${name} (${roleTag})`,
          };
        });

      // 2. Employees: ALL employees in organization
      const formattedEmployees = (employees || []).map((e: any) => ({
        id: String(e.id),
        name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() || `Employee ${e.id}`,
        code: e.employeeCode || e.employee_code || '',
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

    const rawEmp = params?.employees ?? params?.['employees[]'] ?? params?.employeeId ?? params?.employee_id;
    const rawLoc = params?.locations ?? params?.['locations[]'] ?? params?.locationId ?? params?.location_id;
    const rawDept = params?.departments ?? params?.['departments[]'] ?? params?.departmentId ?? params?.department_id;
    const rawRo = params?.reportingOfficers ?? params?.['reportingOfficers[]'] ?? params?.reportingOfficerId ?? params?.reporting_officer_id;
    const rawCompany = params?.companies ?? params?.['companies[]'] ?? params?.companyId ?? params?.company_id;

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
    const targetLocIds = parseIds(rawLoc);
    const targetRoIds = parseIds(rawRo);
    const targetCompanyIds = parseIds(rawCompany);

    // 1. Fetch matching employees from DB
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

    if (targetCompanyIds.length > 0) {
      empQuery = empQuery.whereIn('organization_id', targetCompanyIds);
    }

    if (filterStatus && filterStatus !== 'both' && filterStatus !== 'choose') {
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

    // 2. Fetch actual attendance records from DB
    const dbRecords = await db('attendance_records')
      .where('organization_id', ctx.organizationId)
      .whereIn('employee_id', matchedEmpIds)
      .orderBy('id', 'desc')
      .catch(() => []);

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

    const sf = typeof statusFilters === 'string' ? JSON.parse(statusFilters) : (statusFilters || {});

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
        let checkInLoc = 'Biometric Terminal';
        let checkOutLoc = 'Biometric Terminal';
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

          if (dbRec.check_in_location || dbRec.location) {
            checkInLoc = dbRec.check_in_location || dbRec.location;
          }
          if (dbRec.check_out_location || dbRec.location) {
            checkOutLoc = dbRec.check_out_location || dbRec.location;
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

          const hrs = Math.floor(durationMins / 60).toString().padStart(2, '0');
          const mins = (durationMins % 60).toString().padStart(2, '0');
          actualWorkingHours = `${hrs}:${mins}`;
        } else {
          dayStatus = isWeekend ? 'Week Off' : 'Absent';
          actualTiming = '-- - --';
          actualWorkingHours = '00:00';
        }

        const shortHours = dayStatus === 'Half Day' ? '04:30' : dayStatus === 'Absent' ? '09:00' : '00:00';
        const totalBreakHours = (dayStatus === 'Full Day' || dayStatus === 'Half Day') ? '01:00' : '00:00';

        const isFalse = (val: any) => val === false || val === 'false' || val === 0 || val === '0';
        const isTrue = (val: any) => val === true || val === 'true' || val === 1 || val === '1';

        if (sf.present !== undefined && isFalse(sf.present) && dayStatus === 'Full Day') continue;
        if (sf.halfDay !== undefined && isFalse(sf.halfDay) && dayStatus === 'Half Day') continue;
        if (sf.absent !== undefined && isFalse(sf.absent) && dayStatus === 'Absent') continue;
        if (sf.leave !== undefined && isFalse(sf.leave) && dayStatus === 'Leave') continue;
        if (sf.expected !== undefined && isFalse(sf.expected) && (dayStatus === 'Week Off' || dayStatus === 'Holiday')) continue;
        if (sf.lateMark !== undefined && isTrue(sf.lateMark) && isLate !== 'Yes') continue;
        if (sf.shortWorkingHour !== undefined && isTrue(sf.shortWorkingHour) && shortHours === '00:00') continue;
        if (sf.breakLog !== undefined && isFalse(sf.breakLog) && totalBreakHours !== '00:00') continue;

        if (workType === 'full_day' && dayStatus !== 'Full Day') continue;
        if (workType === 'half_day' && dayStatus !== 'Half Day') continue;

        const deptId = emp.current_department_id || emp.currentDepartmentId;
        const departmentName = deptId ? (deptMap.get(Number(deptId)) || 'General') : 'General';

        rows.push({
          id: String(rowIdCounter++),
          date: dateStr,
          employeeName: empName,
          payrollCycle: 'Monthly',
          shift: 'General Shift 09:30-18:30',
          expTiming: '09:30 - 18:30',
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

    const targetEmpIds = parseIds(rawEmp);
    const targetEmpStrings = parseStrings(rawEmp);
    const targetDeptIds = parseIds(rawDept);
    const targetLocIds = parseIds(rawLoc);
    const targetRoIds = parseIds(rawRo);

    // 1. Fetch matching employees from DB
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at');

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

    // Fetch actual attendance records from DB
    const dbRecords = await db('attendance_records')
      .where('organization_id', ctx.organizationId)
      .whereIn('employee_id', matchedEmpIds)
      .where('check_in_date', '>=', startStr)
      .where('check_in_date', '<=', endStr)
      .catch(() => []);

    const recordLookup = new Map<string, any>();
    dbRecords.forEach((r: any) => {
      const checkInDate = r.check_in_date || r.checkInDate;
      const checkInTime = r.check_in_time || r.checkInTime;
      const empId = r.employee_id || r.employeeId;
      const dateKey = checkInDate
        ? (typeof checkInDate === 'string' ? checkInDate.slice(0, 10) : new Date(checkInDate).toISOString().split('T')[0])
        : (checkInTime ? new Date(checkInTime).toISOString().split('T')[0] : '');
      if (dateKey && empId) {
        recordLookup.set(`${empId}_${dateKey}`, r);
      }
    });

    return employeeList.map((emp: any, empIdx: number) => {
      const empId = emp.id;
      const empName = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() || `Employee ${empId}`;
      const empCode = emp.employee_code || emp.employeeCode || `EMP${String(empId).padStart(4, '0')}`;
      const empBranchId = emp.current_branch_id || emp.currentBranchId || emp.current_location_id || emp.currentLocationId;
      const location = (empBranchId ? branchMap.get(Number(empBranchId)) : null) || defaultLocName;

      const dailyStatus: { [dateStr: string]: string } = {};
      let presentDays = 0;
      let lwp = 0;
      let pl = 0;
      let plv = 0;
      let wo = 0;
      let totalHoliday = 0;

      dates.forEach((dateStr) => {
        const key = `${empId}_${dateStr}`;
        const dbRec = recordLookup.get(key);

        const parts = dateStr.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayOfWeek = dt.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dailyStatus[dateStr] = 'W/O';
          wo += 1;
        } else if (dbRec) {
          const st = dbRec.status;
          if (st === 'present') {
            dailyStatus[dateStr] = 'P';
            presentDays += 1;
          } else if (st === 'on_leave') {
            dailyStatus[dateStr] = 'PL';
            pl += 1;
          } else if (st === 'half_day') {
            dailyStatus[dateStr] = 'HD';
            presentDays += 0.5;
          } else if (st === 'absent') {
            dailyStatus[dateStr] = 'LWP';
            lwp += 1;
          } else {
            dailyStatus[dateStr] = 'P';
            presentDays += 1;
          }
        } else {
          dailyStatus[dateStr] = 'P';
          presentDays += 1;
        }
      });

      const payableDays = presentDays + pl + plv + wo + totalHoliday;

      return {
        id: `emp-mat-${empId}`,
        location,
        employeeName: empName,
        employeeCode: empCode,
        dailyStatus,
        presentDays,
        lwp,
        pl,
        plv,
        wo,
        totalHoliday,
        payableDays,
      };
    });
  }
}
