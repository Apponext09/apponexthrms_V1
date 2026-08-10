import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('password_policies');
  if (exists) return;

  await knex.schema.createTable('password_policies', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable().unique();
    table.integer('min_length').defaultTo(8);
    table.boolean('require_uppercase').defaultTo(true);
    table.boolean('require_lowercase').defaultTo(true);
    table.boolean('require_number').defaultTo(true);
    table.boolean('require_special_char').defaultTo(true);
    table.integer('password_expiry_days').nullable();
    table.integer('password_history_count').defaultTo(3);
    table.integer('max_failed_attempts').defaultTo(5);
    table.integer('lockout_duration_minutes').defaultTo(30);
    table.integer('session_timeout_minutes').defaultTo(30);
    table.boolean('mfa_required').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

    table.index('organization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_policies');
}
