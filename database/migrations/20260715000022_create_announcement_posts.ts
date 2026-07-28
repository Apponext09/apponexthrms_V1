import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('announcement_posts');
  if (exists) return;

  await knex.schema.createTable('announcement_posts', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.string('featured_image_url', 500).nullable();
    table.enum('visibility_level', ['all_employees', 'department', 'role_specific']).defaultTo('all_employees');
    table.json('visible_to_departments').nullable(); // array of department IDs
    table.json('visible_to_roles').nullable(); // array of role IDs
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.enum('priority', ['low', 'normal', 'high']).defaultTo('normal');
    table.bigInteger('published_by').unsigned().nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('expires_at').nullable();
    table.boolean('allow_comments').defaultTo(true);
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('published_by').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('updated_by').references('id').inTable('users').onDelete('RESTRICT');

    table.index('organization_id');
    table.index('status');
    table.index('priority');
    table.index('published_at');
    table.index('visibility_level');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('announcement_posts');
}


