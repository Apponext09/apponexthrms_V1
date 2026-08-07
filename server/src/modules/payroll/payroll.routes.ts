import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { PayrollController } from './controllers/PayrollController';

const router = Router();
const controller = new PayrollController();

router.use(authenticate, resolveTenant);

// Payroll management
router.get('/cycles', asyncHandler((req, res) => controller.listCycles(req, res)));
router.post('/cycles', asyncHandler((req, res) => controller.createCycle(req, res)));
router.get('/cycles/:id', asyncHandler((req, res) => controller.getCycle(req, res)));
router.put('/cycles/:id', asyncHandler((req, res) => controller.updateCycle(req, res)));
router.delete('/cycles/:id', asyncHandler((req, res) => controller.deleteCycle(req, res)));

// Component Groups
router.get('/component-groups', asyncHandler((req, res) => controller.listComponentGroups(req, res)));
router.post('/component-groups', asyncHandler((req, res) => controller.createComponentGroup(req, res)));
router.put('/component-groups/:id', asyncHandler((req, res) => controller.updateComponentGroup(req, res)));
router.delete('/component-groups/:id', asyncHandler((req, res) => controller.deleteComponentGroup(req, res)));

// Component Definitions
router.get('/component-definitions', asyncHandler((req, res) => controller.listComponentDefinitions(req, res)));
router.post('/component-definitions', asyncHandler((req, res) => controller.createComponentDefinition(req, res)));
router.put('/component-definitions/:id', asyncHandler((req, res) => controller.updateComponentDefinition(req, res)));
router.delete('/component-definitions/:id', asyncHandler((req, res) => controller.deleteComponentDefinition(req, res)));
router.get('/slabs', asyncHandler((req, res) => controller.listSlabs(req, res)));
router.post('/slabs', asyncHandler((req, res) => controller.createSlab(req, res)));
router.put('/slabs/:id', asyncHandler((req, res) => controller.updateSlab(req, res)));
router.delete('/slabs/:id', asyncHandler((req, res) => controller.deleteSlab(req, res)));
router.post('/', asyncHandler((req, res) => controller.generatePayroll(req, res)));
router.get('/', asyncHandler((req, res) => controller.listPayrolls(req, res)));
router.get('/stats', asyncHandler((req, res) => controller.getPayrollStats(req, res)));
router.get('/process-register', asyncHandler((req, res) => controller.getProcessRegister(req, res)));
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
router.post('/payslips', asyncHandler((req, res) => controller.createPayslip(req, res)));
router.get('/payslips/:id', asyncHandler((req, res) => controller.getPayslip(req, res)));
router.get('/payslips/:id/details', asyncHandler((req, res) => controller.getPayslipDetails(req, res)));
router.post('/payslips/:id/send', asyncHandler((req, res) => controller.sendPayslip(req, res)));
router.post('/payslips/:id/lock', asyncHandler((req, res) => controller.lockPayslip(req, res)));

// Approvals
router.get('/approvals', asyncHandler((req, res) => controller.getPendingApprovals(req, res)));
router.post('/approvals/:id/approve', asyncHandler((req, res) => controller.approvePayroll(req, res)));

// Salary Structure — /my-salary-structure MUST be before /:id parameterized routes
router.get('/my-salary-structure', asyncHandler((req, res) => controller.getMySalaryStructure(req, res)));

router.get('/salary-structure', asyncHandler((req, res) => controller.listStructures(req, res)));
router.post('/salary-structure', asyncHandler((req, res) => controller.createStructure(req, res) as any));
router.get('/salary-structure/:id', asyncHandler((req, res) => controller.getStructure(req, res) as any));
router.put('/salary-structure/:id', asyncHandler((req, res) => controller.updateStructure(req, res)));
router.delete('/salary-structure/:id', asyncHandler((req, res) => controller.deleteStructure(req, res)));

router.get('/structures', asyncHandler((req, res) => controller.listStructures(req, res)));
router.get('/structures/mappings', asyncHandler((req, res) => controller.listEmployeeMappings(req, res)));
router.post('/structures/assign', asyncHandler((req, res) => controller.assignStructureToEmployee(req, res)));
router.post('/structures', asyncHandler((req, res) => controller.createStructure(req, res) as any));
router.get('/structures/:id', asyncHandler((req, res) => controller.getStructure(req, res) as any));
router.put('/structures/:id', asyncHandler((req, res) => controller.updateStructure(req, res)));
router.delete('/structures/:id', asyncHandler((req, res) => controller.deleteStructure(req, res)));




