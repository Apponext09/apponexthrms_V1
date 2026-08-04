import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create payroll_cycles table if not exists
  const hasCycles = await knex.schema.hasTable('payroll_cycles');
  if (!hasCycles) {
    await knex.schema.createTable('payroll_cycles', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().defaultTo(knex.raw('(UUID())'));
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.boolean('is_daily_wages').defaultTo(false);
      table.enum('frequency', ['Monthly', 'Semi-Monthly', 'Weekly', 'Bi-Weekly']).defaultTo('Monthly');
      table.integer('start_date').notNullable().defaultTo(1);
      table.integer('cutoff_day').notNullable().defaultTo(25);
      table.enum('month_offset', ['Current', 'Previous', 'Next']).defaultTo('Current');
      table.integer('disbursement_date').notNullable().defaultTo(1);
      table.decimal('cap_amount', 14, 2).nullable();
      table.boolean('tolerance_enabled').defaultTo(true);
      table.integer('tolerance_minutes').defaultTo(15);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
    });
  }

  // 2. Create payroll_slabs table if not exists
  const hasSlabs = await knex.schema.hasTable('payroll_slabs');
  if (!hasSlabs) {
    await knex.schema.createTable('payroll_slabs', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().defaultTo(knex.raw('(UUID())'));
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.json('departments').nullable();
      table.json('grades').nullable();
      table.json('locations').nullable();
      table.decimal('min_ctc', 14, 2).defaultTo(0);
      table.decimal('max_ctc', 14, 2).defaultTo(10000000);
      table.json('selected_component_ids').nullable();
      table.bigInteger('cycle_id').unsigned().nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payroll_slabs');
  await knex.schema.dropTableIfExists('payroll_cycles');
}
