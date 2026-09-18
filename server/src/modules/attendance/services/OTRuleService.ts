import { v4 as uuidv4 } from 'uuid';
import { OTRuleRepository, type OTRule } from '../repositories/OTRuleRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';
import { logger } from '@/common/lib/logger';

export interface DayConfig {
  calculateOT: {
    beforeShift:            { enabled: boolean; value: number; unit: string };
    afterShift:             { enabled: boolean; value: number; unit: string };
    shiftBound:             boolean;
    irrespectiveBatchHours: { enabled: boolean; value: number; unit: string };
    considerAllAsOT:        boolean;
  };
  deduction: { enabled: boolean; value: number; unit: string };
  pay:        { useFormula: boolean; formula: string; payPerMinMultiplier: number };
}

export class OTRuleService {
  private ruleRepo     = new OTRuleRepository();
  private auditService = new AuditService();

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createRule(ctx: TenantContext, input: Record<string, any>): Promise<OTRule> {
    const rule = await this.ruleRepo.create(ctx, {
      uuid:            uuidv4(),
      rule_name:       input.ruleName || input.rule_name,
      title_change:    input.titleChange || input.title_change || null,
      period:          input.period || 'daily',
      shift_type:      input.shiftType || input.shift_type || 'time_bound',
      daily_max_ot_limit:      input.dailyMaxOtLimit ?? input.daily_max_ot_limit ?? null,
      daily_max_ot_limit_unit: input.dailyMaxOtLimitUnit || input.daily_max_ot_limit_unit || 'hours',
      weekly_max_ot_limit:      input.weeklyMaxOtLimit ?? input.weekly_max_ot_limit ?? null,
      weekly_max_ot_limit_unit: input.weeklyMaxOtLimitUnit || input.weekly_max_ot_limit_unit || 'hours',
      max_limit_priority_json:  input.maxLimitPriorityJson || input.max_limit_priority_json || null,
      auto_ot_approve:          input.autoOtApprove ?? input.auto_ot_approve ?? false,
      auto_approve_min_minutes: input.autoApproveMinMinutes ?? input.auto_approve_min_minutes ?? null,
      auto_approve_max_minutes: input.autoApproveMaxMinutes ?? input.auto_approve_max_minutes ?? null,
      ot_formula_enabled:       input.otFormulaEnabled ?? input.ot_formula_enabled ?? false,
      ot_formula_expression:    input.otFormulaExpression || input.ot_formula_expression || null,
      employee_timing_rounding: input.employeeTimingRounding || input.employee_timing_rounding || 'no_round',
      normal_day_config_json:   typeof input.normalDayConfig === 'object'
        ? JSON.stringify(input.normalDayConfig)
        : input.normal_day_config_json || null,
      holiday_config_json:      typeof input.holidayConfig === 'object'
        ? JSON.stringify(input.holidayConfig)
        : input.holiday_config_json || null,
      weekend_config_json:      typeof input.weekendConfig === 'object'
        ? JSON.stringify(input.weekendConfig)
        : input.weekend_config_json || null,
      is_active:    input.isActive ?? input.is_active ?? true,
      created_by:   ctx.userId,
      updated_by:   ctx.userId,
    });

    await this.auditService.log(ctx, {
      action: 'CREATE_OT_RULE',
      entityType: 'OT_RULE',
      entityId: rule.id,
      afterState: { ruleName: (rule as any).rule_name },
    });
    return rule;
  }

