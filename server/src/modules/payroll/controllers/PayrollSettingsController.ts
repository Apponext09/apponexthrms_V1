/**
 * PayrollSettingsController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Payroll Settings, Policies, Attendance Locking, Reimbursements, and Ledger entries.
 * Extracted from PayrollController.ts — zero logic changes.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { PayrollSettingsService } from '../services/PayrollSettingsService';
import { PayComponentService } from '../services/PayComponentService';
import { AttendanceIntegrationService } from '../services/AttendanceIntegrationService';
import { ReimbursementService } from '../services/ReimbursementService';
import { PayrollLedgerService } from '../services/PayrollLedgerService';

export class PayrollSettingsController {
  private settingsService: PayrollSettingsService;
  private componentService: PayComponentService;
  private attendanceService: AttendanceIntegrationService;
  private reimbursementService: ReimbursementService;
  private ledgerService: PayrollLedgerService;

  constructor(
    settingsService?: PayrollSettingsService,
    componentService?: PayComponentService,
    attendanceService?: AttendanceIntegrationService,
    reimbursementService?: ReimbursementService,
    ledgerService?: PayrollLedgerService
  ) {
    this.settingsService = settingsService || new PayrollSettingsService();
    this.componentService = componentService || new PayComponentService();
    this.attendanceService = attendanceService || new AttendanceIntegrationService();
    this.reimbursementService = reimbursementService || new ReimbursementService();
    this.ledgerService = ledgerService || new PayrollLedgerService();
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

  async getPayrollSettings(req: Request, res: Response) {
    const settings = await this.settingsService.getSettings(req.ctx);
    res.json({ success: true, data: settings });
  }

  async updatePayrollSettings(req: Request, res: Response) {
    const settings = await this.settingsService.updateSettings(req.ctx, req.body || {});
    res.json({ success: true, data: settings });
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
      policy.policy_name = policy.policy_name || policy.name;
    }
    res.json({ success: true, data: policy });
  }

  async updatePayrollPolicies(req: Request, res: Response) {
    const db = getKnex();
    const body = req.body || {};

    let calcBasis = body.pay_calculation_basis || 'working_days_26';
    if (calcBasis === 'actual_days') calcBasis = 'working_days_fixed';

    let lopFormula = body.lop_deduction_formula || 'gross_divided_by_days';
    if (!['gross_divided_by_days', 'basic_divided_by_days'].includes(lopFormula)) {
      lopFormula = 'gross_divided_by_days';
    }

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
}
