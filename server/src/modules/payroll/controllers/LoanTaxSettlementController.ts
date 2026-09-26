/**
 * LoanTaxSettlementController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Employee Loans, Loan Types, Tax Declarations/TDS, and Full & Final Settlements / Gratuity.
 * Extracted from PayrollController.ts — zero logic changes.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { LoanService } from '../services/LoanService';
import { TaxService } from '../services/TaxService';
import { SettlementService } from '../services/SettlementService';

export class LoanTaxSettlementController {
  private loanService: LoanService;
  private taxService: TaxService;
  private settlementService: SettlementService;

  constructor(
    loanService?: LoanService,
    taxService?: TaxService,
    settlementService?: SettlementService
  ) {
    this.loanService = loanService || new LoanService();
    this.taxService = taxService || new TaxService();
    this.settlementService = settlementService || new SettlementService();
  }

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

  // ─── LOAN ENDPOINTS ────────────────────────────────────────────────────────
  async createLoan(req: Request, res: Response) {
    const loan = await this.loanService.createLoan(req.ctx, req.body);
    res.status(201).json({ success: true, data: loan });
  }

  async getLoans(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string) : undefined;
    const loans = await this.loanService.getEmployeeLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getActiveLoan(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    const loans = await this.loanService.getActiveLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.getLoan(req.ctx, parseInt(id));
    if (!loan) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Loan not found' } }); return; }
    res.json({ success: true, data: loan });
  }

  async updateLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.updateLoan(req.ctx, parseInt(id, 10), req.body);
    res.json({ success: true, data: loan });
  }

  async approveLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.approveLoan(req.ctx, parseInt(id));
    res.json({ success: true, data: loan });
  }

  async rejectLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.rejectLoan(req.ctx, parseInt(id));
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

  async getLoanTypes(req: Request, res: Response) {
    const db = getKnex();
    const rows = await db('payroll_loan_types')
      .where('organization_id', req.ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('id', 'asc')
      .catch((err) => {
        console.error('Error listing loan types:', err);
        return [];
      });

    const mapped = rows.map((r: any) => {
      let depts: string[] = [];
      let grds: string[] = [];
      let empTypes: string[] = [];

      const rawDepartments = r.departments;
      const rawGrades = r.grades;
      const rawEmployeeTypes = r.employeeTypes ?? r.employee_types;

      try { if (rawDepartments) depts = typeof rawDepartments === 'string' ? JSON.parse(rawDepartments) : rawDepartments; } catch { }
      try { if (rawGrades) grds = typeof rawGrades === 'string' ? JSON.parse(rawGrades) : rawGrades; } catch { }
      try { if (rawEmployeeTypes) empTypes = typeof rawEmployeeTypes === 'string' ? JSON.parse(rawEmployeeTypes) : rawEmployeeTypes; } catch { }

      return {
        id: r.id,
        uuid: r.uuid,
        name: r.name,
        category: r.category || 'loan',
        maxAmount: Number(r.maxAmount ?? r.max_amount ?? 100000),
        minAmount: Number(r.minAmount ?? r.min_amount ?? 0),
        interestRate: Number(r.interestRate ?? r.interest_rate ?? 0),
        minTermMonths: Number(r.minTermMonths ?? r.min_term_months ?? 1),
        maxTermMonths: Number(r.maxTermMonths ?? r.max_term_months ?? 12),
        minServiceMonths: Number(r.minServiceMonths ?? r.min_service_months ?? 0),
        gender: r.gender || 'All',
        departments: Array.isArray(depts) ? depts : [],
        grades: Array.isArray(grds) ? grds : [],
        employeeTypes: Array.isArray(empTypes) ? empTypes : [],
        description: r.description || '',
        isTaxable: Boolean(r.isTaxable ?? r.is_taxable),
        isActive: Boolean((r.isActive ?? r.is_active) !== 0),
        foreclosureAllowed: Boolean(r.foreclosureAllowed ?? r.foreclosure_allowed),
        approverRole: r.approverRole ?? r.approver_role ?? 'hr',
        requestFormTemplate: r.requestFormTemplate ?? r.request_form_template ?? '',
        approvedFormTemplate: r.approvedFormTemplate ?? r.approved_form_template ?? '',
        disbursementFormTemplate: r.disbursementFormTemplate ?? r.disbursement_form_template ?? '',
        rejectionFormTemplate: r.rejectionFormTemplate ?? r.rejection_form_template ?? '',
        stopFormTemplate: r.stopFormTemplate ?? r.stop_form_template ?? '',
      };
    });

    res.json({ success: true, data: mapped });
  }

  async saveLoanType(req: Request, res: Response) {
    const db = getKnex();
    const {
      id,
      name,
      category,
      maxAmount,
      max_amount,
      minAmount,
      min_amount,
      interestRate,
      interest_rate,
      maxTermMonths,
      max_tenure_months,
      minTermMonths,
      min_term_months,
      minServiceMonths,
      min_service_months,
      gender,
      departments,
      grades,
      employeeTypes,
      employee_types,
      description,
      isTaxable,
      isActive,
      is_active,
      foreclosureAllowed,
      foreclosure_allowed,
      approverRole,
      approver_role,
      requestFormTemplate,
      approvedFormTemplate,
      disbursementFormTemplate,
      rejectionFormTemplate,
      stopFormTemplate
    } = req.body;

    const payload: Record<string, any> = {
      organization_id: req.ctx.organizationId,
      name: name || 'New Loan Type',
      category: category || 'loan',
      max_amount: maxAmount || max_amount || 100000,
      min_amount: minAmount || min_amount || 0,
      interest_rate: interestRate !== undefined ? interestRate : (interest_rate || 0),
      max_term_months: maxTermMonths || max_tenure_months || 12,
      min_term_months: minTermMonths || min_term_months || 1,
      min_service_months: minServiceMonths !== undefined ? minServiceMonths : (min_service_months || 0),
      gender: gender || 'All',
      departments: departments ? (typeof departments === 'string' ? departments : JSON.stringify(departments)) : JSON.stringify([]),
      grades: grades ? (typeof grades === 'string' ? grades : JSON.stringify(grades)) : JSON.stringify([]),
      employee_types: (employeeTypes || employee_types) ? (typeof (employeeTypes || employee_types) === 'string' ? (employeeTypes || employee_types) : JSON.stringify(employeeTypes || employee_types)) : JSON.stringify([]),
      description: description || '',
      is_taxable: isTaxable ? 1 : 0,
      is_active: (isActive !== undefined ? isActive : is_active) !== false ? 1 : 0,
      foreclosure_allowed: (foreclosureAllowed ?? foreclosure_allowed) ? 1 : 0,
      approver_role: approverRole || approver_role || 'hr',
      request_form_template: requestFormTemplate || null,
      approved_form_template: approvedFormTemplate || null,
      disbursement_form_template: disbursementFormTemplate || null,
      rejection_form_template: rejectionFormTemplate || null,
      stop_form_template: stopFormTemplate || null,
      updated_at: new Date()
    };

    const existing = id
      ? await db('payroll_loan_types')
        .where('organization_id', req.ctx.organizationId)
        .where(q => q.where('id', id).orWhere('uuid', id))
        .first()
        .catch(() => null)
      : null;

    if (existing) {
      await db('payroll_loan_types').where('id', existing.id).update(payload);
      res.json({ success: true, data: { id: existing.id, uuid: existing.uuid, ...payload } });
    } else {
      const newId = `lt_${Date.now()}`;
      payload.id = newId;
      payload.uuid = uuidv4();
      payload.created_at = new Date();
      await db('payroll_loan_types').insert(payload);
      res.json({ success: true, data: payload });
    }
  }

  async deleteLoanType(req: Request, res: Response) {
    const db = getKnex();
    await db('payroll_loan_types')
      .where({ id: req.params.id, organization_id: req.ctx.organizationId })
      .update({ deleted_at: new Date() })
      .catch((err) => { console.error('Error deleting loan type:', err); });
    res.json({ success: true, message: 'Loan type deleted' });
  }

  // ─── TAX ENDPOINTS ─────────────────────────────────────────────────────────
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
    if (!declaration) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax declaration not found' } }); return; }
    res.json({ success: true, data: declaration });
  }

  async finalizeTaxDeclaration(req: Request, res: Response) {
    const { id } = req.params;
    const declaration = await this.taxService.finalizeDeclaration(req.ctx, parseInt(id));
    res.json({ success: true, data: declaration });
  }

  async addTaxInvestment(req: Request, res: Response) {
    const { id } = req.params;
    const b = req.body || {};
    const investment = await this.taxService.addInvestment(req.ctx, parseInt(id), {
      investmentType: b.investmentType ?? b.investment_type ?? b.type ?? b.section,
      investmentAmount: Number(b.investmentAmount ?? b.investment_amount ?? b.amount),
      proofUrl: b.proofUrl ?? b.investmentProofUrl ?? b.investment_proof_url,
    });
    res.status(201).json({ success: true, data: investment });
  }

  async getTaxInvestments(req: Request, res: Response) {
    const { id } = req.params;
    const investments = await this.taxService.getInvestments(req.ctx, parseInt(id));
    res.json({ success: true, data: investments });
  }

  async calculateTDS(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const { financialYear, grossSalaryYtd, taxRegime } = req.body;
    const tds = await this.taxService.calculateTDS(
      req.ctx,
      employeeId,
      financialYear,
      grossSalaryYtd,
      taxRegime === 'old' ? 'old' : 'new'
    );
    res.json({ success: true, data: tds });
  }

  // ─── GRATUITY ENDPOINTS ───────────────────────────────────────────────────
  async getGratuityRules(req: Request, res: Response) {
    const rules = await this.settlementService.getGratuityRules(req.ctx);
    res.json({ success: true, data: rules });
  }

  async saveGratuityRule(req: Request, res: Response) {
    const rule = await this.settlementService.saveGratuityRule(req.ctx, req.body);
    res.json({ success: true, data: rule });
  }

  async deleteGratuityRule(req: Request, res: Response) {
    const { id } = req.params;
    const result = await this.settlementService.deleteGratuityRule(req.ctx, parseInt(id));
    res.json({ success: true, ...result });
  }

  // ─── SETTLEMENT ENDPOINTS ──────────────────────────────────────────────────
  async getSettlements(req: Request, res: Response) {
    try {
      const empId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const settlements = await this.settlementService.getSettlements(req.ctx, empId);
      res.json({ success: true, data: settlements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const settlement = await this.settlementService.getSettlement(req.ctx, id);
      res.json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async createSettlement(req: Request, res: Response) {
    try {
      const { employeeId, exitDate, noticePeriodDays } = req.body;
      const settlement = await this.settlementService.createSettlement(req.ctx, {
        employeeId: Number(employeeId),
        exitDate: exitDate || new Date().toISOString().split('T')[0],
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : undefined
      });
      res.status(201).json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async calculateSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.calculateSettlement(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.submitForApproval(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async approveSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const approverId = req.body.approverId ? Number(req.body.approverId) : req.ctx.userId;
      const result = await this.settlementService.approveSettlement(req.ctx, id, approverId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminApproveSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.adminApproveSettlement(req.ctx, id, req.ctx.userId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async processSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.processSettlement(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitExitRequest(req: Request, res: Response) {
    try {
      const { employeeId, exitDate, reason, noticePeriodDays } = req.body;
      const empId = employeeId ? Number(employeeId) : await this.getEmployeeId(req);
      const settlement = await this.settlementService.submitExitRequest(req.ctx, {
        employeeId: empId,
        exitDate: exitDate || new Date().toISOString().split('T')[0],
        reason: reason || '',
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : 30,
        requestedByUserId: req.ctx.userId
      });
      res.status(201).json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTeamSettlements(req: Request, res: Response) {
    try {
      const settlements = await this.settlementService.getTeamSettlements(req.ctx, req.ctx.userId);
      res.json({ success: true, data: settlements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async submitSettlementForApproval(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }

  async getMySettlement(req: Request, res: Response) {
    const empId = await this.getEmployeeId(req);
    let settlements: any[] = [];
    if (empId > 0) {
      settlements = await this.settlementService.getSettlements(req.ctx, empId);
    }
    if (!settlements || settlements.length === 0) {
      settlements = await this.settlementService.getSettlements(req.ctx, undefined);
    }
    const latest = settlements && settlements.length > 0 ? settlements[0] : null;
    res.json({ success: true, data: latest, list: settlements || [] });
  }

  async getPendingExitRequests(req: Request, res: Response) {
    const exitRequests = await this.settlementService.getPendingExitRequests(req.ctx);
    res.json({ success: true, data: exitRequests || [] });
  }

  async adminRejectSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const adminUserId = req.ctx?.userId || (req.user as any)?.id || 0;
    const { reason } = req.body;
    const result = await this.settlementService.adminRejectSettlement(req.ctx, parseInt(id), adminUserId, reason);
    res.json({ success: true, data: result });
  }
}
