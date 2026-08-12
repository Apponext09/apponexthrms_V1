import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasAllocation = await knex.schema.hasColumn('leave_types', 'allocation_settings');
  const hasApplication = await knex.schema.hasColumn('leave_types', 'application_settings');
  const hasPayroll = await knex.schema.hasColumn('leave_types', 'payroll_settings');
  const hasEmpAlloc = await knex.schema.hasColumn('leave_types', 'employment_allocation_settings');
  const hasEmpApp = await knex.schema.hasColumn('leave_types', 'employment_application_settings');
  const hasEncashment = await knex.schema.hasColumn('leave_types', 'encashment_settings');
  const hasClassification = await knex.schema.hasColumn('leave_types', 'leave_classification');

  await knex.schema.alterTable('leave_types', (table) => {
    if (!hasAllocation) {
      table.json('allocation_settings').nullable();
    }
    if (!hasApplication) {
      table.json('application_settings').nullable();
    }
    if (!hasPayroll) {
      table.json('payroll_settings').nullable();
    }
    if (!hasEmpAlloc) {
      table.json('employment_allocation_settings').nullable();
    }
    if (!hasEmpApp) {
      table.json('employment_application_settings').nullable();
    }
    if (!hasEncashment) {
      table.json('encashment_settings').nullable();
    }
    if (!hasClassification) {
      table.string('leave_classification', 100).defaultTo('uncategorized');
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_types', (table) => {
    table.dropColumn('allocation_settings');
    table.dropColumn('application_settings');
    table.dropColumn('payroll_settings');
    table.dropColumn('employment_allocation_settings');
    table.dropColumn('employment_application_settings');
    table.dropColumn('encashment_settings');
    table.dropColumn('leave_classification');
  });
}
