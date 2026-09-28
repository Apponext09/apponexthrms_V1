'use strict';

/**
 * Payroll V2 schema blueprint.
 *
 * This is deliberately additive: it creates payroll_v2_* tables and does not
 * delete, rename, or alter the existing payroll tables. It is not discovered
 * by the current TypeScript migration runner automatically; move/adapt it to a
 * timestamped migration only when the V2 implementation is ready to roll out.
 *
 * Core invariants:
 * - Components own their earning/deduction category; groups are not required.
 * - One regular run exists per company and pay period.
 * - Published payroll and payslip snapshots are immutable.
 * - Corrections use adjustments or an off-cycle run, never a second regular run.
 */

const auditColumns = (table, knex) => {
  table.bigInteger('created_by').unsigned().nullable();
  table.bigInteger('updated_by').unsigned().nullable();
  table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
};

const tenantColumns = (table) => {
  table.bigInteger('organization_id').unsigned().notNullable().index();
  // `company` uses company_id in the current HRMS schema, so keep this as an
  // indexed scalar rather than creating an incompatible foreign key to `id`.
  table.bigInteger('company_id').unsigned().notNullable().index();
};

exports.up = async function up(knex) {
  await knex.schema.createTable('payroll_v2_policies', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.string('currency_code', 3).notNullable().defaultTo('INR');
    table.string('country_code', 2).notNullable().defaultTo('IN');
    table.string('state_code', 10).nullable();
    table.enum('rounding_mode', ['half_up', 'half_even', 'floor', 'ceil', 'none']).notNullable().defaultTo('half_up');
    table.integer('rounding_nearest').unsigned().notNullable().defaultTo(0);
    table.json('statutory_settings').nullable();
    table.json('variance_policy').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    auditColumns(table, knex);
    table.unique(['organization_id', 'company_id'], 'payroll_v2_policy_company_unique');
  });

  await knex.schema.createTable('payroll_v2_cycles', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.string('name', 100).notNullable();
    table.enum('frequency', ['monthly', 'weekly', 'fortnightly', 'semi_monthly']).notNullable().defaultTo('monthly');
    table.integer('cutoff_day').unsigned().nullable();
    table.integer('pay_day').unsigned().nullable();
    table.enum('working_day_basis', ['calendar_days', 'fixed_days', 'attendance_days']).notNullable().defaultTo('calendar_days');
    table.integer('fixed_working_days').unsigned().nullable();
    table.boolean('is_default').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    auditColumns(table, knex);
    table.unique(['organization_id', 'company_id', 'name'], 'payroll_v2_cycle_name_unique');
  });

  await knex.schema.createTable('payroll_v2_periods', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('cycle_id').unsigned().notNullable().index();
    table.string('period_code', 20).notNullable(); // e.g. 2026-04
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.date('attendance_cutoff_date').notNullable();
    table.date('expected_pay_date').nullable();
    table.enum('status', ['open', 'processing', 'locked', 'closed']).notNullable().defaultTo('open');
    table.timestamp('locked_at').nullable();
    table.timestamp('closed_at').nullable();
    auditColumns(table, knex);
    table.foreign('cycle_id').references('id').inTable('payroll_v2_cycles');
    table.unique(['organization_id', 'company_id', 'cycle_id', 'period_code'], 'payroll_v2_period_unique');
  });

  await knex.schema.createTable('payroll_v2_components', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.string('code', 60).notNullable();
    table.string('name', 120).notNullable();
    table.enum('category', ['earning', 'deduction']).notNullable();
    table.enum('calculation_type', ['fixed', 'formula', 'statutory', 'module']).notNullable().defaultTo('fixed');
    table.decimal('default_amount', 15, 2).notNullable().defaultTo(0);
    table.text('formula').nullable();
    table.string('module_source', 80).nullable(); // loan_emi, tds, overtime, advance_recovery
    table.string('statutory_code', 30).nullable(); // epf, esi, pt, tds, lwf, gratuity
    table.boolean('is_statutory').notNullable().defaultTo(false);
    table.boolean('is_employer_contribution').notNullable().defaultTo(false);
    table.boolean('is_taxable').notNullable().defaultTo(true);
    table.boolean('is_proratable').notNullable().defaultTo(true);
    table.boolean('is_residual').notNullable().defaultTo(false);
    table.integer('display_order').notNullable().defaultTo(0);
    table.date('effective_from').nullable();
    table.date('effective_to').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    auditColumns(table, knex);
    table.unique(['organization_id', 'company_id', 'code'], 'payroll_v2_component_code_unique');
  });

  await knex.schema.createTable('payroll_v2_slabs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('cycle_id').unsigned().notNullable().index();
    table.string('code', 60).notNullable();
    table.string('name', 120).notNullable();
    table.decimal('min_annual_ctc', 15, 2).notNullable().defaultTo(0);
    table.decimal('max_annual_ctc', 15, 2).nullable();
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    auditColumns(table, knex);
    table.foreign('cycle_id').references('id').inTable('payroll_v2_cycles');
    table.unique(['organization_id', 'company_id', 'code'], 'payroll_v2_slab_code_unique');
  });

  await knex.schema.createTable('payroll_v2_slab_components', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('slab_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().notNullable();
    table.decimal('amount_override', 15, 2).nullable();
    table.text('formula_override').nullable();
    table.boolean('is_enabled').notNullable().defaultTo(true);
    table.integer('display_order').notNullable().defaultTo(0);
    table.foreign('slab_id').references('id').inTable('payroll_v2_slabs').onDelete('CASCADE');
    table.foreign('component_id').references('id').inTable('payroll_v2_components');
    table.unique(['slab_id', 'component_id'], 'payroll_v2_slab_component_unique');
  });

  await knex.schema.createTable('payroll_v2_compensations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('employee_id').unsigned().notNullable().index();
    table.bigInteger('cycle_id').unsigned().notNullable().index();
    table.bigInteger('slab_id').unsigned().nullable().index();
    table.decimal('annual_ctc', 15, 2).notNullable();
    table.decimal('monthly_gross', 15, 2).notNullable();
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.enum('status', ['draft', 'active', 'superseded', 'cancelled']).notNullable().defaultTo('draft');
    table.string('source_type', 30).notNullable().defaultTo('initial');
    table.bigInteger('source_revision_id').unsigned().nullable();
    table.text('notes').nullable();
    auditColumns(table, knex);
    table.foreign('cycle_id').references('id').inTable('payroll_v2_cycles');
    table.foreign('slab_id').references('id').inTable('payroll_v2_slabs');
    table.index(['employee_id', 'effective_from', 'effective_to'], 'payroll_v2_compensation_dates');
  });

  await knex.schema.createTable('payroll_v2_compensation_lines', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('compensation_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().nullable();
    table.string('component_code', 60).notNullable();
    table.string('component_name', 120).notNullable();
    table.enum('category', ['earning', 'deduction']).notNullable();
    table.enum('calculation_type', ['fixed', 'formula', 'statutory', 'module']).notNullable();
    table.decimal('amount', 15, 2).nullable();
    table.text('formula').nullable();
    table.json('calculation_snapshot').nullable();
    table.integer('display_order').notNullable().defaultTo(0);
    table.foreign('compensation_id').references('id').inTable('payroll_v2_compensations').onDelete('CASCADE');
    table.foreign('component_id').references('id').inTable('payroll_v2_components');
    table.index(['compensation_id', 'category'], 'payroll_v2_compensation_line_category');
  });

  await knex.schema.createTable('payroll_v2_revisions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('employee_id').unsigned().notNullable().index();
    table.bigInteger('current_compensation_id').unsigned().notNullable();
    table.bigInteger('proposed_slab_id').unsigned().nullable();
    table.decimal('old_annual_ctc', 15, 2).notNullable();
    table.decimal('new_annual_ctc', 15, 2).notNullable();
    table.date('effective_from').notNullable();
    table.enum('revision_type', ['increment', 'promotion', 'transfer', 'correction', 'retention', 'other']).notNullable();
    table.text('reason').nullable();
    table.enum('status', ['draft', 'submitted', 'finance_approved', 'final_approved', 'scheduled', 'applied', 'rejected', 'cancelled']).notNullable().defaultTo('draft');
    table.bigInteger('applied_compensation_id').unsigned().nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('applied_at').nullable();
    auditColumns(table, knex);
    table.foreign('current_compensation_id').references('id').inTable('payroll_v2_compensations');
    table.foreign('proposed_slab_id').references('id').inTable('payroll_v2_slabs');
    table.index(['employee_id', 'status', 'effective_from'], 'payroll_v2_revision_employee_status');
  });

  await knex.schema.createTable('payroll_v2_revision_approvals', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('revision_id').unsigned().notNullable();
    table.integer('stage_no').unsigned().notNullable();
    table.string('approver_role', 60).notNullable();
    table.bigInteger('acted_by').unsigned().nullable();
    table.enum('action', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.text('comment').nullable();
    table.timestamp('acted_at').nullable();
    table.foreign('revision_id').references('id').inTable('payroll_v2_revisions').onDelete('CASCADE');
    table.unique(['revision_id', 'stage_no'], 'payroll_v2_revision_approval_stage_unique');
  });

  await knex.schema.createTable('payroll_v2_runs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('period_id').unsigned().notNullable().index();
    table.enum('run_type', ['regular', 'off_cycle', 'arrears', 'final_settlement']).notNullable().defaultTo('regular');
    // Set to 'regular' for a normal run and NULL for every other run type.
    // MySQL permits multiple NULL values, enforcing exactly one regular run.
    table.string('regular_run_key', 10).nullable();
    table.enum('status', ['draft', 'calculating', 'calculated', 'submitted', 'finance_approved', 'final_approved', 'published', 'paid', 'closed', 'returned', 'cancelled']).notNullable().defaultTo('draft');
    table.integer('calculation_version').unsigned().notNullable().defaultTo(0);
    table.integer('employee_count').unsigned().notNullable().defaultTo(0);
    table.integer('error_count').unsigned().notNullable().defaultTo(0);
    table.decimal('gross_total', 18, 2).notNullable().defaultTo(0);
    table.decimal('deduction_total', 18, 2).notNullable().defaultTo(0);
    table.decimal('net_total', 18, 2).notNullable().defaultTo(0);
    table.timestamp('submitted_at').nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('paid_at').nullable();
    table.timestamp('closed_at').nullable();
    table.text('return_reason').nullable();
    auditColumns(table, knex);
    table.foreign('period_id').references('id').inTable('payroll_v2_periods');
    table.unique(['organization_id', 'company_id', 'period_id', 'regular_run_key'], 'payroll_v2_one_regular_run_per_period');
  });

  await knex.schema.createTable('payroll_v2_run_calculations', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_id').unsigned().notNullable();
    table.integer('version_no').unsigned().notNullable();
    table.bigInteger('triggered_by').unsigned().nullable();
    table.string('trigger_reason', 100).nullable();
    table.json('input_snapshot').nullable();
    table.json('summary_snapshot').nullable();
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.foreign('run_id').references('id').inTable('payroll_v2_runs').onDelete('CASCADE');
    table.unique(['run_id', 'version_no'], 'payroll_v2_calculation_version_unique');
  });

  await knex.schema.createTable('payroll_v2_run_employees', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_id').unsigned().notNullable();
    table.bigInteger('organization_id').unsigned().notNullable().index();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('compensation_id').unsigned().nullable();
    table.integer('calculation_version').unsigned().notNullable();
    table.enum('status', ['pending', 'calculated', 'review_required', 'approved', 'error', 'excluded']).notNullable().defaultTo('pending');
    table.decimal('working_days', 8, 2).notNullable().defaultTo(0);
    table.decimal('payable_days', 8, 2).notNullable().defaultTo(0);
    table.decimal('lop_days', 8, 2).notNullable().defaultTo(0);
    table.decimal('overtime_hours', 8, 2).notNullable().defaultTo(0);
    table.decimal('gross_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('deduction_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('net_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('ytd_gross', 15, 2).notNullable().defaultTo(0);
    table.decimal('ytd_tax', 15, 2).notNullable().defaultTo(0);
    table.text('error_message').nullable();
    table.json('calculation_snapshot').nullable();
    table.timestamp('calculated_at').nullable();
    table.foreign('run_id').references('id').inTable('payroll_v2_runs').onDelete('CASCADE');
    table.foreign('compensation_id').references('id').inTable('payroll_v2_compensations');
    table.unique(['run_id', 'employee_id'], 'payroll_v2_run_employee_unique');
    table.index(['run_id', 'status'], 'payroll_v2_run_employee_status');
  });

  await knex.schema.createTable('payroll_v2_run_lines', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_employee_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().nullable();
    table.string('component_code', 60).notNullable();
    table.string('component_name', 120).notNullable();
    table.enum('category', ['earning', 'deduction']).notNullable();
    table.enum('line_source', ['compensation', 'attendance', 'statutory', 'loan', 'advance', 'tax', 'adjustment', 'manual']).notNullable();
    table.decimal('base_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('amount', 15, 2).notNullable().defaultTo(0);
    table.json('calculation_snapshot').nullable();
    table.foreign('run_employee_id').references('id').inTable('payroll_v2_run_employees').onDelete('CASCADE');
    table.foreign('component_id').references('id').inTable('payroll_v2_components');
    table.index(['run_employee_id', 'category'], 'payroll_v2_run_line_category');
  });

  await knex.schema.createTable('payroll_v2_approvals', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_id').unsigned().notNullable();
    table.integer('stage_no').unsigned().notNullable();
    table.string('stage_name', 100).notNullable();
    table.string('approver_role', 60).notNullable();
    table.bigInteger('acted_by').unsigned().nullable();
    table.enum('action', ['pending', 'approved', 'returned', 'rejected']).notNullable().defaultTo('pending');
    table.text('comment').nullable();
    table.timestamp('acted_at').nullable();
    table.foreign('run_id').references('id').inTable('payroll_v2_runs').onDelete('CASCADE');
    table.unique(['run_id', 'stage_no'], 'payroll_v2_approval_stage_unique');
  });

  await knex.schema.createTable('payroll_v2_variances', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_employee_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().nullable();
    table.string('component_name', 120).nullable();
    table.string('reason_code', 60).notNullable();
    table.enum('severity', ['info', 'low', 'medium', 'high', 'critical']).notNullable().defaultTo('info');
    table.decimal('expected_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('actual_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('delta_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('delta_percent', 9, 2).nullable();
    table.enum('review_status', ['open', 'accepted', 'adjusted', 'resolved']).notNullable().defaultTo('open');
    table.bigInteger('reviewed_by').unsigned().nullable();
    table.text('review_comment').nullable();
    table.timestamp('reviewed_at').nullable();
    table.foreign('run_employee_id').references('id').inTable('payroll_v2_run_employees').onDelete('CASCADE');
    table.foreign('component_id').references('id').inTable('payroll_v2_components');
    table.index(['run_employee_id', 'severity', 'review_status'], 'payroll_v2_variance_review');
  });

  await knex.schema.createTable('payroll_v2_payments', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('run_employee_id').unsigned().notNullable().unique();
    table.enum('status', ['pending', 'exported', 'initiated', 'paid', 'failed', 'reversed']).notNullable().defaultTo('pending');
    table.enum('payment_method', ['bank_transfer', 'cash', 'cheque', 'other']).notNullable().defaultTo('bank_transfer');
    table.decimal('amount', 15, 2).notNullable();
    table.string('bank_reference', 150).nullable();
    table.timestamp('paid_at').nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.foreign('run_employee_id').references('id').inTable('payroll_v2_run_employees').onDelete('CASCADE');
  });

  await knex.schema.createTable('payroll_v2_payslips', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('run_employee_id').unsigned().notNullable().unique();
    table.string('payslip_number', 80).notNullable().unique();
    table.date('issue_date').notNullable();
    table.decimal('gross_amount', 15, 2).notNullable();
    table.decimal('deduction_amount', 15, 2).notNullable();
    table.decimal('net_amount', 15, 2).notNullable();
    table.json('employer_snapshot').notNullable();
    table.json('employee_snapshot').notNullable();
    table.json('attendance_snapshot').nullable();
    table.json('earnings_snapshot').notNullable();
    table.json('deductions_snapshot').notNullable();
    table.json('ytd_snapshot').nullable();
    table.string('document_url', 500).nullable();
    table.string('document_hash', 128).nullable();
    table.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('published_at').nullable();
    table.timestamp('sent_at').nullable();
    table.boolean('is_void').notNullable().defaultTo(false);
    table.text('void_reason').nullable();
    table.foreign('run_employee_id').references('id').inTable('payroll_v2_run_employees');
  });

  await knex.schema.createTable('payroll_v2_adjustments', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    tenantColumns(table);
    table.bigInteger('employee_id').unsigned().notNullable().index();
    table.bigInteger('origin_run_id').unsigned().nullable();
    table.bigInteger('target_period_id').unsigned().nullable();
    table.enum('adjustment_type', ['arrears', 'recovery', 'reversal', 'manual']).notNullable();
    table.enum('category', ['earning', 'deduction']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('reason_code', 60).notNullable();
    table.text('reason').nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'included', 'cancelled']).notNullable().defaultTo('draft');
    table.bigInteger('included_run_id').unsigned().nullable();
    auditColumns(table, knex);
    table.foreign('origin_run_id').references('id').inTable('payroll_v2_runs');
    table.foreign('target_period_id').references('id').inTable('payroll_v2_periods');
    table.foreign('included_run_id').references('id').inTable('payroll_v2_runs');
    table.index(['employee_id', 'status', 'target_period_id'], 'payroll_v2_adjustment_queue');
  });
};

exports.down = async function down(knex) {
  // Rollback is intentionally destructive and should only be used in a fresh
  // development database before V2 payroll records have been created.
  const tables = [
    'payroll_v2_adjustments', 'payroll_v2_payslips', 'payroll_v2_payments',
    'payroll_v2_variances', 'payroll_v2_approvals', 'payroll_v2_run_lines',
    'payroll_v2_run_employees', 'payroll_v2_run_calculations', 'payroll_v2_runs',
    'payroll_v2_revision_approvals', 'payroll_v2_revisions',
    'payroll_v2_compensation_lines', 'payroll_v2_compensations',
    'payroll_v2_slab_components', 'payroll_v2_slabs', 'payroll_v2_components',
    'payroll_v2_periods', 'payroll_v2_cycles', 'payroll_v2_policies',
  ];
  for (const table of tables) await knex.schema.dropTableIfExists(table);
};
