const knex = require('knex');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'health',
    port: Number(process.env.DB_PORT || 3306),
  }
});

async function main() {
  try {
    console.log('=== 1. PAYROLL CYCLES TABLE INFO ===');
    const cols = await db.raw("DESCRIBE payroll_cycles");
    console.log('Columns:', (cols[0] || []).map(c => c.Field + ' (' + c.Type + ')'));

    console.log('=== 2. ALL CYCLES IN DB ===');
    const cycles = await db('payroll_cycles').whereNull('deleted_at');
    console.log('Cycles count:', cycles.length);
    for (const c of cycles) {
      console.log(`Cycle ID ${c.id}: "${c.name || c.cycle_name}", Org=${c.organization_id}, Company=${c.company_id}, Freq=${c.frequency || c.cycle_type}, Status=${c.status || c.is_active}, Start=${c.cycle_start_date || c.start_date}, End=${c.cycle_end_date}, Cutoff=${c.cutoff_date || c.cutoff_day}`);
    }

    console.log('\n=== 3. SALARY STRUCTURES WITH CYCLE ASSIGNMENT ===');
    const cycleCounts = await db('salary_structures')
      .whereNull('deleted_at')
      .groupBy('cycle_id')
      .select('cycle_id', db.raw('count(*) as count'));
    console.log(JSON.stringify(cycleCounts, null, 2));

    console.log('\n=== 4. PAYROLL RUNS ===');
    const runs = await db('payroll_runs')
      .whereNull('deleted_at')
      .orderBy('id', 'desc')
      .limit(5);
    for (const r of runs) {
      console.log(`Run ID ${r.id}: Month=${r.run_month}, CycleID=${r.payroll_cycle_id}, CompanyID=${r.company_id}, Status=${r.status}, TotalEmps=${r.total_employees}`);
    }
  } catch (err) {
    console.error('Error during cycle audit:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

main();
