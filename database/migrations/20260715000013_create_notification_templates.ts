import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notification_templates');
  if (exists) return;

  await knex.schema.createTable('notification_templates', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('template_code', 100).notNullable();
    table.string('template_name', 255).notNullable();
    table.text('template_description').nullable();
    table.enum('category', [
      'leave_approval',
      'attendance',
      'asset',
      'workflow',
      'payroll',
      'announcement',
      'system',
    ]).notNullable();
    table.json('channels'); // array
    table.string('subject_line', 255).nullable();
    table.text('body_text').notNullable();
    table.text('body_html').nullable();
    table.string('sms_text', 160).nullable();
    table.string('whatsapp_template_name', 100).nullable();
    table.json('variables'); // array of variable names
    table.integer('version_number').defaultTo(1);
    table.boolean('is_published').defaultTo(false);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.unique(['organization_id', 'template_code']);
    table.index('organization_id');
    table.index('category');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_templates');
}


