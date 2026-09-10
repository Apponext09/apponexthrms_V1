import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('super_admins');
  if (hasTable) return;

  await knex.schema.createTable('super_admins', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('user_id').unsigned().nullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).defaultTo('Super');
    table.string('last_name', 100).defaultTo('Admin');
    table.string('phone', 20).nullable();
    table.text('avatar_url').nullable();
    table.enum('access_level', ['owner', 'superadmin', 'auditor']).defaultTo('superadmin');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.index('email');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('super_admins');
}
