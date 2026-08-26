const mysql = require('mysql2/promise');

async function fullDataCheck() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'health'
  });
  const orgId = 8;

  console.log('=== FULL PAYROLL DATA INTEGRITY CHECK ===\n');

  // 1. Components
  const [comps] = await conn.query('SELECT COUNT(*) as cnt FROM payroll_components WHERE organization_id = ? AND deleted_at IS NULL AND is_active = 1', [orgId]);
  console.log('Active Components:', comps[0].cnt, '(should be ~56+)');

  // 2. Groups
  const [groups] = await conn.query('SELECT COUNT(*) as cnt FROM payroll_component_groups WHERE organization_id = ? AND deleted_at IS NULL AND is_active = 1', [orgId]);
  console.log('Active Groups:', groups[0].cnt, '(should be ~57)');

  // 3. Slabs
  const [slabs] = await conn.query('SELECT id, name, is_active FROM payroll_slabs WHERE organization_id = ? AND deleted_at IS NULL', [orgId]);
  console.log('Slabs:', slabs);

  // 4. Employees with salary structures
  const [empsWithStruct] = await conn.query(
    'SELECT e.id, e.employee_code, e.first_name, e.status, ss.id as struct_id, ss.gross_monthly, ss.annual_ctc, ss.effective_from FROM employees e LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.deleted_at IS NULL AND ss.status = \'active\' WHERE e.organization_id = ? AND e.deleted_at IS NULL ORDER BY e.id',
    [orgId]
  );
  console.log('\nEmployees with salary structures:');
  const withStruct = empsWithStruct.filter(e => e.struct_id);
  const withoutStruct = empsWithStruct.filter(e => !e.struct_id);
  console.log('  WITH structure:', withStruct.length, 'employees');
  withStruct.forEach(e => console.log(`    ${e.employee_code}: gross=${e.gross_monthly} ctc=${e.annual_ctc} eff=${e.effective_from}`));
  console.log('  WITHOUT structure:', withoutStruct.length, 'employees');
  withoutStruct.forEach(e => console.log(`    ${e.employee_code} (${e.first_name}) status=${e.status}`));

  // 5. Payroll cycles  
  const [cycles] = await conn.query('SELECT id, cycle_name, status, company_id FROM payroll_cycles WHERE organization_id = ? AND deleted_at IS NULL', [orgId]);
  console.log('\nPayroll Cycles:', cycles);

  // 6. Payroll runs
  const [runs] = await conn.query('SELECT id, status, total_employees, processed_employees, run_month, company_id FROM payroll_runs WHERE organization_id = ? ORDER BY id DESC', [orgId]);
  console.log('\nPayroll Runs:', runs);

  // 7. Check payroll_register_overrides
  const [overrides] = await conn.query('SELECT COUNT(*) as cnt FROM payroll_register_overrides WHERE organization_id = ?', [orgId]);
  console.log('\nPayroll Register Overrides:', overrides[0].cnt);

  // 8. Check salary_structures table thoroughly 
  const [ss] = await conn.query('SELECT id, employee_id, structure_name, gross_monthly, annual_ctc, status, effective_from, deleted_at FROM salary_structures WHERE organization_id = ? ORDER BY id', [orgId]);
  console.log('\nAll Salary Structures (including soft-deleted):');
  ss.forEach(s => console.log(`  ID:${s.id} Emp:${s.employee_id} Gross:${s.gross_monthly} Status:${s.status} Deleted:${s.deleted_at ? 'YES' : 'no'}`));

  await conn.end();
  console.log('\n=== CHECK COMPLETE ===');
  process.exit(0);
}

fullDataCheck().catch(e => { console.error(e); process.exit(1); });
