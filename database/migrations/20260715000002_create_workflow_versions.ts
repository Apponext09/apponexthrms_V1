import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_versions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('workflow_id').unsigned().notNullable();
    table.integer('version_number').notNullable();
    table.enum('status', ['draft', 'published']).defaultTo('draft');
    table.text('description').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('published_by').unsigned().nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('workflow_id').references('workflows.id');
    table.foreign('created_by').references('users.id');
    table.foreign('published_by').references('users.id');
    table.unique(['workflow_id', 'version_number']);
    table.index('organization_id');
    table.index('workflow_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_versions');
}



