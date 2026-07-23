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
router.post('/break-in', controller.breakIn);
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

// Shifts
router.get('/my-shift', controller.getMyShift);
router.get('/shifts', controller.getActiveShifts);
router.post('/shifts', controller.createShift);
router.post('/shifts/assign', controller.assignShift);
router.post('/shift-swap', controller.requestShiftSwap);

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
router.post('/geofences', controller.createGeofence);

// Reports and Analytics DB routes
router.get('/reports/options', controller.getReportFilterOptions);
router.get('/reports/tabular', controller.getTabularReport);
router.get('/reports/timelog-matrix', controller.getTimelogMatrixReport);

export default router;

