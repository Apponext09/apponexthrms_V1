import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasApplicationsTable = await knex.schema.hasTable('applications');
  if (hasApplicationsTable) {
    const hasEmployeeId = await knex.schema.hasColumn('applications', 'employee_id');
    if (!hasEmployeeId) {
      await knex.schema.alterTable('applications', (table) => {
        table.bigInteger('employee_id').unsigned().nullable();
        table.index('employee_id');
      });
    }

    const hasCoverLetter = await knex.schema.hasColumn('applications', 'cover_letter');
    if (!hasCoverLetter) {
      await knex.schema.alterTable('applications', (table) => {
        table.text('cover_letter').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasApplicationsTable = await knex.schema.hasTable('applications');
  if (hasApplicationsTable) {
    const hasEmployeeId = await knex.schema.hasColumn('applications', 'employee_id');
    if (hasEmployeeId) {
      await knex.schema.alterTable('applications', (table) => {
        table.dropColumn('employee_id');
      });
    }

    const hasCoverLetter = await knex.schema.hasColumn('applications', 'cover_letter');
    if (hasCoverLetter) {
      await knex.schema.alterTable('applications', (table) => {
        table.dropColumn('cover_letter');
      });
    }
  }
}
