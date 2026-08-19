import { initializeKnex, getKnex } from '../db/knex.js';

async function main() {
  initializeKnex();
  const db = getKnex();
  try {
    console.log('=== START PAYROLL SETUP AUDIT ===\n');

    // 1. Check Payroll Cycles
    const cycles = await db('payroll_cycles').whereNull('deleted_at');
    console.log(`--- Payroll Cycles (${cycles.length}) ---`);
    cycles.forEach((c: any) => {
      console.log(`  ID: ${c.id}, Name: ${c.cycleName || c.name}, OrgId: ${c.organizationId}, CoId: ${c.companyId}, Freq: ${c.frequency}, Status: ${c.status}`);
    });

    // 2. Check Slabs
    const slabs = await db('payroll_slabs').whereNull('deleted_at');
    console.log(`\n--- Payroll Slabs (${slabs.length}) ---`);
    slabs.forEach((s: any) => {
      console.log(`  ID: ${s.id}, Name: ${s.name}, OrgId: ${s.organizationId}, CoId: ${s.companyId}, CycleId: ${s.cycleId}, Active: ${s.isActive}`);
    });

    // 3. Check Components
    const comps = await db('payroll_components').whereNull('deleted_at');
    console.log(`\n--- Payroll Components (${comps.length}) ---`);
    console.log(`  Active: ${comps.filter((c: any) => c.isActive).length}, Inactive: ${comps.filter((c: any) => !c.isActive).length}`);
    if (comps.length > 0) {
      console.log('  Sample Components (first 10):');
      comps.slice(0, 10).forEach((c: any) => {
        console.log(`    ID: ${c.id}, Name: ${c.name}, Code: ${c.code}, Type: ${c.type}, Category: ${c.category}, Formula: ${c.formula}, Active: ${c.isActive}`);
      });
    }

    // 4. Check Employees and their Salary Structures
    const employees = await db('employees').where('status', 'active');
    console.log(`\n--- Active Employees (${employees.length}) ---`);

    const essList = await db('employee_salary_structures as ess')
      .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where('ess.is_current', true)
      .whereNull('ess.deleted_at')
      .select('ess.employee_id', 'ss.gross_monthly', 'ss.structure_name as struct_name');
    
    console.log(`  Employees with current salary structures: ${essList.length}`);

    const employeesWithStructure = new Set(essList.map((ess: any) => ess.employeeId));
    const employeesWithoutStructure = employees.filter((e: any) => !employeesWithStructure.has(e.id));
    console.log(`  Employees WITHOUT salary structures: ${employeesWithoutStructure.length}`);
    if (employeesWithoutStructure.length > 0) {
      console.log('  IDs of employees without salary structures (up to 10):');
      console.log(employeesWithoutStructure.slice(0, 10).map((e: any) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, code: e.employeeCode })));
    }

    // 5. Check last Payroll Run and its status
    const runs = await db('payroll_runs').orderBy('id', 'desc').limit(3);
    console.log(`\n--- Last 3 Payroll Runs ---`);
    runs.forEach((r: any) => {
      console.log(`  ID: ${r.id}, Month: ${r.month}, Status: ${r.status}, Processed: ${r.processedEmployees}, Errors: ${r.errorCount}`);
    });

    if (runs.length > 0) {
      const lastRun = runs[0];
      const runEmployees = await db('payroll_run_employees')
        .where('payroll_run_id', lastRun.id)
        .select('id', 'employee_id', 'status', 'processing_notes')
        .limit(10);
      console.log(`\n--- Sample Employees for Run ID ${lastRun.id} (first 10) ---`);
      runEmployees.forEach((re: any) => {
        console.log(`    EmpID: ${re.employeeId}, Status: ${re.status}, Notes: ${re.processingNotes}`);
      });
    }

  } catch (err: any) {
    console.error('Error executing audit:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
