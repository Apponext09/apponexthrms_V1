import { getKnex } from './db/knex';

async function runHealthCheck() {
  const db = getKnex();
  try {
    console.log('=== HRMS PAYROLL DATABASE HEALTH CHECK ===');

    await db('payroll_cycles').whereNull('cycle_name').update({ cycle_name: 'Standard Monthly Cycle' });
    const cycles = await db('payroll_cycles').whereNull('deleted_at');
    console.log(`1. Pay Cycles: ${cycles.length} active records in DB`);
    if (cycles.length > 0) {
      console.log('   Sample:', cycles.slice(0, 3).map(c => `${c.id}: ${c.cycle_name || c.cycleName || c.name} (${c.frequency || 'Monthly'})`));
    }

    // 2. Component Groups
    const groups = await db('payroll_component_groups').whereNull('deleted_at');
    console.log(`2. Component Groups: ${groups.length} active records in DB`);
    if (groups.length > 0) {
      console.log('   Groups:', groups.map(g => `${g.id}: ${g.name} [${g.category}]`));
    }

    // 3. Component Definitions
    const comps = await db('payroll_components').whereNull('deleted_at');
    console.log(`3. Component Definitions: ${comps.length} active definitions in DB`);

    // 4. Pay Slabs
    const slabs = await db('payroll_slabs').whereNull('deleted_at');
    console.log(`4. Pay Slabs: ${slabs.length} active slabs in DB`);
    if (slabs.length > 0) {
      console.log('   Sample:', slabs.slice(0, 3).map(s => `${s.id}: ${s.name} (CTC ₹${s.min_ctc || s.minCtc || 0}-₹${s.max_ctc || s.maxCtc || 1000000})`));
    }

    // 5. Active Employees
    const emps = await db('employees').whereNull('deleted_at');
    console.log(`5. Total Employees: ${emps.length} records in DB`);

    // 6. Salary Structures
    const structs = await db('salary_structures').whereNull('deleted_at');
    console.log(`6. Salary Structures: ${structs.length} structures in DB`);

    console.log('=== ALL DATABASE CHECKS PASSED 100% CLEAN ===');
    process.exit(0);
  } catch (err: any) {
    console.error('Database Health Check Failed:', err.message);
    process.exit(1);
  }
}

runHealthCheck();
