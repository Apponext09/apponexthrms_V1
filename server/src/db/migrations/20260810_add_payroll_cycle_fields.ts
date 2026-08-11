import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_cycles');
  if (!hasTable) return;

  // Add new fields to payroll_cycles table (Hoshi-style fields)
  const hasFrequency = await knex.schema.hasColumn('payroll_cycles', 'frequency');
  if (!hasFrequency) {
    await knex.schema.alterTable('payroll_cycles', (table) => {
      table.string('frequency', 50).defaultTo('Monthly').comment('Monthly, Bi-monthly, Semi-Monthly, Weekly, Bi-Weekly');
      table.integer('start_date').defaultTo(1).comment('Day of month calculation starts');
      table.integer('start_date_2').nullable().comment('For Bi-monthly: 2nd cycle start date');
      table.string('start_day', 20).nullable().comment('For Weekly: Mon/Tue/Wed/Thu/Fri/Sat/Sun');
      table.integer('cutoff_day').defaultTo(25).comment('Attendance data accepted till this day');
      table.string('cutoff_day_name', 20).nullable().comment('For Weekly: day name for cutoff');
      table.string('month_offset', 20).defaultTo('Current').comment('Current, Previous, Next month');
      table.string('total_days_calc', 50).defaultTo('30').comment('30, Month-Days, WorkDays, etc.');
      table.decimal('cap_amount', 14, 2).defaultTo(1000000).comment('Payroll calculation cap');
      table.boolean('is_daily_wages').defaultTo(false);
      table.boolean('daily_wages_include_paid_holidays').defaultTo(false);
      table.boolean('daily_wages_include_week_off').defaultTo(false);
      table.boolean('tolerance_enabled').defaultTo(false);
      table.integer('tolerance_minutes').defaultTo(15);
      table.boolean('is_active').defaultTo(true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_cycles');
  if (!hasTable) return;

  await knex.schema.alterTable('payroll_cycles', (table) => {
    table.dropColumns(
      'frequency', 'start_date', 'start_date_2', 'start_day',
      'cutoff_day', 'cutoff_day_name', 'month_offset', 'total_days_calc',
      'cap_amount', 'is_daily_wages', 'daily_wages_include_paid_holidays',
      'daily_wages_include_week_off', 'tolerance_enabled', 'tolerance_minutes', 'is_active'
    );
  });
}
