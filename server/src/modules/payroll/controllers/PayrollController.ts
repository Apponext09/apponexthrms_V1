import type { Request, Response } from 'express';
import { getKnex } from '../../../db/knex';
import { PayrollService } from '../services/PayrollService';
import { SalaryStructureService } from '../services/SalaryStructureService';
import { SalaryRevisionService } from '../services/SalaryRevisionService';
import { PayslipService } from '../services/PayslipService';
import { LoanService } from '../services/LoanService';
import { TaxService } from '../services/TaxService';
import { SettlementService } from '../services/SettlementService';
import { validate } from '../../../common/middleware/validation';
import * as schemas from '../../../validation/payroll.schemas';

export class PayrollController {
  private payrollService: PayrollService;
  private structureService: SalaryStructureService;
  private revisionService: SalaryRevisionService;
  private payslipService: PayslipService;
  private loanService: LoanService;
  private taxService: TaxService;
  private settlementService: SettlementService;

  private async getEmployeeId(req: Request, inputId?: any): Promise<number> {
    const parsedId = parseInt(inputId as string);
    if (!isNaN(parsedId)) {
      return parsedId;
    }
    const db = getKnex();
    const user = await db('users')
      .where('id', req.ctx.userId)
      .first();
    if (user?.employee_id) {
      return user.employee_id;
    }
    if (user?.email) {
      const employee = await db('employees')
        .where('email', user.email)
        .first();
      if (employee) {
        return employee.id;
      }
    }
    return 0;
  }

  constructor() {
    this.payrollService = new PayrollService();
    this.structureService = new SalaryStructureService();
    this.revisionService = new SalaryRevisionService();
    this.payslipService = new PayslipService();
    this.loanService = new LoanService();
    this.taxService = new TaxService();
    this.settlementService = new SettlementService();
  }

  // PAYROLL ENDPOINTS
  async generatePayroll(req: Request, res: Response) {
    const { payrollCycleId, runType } = req.body;
    const run = await this.payrollService.generatePayroll(req.ctx, payrollCycleId, runType);
    res.json({ success: true, data: run });
  }

