import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { AttendanceService } from '../services/AttendanceService';
import { ShiftService } from '../services/ShiftService';
import { GeoFenceService } from '../services/GeoFenceService';
import { RegularizationService } from '../services/RegularizationService';
import { OvertimeService } from '../services/OvertimeService';
import { TimesheetService } from '../services/TimesheetService';
import { AttendancePolicyService } from '../services/AttendancePolicyService';
import { UserRepository } from '../../auth/repositories/user.repository';
import type { TenantContext } from '../../../db/types';

export class AttendanceController {
  private attendanceService: AttendanceService;
  private shiftService: ShiftService;
  private geofenceService: GeoFenceService;
  private regularizationService: RegularizationService;
  private overtimeService: OvertimeService;
  private timesheetService: TimesheetService;
  private policyService: AttendancePolicyService;
  private userRepo: UserRepository;

  constructor() {
    this.attendanceService = new AttendanceService();
    this.shiftService = new ShiftService();
    this.geofenceService = new GeoFenceService();
    this.regularizationService = new RegularizationService();
    this.overtimeService = new OvertimeService();
    this.timesheetService = new TimesheetService();
    this.policyService = new AttendancePolicyService();
    this.userRepo = new UserRepository();
  }

  /**
   * Helper to resolve the true employeeId linked to the logged-in user
   */
  private async getEmployeeId(ctx: TenantContext): Promise<number> {
    try {
      const user = await this.userRepo.getById(ctx, ctx.userId);
      const empId = user?.employeeId || (user as any)?.employee_id;
      if (empId) {
        return Number(empId);
      }
      if (user && user.email) {
        const empByEmail = await (this.attendanceService as any).recordRepo?.db('employees')
          .where('organization_id', ctx.organizationId)
          .where((b: any) => b.where('email', user.email).orWhere('work_email', user.email))
          .first();
        if (empByEmail && empByEmail.id) {
          return Number(empByEmail.id);
        }
      }
      const empByUserId = await (this.attendanceService as any).recordRepo?.db('employees')
        .where('organization_id', ctx.organizationId)
        .where('user_id', ctx.userId)
        .first();
      if (empByUserId && empByUserId.id) {
        return Number(empByUserId.id);
      }
    } catch (err) {
      console.error('Failed to resolve employeeId from user:', err);
    }

    return ctx.userId;
  }

  // ===== ATTENDANCE =====

  checkIn = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { checkInLocation, method, latitude, longitude } = req.body;
    const employeeId = await this.getEmployeeId(ctx);

    const record = await this.attendanceService.checkIn(ctx, {
      employeeId,
      checkInLocation,
      method,
      latitude,
      longitude,
    });

