import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasHasCredentials = await knex.schema.hasColumn('company', 'has_credentials');
  const hasFullName       = await knex.schema.hasColumn('company', 'full_name');
  const hasLoginEmail     = await knex.schema.hasColumn('company', 'login_email');
  const hasPasswordHash   = await knex.schema.hasColumn('company', 'password_hash');

  await knex.schema.alterTable('company', (table) => {
    if (!hasHasCredentials) {
      table.boolean('has_credentials').defaultTo(false).notNullable();
    }
    if (!hasFullName) {
      table.string('full_name', 255).nullable();
    }
    if (!hasLoginEmail) {
      table.string('login_email', 255).nullable();
    }
    if (!hasPasswordHash) {
      table.text('password_hash').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('company', (table) => {
    table.dropColumn('has_credentials');
    table.dropColumn('full_name');
    table.dropColumn('login_email');
    table.dropColumn('password_hash');
  });
}
