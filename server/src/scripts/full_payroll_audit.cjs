'use strict';
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root123', database: 'apponexthrms'
  });

  console.log('\n=== PAYROLL SYSTEM FULL AUDIT ===\n');

  // 1. Table status
  const tables = [
    'payroll_cycles','salary_structures','employee_salary_structures',
    'payroll_runs','payroll_run_employees','payslips',
    'salary_revisions','employee_loans','loan_types','loan_repayments',
    'full_final_settlements','employee_compensation',
    'payroll_component_groups','payroll_components','payroll_slabs'
  ];
  console.log('--- TABLE STATUS ---');
  for (const t of tables) {
    try {
      const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM ' + t);
      console.log('  ' + (rows[0].cnt > 0 ? 'OK' : 'EMPTY') + ' ' + t + ': ' + rows[0].cnt + ' rows');
    } catch(e) {
      console.log('  MISSING: ' + t);
    }
  }

  // 2. RBAC system check
  console.log('\n--- RBAC SYSTEM ---');
  const [permTbls] = await conn.query("SHOW TABLES LIKE 'permissions'");
  const [roleTbls] = await conn.query("SHOW TABLES LIKE 'role_permissions'");
  console.log('  permissions table: ' + (permTbls.length > 0 ? 'EXISTS' : 'MISSING'));
  console.log('  role_permissions table: ' + (roleTbls.length > 0 ? 'EXISTS' : 'MISSING'));

  if (permTbls.length > 0) {
    const [perms] = await conn.query("SELECT COUNT(*) as cnt FROM permissions WHERE code LIKE 'payroll%' OR code LIKE 'loan%' OR code LIKE 'settlement%' OR code LIKE 'revision%' OR code LIKE 'structure%'");
    console.log('  Payroll/Loan/Settlement permissions seeded: ' + perms[0].cnt);
  }

  // 3. Check all roles
  console.log('\n--- ROLES IN DB ---');
  const [roles] = await conn.query('SELECT id, name FROM roles ORDER BY id');
  roles.forEach(function(r) { console.log('  role_id=' + r.id + ': ' + r.name); });

  // 4. Check ajay admin permissions
  console.log('\n--- AJAY (admin) USER ACCESS ---');
  const [ur] = await conn.query('SELECT r.id, r.name FROM user_roles ur JOIN roles r ON ur.role_id=r.id WHERE ur.user_id=47');
  console.log('  Roles: ' + ur.map(function(r){return r.name;}).join(', '));

  if (roleTbls.length > 0 && ur.length > 0) {
    const roleId = ur[0].id;
    const [rp] = await conn.query('SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id=p.id WHERE rp.role_id=?', [roleId]);
    const payrollPerms = rp.filter(function(r){ return r.code.indexOf('payroll') !== -1 || r.code.indexOf('loan') !== -1 || r.code.indexOf('settlement') !== -1 || r.code.indexOf('revision') !== -1; });
    console.log('  Total permissions: ' + rp.length);
    console.log('  Payroll perms: ' + (payrollPerms.map(function(r){return r.code;}).join(', ') || 'NONE - ADMIN WILL GET 403s'));
  }

  // 5. Loan types
  console.log('\n--- LOAN TYPES ---');
  const [lt] = await conn.query('SELECT id,name,max_amount,interest_rate FROM loan_types LIMIT 10');
  lt.forEach(function(t) { console.log('  ' + t.id + ': ' + t.name + ' max=' + t.max_amount + ' rate=' + t.interest_rate + '%'); });

  // 6. Loan data
  console.log('\n--- EMPLOYEE LOANS SAMPLE ---');
  const [loans] = await conn.query('SELECT id,employee_id,loan_type,amount,status FROM employee_loans ORDER BY id DESC LIMIT 5');
  loans.forEach(function(l) { console.log('  loan_id=' + l.id + ' emp=' + l.employee_id + ' type=' + l.loan_type + ' amt=' + l.amount + ' status=' + l.status); });

  // 7. Settlement data
  console.log('\n--- SETTLEMENTS ---');
  const [ffs] = await conn.query('SELECT id,employee_id,status,total_settlement_amount FROM full_final_settlements LIMIT 5');
  ffs.forEach(function(s) { console.log('  id=' + s.id + ' emp=' + s.employee_id + ' status=' + s.status + ' total=' + s.total_settlement_amount); });

  // 8. Payroll runs
  console.log('\n--- PAYROLL RUNS (last 5) ---');
  const [pr] = await conn.query('SELECT id,run_month,status,total_employees,processed_employees FROM payroll_runs ORDER BY id DESC LIMIT 5');
  pr.forEach(function(r) { console.log('  id=' + r.id + ' month=' + r.run_month + ' status=' + r.status + ' emp:' + r.processed_employees + '/' + r.total_employees); });

  // 9. Salary revisions
  console.log('\n--- SALARY REVISIONS ---');
  const [sr] = await conn.query('SELECT id,employee_id,status,revision_type,new_ctc FROM salary_revisions ORDER BY id DESC LIMIT 5');
  sr.forEach(function(r) { console.log('  id=' + r.id + ' emp=' + r.employee_id + ' type=' + r.revision_type + ' status=' + r.status + ' new_ctc=' + r.new_ctc); });

  await conn.end();
  console.log('\nAudit complete!');
}

run().catch(function(e) { console.error('Error:', e.message); process.exit(1); });
