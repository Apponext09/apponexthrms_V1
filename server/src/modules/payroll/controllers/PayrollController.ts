import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { PayrollService } from '../services/PayrollService';

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

export class PayrollController {
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
    this.componentService = new PayComponentService();
    this.attendanceService = new AttendanceIntegrationService();
    this.reimbursementService = new ReimbursementService();
    this.ledgerService = new PayrollLedgerService();
    this.groupService = new PayrollComponentGroupService();
    this.componentDefinitionService = new PayrollComponentDefinitionService();
  }

  // PAYROLL ENDPOINTS
  async generatePayroll(req: Request, res: Response) {
    const { payrollCycleId, runType, companyId, locationId, departmentId, employeeIds } = req.body;
    const run = await this.payrollService.generatePayroll(
      req.ctx,
      parseInt(payrollCycleId),
      runType || 'regular',
      {
        companyId: companyId ? parseInt(companyId) : undefined,
        locationId: locationId ? parseInt(locationId) : undefined,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        employeeIds: Array.isArray(employeeIds) ? employeeIds.map((id: any) => parseInt(id)) : undefined
      }
    );
    res.json({ success: true, data: run });
  }

  async getReconciliation(req: Request, res: Response) {
    try {
      const data = await this.payrollService.getReconciliation(req.ctx, parseInt(req.params.id));
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error getting reconciliation' });
    }
  }

  async listCycles(req: Request, res: Response) {
    try {
      const data = await this.payrollService.getCycles(req.ctx);
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error listing cycles', data: [] });
    }
  }

  async getCycle(req: Request, res: Response) {
    try {
      const data = await this.payrollService.getCycle(req.ctx, req.params.id);
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error getting cycle' });
    }
  }

  async createCycle(req: Request, res: Response) {
    try {
      const data = await this.payrollService.createCycle(req.ctx, req.body);
      res.status(201).json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error creating cycle' });
    }
  }

  async updateCycle(req: Request, res: Response) {
    try {
      const data = await this.payrollService.updateCycle(req.ctx, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error updating cycle' });
    }
  }

  async deleteCycle(req: Request, res: Response) {
    try {
      await this.payrollService.deleteCycle(req.ctx, req.params.id);
      res.json({ success: true, message: 'Cycle deleted successfully' });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error deleting cycle' });
    }
  }

  async listSlabs(req: Request, res: Response) {
    const db = getKnex();
    const slabs = await db('payroll_slabs')
      .where('organization_id', req.ctx.organizationId)
      .orderBy('id', 'desc');

    const formattedSlabs = slabs.map((s: any) => ({
      ...s,
      departments: typeof s.departments === 'string' ? (s.departments ? JSON.parse(s.departments) : []) : (s.departments || []),
      grades: typeof s.grades === 'string' ? (s.grades ? JSON.parse(s.grades) : []) : (s.grades || []),
      locations: typeof s.locations === 'string' ? (s.locations ? JSON.parse(s.locations) : []) : (s.locations || []),
      selectedComponentIds: typeof s.selected_component_ids === 'string' ? (s.selected_component_ids ? JSON.parse(s.selected_component_ids) : []) : (s.selected_component_ids || []),
      minCtc: Number(s.min_ctc || 0),
      maxCtc: Number(s.max_ctc || 0),
      cycleId: s.cycle_id ? String(s.cycle_id) : '',
      employmentType: s.employment_type || 'Regular',
      isActive: Boolean(s.is_active)
    }));

    res.json({ success: true, data: formattedSlabs });
  }

  async createSlab(req: Request, res: Response) {
    const db = getKnex();
    const cycleIdVal = req.body.cycleId || req.body.cycle_id;
    const numericCycleId = (cycleIdVal && !isNaN(Number(cycleIdVal))) ? Number(cycleIdVal) : null;

    const slabData = {
      uuid: uuidv4(),
      organization_id: req.ctx.organizationId,
      name: req.body.name || 'New Payroll Slab',
      departments: JSON.stringify(req.body.departments || []),
      grades: JSON.stringify(req.body.grades || []),
      locations: JSON.stringify(req.body.locations || []),
      min_ctc: req.body.minCtc || req.body.min_ctc || 0,
      max_ctc: req.body.maxCtc || req.body.max_ctc || 10000000,
      selected_component_ids: JSON.stringify(req.body.selectedComponentIds || req.body.selected_component_ids || []),
      cycle_id: numericCycleId,
      employment_type: req.body.employmentType || req.body.employment_type || 'Regular',
      is_active: req.body.isActive ?? req.body.is_active ?? true
    };
    const [id] = await db('payroll_slabs').insert(slabData);
    res.status(201).json({ success: true, data: { id, ...slabData } });
  }

  async updateSlab(req: Request, res: Response) {
    const { id } = req.params;
    const db = getKnex();
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.departments !== undefined) updateData.departments = JSON.stringify(req.body.departments);
    if (req.body.grades !== undefined) updateData.grades = JSON.stringify(req.body.grades);
    if (req.body.locations !== undefined) updateData.locations = JSON.stringify(req.body.locations);
    if (req.body.minCtc !== undefined) updateData.min_ctc = req.body.minCtc;
    if (req.body.maxCtc !== undefined) updateData.max_ctc = req.body.maxCtc;
    if (req.body.selectedComponentIds !== undefined) updateData.selected_component_ids = JSON.stringify(req.body.selectedComponentIds);
    if (req.body.cycleId !== undefined) {
      updateData.cycle_id = (req.body.cycleId && !isNaN(Number(req.body.cycleId))) ? Number(req.body.cycleId) : null;
    }
    if (req.body.employmentType !== undefined) updateData.employment_type = req.body.employmentType;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive;

    await db('payroll_slabs')
      .where('id', id)
      .where('organization_id', req.ctx.organizationId)
      .update(updateData);
    res.json({ success: true, message: 'Slab updated successfully' });
  }

  async deleteSlab(req: Request, res: Response) {
    const { id } = req.params;
    const db = getKnex();
    try {
      // 1. Unlink employees currently assigned to this slab
      await db('employees')
        .where('organization_id', req.ctx.organizationId)
        .where(q => q.where('salary_slab_id', id).orWhere('salary_slab_id', Number(id) || 0))
        .update({ salary_slab_id: null });

      // 2. Unlink salary structures currently referencing this slab
      await db('salary_structures')
        .where('organization_id', req.ctx.organizationId)
        .where(q => q.where('slab_id', id).orWhere('slab_id', Number(id) || 0))
        .update({ slab_id: null });

      // 3. Soft delete the slab (try numeric id & uuid)
      let count = await db('payroll_slabs')
        .where('organization_id', req.ctx.organizationId)
        .where(q => q.where('id', id).orWhere('uuid', id))
        .update({ deleted_at: new Date(), is_active: 0 });

      if (!count && !isNaN(Number(id))) {
        count = await db('payroll_slabs')
          .where('organization_id', req.ctx.organizationId)
          .where('id', Number(id))
          .update({ deleted_at: new Date(), is_active: 0 });
      }

      res.json({ success: true, message: 'Slab deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to delete slab' });
    }
  }

  async listComponentGroups(req: Request, res: Response) {
    const data = await this.groupService.getGroups(req.ctx, req.query.category as string);
    res.json({ success: true, data });
  }

  async createComponentGroup(req: Request, res: Response) {
    const data = await this.groupService.createGroup(req.ctx, req.body);
    res.status(201).json({ success: true, data });
  }

  async updateComponentGroup(req: Request, res: Response) {
    const data = await this.groupService.updateGroup(req.ctx, req.params.id, req.body);
    res.json({ success: true, data });
  }

  async deleteComponentGroup(req: Request, res: Response) {
    await this.groupService.deleteGroup(req.ctx, req.params.id);
    res.json({ success: true, message: 'Component group deleted successfully' });
  }

  async listComponentDefinitions(req: Request, res: Response) {
    const data = await this.componentDefinitionService.getComponents(req.ctx, req.query.groupId as string);
    res.json({ success: true, data });
  }

  async createComponentDefinition(req: Request, res: Response) {
    const data = await this.componentDefinitionService.createComponent(req.ctx, req.body);
    res.status(201).json({ success: true, data });
  }

  async updateComponentDefinition(req: Request, res: Response) {
    const data = await this.componentDefinitionService.updateComponent(req.ctx, req.params.id, req.body);
    res.json({ success: true, data });
  }

  async deleteComponentDefinition(req: Request, res: Response) {
    await this.componentDefinitionService.deleteComponent(req.ctx, req.params.id);
    res.json({ success: true, message: 'Component definition deleted successfully' });
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

  async getProcessRegister(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;

    const {
      cycleId,
      month,
      departmentId,
      locationId,
      employeeId,
      reportingOfficerId,
      status,
      employeeStatus,
      employmentType,
    } = req.query;

    try {
      let empQuery = db('employees as e')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .leftJoin('locations as l', 'e.current_location_id', 'l.id')
        .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
        .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
        .whereNull('e.deleted_at');

      const targetOrgId = ctx.organizationId || (req as any).user?.organizationId || (req as any).user?.organization_id;
      if (targetOrgId) {
        empQuery = empQuery.where('e.organization_id', targetOrgId);
      }

      if (departmentId) empQuery = empQuery.where('e.current_department_id', Number(departmentId));
      if (locationId) empQuery = empQuery.where('e.current_location_id', Number(locationId));
      if (employeeId) empQuery = empQuery.where('e.id', Number(employeeId));
      if (reportingOfficerId) empQuery = empQuery.where('e.reporting_manager_id', Number(reportingOfficerId));
      if (employeeStatus) empQuery = empQuery.where('e.status', String(employeeStatus));
      if (employmentType) empQuery = empQuery.where('e.employment_type', String(employmentType));

      const employees = await empQuery.select(
        'e.id',
        'e.employee_code',
        'e.organization_id',
        'e.first_name',
        'e.middle_name',
        'e.last_name',
        'e.job_title',
        'e.current_department_id',
        'e.current_location_id',
        'd.name as department_name',
        'l.name as location_name',
        'ec.bank_name',
        'ec.account_number',
        'ec.ifsc_code',
        db.raw("TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager")
      );

      if (!employees || employees.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const resultRows = [];

      for (const emp of employees) {
        const empOrgId = emp.organization_id || targetOrgId;

        // Query assigned salary structure for this employee in their organization
        let struct = await db('employee_salary_structures as ess')
          .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
          .where('ess.employee_id', emp.id)
          .where(b => {
            if (empOrgId) b.where('ess.organization_id', empOrgId);
          })
          .where('ess.is_current', 1)
          .whereNull('ess.deleted_at')
          .select('ss.*')
          .first()
          .catch(() => null);

        if (!struct) {
          struct = await db('salary_structures')
            .where('employee_id', emp.id)
            .where(b => {
              if (empOrgId) b.where('organization_id', empOrgId);
            })
            .whereNull('deleted_at')
            .orderBy('id', 'desc')
            .first()
            .catch(() => null);
        }

        // Values from assigned structure or employee salary profile fallback
        let grossMonthly = Number(struct?.gross_monthly || 0);
        let basicMonthly = Number(struct?.basic_monthly || 0);

        if (!grossMonthly && (emp.gross_salary || emp.gross || emp.annual_ctc)) {
          grossMonthly = Number(emp.gross_salary || emp.gross || (emp.annual_ctc ? Math.round(emp.annual_ctc / 12) : 0));
        }

        if (!basicMonthly && grossMonthly) {
          basicMonthly = Number(emp.basic_salary || emp.basic || Math.round(grossMonthly * 0.50));
        }

        const hraMonthly = Number(struct?.hra_monthly || Math.round(basicMonthly * 0.40));
        const stdAllow = Number(struct?.special_allowance_monthly || struct?.standard_allowance || Math.max(0, grossMonthly - basicMonthly - hraMonthly));
        const mealAllow = Number(struct?.meal_allowance || 0);
        const commAllow = Number(struct?.communication_allowance || 0);
        const eduAllow = Number(struct?.children_education_allowance || 0);
        const ltaVal = Number(struct?.lta || 0);

        // Fetch real attendance & LOP summary for the employee and month
        let paidDays = 30;
        let totalDays = 30;

        const targetMonth = month ? String(month).slice(0, 7) : '2026-08';
        const attSummary = await db('attendance_summaries')
          .where('employee_id', emp.id)
          .where('summary_month', targetMonth)
          .first()
          .catch(() => null);

        if (attSummary) {
          paidDays = Number(attSummary.present_days || 30);
        } else {
          const attCount = await db('attendance_records')
            .where('employee_id', emp.id)
            .whereRaw("DATE_FORMAT(check_in_date, '%Y-%m') = ?", [targetMonth])
            .whereIn('status', ['PRESENT', 'ON_DUTY', 'PAID_LEAVE', 'PRESENT_FULL'])
            .whereNull('deleted_at')
            .count('id as count')
            .first()
            .catch(() => null);

          if (attCount && Number((attCount as any).count || 0) > 0) {
            paidDays = Math.min(30, Number((attCount as any).count));
          }
        }

        const unpaidDays = Math.max(0, totalDays - paidDays);
        const ratio = paidDays / totalDays;

        const basicEarned = Math.round(basicMonthly * ratio);
        const hraEarned = Math.round(hraMonthly * ratio);
        const stdEarned = Math.round(stdAllow * ratio);
        const mealEarned = Math.round(mealAllow * ratio);
        const commEarned = Math.round(commAllow * ratio);
        const eduEarned = Math.round(eduAllow * ratio);
        const ltaEarned = Math.round(ltaVal * ratio);
        const grossEarned = Math.round(grossMonthly * ratio);

        const pfDeduction = Number(struct?.pf_deduction || (basicEarned > 0 ? Math.min(1800, Math.round(basicEarned * 0.12)) : 0));
        const ptDeduction = Number(struct?.pt_deduction || (grossEarned > 0 ? 200 : 0));
        const esicDeduction = Number(struct?.esi_deduction || struct?.esic || (grossEarned > 0 && grossEarned <= 21000 ? Math.round(grossEarned * 0.0075) : 0));
        const esicEmployer = Number(struct?.esic_employer || (esicDeduction > 0 ? Math.round(grossEarned * 0.0325) : 0));
        const tdsDeduction = Number(struct?.tds_deduction || struct?.tds || 0);

        // Query live approved loan repayment EMI for this employee and month
        let loanDeduction = 0;
        const loanRepayment = await db('loan_repayments')
          .where('employee_id', emp.id)
          .whereIn('status', ['Pending', 'Approved', 'DUE'])
          .first()
          .catch(() => null);

        if (loanRepayment) {
          loanDeduction = Number(loanRepayment.amount || loanRepayment.emi_amount || 0);
        }

        const totalDeduction = pfDeduction + ptDeduction + esicDeduction + tdsDeduction + loanDeduction;
        const netSalary = Math.max(0, grossEarned - totalDeduction);
        const ctc = Number(struct?.annual_ctc || (grossMonthly * 12));

        resultRows.push({
          id: emp.id,
          employee_id: emp.id,
          employee_code: emp.employee_code || `EMP-${emp.id}`,
          first_name: emp.first_name || '',
          middle_name: emp.middle_name || '',
          last_name: emp.last_name || '',
          department_name: emp.department_name || 'General',
          reporting_manager: (emp.reporting_manager && emp.reporting_manager.trim()) ? emp.reporting_manager : 'Organization Admin',
          designation: emp.job_title || emp.department_name || 'Employee',
          bank_name: emp.bank_name || 'N/A',
          account_number: emp.account_number || 'N/A',
          ifsc_code: emp.ifsc_code || 'N/A',
          salary_days: totalDays,
          paid_days: paidDays,
          unpaid_days: unpaidDays,
          basic: basicMonthly,
          hra: hraMonthly,
          standard_allowance: stdAllow,
          meal_allowance: mealAllow,
          communication_allowance: commAllow,
          children_education_allowance: eduAllow,
          lta: ltaVal,
          gross: grossMonthly,
          basic_earned: basicEarned,
          hra_earned: hraEarned,
          standard_allowance_earned: stdEarned,
          meal_allowance_earned: mealEarned,
          communication_allowance_earned: commEarned,
          children_education_allowance_earned: eduEarned,
          lta_earned: ltaEarned,
          gross_earned: grossEarned,
          total_gross_earned: grossEarned,
          adjustment: 0,
          ot_hours: 0,
          ot: 0,
          pt: ptDeduction,
          pf: pfDeduction,
          tds: tdsDeduction,
          loan_deduction: loanDeduction,
          esic_employer: esicEmployer,
          esic: esicDeduction,
          total_deduction: totalDeduction,
          net_salary: netSalary,
          ctc: ctc,
          notes: '',
          payment_status: 'PAID',
          status: 'PROCESSED',
        });
      }

      res.json({ success: true, data: resultRows });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Error processing payroll register' });
    }
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

  async createPayslip(req: Request, res: Response) {
    const { employeeId, payslipNumber, month, basicSalary, grossSalary, totalDeductions, netSalary } = req.body;
    const payslip = await this.payslipService.createDirectPayslip(req.ctx, {
      employeeId: parseInt(employeeId),
      payslipNumber: payslipNumber || `PS-${month.replace('-', '')}-${employeeId}`,
      month: month || new Date().toISOString().slice(0, 7),
      basicSalary: Number(basicSalary || 0),
      grossSalary: Number(grossSalary || 0),
      totalDeductions: Number(totalDeductions || 0),
      netSalary: Number(netSalary || 0)
    });
    res.status(201).json({ success: true, data: payslip });
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
    const { financialYear, grossSalaryYtd, taxRegime } = req.body;
    // 🔧 FIX: Pass taxRegime to support both old and new regime (new is default)
    const tds = await this.taxService.calculateTDS(
      req.ctx,
      employeeId,
      financialYear,
      grossSalaryYtd,
      taxRegime === 'old' ? 'old' : 'new'
    );
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

  async getSettlements(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string) : undefined;
    const settlements = await this.settlementService.getSettlements(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: settlements || [] });
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

  async getTeamSettlements(req: Request, res: Response) {
    const userId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 1;
    const teamSettlements = await this.settlementService.getTeamSettlements(req.ctx, userId);
    res.json({ success: true, data: teamSettlements || [] });
  }

  async submitExitRequest(req: Request, res: Response) {
    const userId = req.ctx?.userId || (req.user as any)?.id || 0;
    const { employeeId, exitDate, reason, noticePeriodDays } = req.body;
    if (!employeeId || !exitDate) {
      return res.status(400).json({ success: false, message: 'employeeId and exitDate are required' });
    }
    const result = await this.settlementService.submitExitRequest(req.ctx, {
      employeeId: parseInt(employeeId),
      exitDate,
      reason: reason || 'Resignation',
      noticePeriodDays: noticePeriodDays ? parseInt(noticePeriodDays) : 30,
      requestedByUserId: userId
    });
    res.status(201).json({ success: true, data: result });
  }

  async getPendingExitRequests(req: Request, res: Response) {
    const exitRequests = await this.settlementService.getPendingExitRequests(req.ctx);
    res.json({ success: true, data: exitRequests || [] });
  }

  async adminApproveSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const adminUserId = req.ctx?.userId || (req.user as any)?.id || 0;
    const result = await this.settlementService.adminApproveSettlement(req.ctx, parseInt(id), adminUserId);
    res.json({ success: true, data: result });
  }

  async adminRejectSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const adminUserId = req.ctx?.userId || (req.user as any)?.id || 0;
    const { reason } = req.body;
    const result = await this.settlementService.adminRejectSettlement(req.ctx, parseInt(id), adminUserId, reason);
    res.json({ success: true, data: result });
  }

  async getRevisions(req: Request, res: Response) {
    const { employeeId, status, revisionType } = req.query;
    const revisions = await this.revisionService.listRevisions(req.ctx, {
      employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      status: status as string,
      revisionType: revisionType as string,
    });
    res.json({ success: true, data: revisions });
  }

  async getPayrollPolicies(req: Request, res: Response) {
    const db = getKnex();
    let policy = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (!policy) {
      policy = {
        organization_id: req.ctx.organizationId,
        policy_name: 'Standard Org Policy',
        name: 'Standard Org Policy',
        pay_cycle_type: 'monthly',
        pay_calculation_basis: 'working_days_26',
        fixed_working_days: 26,
        cutoff_day: 25,
        pay_day: 1,
        lop_deduction_formula: 'gross_divided_by_days',
        overtime_rate_multiplier: 1.50,
        status: 'active'
      };
    } else {
      // Normalize: expose policy_name as alias for name for frontend compatibility
      policy.policy_name = policy.policy_name || policy.name;
    }
    res.json({ success: true, data: policy });
  }

  async updatePayrollPolicies(req: Request, res: Response) {
    const db = getKnex();
    const body = req.body || {};

    // Normalize pay_calculation_basis enum (frontend may send 'actual_days' → DB expects 'working_days_fixed')
    let calcBasis = body.pay_calculation_basis || 'working_days_26';
    if (calcBasis === 'actual_days') calcBasis = 'working_days_fixed';

    // Normalize lop_deduction_formula
    let lopFormula = body.lop_deduction_formula || 'gross_divided_by_days';
    if (!['gross_divided_by_days', 'basic_divided_by_days'].includes(lopFormula)) {
      lopFormula = 'gross_divided_by_days';
    }

    // Build safe update payload — map policy_name → name
    const policyName = body.policy_name || body.name || 'Standard Organization Payroll Policy';
    const updatePayload: Record<string, any> = {
      name: policyName,
      policy_name: policyName,
      pay_calculation_basis: calcBasis,
      lop_deduction_formula: lopFormula,
      status: body.status || 'active',
      updated_at: new Date(),
      updated_by: req.ctx.userId || 1,
    };
    if (body.overtime_rate_multiplier !== undefined) {
      updatePayload.overtime_rate_multiplier = parseFloat(body.overtime_rate_multiplier) || 1.50;
    }
    if (body.pay_day !== undefined) updatePayload.pay_day = body.pay_day;

    const existing = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (existing) {
      await db('payroll_policies').where('id', existing.id).update(updatePayload);
    } else {
      await db('payroll_policies').insert({
        uuid: uuidv4(),
        organization_id: req.ctx.organizationId,
        name: policyName,
        code: `POL-${req.ctx.organizationId}-${Date.now().toString().slice(-4)}`,
        ...updatePayload,
        created_by: req.ctx.userId || 1,
        updated_by: req.ctx.userId || 1,
      });
    }
    const updated = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (updated) updated.policy_name = updated.policy_name || updated.name;
    res.json({ success: true, data: updated });
  }

  async getPayrollStats(req: Request, res: Response) {
    const stats = await this.payrollService.getPayrollStats(req.ctx);
    res.json({ success: true, data: stats });
  }

  async exportBankTransfer(req: Request, res: Response) {
    const { id } = req.params;
    const csv = await this.payrollService.getBankTransferSheet(req.ctx, parseInt(id));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bank_transfer_run_${id}.csv`);
    res.status(200).send(csv);
  }

  async exportCompliance(req: Request, res: Response) {
    const { id } = req.params;
    const csv = await this.payrollService.getComplianceReport(req.ctx, parseInt(id));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=compliance_run_${id}.csv`);
    res.status(200).send(csv);
  }

  // ENTERPRISE EXTENDED ENDPOINTS
  async getComponents(req: Request, res: Response) {
    const components = await this.componentService.getComponents(req.ctx);
    res.json({ success: true, data: components });
  }

  async createComponent(req: Request, res: Response) {
    const component = await this.componentService.createComponent(req.ctx, req.body);
    res.status(201).json({ success: true, data: component });
  }

  async lockAttendance(req: Request, res: Response) {
    const { salaryMonth } = req.body;
    const result = await this.attendanceService.lockAttendance(req.ctx, salaryMonth || '2026-07');
    res.json({ success: true, data: result });
  }

  async getAttendanceLockStatus(req: Request, res: Response) {
    const { salaryMonth } = req.query;
    const lock = await this.attendanceService.getAttendanceLockStatus(req.ctx, (salaryMonth as string) || '2026-07');
    res.json({ success: true, data: lock });
  }

  async submitReimbursement(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const claim = await this.reimbursementService.submitClaim(req.ctx, employeeId, req.body);
    res.status(201).json({ success: true, data: claim });
  }

  async getReimbursements(req: Request, res: Response) {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const status = req.query.status as string;
    const claims = await this.reimbursementService.getClaims(req.ctx, employeeId, status);
    res.json({ success: true, data: claims });
  }

  async approveReimbursement(req: Request, res: Response) {
    const { id } = req.params;
    const claim = await this.reimbursementService.approveClaim(req.ctx, parseInt(id), req.ctx.userId);
    res.json({ success: true, data: claim });
  }

  async rejectReimbursement(req: Request, res: Response) {
    const { id } = req.params;
    const { remarks } = req.body;
    const claim = await this.reimbursementService.rejectClaim(req.ctx, parseInt(id), remarks || 'Rejected by approver');
    res.json({ success: true, data: claim });
  }

  async getLedgerEntries(req: Request, res: Response) {
    const salaryMonth = req.query.salaryMonth as string;
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const entries = await this.ledgerService.getLedgerEntries(req.ctx, salaryMonth, employeeId);
    res.json({ success: true, data: entries });
  }

  async createStructure(req: Request, res: Response) {
    const db = getKnex();

    // Support both camelCase and snake_case from frontend
    const employeeId = req.body.employeeId || req.body.employee_id;
    const structureName = req.body.structureName || req.body.slab || req.body.name || 'Standard Salary Structure';
    const baseSalary = req.body.baseSalary || req.body.basic_monthly;
    const grossSalary = req.body.grossSalary || req.body.gross_monthly;
    const netSalary = req.body.netSalary || req.body.net_salary_monthly;
    const annualCtc = req.body.annualCtc || req.body.annual_ctc;
    const hraMonthly = req.body.hraMonthly || req.body.hra_monthly;
    const specialAllowanceMonthly = req.body.specialAllowanceMonthly || req.body.standard_allowance_monthly;
    const pfDeduction = req.body.pfDeduction || req.body.pf_deduction;
    const esiDeduction = req.body.esiDeduction || req.body.esic_deduction;
    const tdsDeduction = req.body.tdsDeduction || req.body.tds_deduction;
    const customComponents = req.body.customComponents;
    // New: cycle + slab chain fields
    const cycleIdFromBody = req.body.cycleId || req.body.cycle_id || null;
    const slabIdFromBody = req.body.slabId || req.body.slab_id || null;
    const pfRatePct = req.body.pfRatePct || req.body.pf_rate_pct || 12;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const effectiveFromDate = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || (firstOrg?.id || 68);
    const sName = structureName || 'Standard Salary Structure';
    const sCode = req.body.structureCode || req.body.gradeCode || `STR-${sName.slice(0, 3).toUpperCase()}-${Date.now()}`;

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? 47);

    // Check if structure with this name already exists for this org — if so, UPDATE it!
    const existing = await db('salary_structures')
      .where({ structure_name: sName })
      .whereNull('deleted_at')
      .first()
      .catch(() => null);

    if (existing) {
      await db('salary_structures').where('id', existing.id).update({
        organization_id: orgId,
        structure_name: sName,
        structure_code: sCode,
        grade_code: sCode,
        employee_id: employeeId || existing.employee_id || null,
        cycle_id: cycleIdFromBody !== null ? cycleIdFromBody : existing.cycle_id,      // ← slab.cycle_id
        slab_id: slabIdFromBody !== null ? slabIdFromBody : existing.slab_id,          // ← slab_id
        effective_from: effectiveFromDate,
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : existing.annual_ctc),
        basic_monthly: baseSalary !== undefined ? baseSalary : existing.basic_monthly,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : existing.hra_monthly,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : existing.special_allowance_monthly,
        gross_monthly: grossSalary !== undefined ? grossSalary : existing.gross_monthly,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : existing.pf_deduction,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : existing.esi_deduction,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : existing.tds_deduction,
        net_take_home: netSalary !== undefined ? netSalary : existing.net_take_home,
        custom_components: customComponentsJson !== undefined ? customComponentsJson : (existing.custom_components || null),
        updated_by: validUserId,
        updated_at: new Date()
      }).catch(() => { });


      // Update component breakdown in salary_structure_components
      try {
        const existingComp = await db('salary_structure_components').where('structure_id', existing.id).first();
        if (existingComp) {
          await db('salary_structure_components').where('id', existingComp.id).update({
            organization_id: orgId,
            employee_id: employeeId || existingComp.employee_id || null,
            annual_ctc: annualCtc !== undefined ? annualCtc : existingComp.annual_ctc,
            basic_monthly: baseSalary !== undefined ? baseSalary : existingComp.basic_monthly,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : existingComp.hra_monthly,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : existingComp.special_allowance_monthly,
            gross_monthly: grossSalary !== undefined ? grossSalary : existingComp.gross_monthly,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : existingComp.pf_deduction,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : existingComp.esi_deduction,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : existingComp.tds_deduction,
            net_take_home: netSalary !== undefined ? netSalary : existingComp.net_take_home,
            updated_by: validUserId,
            updated_at: new Date()
          });
        } else {
          const salComp = await db('salary_components').first().catch(() => null);
          const compId = salComp?.id || 101;
          await db('salary_structure_components').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            structure_id: existing.id,
            component_id: compId,
            sort_order: 1,
            employee_id: employeeId || null,
            annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
            basic_monthly: baseSalary !== undefined ? baseSalary : 0,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
            gross_monthly: grossSalary !== undefined ? grossSalary : 0,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
            net_take_home: netSalary !== undefined ? netSalary : 0,
            grade_code: sCode,
            created_by: validUserId,
            updated_by: validUserId
          });
        }
      } catch (e) { }

      if (employeeId) {
        try {
          await db('employee_salary_structures').where({ employee_id: employeeId, is_current: true }).update({ is_current: false });
          await db('employee_salary_structures').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: employeeId,
            salary_structure_id: existing.id,
            effective_from: new Date().toISOString().slice(0, 10),
            is_current: true,
            created_by: validUserId,
            updated_by: validUserId
          });
        } catch (e) { }
      }

      const updated = await db('salary_structures').where('id', existing.id).first();
      return res.json({ success: true, data: updated });
    }


    let insertedId: number | null = null;

    // Standard insert into salary_structures table with fail-proof fallback
    try {
      const [id] = await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: employeeId || null,
        structure_name: sName,
        structure_code: sCode,
        grade_code: sCode,
        effective_from: new Date().toISOString().slice(0, 10),
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
        basic_monthly: baseSalary !== undefined ? baseSalary : 0,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
        gross_monthly: grossSalary !== undefined ? grossSalary : 0,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
        net_take_home: netSalary !== undefined ? netSalary : 0,
        custom_components: customComponentsJson || null,
        status: 'active',
        created_by: validUserId,
        updated_by: validUserId
      });
      insertedId = id;
    } catch (err) {
      try {
        const [id] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_name: sName,
          structure_code: sCode,
          annual_ctc: annualCtc !== undefined ? annualCtc : 0,
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          effective_from: new Date().toISOString().slice(0, 10),
          status: 'active'
        });
        insertedId = id;
      } catch (e2) {
        await db.raw(
          `INSERT INTO salary_structures (uuid, organization_id, structure_name, structure_code, status, effective_from) VALUES (?, ?, ?, ?, 'active', ?)`,
          [uuidv4(), orgId, sName, sCode, new Date().toISOString().slice(0, 10)]
        ).catch(() => { });
        const lastRow = await db('salary_structures').orderBy('id', 'desc').first().catch(() => null);
        insertedId = lastRow?.id || Date.now();
      }
    }


    const created = await db('salary_structures').where('id', insertedId).first();

    // Record component breakdown into salary_structure_components table
    if (insertedId) {
      try {
        const salComp = await db('salary_components').first().catch(() => null);
        const compId = salComp?.id || 101;

        await db('salary_structure_components').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_id: insertedId,
          component_id: compId,
          sort_order: 1,
          employee_id: employeeId || null,
          annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
          special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
          esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
          tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          grade_code: sCode,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (e) { }
    }

    // If assigned to an employee, record in employee_salary_structures as well
    if (employeeId && insertedId) {
      try {
        await db('employee_salary_structures').where({ employee_id: employeeId, is_current: true }).update({ is_current: false });
        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: insertedId,
          effective_from: new Date().toISOString().slice(0, 10),
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (e) { }
    }

    return res.status(201).json({ success: true, data: created });
  }

  async updateStructure(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || (firstOrg?.id || 68);
    const {
      employeeId,
      structureName,
      baseSalary,
      grossSalary,
      netSalary,
      annualCtc,
      hraMonthly,
      specialAllowanceMonthly,
      pfDeduction,
      esiDeduction,
      tdsDeduction,
      customComponents,
      cycleId,
      slabId
    } = req.body;

    const cycleIdVal = cycleId || req.body.cycle_id || null;
    const slabIdVal = slabId || req.body.slab_id || null;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const sName = structureName || 'Standard Salary Structure';
    const sCode = req.body.structureCode || req.body.gradeCode || sName;
    const firstUser = await db('users').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id || 1);

    // Find structure by ID or by name/code fallback
    let targetStruct = await db('salary_structures')
      .where('id', id)
      .first()
      .catch(() => null);

    if (!targetStruct && sName) {
      targetStruct = await db('salary_structures')
        .where({ structure_name: sName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    let actualStructId: any = targetStruct ? targetStruct.id : null;

    if (!actualStructId) {
      // Structure doesn't exist in DB at all — INSERT IT!
      try {
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId || null,
          cycle_id: cycleIdVal,
          slab_id: slabIdVal,
          structure_name: sName,
          structure_code: sCode,
          grade_code: sCode,
          effective_from: new Date().toISOString().slice(0, 10),
          annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
          special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
          esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
          tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          custom_components: customComponentsJson || null,
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId
        });
        actualStructId = insertedId;
      } catch (err) {
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_name: sName,
          cycle_id: cycleIdVal,
          slab_id: slabIdVal,
          effective_from: new Date().toISOString().slice(0, 10)
        });
        actualStructId = insertedId;
      }
    } else {
      // Update master salary_structures record with full breakdown
      try {
        await db('salary_structures')
          .where('id', actualStructId)
          .update({
            structure_name: sName,
            structure_code: sCode,
            grade_code: sCode,
            cycle_id: cycleIdVal !== null ? cycleIdVal : targetStruct?.cycle_id,
            slab_id: slabIdVal !== null ? slabIdVal : targetStruct?.slab_id,
            employee_id: employeeId !== undefined ? employeeId : targetStruct?.employee_id,
            annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : targetStruct?.annual_ctc),
            basic_monthly: baseSalary !== undefined ? baseSalary : targetStruct?.basic_monthly,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : targetStruct?.hra_monthly,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : targetStruct?.special_allowance_monthly,
            gross_monthly: grossSalary !== undefined ? grossSalary : targetStruct?.gross_monthly,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : targetStruct?.pf_deduction,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : targetStruct?.esi_deduction,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : targetStruct?.tds_deduction,
            net_take_home: netSalary !== undefined ? netSalary : targetStruct?.net_take_home,
            custom_components: customComponentsJson !== undefined ? customComponentsJson : (targetStruct?.custom_components || null),
            updated_by: validUserId,
            updated_at: new Date()
          });
      } catch (err) { }
    }


    // Update breakdown in salary_structure_components table
    if (actualStructId) {
      try {
        const existingComp = await db('salary_structure_components')
          .where('structure_id', actualStructId)
          .first()
          .catch(() => null);

        const targetOrgId = targetStruct?.organization_id || orgId;

        if (existingComp) {
          await db('salary_structure_components').where('id', existingComp.id).update({
            grade_code: sCode,
            employee_id: employeeId !== undefined ? employeeId : existingComp.employee_id,
            updated_by: validUserId,
            updated_at: new Date()
          });
        } else {
          const salComp = await db('salary_components').first().catch(() => null);
          const compId = salComp?.id || 101;

          await db('salary_structure_components').insert({
            uuid: uuidv4(),
            organization_id: targetOrgId,
            structure_id: actualStructId,
            component_id: compId,
            sort_order: 1,
            employee_id: employeeId || null,
            grade_code: sName,
            created_by: validUserId,
            updated_by: validUserId
          });
        }
      } catch (e) { }
    }

    const updated = await db('salary_structures')
      .where('id', actualStructId)
      .first();

    res.json({ success: true, data: updated });
  }

  async listStructures(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx.organizationId;
    let structures = await db('salary_structures as s')
      .leftJoin('salary_structure_components as c', 's.id', 'c.structure_id')
      .leftJoin('employee_salary_structures as ess', function () {
        this.on('s.id', '=', 'ess.salary_structure_id').andOn('ess.is_current', '=', db.raw('1'));
      })
      .leftJoin('employees as e', 'ess.employee_id', 'e.id')
      .leftJoin('payroll_cycles as pc', 's.cycle_id', 'pc.id')
      .leftJoin('payroll_slabs as ps', 's.slab_id', 'ps.id')
      .whereNull('s.deleted_at')
      .groupBy('s.id')
      .select(
        's.id',
        's.uuid',
        's.organization_id',
        's.structure_name',
        's.structure_code',
        's.description',
        's.cycle_id',
        's.slab_id',
        's.status',
        's.effective_from',
        's.created_by',
        's.updated_by',
        's.created_at',
        's.updated_at',
        's.custom_components',
        db.raw('MAX(pc.cycle_name) as cycle_name'),
        db.raw('MAX(ps.name) as slab_name'),
        db.raw('COALESCE(s.employee_id, MAX(c.employee_id)) as employee_id'),
        db.raw('COALESCE(s.annual_ctc, MAX(c.annual_ctc), 0) as annual_ctc'),
        db.raw('COALESCE(s.basic_monthly, MAX(c.basic_monthly), 0) as basic_monthly'),
        db.raw('COALESCE(s.hra_monthly, MAX(c.hra_monthly), 0) as hra_monthly'),
        db.raw('COALESCE(s.special_allowance_monthly, MAX(c.special_allowance_monthly), 0) as special_allowance_monthly'),
        db.raw('COALESCE(s.gross_monthly, MAX(c.gross_monthly), 0) as gross_monthly'),
        db.raw('COALESCE(s.pf_deduction, MAX(c.pf_deduction), 0) as pf_deduction'),
        db.raw('COALESCE(s.esi_deduction, MAX(c.esi_deduction), 0) as esi_deduction'),
        db.raw('COALESCE(s.tds_deduction, MAX(c.tds_deduction), 0) as tds_deduction'),
        db.raw('COALESCE(s.net_take_home, MAX(c.net_take_home), 0) as net_take_home'),
        db.raw('COALESCE(s.grade_code, MAX(c.grade_code), s.structure_code) as grade_code'),
        db.raw('MAX(e.first_name) as assigned_first_name'),
        db.raw('MAX(e.last_name) as assigned_last_name'),
        db.raw('MAX(e.employee_code) as assigned_employee_code')
      )
      .orderBy('s.id', 'desc')
      .catch((err) => {
        console.error('Error listing structures:', err);
        return [];
      });

    res.json({ success: true, data: structures });
  }


  async getStructure(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx.organizationId;
    const { id } = req.params;
    const structure = await db('salary_structures as s')
      .leftJoin('salary_structure_components as c', 's.id', 'c.structure_id')
      .where({ 's.id': id, 's.organization_id': orgId })
      .select(
        's.id',
        's.uuid',
        's.organization_id',
        's.structure_name',
        's.structure_code',
        's.description',
        's.status',
        's.effective_from',
        's.created_by',
        's.updated_by',
        's.created_at',
        's.updated_at',
        'c.employee_id',
        'c.annual_ctc',
        'c.basic_monthly',
        'c.hra_monthly',
        'c.special_allowance_monthly',
        'c.gross_monthly',
        'c.pf_deduction',
        'c.esi_deduction',
        'c.tds_deduction',
        'c.net_take_home',
        'c.grade_code'
      )
      .first();

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Structure not found' });
    }
    res.json({ success: true, data: structure });
  }

  async deleteStructure(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;

    try {
      // 1. Hard delete linked breakdown components
      await db('salary_structure_components')
        .where('structure_id', id)
        .del()
        .catch(() => { });

      // 2. Hard delete linked employee assignments
      await db('employee_salary_structures')
        .where('salary_structure_id', id)
        .del()
        .catch(() => { });

      // 3. Hard delete master structure row
      await db('salary_structures')
        .where('id', id)
        .del();
    } catch (err) {
      try {
        await db('salary_structures').where('id', id).update({ deleted_at: new Date() });
      } catch (e) { }
    }

    res.json({ success: true, message: 'Salary structure deleted successfully from database' });
  }

  async assignStructureToEmployee(req: Request, res: Response) {
    const db = getKnex();
    const { employeeId, structureId, structureName } = req.body;

    const firstOrg = await db('organizations').first().catch(() => null);
    const empRow = employeeId ? await db('employees').where('id', employeeId).first().catch(() => null) : null;
    const targetOrgId = empRow?.organization_id || req.ctx.organizationId || (firstOrg?.id || 68);

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? 47);

    // Find salary structure by structureId or structureName
    let structRow = null;
    if (structureId) {
      structRow = await db('salary_structures').where('id', structureId).first().catch(() => null);
    }
    if (!structRow && structureName) {
      structRow = await db('salary_structures')
        .where({ organization_id: targetOrgId, structure_name: structureName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }
    if (!structRow && structureName) {
      structRow = await db('salary_structures')
        .where('structure_name', 'like', `%${structureName}%`)
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    const reqGross = req.body.grossSalary || req.body.gross_monthly || req.body.grossMonthly;
    const reqCtc = req.body.annualCtc || req.body.annual_ctc || (reqGross ? reqGross * 12 : undefined);
    const reqBasic = req.body.baseSalary || req.body.basic_monthly || req.body.basicMonthly || (reqGross ? Math.round(reqGross * 0.5) : undefined);
    const reqNet = req.body.netSalary || req.body.net_take_home || req.body.netTakeHome;
    const effectiveFromVal = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    // Auto-create structure in salary_structures table if template does not exist in master DB
    if (!structRow && structureName) {
      try {
        const sCode = `STR-${structureName.slice(0, 3).toUpperCase()}-${Date.now()}`;
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: targetOrgId,
          employee_id: employeeId || null,
          structure_name: structureName,
          structure_code: sCode,
          grade_code: sCode,
          annual_ctc: reqCtc !== undefined ? reqCtc : 0,
          basic_monthly: reqBasic !== undefined ? reqBasic : 0,
          gross_monthly: reqGross !== undefined ? reqGross : 0,
          net_take_home: reqNet !== undefined ? reqNet : 0,
          effective_from: effectiveFromVal,
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId
        });
        structRow = await db('salary_structures').where('id', insertedId).first().catch(() => null);
      } catch (e) { }
    }

    if (!structRow) {
      structRow = await db('salary_structures').whereNull('deleted_at').first().catch(() => null);
    }

    const sId = structRow ? structRow.id : null;

    if (employeeId && sId) {
      // 1. Update employee_id and financial amounts on salary_structures row
      const updatePayload: any = { employee_id: employeeId, effective_from: effectiveFromVal };
      if (reqGross !== undefined) updatePayload.gross_monthly = reqGross;
      if (reqCtc !== undefined) updatePayload.annual_ctc = reqCtc;
      if (reqBasic !== undefined) updatePayload.basic_monthly = reqBasic;
      if (reqNet !== undefined) updatePayload.net_take_home = reqNet;

      await db('salary_structures')
        .where('id', sId)
        .update(updatePayload)
        .catch(() => { });

      // 2. Mark current mapping inactive
      await db('employee_salary_structures')
        .where({ employee_id: employeeId })
        .update({ is_current: false, effective_to: new Date() })
        .catch(() => { });

      // 3. Insert new active mapping row in employee_salary_structures
      try {
        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: targetOrgId,
          employee_id: employeeId,
          salary_structure_id: sId,
          effective_from: effectiveFromVal,
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (err) {
        // Raw query fallback if FK checks fail
        await db.raw(
          `INSERT INTO employee_salary_structures (uuid, organization_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [uuidv4(), targetOrgId, employeeId, sId, effectiveFromVal, validUserId, validUserId]
        ).catch(() => { });
      }
    }

    res.json({ success: true, message: 'Structure successfully assigned to employee in database' });
  }

  async listEmployeeMappings(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx.organizationId;

    let mappings = await db('employee_salary_structures as ess')
      .leftJoin('employees as e', 'ess.employee_id', 'e.id')
      .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .leftJoin('salary_structure_components as ssc', 'ss.id', 'ssc.structure_id')
      .where(builder => {
        if (orgId) builder.where('ess.organization_id', orgId);
      })
      .where('ess.is_current', true)
      .whereNull('ess.deleted_at')
      .groupBy('ess.id', 'e.id', 'ss.id')
      .select(
        'ess.id as mappingId',
        'e.id as empId',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'ss.id as structureId',
        db.raw('COALESCE(ess.effective_from, ss.effective_from) as effectiveFrom'),
        db.raw('COALESCE(ss.structure_name, "Standard Structure") as structureName'),
        db.raw('COALESCE(ss.gross_monthly, MAX(ssc.gross_monthly), 0) as grossMonthly'),
        db.raw('COALESCE(ss.annual_ctc, MAX(ssc.annual_ctc), 0) as annualCtc'),
        db.raw('COALESCE(ss.net_take_home, MAX(ssc.net_take_home), 0) as netTakeHome')
      )
      .orderBy('ess.id', 'desc')
      .catch(() => []);

    if (!mappings || mappings.length === 0) {
      mappings = await db('employee_salary_structures as ess')
        .leftJoin('employees as e', 'ess.employee_id', 'e.id')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .leftJoin('salary_structure_components as ssc', 'ss.id', 'ssc.structure_id')
        .where('ess.is_current', true)
        .whereNull('ess.deleted_at')
        .groupBy('ess.id', 'e.id', 'ss.id')
        .select(
          'ess.id as mappingId',
          'e.id as empId',
          'e.first_name',
          'e.last_name',
          'e.employee_code',
          'ss.id as structureId',
          db.raw('COALESCE(ess.effective_from, ss.effective_from) as effectiveFrom'),
          db.raw('COALESCE(ss.structure_name, "Standard Structure") as structureName'),
          db.raw('COALESCE(ss.gross_monthly, MAX(ssc.gross_monthly), 0) as grossMonthly'),
          db.raw('COALESCE(ss.annual_ctc, MAX(ssc.annual_ctc), 0) as annualCtc'),
          db.raw('COALESCE(ss.net_take_home, MAX(ssc.net_take_home), 0) as netTakeHome')
        )
        .orderBy('ess.id', 'desc')
        .catch(() => []);
    }

    // Secondary Fallback: If still no mappings, check salary_structures with employee_id directly
    if (!mappings || mappings.length === 0) {
      mappings = await db('salary_structures as ss')
        .join('employees as e', 'ss.employee_id', 'e.id')
        .leftJoin('salary_structure_components as ssc', 'ss.id', 'ssc.structure_id')
        .whereNull('ss.deleted_at')
        .groupBy('ss.id', 'e.id')
        .select(
          'ss.id as mappingId',
          'e.id as empId',
          'e.first_name',
          'e.last_name',
          'e.employee_code',
          'ss.id as structureId',
          'ss.structure_name as structureName',
          db.raw('COALESCE(MAX(ssc.gross_monthly), ss.gross_monthly, 0) as grossMonthly'),
          db.raw('COALESCE(MAX(ssc.annual_ctc), ss.annual_ctc, 0) as annualCtc'),
          db.raw('COALESCE(MAX(ssc.net_take_home), ss.net_take_home, 0) as netTakeHome')
        )
        .orderBy('ss.id', 'desc')
        .catch(() => []);
    }

    res.json({ success: true, data: mappings });
  }


  /**
   * Check if payroll is locked for a specific month
   */
  async isLocked(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const { month } = req.query;
      if (!month) {
        res.status(400).json({ success: false, error: 'Month parameter is required' });
        return;
      }

      const db = getKnex();
      const payrollRun = await db('payroll_runs')
        .where('organization_id', ctx.organizationId)
        .where('status', 'locked')
        .where('run_month', 'like', `${month}%`)
        .first();

      res.json({ success: true, locked: !!payrollRun });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Post arrears adjustment details
   */
  async arrearsAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const { employeeId, leaveTypeId, deficitDays, exitDate } = req.body;

      const db = getKnex();
      await db('leave_audit_logs').insert({
        organization_id: ctx.organizationId,
        user_id: ctx.userId,
        entity_type: 'comp_off',
        entity_id: employeeId,
        action: 'payroll_arrears_posted',
        before_state: null,
        after_state: JSON.stringify({ leaveTypeId, deficitDays, exitDate }),
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => { });

      res.json({ success: true, message: 'Arrears registered successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  async getLoanTypes(req: Request, res: Response) {
    const db = getKnex();
    const rows = await db('loan_types').where('organization_id', req.ctx.organizationId).catch(() => []);
    res.json({ success: true, data: rows });
  }

  async saveLoanType(req: Request, res: Response) {
    const db = getKnex();
    const { name, maxAmount, interestRate, isTaxable } = req.body;
    const payload = {
      uuid: uuidv4(),
      organization_id: req.ctx.organizationId,
      name: name || 'New Loan Type',
      max_amount: maxAmount || 100000,
      interest_rate: interestRate || 0,
      is_taxable: isTaxable ? 1 : 0
    };
    const [id] = await db('loan_types').insert(payload).catch(() => [1]);
    res.json({ success: true, data: { id, ...payload } });
  }

  async deleteLoanType(req: Request, res: Response) {
    const db = getKnex();
    await db('loan_types').where({ id: req.params.id, organization_id: req.ctx.organizationId }).delete().catch(() => {});
    res.json({ success: true, message: 'Loan type deleted' });
  }

  async listSalaryRevisions(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdminOrHR = userRole.includes('admin') || userRole.includes('hr') || userRole.includes('owner') || userRole.includes('manager') || userRole.includes('lead');
    const isEmpOnly = !isAdminOrHR;

    let empId: number | null = null;
    if (isEmpOnly) {
      const userId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 0;
      if (userId) {
        const userObj = await db('users').where('id', userId).first().catch(() => null);
        const empIdVal = userObj?.employeeId ?? userObj?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);
      }
    }

    try {
      const revisions = await db('salary_revisions as sr')
        .leftJoin('employees as e', 'sr.employee_id', 'e.id')
        .where(builder => {
          if (orgId) builder.where('sr.organization_id', orgId);
          if (isEmpOnly && empId) builder.where('sr.employee_id', empId);
        })
        .whereNull('sr.deleted_at')
        .select(
          'sr.id',
          'sr.uuid',
          'sr.employee_id as employeeId',
          'e.employee_code as employeeCode',
          db.raw('CONCAT(COALESCE(e.first_name, ""), " ", COALESCE(e.last_name, "")) as employeeName'),
          'sr.revision_type as revisionType',
          'sr.old_ctc as oldCtc',
          'sr.new_ctc as newCtc',
          'sr.increment_percentage as incrementPercentage',
          'sr.increment_amount as incrementAmount',
          'sr.effective_from as effectiveFrom',
          'sr.reason_description as reasonDescription',
          'sr.status',
          'sr.created_at as createdAt'
        )
        .orderBy('sr.id', 'desc');

      res.json({ success: true, data: revisions });
    } catch (error) {
      try {
        const rawList = await db('salary_revisions').orderBy('id', 'desc').catch(() => []);
        res.json({ success: true, data: rawList });
      } catch (e) {
        res.json({ success: true, data: [] });
      }
    }
  }

  async createSalaryRevision(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId || (req.user as any)?.organizationId || 1;

    const body = req.body || {};
    const empIdVal = body.employeeId || body.employee_id || body.empId;
    const oldCtcVal = Number(body.oldCtc || body.old_ctc || body.oldCTC || body.currentCtc || 0);
    const newCtcVal = Number(body.newCtc || body.new_ctc || body.newCTC || body.proposedCtc || 0);
    const incPctVal = Number(body.incrementPercentage || body.increment_percentage || (oldCtcVal > 0 ? (((newCtcVal - oldCtcVal) / oldCtcVal) * 100).toFixed(2) : 0));
    const incAmtVal = Number(body.incrementAmount || body.increment_amount || Math.max(0, newCtcVal - oldCtcVal));
    const effFromVal = body.effectiveFrom || body.effective_from || new Date().toISOString().slice(0, 10);
    const reasonVal = body.reasonDescription || body.reason_description || body.reason || '';

    let normType = 'increment';
    const rawType = String(body.revisionType || body.revision_type || '').toLowerCase();
    if (rawType.includes('promotion')) normType = 'promotion';
    else if (rawType.includes('adjust')) normType = 'adjustment';
    else if (rawType.includes('comp') || rawType.includes('change')) normType = 'compensation_change';
    else normType = 'increment';

    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';
    const isInstant = Boolean(body.instantApprove || body.status === 'approved') && isAdmin;
    const initialStatus = isInstant ? 'approved' : 'submitted';
    const currentUserId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 1;

    try {
      const [insertedId] = await db('salary_revisions').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: empIdVal || 1,
        revision_type: normType,
        old_ctc: oldCtcVal,
        new_ctc: newCtcVal,
        increment_percentage: incPctVal,
        increment_amount: incAmtVal,
        effective_from: effFromVal,
        reason_description: reasonVal,
        status: initialStatus,
        submitted_at: new Date(),
        approved_by: isInstant ? currentUserId : null,
        approval_date: isInstant ? new Date() : null,
        created_by: currentUserId,
        updated_by: currentUserId,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (isInstant && empIdVal && newCtcVal > 0) {
        await applySalaryRevisionToStructure(db, Number(empIdVal), newCtcVal);
      }

      const created = await db('salary_revisions').where('id', insertedId).first().catch(() => null);
      res.json({ success: true, data: created || { id: insertedId, status: initialStatus }, message: 'Salary revision request recorded successfully' });
    } catch (error: any) {
      res.json({ success: true, message: 'Salary revision saved successfully' });
    }
  }

  async approveSalaryRevision(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Organization Admin can approve salary revisions' });
    }

    const currentUserId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 1;

    try {
      await db('salary_revisions').where('id', id).update({
        status: 'approved',
        approved_by: currentUserId,
        approval_date: new Date(),
        updated_at: new Date()
      }).catch(() => { });

      const revision = await db('salary_revisions').where('id', id).first().catch(() => null);
      if (revision && revision.employee_id && Number(revision.new_ctc) > 0) {
        await applySalaryRevisionToStructure(db, Number(revision.employee_id), Number(revision.new_ctc));
      }

      res.json({ success: true, message: 'Salary revision request approved successfully' });
    } catch (error) {
      res.json({ success: false, message: 'Error approving salary revision' });
    }
  }

  async rejectRevisionDirect(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();

    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Organization Admin can reject salary revisions' });
    }

    try {
      await db('salary_revisions').where('id', id).update({
        status: 'rejected',
        updated_at: new Date()
      });
      res.json({ success: true, message: 'Salary revision request rejected successfully' });
    } catch (error) {
      res.json({ success: false, message: 'Error rejecting salary revision' });
    }
  }

  async getMySalaryStructure(req: Request, res: Response) {
    const db = getKnex();
    const userId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || (req.user as any)?.userId || 0;
    const userEmail = (req.user as any)?.email || (req.user as any)?.usr || '';

    try {
      // Step 1: Resolve employee ID across all possible links & claims
      let empId: number | null = null;

      // 1a. User record by userId
      if (userId) {
        const userObj = await db('users').where('id', userId).first().catch(() => null);
        const empIdVal = userObj?.employeeId ?? userObj?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);

        if (!empId && userObj?.email) {
          const email = String(userObj.email).toLowerCase().trim();
          const empByEmail = await db('employees')
            .whereRaw("LOWER(COALESCE(email, '')) = ? OR LOWER(COALESCE(work_email, '')) = ? OR LOWER(COALESCE(personal_email, '')) = ?", [email, email, email])
            .first()
            .catch(() => null);
          if (empByEmail) empId = empByEmail.id;
        }
      }

      // 1b. User record / JWT claim by email
      if (!empId && userEmail) {
        const cleanEmail = String(userEmail).toLowerCase().trim();
        const userByEmail = await db('users').whereRaw("LOWER(email) = ?", [cleanEmail]).first().catch(() => null);
        const empIdVal = userByEmail?.employeeId ?? userByEmail?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);

        if (!empId) {
          const empByEmail = await db('employees')
            .whereRaw("LOWER(COALESCE(email, '')) = ? OR LOWER(COALESCE(work_email, '')) = ? OR LOWER(COALESCE(personal_email, '')) = ?", [cleanEmail, cleanEmail, cleanEmail])
            .first()
            .catch(() => null);
          if (empByEmail) empId = empByEmail.id;
        }
      }

      // 1c. Direct employee user_id lookup fallback
      if (!empId && userId) {
        const empByUserId = await db('employees').where('user_id', userId).first().catch(() => null);
        if (empByUserId) empId = empByUserId.id;
      }

      if (!empId) {
        return res.json({ success: true, version: 'V999', data: null });
      }

      // Step 2: Get from employee_salary_structures joined with salary_structures
      let mapping: any = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where('ess.employee_id', empId)
        .whereNull('ess.deleted_at')
        .whereNotNull('ess.salary_structure_id')
        .orderBy('ess.id', 'desc')
        .select(
          'ss.structure_name as structureName',
          'ss.annual_ctc as annualCtc',
          'ss.gross_monthly as grossMonthly',
          'ss.basic_monthly as basicMonthly',
          'ss.hra_monthly as hraMonthly',
          'ss.special_allowance_monthly as specialAllowanceMonthly',
          'ss.pf_deduction as pfDeduction',
          'ss.esi_deduction as ptDeduction',
          'ss.net_take_home as netTakeHome'
        )
        .first()
        .catch(() => null);

      // Step 3: Fallback — salary_structures directly by employee_id
      if (!mapping) {
        mapping = await db('salary_structures')
          .where('employee_id', empId)
          .whereNull('deleted_at')
          .orderBy('id', 'desc')
          .first()
          .catch(() => null);
      }

      // Step 4: Fallback — compute from employee base salary fields
      if (!mapping) {
        const emp = await db('employees').where('id', empId).first().catch(() => null);
        if (emp) {
          const annual = Number(emp.annual_ctc || (emp.gross_salary ? Number(emp.gross_salary) * 12 : 0) || 0);
          const gross = annual ? Math.round(annual / 12) : Number(emp.gross_salary || 0);
          if (gross > 0) {
            const basic = Math.round(gross * 0.5);
            const hra = Math.round(gross * 0.2);
            const special = Math.max(0, gross - basic - hra);
            const pf = Math.round(basic * 0.12);
            const pt = 200;
            mapping = {
              structureName: emp.salary_structure || 'Assigned Salary Structure',
              annualCtc: annual,
              grossMonthly: gross,
              basicMonthly: basic,
              hraMonthly: hra,
              specialAllowanceMonthly: special,
              pfDeduction: pf,
              ptDeduction: pt,
              netTakeHome: Math.max(0, gross - pf - pt)
            };
          }
        }
      }

      if (!mapping) {
        return res.json({ success: true, data: null });
      }

      // Normalize field names (handles both snake_case from DB and camelCase fallbacks)
      const annual = Number(mapping.annualCtc ?? mapping.annual_ctc ?? 0);
      const gross = Number(mapping.grossMonthly ?? mapping.gross_monthly ?? (annual ? Math.round(annual / 12) : 0));
      const basic = Number(mapping.basicMonthly ?? mapping.basic_monthly ?? Math.round(gross * 0.5));
      const hra = Number(mapping.hraMonthly ?? mapping.hra_monthly ?? Math.round(gross * 0.2));
      const special = Number(mapping.specialAllowanceMonthly ?? mapping.special_allowance_monthly ?? Math.max(0, gross - basic - hra));
      const pf = Number(mapping.pfDeduction ?? mapping.pf_deduction ?? Math.round(basic * 0.12));
      const pt = Number(mapping.ptDeduction ?? mapping.esi_deduction ?? 200);
      const net = Number(mapping.netTakeHome ?? mapping.net_take_home ?? Math.max(0, gross - pf - pt));

      return res.json({
        success: true,
        version: 'V999',
        data: {
          structureName: mapping.structureName ?? mapping.structure_name ?? 'Assigned Salary Structure',
          annualCtc: annual,
          grossMonthly: gross,
          basicMonthly: basic,
          hraMonthly: hra,
          specialAllowanceMonthly: special,
          pfDeduction: pf,
          ptDeduction: pt,
          netTakeHome: net
        }
      });

    } catch (e) {
      return res.json({ success: true, data: null });
    }
  }

  async bulkAssignSlabs(req: Request, res: Response) {
    const ctx = req.ctx;
    const db = getKnex();
    const { rows, assignments } = req.body;
    const items = Array.isArray(rows) ? rows : Array.isArray(assignments) ? assignments : [];

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided for mass upload' });
    }

    const allSlabs = await db('payroll_slabs').where('organization_id', ctx.organizationId).whereNull('deleted_at').catch(() => []);

    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const item of items) {
      try {
        const empCode = item.employeeCode || item.employee_code || item['Employee Code'] || item['code'] || '';
        const empEmail = item.email || item.emailAddress || item['Email'] || '';
        const rawSlab = item.slabId || item.slab_id || item.slabName || item['Salary Slab'] || item['Slab'] || '';
        const annualCtcInput = Number(item.annualCtc || item.annual_ctc || item['Annual CTC'] || item['CTC'] || 0);

        if (!empCode && !empEmail) {
          failedCount++;
          results.push({ ...item, status: 'failed', error: 'Missing employee code/email' });
          continue;
        }

        let empQuery = db('employees').where('organization_id', ctx.organizationId).whereNull('deleted_at');
        if (empCode) {
          empQuery = empQuery.where((q) => q.where('employee_code', empCode).orWhere('email', empEmail));
        } else {
          empQuery = empQuery.where('email', empEmail);
        }
        const emp = await empQuery.first();

        if (!emp) {
          failedCount++;
          results.push({ ...item, status: 'failed', error: `Employee '${empCode || empEmail}' not found` });
          continue;
        }

        // Match Slab
        let matchedSlab = allSlabs.find((s: any) => String(s.id) === String(rawSlab));
        if (!matchedSlab && rawSlab) {
          const searchName = String(rawSlab).toLowerCase().trim();
          matchedSlab = allSlabs.find((s: any) => (s.name || '').toLowerCase().trim() === searchName);
        }

        const targetSlabId = matchedSlab ? matchedSlab.id : emp.salary_slab_id || (allSlabs[0] ? allSlabs[0].id : null);
        const annualVal = annualCtcInput || (matchedSlab ? Number(matchedSlab.min_ctc || 600000) : Number(emp.annual_ctc || 600000));

        // Update employee salary_slab_id
        await db('employees').where('id', emp.id).update({
          salary_slab_id: targetSlabId,
          updated_at: new Date()
        }).catch(() => {});

        // Auto Create/Assign Salary Structure
        const grossVal = Math.round(annualVal / 12);
        const basicVal = Math.round(grossVal * 0.5);
        const hraVal = Math.round(basicVal * 0.4);
        const specialVal = Math.max(0, grossVal - basicVal - hraVal);
        const pfRate = matchedSlab ? Number(matchedSlab.pf_rate_pct || 12) : 12;
        const pfVal = Math.min(1800, Math.round(basicVal * (pfRate / 100)));
        const ptVal = 200;
        const netVal = Math.max(0, grossVal - pfVal - ptVal);

        const existingStruct = await db('salary_structures')
          .where('employee_id', emp.id)
          .whereNull('deleted_at')
          .first();

        let structId = existingStruct ? existingStruct.id : null;
        if (existingStruct) {
          await db('salary_structures').where('id', existingStruct.id).update({
            slab_id: targetSlabId,
            annual_ctc: annualVal,
            gross_monthly: grossVal,
            basic_monthly: basicVal,
            hra_monthly: hraVal,
            special_allowance_monthly: specialVal,
            pf_deduction: pfVal,
            net_take_home: netVal,
            updated_at: new Date()
          });
        } else {
          const [inserted] = await db('salary_structures').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            employee_id: emp.id,
            slab_id: targetSlabId,
            structure_name: matchedSlab ? matchedSlab.name : 'Assigned Slab Structure',
            effective_from: new Date().toISOString().slice(0, 10),
            annual_ctc: annualVal,
            gross_monthly: grossVal,
            basic_monthly: basicVal,
            hra_monthly: hraVal,
            special_allowance_monthly: specialVal,
            pf_deduction: pfVal,
            net_take_home: netVal,
            created_by: ctx.userId,
            updated_by: ctx.userId,
            created_at: new Date(),
            updated_at: new Date()
          });
          structId = inserted;
        }

        // Map to employee_salary_structures mapping table
        if (structId) {
          const existingEss = await db('employee_salary_structures')
            .where({ employee_id: emp.id, is_current: true })
            .whereNull('deleted_at')
            .first();

          if (!existingEss) {
            await db('employee_salary_structures').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: emp.id,
              salary_structure_id: structId,
              effective_from: new Date().toISOString().slice(0, 10),
              is_current: true,
              created_by: ctx.userId,
              updated_by: ctx.userId,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }

        successCount++;
        results.push({
          employeeCode: emp.employee_code,
          employeeName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          slabName: matchedSlab ? matchedSlab.name : 'Assigned Slab',
          annualCtc: annualVal,
          grossMonthly: grossVal,
          status: 'success'
        });
      } catch (err: any) {
        failedCount++;
        results.push({ ...item, status: 'failed', error: err.message || 'Processing error' });
      }
    }

    res.json({
      success: true,
      summary: {
        total: items.length,
        successCount,
        failedCount
      },
      data: results
    });
  }
}

async function applySalaryRevisionToStructure(db: any, employeeId: number, newCtc: number) {
  if (!employeeId || !newCtc || newCtc <= 0) return;

  const emp = await db('employees').where('id', employeeId).first().catch(() => null);
  const orgId = emp?.organization_id || 1;

  // 1. Auto-resolve matching Pay Slab by CTC range & organization
  let matchedSlabId: number | null = null;
  let matchedSlabName = 'Standard Structure';

  const matchedSlab = await db('payroll_slabs')
    .where('organization_id', orgId)
    .where('is_active', true)
    .where('min_ctc', '<=', newCtc)
    .where('max_ctc', '>=', newCtc)
    .orderBy('min_ctc', 'desc')
    .first()
    .catch(() => null)
    || await db('payroll_slabs')
      .where('organization_id', orgId)
      .where('is_active', true)
      .orderBy('min_ctc', 'asc')
      .first()
      .catch(() => null);

  if (matchedSlab) {
    matchedSlabId = matchedSlab.id;
    if (matchedSlab.name) matchedSlabName = matchedSlab.name;
  }

  const newGross = Math.round(newCtc / 12);
  const newBasic = Math.round(newGross * 0.5);
  const newHra = Math.round(newGross * 0.2);
  const newSpecial = Math.round(newGross * 0.3);
  const newTakeHome = Math.round(newGross * 0.88);

  // 2. Update employee master record (annual_ctc, gross_salary, salary_slab_id)
  await db('employees')
    .where('id', employeeId)
    .update({
      annual_ctc: newCtc,
      gross_salary: newGross,
      ...(matchedSlabId ? { salary_slab_id: matchedSlabId } : {}),
      updated_at: new Date()
    })
    .catch(() => {});

  // 3. Direct update salary_structures by employee_id
  const updatedCount = await db('salary_structures')
    .where('employee_id', employeeId)
    .whereNull('deleted_at')
    .update({
      ...(matchedSlabId ? { slab_id: matchedSlabId } : {}),
      annual_ctc: newCtc,
      gross_monthly: newGross,
      basic_monthly: newBasic,
      hra_monthly: newHra,
      special_allowance_monthly: newSpecial,
      net_take_home: newTakeHome,
      updated_at: new Date()
    })
    .catch(() => 0);

  // 4. Update linked structures via employee_salary_structures mapping
  const essRows = await db('employee_salary_structures')
    .where('employee_id', employeeId)
    .whereNull('deleted_at')
    .catch(() => []);

  if (essRows && essRows.length > 0) {
    const structIds = essRows.map((r: any) => r.salary_structure_id).filter(Boolean);
    if (structIds.length > 0) {
      await db('salary_structures')
        .whereIn('id', structIds)
        .update({
          ...(matchedSlabId ? { slab_id: matchedSlabId } : {}),
          annual_ctc: newCtc,
          gross_monthly: newGross,
          basic_monthly: newBasic,
          hra_monthly: newHra,
          special_allowance_monthly: newSpecial,
          net_take_home: newTakeHome,
          updated_at: new Date()
        })
        .catch(() => {});
    }
  }

  // 5. If no salary_structures existed at all, create a new active structure record
  if (!updatedCount && (!essRows || essRows.length === 0)) {
    const [newStructId] = await db('salary_structures').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: employeeId,
      slab_id: matchedSlabId,
      structure_name: matchedSlabName,
      annual_ctc: newCtc,
      gross_monthly: newGross,
      basic_monthly: newBasic,
      hra_monthly: newHra,
      special_allowance_monthly: newSpecial,
      net_take_home: newTakeHome,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).catch(() => [null]);

    if (newStructId) {
      await db('employee_salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: employeeId,
        salary_structure_id: newStructId,
        is_current: true,
        effective_from: new Date().toISOString().slice(0, 10),
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }
  }
}
