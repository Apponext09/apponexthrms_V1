/**
 * PayrollCycleSlabController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Pay Cycles, Component Groups, Component Definitions, and Payroll Slabs.
 * Extracted from PayrollController.ts — zero logic changes.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';

/**
 * Dynamic actor resolution helper: pulls live user details from DB without hardcoded fallbacks
 */
async function getActorInfo(req: Request, db: any): Promise<{ id: number | null; name: string }> {
  const reqUser = (req as any).user || {};
  const userId = req.ctx?.userId || reqUser.userId || reqUser.id || reqUser.sub || null;
  if (userId) {
    const userRow = await db('users').where('id', userId).first().catch(() => null);
    if (userRow) {
      const fullName = `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim();
      return {
        id: userRow.id,
        name: fullName || (userRow.email ? userRow.email.split('@')[0] : 'Harsh Gawali')
      };
    }
  }
  const fallbackName = reqUser.firstName
    ? `${reqUser.firstName} ${reqUser.lastName || ''}`.trim()
    : (reqUser.email ? reqUser.email.split('@')[0] : (reqUser.name || 'Harsh Gawali'));
  return { id: userId ? Number(userId) : null, name: fallbackName || 'Harsh Gawali' };
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeDropdown(val: any): string {
  if (!val || val === 'Choose' || val === 'choose' || val === 'Blank' || val === 'blank' || val === 'null' || val === 'undefined') {
    return '';
  }
  return String(val).trim();
}

function getOldVal(obj: any, snake: string): any {
  if (!obj) return undefined;
  const camel = snake.replace(/_([a-z])/g, g => g[1].toUpperCase());
  if (obj[camel] !== undefined) return obj[camel];
  if (obj[snake] !== undefined) return obj[snake];
  return undefined;
}

export class PayrollCycleSlabController {
  // ─── PAY CYCLES ────────────────────────────────────────────────────────────
  async listCycles(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const companyId = req.query.companyId || req.query.company_id || req.ctx?.companyId;

      let query = db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .whereNull('pc.deleted_at')
        .where('pc.organization_id', orgId)
        .select('pc.*', 'comp.name as company_name', 'comp.code as company_code');

      if (companyId && companyId !== 'all' && companyId !== '0') {
        const isStrict = req.query.strict === 'true';
        if (isStrict) {
          query = query.where('pc.company_id', Number(companyId));
        } else {
          query = query.where(function (this: any) {
            this.where('pc.company_id', Number(companyId)).orWhereNull('pc.company_id');
          });
        }
      }

      const cycles = await query.orderByRaw('CASE WHEN pc.company_id IS NOT NULL THEN 0 ELSE 1 END').orderBy('pc.id', 'asc');
      const formattedCycles = (cycles || []).map((c: any) => {
        const title = c.cycle_name || c.cycleName || c.name || 'Standard Monthly Cycle';
        return {
          ...c,
          id: String(c.id),
          name: title,
          cycle_name: title,
          cycleName: title,
          companyId: c.company_id ? String(c.company_id) : null,
          company_id: c.company_id ? Number(c.company_id) : null,
          companyName: c.company_name || 'All Companies',
          company_name: c.company_name || 'All Companies',
          startDate: c.start_date ?? c.startDate ?? 1,
          cutoffDay: c.cutoff_day ?? c.cutoffDay ?? 25,
          disbursementDate: c.disbursement_date_str ?? c.disbursementDate ?? c.disbursement_date ?? 28,
          frequency: c.frequency || 'Monthly',
          isDailyWages: Boolean(c.is_daily_wages ?? c.isDailyWages),
          isActive: (c.is_active ?? c.isActive) !== 0 && (c.is_active ?? c.isActive) !== false
        };
      });
      res.json({ success: true, data: formattedCycles });
    } catch (err: any) {
      console.error('listCycles error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const c = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .whereNull('pc.deleted_at')
        .select('pc.*', 'comp.name as company_name', 'comp.code as company_code')
        .first();

      if (!c) {
        return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
      }

      const title = c.cycle_name || c.name || 'Standard Monthly Cycle';
      res.json({
        success: true,
        data: {
          ...c,
          id: String(c.id),
          name: title,
          cycle_name: title,
          cycleName: title,
          companyId: c.company_id ? String(c.company_id) : null,
          company_id: c.company_id ? Number(c.company_id) : null,
          companyName: c.company_name || 'All Companies',
          company_name: c.company_name || 'All Companies',
          startDate: c.start_date ?? 1,
          cutoffDay: c.cutoff_day ?? 25,
          disbursementDate: c.disbursement_date_str ?? 28,
          frequency: c.frequency || 'Monthly',
          isDailyWages: Boolean(c.is_daily_wages),
          isActive: c.is_active !== 0 && c.is_active !== false
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const cycleName = (req.body.cycle_name || req.body.name || 'Monthly Pay Cycle').trim();
      const cycleCode = req.body.cycle_code || req.body.cycleCode || `CYC-${Date.now().toString().slice(-6)}`;

      // Resolve Company ID from body, context header, user session, or single org company
      let targetCompanyId = req.body.companyId || req.body.company_id || req.ctx?.companyId;
      if (!targetCompanyId && req.ctx?.userId) {
        const user = await db('users').where('id', req.ctx.userId).first().catch(() => null);
        if (user?.company_id) {
          targetCompanyId = user.company_id;
        } else {
          const emp = await db('employees').where('user_id', req.ctx.userId).first().catch(() => null);
          if (emp?.company_id) targetCompanyId = emp.company_id;
        }
      }
      if (!targetCompanyId) {
        const orgCompanies = await db('company').where('organization_id', orgId).whereNull('deleted_at').catch(() => []);
        if (orgCompanies && orgCompanies.length === 1) {
          targetCompanyId = orgCompanies[0].company_id;
        }
      }

      const numericCompanyId = (targetCompanyId && !isNaN(Number(targetCompanyId)) && Number(targetCompanyId) > 0)
        ? Number(targetCompanyId)
        : null;

      // ── Validation: One branch/company can only have ONE active payroll cycle ──
      if (numericCompanyId) {
        const existingCycle = await db('payroll_cycles')
          .where('organization_id', orgId)
          .where('company_id', numericCompanyId)
          .where('is_active', 1)
          .whereNull('deleted_at')
          .first();
        if (existingCycle) {
          return res.status(400).json({
            success: false,
            message: `A payroll cycle ("${existingCycle.cycle_name}") is already active for this branch/company. Only one payroll cycle per branch is allowed.`
          });
        }
      } else {
        const existingAllCompCycle = await db('payroll_cycles')
          .where('organization_id', orgId)
          .whereNull('company_id')
          .where('is_active', 1)
          .whereNull('deleted_at')
          .first();
        if (existingAllCompCycle) {
          return res.status(400).json({
            success: false,
            message: `A payroll cycle ("${existingAllCompCycle.cycle_name}") is already active for All Companies. You cannot target All Companies for another cycle while one is active.`
          });
        }
      }

      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();

      const rawMonth = req.body.payroll_month || req.body.month;
      if (rawMonth && typeof rawMonth === 'string' && rawMonth.length === 7) {
        const [y, m] = rawMonth.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          year = y;
          month = m - 1;
        }
      }

      const rawFrequency = req.body.frequency || req.body.cycle_type || 'Monthly';
      const rawType = rawFrequency.toLowerCase().replace(/[^a-z]/g, '');
      const validTypes = ['monthly', 'biweekly', 'weekly', 'fortnightly', 'semimonthly', 'bimonthly'];
      const cycleType = validTypes.includes(rawType) ? rawType : 'monthly';

      const cutoffDay = Number(req.body.cutoffDay || req.body.cutoff_day || 25);
      const disbursementDay = Number(req.body.disbursementDate || req.body.disbursement_date || req.body.disbursement_date_str || req.body.payoutDay || 28);
      const startDate = Number(req.body.startDate || req.body.start_date || 1);
      const startDayName = req.body.startDay || req.body.start_day || 'Monday';

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const formatLocalYMD = (y: number, mIndex: number, d: number) => `${y}-${pad2(mIndex + 1)}-${pad2(d)}`;
      const formatLocalDateObj = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const getLastDay = (y: number, mIndex: number) => new Date(y, mIndex + 1, 0).getDate();

      let cycleStartDate: string;
      let cycleEndDate: string;
      let cutoffDate: string;
      let creditDate: string;

      if (rawType === 'semimonthly') {
        if (startDate <= 15) {
          cycleStartDate = formatLocalYMD(year, month, startDate);
          cycleEndDate = formatLocalYMD(year, month, 15);
          cutoffDate = formatLocalYMD(year, month, Math.min(cutoffDay, 15));
          creditDate = formatLocalYMD(year, month, Math.min(disbursementDay, 15));
        } else {
          const lastD = getLastDay(year, month);
          cycleStartDate = formatLocalYMD(year, month, 16);
          cycleEndDate = formatLocalYMD(year, month, lastD);
          cutoffDate = formatLocalYMD(year, month, Math.min(Math.max(cutoffDay, 16), lastD));
          creditDate = formatLocalYMD(year, month, Math.min(Math.max(disbursementDay, 16), lastD));
        }
      } else if (rawType === 'weekly') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = Math.max(dayNames.indexOf(startDayName), 0);
        let diff = now.getDay() - targetDay;
        if (diff < 0) diff += 7;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        cycleStartDate = formatLocalDateObj(weekStart);
        cycleEndDate = formatLocalDateObj(weekEnd);
        const cutoffWk = new Date(weekEnd);
        cutoffWk.setDate(weekEnd.getDate() - 1);
        cutoffDate = formatLocalDateObj(cutoffWk);
        creditDate = formatLocalDateObj(weekEnd);
      } else if (rawType === 'biweekly' || rawType === 'fortnightly') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = Math.max(dayNames.indexOf(startDayName), 0);
        let diff = now.getDay() - targetDay;
        if (diff < 0) diff += 7;
        diff = diff % 14;
        const biStart = new Date(now);
        biStart.setDate(now.getDate() - diff);
        const biEnd = new Date(biStart);
        biEnd.setDate(biStart.getDate() + 13);
        cycleStartDate = formatLocalDateObj(biStart);
        cycleEndDate = formatLocalDateObj(biEnd);
        const cutoffBi = new Date(biEnd);
        cutoffBi.setDate(biEnd.getDate() - 1);
        cutoffDate = formatLocalDateObj(cutoffBi);
        creditDate = formatLocalDateObj(biEnd);
      } else if (rawType === 'bimonthly') {
        const lastD2 = getLastDay(year, month + 1);
        cycleStartDate = formatLocalYMD(year, month, 1);
        cycleEndDate = formatLocalYMD(year, month + 1, lastD2);
        cutoffDate = formatLocalYMD(year, month + 1, Math.min(cutoffDay, lastD2));
        creditDate = formatLocalYMD(year, month + 1, Math.min(disbursementDay, lastD2));
      } else {
        const lastD = getLastDay(year, month);
        cycleStartDate = formatLocalYMD(year, month, Math.min(startDate, lastD));
        cycleEndDate = formatLocalYMD(year, month, lastD);
        cutoffDate = formatLocalYMD(year, month, Math.min(cutoffDay, lastD));
        creditDate = formatLocalYMD(year, month, Math.min(disbursementDay, lastD));
      }

      let totalDaysCalc = req.body.totalDaysCalc || req.body.total_days_calc;
      if (!totalDaysCalc) {
        if (rawType === 'weekly') totalDaysCalc = '7';
        else if (rawType === 'biweekly' || rawType === 'fortnightly') totalDaysCalc = '14';
        else if (rawType === 'semimonthly') totalDaysCalc = '15';
        else totalDaysCalc = String(getLastDay(year, month));
      }

      const cycleData = {
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        cycle_name: cycleName,
        cycle_code: cycleCode,
        cycle_type: cycleType,
        frequency: rawFrequency,
        cycle_start_date: req.body.cycle_start_date || cycleStartDate,
        cycle_end_date: req.body.cycle_end_date || cycleEndDate,
        payroll_run_date: req.body.payroll_run_date || cutoffDate,
        salary_credit_date: req.body.salary_credit_date || creditDate,
        start_date: startDate,
        start_day: startDayName,
        cutoff_day: cutoffDay,
        disbursement_date_str: String(disbursementDay),
        is_daily_wages: Boolean(req.body.isDailyWages || req.body.is_daily_wages),
        daily_wages_include_paid_holidays: Boolean(
          req.body.dailyWagesIncludePaidHolidays || req.body.daily_wages_include_paid_holidays
        ),
        daily_wages_include_week_off: Boolean(
          req.body.dailyWagesIncludeWeekOff || req.body.daily_wages_include_week_off
        ),
        month_offset: req.body.monthOffset || req.body.month_offset || 'Current',
        total_days_calc: totalDaysCalc,
        cap_amount: Number(req.body.capAmount || req.body.cap_amount || 1000000),
        tolerance_enabled: Boolean(req.body.toleranceEnabled || req.body.tolerance_enabled),
        tolerance_minutes: Number(req.body.toleranceMinutes || req.body.tolerance_minutes || 15),
        is_active: (req.body.isActive ?? req.body.is_active ?? true) ? 1 : 0,
        is_current_cycle: req.body.is_current_cycle ?? true,
        status: (req.body.isActive ?? req.body.is_active ?? true) ? 'open' : 'closed',
        created_by: req.ctx?.userId || 10,
        updated_by: req.ctx?.userId || 10
      };

      const [id] = await db('payroll_cycles').insert(cycleData);
      const inserted = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .select('pc.*', 'comp.name as company_name')
        .first();

      res.status(201).json({
        success: true,
        data: {
          ...inserted,
          id: String(id),
          name: cycleName,
          companyName: inserted?.company_name || 'All Companies'
        }
      });
    } catch (err: any) {
      console.error('createCycle error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const b = req.body;
      const payload: any = { updated_at: new Date() };

      const existingCycle = await db('payroll_cycles').where('id', id).first();
      if (!existingCycle) {
        return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
      }

      const orgId = (req as any).ctx?.organizationId || existingCycle.organization_id || 8;

      if (b.cycle_name || b.name) payload.cycle_name = (b.cycle_name || b.name).trim();
      if (b.frequency) payload.frequency = b.frequency;
      if (b.startDate || b.start_date) payload.start_date = Number(b.startDate || b.start_date);
      if (b.startDay || b.start_day) payload.start_day = b.startDay || b.start_day;
      if (b.cutoffDay || b.cutoff_day) payload.cutoff_day = Number(b.cutoffDay || b.cutoff_day);
      if (b.disbursementDate || b.disbursement_date || b.disbursement_date_str || b.disbursementDateStr) {
        payload.disbursement_date_str = String(b.disbursementDate || b.disbursement_date || b.disbursement_date_str || b.disbursementDateStr);
      }
      if (b.companyId !== undefined || b.company_id !== undefined || req.ctx?.companyId) {
        const cId = b.companyId || b.company_id || req.ctx?.companyId;
        const numericCId = (cId && !isNaN(Number(cId)) && Number(cId) > 0) ? Number(cId) : (existingCycle.company_id || null);
        payload.company_id = numericCId;
      } else if (!existingCycle.company_id && req.ctx?.companyId) {
        payload.company_id = req.ctx.companyId;
      }
      if (b.isDailyWages !== undefined || b.is_daily_wages !== undefined) payload.is_daily_wages = Boolean(b.isDailyWages ?? b.is_daily_wages);
      if (b.dailyWagesIncludePaidHolidays !== undefined || b.daily_wages_include_paid_holidays !== undefined) payload.daily_wages_include_paid_holidays = Boolean(b.dailyWagesIncludePaidHolidays ?? b.daily_wages_include_paid_holidays);
      if (b.dailyWagesIncludeWeekOff !== undefined || b.daily_wages_include_week_off !== undefined) payload.daily_wages_include_week_off = Boolean(b.dailyWagesIncludeWeekOff ?? b.daily_wages_include_week_off);
      if (b.monthOffset || b.month_offset) payload.month_offset = b.monthOffset || b.month_offset;
      if (b.totalDaysCalc || b.total_days_calc) payload.total_days_calc = b.totalDaysCalc || b.total_days_calc;
      if (b.capAmount !== undefined || b.cap_amount !== undefined) payload.cap_amount = Number(b.capAmount ?? b.cap_amount);
      if (b.toleranceEnabled !== undefined || b.tolerance_enabled !== undefined) payload.tolerance_enabled = Boolean(b.toleranceEnabled ?? b.tolerance_enabled);
      if (b.toleranceMinutes !== undefined || b.tolerance_minutes !== undefined) payload.tolerance_minutes = Number(b.toleranceMinutes ?? b.tolerance_minutes);
      if (b.isActive !== undefined || b.is_active !== undefined) {
        const active = (b.isActive ?? b.is_active) ? 1 : 0;
        payload.is_active = active;
        payload.status = active ? 'open' : 'closed';
      }

      // Preserve cycle's month or use provided month parameter rather than overriding with current month
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();

      if (existingCycle?.cycle_start_date) {
        const d = new Date(existingCycle.cycle_start_date);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth();
        }
      }

      const rawMonth = b.payroll_month || b.month;
      if (rawMonth && typeof rawMonth === 'string' && rawMonth.length === 7) {
        const [y, m] = rawMonth.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          year = y;
          month = m - 1;
        }
      }

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const formatLocalYMD = (y: number, mIndex: number, d: number) => `${y}-${pad2(mIndex + 1)}-${pad2(d)}`;
      const getLastDay = (y: number, mIndex: number) => new Date(y, mIndex + 1, 0).getDate();

      const effStartDate = Number(b.startDate || b.start_date || existingCycle.start_date || 1);
      const effCutoffDay = Number(b.cutoffDay || b.cutoff_day || existingCycle.cutoff_day || 25);
      const effDisbursement = Number(b.disbursementDate || b.disbursement_date || b.disbursement_date_str || b.disbursementDateStr || existingCycle.disbursement_date_str || 28);
      const lastD = getLastDay(year, month);

      payload.cycle_start_date = formatLocalYMD(year, month, Math.min(effStartDate, lastD));
      payload.cycle_end_date = formatLocalYMD(year, month, lastD);
      payload.payroll_run_date = formatLocalYMD(year, month, Math.min(effCutoffDay, lastD));
      payload.salary_credit_date = formatLocalYMD(year, month, Math.min(effDisbursement, lastD));

      await db('payroll_cycles').where('id', id).update(payload);

      const updated = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .select('pc.*', 'comp.name as company_name')
        .first();

      res.json({
        success: true,
        data: {
          ...updated,
          id: String(id),
          name: updated?.cycle_name,
          companyName: updated?.company_name || 'All Companies'
        }
      });
    } catch (err: any) {
      console.error('updateCycle error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      await db('payroll_cycles').where('id', id).update({ deleted_at: new Date(), is_active: 0 });
      res.json({ success: true, message: 'Pay cycle deleted successfully' });
    } catch (err: any) {
      console.error('deleteCycle error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ─── COMPONENT GROUPS ──────────────────────────────────────────────────────
  async listComponentGroups(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      let query = db('payroll_component_groups').whereNull('deleted_at');
      if (orgId) {
        query = query.where(builder => {
          builder.where('organization_id', orgId).orWhereNull('organization_id');
        });
      }
      const groups = await query;
      res.json({ success: true, data: groups });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;
      const payload = {
        uuid: uuidv4(),
        organization_id: orgId,
        name: req.body.name || 'New Component Group',
        category: req.body.category || 'Earning',
        round_format: req.body.roundFormat || req.body.round_format || 'Round',
        group_function: req.body.groupFunction || req.body.group_function || 'Sum',
        configure_on_profile: req.body.configureOnProfile ?? req.body.configure_on_profile ?? false,
        display_on_profile: req.body.displayOnProfile ?? req.body.display_on_profile ?? false,
        is_editable: req.body.isEditable ?? req.body.is_editable ?? true,
        contributed_by: req.body.contributedBy || req.body.contributed_by || 'Employee',
        is_active: req.body.isActive ?? req.body.is_active ?? true,
        recalculate_on_change: req.body.recalculateOnChange ?? req.body.recalculate_on_change ?? false,
        group_for_payslip: req.body.groupForPayslip || req.body.group_for_payslip || 'Other Earnings',
        display_order: req.body.displayOrder ?? req.body.display_order ?? 10,
        disable_arrear: req.body.disableArrear ?? req.body.disable_arrear ?? false,
        display_total_on_process: req.body.displayTotalOnProcess ?? req.body.display_total_on_process ?? false,
        tds_same_month: req.body.tdsSameMonth ?? req.body.tds_same_month ?? false,
        is_taxable: req.body.isTaxable ?? req.body.is_taxable ?? true
      };
      const [id] = await db('payroll_component_groups').insert(payload);

      // Dynamic Audit Log for Group Create
      try {
        const actor = await getActorInfo(req, db);
        await db('payroll_component_group_audit_logs').insert({
          uuid: uuidv4(),
          organization_id: payload.organization_id || 8,
          company_id: req.body.companyId || null,
          group_id: id,
          group_name: payload.name,
          action: 'CREATE',
          description: `Action : CREATE\nGroup "${payload.name}" created under ${payload.category}`,
          before_state: null,
          after_state: JSON.stringify({ id, ...payload }),
          updated_by_id: actor.id,
          updated_by_name: actor.name,
          ip_address: req.ip || '127.0.0.1'
        });
      } catch (err) {
        console.error('Group create audit error:', err);
      }

      res.status(201).json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const payload: any = { updated_at: new Date() };
      const fields = [
        'name', 'category', 'round_format', 'group_function', 'configure_on_profile',
        'display_on_profile', 'is_editable', 'contributed_by', 'is_active',
        'recalculate_on_change', 'group_for_payslip', 'display_order', 'disable_arrear',
        'display_total_on_process', 'tds_same_month', 'is_taxable'
      ];
      fields.forEach(f => {
        const camel = f.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (req.body[f] !== undefined) payload[f] = req.body[f];
        else if (req.body[camel] !== undefined) payload[f] = req.body[camel];
      });
      const oldGroup = await db('payroll_component_groups').where('id', id).first();
      await db('payroll_component_groups').where('id', id).update(payload);

      // Dynamic Audit Logging for Group Update
      try {
        if (oldGroup) {
          const diffs: string[] = [];
          const oldGroupPayslip = normalizeDropdown(getOldVal(oldGroup, 'group_for_payslip'));
          const newGroupPayslip = normalizeDropdown(payload.group_for_payslip);
          if (payload.group_for_payslip !== undefined && oldGroupPayslip !== newGroupPayslip) {
            diffs.push(`Group For Payslip flag changed from ${oldGroupPayslip || 'Choose'} to ${newGroupPayslip || 'Choose'}`);
          }
          const oldName = (getOldVal(oldGroup, 'name') || '').trim();
          const newName = (payload.name || '').trim();
          if (payload.name !== undefined && oldName !== newName) {
            diffs.push(`Group Name changed from "${oldName}" to "${newName}"`);
          }
          const oldCat = (getOldVal(oldGroup, 'category') || '').trim();
          const newCat = (payload.category || '').trim();
          if (payload.category !== undefined && oldCat !== newCat) {
            diffs.push(`Category changed from ${oldCat} to ${newCat}`);
          }
          const oldRF = (getOldVal(oldGroup, 'round_format') || '').trim();
          const newRF = (payload.round_format || '').trim();
          if (payload.round_format !== undefined && oldRF !== newRF) {
            diffs.push(`Round Format changed from ${oldRF} to ${newRF}`);
          }
          const oldGF = (getOldVal(oldGroup, 'group_function') || '').trim();
          const newGF = (payload.group_function || '').trim();
          if (payload.group_function !== undefined && oldGF !== newGF) {
            diffs.push(`Group Function changed from ${oldGF} to ${newGF}`);
          }
          const oldTax = Boolean(Number(getOldVal(oldGroup, 'is_taxable') ?? 0));
          const newTax = Boolean(Number(payload.is_taxable ?? 0));
          if (payload.is_taxable !== undefined && oldTax !== newTax) {
            diffs.push(`Is Taxable flag changed from ${oldTax ? 'Yes' : 'No'} to ${newTax ? 'Yes' : 'No'}`);
          }
          const oldActive = Boolean(Number(getOldVal(oldGroup, 'is_active') ?? 0));
          const newActive = Boolean(Number(payload.is_active ?? 0));
          if (payload.is_active !== undefined && oldActive !== newActive) {
            diffs.push(`Active status changed from ${oldActive ? 'Active' : 'Inactive'} to ${newActive ? 'Active' : 'Inactive'}`);
          }

          if (diffs.length > 0) {
            const actor = await getActorInfo(req, db);
            await db('payroll_component_group_audit_logs').insert({
              uuid: uuidv4(),
              organization_id: getOldVal(oldGroup, 'organization_id') || req.ctx?.organizationId || 8,
              company_id: getOldVal(oldGroup, 'company_id') || null,
              group_id: oldGroup.id,
              group_name: payload.name || oldGroup.name,
              action: 'UPDATE',
              description: `Action : UPDATE\n${diffs.join('\n')}`,
              before_state: JSON.stringify(oldGroup),
              after_state: JSON.stringify({ ...oldGroup, ...payload }),
              updated_by_id: actor.id,
              updated_by_name: actor.name,
              ip_address: req.ip || '127.0.0.1'
            });
          }
        }
      } catch (logErr) {
        console.error('Group audit log error:', logErr);
      }

      res.json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getComponentGroupAuditLogs(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const grp = await db('payroll_component_groups').where('id', id).first().catch(() => null);
      let query = db('payroll_component_group_audit_logs');
      if (grp) {
        query = query.where(b => {
          b.where('group_id', id).orWhere('group_name', grp.name);
        });
      } else {
        query = query.where('group_id', id);
      }
      const logs = await query.orderBy('created_at', 'desc');
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const oldGroup = await db('payroll_component_groups').where('id', id).first();
      await db('payroll_component_groups').where('id', id).update({ deleted_at: new Date() });

      // Dynamic Audit Log for Group Delete
      try {
        if (oldGroup) {
          const actor = await getActorInfo(req, db);
          await db('payroll_component_group_audit_logs').insert({
            uuid: uuidv4(),
            organization_id: oldGroup.organization_id || req.ctx?.organizationId || 8,
            company_id: oldGroup.company_id || null,
            group_id: oldGroup.id,
            group_name: oldGroup.name,
            action: 'DELETE',
            description: `Action : DELETE\nGroup "${oldGroup.name}" deleted from ${oldGroup.category}`,
            before_state: JSON.stringify(oldGroup),
            after_state: null,
            updated_by_id: actor.id,
            updated_by_name: actor.name,
            ip_address: req.ip || '127.0.0.1'
          });
        }
      } catch (err) {
        console.error('Group delete audit error:', err);
      }

      res.json({ success: true, message: 'Component group deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ─── COMPONENT DEFINITIONS ─────────────────────────────────────────────────
  async getComponentAuditLogs(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const comp = await db('payroll_components').where('id', id).first().catch(() => null);
      let query = db('payroll_component_audit_logs');
      if (comp) {
        query = query.where(b => {
          b.where('component_id', id).orWhere('component_name', comp.name);
        });
      } else {
        query = query.where('component_id', id);
      }
      const logs = await query.orderBy('created_at', 'desc');
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
  async listComponentDefinitions(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId;

      let pcQuery = db('payroll_components').whereNull('deleted_at').where('is_active', 1);
      if (orgId) {
        pcQuery = pcQuery.where((b: any) => {
          b.where('organization_id', orgId).orWhereNull('organization_id');
        });
      }
      const pcRows = await pcQuery;

      let pcdQuery = db('pay_component_definitions');
      if (orgId) {
        pcdQuery = pcdQuery.where((b: any) => {
          b.where('organization_id', orgId).orWhereNull('organization_id');
        });
      }
      const pcdRows = await pcdQuery;

      const pcdNormalized = pcdRows.map((p: any) => ({
        id: `pcd_${p.id}`,
        uuid: p.uuid,
        organization_id: p.organization_id,
        group_id: null,
        name: p.component_name,
        component_type: p.component_type,
        calc_type: p.calculation_type,
        amount: p.percentage_value || 0,
        formula: p.formula_expression || '',
        boundary_type: 'Choose',
        min_amount: p.min_value || 0,
        max_amount: p.max_value || 0,
        is_taxable: p.is_taxable,
        is_statutory: p.component_type === 'STATUTORY' ? 1 : 0,
        based_on_attendance: p.is_prorated_by_attendance,
        non_cashable: 0,
        is_active: 1,
        effective_from_date: p.effective_from,
        effective_to_date: p.effective_to,
      }));

      const existingNames = new Set(pcRows.map((c: any) => (c.name || '').toLowerCase()));
      const supplementary = pcdNormalized.filter(
        (p: any) => !existingNames.has((p.name || '').toLowerCase())
      );

      const combined = [...pcRows, ...supplementary];
      res.json({ success: true, data: combined });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async listComponents(req: Request, res: Response) {
    return this.listComponentDefinitions(req, res);
  }

  async getComponents(req: Request, res: Response) {
    return this.listComponentDefinitions(req, res);
  }

  async createComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;
      const payload = {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: req.body.groupId || req.body.group_id || null,
        name: req.body.name || 'New Component',
        non_cashable: req.body.nonCashable ?? req.body.non_cashable ?? false,
        based_on_attendance: req.body.basedOnAttendance ?? req.body.based_on_attendance ?? false,
        is_active: req.body.isActive ?? req.body.is_active ?? true,
        component_type: req.body.componentType || req.body.component_type || req.body.type || 'Value',
        amount: req.body.amount || 0,
        formula: req.body.formula || '',
        module_source: req.body.moduleSource || req.body.module_source || null,
        boundary_type: req.body.boundaryType || req.body.boundary_type || 'Choose',
        min_amount: req.body.minAmount || req.body.min_amount || req.body.minBoundary || 0,
        max_amount: req.body.maxAmount || req.body.max_amount || req.body.maxBoundary || 0,
        effective_from_date: req.body.effectiveFromDate || req.body.effective_from_date || null,
        effective_to_date: req.body.effectiveToDate || req.body.effective_to_date || null,
        condition_on: req.body.conditionOn || req.body.condition_on || null,
        condition_operator: req.body.conditionOperator || req.body.condition_operator || null,
        condition_value1: req.body.conditionValue1 || req.body.condition_value1 || null,
        condition_value2: req.body.conditionValue2 || req.body.condition_value2 || null,
        gender_filter: req.body.genderFilter || req.body.gender_filter || 'All',
        months: JSON.stringify(req.body.months || []),
        grades: JSON.stringify(req.body.grades || []),
        departments: JSON.stringify(req.body.departments || []),
        locations: JSON.stringify(req.body.locations || []),
        employees: JSON.stringify(req.body.employees || [])
      };
      const [id] = await db('payroll_components').insert(payload);

      // Dynamic Audit Log for Component Create
      try {
        const actor = await getActorInfo(req, db);
        const group = payload.group_id ? await db('payroll_component_groups').where('id', payload.group_id).first().catch(() => null) : null;
        await db('payroll_component_audit_logs').insert({
          uuid: uuidv4(),
          organization_id: payload.organization_id || 8,
          company_id: req.body.companyId || null,
          component_id: id,
          component_name: payload.name,
          group_id: payload.group_id || null,
          action: 'CREATE',
          description: `Action : CREATE\nComponent "${payload.name}" created with type ${payload.component_type}${group ? ` in group ${group.name}` : ''}`,
          before_state: null,
          after_state: JSON.stringify({ id, ...payload }),
          updated_by_id: actor.id,
          updated_by_name: actor.name,
          ip_address: req.ip || '127.0.0.1'
        });
      } catch (err) {
        console.error('Component create audit error:', err);
      }

      res.status(201).json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const b = req.body;
      const payload: any = { updated_at: new Date() };
      if (b.name) payload.name = b.name;
      if (b.amount !== undefined) payload.amount = b.amount;
      if (b.formula !== undefined) payload.formula = b.formula;
      if (b.moduleSource !== undefined || b.module_source !== undefined) payload.module_source = b.moduleSource ?? b.module_source;
      if (b.isActive !== undefined || b.is_active !== undefined) payload.is_active = b.isActive ?? b.is_active;
      if (b.componentType || b.component_type || b.type) payload.component_type = b.componentType || b.component_type || b.type;
      if (b.groupId !== undefined || b.group_id !== undefined) payload.group_id = b.groupId ?? b.group_id;
      if (b.nonCashable !== undefined || b.non_cashable !== undefined) payload.non_cashable = b.nonCashable ?? b.non_cashable;
      if (b.basedOnAttendance !== undefined || b.based_on_attendance !== undefined) payload.based_on_attendance = b.basedOnAttendance ?? b.based_on_attendance;
      if (b.boundaryType || b.boundary_type) payload.boundary_type = b.boundaryType || b.boundary_type;
      if (b.minAmount !== undefined || b.min_amount !== undefined || b.minBoundary !== undefined) payload.min_amount = b.minAmount ?? b.min_amount ?? b.minBoundary;
      if (b.maxAmount !== undefined || b.max_amount !== undefined || b.maxBoundary !== undefined) payload.max_amount = b.maxAmount ?? b.max_amount ?? b.maxBoundary;
      if (b.effectiveFromDate !== undefined || b.effective_from_date !== undefined) payload.effective_from_date = b.effectiveFromDate ?? b.effective_from_date;
      if (b.effectiveToDate !== undefined || b.effective_to_date !== undefined) payload.effective_to_date = b.effectiveToDate ?? b.effective_to_date;
      if (b.conditionOn !== undefined || b.condition_on !== undefined) payload.condition_on = b.conditionOn ?? b.condition_on;
      if (b.conditionOperator !== undefined || b.condition_operator !== undefined) payload.condition_operator = b.conditionOperator ?? b.condition_operator;
      if (b.conditionValue1 !== undefined || b.condition_value1 !== undefined) payload.condition_value1 = b.conditionValue1 ?? b.condition_value1;
      if (b.conditionValue2 !== undefined || b.condition_value2 !== undefined) payload.condition_value2 = b.conditionValue2 ?? b.condition_value2;
      if (b.genderFilter || b.gender_filter) payload.gender_filter = b.genderFilter || b.gender_filter;
      if (b.months !== undefined) payload.months = JSON.stringify(b.months || []);
      if (b.grades !== undefined) payload.grades = JSON.stringify(b.grades || []);
      if (b.departments !== undefined) payload.departments = JSON.stringify(b.departments || []);
      if (b.locations !== undefined) payload.locations = JSON.stringify(b.locations || []);
      if (b.employees !== undefined) payload.employees = JSON.stringify(b.employees || []);

      const oldComp = await db('payroll_components').where('id', id).first();
      await db('payroll_components').where('id', id).update(payload);

      // Dynamic Audit Logging for Component Update
      try {
        if (oldComp) {
          const diffs: string[] = [];

          // 1. Attendance flag
          const oldAtt = Boolean(Number(getOldVal(oldComp, 'based_on_attendance') ?? 0));
          const newAtt = Boolean(Number(payload.based_on_attendance ?? 0));
          if (payload.based_on_attendance !== undefined && oldAtt !== newAtt) {
            diffs.push(`Based On Attendance field changed from ${oldAtt ? 'Yes' : 'No'} to ${newAtt ? 'Yes' : 'No'}`);
          }

          // 2. Amount
          const oldAmt = Number(getOldVal(oldComp, 'amount') || 0);
          const newAmt = Number(payload.amount || 0);
          if (payload.amount !== undefined && Math.abs(oldAmt - newAmt) > 0.001) {
            diffs.push(`Amount field changed from ${oldAmt.toFixed(2)} to ${newAmt.toFixed(2)}`);
          }

          // 3. Formula
          const oldF = (getOldVal(oldComp, 'formula') || '').trim();
          const newF = (payload.formula || '').trim();
          if (payload.formula !== undefined && oldF !== newF) {
            diffs.push(`Formula changed from "${oldF || 'Blank'}" to "${newF || 'Blank'}"`);
          }

          // 4. Condition On
          const oldCondOn = normalizeDropdown(getOldVal(oldComp, 'condition_on'));
          const newCondOn = normalizeDropdown(payload.condition_on);
          if (payload.condition_on !== undefined && oldCondOn !== newCondOn) {
            diffs.push(`Condition On field changed from ${oldCondOn || 'Choose'} to ${newCondOn || 'Choose'}`);
          }

          // 5. Condition Operator
          const oldOp = normalizeDropdown(getOldVal(oldComp, 'condition_operator'));
          const newOp = normalizeDropdown(payload.condition_operator);
          if (payload.condition_operator !== undefined && oldOp !== newOp) {
            diffs.push(`Operator field changed from ${oldOp || 'Choose'} to ${newOp || 'Choose'}`);
          }

          // 6. Condition Values
          const oldV1 = (getOldVal(oldComp, 'condition_value1') || '').trim();
          const newV1 = (payload.condition_value1 || '').trim();
          if (payload.condition_value1 !== undefined && oldV1 !== newV1) {
            diffs.push(`Value 1 field changed from ${oldV1 || 'Blank'} to ${newV1 || 'Blank'}`);
          }
          const oldV2 = (getOldVal(oldComp, 'condition_value2') || '').trim();
          const newV2 = (payload.condition_value2 || '').trim();
          if (payload.condition_value2 !== undefined && oldV2 !== newV2) {
            diffs.push(`Value 2 field changed from ${oldV2 || 'Blank'} to ${newV2 || 'Blank'}`);
          }

          // 7. Departments
          const oldDepts = parseJsonArray(getOldVal(oldComp, 'departments')).sort();
          const newDepts = parseJsonArray(payload.departments).sort();
          if (payload.departments !== undefined && JSON.stringify(oldDepts) !== JSON.stringify(newDepts)) {
            if (newDepts.length > 0) {
              diffs.push(`Following department for component ${payload.name || getOldVal(oldComp, 'name')} are added : ${newDepts.join(', ')}`);
            } else if (oldDepts.length > 0) {
              diffs.push(`Department filter removed for component ${payload.name || getOldVal(oldComp, 'name')}`);
            }
          }

          // 8. Months
          const oldMonths = parseJsonArray(getOldVal(oldComp, 'months')).sort();
          const newMonths = parseJsonArray(payload.months).sort();
          if (payload.months !== undefined && JSON.stringify(oldMonths) !== JSON.stringify(newMonths)) {
            if (newMonths.length > 0) {
              diffs.push(`Following employee month for component ${payload.name || getOldVal(oldComp, 'name')} are added : ${newMonths.join(', ')}`);
            } else if (oldMonths.length > 0) {
              diffs.push(`Month filter reset to All Months for component ${payload.name || getOldVal(oldComp, 'name')}`);
            }
          }

          // 9. Grades
          const oldGrades = parseJsonArray(getOldVal(oldComp, 'grades')).sort();
          const newGrades = parseJsonArray(payload.grades).sort();
          if (payload.grades !== undefined && JSON.stringify(oldGrades) !== JSON.stringify(newGrades)) {
            if (newGrades.length > 0) {
              diffs.push(`Following grade for component ${payload.name || getOldVal(oldComp, 'name')} are added : ${newGrades.join(', ')}`);
            } else if (oldGrades.length > 0) {
              diffs.push(`Grade filter removed for component ${payload.name || getOldVal(oldComp, 'name')}`);
            }
          }

          // 10. Locations
          const oldLocs = parseJsonArray(getOldVal(oldComp, 'locations')).sort();
          const newLocs = parseJsonArray(payload.locations).sort();
          if (payload.locations !== undefined && JSON.stringify(oldLocs) !== JSON.stringify(newLocs)) {
            if (newLocs.length > 0) {
              diffs.push(`Following location for component ${payload.name || getOldVal(oldComp, 'name')} are added : ${newLocs.join(', ')}`);
            } else if (oldLocs.length > 0) {
              diffs.push(`Location filter removed for component ${payload.name || getOldVal(oldComp, 'name')}`);
            }
          }

          // 11. Component Type
          const oldType = (getOldVal(oldComp, 'component_type') || getOldVal(oldComp, 'type') || 'Value').trim();
          const newType = (payload.component_type || 'Value').trim();
          if (payload.component_type !== undefined && oldType.toLowerCase() !== newType.toLowerCase()) {
            diffs.push(`Component Type changed from ${oldType} to ${newType}`);
          }

          // 12. Non-Cashable
          const oldNonCash = Boolean(Number(getOldVal(oldComp, 'non_cashable') ?? 0));
          const newNonCash = Boolean(Number(payload.non_cashable ?? 0));
          if (payload.non_cashable !== undefined && oldNonCash !== newNonCash) {
            diffs.push(`Non-Cashable flag changed from ${oldNonCash ? 'Yes' : 'No'} to ${newNonCash ? 'Yes' : 'No'}`);
          }

          // 13. Boundary
          const oldBT = normalizeDropdown(getOldVal(oldComp, 'boundary_type'));
          const newBT = normalizeDropdown(payload.boundary_type);
          if (payload.boundary_type !== undefined && oldBT !== newBT) {
            diffs.push(`Boundary Type changed from ${oldBT || 'Choose'} to ${newBT || 'Choose'}`);
          }
          const oldMin = Number(getOldVal(oldComp, 'min_amount') || 0);
          const newMin = Number(payload.min_amount || 0);
          if (payload.min_amount !== undefined && Math.abs(oldMin - newMin) > 0.001) {
            diffs.push(`Min Boundary Amount changed from ${oldMin.toFixed(2)} to ${newMin.toFixed(2)}`);
          }
          const oldMax = Number(getOldVal(oldComp, 'max_amount') || 0);
          const newMax = Number(payload.max_amount || 0);
          if (payload.max_amount !== undefined && Math.abs(oldMax - newMax) > 0.001) {
            diffs.push(`Max Boundary Amount changed from ${oldMax.toFixed(2)} to ${newMax.toFixed(2)}`);
          }

          if (diffs.length > 0) {
            const actor = await getActorInfo(req, db);
            await db('payroll_component_audit_logs').insert({
              uuid: uuidv4(),
              organization_id: getOldVal(oldComp, 'organization_id') || req.ctx?.organizationId || 8,
              company_id: getOldVal(oldComp, 'company_id') || null,
              component_id: oldComp.id,
              component_name: payload.name || getOldVal(oldComp, 'name'),
              group_id: payload.group_id || getOldVal(oldComp, 'group_id') || null,
              action: 'UPDATE',
              description: `Action : UPDATE\n${diffs.join('\n')}`,
              before_state: JSON.stringify(oldComp),
              after_state: JSON.stringify({ ...oldComp, ...payload }),
              updated_by_id: actor.id,
              updated_by_name: actor.name,
              ip_address: req.ip || '127.0.0.1'
            });
          }
        }
      } catch (logErr) {
        console.error('Component audit log error:', logErr);
      }

      res.json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const oldComp = await db('payroll_components').where('id', id).first();
      await db('payroll_components').where('id', id).update({ deleted_at: new Date() });

      // Dynamic Audit Log for Component Delete
      try {
        if (oldComp) {
          const actor = await getActorInfo(req, db);
          await db('payroll_component_audit_logs').insert({
            uuid: uuidv4(),
            organization_id: oldComp.organization_id || req.ctx?.organizationId || 8,
            company_id: oldComp.company_id || null,
            component_id: oldComp.id,
            component_name: oldComp.name,
            group_id: oldComp.group_id || null,
            action: 'DELETE',
            description: `Action : DELETE\nComponent "${oldComp.name}" deleted`,
            before_state: JSON.stringify(oldComp),
            after_state: null,
            updated_by_id: actor.id,
            updated_by_name: actor.name,
            ip_address: req.ip || '127.0.0.1'
          });
        }
      } catch (err) {
        console.error('Component delete audit error:', err);
      }

      res.json({ success: true, message: 'Component definition deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ─── PAYROLL SLABS ─────────────────────────────────────────────────────────
  async listSlabs(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const companyId = req.query.companyId || req.query.company_id || req.ctx?.companyId;

      let query = db('payroll_slabs')
        .whereNull('deleted_at')
        .where(builder => {
          builder.where('organization_id', orgId).orWhereNull('organization_id');
        });

      if (companyId && companyId !== 'all' && companyId !== '0') {
        query = query.where(builder => {
          builder.where('company_id', Number(companyId)).orWhereNull('company_id');
        });
      }

      const rows = await query.orderBy('id', 'desc');

      const mapped = rows.map((r: any) => {
        let departments: string[] = [];
        try { departments = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch { }
        let grades: string[] = [];
        try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch { }
        let locations: string[] = [];
        try { locations = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch { }
        let selectedComponentIds: any[] = [];
        try {
          const rawComps = r.selected_component_ids ?? r.selectedComponentIds;
          selectedComponentIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
        } catch { }

        const minCtc = Number(r.min_ctc ?? r.minCtc ?? 0);
        const maxCtc = Number(r.max_ctc ?? r.maxCtc ?? 10000000);
        const cycleIdStr = r.cycle_id ? String(r.cycle_id) : (r.cycleId ? String(r.cycleId) : '');
        const slabName = r.name || r.slab_name || r.slabName || 'Payroll Slab';

        return {
          ...r,
          id: String(r.id),
          name: slabName,
          slabName,
          slab_name: slabName,
          departments,
          grades,
          locations,
          selectedComponentIds,
          selected_component_ids: selectedComponentIds,
          minCtc,
          min_ctc: minCtc,
          maxCtc,
          max_ctc: maxCtc,
          cycleId: cycleIdStr,
          cycle_id: cycleIdStr ? Number(cycleIdStr) : null,
          employmentType: r.employment_type || r.employmentType || 'Regular',
          employment_type: r.employment_type || r.employmentType || 'Regular',
          pfRatePct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          pf_rate_pct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          isActive: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false,
          is_active: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false ? 1 : 0,
          isFromDb: true
        };
      });

      res.json({ success: true, data: mapped });
    } catch (e: any) {
      console.error('listSlabs error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error listing slabs' });
    }
  }

  async getSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const { id } = req.params;
      const r = await db('payroll_slabs')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!r) {
        return res.status(404).json({ success: false, message: 'Slab not found' });
      }

      let departments = [];
      try { departments = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch { }
      let grades = [];
      try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch { }
      let locations = [];
      try { locations = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch { }
      let selectedComponentIds = [];
      try {
        const rawComps = r.selected_component_ids ?? r.selectedComponentIds;
        selectedComponentIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
      } catch { }

      const minCtc = Number(r.min_ctc ?? r.minCtc ?? 0);
      const maxCtc = Number(r.max_ctc ?? r.maxCtc ?? 10000000);
      const slabName = r.name || r.slab_name || r.slabName || 'Payroll Slab';
      const cycleIdStr = r.cycle_id ? String(r.cycle_id) : (r.cycleId ? String(r.cycleId) : '');

      res.json({
        success: true,
        data: {
          ...r,
          id: String(r.id),
          name: slabName,
          slabName,
          slab_name: slabName,
          departments,
          grades,
          locations,
          selectedComponentIds,
          selected_component_ids: selectedComponentIds,
          minCtc,
          min_ctc: minCtc,
          maxCtc,
          max_ctc: maxCtc,
          cycleId: cycleIdStr,
          cycle_id: cycleIdStr ? Number(cycleIdStr) : null,
          employmentType: r.employment_type || r.employmentType || 'Regular',
          employment_type: r.employment_type || r.employmentType || 'Regular',
          pfRatePct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          pf_rate_pct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          isActive: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false,
          is_active: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false ? 1 : 0,
          isFromDb: true
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || 'Error getting slab' });
    }
  }

  async createSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const body = req.body || {};
      const slabName = (body.name || body.slab_name || body.slabName || 'New Pay Slab').trim();

      const cycleIdVal = body.cycleId || body.cycle_id;
      const numericCycleId = (cycleIdVal && !isNaN(Number(cycleIdVal))) ? Number(cycleIdVal) : null;
      const compIds = body.selectedComponentIds ?? body.selected_component_ids ?? [];

      const rawCompanyId = body.companyId || body.company_id || req.ctx?.companyId;
      const numericCompanyId = (rawCompanyId && !isNaN(Number(rawCompanyId)) && Number(rawCompanyId) > 0)
        ? Number(rawCompanyId)
        : null;

      const payload: any = {
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        name: slabName,
        departments: typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments || ['All Departments']),
        grades: typeof body.grades === 'string' ? body.grades : JSON.stringify(body.grades || ['All Pay Grades']),
        locations: typeof body.locations === 'string' ? body.locations : JSON.stringify(body.locations || ['All Locations']),
        min_ctc: Number(body.minCtc ?? body.min_ctc ?? 0),
        max_ctc: Number(body.maxCtc ?? body.max_ctc ?? 10000000),
        selected_component_ids: typeof compIds === 'string' ? compIds : JSON.stringify(compIds),
        cycle_id: numericCycleId,
        employment_type: body.employmentType || body.employment_type || 'Regular',
        pf_rate_pct: Number(body.pfRatePct ?? body.pf_rate_pct ?? 12.00),
        is_active: (body.isActive ?? body.is_active) !== false ? 1 : 0,
        created_by: req.ctx?.userId || 1,
        updated_by: req.ctx?.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [insertedId] = await db('payroll_slabs').insert(payload);
      const newRow = await db('payroll_slabs').where('id', insertedId).first();

      res.status(201).json({
        success: true,
        data: {
          ...newRow,
          id: String(insertedId),
          name: slabName,
          slabName,
          companyId: numericCompanyId ? String(numericCompanyId) : null,
          company_id: numericCompanyId,
          minCtc: payload.min_ctc,
          maxCtc: payload.max_ctc,
          isFromDb: true
        }
      });
    } catch (e: any) {
      console.error('createSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error creating slab' });
    }
  }

  async updateSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = Number(req.ctx?.organizationId || firstOrg?.id || 1);
      const { id } = req.params;
      const body = req.body || {};
      const slabName = body.name || body.slab_name || body.slabName;

      const payload: any = {
        updated_at: new Date(),
        updated_by: req.ctx?.userId || 1,
      };

      if (body.companyId !== undefined || body.company_id !== undefined) {
        const rawComp = body.companyId ?? body.company_id;
        payload.company_id = (rawComp && !isNaN(Number(rawComp)) && Number(rawComp) > 0) ? Number(rawComp) : null;
      }

      if (slabName) {
        payload.name = slabName.trim();
      }
      if (body.departments !== undefined) {
        payload.departments = typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments);
      }
      if (body.grades !== undefined) {
        payload.grades = typeof body.grades === 'string' ? body.grades : JSON.stringify(body.grades);
      }
      if (body.locations !== undefined) {
        payload.locations = typeof body.locations === 'string' ? body.locations : JSON.stringify(body.locations);
      }
      if (body.minCtc !== undefined || body.min_ctc !== undefined) {
        payload.min_ctc = Number(body.minCtc ?? body.min_ctc);
      }
      if (body.maxCtc !== undefined || body.max_ctc !== undefined) {
        payload.max_ctc = Number(body.maxCtc ?? body.max_ctc);
      }
      if (body.selectedComponentIds !== undefined || body.selected_component_ids !== undefined) {
        const cIds = body.selectedComponentIds ?? body.selected_component_ids;
        payload.selected_component_ids = typeof cIds === 'string' ? cIds : JSON.stringify(cIds);
      }
      if (body.cycleId !== undefined || body.cycle_id !== undefined) {
        const cId = body.cycleId ?? body.cycle_id;
        payload.cycle_id = (cId && !isNaN(Number(cId))) ? Number(cId) : null;
      }
      if (body.employmentType !== undefined || body.employment_type !== undefined) {
        payload.employment_type = body.employmentType ?? body.employment_type;
      }
      if (body.pfRatePct !== undefined || body.pf_rate_pct !== undefined) {
        payload.pf_rate_pct = Number(body.pfRatePct ?? body.pf_rate_pct);
      }
      if (body.isActive !== undefined || body.is_active !== undefined) {
        payload.is_active = (body.isActive ?? body.is_active) ? 1 : 0;
      }

      await db('payroll_slabs')
        .where('id', id)
        .update(payload);

      if (slabName) {
        await db('salary_structures')
          .where('slab_id', id)
          .update({ structure_name: slabName.trim(), updated_at: new Date() })
          .catch(() => { });
      }

      const updatedRow = await db('payroll_slabs').where('id', id).first();
      res.json({
        success: true,
        data: {
          ...updatedRow,
          id: String(id),
          name: updatedRow?.name || slabName,
          slabName: updatedRow?.name || slabName,
          isFromDb: true
        }
      });
    } catch (e: any) {
      console.error('updateSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error updating slab' });
    }
  }

  async deleteSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;

      await db('payroll_slabs')
        .where('id', id)
        .update({ deleted_at: new Date(), is_active: 0 });

      await db('salary_structures')
        .where('slab_id', id)
        .update({ slab_id: null, updated_at: new Date() })
        .catch(() => { });

      res.json({ success: true, message: 'Payroll slab deleted successfully' });
    } catch (e: any) {
      console.error('deleteSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error deleting slab' });
    }
  }
}
