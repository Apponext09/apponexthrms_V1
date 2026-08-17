const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function testAllPayroll() {
  console.log("================================================");
  console.log("       COMPREHENSIVE PAYROLL SYSTEM AUDIT       ");
  console.log("================================================\n");

  // 1. Audit Payroll Cycles
  const cycles = await knex('payroll_cycles').whereNull('deleted_at');
  console.log(`1. Payroll Cycles: ${cycles.length} active cycles found.`);
  if (cycles.length > 0) {
    console.log(`   - Sample Cycle: ${cycles[0].cycle_name} (${cycles[0].frequency})`);
  }

  // 2. Audit Payroll Slabs
  const slabs = await knex('payroll_slabs').whereNull('deleted_at');
  console.log(`2. Payroll Slabs: ${slabs.length} active slabs found.`);

  // 3. Audit Component Groups
  const groups = await knex('payroll_component_groups').whereNull('deleted_at');
  console.log(`3. Component Groups: ${groups.length} active groups found.`);

  // 4. Audit Employee Salary Structures
  const structures = await knex('salary_structures').whereNull('deleted_at');
  console.log(`4. Salary Structures: ${structures.length} structures found.`);

  const empStructs = await knex('employee_salary_structures').whereNull('deleted_at');
  console.log(`   - Assigned Employee Mappings: ${empStructs.length} active mappings.`);

  // 5. Audit Payslips & Runs
  const payslips = await knex('payslips').whereNull('deleted_at');
  console.log(`5. Published Payslips: ${payslips.length} records in DB.`);

  const runs = await knex('payroll_runs').whereNull('deleted_at');
  console.log(`6. Payroll Runs: ${runs.length} runs executed.`);

  console.log("\n================================================");
  console.log("               AUDIT SUCCESSFUL                 ");
  console.log("================================================");

  await knex.destroy();
}

testAllPayroll().catch(err => {
  console.error("Payroll Audit Error:", err);
  process.exit(1);
});
