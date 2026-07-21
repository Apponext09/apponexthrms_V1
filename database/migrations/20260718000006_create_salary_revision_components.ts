import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('salary_revision_components', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('revision_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().notNullable();
    table.decimal('old_value', 12, 2).notNullable();
    table.decimal('new_value', 12, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('revision_id').references('salary_revisions.id');
    table.foreign('component_id').references('salary_components.id');
    table.index('organization_id');
    table.index('revision_id');
    table.index('component_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_revision_components');
}



