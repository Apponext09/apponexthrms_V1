import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasEmpIds = await knex.schema.hasColumn('policy_documents', 'applicable_employee_ids');
  if (!hasEmpIds) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.text('applicable_employee_ids').nullable();
      table.text('applicable_designation_ids').nullable();
      table.text('custom_scope').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasEmpIds = await knex.schema.hasColumn('policy_documents', 'applicable_employee_ids');
  if (hasEmpIds) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.dropColumn('applicable_employee_ids');
      table.dropColumn('applicable_designation_ids');
      table.dropColumn('custom_scope');
    });
  }
}
