import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Migration already applied to DB schema
}

export async function down(knex: Knex): Promise<void> {
  // No-op rollback
}