  async updateRule(ctx: TenantContext, id: number, input: Record<string, any>): Promise<OTRule> {
    const updates: Record<string, any> = { updated_by: ctx.userId };

    if (input.ruleName !== undefined) updates.rule_name = input.ruleName;
    if (input.rule_name !== undefined) updates.rule_name = input.rule_name;
    if (input.titleChange !== undefined) updates.title_change = input.titleChange;
    if (input.period !== undefined) updates.period = input.period;
    if (input.shiftType !== undefined) updates.shift_type = input.shiftType;
    if (input.shift_type !== undefined) updates.shift_type = input.shift_type;
    if (input.dailyMaxOtLimit !== undefined) updates.daily_max_ot_limit = input.dailyMaxOtLimit;
    if (input.daily_max_ot_limit !== undefined) updates.daily_max_ot_limit = input.daily_max_ot_limit;
    if (input.dailyMaxOtLimitUnit !== undefined) updates.daily_max_ot_limit_unit = input.dailyMaxOtLimitUnit;
    if (input.weekly_max_ot_limit !== undefined) updates.weekly_max_ot_limit = input.weekly_max_ot_limit;
    if (input.weeklyMaxOtLimit !== undefined) updates.weekly_max_ot_limit = input.weeklyMaxOtLimit;
    if (input.weeklyMaxOtLimitUnit !== undefined) updates.weekly_max_ot_limit_unit = input.weeklyMaxOtLimitUnit;
    if (input.maxLimitPriorityJson !== undefined) updates.max_limit_priority_json = input.maxLimitPriorityJson;
    if (input.autoOtApprove !== undefined) updates.auto_ot_approve = input.autoOtApprove;
    if (input.auto_ot_approve !== undefined) updates.auto_ot_approve = input.auto_ot_approve;
    if (input.autoApproveMinMinutes !== undefined) updates.auto_approve_min_minutes = input.autoApproveMinMinutes;
    if (input.autoApproveMaxMinutes !== undefined) updates.auto_approve_max_minutes = input.autoApproveMaxMinutes;
    if (input.otFormulaEnabled !== undefined) updates.ot_formula_enabled = input.otFormulaEnabled;
    if (input.otFormulaExpression !== undefined) updates.ot_formula_expression = input.otFormulaExpression;
    if (input.employeeTimingRounding !== undefined) updates.employee_timing_rounding = input.employeeTimingRounding;
    if (input.normalDayConfig !== undefined)
      updates.normal_day_config_json = typeof input.normalDayConfig === 'object'
        ? JSON.stringify(input.normalDayConfig) : input.normalDayConfig;
    if (input.holidayConfig !== undefined)
      updates.holiday_config_json = typeof input.holidayConfig === 'object'
        ? JSON.stringify(input.holidayConfig) : input.holidayConfig;
    if (input.weekendConfig !== undefined)
      updates.weekend_config_json = typeof input.weekendConfig === 'object'
        ? JSON.stringify(input.weekendConfig) : input.weekendConfig;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    const rule = await this.ruleRepo.update(ctx, id, updates);
    await this.auditService.log(ctx, {
      action: 'UPDATE_OT_RULE',
      entityType: 'OT_RULE',
      entityId: id,
      afterState: updates,
    });
    return rule;
  }

  async deleteRule(ctx: TenantContext, id: number): Promise<void> {
    const rule = await this.ruleRepo.getById(ctx, id);
    if (!rule) throw new NotFoundError('OT Rule not found');
    await this.ruleRepo.softDelete(ctx, id);
    await this.auditService.log(ctx, {
      action: 'DELETE_OT_RULE',
      entityType: 'OT_RULE',
      entityId: id,
      afterState: { deleted: true },
    });
  }

  async listRules(ctx: TenantContext, opts?: {
    page?: number; limit?: number; search?: string; isActive?: boolean;
  }) {
    return this.ruleRepo.list(ctx, opts);
  }

  async getRule(ctx: TenantContext, id: number): Promise<OTRule & { eligibility: any[] }> {
    const rule = await this.ruleRepo.getById(ctx, id);
    if (!rule) throw new NotFoundError('OT Rule not found');
    const eligibility = await this.ruleRepo.getEligibility(id);
    return { ...rule, eligibility };
  }

  // ── Eligibility ───────────────────────────────────────────────────────────

  async setEligibility(
    ctx: TenantContext,
    ruleId: number,
    items: { entityType: string; entityId: number }[]
  ): Promise<void> {
    const rule = await this.ruleRepo.getById(ctx, ruleId);
    if (!rule) throw new NotFoundError('OT Rule not found');
    await this.ruleRepo.setEligibility(ctx, ruleId, items);
  }

  // ── Rule resolution ───────────────────────────────────────────────────────

  async getEligibleRule(ctx: TenantContext, employeeId: number): Promise<OTRule | null> {
    return this.ruleRepo.getActiveRuleForEmployee(ctx, employeeId);
  }

  // ── CORE CALCULATION ENGINE ───────────────────────────────────────────────

