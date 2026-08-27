import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTemplatesTable = await knex.schema.hasTable('id_card_templates');
  if (!hasTemplatesTable) {
    await knex.schema.createTable('id_card_templates', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').unsigned().notNullable().index();
      table.string('name', 255).notNullable().defaultTo('Default ID Card Template');
      table.text('description').nullable();
      table.boolean('is_default').defaultTo(false).index();
      table.enum('status', ['draft', 'published']).defaultTo('published').index();
      table.integer('version').defaultTo(1);
      table.json('applies_to').nullable(); // { departments: [], employeeTypes: [], locations: [], grades: [] }
      table.json('config_json').notNullable();
      table.integer('created_by').unsigned().nullable();
      table.integer('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable().index();
    });
  }

  const hasVersionsTable = await knex.schema.hasTable('id_card_template_versions');
  if (!hasVersionsTable) {
    await knex.schema.createTable('id_card_template_versions', (table) => {
      table.increments('id').primary();
      table.integer('template_id').unsigned().notNullable().index();
      table.integer('organization_id').unsigned().notNullable().index();
      table.integer('version_number').notNullable();
      table.json('config_json').notNullable();
      table.text('changelog').nullable();
      table.integer('created_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('template_id').references('id').inTable('id_card_templates').onDelete('CASCADE');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('id_card_template_versions');
  await knex.schema.dropTableIfExists('id_card_templates');
}
