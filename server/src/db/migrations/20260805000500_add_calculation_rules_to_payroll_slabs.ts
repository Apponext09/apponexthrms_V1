import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSlabs = await knex.schema.hasTable('payroll_slabs');
  if (hasSlabs) {
    const hasPfRate = await knex.schema.hasColumn('payroll_slabs', 'pf_rate_pct');
    if (!hasPfRate) {
      await knex.schema.alterTable('payroll_slabs', (table) => {
        table.decimal('pf_rate_pct', 5, 2).defaultTo(12.00);
        table.json('pt_tiers').nullable();
        table.json('rules_config').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSlabs = await knex.schema.hasTable('payroll_slabs');
  if (hasSlabs) {
    await knex.schema.alterTable('payroll_slabs', (table) => {
      table.dropColumn('pf_rate_pct');
      table.dropColumn('pt_tiers');
      table.dropColumn('rules_config');
    });
  }
}
