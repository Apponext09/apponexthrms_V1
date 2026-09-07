import type { Knex } from 'knex';

/**
 * LEGACY TABLE — tax_investments was never wired into active tax calculation logic.
 * TaxInvestmentRepository has been removed. Migration updated to drop this table.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tax_investments');
}

export async function down(knex: Knex): Promise<void> {
  // No rollback — table is deprecated
}





