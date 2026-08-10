import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_summaries');
  if (exists) return;

  await knex.schema.createTable('attendance_summaries', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('summary_month').notNullable(); // first day of month
    table.integer('present_days').defaultTo(0);
    table.integer('absent_days').defaultTo(0);
    table.integer('half_days').defaultTo(0);
    table.integer('sick_days').defaultTo(0);
    table.integer('work_from_home_days').defaultTo(0);
    table.integer('late_arrivals').defaultTo(0);
    table.integer('early_departures').defaultTo(0);
    table.decimal('overtime_hours', 6, 2).defaultTo(0);
    table.decimal('total_work_hours', 6, 2).defaultTo(0);
    table.decimal('avg_daily_hours', 4, 2).defaultTo(0);
    table.decimal('attendance_percentage', 5, 2).defaultTo(0);

    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');

    table.unique(['organization_id', 'employee_id', 'summary_month'], { indexName: 'att_summary_month_unique' });
    table.index('organization_id');
    table.index('employee_id');
    table.index('summary_month');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_summaries');
}



