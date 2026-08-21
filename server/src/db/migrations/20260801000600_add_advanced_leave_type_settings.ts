import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasLeaveTypes = await knex.schema.hasTable('leave_types');
  
  if (hasLeaveTypes) {
    const hasCol = await knex.schema.hasColumn('leave_types', 'leave_classification');
    if (!hasCol) {
      await knex.schema.alterTable('leave_types', (table) => {
        // Leave Classification: 'calendar' | 'non-calendar' | 'uncategorized'
        table.string('leave_classification', 50).nullable().defaultTo('uncategorized');
        
        // Advanced configuration JSON fields
        table.json('allocation_settings').nullable();
        table.json('application_settings').nullable();
        table.json('payroll_settings').nullable();
        table.json('employment_allocation_settings').nullable();
        table.json('employment_application_settings').nullable();
        table.json('encashment_settings').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLeaveTypes = await knex.schema.hasTable('leave_types');
  
  if (hasLeaveTypes) {
    await knex.schema.alterTable('leave_types', (table) => {
      table.dropColumn('leave_classification');
      table.dropColumn('allocation_settings');
      table.dropColumn('application_settings');
      table.dropColumn('payroll_settings');
      table.dropColumn('employment_allocation_settings');
      table.dropColumn('employment_application_settings');
      table.dropColumn('encashment_settings');
    });
  }
}
