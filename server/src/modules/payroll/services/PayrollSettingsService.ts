import { v4 as uuidv4 } from 'uuid';
import type { TenantContext } from '../../../db/types';
import { PayrollSettingsRepository } from '../repositories/PayrollSettingsRepository';

const DEFAULT_PAYMENT_STATUS_OPTIONS = [
  { code: 'pending', label: 'Pending', color: 'amber' },
  { code: 'processing', label: 'Processing', color: 'blue' },
  { code: 'paid', label: 'Paid', color: 'emerald' },
  { code: 'on_hold', label: 'On Hold', color: 'orange' },
  { code: 'failed', label: 'Failed', color: 'rose' }
];

const DEFAULT_APPROVAL_LEVELS = [
  { level: 1, name: 'HR Review', approverRole: 'hr', approverUserId: null },
  { level: 2, name: 'Final Approval', approverRole: 'organization_admin', approverUserId: null }
];

const DEFAULT_PROCESS_PAYROLL_TABS = [
  { code: 'attendance', label: 'Attendance Review', isEnabled: true },
  { code: 'compute', label: 'Compute Salary', isEnabled: true },
  { code: 'review', label: 'Review & Adjust', isEnabled: true },
  { code: 'approval', label: 'Approval', isEnabled: true },
  { code: 'payslip', label: 'Payslip Generation', isEnabled: true }
];

const DEFAULT_CHECKLIST = [
  { label: 'Attendance data verified', isMandatory: true },
  { label: 'Loan / advance deductions verified', isMandatory: true },
  { label: 'Statutory contributions (PF/ESIC/PT/TDS) verified', isMandatory: true },
  { label: 'Bank details verified for all employees', isMandatory: false }
];

const DEFAULT_LOAN_SETTING = { maxLoanMultipleOfSalary: 10, maxTenureMonths: 36, interestRatePct: 0, minServiceMonths: 6 };
const DEFAULT_PAYSLIP_SETTING = {
  showCompanyLogo: true,
  showBankDetails: true,
  showLeaveBalance: false,
  showAttendanceSummary: true,
  footerNote: 'This is a system-generated payslip.',
  hideComponentIfZero: false,
  displayActualValuesGross: false,
  displayCumulativeValues: false,
  displayTotalAmount: false,
  enableLandscapeFormat: false,
  labelGrossSalary: '',
  labelGrossEarnedSalary: '',
  labelCumulativeSalary: '',
  labelEarningComponent: '',
  labelDeductionComponent: '',
  employeeSignatureFieldName: ''
};
const DEFAULT_BONUS_SETTING = { isEnabled: false, calculationBase: 'Basic', percentage: 8.33 };
const DEFAULT_ATTENDANCE_BONUS_SETTING = { isEnabled: false, amount: 0, minAttendancePct: 95 };
const DEFAULT_NIGHT_ALLOWANCE_SETTING = { isEnabled: false, amountPerNight: 0, shiftStartHour: 22, shiftEndHour: 6 };

