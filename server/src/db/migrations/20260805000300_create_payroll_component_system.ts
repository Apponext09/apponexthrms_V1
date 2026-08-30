import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create payroll_component_groups table
  const hasGroups = await knex.schema.hasTable('payroll_component_groups');
  if (!hasGroups) {
    await knex.schema.createTable('payroll_component_groups', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().defaultTo(knex.raw('(UUID())'));
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.enum('category', ['Earning', 'Deduction']).notNullable().defaultTo('Earning');
      table.string('round_format', 50).defaultTo('Round');
      table.string('group_function', 50).defaultTo('Max');
      table.boolean('configure_on_profile').defaultTo(false);
      table.boolean('display_on_profile').defaultTo(false);
      table.boolean('is_editable').defaultTo(true);
      table.string('contributed_by', 50).defaultTo('Employee');
      table.boolean('is_active').defaultTo(true);
      table.boolean('recalculate_on_change').defaultTo(false);
      table.string('group_for_payslip', 50).defaultTo('Choose');
      table.integer('display_order').defaultTo(10);
      table.boolean('disable_arrear').defaultTo(false);
      table.boolean('display_total_on_process').defaultTo(false);
      table.boolean('tds_same_month').defaultTo(false);
      table.boolean('is_taxable').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
    });
  }

  // 2. Create payroll_components table
  const hasComponents = await knex.schema.hasTable('payroll_components');
  if (!hasComponents) {
    await knex.schema.createTable('payroll_components', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().defaultTo(knex.raw('(UUID())'));
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('group_id').unsigned().nullable();
      table.string('name', 100).notNullable();
      table.boolean('non_cashable').defaultTo(false);
      table.boolean('based_on_attendance').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.string('component_type', 50).defaultTo('Value'); // Value, Derived, Module
      table.decimal('amount', 14, 2).defaultTo(0);
      table.text('formula').nullable();
      table.string('boundary_type', 50).defaultTo('Choose');
      table.decimal('min_amount', 14, 2).defaultTo(0);
      table.decimal('max_amount', 14, 2).defaultTo(0);
      table.date('effective_from_date').nullable();
      table.date('effective_to_date').nullable();
      table.string('condition_on', 50).nullable();
      table.string('condition_operator', 50).nullable();
      table.string('condition_value1', 100).nullable();
      table.string('condition_value2', 100).nullable();
      table.json('months').nullable();
      table.string('gender_filter', 20).defaultTo('All');
      table.json('grades').nullable();
      table.json('departments').nullable();
      table.json('locations').nullable();
      table.json('employees').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('group_id').references('payroll_component_groups.id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_components');
  await knex.schema.dropTableIfExists('payroll_component_groups');
}
