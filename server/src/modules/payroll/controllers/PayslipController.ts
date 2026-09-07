/**
 * PayslipController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles payslip generation, retrieval, details, email dispatch, and locking.
 * Extracted from PayrollController.ts — zero logic changes.
 */

import type { Request, Response } from 'express';
import { getKnex } from '../../../db/knex';
import { PayslipService } from '../services/PayslipService';

export class PayslipController {
  private payslipService: PayslipService;

  constructor(payslipService?: PayslipService) {
    this.payslipService = payslipService || new PayslipService();
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

  async getPayslips(req: Request, res: Response) {
    const db = getKnex();
    const { employeeId, month, companyId, company_id } = req.query;
    const orgId = req.ctx.organizationId;

    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', req.ctx.userId)
      .select('r.code')
      .catch(() => []);
    const roleCodes = userRoles.map((r: any) => r.code);
    const isAdminOrHR = roleCodes.includes('organization_admin') ||
      roleCodes.includes('super_admin') ||
      roleCodes.includes('hr_manager') ||
      roleCodes.includes('finance') ||
      roleCodes.includes('finance_manager');

    let query = db('payslips as p')
      .leftJoin('employees as e', 'p.employee_id', 'e.id')
      .where('p.organization_id', orgId)
      .whereNull('p.deleted_at')
      .select(
        'p.*',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'e.current_department_id',
        'e.current_designation_id'
      );

    const targetCompId = companyId || company_id || (req.ctx.companyId ? String(req.ctx.companyId) : undefined);

    if (employeeId && !isNaN(Number(employeeId))) {
      query = query.where('p.employee_id', Number(employeeId));
    } else if (!isAdminOrHR) {
      const myEmpId = await this.getEmployeeId(req);
      query = query.where('p.employee_id', myEmpId);
    }

    if (targetCompId && String(targetCompId).toLowerCase() !== 'all') {
      const cId = Number(targetCompId);
      query = query.where((b) => {
        b.where('p.company_id', cId)
          .orWhere('e.company_id', cId)
          .orWhereNull('p.company_id');
      });
    }

    if (month) {
      const monthStr = String(month).slice(0, 7);
      query = query.whereRaw("DATE_FORMAT(p.payslip_month, '%Y-%m') = ?", [monthStr]);
    }

    const payslips = await query.orderBy('p.id', 'desc');
    res.json({ success: true, data: payslips });
  }

  async generatePayslipFromProcess(req: Request, res: Response) {
    const { employeeId, month } = req.body;
    const result = await this.payslipService.getOrGenerateFromProcessedRun(req.ctx, parseInt(employeeId), month);
    res.status(201).json({ success: true, data: result });
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
}
