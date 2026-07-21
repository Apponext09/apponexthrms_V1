import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { AttendanceController } from './controllers/AttendanceController';

const router = Router();
const controller = new AttendanceController();

router.use(authenticate, resolveTenant);

// Root endpoint - list attendance records
router.get('/', controller.getHistory);

// Check in/out
router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.post('/break-in', controller.breakIn);
router.post('/break-out', controller.breakOut);

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

export default router;
