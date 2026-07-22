import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('appraisal_ratings', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('appraisal_id').unsigned().notNullable();
    table.bigInteger('competency_id').unsigned().notNullable();
    table.decimal('rating', 5, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('appraisal_id').references('id').inTable('appraisals');
    table.foreign('competency_id').references('id').inTable('competencies');
    table.index('organization_id');
    table.index('appraisal_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appraisal_ratings');
}

