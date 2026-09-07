import { Router } from 'express';
import { ExpenseController } from './controllers/ExpenseController';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();
const controller = new ExpenseController();

router.use(authenticate, resolveTenant);

// Categories
router.get('/categories', asyncHandler((req, res) => controller.getCategories(req, res)));
router.post('/categories', asyncHandler((req, res) => controller.createCategory(req, res)));
router.put('/categories/:id', asyncHandler((req, res) => controller.updateCategory(req, res)));
router.delete('/categories/:id', asyncHandler((req, res) => controller.deleteCategory(req, res)));

// Policies
router.get('/policies', asyncHandler((req, res) => controller.getPolicies(req, res)));
router.post('/policies', asyncHandler((req, res) => controller.createPolicy(req, res)));
router.put('/policies/:id', asyncHandler((req, res) => controller.updatePolicy(req, res)));
router.delete('/policies/:id', asyncHandler((req, res) => controller.deletePolicy(req, res)));
router.post('/policies/validate', asyncHandler((req, res) => controller.validatePolicy(req, res)));

// Travel Requests & Advances
router.get('/travel-requests', asyncHandler((req, res) => controller.getTravelRequests(req, res)));
router.post('/travel-requests', asyncHandler((req, res) => controller.createTravelRequest(req, res)));
router.put('/travel-requests/:id/status', asyncHandler((req, res) => controller.updateTravelRequestStatus(req, res)));

router.get('/travel-advances', asyncHandler((req, res) => controller.getTravelAdvances(req, res)));
router.post('/travel-advances', asyncHandler((req, res) => controller.createTravelAdvance(req, res)));
router.put('/travel-advances/:id/approve', asyncHandler((req, res) => controller.approveTravelAdvance(req, res)));
router.put('/travel-advances/:id/reject', asyncHandler((req, res) => controller.rejectTravelAdvance(req, res)));

// Mileage Claims
router.get('/mileage', asyncHandler((req, res) => controller.getMileageClaims(req, res)));
router.post('/mileage', asyncHandler((req, res) => controller.createMileageClaim(req, res)));

// Dashboard & Reports
router.get('/dashboard/summary', asyncHandler((req, res) => controller.getDashboardSummary(req, res)));
router.get('/reports', asyncHandler((req, res) => controller.getReports(req, res)));

// Settings
router.get('/settings', asyncHandler((req, res) => controller.getSettings(req, res)));
router.put('/settings', asyncHandler((req, res) => controller.updateSettings(req, res)));

// Workflows
router.get('/workflows', asyncHandler((req, res) => controller.getWorkflows(req, res)));
router.post('/workflows', asyncHandler((req, res) => controller.createWorkflow(req, res)));
router.put('/workflows/:id', asyncHandler((req, res) => controller.updateWorkflow(req, res)));
router.delete('/workflows/:id', asyncHandler((req, res) => controller.deleteWorkflow(req, res)));

// Claims CRUD & Actions
router.get('/claims', asyncHandler((req, res) => controller.getClaims(req, res)));
router.get('/claims/:id', asyncHandler((req, res) => controller.getClaimById(req, res)));
router.post('/claims', asyncHandler((req, res) => controller.submitClaim(req, res)));
router.put('/claims/:id', asyncHandler((req, res) => controller.updateClaim(req, res)));

// Approvals & Workflow Actions
router.post('/claims/bulk-approve', asyncHandler((req, res) => controller.bulkApproveClaims(req, res)));
router.post('/claims/:id/manager-approve', asyncHandler((req, res) => controller.approveClaimByManager(req, res)));
router.post('/claims/:id/finance-verify', asyncHandler((req, res) => controller.verifyAndApproveByFinance(req, res)));
router.post('/claims/:id/approve', asyncHandler((req, res) => controller.approveClaimByManager(req, res)));
router.post('/claims/:id/reject', asyncHandler((req, res) => controller.rejectClaim(req, res)));
router.post('/claims/:id/return', asyncHandler((req, res) => controller.returnClaimForCorrection(req, res)));
router.post('/claims/:id/reimburse', asyncHandler((req, res) => controller.processReimbursement(req, res)));

export default router;
