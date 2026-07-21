import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().nullable();
    table.string('email', 255).notNullable();
    table.string('mobile', 20).nullable();
    table.string('mobile_country_code', 10).nullable();
    table.string('password_hash', 255).nullable();
    table.enum('status', ['active', 'inactive', 'suspended', 'deleted']).defaultTo('active');
    table.timestamp('email_verified_at').nullable();
    table.timestamp('mobile_verified_at').nullable();
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255).nullable();
    table.json('mfa_recovery_codes').nullable();
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamp('last_password_changed_at').nullable();
    table.boolean('must_change_password').defaultTo(false);
    table.bigInteger('created_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');

    table.unique(['organization_id', 'email']);
    table.unique(['organization_id', 'mobile']);
    table.index('organization_id');
    table.index('email');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}


