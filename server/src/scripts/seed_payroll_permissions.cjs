'use strict';
// Seeds all payroll/loan/settlement permissions to Organization Admin roles
const mysql = require('mysql2/promise');

const ALL_PAYROLL_PERMISSIONS = [
  { code: 'payroll:view',        name: 'View Payroll',              description: 'View payroll runs and processing status' },
  { code: 'payroll:generate',    name: 'Generate Payroll',          description: 'Create new payroll runs for processing' },
  { code: 'payroll:process',     name: 'Process Payroll',           description: 'Calculate earnings and deductions' },
  { code: 'payroll:lock',        name: 'Lock Payroll',              description: 'Lock payroll for approval' },
  { code: 'payroll:unlock',      name: 'Unlock Payroll',            description: 'Unlock payroll to make changes' },
  { code: 'payroll:approve',     name: 'Approve Payroll',           description: 'Approve locked payroll for publishing' },
  { code: 'payroll:publish',     name: 'Publish Payroll',           description: 'Publish payroll and generate payslips' },
  { code: 'structure:view',      name: 'View Salary Structures',    description: 'View salary structure templates' },
  { code: 'structure:create',    name: 'Create Salary Structure',   description: 'Create new salary structure templates' },
  { code: 'structure:edit',      name: 'Edit Salary Structure',     description: 'Edit salary structure templates' },
  { code: 'structure:assign',    name: 'Assign Salary Structure',   description: 'Assign salary structures to employees' },
  { code: 'revision:view',       name: 'View Salary Revisions',     description: 'View salary revision requests' },
  { code: 'revision:request',    name: 'Request Salary Revision',   description: 'Create new salary revision requests' },
  { code: 'revision:submit',     name: 'Submit Salary Revision',    description: 'Submit salary revisions for approval' },
  { code: 'revision:approve',    name: 'Approve Salary Revision',   description: 'Approve or reject salary revision requests' },
  { code: 'payslip:view',        name: 'View Payslips',             description: 'View generated payslips' },
  { code: 'payslip:send',        name: 'Send Payslips',             description: 'Send payslips to employees' },
  { code: 'payslip:lock',        name: 'Lock Payslips',             description: 'Lock payslips from further changes' },
  { code: 'loan:view',           name: 'View Loans',                description: 'View employee loans and EMI schedules' },
  { code: 'loan:create',         name: 'Create/Approve Loan',       description: 'Create and approve employee loans' },
  { code: 'tax:view',            name: 'View Tax Declarations',     description: 'View tax declarations' },
  { code: 'tax:declare',         name: 'Manage Tax Declaration',    description: 'Create and manage tax declarations' },
  { code: 'settlement:view',     name: 'View Settlements',          description: 'View F&F settlements' },
  { code: 'settlement:create',   name: 'Create Settlement',         description: 'Create new settlement records' },
  { code: 'settlement:calculate',name: 'Calculate Settlement',      description: 'Calculate settlement amounts' },
  { code: 'settlement:submit',   name: 'Submit Settlement',         description: 'Submit settlement for approval' },
  { code: 'settlement:approve',  name: 'Approve Settlement',        description: 'Approve settlement requests' },
  { code: 'settlement:process',  name: 'Process Settlement',        description: 'Process approved settlements' },
  { code: 'advance:view',        name: 'View Salary Advances',      description: 'View salary advance requests' },
  { code: 'advance:create',      name: 'Request Salary Advance',    description: 'Create salary advance requests' },
  { code: 'advance:approve',     name: 'Approve Salary Advance',    description: 'Approve salary advance requests' },
];

// HR Manager permissions (subset)
const HR_MANAGER_PERMS = [
  'payroll:view','structure:view','revision:view','revision:request','revision:submit',
  'payslip:view','payslip:send','loan:view','loan:create','tax:view','tax:declare',
  'settlement:view','settlement:create','settlement:calculate','settlement:submit',
  'advance:view','advance:create'
];