    res.status(201).json({ success: true, data: record });
  });

  checkOut = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { checkOutLocation, method, latitude, longitude } = req.body;
    const employeeId = await this.getEmployeeId(ctx);

    const record = await this.attendanceService.checkOut(ctx, {
      employeeId,
      checkOutLocation,
      method,
      latitude,
      longitude,
    });

    res.json({ success: true, data: record });
  });

  breakIn = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    try {
      const employeeId = await this.getEmployeeId(ctx);

      // Break type is NOT required at start — employee selects it when stopping the break
      const result: any = await this.attendanceService.breakIn(ctx, { employeeId });

      res.json({
        success: true,
        message: 'Break started successfully',
        data: {
          ...(result.activeBreak || result),
          assignedBreakMinutes: result.assignedBreakMinutes,
          totalUsedMinutes: result.totalUsedMinutes,
          remainingBreakMinutes: result.remainingBreakMinutes,
        },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || err.status || 400;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Unable to start break',
        error: {
          code: err.code || 'BREAK_ERROR',
          message: err.message || 'Unable to start break',
        },
      });
    }
  });

  pauseBreak = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const result: any = await this.attendanceService.pauseBreak(ctx, employeeId);
    res.json({ success: true, message: 'Break paused successfully', data: result.activeBreak || result });
  });

  resumeBreak = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const result: any = await this.attendanceService.resumeBreak(ctx, employeeId);
    res.json({ success: true, message: 'Break resumed successfully', data: result.activeBreak || result });
  });

  breakOut = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { latitude, longitude, breakTypeName, breakSettingId } = req.body;
    const employeeId = await this.getEmployeeId(ctx);

    if (latitude != null && longitude != null) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const geoValidation = await this.geofenceService.validateCheckInLocation(
        ctx,
        employeeId,
        latitude,
        longitude,
        now
      );
      if (!geoValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUTSIDE_GEOFENCE',
            message: geoValidation.message || 'Ending break is only permitted within office geofenced location.',
          },
        });
      }
    }

    const record = await this.attendanceService.breakOut(ctx, employeeId, {
      breakTypeName: breakTypeName || undefined,
      breakSettingId: breakSettingId ? Number(breakSettingId) : undefined,
    });

    res.json({ success: true, message: 'Break ended successfully', data: record });
  });

  getBreakLogs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { companyId, locationId, departmentId, reportingManagerId, employeeId, startDate, endDate, breakTypeName } = req.query as Record<string, string>;

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '' || val === 'undefined' || val === 'null') return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    const logs = await this.attendanceService.getBreakLogs(ctx, {
      companyId: parseNum(companyId),
      locationId: parseNum(locationId),
      departmentId: parseNum(departmentId),
      reportingManagerId: parseNum(reportingManagerId),
      employeeId: parseNum(employeeId),
      startDate: startDate && startDate !== 'undefined' ? startDate : undefined,
      endDate: endDate && endDate !== 'undefined' ? endDate : undefined,
      breakTypeName: breakTypeName && breakTypeName !== 'undefined' ? breakTypeName : undefined,
    });

    res.json({ success: true, data: logs, total: logs.length });
  });

  qrScanPunch = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { qrData, employeeCode, employeeId } = req.body;

    const getLocalYYYYMMDD = (d = new Date()) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let targetEmpCode = employeeCode || 'EMP-2026-001';
    let qrDate = getLocalYYYYMMDD();

    if (qrData && typeof qrData === 'string') {
      const parts = qrData.split(':');
      if (parts.length >= 3) {
        targetEmpCode = parts[1] || targetEmpCode;
        qrDate = parts[2] || qrDate;
      }
    }

    const todayStr = getLocalYYYYMMDD();
    if (qrDate !== todayStr) {
      res.status(400).json({
        success: false,
        message: `Expired QR Code token. QR code was generated for ${qrDate}, but today is ${todayStr}.`,
      });
      return;
    }

    const { db } = await import('../../../db/knex');

    let empIdNumber: number | null = typeof employeeId === 'number' ? employeeId : (typeof employeeId === 'string' && !isNaN(parseInt(employeeId, 10)) ? parseInt(employeeId, 10) : null);

    if (!empIdNumber && targetEmpCode) {
      const empRow = await db('employees')
        .where('organization_id', ctx.organizationId)
        .where((b) => b.where('employee_code', targetEmpCode).orWhere('employeeCode', targetEmpCode))
        .first()
        .catch(() => null);
      if (empRow) {
        empIdNumber = Number(empRow.id);
      }
    }

    if (!empIdNumber) {
      empIdNumber = parseInt(targetEmpCode.replace(/\D/g, ''), 10) || ctx.userId || 1;
    }

    const empCtx = { ...ctx, userId: empIdNumber };

    const todayRecord = await (this.attendanceService as any).recordRepo?.getByEmployeeAndDate(empCtx, empIdNumber, todayStr);
    const isCurrentlyCheckedIn = todayRecord && (todayRecord.status === 'present' || todayRecord.check_in_time) && !todayRecord.check_out_time;

    let record;
    if (isCurrentlyCheckedIn) {
      record = await this.attendanceService.checkOut(empCtx, {
        employeeId: empIdNumber,
        method: 'qr_scanner',
      });
    } else {
      record = await this.attendanceService.checkIn(empCtx, {
        employeeId: empIdNumber,
        method: 'qr_scanner',
      });
    }

    res.json({
      success: true,
      action: isCurrentlyCheckedIn ? 'check_out' : 'check_in',
      message: `Daily QR Code Validated! ${isCurrentlyCheckedIn ? 'Check Out' : 'Check In'} marked for ${targetEmpCode}.`,
      data: record,
    });
  });

  getTodayRecord = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const queryEmpId = req.query.employeeId ? parseInt(req.query.employeeId as string, 10) : NaN;
    const employeeId = !isNaN(queryEmpId) ? queryEmpId : await this.getEmployeeId(ctx);

    const record = await this.attendanceService.getTodayRecord(ctx, employeeId);

    res.json({ success: true, data: record });
  });

  getCheckInStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const queryEmpId = req.query.employeeId ? parseInt(req.query.employeeId as string, 10) : NaN;
    const employeeId = !isNaN(queryEmpId) ? queryEmpId : await this.getEmployeeId(ctx);

    const status = await this.attendanceService.getCheckInStatus(ctx, employeeId);

    res.json({ success: true, data: status });
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, startDate, endDate, employeeId: queryEmpId } = req.query;
    let employeeId = queryEmpId ? parseInt(queryEmpId as string, 10) : await this.getEmployeeId(ctx);
    if (isNaN(employeeId)) {
      employeeId = await this.getEmployeeId(ctx);
    }

    let result;
    if (startDate && endDate) {
      result = await this.attendanceService.getByDateRange(
        ctx,
        employeeId,
        startDate as string,
        endDate as string,
        { page: parseInt(page as string), pageSize: parseInt(pageSize as string) }
      );
    } else {
      result = await this.attendanceService.getHistory(ctx, employeeId, {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      });
    }

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  // ===== SHIFTS =====

  createShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const shift = await this.shiftService.createShift(ctx, req.body);
    res.status(201).json({ success: true, data: shift });
  });

  getAllShifts = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 50, search, status } = req.query;
    const result = await this.shiftService.getAllShifts(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      search: search as string | undefined,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getActiveShifts = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 50 } = req.query;
    const result = await this.shiftService.getActiveShifts(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getShiftById = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const shiftId = parseInt(req.params.id);
    const shift = await this.shiftService.getShift(ctx, shiftId);
    if (!shift) {
      res.status(404).json({ success: false, message: 'Shift not found' });
      return;
    }
    res.json({ success: true, data: shift });
  });

  updateShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const shiftId = parseInt(req.params.id);
    const shift = await this.shiftService.updateShift(ctx, shiftId, req.body);
    res.json({ success: true, data: shift });
  });

  deleteShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const shiftId = parseInt(req.params.id);
    await this.shiftService.deleteShift(ctx, shiftId);
    res.json({ success: true, message: 'Shift deleted successfully' });
  });

  toggleShiftStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const shiftId = parseInt(req.params.id);
    const { status } = req.body;
    const shift = await this.shiftService.toggleShiftStatus(ctx, shiftId, status);
    res.json({ success: true, data: shift });
  });

  assignShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assignment = await this.shiftService.assignShift(ctx, req.body);
    res.status(201).json({ success: true, data: assignment });
  });

  deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assignmentId = parseInt(req.params.id);
    await this.shiftService.deleteAssignment(ctx, assignmentId);
    res.json({ success: true, message: 'Shift assignment deleted successfully' });
  });

  getAllAssignments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 50, search, shiftId, isCurrent } = req.query;
    const result = await this.shiftService.getAllAssignments(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      search: search as string | undefined,
      shiftId: shiftId ? parseInt(shiftId as string) : undefined,
      isCurrent: isCurrent !== undefined ? isCurrent === 'true' : undefined,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getMyShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { date } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    try {
      const shift = await this.shiftService.getEmployeeShift(ctx, employeeId, date as string | undefined);
      if (shift) {
        res.json({ success: true, data: shift });
        return;
      }
    } catch (err: any) {
      console.warn('Failed to fetch employee shift assignment:', err.message);
    }

    res.json({
      success: true,
      data: {
        shift_name: 'General Shift',
        shiftName: 'General Shift',
        start_time: '09:00 AM',
        startTime: '09:00 AM',
        end_time: '06:00 PM',
        endTime: '06:00 PM',
      }
    });
  });

  getMyShifts = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const { from, to } = req.query;

    if (!from || !to) {
      res.status(400).json({ success: false, error: { message: 'Parameters "from" and "to" are required' } });
      return;
    }

    const shifts = await this.shiftService.getEmployeeShiftsInRange(ctx, employeeId, from as string, to as string);
    res.json({ success: true, data: shifts });
  });

  getTodayShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const todayStr = new Date().toISOString().split('T')[0];

    const shifts = await this.shiftService.getEmployeeShiftsInRange(ctx, employeeId, todayStr, todayStr);
    const todayShift = shifts[0];
    
    if (!todayShift || todayShift.isOffDay) {
      res.json({ success: true, data: null });
    } else {
      res.json({ success: true, data: todayShift });
    }
  });

  getMyRosterPattern = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const patternInfo = await this.shiftService.getEmployeeRosterPatternInfo(ctx, employeeId);
    res.json({ success: true, data: patternInfo });
  });

  requestShiftSwap = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const swap = await this.shiftService.requestShiftSwap(ctx, employeeId, req.body);
    res.status(201).json({ success: true, data: swap });
  });

  getMySwapRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const { page = 1, pageSize = 50, status } = req.query;

    const result = await this.shiftService.getAllSwapRequests(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string | undefined,
      employeeId,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getSwapApprovals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const { page = 1, pageSize = 50, status } = req.query;

    const result = await this.shiftService.getSwapRequestsToApprove(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string | undefined,
      swapWithEmployeeId: employeeId,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getAllSwapRequests = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 50, status, search } = req.query;
    const result = await this.shiftService.getAllSwapRequests(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string | undefined,
      search: search as string | undefined,
    });
    res.json({ success: true, data: result.items, meta: result.meta });
  });

  approveSwap = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const swapId = parseInt(req.params.id);
    const swap = await this.shiftService.approveShiftSwap(ctx, swapId);
    res.json({ success: true, data: swap });
  });

  rejectSwap = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const swapId = parseInt(req.params.id);
    const { reason } = req.body;
    const swap = await this.shiftService.rejectShiftSwap(ctx, swapId, reason);
    res.json({ success: true, data: swap });
  });


  // ===== LOCATIONS & GEOFENCING =====

  createLocation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const location = await this.geofenceService.createLocation(ctx, req.body);
    res.status(201).json({ success: true, data: location });
  });

  getAllLocations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.geofenceService.getAllLocations(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  createGeofence = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const geofence = await this.geofenceService.createGeofence(ctx, req.body);
    res.status(201).json({ success: true, data: geofence });
  });

  getAllGeofences = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;
    const result = await (this.geofenceService as any).getAllGeofences(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });
    res.json({ success: true, data: result?.items || result, meta: result?.meta });
  });

  updateGeofence = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const geofence = await (this.geofenceService as any).updateGeofence?.(ctx, parseInt(id, 10), req.body);
    res.json({ success: true, data: geofence });
  });

  deleteGeofence = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    await (this.geofenceService as any).deleteGeofence?.(ctx, parseInt(id, 10));
    res.json({ success: true });
  });

  validateLocation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { latitude, longitude } = req.body;
    const employeeId = await this.getEmployeeId(ctx);

    const validation = await this.geofenceService.validateCheckInLocation(ctx, employeeId, latitude, longitude, new Date().toISOString());

    res.json({ success: true, data: validation });
  });

  // ===== REGULARIZATION =====

  createRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const request = await this.regularizationService.createRequest(ctx, {
      ...req.body,
      employeeId,
    });
    res.status(201).json({ success: true, data: request });
  });

  getMyRegularizations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 50 } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    const result = await this.regularizationService.getByEmployee(ctx, employeeId, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getManagerPendingRegularizations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const items = await this.regularizationService.getManagerPendingRequests(ctx, employeeId);
    res.json({ success: true, data: items, total: items.length });
  });

  getHRPendingRegularizations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const items = await this.regularizationService.getHRPendingRequests(ctx);
    res.json({ success: true, data: items, total: items.length });
  });

  managerApproveRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { comments } = req.body;
    const approved = await this.regularizationService.managerApprove(ctx, parseInt(id, 10), comments);
    res.json({ success: true, message: 'Approved by Manager. Advanced to HR review.', data: approved });
  });

  managerRejectRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { comments } = req.body;
    const rejected = await this.regularizationService.managerReject(ctx, parseInt(id, 10), comments);
    res.json({ success: true, message: 'Rejected by Manager.', data: rejected });
  });

  hrApproveRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { comments } = req.body;
    const approved = await this.regularizationService.hrApprove(ctx, parseInt(id, 10), comments);
    res.json({ success: true, message: 'Approved by HR. Attendance regularized.', data: approved });
  });

  hrRejectRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { comments } = req.body;
    const rejected = await this.regularizationService.hrReject(ctx, parseInt(id, 10), comments);
    res.json({ success: true, message: 'Rejected by HR.', data: rejected });
  });

  getAdminRegularizationLogs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { startDate, endDate, employeeId, status, companyId, search } = req.query;
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '' || val === 'undefined') return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };
    const items = await this.regularizationService.getAdminLogs(ctx, {
      startDate: startDate as string,
      endDate: endDate as string,
      employeeId: parseNum(employeeId),
      status: status as string,
      companyId: parseNum(companyId),
      search: search as string,
    });
    res.json({ success: true, data: items, total: items.length });
  });

  // ===== OVERTIME =====

  requestOvertime = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const request = await this.overtimeService.requestOvertime(ctx, {
      ...req.body,
      employeeId,
    });
    res.status(201).json({ success: true, data: request });
  });

  getMyOvertime = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    const result = await this.overtimeService.getByEmployee(ctx, employeeId, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });



  // ===== TIMESHEET =====

  createTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const timesheet = await this.timesheetService.createTimesheet(ctx, {
      ...req.body,
      employeeId,
    });
    res.status(201).json({ success: true, data: timesheet });
  });

  addTimesheetEntry = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const entry = await this.timesheetService.addEntry(ctx, {
      ...req.body,
      timesheetId: parseInt(id),
    });

    res.status(201).json({ success: true, data: entry });
  });

  getMyTimesheets = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    const result = await this.timesheetService.getByEmployee(ctx, employeeId, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  submitTimesheet = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const submitted = await this.timesheetService.submit(ctx, parseInt(id));

    res.json({ success: true, data: submitted });
  });

  // ===== REPORTS =====

  getReportFilterOptions = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    // companyId is passed as a query param by the frontend when a company is selected.
    // When absent (no company selected yet) the service returns empty dependent lists.
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;
    const departmentIds = req.query.departmentIds
      ? String(req.query.departmentIds).split(',').map((x) => parseInt(x, 10)).filter((n) => !isNaN(n))
      : [];
    const options = await this.attendanceService.getReportFilterOptions(ctx, companyId, departmentIds);
    res.json({ success: true, data: options });
  });

  getTabularReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.attendanceService.getTabularReportData(ctx, req.query);
    res.json({ success: true, data });
  });

  getTimelogMatrixReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.attendanceService.getTimelogMatrixReportData(ctx, req.query);
    res.json({ success: true, data });
  });



  getCurrentIp = asyncHandler(async (req: Request, res: Response) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1');
    const cleanIp = ip.replace(/^::ffff:/, '');
    res.json({ success: true, data: { ipAddress: cleanIp } });
  });

  // ===== EMPLOYEE LOCATION MAPPING =====

  getEmployeeLocationAccess = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.geofenceService.getEmployeeLocationAccessList(ctx);
    res.json({ success: true, data });
  });

  assignEmployeeLocationAccess = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeId, assignedLocationIds, primaryLocationId, allowRemotePunch, allowFieldPunch, notes } = req.body;
    const result = await this.geofenceService.assignEmployeeLocations(ctx, {
      employeeId: Number(employeeId),
      assignedLocationIds: assignedLocationIds || [],
      primaryLocationId,
      allowRemotePunch,
      allowFieldPunch,
      notes,
    });
    res.json({ success: true, data: result });
  });

  bulkAssignEmployeeLocationAccess = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { employeeIds, assignedLocationIds, overwriteMode } = req.body;
    const result = await this.geofenceService.bulkAssignEmployeeLocations(ctx, {
      employeeIds: employeeIds || [],
      assignedLocationIds: assignedLocationIds || [],
      overwriteMode,
    });
    res.json({ success: true, data: result });
  });

  getMyPermittedLocations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);
    const data = await this.geofenceService.getMyPermittedLocations(ctx, employeeId);
    res.json({ success: true, data });
  });

  // Attendance Policies Endpoints
  getPolicies = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.policyService.getPolicies(ctx);
    res.json({ success: true, data });
  });

  createPolicy = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const data = await this.policyService.createPolicy(ctx, req.body);
    res.json({ success: true, message: 'Attendance policy created successfully in DB', data });
  });

  updatePolicy = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const data = await this.policyService.updatePolicy(ctx, id, req.body);
    res.json({ success: true, message: 'Attendance policy updated successfully in DB', data });
  });

  assignPolicyScope = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { assignedDepartments } = req.body;
    const data = await this.policyService.assignPolicyScope(ctx, id, assignedDepartments || []);
    res.json({ success: true, message: 'Attendance policy scope assigned successfully in DB', data });
  });
}

export const attendanceController = new AttendanceController();

