import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('setting_versions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('entity_type', 100).notNullable();
    table.bigInteger('entity_id').unsigned().notNullable();
    table.integer('version_number').notNullable();
    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.enum('change_type', ['create', 'update', 'delete', 'restore']).defaultTo('update');
    table.bigInteger('changed_by_user_id').unsigned().notNullable();
    table.string('change_reason', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('changed_by_user_id').references('users.id');
    table.index('organization_id');
    table.index(['entity_type', 'entity_id']);
    table.index('change_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('setting_versions');
}



