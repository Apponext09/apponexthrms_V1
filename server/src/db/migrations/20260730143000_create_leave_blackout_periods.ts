import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_blackout_periods');
  if (!exists) {
    await knex.schema.createTable('leave_blackout_periods', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.string('reason', 255).notNullable();
      table.bigInteger('applicable_location_id').unsigned().nullable();
      table.bigInteger('applicable_department_id').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('applicable_location_id').references('locations.id');
      table.foreign('applicable_department_id').references('departments.id');

      table.index('organization_id');
      table.index(['start_date', 'end_date']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_blackout_periods');
}
