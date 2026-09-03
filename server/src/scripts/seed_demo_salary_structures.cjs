/**
 * seed_demo_salary_structures.cjs
 * Seeds realistic demo salary structures for all 15 employees
 * that currently have no salary structure assigned.
 * Also fixes duplicate structures for EMP202601 (emp_id 34).
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const DEMO_EMPLOYEES = [
  // company_id 4 employees (Org 8 main company)
  { empId: 32,  code: 'EMP978',  name: 'Harsh Gawali',     gross: 120000, ctc: 1440000, role: 'CEO / Admin' },
  { empId: 33,  code: 'EMP657',  name: 'Samarth Giram',    gross: 95000,  ctc: 1140000, role: 'Manager' },
  { empId: 44,  code: 'EMP202611', name: 'Siddharth Gupta', gross: 45000, ctc: 540000,  role: 'Senior Exec' },
  { empId: 45,  code: 'EMP202612', name: 'Meera Reddy',     gross: 40000, ctc: 480000,  role: 'Exec' },
  { empId: 46,  code: 'EMP202613', name: 'Devansh Mishra',  gross: 38000, ctc: 456000,  role: 'Junior Exec' },
  // company_id 9 employees
  { empId: 57,  code: 'EMP002',  name: 'Siya Patel',       gross: 55000,  ctc: 660000,  role: 'Senior' },
  { empId: 58,  code: 'EMP003',  name: 'Vivaan Joshi',     gross: 48000,  ctc: 576000,  role: 'Mid-level' },
  { empId: 59,  code: 'EMP004',  name: 'Anaya Kulkarni',   gross: 42000,  ctc: 504000,  role: 'Mid-level' },
  { empId: 60,  code: 'EMP005',  name: 'Aditya Nair',      gross: 38000,  ctc: 456000,  role: 'Junior' },
  { empId: 61,  code: 'EMP006',  name: 'Isha Desai',       gross: 36000,  ctc: 432000,  role: 'Junior' },
  { empId: 62,  code: 'EMP007',  name: 'Krish Gupta',      gross: 70000,  ctc: 840000,  role: 'Senior Lead' },
  { empId: 63,  code: 'EMP008',  name: 'Meera Iyer',       gross: 52000,  ctc: 624000,  role: 'Mid Lead' },
  { empId: 64,  code: 'EMP009',  name: 'Arjun Reddy',      gross: 47000,  ctc: 564000,  role: 'Mid-level' },
  { empId: 65,  code: 'EMP010',  name: 'Kavya More',       gross: 43000,  ctc: 516000,  role: 'Junior' },
  // TEST employee without structure
  { empId: 125, code: 'TEST-M-001-1787564799229', name: 'Rahul Sharma', gross: 60000, ctc: 720000, role: 'Test' },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'health'
  });
  const orgId = 8;

  console.log('=== SEEDING DEMO SALARY STRUCTURES ===\n');

  // Step 1: Fix duplicate structures for emp 34 (EMP202601) — keep only the latest, soft-delete others
  console.log('Step 1: Fixing duplicate structures for EMP202601 (emp_id 34)...');
  const [emp34Structs] = await conn.query(
    'SELECT id FROM salary_structures WHERE employee_id = 34 AND organization_id = ? AND deleted_at IS NULL ORDER BY id DESC',
    [orgId]
  );
  if (emp34Structs.length > 1) {
    const keepId = emp34Structs[0].id;
    const deleteIds = emp34Structs.slice(1).map(s => s.id);
    await conn.query(
      'UPDATE salary_structures SET status = ?, deleted_at = NOW() WHERE id IN (?)',
      ['inactive', deleteIds]
    );
    console.log(`  Kept ID: ${keepId}, soft-deleted: ${deleteIds}`);
  } else {
    console.log('  No duplicates found for emp 34');
  }

  // Step 2: Fix duplicate structures for emp 35 (EMP202602)
  console.log('Step 2: Fixing duplicate structures for EMP202602 (emp_id 35)...');
  const [emp35Structs] = await conn.query(
    'SELECT id FROM salary_structures WHERE employee_id = 35 AND organization_id = ? AND deleted_at IS NULL ORDER BY id DESC',
    [orgId]
  );
  if (emp35Structs.length > 1) {
    const keepId = emp35Structs[0].id;
    const deleteIds = emp35Structs.slice(1).map(s => s.id);
    await conn.query('UPDATE salary_structures SET status = ?, deleted_at = NOW() WHERE id IN (?)', ['inactive', deleteIds]);
    console.log(`  Kept ID: ${keepId}, soft-deleted: ${deleteIds}`);
  }

  // Step 3: Seed salary structures for all 15 employees without one
  console.log('\nStep 3: Seeding salary structures for 15 employees...');

  for (const emp of DEMO_EMPLOYEES) {
    // Check if already has a structure
    const [existing] = await conn.query(
      'SELECT id FROM salary_structures WHERE employee_id = ? AND organization_id = ? AND deleted_at IS NULL AND status = ?',
      [emp.empId, orgId, 'active']
    );
    if (existing.length > 0) {
      console.log(`  SKIP ${emp.code} (${emp.name}) — already has active structure ID: ${existing[0].id}`);
      continue;
    }

    // Get the employee's company_id
    const [empRow] = await conn.query('SELECT company_id, date_of_joining FROM employees WHERE id = ?', [emp.empId]);
    const companyId = empRow[0]?.company_id || null;

    const structName = `${emp.name} - Monthly Salary Structure`;
    const structCode = `SS-${emp.code}-${Date.now()}`;
    const effectiveFrom = '2026-08-01';

    // Calculate CTC breakdown
    const basic = Math.round(emp.gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = Math.round(emp.gross * 0.05);
    const special = emp.gross - basic - hra - conveyance;

    await conn.query(
      `INSERT INTO salary_structures (
        uuid, organization_id, company_id, employee_id,
        structure_name, structure_code, status,
        gross_monthly, annual_ctc,
        basic_monthly, hra_monthly,
        effective_from,
        cycle_id, slab_id,
        created_by, updated_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        uuidv4(), orgId, companyId, emp.empId,
        structName, structCode,
        emp.gross, emp.ctc,
        basic, hra,
        effectiveFrom,
        13, // cycle_id: Standard Monthly Payroll Cycle
        2,  // slab_id: Standard Monthly Salary Slab
        10, // created_by: admin user
        10  // updated_by: admin user
      ]
    );

    console.log(`  ✅ ${emp.code} (${emp.name}) — Gross: ₹${emp.gross.toLocaleString('en-IN')} | CTC: ₹${emp.ctc.toLocaleString('en-IN')} | Basic: ₹${basic.toLocaleString('en-IN')}`);
  }

  // Step 4: Verify final count
  console.log('\n=== VERIFICATION ===');
  const [withStruct] = await conn.query(
    'SELECT COUNT(DISTINCT e.id) as cnt FROM employees e JOIN salary_structures ss ON ss.employee_id = e.id AND ss.deleted_at IS NULL AND ss.status = \'active\' WHERE e.organization_id = ? AND e.deleted_at IS NULL',
    [orgId]
  );
  const [totalEmps] = await conn.query(
    'SELECT COUNT(*) as cnt FROM employees WHERE organization_id = ? AND deleted_at IS NULL AND status = ?',
    [orgId, 'active']
  );
  console.log(`Employees with salary structure: ${withStruct[0].cnt} / ${totalEmps[0].cnt} active employees`);

  await conn.end();
  console.log('\n=== DEMO SEED COMPLETE ===');
  process.exit(0);
}

seed().catch(e => { console.error('Error:', e.message); process.exit(1); });
