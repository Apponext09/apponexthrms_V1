const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Narendra@1419',
    database: 'apponexthrms'
  });

  // 1. Check all active leave types
  const [types] = await conn.query(
    'SELECT id, leave_name, leave_code, gender_applicable, allocation_settings, employment_allocation_settings, application_settings FROM leave_types WHERE deleted_at IS NULL AND status = ?',
    ['active']
  );

  console.log('=== ALL ACTIVE LEAVE TYPES ===');
  for (const t of types) {
    console.log(`\nID: ${t.id} | ${t.leave_name} (${t.leave_code})`);
    console.log(`  gender_applicable column: '${t.gender_applicable}'`);
    
    let alloc = {};
    try { alloc = t.allocation_settings ? JSON.parse(t.allocation_settings) : {}; } catch(e) {}
    console.log(`  alloc.gender: '${alloc.gender || 'NOT SET'}'`);
    console.log(`  alloc.onlyWhen:`, JSON.stringify(alloc.onlyWhen || alloc.only_when || 'NOT SET'));
    console.log(`  alloc.maritalStatus: '${alloc.maritalStatus || 'NOT SET'}'`);
    
    let empAlloc = {};
    try { empAlloc = t.employment_allocation_settings ? JSON.parse(t.employment_allocation_settings) : {}; } catch(e) {}
    if (Object.keys(empAlloc).length > 0) {
      console.log(`  empAlloc:`, JSON.stringify(empAlloc));
    }
    
    let appSettings = {};
    try { appSettings = t.application_settings ? JSON.parse(t.application_settings) : {}; } catch(e) {}
    if (appSettings.onlyWhen || appSettings.only_when) {
      console.log(`  appSettings.onlyWhen:`, JSON.stringify(appSettings.onlyWhen || appSettings.only_when));
    }
    
    if (t.only_when) {
      console.log(`  only_when (column):`, t.only_when);
    }
  }

  // 2. Check employees
  const [emps] = await conn.query(
    'SELECT id, first_name, last_name, gender, marital_status, status, employment_type, current_department_id, current_location_id, current_designation_id, current_grade_id, company_id, organization_id, sub_department_id FROM employees WHERE deleted_at IS NULL LIMIT 30'
  );

  console.log('\n\n=== EMPLOYEES ===');
  for (const e of emps) {
    console.log(`ID: ${e.id} | ${e.first_name} ${e.last_name} | gender: '${e.gender}' | marital: '${e.marital_status}' | status: '${e.status}' | dept: ${e.current_department_id} | loc: ${e.current_location_id} | desg: ${e.current_designation_id} | grade: ${e.current_grade_id} | company: ${e.company_id} | org: ${e.organization_id}`);
  }

  // 3. Check leave balances for female employees
  const femaleEmps = emps.filter(e => e.gender === 'female');
  if (femaleEmps.length > 0) {
    console.log('\n\n=== LEAVE BALANCES FOR FEMALE EMPLOYEES ===');
    for (const fem of femaleEmps) {
      const [bals] = await conn.query(
        'SELECT lb.id, lb.leave_type_id, lt.leave_name, lt.leave_code, lb.opening_balance, lb.available_balance FROM leave_balances lb LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id WHERE lb.employee_id = ? AND lb.deleted_at IS NULL',
        [fem.id]
      );
      console.log(`\nEmployee: ${fem.first_name} ${fem.last_name} (ID: ${fem.id}, gender: ${fem.gender})`);
      if (bals.length === 0) {
        console.log('  *** NO LEAVE BALANCES FOUND! ***');
      }
      for (const b of bals) {
        console.log(`  Leave: ${b.leave_name} (${b.leave_code}) | Opening: ${b.opening_balance} | Available: ${b.available_balance}`);
      }
    }
  }

  // 4. Check users table mapping
  const [users] = await conn.query(
    'SELECT id, email, gender, employee_id FROM users LIMIT 20'
  );
  console.log('\n\n=== USERS TABLE ===');
  for (const u of users) {
    console.log(`User ID: ${u.id} | email: ${u.email} | gender: '${u.gender}' | employee_id: ${u.employee_id}`);
  }

  await conn.end();
})();
