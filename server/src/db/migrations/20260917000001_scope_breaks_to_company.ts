import type { Knex } from 'knex';

const COMPANY_SCOPED_MASTER_TABLES = [
  'breaks', 'locations', 'departments', 'branches', 'designations', 'grades',
  'employee_types', 'employee_statuses', 'cost_centers', 'leave_types',
  'leave_policies', 'attendance_policies', 'roles_responsibilities', 'kra_forms',
  'notification_templates', 'notification_merge_codes', 'shift_templates',
];

export async function up(knex: Knex): Promise<void> {
  for (const tableName of COMPANY_SCOPED_MASTER_TABLES) {
    if (!await knex.schema.hasTable(tableName) || !await knex.schema.hasColumn(tableName, 'organization_id')) continue;

    if (!await knex.schema.hasColumn(tableName, 'company_id')) {
      await knex.schema.alterTable(tableName, (table) => {
        table.bigInteger('company_id').unsigned().nullable().index().after('organization_id');
      });
    }

    // Legacy organization-level records are assigned to the organization’s
    // parent/first company instead of being visible to every sibling company.
    const organizations = await knex(tableName).whereNull('company_id').distinct('organization_id');
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
  // Intentionally no-op: many of these tables may already have company_id from
  // earlier migrations, so a rollback must never remove an existing data column.
}
