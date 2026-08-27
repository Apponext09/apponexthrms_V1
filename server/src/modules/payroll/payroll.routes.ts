import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { requirePermission } from '../../common/middleware/requirePermission';
import { PayrollController } from './controllers/PayrollController';

const router = Router();
const controller = new PayrollController();

router.use(authenticate, resolveTenant);

// Attendance calendar for the Process Payroll "View Attendance" modal
router.get('/attendance-calendar', asyncHandler((req, res) => controller.getAttendanceCalendar(req, res)));

// Payroll Master Settings (statuses, approvals, ESIC, sandwich policy, etc.)
router.get('/settings', asyncHandler((req, res) => controller.getPayrollSettings(req, res)));
router.put('/settings', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.updatePayrollSettings(req, res)));

// Payroll management
router.get('/cycles', asyncHandler((req, res) => controller.listCycles(req, res)));
router.post('/cycles', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.createCycle(req, res)));
router.get('/cycles/:id', asyncHandler((req, res) => controller.getCycle(req, res)));
router.put('/cycles/:id', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.updateCycle(req, res)));
router.delete('/cycles/:id', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.deleteCycle(req, res)));

// Component Groups
router.get('/component-groups', asyncHandler((req, res) => controller.listComponentGroups(req, res)));
router.get('/component-groups/:id/audit-logs', asyncHandler((req, res) => controller.getComponentGroupAuditLogs(req, res)));
router.post('/component-groups', requirePermission('structure:create'), asyncHandler((req, res) => controller.createComponentGroup(req, res)));
router.put('/component-groups/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.updateComponentGroup(req, res)));
router.delete('/component-groups/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteComponentGroup(req, res)));

// Component Definitions
router.get('/components', asyncHandler((req, res) => controller.getComponents(req, res)));
router.post('/components', requirePermission('structure:create'), asyncHandler((req, res) => controller.createComponent(req, res)));
router.delete('/components/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteComponentDefinition(req, res)));
router.get('/component-definitions', asyncHandler((req, res) => controller.listComponentDefinitions(req, res)));
router.get('/component-definitions/:id/audit-logs', asyncHandler((req, res) => controller.getComponentAuditLogs(req, res)));
router.post('/component-definitions', requirePermission('structure:create'), asyncHandler((req, res) => controller.createComponentDefinition(req, res)));
router.put('/component-definitions/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.updateComponentDefinition(req, res)));
router.delete('/component-definitions/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteComponentDefinition(req, res)));
router.get('/slabs', asyncHandler((req, res) => controller.listSlabs(req, res)));
router.post('/slabs/bulk-assign', requirePermission('structure:assign'), asyncHandler((req, res) => controller.bulkAssignSlabs(req, res)));
router.post('/structures/mass-upload', requirePermission('structure:assign'), asyncHandler((req, res) => controller.bulkAssignSlabs(req, res)));
router.post('/structures/mass-upload-log', requirePermission('structure:assign'), asyncHandler((req, res) => controller.createMassUploadLog(req, res)));
router.get('/structures/mass-upload-log', asyncHandler((req, res) => controller.getMassUploadLogs(req, res)));
router.post('/slabs', requirePermission('structure:create'), asyncHandler((req, res) => controller.createSlab(req, res)));
router.put('/slabs/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.updateSlab(req, res)));
router.delete('/slabs/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteSlab(req, res)));
router.get('/stats', asyncHandler((req, res) => controller.getPayrollStats(req, res)));
router.get('/manager-stats', asyncHandler((req, res) => controller.getManagerDeptStats(req, res)));
router.get('/process-register', asyncHandler((req, res) => controller.getProcessRegister(req, res)));
router.post('/process-register/override', requirePermission('payroll:process'), asyncHandler((req, res) => controller.saveProcessRegisterOverride(req, res)));
router.post('/process-register/reset-override', requirePermission('payroll:process'), asyncHandler((req, res) => controller.resetProcessRegisterOverride(req, res)));
router.patch('/run-employees/:id', requirePermission('payroll:process'), asyncHandler(async (req, res) => {
  const db = (await import('../../db/knex')).getKnex();
  const { id } = req.params;
  const allowedFields = ['status', 'payment_status', 'notes', 'processing_notes'];
  const update: any = { updated_at: new Date() };
  for (const f of allowedFields) {
    if (req.body[f] !== undefined) update[f] = req.body[f];
  }
  await db('payroll_run_employees').where('id', id).where('organization_id', req.ctx.organizationId).update(update);
  const row = await db('payroll_run_employees').where('id', id).first();
  res.json({ success: true, data: row });
}));
router.get('/runs', asyncHandler((req, res) => controller.listPayrolls(req, res)));
router.get('/runs/:id/register', asyncHandler((req, res) => controller.getProcessRegister(req, res)));
router.post('/', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.generatePayroll(req, res)));
router.get('/', asyncHandler((req, res) => controller.listPayrolls(req, res)));
router.get('/:id/status', asyncHandler((req, res) => controller.getPayrollStatus(req, res)));

router.post('/:id/process', requirePermission('payroll:process'), asyncHandler((req, res) => controller.processPayroll(req, res)));
router.get('/:id/reconciliation', asyncHandler((req, res) => controller.getReconciliation(req, res)));
router.post('/:id/lock', requirePermission('payroll:lock'), asyncHandler((req, res) => controller.lockPayroll(req, res)));
router.post('/:id/unlock', requirePermission('payroll:unlock'), asyncHandler((req, res) => controller.unlockPayroll(req, res)));
router.post('/:id/approve', requirePermission('payroll:approve'), asyncHandler((req, res) => controller.approvePayroll(req, res)));
router.post('/:id/publish', requirePermission('payroll:publish'), asyncHandler((req, res) => controller.publishPayroll(req, res)));
router.get('/:id/bank-transfer', asyncHandler((req, res) => controller.exportBankTransfer(req, res)));
router.get('/:id/compliance', asyncHandler((req, res) => controller.exportCompliance(req, res)));

// Payslips
router.get('/payslips', asyncHandler((req, res) => controller.getPayslips(req, res)));
router.post('/payslips', requirePermission('payslip:send'), asyncHandler((req, res) => controller.createPayslip(req, res)));
router.post('/payslips/generate-from-process', requirePermission('payslip:send'), asyncHandler((req, res) => controller.generatePayslipFromProcess(req, res)));
router.get('/payslips/:id', asyncHandler((req, res) => controller.getPayslip(req, res)));
router.get('/payslips/:id/details', asyncHandler((req, res) => controller.getPayslipDetails(req, res)));
router.post('/payslips/:id/send', requirePermission('payslip:send'), asyncHandler((req, res) => controller.sendPayslip(req, res)));
router.post('/payslips/:id/lock', requirePermission('payslip:lock'), asyncHandler((req, res) => controller.lockPayslip(req, res)));

// Approvals
router.get('/approvals', asyncHandler((req, res) => controller.getPendingApprovals(req, res)));
router.post('/approvals/:id/approve', requirePermission('payroll:approve'), asyncHandler((req, res) => controller.approvePayroll(req, res)));

// Full & Final Settlements — static sub-routes MUST be before /:id parameterized routes

// Salary Structure — /my-salary-structure MUST be before /:id parameterized routes
router.get('/my-salary-structure', asyncHandler((req, res) => controller.getMySalaryStructure(req, res)));

router.post('/calculate-structure-preview', asyncHandler((req, res) => controller.calculateStructurePreview(req, res)));
router.get('/salary-structure', asyncHandler((req, res) => controller.listStructures(req, res)));
router.post('/salary-structure', requirePermission('structure:create'), asyncHandler((req, res) => controller.createStructure(req, res) as any));
router.get('/salary-structure/:id', asyncHandler((req, res) => controller.getStructure(req, res) as any));
router.put('/salary-structure/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.updateStructure(req, res)));
router.delete('/salary-structure/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteStructure(req, res)));

router.get('/structures', asyncHandler((req, res) => controller.listStructures(req, res)));
router.get('/structures/mappings', asyncHandler((req, res) => controller.listEmployeeMappings(req, res)));
router.post('/structures/assign', requirePermission('structure:assign'), asyncHandler((req, res) => controller.assignStructureToEmployee(req, res)));
router.post('/structures', requirePermission('structure:create'), asyncHandler((req, res) => controller.createStructure(req, res) as any));
router.get('/structures/:id', asyncHandler((req, res) => controller.getStructure(req, res) as any));
router.put('/structures/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.updateStructure(req, res)));
router.delete('/structures/:id', requirePermission('structure:edit'), asyncHandler((req, res) => controller.deleteStructure(req, res)));

// Salary Revisions
router.get('/salary-revisions', asyncHandler((req, res) => controller.listSalaryRevisions(req, res)));
router.post('/salary-revisions', asyncHandler((req, res) => controller.createSalaryRevision(req, res)));
router.put('/salary-revisions/:id/approve', asyncHandler((req, res) => controller.approveSalaryRevision(req, res)));
router.put('/salary-revisions/:id/reject', asyncHandler((req, res) => controller.rejectRevision(req, res)));
router.post('/revisions', requirePermission('revision:request'), asyncHandler((req, res) => controller.requestRevision(req, res)));
router.get('/revisions', asyncHandler((req, res) => controller.getRevisions(req, res)));
router.post('/revisions/:id/submit', requirePermission('revision:submit'), asyncHandler((req, res) => controller.submitRevisionForApproval(req, res)));
router.post('/revisions/:id/approve', requirePermission('revision:approve'), asyncHandler((req, res) => controller.approveRevision(req, res)));
router.post('/revisions/:id/reject', requirePermission('revision:approve'), asyncHandler((req, res) => controller.rejectRevision(req, res)));
router.get('/revisions/:id', asyncHandler((req, res) => controller.getRevision(req, res)));
router.get('/revisions/:id/components', asyncHandler((req, res) => controller.getRevisionComponents(req, res)));

// Loans
router.post('/loans', asyncHandler((req, res) => controller.createLoan(req, res)));
router.get('/loans', asyncHandler((req, res) => controller.getLoans(req, res)));
router.get('/loans/active', asyncHandler((req, res) => controller.getActiveLoan(req, res)));
router.get('/loans/:id', asyncHandler((req, res) => controller.getLoan(req, res)));
router.put('/loans/:id', asyncHandler((req, res) => controller.updateLoan(req, res)));
router.patch('/loans/:id', asyncHandler((req, res) => controller.updateLoan(req, res)));
router.post('/loans/:id/approve', requirePermission('loan:create'), asyncHandler((req, res) => controller.approveLoan(req, res)));
router.post('/loans/:id/reject', requirePermission('loan:create'), asyncHandler((req, res) => controller.rejectLoan(req, res)));
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
router.post('/settlements', requirePermission('settlement:create'), asyncHandler((req, res) => controller.createSettlement(req, res)));
router.get('/settlements', asyncHandler((req, res) => controller.getSettlements(req, res)));
router.get('/settlements/:id', asyncHandler((req, res) => controller.getSettlement(req, res)));
router.post('/settlements/:id/calculate', requirePermission('settlement:calculate'), asyncHandler((req, res) => controller.calculateSettlement(req, res)));
router.post('/settlements/:id/submit', requirePermission('settlement:submit'), asyncHandler((req, res) => controller.submitSettlementForApproval(req, res)));
router.post('/settlements/:id/approve', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.approveSettlement(req, res)));
router.put('/settlements/:id/approve', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.adminApproveSettlement(req, res)));
router.post('/settlements/:id/admin-approve', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.adminApproveSettlement(req, res)));
router.post('/settlements/:id/admin-reject', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.adminRejectSettlement(req, res)));
router.post('/settlements/:id/reverse', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.adminRejectSettlement(req, res)));
router.put('/settlements/:id/reverse', requirePermission('settlement:approve'), asyncHandler((req, res) => controller.adminRejectSettlement(req, res)));
router.post('/settlements/:id/process', requirePermission('settlement:process'), asyncHandler((req, res) => controller.processSettlement(req, res)));

// Gratuity Policy Rules (Sub-feature under Settlements)
router.get('/gratuity-rules', asyncHandler((req, res) => controller.getGratuityRules(req, res)));
router.post('/gratuity-rules', requirePermission('settlement:create'), asyncHandler((req, res) => controller.saveGratuityRule(req, res)));
router.delete('/gratuity-rules/:id', requirePermission('settlement:create'), asyncHandler((req, res) => controller.deleteGratuityRule(req, res)));

// Policies & Config
router.get('/policies', asyncHandler((req, res) => controller.getPayrollPolicies(req, res)));
router.post('/policies', requirePermission('payroll:generate'), asyncHandler((req, res) => controller.updatePayrollPolicies(req, res)));

// Loan Type Configuration (Database persistence)
router.get('/loan-types', asyncHandler((req, res) => controller.getLoanTypes(req, res)));
router.post('/loan-types', requirePermission('loan:create'), asyncHandler((req, res) => controller.saveLoanType(req, res)));
router.delete('/loan-types/:id', requirePermission('loan:create'), asyncHandler((req, res) => controller.deleteLoanType(req, res)));

// Attendance Lock
router.post('/attendance-lock', requirePermission('payroll:process'), asyncHandler((req, res) => controller.lockAttendance(req, res)));
router.get('/attendance-lock', asyncHandler((req, res) => controller.getAttendanceLockStatus(req, res)));

// Reimbursement Claims
router.post('/reimbursements', asyncHandler((req, res) => controller.submitReimbursement(req, res)));
router.get('/reimbursements', asyncHandler((req, res) => controller.getReimbursements(req, res)));
router.post('/reimbursements/:id/approve', asyncHandler((req, res) => controller.approveReimbursement(req, res)));
router.put('/reimbursements/:id/approve', asyncHandler((req, res) => controller.approveReimbursement(req, res)));
router.post('/reimbursements/:id/reject', asyncHandler((req, res) => controller.rejectReimbursement(req, res)));
router.put('/reimbursements/:id/reject', asyncHandler((req, res) => controller.rejectReimbursement(req, res)));

// Financial Ledger
router.get('/ledger', asyncHandler((req, res) => controller.getLedgerEntries(req, res)));

// Integrations (Leave Engine)
router.get('/is-locked', asyncHandler((req, res) => controller.isLocked(req, res)));
router.post('/arrears-adjustment', requirePermission('payroll:process'), asyncHandler((req, res) => controller.arrearsAdjustment(req, res)));

// Catch-all single-segment GET — MUST be declared last, after every other
// top-level GET route above, or it silently shadows all of them (Express
// matches routes in declaration order). The Payroll Runs "View Details"
// modal calls GET /payroll/:id expecting exactly this; the route never
// existed before, so every click 404'd and the modal silently showed an
// empty employee list.
router.get('/:id', asyncHandler((req, res) => controller.getPayrollRunDetails(req, res)));

export default router;
