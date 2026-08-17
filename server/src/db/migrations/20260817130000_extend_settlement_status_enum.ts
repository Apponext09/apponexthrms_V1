import { Knex } from 'knex';

// full_final_settlements.status was a MySQL ENUM restricted to
// ('draft','submitted','approved','processed') — it had no 'exit_requested'
// or 'rejected' value at all. SettlementService.submitExitRequest and
// adminRejectSettlement both write those exact strings; every insert/update
// attempting to use them fails with "Data truncated for column 'status'".
// This is why submitExitRequest was dead code (PayrollController routed
// around it to createSettlement, which only ever writes 'draft') and why
// rejecting a settlement silently reset it to 'draft' instead of a real
// rejected state — both were built to work around a status value the
// column was never widened to actually accept.
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('full_final_settlements');
  if (!hasTable) return;

  await knex.raw(`
    ALTER TABLE full_final_settlements
    MODIFY COLUMN status ENUM('draft','exit_requested','submitted','approved','rejected','processed')
    NOT NULL DEFAULT 'draft'
  `);
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('full_final_settlements');
  if (!hasTable) return;
  // Not reversible without knowing whether any row now uses the new values —
  // narrowing the enum back could itself fail or silently truncate data.
}
