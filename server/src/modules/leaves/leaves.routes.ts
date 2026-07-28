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
leavesRouter.post('/applications/:applicationId/submit', asyncHandler((req, res) => leaveController.submitApplication(req, res)));
leavesRouter.post('/applications/:applicationId/cancel', asyncHandler((req, res) => leaveController.cancelLeave(req, res)));
leavesRouter.post('/applications/:applicationId/withdraw', asyncHandler((req, res) => leaveController.withdrawLeave(req, res)));

// Leave approvals
leavesRouter.get('/approvals', asyncHandler((req, res) => leaveController.getPendingApprovals(req, res)));
leavesRouter.get('/approvals/pending', asyncHandler((req, res) => leaveController.getPendingApprovals(req, res)));
leavesRouter.post('/approvals/:applicationId/approve', asyncHandler((req, res) => leaveController.approveLeave(req, res)));
leavesRouter.post('/approvals/:applicationId/reject', asyncHandler((req, res) => leaveController.rejectLeave(req, res)));
leavesRouter.post('/applications/:applicationId/hr-override', asyncHandler((req, res) => leaveController.hrOverride(req, res)));

// Leave balance
leavesRouter.get('/balances', asyncHandler((req, res) => leaveController.getMyBalances(req, res)));
leavesRouter.get('/balance', asyncHandler((req, res) => leaveController.getMyBalances(req, res)));

// AI Endpoints
leavesRouter.post('/ai/chat', asyncHandler((req, res) => leaveController.chatWithHR(req, res)));
leavesRouter.post('/ai/parse', asyncHandler((req, res) => leaveController.parseLeaveSentence(req, res)));
leavesRouter.post('/ai/analyze-certificate', asyncHandler((req, res) => leaveController.analyzeCertificate(req, res)));

// Reports Endpoints
leavesRouter.get('/reports/custom', asyncHandler((req, res) => leaveController.getCustomReport(req, res)));
leavesRouter.get('/reports/burnout-risk', asyncHandler((req, res) => leaveController.getBurnoutRisk(req, res)));

// Comp off
leavesRouter.get('/comp-off', asyncHandler((req, res) => leaveController.getCompOffBalance(req, res)));
leavesRouter.get('/compoff', asyncHandler((req, res) => leaveController.getCompOffBalance(req, res)));
leavesRouter.post('/comp-off/request', asyncHandler((req, res) => leaveController.requestCompOff(req, res)));
leavesRouter.post('/compoff/request', asyncHandler((req, res) => leaveController.requestCompOff(req, res)));

// Department applications (for managers)
leavesRouter.get('/department/applications', asyncHandler((req, res) => leaveController.getDepartmentApplications(req, res)));

// Date range queries
leavesRouter.get('/range', asyncHandler((req, res) => leaveController.getApplicationsByDateRange(req, res)));

export function mountLeaveRoutes(mainRouter: Router) {
  mainRouter.use('/leaves', leavesRouter);
}

export default leavesRouter;
