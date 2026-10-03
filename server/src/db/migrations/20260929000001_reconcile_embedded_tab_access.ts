import type { Knex } from 'knex';
import { up as reconcileTabAccess } from './20260928000005_reconcile_tab_access_flows.js';

/**
 * Re-run the idempotent reconciliation for embedded feature pages added after
 * the first parent/child rollout (leave settings, leave sub-pages, notification
 * preferences, and policy queries).
 */
export async function up(knex: Knex): Promise<void> {
  await reconcileTabAccess(knex);
}

export async function down(_knex: Knex): Promise<void> {
  // Never revoke access that may have been intentionally retained or edited.
}
