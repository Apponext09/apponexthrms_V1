import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('resource_plans');
  if (!hasTable) {
    await knex.schema.createTable('resource_plans', (table) => {
      table.string('id').primary(); // UI uses string IDs
      table.string('company_id').notNullable();
      table.string('location_id').nullable();
      table.string('department_id').notNullable();
      table.string('designation_id').notNullable();
      table.integer('staff_required').notNullable().defaultTo(1);
      table.string('status').notNullable().defaultTo('active');
      
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('resource_plans');
}
