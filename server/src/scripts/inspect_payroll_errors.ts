import { initializeKnex, getKnex } from '../db/knex.js';

async function main() {
  initializeKnex();
  const db = getKnex();
  try {
    console.log('Querying payroll_run_employees with error status...');
    const errors = await db('payroll_run_employees')
      .where('status', 'error')
      .select('id', 'payroll_run_id', 'employee_id', 'status', 'processing_notes', 'updated_at')
      .orderBy('updated_at', 'desc')
      .limit(10);
    
    console.log('Found errors:', JSON.stringify(errors, null, 2));

    console.log('\nQuerying last 5 payroll runs...');
    const runs = await db('payroll_runs')
      .select('id', 'organization_id', 'payroll_cycle_id', 'month', 'status', 'processed_employees', 'error_count', 'updated_at')
      .orderBy('updated_at', 'desc')
      .limit(5);
    console.log('Last runs:', JSON.stringify(runs, null, 2));

  } catch (err: any) {
    console.error('Error querying DB:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
