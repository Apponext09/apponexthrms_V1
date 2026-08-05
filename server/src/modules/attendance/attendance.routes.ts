import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { requirePermission } from '../../common/middleware/requirePermission';
import { AttendanceController } from './controllers/AttendanceController';
import { BiometricController } from './controllers/BiometricController';

const router = Router();
const controller = new AttendanceController();
const biometricController = new BiometricController();

router.use(authenticate, resolveTenant);

// Root endpoint - list attendance records
router.get('/', controller.getHistory);

// Check in/out
router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.post('/process-auto-checkout', async (req, res) => {
  try {
    const { AutoCheckOutService } = await import('./services/AutoCheckOutService');
    const result = await AutoCheckOutService.processAutoCheckOuts();
    res.json({ success: true, message: `Processed ${result.processedCount} auto check-outs`, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/break-in', controller.breakIn);
router.post('/pause-break', controller.pauseBreak);
router.post('/resume-break', controller.resumeBreak);
router.post('/break-out', controller.breakOut);
router.post('/qr/scan-punch', controller.qrScanPunch);

// Biometric Face Recognition routes
router.post(
  '/biometric/enroll',
  requirePermission('employee.profile.update'),
  biometricController.enrollFace
);
router.get('/biometric/status', biometricController.getEnrollmentStatus);
router.post('/biometric/verify-punch', biometricController.verifyAndPunch);
router.get('/biometric/employees', biometricController.getEmployees);
router.post(
  '/biometric/sync-existing',
  requirePermission('employee.profile.update'),
  biometricController.syncExisting
);

// Status and records
router.get('/today', controller.getTodayRecord);
router.get('/status', controller.getCheckInStatus);
router.get('/history', controller.getHistory);

// My shift (employee-facing)
router.get('/my-shift', controller.getMyShift);
router.get('/my-shifts', controller.getMyShifts);
router.get('/my-shifts/today', controller.getTodayShift);
router.get('/my-roster-pattern', controller.getMyRosterPattern);

// Shifts — Templates CRUD
router.get('/shifts', controller.getAllShifts);
router.post('/shifts', controller.createShift);
router.get('/shifts/active', controller.getActiveShifts);
router.get('/shifts/assignments', controller.getAllAssignments);
router.get('/shifts/:id', controller.getShiftById);
router.put('/shifts/:id', controller.updateShift);
router.delete('/shifts/:id', controller.deleteShift);
router.patch('/shifts/:id/status', controller.toggleShiftStatus);

// Shift Assignments
router.post('/shifts/assign', controller.assignShift);
router.delete('/shifts/assignments/:id', controller.deleteAssignment);

// Shift Swaps
router.post('/shift-swap', controller.requestShiftSwap);
router.post('/shift-swap-requests', controller.requestShiftSwap);
router.get('/shift-swap-requests/mine', controller.getMySwapRequests);
router.get('/shift-swap-requests/approvals', controller.getSwapApprovals);
router.get('/shift-swaps', controller.getAllSwapRequests);
router.post('/shift-swaps/:id/approve', controller.approveSwap);
router.post('/shift-swaps/:id/reject', controller.rejectSwap);

// Timesheets
router.get('/timesheets', controller.getMyTimesheets);
router.post('/timesheets', controller.createTimesheet);
router.post('/timesheets/:id/entries', controller.addTimesheetEntry);
router.post('/timesheets/:id/submit', controller.submitTimesheet);

// Regularization
router.get('/regularization', controller.getMyRegularizations);
router.get('/regularization/pending', controller.getPendingRegularizations);
router.post('/regularization', controller.createRegularization);
router.post('/regularization/:id/approve', controller.approveRegularization);

// Status and records
router.get('/today', controller.getTodayRecord);
router.get('/status', controller.getCheckInStatus);
router.get('/history', controller.getHistory);



// Timesheets
router.get('/timesheets', controller.getMyTimesheets);
router.post('/timesheets', controller.createTimesheet);
router.post('/timesheets/:id/entries', controller.addTimesheetEntry);
router.post('/timesheets/:id/submit', controller.submitTimesheet);

// Regularization
router.get('/regularization', controller.getMyRegularizations);
router.get('/regularization/pending', controller.getPendingRegularizations);
router.post('/regularization', controller.createRegularization);
router.post('/regularization/:id/approve', controller.approveRegularization);

// Overtime
router.get('/overtime', controller.getMyOvertime);
router.post('/overtime', controller.requestOvertime);
router.get('/comp-off-balance', controller.getCompOffBalance);

// Geofence and location
router.post('/validate-location', controller.validateLocation);
router.get('/locations', controller.getAllLocations);
router.post('/locations', controller.createLocation);
router.get('/geofences', controller.getAllGeofences);
router.post('/geofences', controller.createGeofence);
router.put('/geofences/:id', controller.updateGeofence);
router.delete('/geofences/:id', controller.deleteGeofence);
router.get('/current-ip', controller.getCurrentIp);
router.get('/employee-locations', controller.getEmployeeLocationAccess);
router.post('/employee-locations/assign', controller.assignEmployeeLocationAccess);
router.post('/employee-locations/bulk-assign', controller.bulkAssignEmployeeLocationAccess);
router.get('/my-permitted-locations', controller.getMyPermittedLocations);

// Reports and Analytics DB routes
router.get('/reports/options', controller.getReportFilterOptions);
router.get('/reports/tabular', controller.getTabularReport);
router.get('/reports/timelog-matrix', controller.getTimelogMatrixReport);

// Attendance Policies DB CRUD
router.get('/policies', controller.getPolicies);
router.post('/policies', controller.createPolicy);
router.put('/policies/:id', controller.updatePolicy);
router.post('/policies/:id/assign', controller.assignPolicyScope);

export default router;

