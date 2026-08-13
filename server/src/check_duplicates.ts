import { getKnex } from './db/knex';

async function checkDuplicates() {
  const db = getKnex();
  try {
    console.log('=== AUDITING PAYROLL TABLES FOR DUPLICATES ===');

    // 1. Check payroll_cycles
    const cycles = await db('payroll_cycles').whereNull('deleted_at');
    console.log(`\n1. Pay Cycles (Total: ${cycles.length}):`);
    const cycleNames = cycles.map(c => (c.cycle_name || c.name || '').trim().toLowerCase());
    const dupCycleNames = cycleNames.filter((item, index) => item && cycleNames.indexOf(item) !== index);
    if (dupCycleNames.length > 0) {
      console.log('   ⚠️ Duplicate Cycle Names Found:', [...new Set(dupCycleNames)]);
    } else {
      console.log('    All Pay Cycles are unique.');
    }

    // 2. Check payroll_component_groups
    const groups = await db('payroll_component_groups').whereNull('deleted_at');
    console.log(`\n2. Component Groups (Total: ${groups.length}):`);
    const groupNames = groups.map(g => (g.name || '').trim().toLowerCase());
    const dupGroupNames = groupNames.filter((item, index) => item && groupNames.indexOf(item) !== index);
    if (dupGroupNames.length > 0) {
      console.log('   ⚠️ Duplicate Component Group Names Found:', [...new Set(dupGroupNames)]);
    } else {
      console.log('    All Component Groups are unique.');
    }

    // 3. Check payroll_components
    const comps = await db('payroll_components').whereNull('deleted_at');
    console.log(`\n3. Component Definitions (Total: ${comps.length}):`);
    const compKeys = comps.map(c => `${c.group_id}_${(c.name || '').trim().toLowerCase()}`);
    const dupCompKeys = compKeys.filter((item, index) => compKeys.indexOf(item) !== index);
    if (dupCompKeys.length > 0) {
      console.log('   ⚠️ Duplicate Components in Same Group Found:', [...new Set(dupCompKeys)]);
    } else {
      console.log('    All Component Definitions are unique within their groups.');
    }

    // 4. Check payroll_slabs
    const slabs = await db('payroll_slabs').whereNull('deleted_at');
    console.log(`\n4. Pay Slabs (Total: ${slabs.length}):`);
    const slabNames = slabs.map(s => (s.name || '').trim().toLowerCase());
    const dupSlabNames = slabNames.filter((item, index) => item && slabNames.indexOf(item) !== index);
    if (dupSlabNames.length > 0) {
      console.log('   ⚠️ Duplicate Slab Names Found:', [...new Set(dupSlabNames)]);
    } else {
      console.log('    All Pay Slabs are unique.');
    }

    // 5. Check employee_salary_structures for duplicate active mappings
    const ess = await db('employee_salary_structures').where('is_current', true).whereNull('deleted_at');
    console.log(`\n5. Employee Active Salary Structures Mappings (Total: ${ess.length}):`);
    const empIdsInEss = ess.map(e => e.employeeId || e.employee_id);
    const dupEmpIdsInEss = empIdsInEss.filter((item, index) => item && empIdsInEss.indexOf(item) !== index);
    if (dupEmpIdsInEss.length > 0) {
      console.log('   ⚠️ Duplicate Active Mappings Found for Employee IDs:', [...new Set(dupEmpIdsInEss)]);
    } else {
      console.log('    All active employee salary structure mappings are 1-to-1 unique.');
    }

    console.log('\n=== AUDIT COMPLETE ===');
    process.exit(0);
  } catch (err: any) {
    console.error('Error auditing duplicates:', err.message);
    process.exit(1);
  }
}

checkDuplicates();