// Salary Revisions
router.get('/salary-revisions', asyncHandler((req, res) => controller.listSalaryRevisions(req, res)));
router.post('/salary-revisions', asyncHandler((req, res) => controller.createSalaryRevision(req, res)));
router.put('/salary-revisions/:id/approve', asyncHandler((req, res) => controller.approveSalaryRevision(req, res)));
router.put('/salary-revisions/:id/reject', asyncHandler((req, res) => controller.rejectRevision(req, res)));
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
router.post('/loans/:id/approve', asyncHandler((req, res) => controller.approveLoan(req, res)));
router.post('/loans/:id/reject', asyncHandler((req, res) => controller.rejectLoan(req, res)));
router.get('/loans/:id/schedule', asyncHandler((req, res) => controller.getEmiSchedule(req, res)));
router.get('/loans/:id/next-emi', asyncHandler((req, res) => controller.getNextEmi(req, res)));

// Tax Declarations
router.post('/tax-declarations', asyncHandler((req, res) => controller.createTaxDeclaration(req, res)));
router.get('/tax-declarations', asyncHandler((req, res) => controller.getTaxDeclarations(req, res)));
router.post('/tax/calculate-tds', asyncHandler((req, res) => controller.calculateTDS(req, res)));

// Settlements
router.get('/settlements/my-settlement', asyncHandler((req, res) => controller.getMySettlement(req, res)));
router.get('/settlements/team', asyncHandler((req, res) => controller.getTeamSettlements(req, res)));
router.get('/settlements/exit-requests', asyncHandler((req, res) => controller.getPendingExitRequests(req, res)));
router.post('/settlements/exit-request', asyncHandler((req, res) => controller.submitExitRequest(req, res)));
router.post('/settlements', asyncHandler((req, res) => controller.createSettlement(req, res)));
router.get('/settlements', asyncHandler((req, res) => controller.getSettlements(req, res)));
router.get('/settlements/:id', asyncHandler((req, res) => controller.getSettlement(req, res)));
router.post('/settlements/:id/calculate', asyncHandler((req, res) => controller.calculateSettlement(req, res)));
router.post('/settlements/:id/submit', asyncHandler((req, res) => controller.submitSettlementForApproval(req, res)));
router.post('/settlements/:id/approve', asyncHandler((req, res) => controller.approveSettlement(req, res)));
router.post('/settlements/:id/admin-approve', asyncHandler((req, res) => controller.adminApproveSettlement(req, res)));
router.post('/settlements/:id/admin-reject', asyncHandler((req, res) => controller.adminRejectSettlement(req, res)));
router.post('/settlements/:id/process', asyncHandler((req, res) => controller.processSettlement(req, res)));

// Policies & Config
router.get('/policies', asyncHandler((req, res) => controller.getPayrollPolicies(req, res)));
router.post('/policies', asyncHandler((req, res) => controller.updatePayrollPolicies(req, res)));

// Pay Component Definitions
router.get('/components', asyncHandler((req, res) => controller.getComponents(req, res)));
router.post('/components', asyncHandler((req, res) => controller.createComponent(req, res)));
router.delete('/components/:id', asyncHandler((req, res) => controller.deleteComponentDefinition(req, res)));

// Loan Type Configuration (Database persistence)
router.get('/loan-types', asyncHandler((req, res) => controller.getLoanTypes(req, res)));
router.post('/loan-types', asyncHandler((req, res) => controller.saveLoanType(req, res)));
router.delete('/loan-types/:id', asyncHandler((req, res) => controller.deleteLoanType(req, res)));

// Attendance Lock
router.post('/attendance-lock', asyncHandler((req, res) => controller.lockAttendance(req, res)));
router.get('/attendance-lock', asyncHandler((req, res) => controller.getAttendanceLockStatus(req, res)));

// Reimbursement Claims
router.post('/reimbursements', asyncHandler((req, res) => controller.submitReimbursement(req, res)));
router.get('/reimbursements', asyncHandler((req, res) => controller.getReimbursements(req, res)));
router.post('/reimbursements/:id/approve', asyncHandler((req, res) => controller.approveReimbursement(req, res)));
router.post('/reimbursements/:id/reject', asyncHandler((req, res) => controller.rejectReimbursement(req, res)));

// Financial Ledger
router.get('/ledger', asyncHandler((req, res) => controller.getLedgerEntries(req, res)));

// Integrations (Leave Engine)
router.get('/is-locked', asyncHandler((req, res) => controller.isLocked(req, res)));
router.post('/arrears-adjustment', asyncHandler((req, res) => controller.arrearsAdjustment(req, res)));

export default router;
