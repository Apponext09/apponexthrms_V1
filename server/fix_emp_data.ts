import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

// Fix: set current_department_id and reporting_manager_id for employees in mm org (id=67)
// pp employee id = 44, finance dept id = 21, hrrr employee id = 45
const orgId = 67;
const finDeptId = 21;
const ppEmpId = 44;  // pp@gmail.com is department head of finance

console.log('\n=== Checking raw columns in employees table ===');
const cols = await db.raw('SHOW COLUMNS FROM employees');
const colNames = cols[0].map((c: any) => c.Field);
console.log('employee columns (first_name style):', colNames.filter((c: string) => c.includes('name') || c.includes('dept') || c.includes('manager') || c.includes('report')));

console.log('\n=== Raw employee rows (no conversion) ===');
const rawEmps = await db.raw('SELECT id, first_name, last_name, email, current_department_id, reporting_manager_id FROM employees WHERE organization_id = ?', [orgId]);
console.log(JSON.stringify(rawEmps[0], null, 2));

console.log('\n=== Fix: update hrrr employee (id=45) to set dept and reporting manager ===');
const hrrrEmp = rawEmps[0].find((e: any) => e.email === 'hhhh@gmail.com');
const nnEmp = rawEmps[0].find((e: any) => e.email === 'nn@gmail.com');
const ppEmp = rawEmps[0].find((e: any) => e.email === 'pp@gmail.com');

console.log('hrr emp:', hrrrEmp);
console.log('nn emp:', nnEmp);
console.log('pp emp:', ppEmp);

// Update pp employee (44) - set finance dept
if (ppEmp) {
  await db.raw('UPDATE employees SET current_department_id = ?, first_name = ?, last_name = ? WHERE id = ?', [finDeptId, 'PP', 'Manager', ppEmp.id]);
  console.log(`✅ Updated pp employee (${ppEmp.id}) → dept=${finDeptId}, name=PP Manager`);
}

// Update hrrr employee (45) - set finance dept AND reporting_manager_id = pp employee
if (hrrrEmp) {
  await db.raw('UPDATE employees SET current_department_id = ?, reporting_manager_id = ?, first_name = ?, last_name = ? WHERE id = ?', 
    [finDeptId, ppEmpId, 'Hrrr', 'Employee', hrrrEmp.id]);
  console.log(`✅ Updated hrrr employee (${hrrrEmp.id}) → dept=${finDeptId}, reports_to=${ppEmpId}`);
}

// Update nn employee (43) - set HR dept
const hrDeptId = 19;
if (nnEmp) {
  await db.raw('UPDATE employees SET current_department_id = ?, first_name = ?, last_name = ? WHERE id = ?', 
    [hrDeptId, 'NN', 'Employee', nnEmp.id]);
  console.log(`✅ Updated nn employee (${nnEmp.id}) → dept=${hrDeptId}`);
}

console.log('\n=== Verify final state ===');
const finalEmps = await db.raw('SELECT id, first_name, last_name, email, current_department_id, reporting_manager_id FROM employees WHERE organization_id = ?', [orgId]);
console.log(JSON.stringify(finalEmps[0], null, 2));

process.exit(0);
