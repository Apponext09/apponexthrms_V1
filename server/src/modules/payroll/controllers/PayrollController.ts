/**
 * PayrollController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Payroll Controller / Facade.
 *
 * Delegates all domain responsibilities to focused sub-controllers:
 * - PayrollRunController: Payroll run lifecycle (generate, process, lock, approve, publish, stats)
 * - PayrollRegisterController: Dynamic calculation Process Register page & overrides
 * - SalaryStructureController: Salary structures, previews, mappings, bulk assign
 * - SalaryRevisionController: Salary revisions, approvals, my salary structure
 * - PayslipController: Payslip retrieval, generation, emails, locking
 * - LoanTaxSettlementController: Loans, loan types, tax declarations, TDS, F&F settlements, gratuity
 * - PayrollCycleSlabController: Pay cycles, component groups, definitions, pay slabs
 * - PayrollSettingsController: Policies, settings, attendance locks, reimbursements, ledger
 *
 * Retains 100% backward compatibility with all route definitions.
 */

import type { Request, Response } from 'express';
import { PayrollService, withSnakeAliases, positiveNum } from '../services/PayrollService';
import { SalaryStructureService } from '../services/SalaryStructureService';
import { SalaryRevisionService } from '../services/SalaryRevisionService';
import { PayslipService } from '../services/PayslipService';
import { LoanService } from '../services/LoanService';
import { TaxService } from '../services/TaxService';
import { SettlementService } from '../services/SettlementService';
import { PayComponentService } from '../services/PayComponentService';
import { AttendanceIntegrationService } from '../services/AttendanceIntegrationService';
import { ReimbursementService } from '../services/ReimbursementService';
import { PayrollLedgerService } from '../services/PayrollLedgerService';
import { PayrollComponentGroupService } from '../services/PayrollComponentGroupService';
import { PayrollComponentDefinitionService } from '../services/PayrollComponentDefinitionService';
import { PayrollSettingsService } from '../services/PayrollSettingsService';

// Sub-controllers
import { PayrollRunController } from './PayrollRunController';
import { PayrollRegisterController } from './PayrollRegisterController';
import { SalaryStructureController } from './SalaryStructureController';
import { SalaryRevisionController } from './SalaryRevisionController';
import { PayslipController } from './PayslipController';
import { LoanTaxSettlementController } from './LoanTaxSettlementController';
import { PayrollCycleSlabController } from './PayrollCycleSlabController';
import { PayrollSettingsController } from './PayrollSettingsController';

export { withSnakeAliases, positiveNum };

export class PayrollController {
  // Services
  private payrollService: PayrollService;
  private structureService: SalaryStructureService;
  private revisionService: SalaryRevisionService;
  private payslipService: PayslipService;
  private loanService: LoanService;
  private taxService: TaxService;
  private settlementService: SettlementService;
  private componentService: PayComponentService;
  private attendanceService: AttendanceIntegrationService;
  private reimbursementService: ReimbursementService;
  private ledgerService: PayrollLedgerService;
  private groupService: PayrollComponentGroupService;
  private componentDefinitionService: PayrollComponentDefinitionService;
  private settingsService: PayrollSettingsService;

  // Sub-controllers
  private runController: PayrollRunController;
  private registerController: PayrollRegisterController;
  private structureController: SalaryStructureController;
  private revisionController: SalaryRevisionController;
  private payslipCtrl: PayslipController;
  private loanTaxController: LoanTaxSettlementController;
  private cycleSlabController: PayrollCycleSlabController;
  private settingsCtrl: PayrollSettingsController;

  constructor() {
    this.payrollService = new PayrollService();
    this.structureService = new SalaryStructureService();
    this.revisionService = new SalaryRevisionService();
    this.payslipService = new PayslipService();
    this.loanService = new LoanService();
    this.taxService = new TaxService();
    this.settlementService = new SettlementService();
    this.componentService = new PayComponentService();
    this.attendanceService = new AttendanceIntegrationService();
    this.reimbursementService = new ReimbursementService();
    this.ledgerService = new PayrollLedgerService();
    this.groupService = new PayrollComponentGroupService();
    this.componentDefinitionService = new PayrollComponentDefinitionService();
    this.settingsService = new PayrollSettingsService();

    // Instantiate Sub-Controllers with shared instances
    this.runController = new PayrollRunController(this.payrollService);
    this.registerController = new PayrollRegisterController();
    this.structureController = new SalaryStructureController(this.payrollService);
    this.revisionController = new SalaryRevisionController();
    this.payslipCtrl = new PayslipController(this.payslipService);
    this.loanTaxController = new LoanTaxSettlementController(
      this.loanService,
      this.taxService,
      this.settlementService
    );
    this.cycleSlabController = new PayrollCycleSlabController();
    this.settingsCtrl = new PayrollSettingsController(
      this.settingsService,
      this.componentService,
      this.attendanceService,
      this.reimbursementService,
      this.ledgerService
    );
  }

