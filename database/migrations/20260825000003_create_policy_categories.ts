import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_categories');
  if (!hasTable) {
    await knex.schema.createTable('policy_categories', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id', 'deleted_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('policy_categories');
}
