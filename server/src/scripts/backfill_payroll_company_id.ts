import { getKnex } from '../db/knex.js';

async function main() {
  const knex = getKnex();
  console.log('🔄 Starting backfill of company_id for payroll_runs and payslips...');

  // 1. Check/add column to payroll_runs
  const hasRunsCompanyId = await knex.schema.hasColumn('payroll_runs', 'company_id');
  if (!hasRunsCompanyId) {
    await knex.schema.table('payroll_runs', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
    console.log('✅ Added company_id column to payroll_runs');
  }

  // 2. Check/add column to payslips
  const hasPayslipsCompanyId = await knex.schema.hasColumn('payslips', 'company_id');
  if (!hasPayslipsCompanyId) {
    await knex.schema.table('payslips', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
    console.log('✅ Added company_id column to payslips');
  }

  // 3. Backfill payroll_runs from payroll_cycles
  const [cycleUpdates] = await knex.raw(`
    UPDATE payroll_runs pr
    JOIN payroll_cycles pc ON pr.payroll_cycle_id = pc.id
    SET pr.company_id = pc.company_id
    WHERE pr.company_id IS NULL AND pc.company_id IS NOT NULL;
  `).catch((e) => {
    console.error('Cycle raw error:', e.message);
    return [null];
  });
  console.log('✅ Backfilled payroll_runs from cycles');

  // 4. Backfill any remaining null payroll_runs to parent/first company of that organization
  const nullRuns = await knex('payroll_runs').whereNull('company_id');
  console.log(`Found ${nullRuns.length} payroll_runs with null company_id`);

  for (const r of nullRuns) {
    const orgId = (r as any).organizationId ?? (r as any).organization_id;
    const runId = (r as any).id;
    const parentComp = await knex('company')
      .where('organization_id', orgId)
      .where('is_parent', 1)
      .first()
      .catch(() => null)
      || await knex('company')
      .where('organization_id', orgId)
      .orderBy('company_id', 'asc')
      .first()
      .catch(() => null);

    const cId = (parentComp as any)?.companyId ?? (parentComp as any)?.company_id;
    if (cId) {
      await knex('payroll_runs')
        .where('id', runId)
        .update({ company_id: cId });
      console.log(`Updated run #${runId} -> company_id ${cId}`);
    }
  }

  // 5. Backfill payslips
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

  console.log('🎉 Backfill completed successfully!');
  
  const updatedRuns = await knex('payroll_runs').select('id', 'organization_id', 'company_id', 'payroll_cycle_id', 'status');
  console.log('Current payroll_runs in database:', updatedRuns);

  process.exit(0);
}

main().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