function parseJson(val: any, fallback: any) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export class PayrollSettingsService {
  private repo: PayrollSettingsRepository;

  constructor() {
    this.repo = new PayrollSettingsRepository();
  }

  private serialize(row: any) {
    return {
      id: row.id,
      esicCalculationBase: row.esicCalculationBase ?? row.esic_calculation_base ?? 'Gross Salary',
      esicWageCeiling: Number(row.esicWageCeiling ?? row.esic_wage_ceiling ?? 21000),
      sandwichPolicyEnabled: Boolean(row.sandwichPolicyEnabled ?? row.sandwich_policy_enabled),
      sandwichPolicyRules: parseJson(row.sandwichPolicyRules ?? row.sandwich_policy_rules, []),
      loanSetting: parseJson(row.loanSetting ?? row.loan_setting, DEFAULT_LOAN_SETTING),
      payslipSetting: parseJson(row.payslipSetting ?? row.payslip_setting, DEFAULT_PAYSLIP_SETTING),
      paymentStatusOptions: parseJson(row.paymentStatusOptions ?? row.payment_status_options, DEFAULT_PAYMENT_STATUS_OPTIONS),
      checklistSetting: parseJson(row.checklistSetting ?? row.checklist_setting, DEFAULT_CHECKLIST),
      approvalMode: row.approvalMode ?? row.approval_mode ?? 'single',
      approvalLevels: parseJson(row.approvalLevels ?? row.approval_levels, DEFAULT_APPROVAL_LEVELS),
      requireApprovalBeforePublish: Boolean(row.requireApprovalBeforePublish ?? row.require_approval_before_publish ?? true),
      processPayrollTabs: parseJson(row.processPayrollTabs ?? row.process_payroll_tabs, DEFAULT_PROCESS_PAYROLL_TABS),
      freezeAttendanceDay: Number(row.freezeAttendanceDay ?? row.freeze_attendance_day ?? 25),
      ignoreLeaveTypeIds: parseJson(row.ignoreLeaveTypeIds ?? row.ignore_leave_type_ids, []),
      massPaidDays: Number(row.massPaidDays ?? row.mass_paid_days ?? 0),
      doublePayInclusive: Boolean(row.doublePayInclusive ?? row.double_pay_inclusive),
      bonusSetting: parseJson(row.bonusSetting ?? row.bonus_setting, DEFAULT_BONUS_SETTING),
      attendanceBonusSetting: parseJson(row.attendanceBonusSetting ?? row.attendance_bonus_setting, DEFAULT_ATTENDANCE_BONUS_SETTING),
      nightAllowanceSetting: parseJson(row.nightAllowanceSetting ?? row.night_allowance_setting, DEFAULT_NIGHT_ALLOWANCE_SETTING),
      updatedAt: row.updatedAt ?? row.updated_at ?? null
    };
  }

  async getSettings(ctx: TenantContext) {
    const row = await this.repo.getForOrg(ctx);
    if (!row) {
      // No row saved yet — return defaults (id: null signals "not yet persisted")
      return this.serialize({ id: null });
    }
    return this.serialize(row);
  }

  async updateSettings(ctx: TenantContext, body: any) {
    const existing = await this.repo.getForOrg(ctx);

    const payload: any = {};
    if (body.esicCalculationBase !== undefined) payload.esic_calculation_base = body.esicCalculationBase;
    if (body.esicWageCeiling !== undefined) payload.esic_wage_ceiling = Number(body.esicWageCeiling);
    if (body.sandwichPolicyEnabled !== undefined) payload.sandwich_policy_enabled = !!body.sandwichPolicyEnabled;
    if (body.sandwichPolicyRules !== undefined) payload.sandwich_policy_rules = JSON.stringify(body.sandwichPolicyRules);
    if (body.loanSetting !== undefined) payload.loan_setting = JSON.stringify(body.loanSetting);
    if (body.payslipSetting !== undefined) payload.payslip_setting = JSON.stringify(body.payslipSetting);
    if (body.paymentStatusOptions !== undefined) payload.payment_status_options = JSON.stringify(body.paymentStatusOptions);
    if (body.checklistSetting !== undefined) payload.checklist_setting = JSON.stringify(body.checklistSetting);
    if (body.approvalMode !== undefined) payload.approval_mode = body.approvalMode;
    if (body.approvalLevels !== undefined) payload.approval_levels = JSON.stringify(body.approvalLevels);
    if (body.requireApprovalBeforePublish !== undefined) payload.require_approval_before_publish = !!body.requireApprovalBeforePublish;
    if (body.processPayrollTabs !== undefined) payload.process_payroll_tabs = JSON.stringify(body.processPayrollTabs);
    if (body.freezeAttendanceDay !== undefined) payload.freeze_attendance_day = Number(body.freezeAttendanceDay);
    if (body.ignoreLeaveTypeIds !== undefined) payload.ignore_leave_type_ids = JSON.stringify(body.ignoreLeaveTypeIds);
    if (body.massPaidDays !== undefined) payload.mass_paid_days = Number(body.massPaidDays);
    if (body.doublePayInclusive !== undefined) payload.double_pay_inclusive = !!body.doublePayInclusive;
    if (body.bonusSetting !== undefined) payload.bonus_setting = JSON.stringify(body.bonusSetting);
    if (body.attendanceBonusSetting !== undefined) payload.attendance_bonus_setting = JSON.stringify(body.attendanceBonusSetting);
    if (body.nightAllowanceSetting !== undefined) payload.night_allowance_setting = JSON.stringify(body.nightAllowanceSetting);

    payload.updated_by = ctx.userId;

    if (existing) {
      const updated = await this.repo.update(ctx, existing.id, payload);
      return this.serialize(updated);
    }

    const created = await this.repo.create(ctx, {
      ...payload,
      uuid: uuidv4(),
      company_id: ctx.companyId || null,
      created_by: ctx.userId
    } as any);
    return this.serialize(created);
  }
}
