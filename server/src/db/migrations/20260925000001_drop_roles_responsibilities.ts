import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('roles_responsibilities')) {
    await knex.schema.dropTable('roles_responsibilities');
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('roles_responsibilities')) return;
  await knex.schema.createTable('roles_responsibilities', (table) => {
    table.bigIncrements('id').primary();
    table.string('uuid', 36).notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().index();
    table.bigInteger('company_id').unsigned().nullable();
    table.string('company_name', 150).nullable();
    table.bigInteger('department_id').unsigned().nullable();
    table.string('department_name', 150).nullable();
    table.bigInteger('designation_id').unsigned().nullable();
    table.string('designation_name', 150).nullable();
    table.bigInteger('kra_form_id').unsigned().nullable();
    table.string('kra_form', 150).nullable();
    table.text('responsibilities').notNullable();
    table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
    table.bigInteger('created_by').unsigned().nullable();
    table.bigInteger('updated_by').unsigned().nullable();
    table.datetime('created_at').notNullable();
    table.datetime('updated_at').notNullable();
    table.datetime('deleted_at').nullable();
  });
}
