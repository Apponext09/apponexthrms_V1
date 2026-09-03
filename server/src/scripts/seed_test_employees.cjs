/**
 * seed_test_employees.cjs
 * Seeds 5 realistic test employees for Org 8 with proper:
 *  - Salary structures (varying CTCs)
 *  - Gender, department assignments
 *  - Slab assignment (Monthly slab ID 2)
 * Use these to test payroll processing end-to-end on UI.
 */
const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

const ORG_ID = 8;
const now = new Date();

// Find an existing company_id for org 8
async function getCompanyId() {
  const co = await db('companies').where('organization_id', ORG_ID).first().catch(() => null);
  return co?.id || null;
}

async function getAdminUserId() {
  const u = await db('users').where('organization_id', ORG_ID).first().catch(() => null);
  return u?.id || 1;
}

// Find slab id
async function getSlabId() {
  const slab = await db('payroll_slabs').where('organization_id', ORG_ID).orderBy('id', 'asc').first().catch(() => null);
  return slab?.id || 2;
}

// Find department ids for org 8
async function getDepts() {
  const depts = await db('departments').where('organization_id', ORG_ID).select('id', 'name').limit(5).catch(() => []);
  return depts;
}

// Find designation ids for org 8
async function getDesignations() {
  const desigs = await db('designations').where('organization_id', ORG_ID).select('id', 'name').limit(5).catch(() => []);
  return desigs;
}