  async processPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.processPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async lockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.lockPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async unlockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.unlockPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async approvePayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.approvePayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async publishPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.publishPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async getPayrollStatus(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.getPayrollStatus(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async listPayrolls(req: Request, res: Response) {
    const { cycleId } = req.query;
    const runs = await this.payrollService.getPayrollRuns(req.ctx, cycleId ? parseInt(cycleId as string) : undefined);
    res.json({ success: true, data: runs });
  }

  async getPendingApprovals(req: Request, res: Response) {
    const runs = await this.payrollService.getPendingApprovals(req.ctx);
    res.json({ success: true, data: runs });
  }

  // SALARY STRUCTURE ENDPOINTS
  async createStructure(req: Request, res: Response) {
    const structure = await this.structureService.createStructure(req.ctx, req.body);
    res.status(201).json({ success: true, data: structure });
  }

  async listStructures(req: Request, res: Response) {
    const structures = await this.structureService.listStructures(req.ctx);
    res.json({ success: true, data: structures });
  }

  async getStructure(req: Request, res: Response) {
    const { id } = req.params;
    const structure = await this.structureService.getStructure(req.ctx, parseInt(id));
    res.json({ success: true, data: structure });
  }

  async getStructureComponents(req: Request, res: Response) {
    const { id } = req.params;
    const components = await this.structureService.getStructureComponents(req.ctx, parseInt(id));
    res.json({ success: true, data: components });
  }

  async addComponentToStructure(req: Request, res: Response) {
    const { structureId, componentId, sortOrder } = req.body;
    const component = await this.structureService.addComponentToStructure(
      req.ctx,
      structureId,
      componentId,
      sortOrder
    );
    res.status(201).json({ success: true, data: component });
  }

  async assignStructureToEmployee(req: Request, res: Response) {
    const assignment = await this.structureService.assignStructureToEmployee(req.ctx, req.body);
    res.status(201).json({ success: true, data: assignment });
  }

  async calculateCTC(req: Request, res: Response) {
    const { structureId } = req.body;
    const ctc = await this.structureService.calculateCTC(req.ctx, structureId);
    res.json({ success: true, data: { ctc } });
  }

  // SALARY REVISION ENDPOINTS
  async requestRevision(req: Request, res: Response) {
    const revision = await this.revisionService.requestRevision(req.ctx, req.body);
    res.status(201).json({ success: true, data: revision });
  }

  async submitRevisionForApproval(req: Request, res: Response) {
    const { id } = req.params;
    const revision = await this.revisionService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  }

  async approveRevision(req: Request, res: Response) {
    const { id } = req.params;
    const { approverId } = req.body;
    const revision = await this.revisionService.approveRevision(req.ctx, parseInt(id), approverId);
    res.json({ success: true, data: revision });
  }

  async rejectRevision(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;
    const revision = await this.revisionService.rejectRevision(req.ctx, parseInt(id), reason);
    res.json({ success: true, data: revision });
  }

  async getRevision(req: Request, res: Response) {
    const { id } = req.params;
    const revision = await this.revisionService.getRevision(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  }

  async getRevisionComponents(req: Request, res: Response) {
    const { id } = req.params;
    const components = await this.revisionService.getRevisionComponents(req.ctx, parseInt(id));
    res.json({ success: true, data: components });
  }

  // PAYSLIP ENDPOINTS
  async getPayslips(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.query.employeeId);
    const payslips = await this.payslipService.getEmployeePayslips(req.ctx, employeeId);
    res.json({ success: true, data: payslips });
  }

  async getPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.getPayslip(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  async getPayslipDetails(req: Request, res: Response) {
    const { id } = req.params;
    const details = await this.payslipService.getPayslipDetails(req.ctx, parseInt(id));
    res.json({ success: true, data: details });
  }

  async sendPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.sendPayslipToEmployee(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  async lockPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.lockPayslip(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  // LOAN ENDPOINTS
  async createLoan(req: Request, res: Response) {
    const loan = await this.loanService.createLoan(req.ctx, req.body);
    res.status(201).json({ success: true, data: loan });
  }

  async getLoans(req: Request, res: Response) {
    const { employeeId } = req.query;
    const loans = await this.loanService.getEmployeeLoans(req.ctx, parseInt(employeeId as string));
    res.json({ success: true, data: loans });
  }

  async getActiveLoan(req: Request, res: Response) {
    const { employeeId } = req.query;
    const loans = await this.loanService.getActiveLoans(req.ctx, parseInt(employeeId as string));
    res.json({ success: true, data: loans });
  }

  async getLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.getLoan(req.ctx, parseInt(id));
    res.json({ success: true, data: loan });
  }

  async getEmiSchedule(req: Request, res: Response) {
    const { loanId } = req.query;
    const schedule = await this.loanService.getRepaymentSchedule(req.ctx, parseInt(loanId as string));
    res.json({ success: true, data: schedule });
  }

  async getNextEmi(req: Request, res: Response) {
    const { loanId } = req.query;
    const emi = await this.loanService.getNextEMI(req.ctx, parseInt(loanId as string));
    res.json({ success: true, data: emi });
  }

  // TAX ENDPOINTS
  async createTaxDeclaration(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const declaration = await this.taxService.createDeclaration(req.ctx, {
      ...req.body,
      employeeId
    });
    res.status(201).json({ success: true, data: declaration });
  }

  async getTaxDeclarations(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.query.employeeId);
    const declarations = await this.taxService.getEmployeeDeclarations(req.ctx, employeeId);
    res.json({ success: true, data: declarations });
  }

  async getTaxDeclaration(req: Request, res: Response) {
    const { id } = req.params;
    const declaration = await this.taxService.getDeclaration(req.ctx, parseInt(id));
    res.json({ success: true, data: declaration });
  }

  async addTaxInvestment(req: Request, res: Response) {
    const investment = await this.taxService.addInvestment(req.ctx, req.body);
    res.status(201).json({ success: true, data: investment });
  }

  async getTaxInvestments(req: Request, res: Response) {
    const { declarationId } = req.query;
    const investments = await this.taxService.getDeclarationInvestments(req.ctx, parseInt(declarationId as string));
    res.json({ success: true, data: investments });
  }

  async finalizeTaxDeclaration(req: Request, res: Response) {
    const { id } = req.params;
    const declaration = await this.taxService.finalizeDeclaration(req.ctx, parseInt(id));
    res.json({ success: true, data: declaration });
  }

  async calculateTDS(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const { financialYear, grossSalaryYtd } = req.body;
    const tds = await this.taxService.calculateTDS(req.ctx, employeeId, financialYear, grossSalaryYtd);
    res.json({ success: true, data: tds });
  }

  // SETTLEMENT ENDPOINTS
  async createSettlement(req: Request, res: Response) {
    const settlement = await this.settlementService.createSettlement(req.ctx, req.body);
    res.status(201).json({ success: true, data: settlement });
  }

  async calculateSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.calculateSettlement(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }

  async submitSettlementForApproval(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }

  async approveSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const { approverId } = req.body;
    const settlement = await this.settlementService.approveSettlement(req.ctx, parseInt(id), approverId);
    res.json({ success: true, data: settlement });
  }

  async processSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.processSettlement(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }

  async getSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.getSettlement(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }
}
