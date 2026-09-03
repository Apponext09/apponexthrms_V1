import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('grades');
  if (!hasTable) {
    await knex.schema.createTable('grades', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      
      table.string('name', 150).notNullable();
      table.string('code', 50).notNullable();
      table.text('description', 'longtext').nullable();
      table.string('color', 20).nullable();
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('code');
      table.index('status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('grades');
}