  // ─── 1. PAYROLL RUN LIFECYCLE & STATS ──────────────────────────────────────
  generatePayroll = (req: Request, res: Response) => this.runController.generatePayroll(req, res);
  processPayroll = (req: Request, res: Response) => this.runController.processPayroll(req, res);
  lockPayroll = (req: Request, res: Response) => this.runController.lockPayroll(req, res);
  unlockPayroll = (req: Request, res: Response) => this.runController.unlockPayroll(req, res);
  approvePayroll = (req: Request, res: Response) => this.runController.approvePayroll(req, res);
  publishPayroll = (req: Request, res: Response) => this.runController.publishPayroll(req, res);
  getPayrollStatus = (req: Request, res: Response) => this.runController.getPayrollStatus(req, res);
  listPayrolls = (req: Request, res: Response) => this.runController.listPayrolls(req, res);
  getPendingApprovals = (req: Request, res: Response) => this.runController.getPendingApprovals(req, res);
  exportBankTransfer = (req: Request, res: Response) => this.runController.exportBankTransfer(req, res);
  exportCompliance = (req: Request, res: Response) => this.runController.exportCompliance(req, res);
  getReconciliation = (req: Request, res: Response) => this.runController.getReconciliation(req, res);
  getPayrollRunDetails = (req: Request, res: Response) => this.runController.getPayrollRunDetails(req, res);
  isLocked = (req: Request, res: Response) => this.runController.isLocked(req, res);
  getPayrollStats = (req: Request, res: Response) => this.runController.getPayrollStats(req, res);
  getManagerDeptStats = (req: Request, res: Response) => this.runController.getManagerDeptStats(req, res);
  arrearsAdjustment = (req: Request, res: Response) => this.runController.arrearsAdjustment(req, res);
  createMassUploadLog = (req: Request, res: Response) => this.runController.createMassUploadLog(req, res);
  getMassUploadLogs = (req: Request, res: Response) => this.runController.getMassUploadLogs(req, res);

  // ─── 2. PROCESS REGISTER & DYNAMIC CALCULATION ─────────────────────────────
  getProcessRegister = (req: Request, res: Response) => this.registerController.getProcessRegister(req, res);
  saveProcessRegisterOverride = (req: Request, res: Response) => this.registerController.saveProcessRegisterOverride(req, res);

  // ─── 3. SALARY STRUCTURES & MAPPINGS ───────────────────────────────────────
  listStructures = (req: Request, res: Response) => this.structureController.listStructures(req, res);
  getStructure = (req: Request, res: Response) => this.structureController.getStructure(req, res);
  createStructure = (req: Request, res: Response) => this.structureController.createStructure(req, res);
  updateStructure = (req: Request, res: Response) => this.structureController.updateStructure(req, res);
  deleteStructure = (req: Request, res: Response) => this.structureController.deleteStructure(req, res);
  calculateStructurePreview = (req: Request, res: Response) => this.structureController.calculateStructurePreview(req, res);
  getAttendanceCalendar = (req: Request, res: Response) => this.structureController.getAttendanceCalendar(req, res);
  assignStructureToEmployee = (req: Request, res: Response) => this.structureController.assignStructureToEmployee(req, res);
  listEmployeeMappings = (req: Request, res: Response) => this.structureController.listEmployeeMappings(req, res);
  bulkAssignSlabs = (req: Request, res: Response) => this.structureController.bulkAssignSlabs(req, res);

