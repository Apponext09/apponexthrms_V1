import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
  const hasSlabs = await knex.schema.hasTable('payroll_slabs');
  if (!hasSlabs) {
    await knex.schema.createTable('payroll_slabs', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('slab_name', 100).notNullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('grade_id').unsigned().nullable();
      table.text('location_ids').nullable(); // JSON array or comma separated
      table.decimal('ctc_min', 14, 2).defaultTo(0);
      table.decimal('ctc_max', 14, 2).defaultTo(10000000);
      table.bigInteger('payroll_cycle_id').unsigned().nullable();
      table.boolean('active').defaultTo(true);
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

  // 6. Alter payroll_cycles
  const hasCycles = await knex.schema.hasTable('payroll_cycles');
  if (hasCycles) {
    await knex.schema.alterTable('payroll_cycles', (table) => {
      table.integer('calculation_start_day').defaultTo(1);
      table.integer('cutoff_day').defaultTo(25);
      table.string('disbursement_date_str', 50).defaultTo('1st');
      table.string('payslip_frequency', 50).defaultTo('Monthly');
      table.boolean('is_daily_wages').defaultTo(false);
      table.integer('tolerance_mins').defaultTo(0);
    }).catch(() => {});
  }

  // 7. Alter employee_salary_structures
  const hasStructs = await knex.schema.hasTable('employee_salary_structures');
  if (hasStructs) {
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

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_slab_components');
  await knex.schema.dropTableIfExists('payroll_slabs');
  await knex.schema.dropTableIfExists('payroll_component_conditions');
  await knex.schema.dropTableIfExists('payroll_components');
  await knex.schema.dropTableIfExists('payroll_component_groups');
}
