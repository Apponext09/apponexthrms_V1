import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_cycles');
  if (!hasTable) return;

  const columnsToCheck = [
    'daily_wages_include_paid_holidays',
    'daily_wages_include_week_off',
    'month_offset',
    'cap_amount',
    'tolerance_enabled',
    'tolerance_minutes',
    'tolerance_mins',
    'is_current_cycle',
    'status',
    'calculation_start_day'
  ];

  const existingColumns: string[] = [];
  for (const col of columnsToCheck) {
    const hasCol = await knex.schema.hasColumn('payroll_cycles', col);
    if (hasCol) {
      existingColumns.push(col);
    }
  }

  if (existingColumns.length > 0) {
    await knex.schema.alterTable('payroll_cycles', (table) => {
      table.dropColumns(...existingColumns);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_cycles');
  if (!hasTable) return;

  await knex.schema.alterTable('payroll_cycles', (table) => {
    table.boolean('daily_wages_include_paid_holidays').defaultTo(false);
    table.boolean('daily_wages_include_week_off').defaultTo(false);
    table.string('month_offset', 20).defaultTo('Current');
    table.decimal('cap_amount', 14, 2).defaultTo(1000000);
    table.boolean('tolerance_enabled').defaultTo(false);
    table.integer('tolerance_minutes').defaultTo(15);
    table.boolean('is_current_cycle').defaultTo(true);
    table.string('status', 20).defaultTo('open');
    table.integer('calculation_start_day').defaultTo(1);
  });
}
