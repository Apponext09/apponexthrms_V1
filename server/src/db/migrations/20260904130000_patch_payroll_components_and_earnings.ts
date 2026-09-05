import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCompTable = await knex.schema.hasTable('payroll_components');
  if (hasCompTable) {
    const hasModuleSource = await knex.schema.hasColumn('payroll_components', 'module_source');
    if (!hasModuleSource) {
      await knex.schema.alterTable('payroll_components', (table) => {
        table.string('module_source', 100).nullable();
      });
    }
  }

  const hasEarningsTable = await knex.schema.hasTable('payroll_earnings');
  if (hasEarningsTable) {
    const hasCompName = await knex.schema.hasColumn('payroll_earnings', 'component_name');
    if (!hasCompName) {
      await knex.schema.alterTable('payroll_earnings', (table) => {
        table.string('component_name', 255).nullable();
        table.string('group_name', 255).nullable();
        table.boolean('is_non_cashable').defaultTo(false);
      });
    }
  }

  const hasSlabCompTable = await knex.schema.hasTable('payroll_slab_components');
  if (hasSlabCompTable) {
    const hasOrgId = await knex.schema.hasColumn('payroll_slab_components', 'organization_id');
    if (!hasOrgId) {
      await knex.schema.alterTable('payroll_slab_components', (table) => {
        table.bigInteger('organization_id').unsigned().nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Non-destructive rollback
}