  calculateOvertimeMinutes(params: {
    rule:                        OTRule;
    checkInTime:                 Date;
    checkOutTime:                Date;
    workDurationMinutes:         number;
    shiftStartTime:              Date | null;
    shiftEndTime:                Date | null;
    dayType:                     'normal' | 'holiday' | 'weekend';
    alreadyAccruedWeeklyMinutes: number;
  }): number {
    const {
      rule, checkInTime, checkOutTime, workDurationMinutes,
      shiftStartTime, shiftEndTime, dayType, alreadyAccruedWeeklyMinutes,
    } = params;

    const config = this.getDayConfig(rule, dayType);
    let candidateOT = 0;

    // ── MODE A: Every worked minute = OT ──────────────────────────────────
    if (config?.calculateOT?.considerAllAsOT) {
      candidateOT = workDurationMinutes;
    } else {
      // ── MODE B: After shift threshold ──────────────────────────────────
      if (config?.calculateOT?.afterShift?.enabled && shiftEndTime) {
        const rawAfterMins = Math.max(
          0,
          Math.floor((checkOutTime.getTime() - shiftEndTime.getTime()) / 60000)
        );
        const thresholdMins = this.toMinutes(
          config.calculateOT.afterShift.value ?? 0,
          config.calculateOT.afterShift.unit ?? 'minutes'
        );
        // Minimum threshold gate: if rawAfterMins >= thresholdMins, all rawAfterMins count as OT
        if (rawAfterMins >= thresholdMins) {
          candidateOT += rawAfterMins;
        }
      }

      // ── MODE B2: Before shift (early arrival) ──────────────────────────
      if (config?.calculateOT?.beforeShift?.enabled && shiftStartTime) {
        const rawBeforeMins = Math.max(
          0,
          Math.floor((shiftStartTime.getTime() - checkInTime.getTime()) / 60000)
        );
        const thresholdMins = this.toMinutes(
          config.calculateOT.beforeShift.value ?? 0,
          config.calculateOT.beforeShift.unit ?? 'minutes'
        );
        // Minimum threshold gate: if rawBeforeMins >= thresholdMins, all rawBeforeMins count as OT
        if (rawBeforeMins >= thresholdMins) {
          candidateOT += rawBeforeMins;
        }
      }

      // ── MODE C: Irrespective total batch hours ─────────────────────────
      if (config?.calculateOT?.irrespectiveBatchHours?.enabled) {
        const thresholdMins = this.toMinutes(
          config.calculateOT.irrespectiveBatchHours.value ?? 0,
          config.calculateOT.irrespectiveBatchHours.unit ?? 'hours'
        );
        if (workDurationMinutes >= thresholdMins) {
          candidateOT = Math.max(0, workDurationMinutes - thresholdMins);
        }
      }
    }

    // ── SHIFTBOUND CHECK ──────────────────────────────────────────────────
    // If shiftbound is checked, employee must complete their scheduled shift duration to qualify for OT
    if (config?.calculateOT?.shiftBound && shiftStartTime && shiftEndTime) {
      const standardShiftMins = Math.max(
        0,
        Math.floor((shiftEndTime.getTime() - shiftStartTime.getTime()) / 60000)
      );
      if (workDurationMinutes < standardShiftMins) {
        candidateOT = 0;
      }
    }

    // ── DEDUCTION ─────────────────────────────────────────────────────────
    if (config?.deduction?.enabled && candidateOT > 0) {
      const deductMins = this.toMinutes(config.deduction.value ?? 0, config.deduction.unit ?? 'minutes');
      candidateOT = Math.max(0, candidateOT - deductMins);
    }

    // ── ROUNDING ──────────────────────────────────────────────────────────
    const roundingMode = (rule as any).employeeTimingRounding ?? (rule as any).employee_timing_rounding ?? 'no_round';
    candidateOT = this.applyRounding(candidateOT, roundingMode);

    // ── DAILY CAP (only if period = daily) ─────────────────────────────────
    const periodVal = (rule as any).period ?? 'daily';
    const dailyCap = Number((rule as any).dailyMaxOtLimit ?? (rule as any).daily_max_ot_limit ?? 0);
    const dailyCapUnit = (rule as any).dailyMaxOtLimitUnit ?? (rule as any).daily_max_ot_limit_unit ?? 'hours';
    if (periodVal === 'daily' && dailyCap > 0) {
      const dailyCapMins = this.toMinutes(dailyCap, dailyCapUnit);
      candidateOT = Math.min(candidateOT, dailyCapMins);
    }

    // ── WEEKLY CAP (only if period = weekly) ──────────────────────────────
    const weeklyCap = Number((rule as any).weeklyMaxOtLimit ?? (rule as any).weekly_max_ot_limit ?? 0);
    const weeklyCapUnit = (rule as any).weeklyMaxOtLimitUnit ?? (rule as any).weekly_max_ot_limit_unit ?? 'hours';
    if (periodVal === 'weekly' && weeklyCap > 0) {
      const weeklyCapMins = this.toMinutes(weeklyCap, weeklyCapUnit);
      const remaining = Math.max(0, weeklyCapMins - alreadyAccruedWeeklyMinutes);
      candidateOT = Math.min(candidateOT, remaining);
    }

    return Math.max(0, Math.round(candidateOT));
  }