  // ─── 4. SALARY REVISIONS ───────────────────────────────────────────────────
  listSalaryRevisions = (req: Request, res: Response) => this.revisionController.listSalaryRevisions(req, res);
  createSalaryRevision = (req: Request, res: Response) => this.revisionController.createSalaryRevision(req, res);
  approveSalaryRevision = (req: Request, res: Response) => this.revisionController.approveSalaryRevision(req, res);
  rejectRevisionDirect = (req: Request, res: Response) => this.revisionController.rejectRevisionDirect(req, res);
  getMySalaryStructure = (req: Request, res: Response) => this.revisionController.getMySalaryStructure(req, res);
  requestRevision = async (req: Request, res: Response) => {
    const revision = await this.revisionService.requestRevision(req.ctx, req.body);
    res.status(201).json({ success: true, data: revision });
  };
  submitRevisionForApproval = async (req: Request, res: Response) => {
    const { id } = req.params;
    const revision = await this.revisionService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  };
  approveRevision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approverId } = req.body;
    const revision = await this.revisionService.approveRevision(req.ctx, parseInt(id), approverId);
    res.json({ success: true, data: revision });
  };
  rejectRevision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const revision = await this.revisionService.rejectRevision(req.ctx, parseInt(id), reason);
    res.json({ success: true, data: revision });
  };
  getRevision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const revision = await this.revisionService.getRevision(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  };
  getRevisionComponents = async (req: Request, res: Response) => {
    const { id } = req.params;
    const components = await this.revisionService.getRevisionComponents(req.ctx, parseInt(id));
    res.json({ success: true, data: components });
  };
  getRevisions = async (req: Request, res: Response) => {
    const { employeeId, status, revisionType } = req.query;
    const revisions = await this.revisionService.listRevisions(req.ctx, {
      employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      status: status as string,
      revisionType: revisionType as string,
    });
    res.json({ success: true, data: revisions });
  };

  // ─── 5. PAYSLIP MANAGEMENT ─────────────────────────────────────────────────
  getPayslips = (req: Request, res: Response) => this.payslipCtrl.getPayslips(req, res);
  generatePayslipFromProcess = (req: Request, res: Response) => this.payslipCtrl.generatePayslipFromProcess(req, res);
  createPayslip = (req: Request, res: Response) => this.payslipCtrl.createPayslip(req, res);
  getPayslip = (req: Request, res: Response) => this.payslipCtrl.getPayslip(req, res);
  getPayslipDetails = (req: Request, res: Response) => this.payslipCtrl.getPayslipDetails(req, res);
  sendPayslip = (req: Request, res: Response) => this.payslipCtrl.sendPayslip(req, res);
  lockPayslip = (req: Request, res: Response) => this.payslipCtrl.lockPayslip(req, res);

  // ─── 6. LOANS, TAX, SETTLEMENTS & GRATUITY ────────────────────────────────
  createLoan = (req: Request, res: Response) => this.loanTaxController.createLoan(req, res);
  getLoans = (req: Request, res: Response) => this.loanTaxController.getLoans(req, res);
  getActiveLoan = (req: Request, res: Response) => this.loanTaxController.getActiveLoan(req, res);
  getLoan = (req: Request, res: Response) => this.loanTaxController.getLoan(req, res);
  updateLoan = (req: Request, res: Response) => this.loanTaxController.updateLoan(req, res);
  approveLoan = (req: Request, res: Response) => this.loanTaxController.approveLoan(req, res);
  rejectLoan = (req: Request, res: Response) => this.loanTaxController.rejectLoan(req, res);
  getEmiSchedule = (req: Request, res: Response) => this.loanTaxController.getEmiSchedule(req, res);
  getNextEmi = (req: Request, res: Response) => this.loanTaxController.getNextEmi(req, res);
  getLoanTypes = (req: Request, res: Response) => this.loanTaxController.getLoanTypes(req, res);
  saveLoanType = (req: Request, res: Response) => this.loanTaxController.saveLoanType(req, res);
  deleteLoanType = (req: Request, res: Response) => this.loanTaxController.deleteLoanType(req, res);

  createTaxDeclaration = (req: Request, res: Response) => this.loanTaxController.createTaxDeclaration(req, res);
  getTaxDeclarations = (req: Request, res: Response) => this.loanTaxController.getTaxDeclarations(req, res);
  getTaxDeclaration = (req: Request, res: Response) => this.loanTaxController.getTaxDeclaration(req, res);
  addTaxInvestment = (req: Request, res: Response) => this.loanTaxController.addTaxInvestment(req, res);
  getTaxInvestments = (req: Request, res: Response) => this.loanTaxController.getTaxInvestments(req, res);
  finalizeTaxDeclaration = (req: Request, res: Response) => this.loanTaxController.finalizeTaxDeclaration(req, res);
  calculateTDS = (req: Request, res: Response) => this.loanTaxController.calculateTDS(req, res);

  getGratuityRules = (req: Request, res: Response) => this.loanTaxController.getGratuityRules(req, res);
  saveGratuityRule = (req: Request, res: Response) => this.loanTaxController.saveGratuityRule(req, res);
  deleteGratuityRule = (req: Request, res: Response) => this.loanTaxController.deleteGratuityRule(req, res);

  getSettlements = (req: Request, res: Response) => this.loanTaxController.getSettlements(req, res);
  getSettlement = (req: Request, res: Response) => this.loanTaxController.getSettlement(req, res);
  createSettlement = (req: Request, res: Response) => this.loanTaxController.createSettlement(req, res);
  calculateSettlement = (req: Request, res: Response) => this.loanTaxController.calculateSettlement(req, res);
  submitSettlement = (req: Request, res: Response) => this.loanTaxController.submitSettlement(req, res);
  approveSettlement = (req: Request, res: Response) => this.loanTaxController.approveSettlement(req, res);
  adminApproveSettlement = (req: Request, res: Response) => this.loanTaxController.adminApproveSettlement(req, res);
  processSettlement = (req: Request, res: Response) => this.loanTaxController.processSettlement(req, res);
  submitExitRequest = (req: Request, res: Response) => this.loanTaxController.submitExitRequest(req, res);
  getTeamSettlements = (req: Request, res: Response) => this.loanTaxController.getTeamSettlements(req, res);
  submitSettlementForApproval = (req: Request, res: Response) => this.loanTaxController.submitSettlementForApproval(req, res);
  getMySettlement = (req: Request, res: Response) => this.loanTaxController.getMySettlement(req, res);
  getPendingExitRequests = (req: Request, res: Response) => this.loanTaxController.getPendingExitRequests(req, res);
  adminRejectSettlement = (req: Request, res: Response) => this.loanTaxController.adminRejectSettlement(req, res);

  // ─── 7. CYCLES, COMPONENTS & SLABS ─────────────────────────────────────────
  listCycles = (req: Request, res: Response) => this.cycleSlabController.listCycles(req, res);
  getCycle = (req: Request, res: Response) => this.cycleSlabController.getCycle(req, res);
  createCycle = (req: Request, res: Response) => this.cycleSlabController.createCycle(req, res);
  updateCycle = (req: Request, res: Response) => this.cycleSlabController.updateCycle(req, res);
  deleteCycle = (req: Request, res: Response) => this.cycleSlabController.deleteCycle(req, res);

  listComponentGroups = (req: Request, res: Response) => this.cycleSlabController.listComponentGroups(req, res);
  createComponentGroup = (req: Request, res: Response) => this.cycleSlabController.createComponentGroup(req, res);
  updateComponentGroup = (req: Request, res: Response) => this.cycleSlabController.updateComponentGroup(req, res);
  getComponentGroupAuditLogs = (req: Request, res: Response) => this.cycleSlabController.getComponentGroupAuditLogs(req, res);
  deleteComponentGroup = (req: Request, res: Response) => this.cycleSlabController.deleteComponentGroup(req, res);

  listComponentDefinitions = (req: Request, res: Response) => this.cycleSlabController.listComponentDefinitions(req, res);
  listComponents = (req: Request, res: Response) => this.cycleSlabController.listComponents(req, res);
  getComponents = (req: Request, res: Response) => this.cycleSlabController.getComponents(req, res);
  createComponentDefinition = (req: Request, res: Response) => this.cycleSlabController.createComponentDefinition(req, res);
  updateComponentDefinition = (req: Request, res: Response) => this.cycleSlabController.updateComponentDefinition(req, res);
  getComponentAuditLogs = (req: Request, res: Response) => this.cycleSlabController.getComponentAuditLogs(req, res);
  deleteComponentDefinition = (req: Request, res: Response) => this.cycleSlabController.deleteComponentDefinition(req, res);

  listSlabs = (req: Request, res: Response) => this.cycleSlabController.listSlabs(req, res);
  getSlab = (req: Request, res: Response) => this.cycleSlabController.getSlab(req, res);
  createSlab = (req: Request, res: Response) => this.cycleSlabController.createSlab(req, res);
  updateSlab = (req: Request, res: Response) => this.cycleSlabController.updateSlab(req, res);
  deleteSlab = (req: Request, res: Response) => this.cycleSlabController.deleteSlab(req, res);

  // ─── 8. POLICIES, SETTINGS, ATTENDANCE LOCK, REIMBURSEMENTS & LEDGER ───────
  getPayrollSettings = (req: Request, res: Response) => this.settingsCtrl.getPayrollSettings(req, res);
  updatePayrollSettings = (req: Request, res: Response) => this.settingsCtrl.updatePayrollSettings(req, res);
  getPayrollPolicies = (req: Request, res: Response) => this.settingsCtrl.getPayrollPolicies(req, res);
  updatePayrollPolicies = (req: Request, res: Response) => this.settingsCtrl.updatePayrollPolicies(req, res);
  createComponent = (req: Request, res: Response) => this.settingsCtrl.createComponent(req, res);
  lockAttendance = (req: Request, res: Response) => this.settingsCtrl.lockAttendance(req, res);
  getAttendanceLockStatus = (req: Request, res: Response) => this.settingsCtrl.getAttendanceLockStatus(req, res);
  submitReimbursement = (req: Request, res: Response) => this.settingsCtrl.submitReimbursement(req, res);
  getReimbursements = (req: Request, res: Response) => this.settingsCtrl.getReimbursements(req, res);
  approveReimbursement = (req: Request, res: Response) => this.settingsCtrl.approveReimbursement(req, res);
  rejectReimbursement = (req: Request, res: Response) => this.settingsCtrl.rejectReimbursement(req, res);
  getLedgerEntries = (req: Request, res: Response) => this.settingsCtrl.getLedgerEntries(req, res);
}
