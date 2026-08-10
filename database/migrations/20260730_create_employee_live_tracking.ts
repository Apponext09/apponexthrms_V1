import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ---------------------------------------------------------------------------
  // Table 1: employee_live_locations
  // Real-time snapshot of each employee's current location (upserted on every ping)
  // ---------------------------------------------------------------------------
  const hasLive = await knex.schema.hasTable('employee_live_locations');
  if (!hasLive) {
    await knex.schema.createTable('employee_live_locations', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique().defaultTo(knex.raw('(UUID())'));
      table.integer('organization_id').unsigned().notNullable().references('id').inTable('organizations').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable();
      table.decimal('latitude', 10, 7).nullable();
      table.decimal('longitude', 10, 7).nullable();
      table.decimal('heading', 6, 2).nullable();
      table.decimal('speed', 8, 2).nullable();
      table.decimal('accuracy', 8, 2).nullable();
      table.string('address', 500).nullable().comment('Reverse-geocoded address cache');
      table.enum('location_status', ['ON', 'OFF']).notNullable().defaultTo('OFF');
      table.enum('connection_status', ['ONLINE', 'OFFLINE']).notNullable().defaultTo('OFFLINE');
      table.datetime('last_ping_at').nullable();
      table.datetime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.datetime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.index(['organization_id', 'employee_id'], 'idx_live_loc_org_emp');
      table.index(['organization_id', 'connection_status'], 'idx_live_loc_org_status');
      table.unique(['organization_id', 'employee_id'], 'uniq_live_loc_org_emp');
    });
  }

  // ---------------------------------------------------------------------------
  // Table 2: employee_location_history
  // Breadcrumb trail for travel history & route playback
  // ---------------------------------------------------------------------------
  const hasHistory = await knex.schema.hasTable('employee_location_history');
  if (!hasHistory) {
    await knex.schema.createTable('employee_location_history', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique().defaultTo(knex.raw('(UUID())'));
      table.integer('organization_id').unsigned().notNullable();
      table.integer('employee_id').unsigned().notNullable();
      table.decimal('latitude', 10, 7).notNullable();
      table.decimal('longitude', 10, 7).notNullable();
      table.decimal('accuracy', 8, 2).nullable();
      table.decimal('speed', 8, 2).nullable();
      table.datetime('recorded_at').notNullable();
      table.datetime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));

      table.index(['organization_id', 'employee_id', 'recorded_at'], 'idx_loc_hist_emp_time');
      table.index(['employee_id', 'recorded_at'], 'idx_loc_hist_emp_date');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_location_history');
  await knex.schema.dropTableIfExists('employee_live_locations');
}
