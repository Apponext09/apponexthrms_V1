import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { LeaveController } from './controllers/LeaveController';

const leaveController = new LeaveController();

export const leavesRouter = Router();

leavesRouter.use(authenticate, resolveTenant);

// Leave Types
leavesRouter.get('/types', asyncHandler((req, res) => leaveController.getLeaveTypes(req, res)));

// Leave applications
leavesRouter.post('/', asyncHandler((req, res) => leaveController.applyLeave(req, res)));
leavesRouter.post('/applications', asyncHandler((req, res) => leaveController.applyLeave(req, res)));
leavesRouter.get('/', asyncHandler((req, res) => leaveController.getMyLeaves(req, res)));
leavesRouter.get('/applications', asyncHandler((req, res) => leaveController.getMyLeaves(req, res)));
leavesRouter.get('/applications/:applicationId', asyncHandler((req, res) => leaveController.getApplication(req, res)));
leavesRouter.get('/applications/:applicationId/approvals', asyncHandler((req, res) => leaveController.getApprovalHistory(req, res)));
leavesRouter.post('/applications/:applicationId/submit', asyncHandler((req, res) => leaveController.submitApplication(req, res)));
leavesRouter.post('/applications/:applicationId/cancel', asyncHandler((req, res) => leaveController.cancelLeave(req, res)));
leavesRouter.post('/applications/:applicationId/withdraw', asyncHandler((req, res) => leaveController.withdrawLeave(req, res)));

// Leave approvals
leavesRouter.get('/approvals', asyncHandler((req, res) => leaveController.getPendingApprovals(req, res)));
leavesRouter.get('/approvals/pending', asyncHandler((req, res) => leaveController.getPendingApprovals(req, res)));
leavesRouter.get('/approvals/processed', asyncHandler((req, res) => leaveController.getProcessedApprovals(req, res)));
leavesRouter.post('/approvals/:applicationId/approve', asyncHandler((req, res) => leaveController.approveLeave(req, res)));
leavesRouter.post('/approvals/:applicationId/reject', asyncHandler((req, res) => leaveController.rejectLeave(req, res)));
leavesRouter.post('/applications/:applicationId/hr-override', asyncHandler((req, res) => leaveController.hrOverride(req, res)));

// Leave balance & calendar
leavesRouter.get('/balances', asyncHandler((req, res) => leaveController.getMyBalances(req, res)));
leavesRouter.get('/balance', asyncHandler((req, res) => leaveController.getMyBalances(req, res)));
leavesRouter.get('/calendar', asyncHandler((req, res) => leaveController.getLeaveCalendar(req, res)));

// AI Endpoints
leavesRouter.post('/ai/chat', asyncHandler((req, res) => leaveController.chatWithHR(req, res)));
leavesRouter.post('/ai/parse', asyncHandler((req, res) => leaveController.parseLeaveSentence(req, res)));
leavesRouter.post('/ai/analyze-certificate', asyncHandler((req, res) => leaveController.analyzeCertificate(req, res)));
leavesRouter.post('/ai/suggest-leave-type', asyncHandler((req, res) => leaveController.suggestLeaveType(req, res)));
leavesRouter.post('/ai/optimize-coverage', asyncHandler((req, res) => leaveController.optimizeCoverage(req, res)));

// Reports Endpoints
leavesRouter.get('/reports/custom', asyncHandler((req, res) => leaveController.getCustomReport(req, res)));
leavesRouter.get('/reports/burnout-risk', asyncHandler((req, res) => leaveController.getBurnoutRisk(req, res)));



// Policy Mappings (Bulk assignment mappings)
leavesRouter.get('/policy-mappings', asyncHandler((req, res) => leaveController.getPolicyMappings(req, res)));
leavesRouter.post('/policy-mappings', asyncHandler((req, res) => leaveController.createPolicyMapping(req, res)));
leavesRouter.delete('/policy-mappings/:mappingId', asyncHandler((req, res) => leaveController.deletePolicyMapping(req, res)));

// Optional/Floating Holidays Selection (Touchpoint 3)
leavesRouter.get('/optional-holidays', asyncHandler((req, res) => leaveController.getOptionalHolidays(req, res)));
leavesRouter.post('/optional-holidays', asyncHandler((req, res) => leaveController.selectOptionalHoliday(req, res)));
leavesRouter.post('/optional-holidays/select', asyncHandler((req, res) => leaveController.selectOptionalHoliday(req, res)));
leavesRouter.delete('/optional-holidays/:selectionId', asyncHandler((req, res) => leaveController.cancelOptionalHolidaySelection(req, res)));

