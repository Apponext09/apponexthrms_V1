import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface PayrollSettings {
  id: number;
  uuid: string;
  organization_id: number;
  company_id: number | null;
  esic_calculation_base: string;
  esic_wage_ceiling: number;
  sandwich_policy_enabled: boolean;
  sandwich_policy_rules: string | null;
  loan_setting: string | null;
  payslip_setting: string | null;
  payment_status_options: string | null;
  checklist_setting: string | null;
  approval_mode: 'single' | 'multi';
  approval_levels: string | null;
  require_approval_before_publish: boolean;
  process_payroll_tabs: string | null;
  freeze_attendance_day: number;
  ignore_leave_type_ids: string | null;
  mass_paid_days: number;
  double_pay_inclusive: boolean;
  bonus_setting: string | null;
  attendance_bonus_setting: string | null;
  night_allowance_setting: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollSettingsRepository extends BaseRepository<PayrollSettings> {
  constructor() {
    super('payroll_settings');
  }

  /** One settings row per organization (+ optional company scope). */
  async getForOrg(ctx: TenantContext): Promise<PayrollSettings | null> {
    let q = this.query(ctx).whereNull('deleted_at');
    if (ctx.companyId) {
      const byComp = await this.query(ctx).whereNull('deleted_at').where('company_id', ctx.companyId).first();
      if (byComp) return byComp as PayrollSettings;
    }
    const byOrg = await this.query(ctx).whereNull('deleted_at').whereNull('company_id').first();
    if (byOrg) return byOrg as PayrollSettings;
    return (await this.query(ctx).whereNull('deleted_at').first()) as PayrollSettings | null;
  }
}
