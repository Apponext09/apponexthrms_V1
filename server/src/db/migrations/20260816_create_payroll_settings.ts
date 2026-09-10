import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_settings');
  if (hasTable) return;

  await knex.schema.createTable('payroll_settings', (table) => {
    table.bigIncrements('id').unsigned().primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('company_id').unsigned().nullable();

    // ── ESIC Calculation Component ──────────────────────────────────────
    table.string('esic_calculation_base', 50).defaultTo('Gross Salary').comment('Gross Salary, Fixed Gross, Actual Gross');
    table.decimal('esic_wage_ceiling', 12, 2).defaultTo(21000);

    // ── Sandwich Policy ──────────────────────────────────────────────────
    table.boolean('sandwich_policy_enabled').defaultTo(false);
    table.json('sandwich_policy_rules').nullable().comment('[{appliesTo, includeWeekOff, includeHoliday}]');

    // ── Loan Setting ─────────────────────────────────────────────────────
    table.json('loan_setting').nullable().comment('{maxLoanMultipleOfSalary, maxTenureMonths, interestRatePct, minServiceMonths}');

    // ── Payslip Setting ──────────────────────────────────────────────────
    table.json('payslip_setting').nullable().comment('{showCompanyLogo, showBankDetails, showLeaveBalance, showAttendanceSummary, footerNote}');

    // ── Payment Status Setting (statuses shown for a run's payments) ────
    table.json('payment_status_options').nullable().comment('[{code, label, color}]');

    // ── Checklist Setting (pre-publish checklist) ────────────────────────
    table.json('checklist_setting').nullable().comment('[{label, isMandatory}]');

    // ── Payroll Approval Setting ──────────────────────────────────────────
    table.string('approval_mode', 20).defaultTo('single').comment('single, multi');
    table.json('approval_levels').nullable().comment('[{level, name, approverRole, approverUserId}]');
    table.boolean('require_approval_before_publish').defaultTo(true);

    // ── Process Payroll Tab Setting ───────────────────────────────────────
    table.json('process_payroll_tabs').nullable().comment('[{code, label, isEnabled}]');

    // ── Attendance / Leave Linkage ─────────────────────────────────────────
    table.integer('freeze_attendance_day').defaultTo(25).comment('Day of month attendance data is frozen for payroll');
    table.json('ignore_leave_type_ids').nullable().comment('Leave type IDs excluded from LOP calculation');
    table.integer('mass_paid_days').defaultTo(0).comment('Days credited as paid to all employees regardless of attendance');
    table.boolean('double_pay_inclusive').defaultTo(false).comment('Whether OT/holiday double-pay is included in gross by default');

    // ── Bonus / Allowance Setting ───────────────────────────────────────────
    table.json('bonus_setting').nullable().comment('{isEnabled, calculationBase, percentage}');
    table.json('attendance_bonus_setting').nullable().comment('{isEnabled, amount, minAttendancePct}');
    table.json('night_allowance_setting').nullable().comment('{isEnabled, amountPerNight, shiftStartHour, shiftEndHour}');

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.unique(['organization_id', 'company_id'], { indexName: 'payroll_settings_org_company_unique' });
    table.index(['organization_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_settings');
}
