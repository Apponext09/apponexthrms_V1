import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add company_id to payroll_cycles
  const hasCyclesCompanyId = await knex.schema.hasColumn('payroll_cycles', 'company_id');
  if (!hasCyclesCompanyId) {
    await knex.schema.alterTable('payroll_cycles', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
  }

  // 2. Add company_id to payroll_slabs
  const hasSlabsCompanyId = await knex.schema.hasColumn('payroll_slabs', 'company_id');
  if (!hasSlabsCompanyId) {
    await knex.schema.alterTable('payroll_slabs', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCyclesCompanyId = await knex.schema.hasColumn('payroll_cycles', 'company_id');
  if (hasCyclesCompanyId) {
    await knex.schema.alterTable('payroll_cycles', (table) => {
      table.dropColumn('company_id');
    });
  }

  const hasSlabsCompanyId = await knex.schema.hasColumn('payroll_slabs', 'company_id');
  if (hasSlabsCompanyId) {
    await knex.schema.alterTable('payroll_slabs', (table) => {
      table.dropColumn('company_id');
    });
  }
}
