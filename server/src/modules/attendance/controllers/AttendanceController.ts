import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { AttendanceService } from '../services/AttendanceService';
import { ShiftService } from '../services/ShiftService';
import { GeoFenceService } from '../services/GeoFenceService';
import { RegularizationService } from '../services/RegularizationService';
import { OvertimeService } from '../services/OvertimeService';
import { TimesheetService } from '../services/TimesheetService';
import { UserRepository } from '../../auth/repositories/user.repository';
import type { TenantContext } from '../../../db/types';

export class AttendanceController {
  private attendanceService: AttendanceService;
  private shiftService: ShiftService;
  private geofenceService: GeoFenceService;
  private regularizationService: RegularizationService;
  private overtimeService: OvertimeService;
  private timesheetService: TimesheetService;
  private userRepo: UserRepository;

  constructor() {
    this.attendanceService = new AttendanceService();
    this.shiftService = new ShiftService();
    this.geofenceService = new GeoFenceService();
    this.regularizationService = new RegularizationService();
    this.overtimeService = new OvertimeService();
    this.timesheetService = new TimesheetService();
    this.userRepo = new UserRepository();
  }

  /**
   * Helper to resolve the true employeeId linked to the logged-in user
   */
  private async getEmployeeId(ctx: TenantContext): Promise<number> {
    try {
      const user = await this.userRepo.getById(ctx, ctx.userId);
      if (user && user.employeeId) {
        return user.employeeId;
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

    const empIdNumber = typeof employeeId === 'number' ? employeeId : (parseInt(targetEmpCode.replace(/\D/g, ''), 10) || ctx.userId || 1);
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

  breakIn = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { breakType } = req.body;
    const employeeId = await this.getEmployeeId(ctx);

    const record = await this.attendanceService.breakIn(ctx, {
      employeeId,
      breakType,
    });

    res.status(201).json({ success: true, data: record });
  });

  breakOut = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const record = await this.attendanceService.breakOut(ctx, employeeId);

    res.json({ success: true, data: record });
  });

  getTodayRecord = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const record = await this.attendanceService.getTodayRecord(ctx, employeeId);

    res.json({ success: true, data: record });
  });

  getCheckInStatus = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const status = await this.attendanceService.getCheckInStatus(ctx, employeeId);

    res.json({ success: true, data: status });
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, startDate, endDate } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

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

  getActiveShifts = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.shiftService.getActiveShifts(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  assignShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assignment = await this.shiftService.assignShift(ctx, req.body);
    res.status(201).json({ success: true, data: assignment });
  });

  getMyShift = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { date } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    const shift = await this.shiftService.getEmployeeShift(ctx, employeeId, date as string | undefined);

    res.json({ success: true, data: shift });
  });

  requestShiftSwap = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const swap = await this.shiftService.requestShiftSwap(ctx, req.body);
    res.status(201).json({ success: true, data: swap });
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
    const { page = 1, pageSize = 20 } = req.query;
    const employeeId = await this.getEmployeeId(ctx);

    const result = await this.regularizationService.getByEmployee(ctx, employeeId, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getPendingRegularizations = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.regularizationService.getPendingRequests(ctx, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  approveRegularization = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { comments } = req.body;

    const approved = await this.regularizationService.approve(ctx, parseInt(id), comments);

    res.json({ success: true, data: approved });
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

  getCompOffBalance = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const employeeId = await this.getEmployeeId(ctx);

    const balance = await this.overtimeService.getCompOffBalance(ctx, employeeId);

    res.json({ success: true, data: { balance } });
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
    const options = await this.attendanceService.getReportFilterOptions(ctx);
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
}

export const attendanceController = new AttendanceController();
