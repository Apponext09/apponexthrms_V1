import type { Knex } from 'knex';

/**
 * PayrollController.getLoanTypes/saveLoanType assume columns
 * (organization_id, uuid, deleted_at, departments, grades, employee_types,
 * is_taxable) that never existed on payroll_loan_types — the endpoint has
 * been silently returning [] and save has been throwing since it was written.
 * Backfills organization_id on the 2 seeded rows so they don't vanish once
 * tenant scoping is enforced.
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_loan_types');
  if (!hasTable) return;

  const [hasOrgId, hasUuid, hasDeletedAt, hasDepartments, hasGrades, hasEmployeeTypes, hasIsTaxable] = await Promise.all([
    knex.schema.hasColumn('payroll_loan_types', 'organization_id'),
    knex.schema.hasColumn('payroll_loan_types', 'uuid'),
    knex.schema.hasColumn('payroll_loan_types', 'deleted_at'),
    knex.schema.hasColumn('payroll_loan_types', 'departments'),
    knex.schema.hasColumn('payroll_loan_types', 'grades'),
    knex.schema.hasColumn('payroll_loan_types', 'employee_types'),
    knex.schema.hasColumn('payroll_loan_types', 'is_taxable'),
  ]);

  if (!hasOrgId || !hasUuid || !hasDeletedAt || !hasDepartments || !hasGrades || !hasEmployeeTypes || !hasIsTaxable) {
    await knex.schema.alterTable('payroll_loan_types', (table) => {
      if (!hasOrgId) table.bigInteger('organization_id').unsigned().nullable();
      if (!hasUuid) table.uuid('uuid').nullable();
      if (!hasDeletedAt) table.timestamp('deleted_at').nullable();
      if (!hasDepartments) table.json('departments').nullable();
      if (!hasGrades) table.json('grades').nullable();
      if (!hasEmployeeTypes) table.json('employee_types').nullable();
      if (!hasIsTaxable) table.boolean('is_taxable').defaultTo(false);
    });
  }

  // Backfill: the 2 seeded rows (Advance, Personal loan) predate organization_id —
  // assign them to the org this app has been testing against all session, and
  // generate a uuid, so they're visible once org-scoping is enforced.
  const orphaned = await knex('payroll_loan_types').whereNull('organization_id');
  for (const row of orphaned) {
    await knex('payroll_loan_types').where('id', row.id).update({
      organization_id: 14,
      uuid: knex.raw('COALESCE(uuid, UUID())'),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_loan_types');
  if (!hasTable) return;
  await knex.schema.alterTable('payroll_loan_types', (table) => {
    table.dropColumns('organization_id', 'uuid', 'deleted_at', 'departments', 'grades', 'employee_types', 'is_taxable');
  });
}