async function main() {
  const companyId = await getCompanyId();
  const adminUserId = await getAdminUserId();
  const slabId = await getSlabId();
  const depts = await getDepts();
  const desigs = await getDesignations();

  console.log(`Company ID: ${companyId}, Slab ID: ${slabId}`);
  console.log(`Departments: ${depts.map(d => `${d.id}:${d.name}`).join(', ')}`);
  console.log(`Designations: ${desigs.map(d => `${d.id}:${d.name}`).join(', ')}`);

  const deptIds = depts.map(d => d.id);
  const desigIds = desigs.map(d => d.id);

  // Test employees: 3 male, 2 female, varying CTCs
  const testEmployees = [
    {
      first_name: 'Rahul', last_name: 'Sharma', gender: 'Male',
      email: `rahul.sharma.test.${Date.now()}@apponext.test`,
      employee_code: `TEST-M-001-${Date.now()}`,
      current_designation_id: desigIds[0] || null,
      current_department_id: deptIds[0] || null,
      annual_ctc: 720000,   // ₹7.2 LPA
      gross_monthly: 60000,
      basic_monthly: 30000,
    },
    {
      first_name: 'Priya', last_name: 'Nair', gender: 'Female',
      email: `priya.nair.test.${Date.now()}@apponext.test`,
      employee_code: `TEST-F-001-${Date.now()}`,
      current_designation_id: desigIds[1] || desigIds[0] || null,
      current_department_id: deptIds[1] || deptIds[0] || null,
      annual_ctc: 480000,   // ₹4.8 LPA
      gross_monthly: 40000,
      basic_monthly: 20000,
    },
    {
      first_name: 'Amit', last_name: 'Kulkarni', gender: 'Male',
      email: `amit.kulkarni.test.${Date.now()}@apponext.test`,
      employee_code: `TEST-M-002-${Date.now()}`,
      current_designation_id: desigIds[2] || desigIds[0] || null,
      current_department_id: deptIds[2] || deptIds[0] || null,
      annual_ctc: 1200000,  // ₹12 LPA
      gross_monthly: 100000,
      basic_monthly: 50000,
    },
    {
      first_name: 'Sneha', last_name: 'Patil', gender: 'Female',
      email: `sneha.patil.test.${Date.now()}@apponext.test`,
      employee_code: `TEST-F-002-${Date.now()}`,
      current_designation_id: desigIds[0] || null,
      current_department_id: deptIds[3] || deptIds[0] || null,
      annual_ctc: 360000,   // ₹3.6 LPA (below ESIC threshold)
      gross_monthly: 30000,
      basic_monthly: 15000,
    },
    {
      first_name: 'Vikram', last_name: 'Joshi', gender: 'Male',
      email: `vikram.joshi.test.${Date.now()}@apponext.test`,
      employee_code: `TEST-M-003-${Date.now()}`,
      current_designation_id: desigIds[4] || desigIds[0] || null,
      current_department_id: deptIds[4] || deptIds[0] || null,
      annual_ctc: 2400000,  // ₹24 LPA (senior)
      gross_monthly: 200000,
      basic_monthly: 100000,
    },
  ];

  console.log('\n=== SEEDING TEST EMPLOYEES ===\n');
  const createdEmployees = [];

  for (const emp of testEmployees) {
    // Insert employee
    const [empId] = await db('employees').insert({
      uuid: uuidv4(),
      organization_id: ORG_ID,
      company_id: companyId,
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      gender: emp.gender,
      email: emp.email,
      status: 'active',
      employment_type: 'Full-Time',
      date_of_joining: '2024-01-01',
      current_designation_id: emp.current_designation_id,
      current_department_id: emp.current_department_id,
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    });

    console.log(`✓ Created Employee: ${emp.first_name} ${emp.last_name} (ID: ${empId}, Gender: ${emp.gender}, CTC: ₹${emp.annual_ctc.toLocaleString()})`);

    // Insert salary structure
    const specialAllowance = emp.gross_monthly - (emp.basic_monthly + Math.round(emp.basic_monthly * 0.4) + 1600 + 1250 + 200);

    await db('salary_structures').insert({
      uuid: uuidv4(),
      organization_id: ORG_ID,
      company_id: companyId,
      employee_id: empId,
      structure_name: `${emp.first_name} Monthly Structure`,
      structure_code: `SS-${empId}`,
      status: 'active',
      effective_from: '2024-01-01',
      annual_ctc: emp.annual_ctc,
      gross_monthly: emp.gross_monthly,
      basic_monthly: emp.basic_monthly,
      hra_monthly: Math.round(emp.basic_monthly * 0.4),
      special_allowance_monthly: Math.max(0, specialAllowance),
      total_deductions: Math.min(1800, Math.round(emp.basic_monthly * 0.12)) + 200 + 25,
      net_take_home: emp.gross_monthly - (Math.min(1800, Math.round(emp.basic_monthly * 0.12)) + 200 + 25),
      slab_id: slabId,
      created_by: adminUserId,
      updated_by: adminUserId,
      created_at: now,
      updated_at: now,
    });

    console.log(`  └─ Salary Structure: Gross ₹${emp.gross_monthly.toLocaleString()}/mo | Basic ₹${emp.basic_monthly.toLocaleString()}/mo | Slab: ${slabId}`);
    createdEmployees.push({ id: empId, ...emp });
  }

  // ── Verification simulation ──────────────────────────────────────────────
  console.log('\n=== QUICK CALCULATION PREVIEW ===\n');
  for (const emp of testEmployees) {
    const monthly = emp.gross_monthly;
    const basic = emp.basic_monthly;
    const hra = Math.round(basic * 0.4);
    const da = Math.round(basic * 0.17);
    const conv = 1600;
    const med = 1250;
    const cea = 200;
    const lta = Math.round(basic * 8.33 / 100);
    const special = monthly - (basic + hra + da + conv + med + cea);
    const epf = Math.min(1800, Math.round(basic * 0.12));
    const esic = monthly <= 21000 ? Math.round(monthly * 0.75 / 100) : 0;
    const pt = 200;
    const lwf = 25;

    const totalEarnings = basic + hra + da + conv + med + cea + lta + Math.max(0, special);
    const totalDed = epf + esic + pt + lwf;
    const net = totalEarnings - totalDed;

    console.log(`👤 ${emp.first_name} ${emp.last_name} (${emp.gender}) — ₹${(emp.annual_ctc / 100000).toFixed(1)}L CTC`);
    console.log(`   Basic: ₹${basic.toLocaleString()}  HRA: ₹${hra.toLocaleString()}  DA: ₹${da.toLocaleString()}  Special: ₹${Math.max(0, special).toLocaleString()}`);
    console.log(`   EPF: ₹${epf}  ESIC: ₹${esic}  PT: ₹${pt}  LWF: ₹${lwf}`);
    console.log(`   → Net Pay: ₹${net.toLocaleString()} | ESIC Exempt: ${monthly > 21000 ? 'YES (Gross > ₹21K)' : 'NO'}`);
    console.log();
  }

  console.log('=== DONE — Test employees created ===');
  console.log('\nNext steps:');
  console.log('1. Go to Payroll → Payroll Processing');
  console.log('2. Create a New Run for August 2026');
  console.log('3. Add these employees to the run');
  console.log('4. Click Process All');
  console.log('5. Check payslips for each employee');

  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
