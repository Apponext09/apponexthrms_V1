import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_template_versions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('template_id').unsigned().notNullable();
    table.integer('version_number').notNullable();
    table.text('body_text').notNullable();
    table.text('body_html').nullable();
    table.string('sms_text', 160).nullable();
    table.json('variables'); // array of variable names
    table.bigInteger('published_by').unsigned().nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('notification_templates').onDelete('CASCADE');
    table.foreign('published_by').references('id').inTable('users').onDelete('SET NULL');

    table.unique(['template_id', 'version_number']);
    table.index('organization_id');
    table.index('template_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_template_versions');
}

