import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_encashment_settings');
  if (exists) return;

  await knex.schema.createTable('leave_encashment_settings', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('formula', 255).notNullable();
    table.decimal('limit', 10, 2).nullable();
    table.boolean('is_active').defaultTo(true);
    table.json('employment').nullable();
    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_encashment_settings');
}
