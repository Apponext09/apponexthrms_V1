import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTargetClosure = await knex.schema.hasColumn('mrf_requests', 'target_closure_date');
  if (!hasTargetClosure) {
    await knex.schema.alterTable('mrf_requests', (table) => {
      table.date('target_closure_date').nullable();
    });
  }

  const hasExpiryDate = await knex.schema.hasColumn('mrf_requests', 'expiry_date');
  if (!hasExpiryDate) {
    await knex.schema.alterTable('mrf_requests', (table) => {
      table.date('expiry_date').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTargetClosure = await knex.schema.hasColumn('mrf_requests', 'target_closure_date');
  if (hasTargetClosure) {
    await knex.schema.alterTable('mrf_requests', (table) => {
      table.dropColumn('target_closure_date');
    });
  }

  const hasExpiryDate = await knex.schema.hasColumn('mrf_requests', 'expiry_date');
  if (hasExpiryDate) {
    await knex.schema.alterTable('mrf_requests', (table) => {
      table.dropColumn('expiry_date');
    });
  }
}
