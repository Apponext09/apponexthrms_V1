import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('otp_codes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().nullable();
    table.bigInteger('user_id').unsigned().nullable();
    table.enum('channel', ['email', 'sms']).notNullable();
    table.enum('purpose', ['login', 'mfa_backup', 'email_verification', 'mobile_verification', 'password_reset']).notNullable();
    table.string('destination', 255).notNullable();
    table.string('code_hash', 255).notNullable();
    table.integer('attempts').defaultTo(0);
    table.integer('max_attempts').defaultTo(5);
    table.timestamp('expires_at').notNullable();
    table.timestamp('consumed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    table.index(['user_id', 'purpose']);
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('otp_codes');
}
