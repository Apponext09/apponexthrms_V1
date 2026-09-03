/**
 * PayrollCycleService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD operations for payroll_cycles.
 * Extracted from PayrollService.ts — zero logic changes.
 */

import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class PayrollCycleService {
  async getCycles(ctx: TenantContext) {
    const db = getKnex();
    const orgId = ctx.organizationId || 1;

    const cycles = await db('payroll_cycles')
      .where((b) => {
        b.where('organization_id', orgId).orWhereNull('organization_id');
      })
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    return cycles || [];
  }

  async createCycle(ctx: TenantContext, data: any) {
    const db = getKnex();

    let userId = ctx.userId;
    if (!userId) {
      const user = await db('users').where('organization_id', ctx.organizationId).first('id');
      userId = user?.id || 1;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const lastDayNum = new Date(year, month + 1, 0).getDate();
    const firstDay = `${year}-${pad2(month + 1)}-01`;
    const lastDay = `${year}-${pad2(month + 1)}-${pad2(lastDayNum)}`;

    const cycleName = data.cycle_name || data.name || 'Monthly';
    const frequency = data.frequency || 'Monthly';
    const startDate = Number(data.start_date ?? 1);
    const cutoffDay = Number(data.cutoff_day ?? 25);
    const disbursementDate = Number(data.disbursement_date ?? data.salary_credit_date ?? 27);

    const rawType = frequency.toLowerCase().replace(/[^a-z]/g, '');
    const validEnumTypes = ['monthly', 'biweekly', 'weekly', 'fortnightly'];
    const cycleType = validEnumTypes.includes(rawType) ? rawType : 'monthly';

    let totalDaysCalc = data.total_days_calc;
    if (!totalDaysCalc) {
      if (rawType === 'weekly') totalDaysCalc = '7';
      else if (rawType === 'biweekly' || rawType === 'fortnightly') totalDaysCalc = '14';
      else if (rawType === 'semimonthly') totalDaysCalc = '15';
      else totalDaysCalc = String(lastDayNum);
    }

    const targetCompanyId = data.company_id || data.companyId || ctx.companyId;
    const numericCompanyId = (targetCompanyId && !isNaN(Number(targetCompanyId)) && Number(targetCompanyId) > 0)
      ? Number(targetCompanyId)
      : null;

    const cycle: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId || 1,
      company_id: numericCompanyId,
      cycle_name: cycleName,
      cycle_code: data.cycle_code || `CYCLE-${Date.now()}`,
      cycle_type: cycleType,
      frequency,
      start_date: startDate,
      start_date_2: data.start_date_2 ? Number(data.start_date_2) : null,
      start_day: data.start_day || null,
      cutoff_day: cutoffDay,
      cutoff_day_name: data.cutoff_day_name || null,
      month_offset: data.month_offset || 'Current',
      total_days_calc: totalDaysCalc,
      cap_amount: Number(data.cap_amount ?? 1000000),
      is_daily_wages: Boolean(data.is_daily_wages),
      daily_wages_include_paid_holidays: Boolean(data.daily_wages_include_paid_holidays),
      daily_wages_include_week_off: Boolean(data.daily_wages_include_week_off),
      tolerance_enabled: Boolean(data.tolerance_enabled),
      tolerance_minutes: Number(data.tolerance_minutes ?? 15),
      is_active: data.is_active !== false ? 1 : 0,
      cycle_start_date: data.cycle_start_date || firstDay,
      cycle_end_date: data.cycle_end_date || lastDay,
      payroll_run_date: data.payroll_run_date || lastDay,
      salary_credit_date:
        data.salary_credit_date && String(data.salary_credit_date).includes('-')
          ? data.salary_credit_date
          : `${year}-${String(month + 1).padStart(2, '0')}-${String(disbursementDate).padStart(2, '0')}`,
      is_current_cycle: data.is_current_cycle ?? true,
      status: data.is_active === false ? 'closed' : 'open',
      created_by: userId || 1,
      updated_by: userId || 1,
    };

    const [id] = await db('payroll_cycles').insert(cycle);
    return { id, ...cycle };
  }

  async getCycle(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    return db('payroll_cycles').where({ id, organization_id: ctx.organizationId }).first();
  }

  async updateCycle(ctx: TenantContext, id: number | string, data: any) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);
    const cycleName = data.cycle_name || data.name;

    const updateData: any = { updated_at: new Date() };
    if (ctx.userId) updateData.updated_by = ctx.userId;

    if (cycleName) updateData.cycle_name = cycleName;
    if (data.isDailyWages !== undefined || data.is_daily_wages !== undefined) {
      updateData.is_daily_wages = (data.isDailyWages ?? data.is_daily_wages) ? 1 : 0;
    }
    if (
      data.dailyWagesIncludePaidHolidays !== undefined ||
      data.daily_wages_include_paid_holidays !== undefined
    ) {
      updateData.daily_wages_include_paid_holidays = (
        data.dailyWagesIncludePaidHolidays ?? data.daily_wages_include_paid_holidays
      )
        ? 1
        : 0;
    }
    if (
      data.dailyWagesIncludeWeekOff !== undefined ||
      data.daily_wages_include_week_off !== undefined
    ) {
      updateData.daily_wages_include_week_off = (
        data.dailyWagesIncludeWeekOff ?? data.daily_wages_include_week_off
      )
        ? 1
        : 0;
    }
    if (data.frequency !== undefined) {
      updateData.frequency = data.frequency;
      updateData.cycle_type = String(data.frequency).toLowerCase().replace('-', '');
    }
    if (data.startDate !== undefined || data.start_date !== undefined) {
      updateData.start_date = data.startDate ?? data.start_date;
    }
    if (data.cutoffDay !== undefined || data.cutoff_day !== undefined) {
      updateData.cutoff_day = data.cutoffDay ?? data.cutoff_day;
    }
    if (data.monthOffset !== undefined || data.month_offset !== undefined) {
      updateData.month_offset = data.monthOffset ?? data.month_offset;
    }
    if (data.disbursementDate !== undefined || data.disbursement_date !== undefined || data.disbursement_date_str !== undefined) {
      updateData.disbursement_date_str = String(data.disbursement_date_str ?? data.disbursementDate ?? data.disbursement_date);
    }
    if (data.capAmount !== undefined || data.cap_amount !== undefined) {
      updateData.cap_amount = data.capAmount ?? data.cap_amount;
    }
    if (data.toleranceEnabled !== undefined || data.tolerance_enabled !== undefined) {
      updateData.tolerance_enabled = (data.toleranceEnabled ?? data.tolerance_enabled) ? 1 : 0;
    }
    if (data.toleranceMinutes !== undefined || data.tolerance_minutes !== undefined) {
      updateData.tolerance_minutes = data.toleranceMinutes ?? data.tolerance_minutes;
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      const active = data.isActive ?? data.is_active;
      updateData.status = active ? 'open' : 'closed';
    }
    if (data.company_id !== undefined || data.companyId !== undefined || ctx.companyId) {
      const cid = data.company_id || data.companyId || ctx.companyId;
      if (cid && !isNaN(Number(cid)) && Number(cid) > 0) {
        updateData.company_id = Number(cid);
      }
    }

    try {
      let query = db('payroll_cycles');
      if (ctx?.organizationId) {
        query = query.where('organization_id', ctx.organizationId);
      }
      if (!isNaN(numId)) {
        await query.where(function () {
          this.where('id', numId).orWhere('uuid', strId);
        }).update(updateData);
      } else {
        await query.where('uuid', strId).update(updateData);
      }
    } catch (err) {
      console.error('Error updating cycle in DB:', err);
    }

    const updated = await db('payroll_cycles')
      .where(function () {
        if (!isNaN(numId)) this.where('id', numId).orWhere('uuid', strId);
        else this.where('uuid', strId);
      })
      .first();

    if (!updated) {
      return { id: strId, ...data, ...updateData, name: cycleName || data.name };
    }

    const nameVal = updated.cycleName || updated.cycle_name || updated.name || '';
    const isDaily = Boolean(updated.isDailyWages ?? updated.is_daily_wages);
    const incHolidays = Boolean(
      updated.dailyWagesIncludePaidHolidays ?? updated.daily_wages_include_paid_holidays
    );
    const incWeekOff = Boolean(
      updated.dailyWagesIncludeWeekOff ?? updated.daily_wages_include_week_off
    );
    const start = updated.startDate ?? updated.start_date ?? 1;
    const cutoff = updated.cutoffDay ?? updated.cutoff_day ?? 25;
    const offset = updated.monthOffset || updated.month_offset || 'Current';
    const disbursement = updated.disbursementDate ?? updated.disbursement_date ?? 1;
    const cap = updated.capAmount ?? updated.cap_amount ?? 1000000;
    const tolEnabled = Boolean(updated.toleranceEnabled ?? updated.tolerance_enabled);
    const tolMinutes = updated.toleranceMinutes ?? updated.tolerance_minutes ?? 15;
    const active =
      updated.status !== 'closed' &&
      updated.isActive !== false &&
      updated.is_active !== false;

    return {
      ...updated,
      id: String(updated.id || updated.uuid),
      name: nameVal,
      cycle_name: nameVal,
      cycleName: nameVal,
      is_daily_wages: isDaily,
      isDailyWages: isDaily,
      daily_wages_include_paid_holidays: incHolidays,
      dailyWagesIncludePaidHolidays: incHolidays,
      daily_wages_include_week_off: incWeekOff,
      dailyWagesIncludeWeekOff: incWeekOff,
      frequency: updated.frequency || 'Monthly',
      start_date: start,
      startDate: start,
      cutoff_day: cutoff,
      cutoffDay: cutoff,
      month_offset: offset,
      monthOffset: offset,
      disbursement_date: disbursement,
      disbursementDate: disbursement,
      cap_amount: cap,
      capAmount: cap,
      tolerance_enabled: tolEnabled,
      toleranceEnabled: tolEnabled,
      tolerance_minutes: tolMinutes,
      toleranceMinutes: tolMinutes,
      is_active: active,
      isActive: active,
    };
  }

  async deleteCycle(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);
    const orgId = ctx.organizationId || 1;

    try {
      if (!isNaN(numId)) {
        await db('salary_structures').where('cycle_id', numId).update({ cycle_id: null }).catch(() => {});
      }

      let updated = 0;
      if (!isNaN(numId)) {
        updated = await db('payroll_cycles')
          .where('id', numId)
          .where('organization_id', orgId)
          .update({ deleted_at: new Date(), status: 'closed', is_active: false })
          .catch(() => 0);
      }
      if (!updated) {
        updated = await db('payroll_cycles')
          .where('uuid', strId)
          .update({ deleted_at: new Date(), status: 'closed', is_active: false })
          .catch(() => 0);
      }
      if (!updated && !isNaN(numId)) {
        await db('payroll_cycles')
          .where('id', numId)
          .update({ deleted_at: new Date(), status: 'closed', is_active: false })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to delete payroll cycle:', err);
    }
    return { success: true };
  }
}
