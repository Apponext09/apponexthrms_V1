import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 0. pay_component_definitions is missing `deleted_at`, but PayComponentService.getComponents()
  // filters on it (whereNull('deleted_at')), so GET /payroll/components 500s without this column.
  const hasPayComponentDefs = await knex.schema.hasTable('pay_component_definitions');
  if (hasPayComponentDefs) {
    const hasDeletedAt = await knex.schema.hasColumn('pay_component_definitions', 'deleted_at');
    if (!hasDeletedAt) {
      await knex.schema.alterTable('pay_component_definitions', (table) => {
        table.timestamp('deleted_at').nullable();
      });
    }
  }

  // 1. payroll_component_groups
  const hasGroups = await knex.schema.hasTable('payroll_component_groups');
  if (!hasGroups) {
    await knex.schema.createTable('payroll_component_groups', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('group_name', 100).notNullable();
      table.string('group_type', 50).defaultTo('earning'); // earning | deduction
      table.string('round_format', 50).defaultTo('Round'); // Round, Floor, Ceiling
      table.string('group_function', 50).defaultTo('Sum'); // Sum, Max, Formula
      table.boolean('configure_on_profile').defaultTo(true);
      table.boolean('display_on_profile').defaultTo(true);
      table.boolean('is_editable').defaultTo(true);
      table.string('contributed_by', 50).defaultTo('Employee'); // Employee | Employer
      table.boolean('recalculate_on_change').defaultTo(false);
      table.string('group_for_payslip', 100).nullable();
      table.integer('display_order').defaultTo(10);
      table.boolean('disable_arrear').defaultTo(false);
      table.boolean('display_total_on_process').defaultTo(true);
      table.boolean('tds_same_month').defaultTo(false);
      table.boolean('taxable').defaultTo(true);
      table.boolean('is_active').defaultTo(true);
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 2. payroll_components
  const hasComponents = await knex.schema.hasTable('payroll_components');
  if (!hasComponents) {
    await knex.schema.createTable('payroll_components', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('group_id').unsigned().nullable();
      table.string('name', 100).notNullable();
      table.string('component_type', 50).defaultTo('value'); // value | derived | module
      table.boolean('based_on_attendance').defaultTo(false);
      table.boolean('non_cashable').defaultTo(false);
      table.decimal('amount_value', 12, 2).defaultTo(0.00);
      table.string('formula_expression', 255).nullable();
      table.decimal('min_limit', 12, 2).nullable();
      table.decimal('max_limit', 12, 2).nullable();
      table.string('boundary_type', 50).defaultTo('Choose'); // Choose, Min, Max
      table.date('effective_from').nullable();
      table.date('effective_to').nullable();
      table.boolean('is_active').defaultTo(true);
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 3. payroll_component_conditions
  const hasConditions = await knex.schema.hasTable('payroll_component_conditions');
  if (!hasConditions) {
    await knex.schema.createTable('payroll_component_conditions', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('component_id').unsigned().notNullable();
      table.string('condition_on', 100).notNullable(); // e.g. Basic, Attendance
      table.string('operator', 20).notNullable(); // ==, >, <, >=, <=
      table.string('value2', 100).notNullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // 4. payroll_slabs
  // Column names/shape match what PayrollController's listSlabs/createSlab/updateSlab
  // and the bulk-assign flow actually read and write (name, departments/grades/locations
  // as JSON text, min_ctc/max_ctc, selected_component_ids, cycle_id, employment_type).
  const hasSlabs = await knex.schema.hasTable('payroll_slabs');
  if (!hasSlabs) {
    await knex.schema.createTable('payroll_slabs', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 150).notNullable();
      table.text('departments').nullable(); // JSON array
      table.text('grades').nullable(); // JSON array
      table.text('locations').nullable(); // JSON array
      table.decimal('min_ctc', 14, 2).defaultTo(0);
      table.decimal('max_ctc', 14, 2).defaultTo(10000000);
      table.text('selected_component_ids').nullable(); // JSON array
      table.bigInteger('cycle_id').unsigned().nullable();
      table.string('employment_type', 50).defaultTo('Regular');
      table.decimal('pf_rate_pct', 5, 2).defaultTo(12);
      table.boolean('is_active').defaultTo(true);
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 5. payroll_slab_components
  const hasSlabComponents = await knex.schema.hasTable('payroll_slab_components');
  if (!hasSlabComponents) {
    await knex.schema.createTable('payroll_slab_components', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('slab_id').unsigned().notNullable();
      table.bigInteger('component_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // 5b. payroll_ledger_entries — used by PayrollLedgerService (financial ledger tab)
  const hasLedgerEntries = await knex.schema.hasTable('payroll_ledger_entries');
  if (!hasLedgerEntries) {
    await knex.schema.createTable('payroll_ledger_entries', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('payroll_run_id').unsigned().nullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.string('entry_type', 50).notNullable(); // earning | deduction | employer_contribution | reimbursement | net_payout
      table.string('component_code', 100).nullable();
      table.string('component_name', 150).nullable();
      table.decimal('amount', 14, 2).defaultTo(0);
      table.string('financial_year', 20).nullable();
      table.string('salary_month', 20).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['organization_id', 'salary_month']);
      table.index(['employee_id']);
    });
  }

  // 6. Alter payroll_cycles
  const hasCycles = await knex.schema.hasTable('payroll_cycles');
  if (hasCycles) {
    const hasCalcStartDay = await knex.schema.hasColumn('payroll_cycles', 'calculation_start_day');
    if (!hasCalcStartDay) {
      await knex.schema.alterTable('payroll_cycles', (table) => {
        table.integer('calculation_start_day').defaultTo(1);
        table.integer('cutoff_day').defaultTo(25);
        table.string('disbursement_date_str', 50).defaultTo('1st');
        table.string('payslip_frequency', 50).defaultTo('Monthly');
        table.boolean('is_daily_wages').defaultTo(false);
        table.integer('tolerance_mins').defaultTo(0);
      }).catch(() => {});
    }
  }

  // 7. Alter employee_salary_structures
  const hasStructs = await knex.schema.hasTable('employee_salary_structures');
  if (hasStructs) {
    const hasCalcMode = await knex.schema.hasColumn('employee_salary_structures', 'calculation_mode');
    if (!hasCalcMode) {
      await knex.schema.alterTable('employee_salary_structures', (table) => {
        table.string('calculation_mode', 50).defaultTo('ctc_based'); // ctc_based | salary_input
        table.date('effective_from').nullable();
        table.string('arrear_pay_month', 50).nullable();
        table.text('earnings_json').nullable();
        table.text('deductions_json').nullable();
        table.text('employer_contributions_json').nullable();
      }).catch(() => {});
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_slab_components');
  await knex.schema.dropTableIfExists('payroll_slabs');
  await knex.schema.dropTableIfExists('payroll_component_conditions');
  await knex.schema.dropTableIfExists('payroll_components');
  await knex.schema.dropTableIfExists('payroll_component_groups');
}