  // ── PAY CALCULATION ───────────────────────────────────────────────────────

  calculateOTPayAmount(params: {
    rule:            OTRule;
    overtimeMinutes: number;
    dayType:         'normal' | 'holiday' | 'weekend';
    basicAmount:     number;
    grossAmount:     number;
    dailyRate:       number;
    hourlyRate:      number;
  }): number {
    const { rule, overtimeMinutes, dayType, basicAmount, grossAmount, dailyRate, hourlyRate } = params;
    const config = this.getDayConfig(rule, dayType);
    const otHours = overtimeMinutes / 60;

    const globalFormulaEnabled = Boolean((rule as any).otFormulaEnabled ?? (rule as any).ot_formula_enabled);
    const globalFormulaExpr = (rule as any).otFormulaExpression ?? (rule as any).ot_formula_expression;

    // Global formula overrides everything
    if (globalFormulaEnabled && globalFormulaExpr) {
      return this.evaluateFormula(globalFormulaExpr, {
        OT_HOURS: otHours, OT_MINUTES: overtimeMinutes,
        BASIC: basicAmount, GROSS: grossAmount,
        DAILY_RATE: dailyRate, HOURLY_RATE: hourlyRate,
      });
    }

    // Day-type specific formula
    if (config.pay.useFormula && config.pay.formula) {
      return this.evaluateFormula(config.pay.formula, {
        OT_HOURS: otHours, OT_MINUTES: overtimeMinutes,
        BASIC: basicAmount, GROSS: grossAmount,
        DAILY_RATE: dailyRate, HOURLY_RATE: hourlyRate,
      });
    }

    // Multiplier mode
    const multiplier = config.pay.payPerMinMultiplier ?? (dayType === 'normal' ? 1.5 : 2.0);
    return Math.round(otHours * hourlyRate * multiplier);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  getDayConfig(rule: OTRule, dayType: 'normal' | 'holiday' | 'weekend'): DayConfig {
    const json = dayType === 'holiday'
      ? (rule as any).holidayConfigJson ?? (rule as any).holiday_config_json
      : dayType === 'weekend'
        ? (rule as any).weekendConfigJson ?? (rule as any).weekend_config_json
        : (rule as any).normalDayConfigJson ?? (rule as any).normal_day_config_json;

    if (json) {
      try {
        return typeof json === 'string' ? JSON.parse(json) as DayConfig : json as DayConfig;
      } catch {
        // fall through to default
      }
    }
    return this.defaultConfig(dayType);
  }

  private defaultConfig(dayType: string): DayConfig {
    const isSpecial = dayType !== 'normal';
    return {
      calculateOT: {
        beforeShift:            { enabled: false, value: 0, unit: 'minutes' },
        afterShift:             { enabled: !isSpecial, value: 30, unit: 'minutes' },
        shiftBound:             false,
        irrespectiveBatchHours: { enabled: false, value: 0, unit: 'hours' },
        considerAllAsOT:        isSpecial,
      },
      deduction: { enabled: false, value: 0, unit: 'minutes' },
      pay:        { useFormula: false, formula: '', payPerMinMultiplier: isSpecial ? 2.0 : 1.5 },
    };
  }

  private toMinutes(value: number, unit: string): number {
    if (unit === 'hours') return Math.round(Number(value) * 60);
    if (unit === 'days')  return Math.round(Number(value) * 60 * 8);
    return Math.round(Number(value));
  }

  private applyRounding(minutes: number, mode: string): number {
    switch (mode) {
      case 'round':      return Math.round(minutes / 30) * 30;
      case 'round_up':   return Math.ceil(minutes / 30) * 30;
      case 'round_down': return Math.floor(minutes / 30) * 30;
      default:           return Math.round(minutes);
    }
  }

  private evaluateFormula(expression: string, vars: Record<string, number>): number {
    try {
      let expr = expression;
      for (const [key, val] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
      }
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expr}`)();
      return Math.round(Number(result) || 0);
    } catch (err) {
      logger.warn('[OTRuleService] Formula evaluation failed:', err);
      return 0;
    }
  }
}
