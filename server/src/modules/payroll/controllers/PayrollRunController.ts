/**
 * PayrollRunController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles payroll run lifecycle:
 *   generate → process → lock → approve → publish
 * Plus: list runs, status checks, bank/compliance exports.
 */

import type { Request, Response } from 'express';
import { getKnex } from '../../../db/knex';
import { requireOrgId } from '../utils/payroll.utils';
import { PayrollService } from '../services/PayrollService';

export class PayrollRunController {
  constructor(private payrollService: PayrollService) {}

  async generatePayroll(req: Request, res: Response) {
    try {
      const { payrollCycleId, runType, companyId, locationId, departmentId, employeeIds, month } =
        req.body;
      const db = getKnex();

      let resolvedCompanyId = companyId || req.ctx?.companyId;
      if (!resolvedCompanyId && req.ctx?.organizationId) {
        const parentComp =
          (await db('company')
            .where('organization_id', req.ctx.organizationId)
            .where('is_parent', 1)
            .first()
            .catch(() => null)) ||
          (await db('company')
            .where('organization_id', req.ctx.organizationId)
            .orderBy('company_id', 'asc')
            .first()
            .catch(() => null));
        if (parentComp?.company_id) resolvedCompanyId = parentComp.company_id;
      }

      let targetCycleId: number;
      if (payrollCycleId && !isNaN(Number(payrollCycleId))) {
        targetCycleId = Number(payrollCycleId);
      } else {
        const targetComp = resolvedCompanyId;
        let cycleQuery = db('payroll_cycles').whereNull('deleted_at');
        if (targetComp) {
          cycleQuery = cycleQuery.where((b) => {
            b.where('company_id', Number(targetComp)).orWhereNull('company_id');
          });
        }
        if (req.ctx?.organizationId) {
          cycleQuery = cycleQuery.where((b) => {
            b.where('organization_id', req.ctx.organizationId).orWhereNull('organization_id');
          });
        }
        const firstCycle = await cycleQuery.orderBy('company_id', 'desc').first().catch(() => null);
        if (!firstCycle) {
          return res.status(400).json({
            success: false,
            message: 'No active payroll cycle found for this company/organization.',
          });
        }
        targetCycleId = Number(firstCycle.id);
      }

      const cycleRow = await db('payroll_cycles')
        .where('id', targetCycleId)
        .first()
        .catch(() => null);
      if (cycleRow?.company_id && !companyId) {
        resolvedCompanyId = cycleRow.company_id;
      }

      const run = await this.payrollService.generatePayroll(
        req.ctx,
        targetCycleId,
        runType || 'regular',
        {
          companyId: resolvedCompanyId ? Number(resolvedCompanyId) : undefined,
          locationId,
          departmentId,
          employeeIds,
          month: month ? String(month) : undefined,
        },
        month ? String(month) : undefined
      );
      res.status(201).json({ success: true, data: run });
    } catch (e: any) {
      console.error('generatePayroll error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error generating payroll run' });
    }
  }

  async processPayroll(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const run = await this.payrollService.processPayroll(req.ctx, parseInt(id));
      res.json({ success: true, data: run });
    } catch (e: any) {
      console.error('processPayroll error:', e);
      // Reset a permanently-stuck 'processing' run back to 'draft' so HR can retry
      try {
        const db = getKnex();
        await db('payroll_runs')
          .where('id', parseInt(req.params.id))
          .where('organization_id', req.ctx.organizationId)
          .where('status', 'processing')
          .update({ status: 'draft', updated_at: new Date() });
      } catch { /* ignore reset error */ }
      res.status(500).json({ success: false, message: e.message || 'Error processing payroll run' });
    }
  }

  async lockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.lockPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async unlockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body || {};
    const run = await this.payrollService.unlockPayroll(req.ctx, parseInt(id), reason);
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
    const { cycleId, month } = req.query;
    const runs = await this.payrollService.getPayrollRuns(
      req.ctx,
      cycleId ? parseInt(cycleId as string) : undefined,
      month ? String(month) : undefined
    );
    res.json({ success: true, data: runs });
  }

  async getPendingApprovals(req: Request, res: Response) {
    const runs = await this.payrollService.getPendingApprovals(req.ctx);
    res.json({ success: true, data: runs });
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

  async getReconciliation(req: Request, res: Response) {
    try {
      const data = await this.payrollService.getReconciliation(req.ctx, parseInt(req.params.id));
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error getting reconciliation' });
    }
  }

  async getPayrollRunDetails(req: Request, res: Response) {
    const db = getKnex();
    const runId = parseInt(req.params.id);
    if (Number.isNaN(runId)) {
      res.status(404).json({ success: false, message: 'Payroll run not found' });
      return;
    }
    const run = await db('payroll_runs as pr')
      .leftJoin('payroll_cycles as pc', 'pr.payroll_cycle_id', 'pc.id')
      .leftJoin('users as locked_u', 'pr.locked_by', 'locked_u.id')
      .leftJoin('users as app_u', 'pr.approved_by', 'app_u.id')
      .where({ 'pr.id': runId, 'pr.organization_id': req.ctx.organizationId })
      .select(
        'pr.*',
        'pc.cycle_name',
        'pc.frequency',
        db.raw("COALESCE(locked_u.first_name, 'HR Admin') as locked_by_name"),
        db.raw("COALESCE(app_u.first_name, 'CEO / Org Admin') as approved_by_name")
      )
      .first();

    if (!run) {
      res.status(404).json({ success: false, message: 'Payroll run not found' });
      return;
    }

    const employees = await db('payroll_run_employees as pre')
      .join('employees as e', 'pre.employee_id', 'e.id')
      .leftJoin('designations as d', 'e.current_designation_id', 'd.id')
      .leftJoin('departments as dept', 'e.current_department_id', 'dept.id')
      .leftJoin('payroll_slabs as slab', 'e.salary_slab_id', 'slab.id')
      .where('pre.payroll_run_id', runId)
      .select(
        'pre.*',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.bank_name',
        'e.account_number',
        'e.ifsc_code',
        db.raw("COALESCE(dept.name, e.department, 'General') as department"),
        db.raw("COALESCE(d.name, e.designation, 'Staff') as designation"),
        db.raw("COALESCE(slab.name, 'Standard Pay Slab') as slab_name")
      );

    const deptMap: Record<string, { count: number; totalGross: number; totalNet: number }> = {};
    for (const emp of employees) {
      const deptName = emp.department || 'General';
      if (!deptMap[deptName]) deptMap[deptName] = { count: 0, totalGross: 0, totalNet: 0 };
      deptMap[deptName].count += 1;
      deptMap[deptName].totalGross += Number(emp.total_earnings || 0);
      deptMap[deptName].totalNet += Number(emp.net_salary || 0);
    }
    const departmentBreakdown = Object.entries(deptMap).map(([name, data]) => ({
      department: name,
      ...data,
    }));

    res.json({ success: true, data: { ...run, employees, departmentBreakdown } });
  }

  async isLocked(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.query;
      if (!month) {
        res.status(400).json({ success: false, error: 'Month parameter is required' });
        return;
      }
      const db = getKnex();
      const payrollRun = await db('payroll_runs')
        .where('organization_id', req.ctx.organizationId)
        .where('status', 'locked')
        .where('run_month', 'like', `${month}%`)
        .first();
      res.json({ success: true, locked: !!payrollRun });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  async getPayrollStats(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = requireOrgId(req.ctx);

      const latestRun = await db('payroll_runs')
        .where('organization_id', orgId)
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .first()
        .catch(() => null);

      const totalEmployeesCount = await db('employees')
        .where('organization_id', orgId)
        .where('status', 'ACTIVE')
        .whereNull('deleted_at')
        .count('id as count')
        .first();

      const runEmpRows = latestRun
        ? await db('payroll_run_employees').where('payroll_run_id', latestRun.id)
        : [];

      const totalGross = runEmpRows.reduce(
        (acc: number, r: any) => acc + Number(r.totalEarnings ?? r.total_earnings ?? 0),
        0
      );
      const totalNet = runEmpRows.reduce(
        (acc: number, r: any) => acc + Number(r.netSalary ?? r.net_salary ?? 0),
        0
      );
      const totalDeductions = runEmpRows.reduce(
        (acc: number, r: any) => acc + Number(r.totalDeductions ?? r.total_deductions ?? 0),
        0
      );

      res.json({
        success: true,
        data: {
          totalEmployees: Number(totalEmployeesCount?.count || 0),
          processedCount: runEmpRows.length,
          totalGross,
          totalNet,
          totalDeductions,
          status: latestRun?.status || 'draft',
          runMonth: latestRun ? String(latestRun.run_month || latestRun.runMonth || '') : new Date().toISOString().slice(0, 7),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getManagerDeptStats(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = requireOrgId(req.ctx);

      const deptStats = await db('employees as e')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where('e.organization_id', orgId)
        .whereNull('e.deleted_at')
        .groupBy('d.id', 'd.name')
        .select(
          'd.id as department_id',
          db.raw("COALESCE(d.name, 'General') as department_name"),
          db.raw('COUNT(e.id) as employee_count'),
          db.raw('SUM(COALESCE(e.gross_salary, 0)) as total_gross_monthly')
        );

      res.json({ success: true, data: deptStats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async arrearsAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, leaveTypeId, deficitDays, exitDate } = req.body;
      const db = getKnex();
      await db('leave_audit_logs')
        .insert({
          organization_id: req.ctx.organizationId,
          user_id: req.ctx.userId,
          entity_type: 'comp_off',
          entity_id: employeeId,
          action: 'payroll_arrears_posted',
          before_state: null,
          after_state: JSON.stringify({ leaveTypeId, deficitDays, exitDate }),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .catch(() => {});
      res.json({ success: true, message: 'Arrears registered successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  async createMassUploadLog(req: Request, res: Response) {
    const db = getKnex();
    const { v4: uuidv4 } = await import('uuid');
    const { fileName, slabName, totalRows, successCount, failCount, errors } = req.body;
    const [id] = await db('payroll_mass_upload_logs').insert({
      uuid: uuidv4(),
      organization_id: req.ctx.organizationId,
      file_name: fileName || 'upload.csv',
      slab_name: slabName || null,
      total_rows: Number(totalRows || 0),
      success_count: Number(successCount || 0),
      fail_count: Number(failCount || 0),
      errors: errors ? JSON.stringify(errors) : null,
      uploaded_by: req.ctx.userId,
    });
    const log = await db('payroll_mass_upload_logs').where('id', id).first();
    res.status(201).json({ success: true, data: log });
  }

  async getMassUploadLogs(req: Request, res: Response) {
    const db = getKnex();
    const logs = await db('payroll_mass_upload_logs as l')
      .leftJoin('users as u', 'l.uploaded_by', 'u.id')
      .where('l.organization_id', req.ctx.organizationId)
      .orderBy('l.id', 'desc')
      .limit(50)
      .select('l.*', db.raw("COALESCE(u.first_name, 'HR Admin') as uploaded_by_name"));
    res.json({ success: true, data: logs });
  }
}
