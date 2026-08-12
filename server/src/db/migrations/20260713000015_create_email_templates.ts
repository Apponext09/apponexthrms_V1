import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('email_templates');
  if (exists) return;

  await knex.schema.createTable('email_templates', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.enum('template_type', ['offer_letter', 'welcome_email', 'leave_approval', 'attendance_alert', 'custom']).defaultTo('custom');
    table.string('template_name', 150).notNullable();
    table.string('subject', 255).notNullable();
    table.text('body_html').notNullable();
    table.json('placeholders').nullable();
    table.boolean('is_default').defaultTo(false);
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('template_type');
    table.index('is_default');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_templates');
}





