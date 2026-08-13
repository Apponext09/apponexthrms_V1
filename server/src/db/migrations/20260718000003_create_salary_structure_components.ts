import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('salary_structure_components');
  if (exists) return;

  await knex.schema.createTable('salary_structure_components', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('structure_id').unsigned().notNullable();
    table.bigInteger('component_id').unsigned().notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('structure_id').references('salary_structures.id');
    table.foreign('component_id').references('salary_components.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['structure_id', 'component_id']);
    table.index('organization_id');
    table.index('structure_id');
    table.index('component_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_structure_components');
}