// Employee permissions (subset)
const EMPLOYEE_PERMS = [
  'payslip:view','loan:view','tax:view','tax:declare','advance:view','advance:create'
];

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root123', database: 'apponexthrms'
  });

  console.log('=== SEEDING PAYROLL PERMISSIONS ===\n');

  // 1. Upsert all permissions into permissions table
  const permIds = {};
  for (const perm of ALL_PAYROLL_PERMISSIONS) {
    const [existing] = await conn.query('SELECT id FROM permissions WHERE code=?', [perm.code]);
    if (existing.length === 0) {
      const [result] = await conn.query(
        'INSERT INTO permissions (code, module, resource, action, description) VALUES (?,?,?,?,?)',
        [perm.code, perm.code.split(':')[0], perm.code.split(':')[0], perm.code.split(':')[1] || perm.code, perm.description]
      );
      permIds[perm.code] = result.insertId;
      console.log('  + Created permission: ' + perm.code);
    } else {
      permIds[perm.code] = existing[0].id;
    }
  }

  // 2. Get all Organization Admin role IDs
  const [orgAdminRoles] = await conn.query("SELECT id FROM roles WHERE name LIKE '%Organization Admin%' OR name LIKE '%org_admin%' OR name LIKE '%Super Admin%' OR name LIKE '%Finance Manager%'");
  console.log('\nOrg Admin / Finance Manager roles found: ' + orgAdminRoles.length);

  // 3. Assign ALL permissions to Org Admin / Finance Manager
  for (const role of orgAdminRoles) {
    let added = 0;
    for (const perm of ALL_PAYROLL_PERMISSIONS) {
      const permId = permIds[perm.code];
      const [ex] = await conn.query('SELECT id FROM role_permissions WHERE role_id=? AND permission_id=?', [role.id, permId]);
      if (ex.length === 0) {
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?)', [role.id, permId]);
        added++;
      }
    }
    if (added > 0) console.log('  + Added ' + added + ' perms to role_id=' + role.id);
  }

  // 4. Get all HR Manager role IDs
  const [hrRoles] = await conn.query("SELECT id FROM roles WHERE name LIKE '%HR Manager%' OR name LIKE '%Hr Manager%' OR name LIKE '%hr_manager%' OR name LIKE '%HR Admin%'");
  console.log('\nHR Manager roles found: ' + hrRoles.length);
  for (const role of hrRoles) {
    let added = 0;
    for (const code of HR_MANAGER_PERMS) {
      const permId = permIds[code];
      if (!permId) continue;
      const [ex] = await conn.query('SELECT id FROM role_permissions WHERE role_id=? AND permission_id=?', [role.id, permId]);
      if (ex.length === 0) {
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?)', [role.id, permId]);
        added++;
      }
    }
    if (added > 0) console.log('  + Added ' + added + ' perms to HR role_id=' + role.id);
  }

  // 5. Get all Employee role IDs
  const [empRoles] = await conn.query("SELECT id FROM roles WHERE name LIKE '%Employee%' OR name LIKE '%EMPLOYEE%' OR name LIKE '%Intern%' OR name LIKE '%Consultant%'");
  console.log('\nEmployee roles found: ' + empRoles.length);
  for (const role of empRoles) {
    let added = 0;
    for (const code of EMPLOYEE_PERMS) {
      const permId = permIds[code];
      if (!permId) continue;
      const [ex] = await conn.query('SELECT id FROM role_permissions WHERE role_id=? AND permission_id=?', [role.id, permId]);
      if (ex.length === 0) {
        await conn.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?)', [role.id, permId]);
        added++;
      }
    }
    if (added > 0) console.log('  + Added ' + added + ' perms to Employee role_id=' + role.id);
  }

  // 6. Verify ajay's permissions now
  console.log('\n--- VERIFICATION: Ajay (admin) permissions ---');
  const [ur] = await conn.query('SELECT r.id FROM user_roles ur JOIN roles r ON ur.role_id=r.id WHERE ur.user_id=47');
  if (ur.length > 0) {
    const [rp] = await conn.query('SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id=p.id WHERE rp.role_id=?', [ur[0].id]);
    console.log('  Total permissions: ' + rp.length);
    const payrollPerms = rp.filter(function(r){ return r.code.indexOf('payroll') !== -1 || r.code.indexOf('loan') !== -1 || r.code.indexOf('settlement') !== -1 || r.code.indexOf('revision') !== -1 || r.code.indexOf('structure') !== -1; });
    console.log('  Payroll permissions: ' + payrollPerms.map(function(r){return r.code;}).join(', '));
  }

  await conn.end();
  console.log('\nDone! All payroll permissions seeded and assigned.');
}

run().catch(function(e) { console.error('Error:', e.message); process.exit(1); });
