import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('login_history');
  if (exists) return;

  await knex.schema.createTable('login_history', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().nullable();
    table.bigInteger('user_id').unsigned().nullable();
    table.string('email_attempted', 255).notNullable();
    table.enum('login_method', ['password', 'otp_email', 'otp_sms', 'sso_google', 'sso_microsoft', 'mfa_totp']).notNullable();
    table.enum('status', ['success', 'failed_password', 'failed_otp', 'failed_mfa', 'blocked_ip', 'account_locked']).notNullable();
    table.string('ip_address', 45).notNullable();
    table.text('user_agent').nullable();
    table.string('device_id', 255).nullable();
    table.bigInteger('session_id').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('session_id').references('id').inTable('auth_sessions').onDelete('CASCADE');

    table.index('user_id');
    table.index(['organization_id', 'created_at']);
    table.index('email_attempted');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('login_history');
}
