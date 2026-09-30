import type { Knex } from 'knex';

// Settings data that belongs to the active company rather than the whole tenant.
const COMPANY_OWNED_TABLES = [
  'events',
  'holiday_calendars',
  'notification_templates',
  'late_deduction_policies',
  'late_updations',
  'late_auto_deduction_logs',
] as const;

export async function up(knex: Knex): Promise<void> {
  for (const tableName of COMPANY_OWNED_TABLES) {
    if (!(await knex.schema.hasTable(tableName))) continue;

    if (!(await knex.schema.hasColumn(tableName, 'company_id'))) {
      await knex.schema.alterTable(tableName, (table) => {
        table.bigInteger('company_id').unsigned().nullable().index().after('organization_id');
      });
    }

    // Preserve legacy rows by assigning them to their organization's parent
    // company (or first company when no parent flag is available).
    const organizations = await knex(tableName)
      .whereNull('company_id')
      .whereNotNull('organization_id')
      .distinct('organization_id');

    for (const row of organizations) {
      let companyQuery = knex('company')
        .where('organization_id', row.organization_id)
        .whereNull('deleted_at');

      if (await knex.schema.hasColumn('company', 'is_parent')) {
        companyQuery = companyQuery.orderBy('is_parent', 'desc');
      }

      const company = await companyQuery.orderBy('company_id', 'asc').first('company_id');
      if (company?.company_id) {
        await knex(tableName)
          .where('organization_id', row.organization_id)
          .whereNull('company_id')
          .update({ company_id: company.company_id });
      }
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Deliberately non-destructive: company_id may pre-date this migration.
}
