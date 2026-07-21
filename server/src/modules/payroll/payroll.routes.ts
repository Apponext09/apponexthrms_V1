import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { PayrollController } from './controllers/PayrollController';

const router = Router();
const controller = new PayrollController();

router.use(authenticate, resolveTenant);

// Payroll management
router.post('/', asyncHandler((req, res) => controller.generatePayroll(req, res)));
router.get('/', asyncHandler((req, res) => controller.listPayrolls(req, res)));
router.get('/:id/status', asyncHandler((req, res) => controller.getPayrollStatus(req, res)));
router.post('/:id/process', asyncHandler((req, res) => controller.processPayroll(req, res)));
router.post('/:id/lock', asyncHandler((req, res) => controller.lockPayroll(req, res)));
router.post('/:id/unlock', asyncHandler((req, res) => controller.unlockPayroll(req, res)));
router.post('/:id/approve', asyncHandler((req, res) => controller.approvePayroll(req, res)));
router.post('/:id/publish', asyncHandler((req, res) => controller.publishPayroll(req, res)));

// Payslips
router.get('/payslips', asyncHandler((req, res) => controller.getPayslips(req, res)));
router.get('/payslips/:id', asyncHandler((req, res) => controller.getPayslip(req, res)));
router.post('/payslips/:id/email', asyncHandler((req, res) => controller.emailPayslip(req, res)));
router.post('/payslips/:id/download', asyncHandler((req, res) => controller.downloadPayslip(req, res)));

// Approvals
router.get('/approvals', asyncHandler((req, res) => controller.getPendingApprovals(req, res)));
router.post('/approvals/:id/approve', asyncHandler((req, res) => controller.approvePayroll(req, res)));

// Salary Structure
router.get('/salary-structure', asyncHandler((req, res) => controller.getSalaryStructure(req, res)));
router.post('/salary-structure', asyncHandler((req, res) => controller.createSalaryStructure(req, res)));
router.put('/salary-structure/:id', asyncHandler((req, res) => controller.updateSalaryStructure(req, res)));

// Salary Revisions
router.post('/revisions', asyncHandler((req, res) => controller.createRevision(req, res)));
router.get('/revisions', asyncHandler((req, res) => controller.getRevisions(req, res)));
router.post('/revisions/:id/approve', asyncHandler((req, res) => controller.approveRevision(req, res)));

// Loans
router.post('/loans', asyncHandler((req, res) => controller.applyLoan(req, res)));
router.get('/loans', asyncHandler((req, res) => controller.getLoans(req, res)));
router.get('/loans/:id', asyncHandler((req, res) => controller.getLoan(req, res)));
router.get('/loans/:id/schedule', asyncHandler((req, res) => controller.getLoanSchedule(req, res)));

// Tax Declarations
router.post('/tax-declarations', asyncHandler((req, res) => controller.createTaxDeclaration(req, res)));
router.get('/tax-declarations', asyncHandler((req, res) => controller.getTaxDeclarations(req, res)));
router.post('/tax/calculate', asyncHandler((req, res) => controller.calculateTds(req, res)));

// Settlements
router.post('/settlements', asyncHandler((req, res) => controller.processSettlement(req, res)));
router.get('/settlements', asyncHandler((req, res) => controller.getSettlements(req, res)));

export default router;
