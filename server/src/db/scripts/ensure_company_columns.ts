import { getKnex } from '../knex';

async function run() {
  const knex = getKnex();

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
    'grades',
    'breaks',
    'kra_forms',
    'roles_responsibilities',
    'resource_plans',
    'events',
    'notification_merge_codes',
    'notification_templates',
  ];

  console.log('Ensuring company_id column on all tables...');

  for (const tableName of targetTables) {
    const tableExists = await knex.schema.hasTable(tableName);
    if (tableExists) {
      const hasColumn = await knex.schema.hasColumn(tableName, 'company_id');
      if (!hasColumn) {
        await knex.schema.table(tableName, (table) => {
          table.bigInteger('company_id').unsigned().nullable().after('organization_id');
        });
        console.log(`Added company_id column to ${tableName}`);
      } else {
        console.log(`company_id already exists on ${tableName}`);
      }
    }
  }

  console.log('Finished ensuring company_id columns!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
