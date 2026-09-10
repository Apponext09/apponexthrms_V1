import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Dummy file to fix corrupt knex_migrations table. 
  // The actual migration was likely deleted from the codebase but remains in DB.
}

export async function down(knex: Knex): Promise<void> {
  // Nothing to do
}
