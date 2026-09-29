import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { AttendanceController } from './controllers/AttendanceController';
import { BiometricController } from './controllers/BiometricController';
import { requireMenuModule } from '../rbac/requireMenuAccess';

// Roles permitted to manage shift templates and assignments — mirrors the
// SHIFT MANAGEMENT sidebar's minRoles in client/src/config/navigation.ts.
// Read-only shift endpoints (GET) are intentionally left open to any
// authenticated org member; only mutating actions are gated here.

const router = Router();
const controller = new AttendanceController();
const biometricController = new BiometricController();

router.use(authenticate, resolveTenant);
router.use(requireMenuModule('attendance'));

// Root endpoint - list attendance records
router.get('/', requirePermission('attendance.read'), controller.getHistory);

// Check in/out
router.post('/check-in', requirePermission('attendance.check_in'), controller.checkIn);
router.post('/check-out', requirePermission('attendance.check_out'), controller.checkOut);
router.post('/process-auto-checkout', async (req, res) => {
  try {
    const { AutoCheckOutService } = await import('./services/AutoCheckOutService');
    const result = await AutoCheckOutService.processAutoCheckOuts();
    res.json({ success: true, message: `Processed ${result.processedCount} auto check-outs`, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/break-in', requirePermission('attendance.break_in'), controller.breakIn);
router.post('/pause-break', requirePermission('attendance.break_out'), controller.pauseBreak);
router.post('/resume-break', requirePermission('attendance.break_in'), controller.resumeBreak);
router.post('/break-out', requirePermission('attendance.break_out'), controller.breakOut);
router.get('/break-logs', requirePermission('attendance.read'), controller.getBreakLogs);
router.post('/qr/scan-punch', controller.qrScanPunch);

// Biometric Face Recognition routes
router.get('/ceo-punches', controller.getCeoPunches);
router.post(
  '/biometric/enroll',
  requirePermission('employee.profile.update'),
  biometricController.enrollFace
);
router.get('/biometric/status', biometricController.getEnrollmentStatus);
router.get('/biometric/ceo-status', biometricController.getCeoStatus);
router.post('/biometric/verify-punch', biometricController.verifyAndPunch);
router.post('/biometric/ceo-punch', biometricController.ceoPunch);
router.get('/biometric/employees', biometricController.getEmployees);
router.post(
  '/biometric/sync-existing',
  requirePermission('employee.profile.update'),
  biometricController.syncExisting
);

// Status and records
router.get('/today', requirePermission('attendance.read'), controller.getTodayRecord);
router.get('/status', requirePermission('attendance.read'), controller.getCheckInStatus);
router.get('/history', requirePermission('attendance.read'), controller.getHistory);

// My shift (employee-facing)
router.get('/my-shift', controller.getMyShift);
router.get('/my-shifts', controller.getMyShifts);
router.get('/my-shifts/today', controller.getTodayShift);
router.get('/my-roster-pattern', controller.getMyRosterPattern);

// Shifts — Templates CRUD
router.get('/shifts', requirePermission('attendance.shift_read'), controller.getAllShifts);
router.post('/shifts', requirePermission('attendance.shift_write'), controller.createShift);
router.get('/shifts/active', requirePermission('attendance.shift_read'), controller.getActiveShifts);
router.get('/shifts/assignments', requirePermission('attendance.shift_read'), controller.getAllAssignments);
router.get('/shifts/:id', requirePermission('attendance.shift_read'), controller.getShiftById);
router.put('/shifts/:id', requirePermission('attendance.shift_write'), controller.updateShift);
router.delete('/shifts/:id', requirePermission('attendance.shift_write'), controller.deleteShift);
router.patch('/shifts/:id/status', requirePermission('attendance.shift_write'), controller.toggleShiftStatus);

// Shift Assignments
router.post('/shifts/assign', requirePermission('attendance.shift_write'), controller.assignShift);
router.delete('/shifts/assignments/:id', requirePermission('attendance.shift_write'), controller.deleteAssignment);

// Shift Swaps
router.post('/shift-swap', requirePermission('attendance.shift_swap'), controller.requestShiftSwap);
router.post('/shift-swap-requests', requirePermission('attendance.shift_swap'), controller.requestShiftSwap);
router.get('/shift-swap-requests/mine', controller.getMySwapRequests);
router.get('/shift-swap-requests/approvals', controller.getSwapApprovals);
router.get('/shift-swaps', controller.getAllSwapRequests);
router.post('/shift-swaps/:id/approve', controller.approveSwap);
router.post('/shift-swaps/:id/reject', controller.rejectSwap);

// Timesheets
router.get('/timesheets', requirePermission('attendance.timesheet_read'), controller.getMyTimesheets);
router.post('/timesheets', requirePermission('attendance.timesheet_write'), controller.createTimesheet);
router.post('/timesheets/:id/entries', requirePermission('attendance.timesheet_write'), controller.addTimesheetEntry);
router.post('/timesheets/:id/submit', requirePermission('attendance.timesheet_write'), controller.submitTimesheet);

// Regularization
router.get('/regularization', requirePermission('attendance.regularization_read'), controller.getMyRegularizations);
router.post('/regularization', requirePermission('attendance.regularization_write'), controller.createRegularization);
router.get('/regularization/manager-pending', requirePermission('attendance.regularization_approve'), controller.getManagerPendingRegularizations);
router.get('/regularization/hr-pending', requirePermission('attendance.regularization_approve'), controller.getHRPendingRegularizations);
router.post('/regularization/:id/manager-approve', requirePermission('attendance.regularization_approve'), controller.managerApproveRegularization);
router.post('/regularization/:id/manager-reject', requirePermission('attendance.regularization_approve'), controller.managerRejectRegularization);
router.post('/regularization/:id/hr-approve', requirePermission('attendance.regularization_approve'), controller.hrApproveRegularization);
router.post('/regularization/:id/hr-reject', requirePermission('attendance.regularization_approve'), controller.hrRejectRegularization);
router.get('/regularization/logs', requirePermission('attendance.regularization_read'), controller.getAdminRegularizationLogs);

// Overtime & Holiday Work Requests
router.get('/overtime', requirePermission('attendance.overtime_read'), controller.getMyOvertime);
router.get('/overtime/all', requirePermission('attendance.overtime_read'), controller.getAllOvertimeRequests);
router.post('/overtime', requirePermission('attendance.overtime_write'), controller.requestOvertime);
router.patch(
  '/overtime/:id/status',
  requirePermission('attendance.overtime_approve'),
  controller.updateOvertimeStatus
);

// OT Rules (Masters Hub CRUD)
router.get('/ot-rules',                   controller.listOTRules);
router.post('/ot-rules',                  controller.createOTRule);
router.get('/ot-rules/:id',               controller.getOTRule);
router.put('/ot-rules/:id',               controller.updateOTRule);
router.delete('/ot-rules/:id',            controller.deleteOTRule);
router.put('/ot-rules/:id/eligibility',   controller.setOTRuleEligibility);


// Geofence and location
router.post('/validate-location', controller.validateLocation);
router.get('/locations', requirePermission('attendance.location_read'), controller.getAllLocations);
router.post('/locations', requirePermission('attendance.location_write'), controller.createLocation);
router.get('/geofences', requirePermission('attendance.location_read'), controller.getAllGeofences);
router.post('/geofences', requirePermission('attendance.location_write'), controller.createGeofence);
router.put('/geofences/:id', requirePermission('attendance.location_write'), controller.updateGeofence);
router.delete('/geofences/:id', requirePermission('attendance.location_write'), controller.deleteGeofence);
router.get('/current-ip', controller.getCurrentIp);
router.get('/employee-locations', requirePermission('attendance.location_read'), controller.getEmployeeLocationAccess);
router.post('/employee-locations/assign', requirePermission('attendance.location_write'), controller.assignEmployeeLocationAccess);
router.post('/employee-locations/bulk-assign', requirePermission('attendance.location_write'), controller.bulkAssignEmployeeLocationAccess);
router.get('/my-permitted-locations', controller.getMyPermittedLocations);

// Reports and Analytics DB routes
router.get('/reports/options', requirePermission('attendance.analytics_read'), controller.getReportFilterOptions);
router.get('/reports/tabular', requirePermission('attendance.analytics_read'), controller.getTabularReport);
router.get('/reports/timelog-matrix', requirePermission('attendance.analytics_read'), controller.getTimelogMatrixReport);

// Attendance Policies DB CRUD
router.get('/policies', requirePermission('attendance.read'), controller.getPolicies);
router.post('/policies', requirePermission('attendance.write'), controller.createPolicy);
router.put('/policies/:id', requirePermission('attendance.write'), controller.updatePolicy);
router.post('/policies/:id/assign', requirePermission('attendance.write'), controller.assignPolicyScope);

export default router;

