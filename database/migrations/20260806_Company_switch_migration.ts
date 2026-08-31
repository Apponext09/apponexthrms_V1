import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add is_parent column to company table if missing
  const hasIsParent = await knex.schema.hasColumn('company', 'is_parent');
  if (!hasIsParent) {
    await knex.schema.table('company', (table) => {
      table.boolean('is_parent').defaultTo(false).after('organization_id');
    });
  }

  // 2. Add company_id to target tables
  const targetTables = [
    'users',
    'employees',
    'departments',
    'designations',
    'branches',
    'cost_centers',
    'locations',
    'employee_types',
    'employee_statuses',
    'attendance_policies',
    'shift_templates',
    'leave_policies',
    'leave_types',
    'leave_applications',
    'attendance_records',
    'payroll_runs',
    'payslips',
    'jobs',
    'comp_off_balances',
    'comp_off_requests',
    'leave_approvals',
    'leave_balances',
    'leave_policy_assignments',
    'leave_accruals',
    'leave_cancellations',
    'employee_shift_assignments',
    'attendance_geofences',
    'attendance_locations',
  ];

  for (const tableName of targetTables) {
    const tableExists = await knex.schema.hasTable(tableName);
    if (tableExists) {
      const hasColumn = await knex.schema.hasColumn(tableName, 'company_id');
      if (!hasColumn) {
        await knex.schema.table(tableName, (table) => {
          table.bigInteger('company_id').unsigned().nullable().after('organization_id');
        });
      }
    }
  }

  // 3. Ensure Kosqu parent company exists for org 8
  const kosquOrg = await knex('organizations').where('id', 8).first();
  if (kosquOrg) {
    const parentCompany = await knex('company')
      .where('organization_id', 8)
      .where('is_parent', 1)
      .first();

    let parentCompanyId = parentCompany?.company_id;

    if (!parentCompany) {
      const [newId] = await knex('company').insert({
        uuid: '84875435-9164-11f1-b93f-489ebd47481b',
        organization_id: 8,
        code: kosquOrg.code || 'ORG-161',
        name: kosquOrg.name || 'Kosqu',
        is_parent: 1,
        status: 'Active',
        is_active_toggle: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      parentCompanyId = newId;
    }

    // 4. Backfill existing records to belong to Kosqu Parent scope if null
    if (parentCompanyId) {
      for (const tableName of targetTables) {
        const tableExists = await knex.schema.hasTable(tableName);
        if (tableExists) {
          await knex(tableName)
            .where('organization_id', 8)
            .whereNull('company_id')
            .update({ company_id: parentCompanyId });
        }
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const targetTables = [
    'users',
    'employees',
    'departments',
    'designations',
    'branches',
    'cost_centers',
    'locations',
    'employee_types',
    'employee_statuses',
    'attendance_policies',
    'shift_templates',
    'leave_policies',
    'leave_types',
    'leave_applications',
    'attendance_records',
    'payroll_runs',
    'payslips',
    'jobs',
  ];

  for (const tableName of targetTables) {
    const tableExists = await knex.schema.hasTable(tableName);
    if (tableExists) {
      const hasColumn = await knex.schema.hasColumn(tableName, 'company_id');
      if (hasColumn) {
        await knex.schema.table(tableName, (table) => {
          table.dropColumn('company_id');
        });
      }
    }
  }

  const hasIsParent = await knex.schema.hasColumn('company', 'is_parent');
  if (hasIsParent) {
    await knex.schema.table('company', (table) => {
      table.dropColumn('is_parent');
    });
  }
}
