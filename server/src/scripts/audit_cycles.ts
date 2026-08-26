import { getKnex } from '../db/knex.js';

async function main() {
  const db = getKnex();
  try {
    console.log('=== 1. PAYROLL CYCLES TABLE INFO ===');
    const cols = await db.raw("DESCRIBE payroll_cycles");
    console.log('Columns:', (cols[0] || []).map((c: any) => c.Field));

    console.log('=== 2. ALL CYCLES IN DB ===');
    const cycles = await db('payroll_cycles').whereNull('deleted_at');
    console.log('Cycles count:', cycles.length);
    console.log(JSON.stringify(cycles, null, 2));

    console.log('=== 3. EMPLOYEES PER CYCLE IN SALARY STRUCTURES ===');
    const cycleCounts = await db('salary_structures')
      .whereNull('deleted_at')
      .groupBy('cycle_id')
      .select('cycle_id', db.raw('count(*) as count'));
    console.log(JSON.stringify(cycleCounts, null, 2));

    console.log('=== 4. RECENT PAYROLL RUNS ===');
    const runs = await db('payroll_runs')
      .whereNull('deleted_at')
      .orderBy('id', 'desc')
      .limit(5);
    console.log(JSON.stringify(runs, null, 2));
  } catch (err: any) {
    console.error('Error during cycle audit:', err);
  } finally {
    process.exit(0);
  }
}

main();