// Comp-Off Endpoints (Touchpoint 4)
leavesRouter.post('/comp-off/requests', asyncHandler((req, res) => leaveController.createCompOffRequest(req, res)));
leavesRouter.get('/comp-off/requests', asyncHandler((req, res) => leaveController.getCompOffRequests(req, res)));
leavesRouter.post('/comp-off', asyncHandler((req, res) => leaveController.createCompOffRequest(req, res)));
leavesRouter.get('/comp-off', asyncHandler((req, res) => leaveController.getCompOffRequests(req, res)));

leavesRouter.get('/policies', asyncHandler((req, res) => leaveController.getPolicies(req, res)));
leavesRouter.post('/policies', asyncHandler((req, res) => leaveController.createPolicy(req, res)));
leavesRouter.put('/policies/:id', asyncHandler((req, res) => leaveController.updatePolicy(req, res)));
leavesRouter.post('/sync-balances', asyncHandler((req, res) => leaveController.syncBalances(req, res)));

// Blackout Periods
leavesRouter.get('/blackout-periods', asyncHandler((req, res) => leaveController.getBlackoutPeriods(req, res)));
leavesRouter.post('/blackout-periods', asyncHandler((req, res) => leaveController.createBlackoutPeriod(req, res)));
leavesRouter.delete('/blackout-periods/:id', asyncHandler((req, res) => leaveController.deleteBlackoutPeriod(req, res)));

// Department applications (for managers)
leavesRouter.get('/department/applications', asyncHandler((req, res) => leaveController.getDepartmentApplications(req, res)));

// Leave Encashments
leavesRouter.post('/encashments/preview', asyncHandler((req, res) => leaveController.previewLeaveEncashment(req, res)));
leavesRouter.post('/encashments/request', asyncHandler((req, res) => leaveController.requestLeaveEncashment(req, res)));
leavesRouter.get('/encashments/my', asyncHandler((req, res) => leaveController.getMyEncashments(req, res)));
leavesRouter.get('/encashments/pending', asyncHandler((req, res) => leaveController.getPendingEncashments(req, res)));
leavesRouter.post('/encashments/:id/approve', asyncHandler((req, res) => leaveController.approveEncashment(req, res)));
leavesRouter.post('/encashments/:id/reject', asyncHandler((req, res) => leaveController.rejectEncashment(req, res)));
leavesRouter.post('/encashments/:id/pay', asyncHandler((req, res) => leaveController.markEncashmentAsPaid(req, res)));

// Leave Encashment Settings (Formulas & Targets)
leavesRouter.get('/encashment-settings', asyncHandler((req, res) => leaveController.getEncashmentSettings(req, res)));
leavesRouter.post('/encashment-settings', asyncHandler((req, res) => leaveController.createEncashmentSetting(req, res)));
leavesRouter.put('/encashment-settings/:id', asyncHandler((req, res) => leaveController.updateEncashmentSetting(req, res)));
leavesRouter.delete('/encashment-settings/:id', asyncHandler((req, res) => leaveController.deleteEncashmentSetting(req, res)));

// Date range queries
leavesRouter.get('/range', asyncHandler((req, res) => leaveController.getApplicationsByDateRange(req, res)));

// Cron Triggers
leavesRouter.post('/cron/run', asyncHandler((req, res) => leaveController.runExpiryCron(req, res)));
leavesRouter.post('/cron/allocate', asyncHandler((req, res) => leaveController.runAllocationCron(req, res)));

// Report Scheduling
leavesRouter.post('/reports/schedule', asyncHandler((req, res) => leaveController.createReportSchedule(req, res)));
leavesRouter.get('/reports/schedule', asyncHandler((req, res) => leaveController.getReportSchedules(req, res)));

// AI Forecasting
leavesRouter.get('/reports/forecast', asyncHandler((req, res) => leaveController.getLeaveForecast(req, res)));

export function mountLeaveRoutes(mainRouter: Router) {
  mainRouter.use('/leaves', leavesRouter);
}

export default leavesRouter;
