/**
 * SalaryStructureController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles salary structure CRUD, preview calculations, employee assignments,
 * mapping lists, bulk assignments, and attendance calendar view.
 * Extracted from PayrollController.ts — zero logic changes.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { withSnakeAliases } from '../utils/payroll.utils';
import { PayrollService } from '../services/PayrollService';
import { SalaryCalculationService } from '../services/SalaryCalculationService';

export class SalaryStructureController {
  constructor(private payrollService?: PayrollService) {}

  async listStructures(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 0);
      const employeeId = req.query.employee_id || req.query.employeeId;

      let query = db('salary_structures')
        .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
        .select(
          'salary_structures.*',
          'payroll_slabs.slab_name as slab_name',
          'payroll_slabs.selected_component_ids as slab_component_ids'
        )
        .whereNull('salary_structures.deleted_at')
        .orderBy('salary_structures.id', 'desc');

      if (employeeId) {
        const assignedStructIds = await db('employee_salary_structures')
          .where('employee_id', employeeId)
          .where('is_current', true)
          .pluck('salary_structure_id')
          .catch(() => []);

        query = query.where(function (this: any) {
          this.where('salary_structures.employee_id', employeeId);
          if (assignedStructIds.length > 0) {
            this.orWhereIn('salary_structures.id', assignedStructIds);
          }
        });
      } else if (orgId) {
        query = query.where(function (this: any) {
          this.where('salary_structures.organization_id', orgId).orWhereNull('salary_structures.organization_id');
        });
      }

      const rows = await query;

      const mapped = rows.map((r: any) => {
        const s = withSnakeAliases(r) || r;
        let earningsBreakup = [];
        try {
          const rawEB = s.earnings_breakup || s.earningsBreakup;
          earningsBreakup = typeof rawEB === 'string' ? JSON.parse(rawEB) : (rawEB || []);
        } catch { }

        let deductionsBreakup = [];
        try {
          const rawDB = s.deductions_breakup || s.deductionsBreakup;
          deductionsBreakup = typeof rawDB === 'string' ? JSON.parse(rawDB) : (rawDB || []);
        } catch { }

        return (() => {
          let customComponents: any = {};
          try {
            const rawCC = s.custom_components || s.customComponents;
            customComponents = typeof rawCC === 'string' ? JSON.parse(rawCC) : (rawCC || {});
          } catch { }
          const slabName = s.slab_name || s.slabName || s.payroll_slab_name || '';
          const grossVal = Number(s.gross_monthly ?? s.grossMonthly ?? s.gross ?? s.annual_ctc ?? s.annualCtc ?? 0) > 1000
            ? (Number(s.gross_monthly ?? s.grossMonthly ?? s.gross ?? 0) || Math.round(Number(s.annual_ctc ?? s.annualCtc ?? 0) / 12))
            : 0;
          const annualCtcVal = Number(s.annual_ctc ?? s.annualCtc ?? 0) || grossVal * 12;
          const netVal = Math.max(0, grossVal - Number(s.total_deductions ?? s.totalDeductions ?? 0));
          return {
            ...s,
            id: String(s.id),
            employeeId: s.employee_id ? String(s.employee_id) : (s.employeeId ? String(s.employeeId) : undefined),
            structureName: s.structure_name || s.structureName || slabName,
            slab: slabName,
            slabName: slabName,
            slabId: s.slab_id !== undefined && s.slab_id !== null ? String(s.slab_id) : (s.slabId !== undefined && s.slabId !== null ? String(s.slabId) : undefined),
            cycleId: s.cycle_id !== undefined && s.cycle_id !== null ? String(s.cycle_id) : (s.cycleId !== undefined && s.cycleId !== null ? String(s.cycleId) : undefined),
            annualCtc: annualCtcVal,
            annual_ctc: annualCtcVal,
            ctc: annualCtcVal,
            grossMonthly: grossVal,
            gross_monthly: grossVal,
            gross: grossVal,
            basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
            basic: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
            hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
            hra: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
            specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
            totalDeductions: Number(s.total_deductions ?? s.totalDeductions ?? 0),
            total_deductions: Number(s.total_deductions ?? s.totalDeductions ?? 0),
            pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
            esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
            tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
            netTakeHome: netVal,
            net_take_home: netVal,
            netSalary: netVal,
            salaryInput: annualCtcVal,
            salary_input: annualCtcVal,
            customComponents,
            custom_components: customComponents,
            earningsBreakup,
            earnings_breakup: earningsBreakup,
            deductionsBreakup,
            deductions_breakup: deductionsBreakup,
            effectiveFrom: s.effective_from || s.effectiveFrom || new Date().toISOString().slice(0, 10),
            status: s.status === 'inactive' ? 'Deleted' : 'Active'
          };
        })();
      });

      res.json({ success: true, data: mapped });
    } catch (e: any) {
      console.error('listStructures error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error listing salary structures' });
    }
  }

  async getStructure(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 0);
      const { id } = req.params;

      // 1. Try finding by salary_structures.id
      let row = await db('salary_structures')
        .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
        .select(
          'salary_structures.*',
          'payroll_slabs.name as slab_name',
          'payroll_slabs.selected_component_ids as slab_component_ids'
        )
        .where('salary_structures.id', id)
        .whereNull('salary_structures.deleted_at')
        .first()
        .catch(() => null);

      // 2. If not found by structure id, fallback to employee_id
      if (!row) {
        row = await db('salary_structures')
          .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
          .select(
            'salary_structures.*',
            'payroll_slabs.name as slab_name',
            'payroll_slabs.selected_component_ids as slab_component_ids'
          )
          .where('salary_structures.employee_id', id)
          .whereNull('salary_structures.deleted_at')
          .orderBy('salary_structures.id', 'desc')
          .first()
          .catch(() => null);
      }

      if (!row) {
        return res.status(404).json({ success: false, message: 'Salary structure not found' });
      }

      const s = withSnakeAliases(row) || row;
      let customComponents = [];
      try {
        const rawCC = s.custom_components || s.customComponents;
        customComponents = typeof rawCC === 'string'
          ? JSON.parse(rawCC)
          : (rawCC || []);
      } catch { }

      let earningsBreakup = [];
      try {
        const rawEB = s.earnings_breakup || s.earningsBreakup;
        earningsBreakup = typeof rawEB === 'string' ? JSON.parse(rawEB) : (rawEB || []);
      } catch { }

      let deductionsBreakup = [];
      try {
        const rawDB = s.deductions_breakup || s.deductionsBreakup;
        deductionsBreakup = typeof rawDB === 'string' ? JSON.parse(rawDB) : (rawDB || []);
      } catch { }

      const slabName = s.slab_name || s.slabName || s.structure_name || s.structureName || 'Standard Pay Slab';
      const annualCtcVal = Number(s.annual_ctc ?? s.annualCtc ?? 0);
      const grossVal = Number(s.gross_monthly ?? s.grossMonthly ?? s.gross ?? 0);
      const netVal = Number(s.net_take_home ?? s.netTakeHome ?? s.net_salary_monthly ?? s.netSalary ?? 0);

      res.json({
        success: true,
        data: {
          ...s,
          id: String(s.id),
          employeeId: s.employee_id ? String(s.employee_id) : (s.employeeId ? String(s.employeeId) : undefined),
          structureName: s.structure_name || s.structureName || slabName,
          slab: slabName,
          slabName: slabName,
          slabId: s.slab_id !== undefined && s.slab_id !== null ? String(s.slab_id) : (s.slabId !== undefined && s.slabId !== null ? String(s.slabId) : undefined),
          cycleId: s.cycle_id !== undefined && s.cycle_id !== null ? String(s.cycle_id) : (s.cycleId !== undefined && s.cycleId !== null ? String(s.cycleId) : undefined),
          annualCtc: annualCtcVal,
          annual_ctc: annualCtcVal,
          ctc: annualCtcVal,
          grossMonthly: grossVal,
          gross_monthly: grossVal,
          gross: grossVal,
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          basic: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          hra: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          totalDeductions: Number(s.total_deductions ?? s.totalDeductions ?? 0),
          total_deductions: Number(s.total_deductions ?? s.totalDeductions ?? 0),
          netTakeHome: netVal,
          net_take_home: netVal,
          netSalary: netVal,
          salaryInput: annualCtcVal,
          salary_input: annualCtcVal,
          customComponents,
          custom_components: customComponents,
          earningsBreakup,
          earnings_breakup: earningsBreakup,
          deductionsBreakup,
          deductions_breakup: deductionsBreakup,
          effectiveFrom: s.effective_from || s.effectiveFrom || new Date().toISOString().slice(0, 10),
          status: s.status === 'inactive' ? 'Deleted' : 'Active'
        }
      });
    } catch (e: any) {
      console.error('getStructure error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error getting salary structure' });
    }
  }

  async deleteStructure(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 0);
      const { id } = req.params;

      await db('salary_structures')
        .where(function (this: any) {
          this.where('id', id).orWhere('employee_id', id);
        })
        .update({ deleted_at: new Date(), status: 'inactive' });

      await db('employee_salary_structures')
        .where('salary_structure_id', id)
        .orWhere('employee_id', id)
        .update({ is_current: false, effective_to: new Date() })
        .catch(() => { });

      res.json({ success: true, message: 'Salary structure deleted successfully' });
    } catch (e: any) {
      console.error('deleteStructure error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error deleting salary structure' });
    }
  }

  async createStructure(req: Request, res: Response) {
    const db = getKnex();

    const employeeId = req.body.employeeId || req.body.employee_id;
    const structureName = req.body.structureName || req.body.slab || req.body.name || 'Standard Salary Structure';
    const baseSalary = req.body.baseSalary || req.body.basic_monthly;
    const grossSalary = req.body.grossSalary || req.body.gross_monthly;
    const netSalary = req.body.netSalary || req.body.net_salary_monthly || req.body.net_take_home;
    const annualCtc = req.body.annualCtc || req.body.annual_ctc;
    const hraMonthly = req.body.hraMonthly || req.body.hra_monthly;
    const specialAllowanceMonthly = req.body.specialAllowanceMonthly || req.body.standard_allowance_monthly;
    const pfDeduction = req.body.pfDeduction || req.body.pf_deduction;
    const esiDeduction = req.body.esiDeduction || req.body.esic_deduction;
    const tdsDeduction = req.body.tdsDeduction || req.body.tds_deduction;
    const totalDeductions = req.body.totalDeductions || req.body.total_deductions || (Number(pfDeduction || 0) + Number(esiDeduction || 0) + Number(tdsDeduction || 0));
    const customComponents = req.body.customComponents;
    const earningsBreakup = req.body.earningsBreakup || req.body.earnings_breakup;
    const deductionsBreakup = req.body.deductionsBreakup || req.body.deductions_breakup;

    const cycleIdFromBody = req.body.cycleId || req.body.cycle_id || null;
    const slabIdFromBody = req.body.slabId || req.body.slab_id || null;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const earningsBreakupJson = earningsBreakup
      ? (typeof earningsBreakup === 'string' ? earningsBreakup : JSON.stringify(earningsBreakup))
      : null;

    const deductionsBreakupJson = deductionsBreakup
      ? (typeof deductionsBreakup === 'string' ? deductionsBreakup : JSON.stringify(deductionsBreakup))
      : null;

    const effectiveFromDate = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || firstOrg?.id || null;
    const sName = structureName || 'Standard Salary Structure';
    const sCode = req.body.structureCode || `STR-${sName.slice(0, 3).toUpperCase()}-${Date.now()}`;

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? null);

    const emp = employeeId ? await db('employees').where('id', employeeId).first().catch(() => null) : null;
    const resolvedCompanyId = req.body.companyId || req.body.company_id || emp?.company_id || req.ctx?.companyId || null;
    const numericCompanyId = (resolvedCompanyId && !isNaN(Number(resolvedCompanyId)) && Number(resolvedCompanyId) > 0)
      ? Number(resolvedCompanyId)
      : null;

    // Validate cycleId against database to ensure foreign key integrity
    let finalCycleId: number | null = null;
    const candidateCycle = cycleIdFromBody || (slabIdFromBody ? (await db('payroll_slabs').where('id', slabIdFromBody).first().catch(() => null))?.cycle_id : null);
    if (candidateCycle) {
      const cycleRow = await db('payroll_cycles').where('id', candidateCycle).first().catch(() => null);
      if (cycleRow) finalCycleId = Number(candidateCycle);
    }
    if (!finalCycleId && numericCompanyId) {
      const compCycle = await db('payroll_cycles').where('company_id', numericCompanyId).whereNull('deleted_at').first().catch(() => null);
      if (compCycle) finalCycleId = compCycle.id;
    }
    if (!finalCycleId) {
      const activeCycle = await db('payroll_cycles')
        .where(function (this: any) {
          if (orgId) this.where('organization_id', orgId);
        })
        .whereNull('deleted_at')
        .orderBy('is_current_cycle', 'desc')
        .first()
        .catch(() => null);
      if (activeCycle) finalCycleId = activeCycle.id;
    }

    // Validate slabId against database
    let finalSlabId: number | null = null;
    if (slabIdFromBody) {
      const slabRow = await db('payroll_slabs').where('id', slabIdFromBody).first().catch(() => null);
      if (slabRow) finalSlabId = Number(slabIdFromBody);
    }

    const existing = employeeId
      ? await db('salary_structures')
        .where({ employee_id: employeeId, organization_id: orgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null)
      : await db('salary_structures')
        .where({ structure_name: sName, organization_id: orgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);

    if (existing) {
      await db('salary_structures').where('id', existing.id).update({
        organization_id: orgId,
        company_id: numericCompanyId !== null ? numericCompanyId : existing.company_id,
        structure_name: sName,
        structure_code: sCode,
        employee_id: employeeId || existing.employee_id || null,
        cycle_id: finalCycleId !== null ? finalCycleId : existing.cycle_id,
        slab_id: finalSlabId !== null ? finalSlabId : existing.slab_id,
        effective_from: effectiveFromDate,
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : existing.annual_ctc),
        basic_monthly: baseSalary !== undefined ? baseSalary : existing.basic_monthly,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : existing.hra_monthly,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : existing.special_allowance_monthly,
        gross_monthly: grossSalary !== undefined ? grossSalary : existing.gross_monthly,
        total_deductions: totalDeductions !== undefined ? totalDeductions : existing.total_deductions,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : existing.pf_deduction,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : existing.esi_deduction,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : existing.tds_deduction,
        net_take_home: netSalary !== undefined ? netSalary : existing.net_take_home,
        earnings_breakup: earningsBreakupJson !== null ? earningsBreakupJson : existing.earnings_breakup,
        deductions_breakup: deductionsBreakupJson !== null ? deductionsBreakupJson : existing.deductions_breakup,
        updated_by: validUserId,
        updated_at: new Date()
      }).catch(() => { });

      const updated = await db('salary_structures').where('id', existing.id).first();
      return res.json({ success: true, data: updated });
    }

    let insertedId: number | null = null;

    try {
      const [id] = await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        employee_id: employeeId || null,
        structure_name: sName,
        structure_code: sCode,
        cycle_id: finalCycleId || null,
        slab_id: slabIdFromBody || null,
        effective_from: effectiveFromDate,
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
        basic_monthly: baseSalary !== undefined ? baseSalary : 0,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
        gross_monthly: grossSalary !== undefined ? grossSalary : 0,
        total_deductions: totalDeductions !== undefined ? totalDeductions : 0,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
        net_take_home: netSalary !== undefined ? netSalary : 0,
        earnings_breakup: earningsBreakupJson,
        deductions_breakup: deductionsBreakupJson,
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
          company_id: numericCompanyId,
          structure_name: sName,
          structure_code: sCode,
          annual_ctc: annualCtc !== undefined ? annualCtc : 0,
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          effective_from: effectiveFromDate,
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

    if (insertedId) {
      try {
        const salComp = await db('salary_components').first().catch(() => null);
        if (salComp?.id) {
          await db('salary_structure_components').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            company_id: numericCompanyId,
            structure_id: insertedId,
            component_id: salComp.id,
            sort_order: 1,
            created_by: validUserId,
            updated_by: validUserId
          });
        }
      } catch (e) { }
    }

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

  async calculateStructurePreview(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 0);
      const { ctc, grossMonthly, slabId, cycleId, companyId, employeeId, effectiveFrom } = req.body;

      if (!this.payrollService) {
        this.payrollService = new PayrollService();
      }

      const result = await this.payrollService.calculateDynamicSalaryStructure({
        orgId,
        companyId: companyId ? Number(companyId) : (req.ctx?.companyId ? Number(req.ctx.companyId) : null),
        employeeId: employeeId ? Number(employeeId) : null,
        ctc: ctc ? Number(ctc) : undefined,
        grossMonthly: grossMonthly ? Number(grossMonthly) : undefined,
        slabId: slabId ? Number(slabId) : null,
        cycleId: cycleId ? Number(cycleId) : null,
        effectiveFrom
      });

      res.json({ success: true, data: result });
    } catch (e: any) {
      console.error('calculateStructurePreview error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error calculating structure preview' });
    }
  }

  async updateStructure(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || firstOrg?.id || null;

    const employeeId = req.body.employeeId ?? req.body.employee_id;
    const structureName = req.body.structureName || req.body.slab || req.body.name || req.body.structure_name;
    const baseSalary = req.body.baseSalary ?? req.body.basic_monthly ?? req.body.basicMonthly;
    const grossSalary = req.body.grossSalary ?? req.body.gross_monthly ?? req.body.grossMonthly;
    const netSalary = req.body.netSalary ?? req.body.net_salary_monthly ?? req.body.net_take_home ?? req.body.netTakeHome;
    const annualCtc = req.body.annualCtc ?? req.body.annual_ctc;
    const hraMonthly = req.body.hraMonthly ?? req.body.hra_monthly;
    const specialAllowanceMonthly = req.body.specialAllowanceMonthly ?? req.body.standard_allowance_monthly ?? req.body.special_allowance_monthly;
    const pfDeduction = req.body.pfDeduction ?? req.body.pf_deduction;
    const esiDeduction = req.body.esiDeduction ?? req.body.esic_deduction ?? req.body.esi_deduction;
    const tdsDeduction = req.body.tdsDeduction ?? req.body.tds_deduction;
    const totalDeductions = req.body.totalDeductions ?? req.body.total_deductions;
    const customComponents = req.body.customComponents ?? req.body.custom_components;
    const earningsBreakup = req.body.earningsBreakup ?? req.body.earnings_breakup;
    const deductionsBreakup = req.body.deductionsBreakup ?? req.body.deductions_breakup;
    const cycleId = req.body.cycleId ?? req.body.cycle_id;
    const slabId = req.body.slabId ?? req.body.slab_id;
    const companyId = req.body.companyId ?? req.body.company_id;
    const effectiveFrom = req.body.effectiveFrom ?? req.body.effective_from;

    const cycleIdVal = cycleId ? Number(cycleId) : null;
    const slabIdVal = slabId ? Number(slabId) : null;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const earningsBreakupJson = earningsBreakup
      ? (typeof earningsBreakup === 'string' ? earningsBreakup : JSON.stringify(earningsBreakup))
      : undefined;

    const deductionsBreakupJson = deductionsBreakup
      ? (typeof deductionsBreakup === 'string' ? deductionsBreakup : JSON.stringify(deductionsBreakup))
      : undefined;

    const firstUser = await db('users').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id || null);

    let targetStruct = await db('salary_structures')
      .where('id', id)
      .first()
      .catch(() => null);

    if (!targetStruct) {
      targetStruct = await db('salary_structures')
        .where('employee_id', id)
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .first()
        .catch(() => null);
    }

    if (!targetStruct && structureName) {
      targetStruct = await db('salary_structures')
        .where({ structure_name: structureName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    let actualStructId: any = targetStruct ? targetStruct.id : null;
    const ts: any = withSnakeAliases(targetStruct) || {};

    const sName = structureName || ts.structure_name || 'Standard Salary Structure';
    const sCode = req.body.structureCode || req.body.structure_code || ts.structure_code || `STR-${sName.slice(0, 3).toUpperCase()}-${Date.now()}`;

    // Validate cycleId against database to ensure foreign key integrity
    let finalCycleId: number | null = null;
    const candidateCycle = cycleIdVal || ts.cycle_id || (slabIdVal ? (await db('payroll_slabs').where('id', slabIdVal).first().catch(() => null))?.cycle_id : null);
    if (candidateCycle) {
      const cycleRow = await db('payroll_cycles').where('id', candidateCycle).first().catch(() => null);
      if (cycleRow) finalCycleId = Number(candidateCycle);
    }
    if (!finalCycleId && (companyId || ts.company_id)) {
      const targetComp = companyId ? Number(companyId) : ts.company_id;
      const compCycle = await db('payroll_cycles').where('company_id', targetComp).whereNull('deleted_at').first().catch(() => null);
      if (compCycle) finalCycleId = compCycle.id;
    }
    if (!finalCycleId) {
      const activeCycle = await db('payroll_cycles')
        .where(function (this: any) {
          if (orgId) this.where('organization_id', orgId);
        })
        .whereNull('deleted_at')
        .orderBy('is_current_cycle', 'desc')
        .first()
        .catch(() => null);
      if (activeCycle) finalCycleId = activeCycle.id;
    }

    // Validate slabId against database
    let finalSlabId: number | null = null;
    const candidateSlab = slabIdVal || ts.slab_id;
    if (candidateSlab) {
      const slabRow = await db('payroll_slabs').where('id', candidateSlab).first().catch(() => null);
      if (slabRow) finalSlabId = Number(candidateSlab);
    }

    if (!actualStructId) {
      try {
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: companyId ? Number(companyId) : null,
          employee_id: employeeId || null,
          cycle_id: finalCycleId,
          slab_id: finalSlabId,
          structure_name: sName,
          structure_code: sCode,
          effective_from: effectiveFrom || new Date().toISOString().slice(0, 10),
          annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
          special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          total_deductions: totalDeductions !== undefined ? totalDeductions : 0,
          pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
          esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
          tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          earnings_breakup: earningsBreakupJson || null,
          deductions_breakup: deductionsBreakupJson || null,
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
          structure_code: sCode,
          cycle_id: finalCycleId,
          slab_id: finalSlabId,
          effective_from: effectiveFrom || new Date().toISOString().slice(0, 10)
        });
        actualStructId = insertedId;
      }
    } else {
      try {
        const updatePayload: any = {
          structure_name: sName,
          structure_code: sCode,
          updated_by: validUserId,
          updated_at: new Date()
        };

        if (finalCycleId !== null) updatePayload.cycle_id = finalCycleId;
        if (finalSlabId !== null) updatePayload.slab_id = finalSlabId;
        if (employeeId !== undefined) updatePayload.employee_id = employeeId;
        if (companyId !== undefined && companyId !== null) updatePayload.company_id = Number(companyId);
        if (effectiveFrom !== undefined) updatePayload.effective_from = effectiveFrom;
        if (annualCtc !== undefined) updatePayload.annual_ctc = annualCtc;
        else if (grossSalary !== undefined) updatePayload.annual_ctc = Number(grossSalary) * 12;
        if (baseSalary !== undefined) updatePayload.basic_monthly = baseSalary;
        if (hraMonthly !== undefined) updatePayload.hra_monthly = hraMonthly;
        if (specialAllowanceMonthly !== undefined) updatePayload.special_allowance_monthly = specialAllowanceMonthly;
        if (grossSalary !== undefined) updatePayload.gross_monthly = grossSalary;
        if (totalDeductions !== undefined) updatePayload.total_deductions = totalDeductions;
        if (pfDeduction !== undefined) updatePayload.pf_deduction = pfDeduction;
        if (esiDeduction !== undefined) updatePayload.esi_deduction = esiDeduction;
        if (tdsDeduction !== undefined) updatePayload.tds_deduction = tdsDeduction;
        if (netSalary !== undefined) updatePayload.net_take_home = netSalary;
        if (earningsBreakupJson !== undefined) updatePayload.earnings_breakup = earningsBreakupJson;
        if (deductionsBreakupJson !== undefined) updatePayload.deductions_breakup = deductionsBreakupJson;

        await db('salary_structures')
          .where('id', actualStructId)
          .update(updatePayload);
      } catch (err: any) {
        console.error('[updateStructure] Update failed:', err.message);
        res.status(400).json({ success: false, message: 'Failed to update salary structure: ' + err.message });
        return;
      }
    }

    if (actualStructId) {
      try {
        const existingComp = await db('salary_structure_components')
          .where('structure_id', actualStructId)
          .first()
          .catch(() => null);

        const targetOrgId = ts.organization_id || orgId;

        if (existingComp) {
          await db('salary_structure_components').where('id', existingComp.id).update({
            updated_by: validUserId,
            updated_at: new Date()
          });
        } else {
          const salComp = await db('salary_components').first().catch(() => null);
          if (salComp?.id) {
            await db('salary_structure_components').insert({
              uuid: uuidv4(),
              organization_id: targetOrgId,
              company_id: companyId ? Number(companyId) : null,
              structure_id: actualStructId,
              component_id: salComp.id,
              sort_order: 1,
              created_by: validUserId,
              updated_by: validUserId
            });
          }
        }
      } catch (e) { }
    }

    const updated = await db('salary_structures')
      .where('id', actualStructId)
      .first();

    res.json({ success: true, data: updated });
  }

  async getAttendanceCalendar(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx;
    const empId = parseInt(req.query.employeeId as string);
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');
    if (!empId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, startDate and endDate are required' } });
    }

    const dateKey = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
      }
      return String(v).slice(0, 10);
    };

    const emp: any = await db('employees').where('id', empId).first().catch(() => null);
    const empName = emp ? `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() : `Employee #${empId}`;

    const shiftAssign = await db('employee_shift_assignments as esa')
      .leftJoin('shift_templates as st', 'esa.shift_id', 'st.id')
      .where({ 'esa.employee_id': empId, 'esa.is_current': true })
      .whereNull('esa.deleted_at')
      .select('st.name as shift_name')
      .first()
      .catch(() => null);
    const shiftName = (shiftAssign as any)?.shiftName || (shiftAssign as any)?.shift_name || 'Unassigned';

    const records = await db('attendance_records')
      .where('employee_id', empId)
      .whereBetween('check_in_date', [startDate, endDate])
      .whereNull('deleted_at')
      .select('check_in_date', 'status')
      .catch(() => []);
    const recordsByDate = new Map<string, string>();
    for (const r of records as any[]) recordsByDate.set(dateKey(r.checkInDate || r.check_in_date), r.status);

    const holidays = await db('holidays')
      .where('organization_id', ctx.organizationId)
      .whereBetween('holiday_date', [startDate, endDate])
      .whereNull('deleted_at')
      .select('holiday_date')
      .catch(() => []);
    const holidaySet = new Set((holidays as any[]).map((h) => dateKey(h.holidayDate || h.holiday_date)));

    const leaves = await db('leave_applications')
      .where('employee_id', empId)
      .where('status', 'approved')
      .where('application_start_date', '<=', endDate)
      .where('application_end_date', '>=', startDate)
      .select('application_start_date', 'application_end_date')
      .catch(() => []);
    const leaveRanges = leaves.map((l: any) => ({
      start: dateKey(l.applicationStartDate || l.application_start_date),
      end: dateKey(l.applicationEndDate || l.application_end_date)
    }));

    const STATUS_LABELS: Record<string, string> = {
      present: 'Present', absent: 'Absent', half_day: 'Half Day', work_from_home: 'Work From Home',
      on_leave: 'Paid Leave', holiday: 'Holiday', weekly_off: 'Weekend', sick: 'Sick Leave'
    };

    const days: Array<{ date: string; dayName: string; shift: string; dayStatus: string }> = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    while (cursor <= last) {
      const key = dateKey(cursor);
      const dow = cursor.getDay();
      const recordStatus = recordsByDate.get(key);

      let dayStatus: string;
      if (recordStatus) {
        dayStatus = STATUS_LABELS[recordStatus] || recordStatus;
      } else if (holidaySet.has(key)) {
        dayStatus = 'Holiday';
      } else if (dow === 0 || dow === 6) {
        dayStatus = 'Weekend';
      } else if (leaveRanges.some((r: any) => key >= r.start && key <= r.end)) {
        dayStatus = 'Paid Leave';
      } else {
        dayStatus = 'Unpaid Day';
      }

      days.push({
        date: key,
        dayName: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
        shift: shiftName,
        dayStatus
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ success: true, data: { employeeId: empId, employeeName: empName, startDate, endDate, days } });
  }

  async assignStructureToEmployee(req: Request, res: Response) {
    const db = getKnex();
    const { employeeId, structureId, structureName } = req.body;
    const slabIdFromBody = req.body.slabId || req.body.slab_id || null;

    const firstOrg = await db('organizations').first().catch(() => null);
    const empRow = employeeId ? await db('employees').where('id', employeeId).first().catch(() => null) : null;
    const targetOrgId = empRow?.organization_id || req.ctx.organizationId || firstOrg?.id || null;

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? null);

    let structRow = null;
    if (employeeId) {
      structRow = await db('salary_structures')
        .where({ employee_id: employeeId, organization_id: targetOrgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }
    if (!structRow && structureId) {
      structRow = await db('salary_structures').where('id', structureId).first().catch(() => null);
    }
    if (!structRow && structureName && !employeeId) {
      structRow = await db('salary_structures')
        .where({ organization_id: targetOrgId, structure_name: structureName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    const reqGross = req.body.grossSalary || req.body.gross_monthly || req.body.grossMonthly;
    const reqCtc = req.body.annualCtc || req.body.annual_ctc || (reqGross ? reqGross * 12 : undefined);
    const reqBasic = req.body.baseSalary || req.body.basic_monthly || req.body.basicMonthly || (reqGross ? Math.round(reqGross * 0.5) : undefined);
    const reqNet = req.body.netSalary || req.body.net_take_home || req.body.netTakeHome;
    const effectiveFromVal = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    let resolvedStructureName = structureName;
    if (!structRow && !resolvedStructureName && (slabIdFromBody || reqCtc !== undefined) && employeeId) {
      const slabRow = slabIdFromBody
        ? await db('payroll_slabs').where('id', slabIdFromBody).first().catch(() => null)
        : null;
      resolvedStructureName = slabRow?.name
        ? `${slabRow.name} - Employee ${employeeId}`
        : `Structure - Employee ${employeeId}`;
    }
    if (!structRow && resolvedStructureName) {
      try {
        const sCode = `STR-${resolvedStructureName.slice(0, 3).toUpperCase()}-${Date.now()}`;
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: targetOrgId,
          employee_id: employeeId || null,
          structure_name: resolvedStructureName,
          structure_code: sCode,
          slab_id: slabIdFromBody,
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

    const sId = structRow ? structRow.id : null;

    if (employeeId && sId) {
      const updatePayload: any = { employee_id: employeeId, effective_from: effectiveFromVal };
      if (slabIdFromBody) updatePayload.slab_id = slabIdFromBody;
      if (reqGross !== undefined) updatePayload.gross_monthly = reqGross;
      if (reqCtc !== undefined) updatePayload.annual_ctc = reqCtc;
      if (reqBasic !== undefined) updatePayload.basic_monthly = reqBasic;
      if (reqNet !== undefined) updatePayload.net_take_home = reqNet;

      await db('salary_structures')
        .where('id', sId)
        .update(updatePayload)
        .catch(() => { });

      await db('employee_salary_structures')
        .where({ employee_id: employeeId })
        .update({ is_current: false, effective_to: new Date() })
        .catch(() => { });

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
        await db.raw(
          `INSERT INTO employee_salary_structures (uuid, organization_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [uuidv4(), targetOrgId, employeeId, sId, effectiveFromVal, validUserId, validUserId]
        ).catch(() => { });
      }
    }

    if (!(employeeId && sId)) {
      res.status(400).json({ success: false, message: 'Unable to assign structure: missing employeeId or a resolvable/creatable salary structure' });
      return;
    }

    res.json({ success: true, message: 'Structure successfully assigned to employee in database' });
  }

  async listEmployeeMappings(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId;

    const mappings = await db('salary_structures as ss')
      .join('employees as e', 'ss.employee_id', 'e.id')
      .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
      .where(builder => {
        if (orgId) {
          builder.where(function (this: any) {
            this.where('ss.organization_id', orgId).orWhereNull('ss.organization_id');
          });
        }
      })
      .whereNull('ss.deleted_at')
      .whereNull('e.deleted_at')
      .select(
        'ss.id as mappingId',
        'e.id as empId',
        'e.first_name',
        'e.last_name',
        'e.employee_code as employeeCode',
        'e.email',
        'ss.id as structureId',
        'ss.slab_id as slabId',
        'ss.effective_from as effectiveFrom',
        db.raw('COALESCE(ps.name, ss.structure_name, "Standard Monthly Slab") as structureName'),
        db.raw('COALESCE(ps.name, ss.structure_name, "Standard Monthly Slab") as slabName'),
        'ss.gross_monthly as grossMonthly',
        'ss.annual_ctc as annualCtc',
        'ss.net_take_home as netTakeHome'
      )
      .orderBy('ss.id', 'desc')
      .catch(() => []);

    res.json({ success: true, data: mappings });
  }

  async bulkAssignSlabs(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx;
    const orgId = ctx.organizationId;
    const validUserId = ctx.userId || null;

    const items: any[] = Array.isArray(req.body.assignments)
      ? req.body.assignments
      : Array.isArray(req.body.rows)
        ? req.body.rows
        : [];

    if (items.length === 0) {
      res.status(400).json({ success: false, message: 'No assignments provided' });
      return;
    }

    let successCount = 0;
    const errors: { row: number; employeeCode?: string; email?: string; message: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] || {};
      const employeeCode = item.employeeCode || item.employee_code;
      const email = item.email;
      try {
        const slabId = item.slabId || item.slab_id;
        if (!slabId) throw new Error('Missing slabId');
        const annualCtc = Number(item.annualCtc ?? item.annual_ctc ?? 0);

        let empRow = null;
        const targetEmpId = item.employeeId || item.employee_id || item.id;
        if (targetEmpId) {
          empRow = await db('employees').where('id', targetEmpId).whereNull('deleted_at').first();
        }
        if (!empRow && employeeCode) {
          empRow = await db('employees')
            .where(builder => {
              builder.where('employee_code', employeeCode);
              if (orgId) builder.orWhere({ organization_id: orgId, employee_code: employeeCode });
            })
            .whereNull('deleted_at')
            .first();
        }
        if (!empRow && email) {
          empRow = await db('employees').whereRaw('LOWER(email) = ?', [String(email).toLowerCase()]).whereNull('deleted_at').first();
        }
        if (!empRow) throw new Error(`Employee not found (id=${targetEmpId || '-'}, code=${employeeCode || '-'}, email=${email || '-'})`);

        const employeeId = empRow.id;
        const slabRow = await db('payroll_slabs').where('id', slabId).first();
        const effectiveFromVal = item.effectiveFrom || item.effective_from || new Date().toISOString().slice(0, 10);

        let calculatedBreakup: any = null;
        try {
          calculatedBreakup = await SalaryCalculationService.calculateSalaryBreakup(ctx, {
            ctc: annualCtc,
            slabId: Number(slabId),
            cycleId: slabRow?.cycle_id,
            employeeId,
            effectiveFrom: effectiveFromVal
          });
        } catch { /* silent fallback */ }

        const grossMonthly = calculatedBreakup?.grossMonthly || (annualCtc > 0 ? Math.round(annualCtc / 12) : 0);
        const basicMonthly = calculatedBreakup?.basicMonthly || Math.round(grossMonthly * 0.5);
        const hraMonthly = calculatedBreakup?.hraMonthly || Math.round(basicMonthly * 0.4);
        const pfDeduction = calculatedBreakup?.pfDeduction || 0;
        const esiDeduction = calculatedBreakup?.esiDeduction || 0;
        const ptDeduction = calculatedBreakup?.ptDeduction || 0;
        const totalDeductions = calculatedBreakup?.totalDeductions || (pfDeduction + esiDeduction + ptDeduction);
        const netTakeHome = calculatedBreakup?.netTakeHome || Math.max(0, grossMonthly - totalDeductions);
        const earningsBreakup = calculatedBreakup?.earningsBreakup ? JSON.stringify(calculatedBreakup.earningsBreakup) : null;
        const deductionsBreakup = calculatedBreakup?.deductionsBreakup ? JSON.stringify(calculatedBreakup.deductionsBreakup) : null;

        let structRow = await db('salary_structures')
          .where({ employee_id: employeeId, organization_id: orgId })
          .whereNull('deleted_at')
          .first();

        const structurePayload = {
          company_id: empRow.company_id || slabRow?.company_id || null,
          slab_id: slabId,
          cycle_id: slabRow?.cycle_id || null,
          structure_name: slabRow?.name || 'Assigned Slab',
          annual_ctc: annualCtc,
          gross_monthly: grossMonthly,
          basic_monthly: basicMonthly,
          hra_monthly: hraMonthly,
          special_allowance_monthly: calculatedBreakup?.specialAllowanceMonthly || 0,
          pf_deduction: pfDeduction,
          esi_deduction: esiDeduction,
          total_deductions: totalDeductions,
          net_take_home: netTakeHome,
          earnings_breakup: earningsBreakup,
          deductions_breakup: deductionsBreakup,
          effective_from: effectiveFromVal,
          updated_by: validUserId
        };

        if (structRow) {
          await db('salary_structures').where('id', structRow.id).update(structurePayload);
        } else {
          const sCode = `STR-${(slabRow?.name || 'SLAB').slice(0, 3).toUpperCase()}-${Date.now()}-${employeeId}`;
          const [insertedId] = await db('salary_structures').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            company_id: empRow.company_id || slabRow?.company_id || null,
            employee_id: employeeId,
            structure_name: slabRow?.name || 'Assigned Slab',
            structure_code: sCode,
            status: 'active',
            created_by: validUserId,
            ...structurePayload
          });
          structRow = { id: insertedId };
        }

        await db('employee_salary_structures')
          .where({ employee_id: employeeId, is_current: true })
          .update({ is_current: false, effective_to: new Date() });

        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: structRow.id,
          effective_from: effectiveFromVal,
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });

        successCount++;
      } catch (e: any) {
        errors.push({ row: i + 1, employeeCode, email, message: e.message || 'Assignment failed' });
      }
    }

    res.json({
      success: true,
      message: errors.length === 0 ? 'Slabs assigned successfully' : `Assigned ${successCount} of ${items.length}; ${errors.length} failed`,
      summary: { total: items.length, successCount, failCount: errors.length, errors }
    });
  }
}
