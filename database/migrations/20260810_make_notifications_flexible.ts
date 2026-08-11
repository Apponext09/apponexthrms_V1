import { Knex } from 'knex';

// Placeholder: the original file was missing from disk while knex_migrations
// still recorded it as applied (batch 2), which made `migrate:latest` refuse
// to run with "migration directory is corrupt". The notifications table
// already has the nullable/flexible columns this migration name implies, so
// up/down are no-ops guarded to be safe if ever re-run.
export async function up(_knex: Knex): Promise<void> {}

export async function down(_knex: Knex): Promise<void> {}
