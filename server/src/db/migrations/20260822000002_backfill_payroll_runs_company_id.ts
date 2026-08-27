import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Ensure company_id column exists on payroll_runs
  const hasRunsCompanyId = await knex.schema.hasColumn('payroll_runs', 'company_id');
  if (!hasRunsCompanyId) {
    await knex.schema.table('payroll_runs', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
  }

  // 2. Ensure company_id column exists on payslips
  const hasPayslipsCompanyId = await knex.schema.hasColumn('payslips', 'company_id');
  if (!hasPayslipsCompanyId) {
    await knex.schema.table('payslips', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
  }

  // 3. Backfill payroll_runs.company_id from payroll_cycles where available
  await knex.raw(`
    UPDATE payroll_runs pr
    JOIN payroll_cycles pc ON pr.payroll_cycle_id = pc.id
    SET pr.company_id = pc.company_id
    WHERE pr.company_id IS NULL AND pc.company_id IS NOT NULL;
  `).catch(() => {});

  // 4. Backfill remaining payroll_runs.company_id from organization's parent company or first company
  const nullRuns = await knex('payroll_runs').whereNull('company_id');
  for (const r of nullRuns) {
    const parentComp = await knex('company')
      .where('organization_id', r.organization_id)
      .where('is_parent', 1)
      .first()
      .catch(() => null)
      || await knex('company')
      .where('organization_id', r.organization_id)
      .orderBy('company_id', 'asc')
      .first()
      .catch(() => null);

    if (parentComp?.company_id) {
      await knex('payroll_runs')
        .where('id', r.id)
        .update({ company_id: parentComp.company_id });
    }
  }

  // 5. Backfill payslips.company_id from employee or run
  await knex.raw(`
    UPDATE payslips ps
    JOIN employees e ON ps.employee_id = e.id
    SET ps.company_id = e.company_id
    WHERE ps.company_id IS NULL AND e.company_id IS NOT NULL;
  `).catch(() => {});

  await knex.raw(`
    UPDATE payslips ps
    JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
    SET ps.company_id = pr.company_id
    WHERE ps.company_id IS NULL AND pr.company_id IS NOT NULL;
  `).catch(() => {});
}

export async function down(knex: Knex): Promise<void> {
  // No destructive down required
}
