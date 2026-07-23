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
router.get('/stats', asyncHandler((req, res) => controller.getPayrollStats(req, res)));
router.get('/:id/status', asyncHandler((req, res) => controller.getPayrollStatus(req, res)));
router.post('/:id/process', asyncHandler((req, res) => controller.processPayroll(req, res)));
router.post('/:id/lock', asyncHandler((req, res) => controller.lockPayroll(req, res)));
router.post('/:id/unlock', asyncHandler((req, res) => controller.unlockPayroll(req, res)));
router.post('/:id/approve', asyncHandler((req, res) => controller.approvePayroll(req, res)));
router.post('/:id/publish', asyncHandler((req, res) => controller.publishPayroll(req, res)));
router.get('/:id/bank-transfer', asyncHandler((req, res) => controller.exportBankTransfer(req, res)));
router.get('/:id/compliance', asyncHandler((req, res) => controller.exportCompliance(req, res)));

// Payslips
router.get('/payslips', asyncHandler((req, res) => controller.getPayslips(req, res)));
router.get('/payslips/:id', asyncHandler((req, res) => controller.getPayslip(req, res)));
router.get('/payslips/:id/details', asyncHandler((req, res) => controller.getPayslipDetails(req, res)));
router.post('/payslips/:id/send', asyncHandler((req, res) => controller.sendPayslip(req, res)));
router.post('/payslips/:id/lock', asyncHandler((req, res) => controller.lockPayslip(req, res)));

// Approvals
router.get('/approvals', asyncHandler((req, res) => controller.getPendingApprovals(req, res)));
router.post('/approvals/:id/approve', asyncHandler((req, res) => controller.approvePayroll(req, res)));

// Salary Structure
router.get('/salary-structure', asyncHandler((req, res) => controller.listStructures(req, res)));
router.get('/salary-structure/:id', asyncHandler((req, res) => controller.getStructure(req, res)));
router.post('/salary-structure', asyncHandler((req, res) => controller.createStructure(req, res)));

// Salary Revisions
router.post('/revisions', asyncHandler((req, res) => controller.requestRevision(req, res)));
router.get('/revisions', asyncHandler((req, res) => controller.getRevisions(req, res)));
router.post('/revisions/:id/submit', asyncHandler((req, res) => controller.submitRevisionForApproval(req, res)));
router.post('/revisions/:id/approve', asyncHandler((req, res) => controller.approveRevision(req, res)));
router.post('/revisions/:id/reject', asyncHandler((req, res) => controller.rejectRevision(req, res)));
router.get('/revisions/:id', asyncHandler((req, res) => controller.getRevision(req, res)));
router.get('/revisions/:id/components', asyncHandler((req, res) => controller.getRevisionComponents(req, res)));

// Loans
router.post('/loans', asyncHandler((req, res) => controller.createLoan(req, res)));
router.get('/loans', asyncHandler((req, res) => controller.getLoans(req, res)));
router.get('/loans/active', asyncHandler((req, res) => controller.getActiveLoan(req, res)));
router.get('/loans/:id', asyncHandler((req, res) => controller.getLoan(req, res)));
router.get('/loans/:id/schedule', asyncHandler((req, res) => controller.getEmiSchedule(req, res)));
router.get('/loans/:id/next-emi', asyncHandler((req, res) => controller.getNextEmi(req, res)));

// Tax Declarations
router.post('/tax-declarations', asyncHandler((req, res) => controller.createTaxDeclaration(req, res)));
router.get('/tax-declarations', asyncHandler((req, res) => controller.getTaxDeclarations(req, res)));
router.post('/tax/calculate-tds', asyncHandler((req, res) => controller.calculateTDS(req, res)));

// Settlements
router.post('/settlements', asyncHandler((req, res) => controller.createSettlement(req, res)));
router.get('/settlements', asyncHandler((req, res) => controller.getSettlements(req, res)));
router.get('/settlements/:id', asyncHandler((req, res) => controller.getSettlement(req, res)));
router.post('/settlements/:id/calculate', asyncHandler((req, res) => controller.calculateSettlement(req, res)));
router.post('/settlements/:id/submit', asyncHandler((req, res) => controller.submitSettlementForApproval(req, res)));
router.post('/settlements/:id/approve', asyncHandler((req, res) => controller.approveSettlement(req, res)));
router.post('/settlements/:id/process', asyncHandler((req, res) => controller.processSettlement(req, res)));

export default router;
