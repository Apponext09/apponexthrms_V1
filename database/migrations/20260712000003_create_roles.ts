import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().nullable();
    table.string('name', 100).notNullable();
    table.string('code', 50).notNullable();
    table.string('description', 500).nullable();
    table.boolean('is_system').defaultTo(false);
    table.boolean('is_platform_role').defaultTo(false);
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    table.unique(['organization_id', 'code']);
    table.index('organization_id');
    table.index('code');

    // Check constraint: organization_id NOT NULL OR is_platform_role = TRUE
    // MySQL doesn't support CHECK with OR, so we handle this in application logic
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}

