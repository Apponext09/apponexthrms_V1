import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ---------------------------------------------------------------------------
  // employee_tracking_sessions
  // One row per employee per day — aggregated daily metrics
  // (recalculated from employee_location_history on every breadcrumb write)
  // ---------------------------------------------------------------------------
  const hasTable = await knex.schema.hasTable('employee_tracking_sessions');
  if (!hasTable) {
    await knex.schema.createTable('employee_tracking_sessions', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique().defaultTo(knex.raw('(UUID())'));
      table.integer('organization_id').unsigned().notNullable();
      table.integer('employee_id').unsigned().notNullable();
      table.date('session_date').notNullable().comment('YYYY-MM-DD date of the session');

      // Timing
      table.datetime('session_start').nullable().comment('First location ping of the day');
      table.datetime('session_end').nullable().comment('Last location ping of the day');
      table.integer('total_working_minutes').unsigned().notNullable().defaultTo(0)
        .comment('session_end - session_start - total_break_minutes');
      table.integer('total_break_minutes').unsigned().notNullable().defaultTo(0)
        .comment('Sum of all stationary cluster durations >= 90s');
      table.integer('break_count').unsigned().notNullable().defaultTo(0)
        .comment('Number of distinct break/stop events detected');

      // Distance
      table.decimal('total_distance_km', 10, 4).unsigned().notNullable().defaultTo(0)
        .comment('Sum of haversine distances between consecutive breadcrumbs');

      // Breadcrumb count
      table.integer('ping_count').unsigned().notNullable().defaultTo(0)
        .comment('Total number of location pings recorded for this session');

      table.datetime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.datetime('updated_at').notNullable().defaultTo(
        knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      );

      table.unique(['organization_id', 'employee_id', 'session_date'], 'uniq_tracking_session');
      table.index(['organization_id', 'session_date'], 'idx_tracking_session_org_date');
      table.index(['employee_id', 'session_date'], 'idx_tracking_session_emp_date');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_tracking_sessions');
}
