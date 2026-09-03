const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedArham() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  console.log('=== 1. CHECK / CREATE COMPANY ARHAM ===');
  const [existingComp] = await conn.query('SELECT * FROM company WHERE name = ? AND organization_id = ?', ['Arham', 8]);
  
  let companyId;
  if (existingComp.length > 0) {
    companyId = existingComp[0].company_id;
    console.log('Company Arham already exists with ID:', companyId);
  } else {
    const compUuid = uuidv4();
    const [compRes] = await conn.query(`
      INSERT INTO company (
        uuid, organization_id, is_parent, code, name, employer_name,
        class_of_establishment, address_line_1, country, state, city,
        pan_tin, contact_number, email, status, is_active_toggle, active_users_toggle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      compUuid, 8, 0, 'ARHAM', 'Arham', 'Arham Enterprises',
      'Information Technology & Services', 'Station Road, Savedi', 'India', 'Maharashtra', 'Ahilyanagar',
      'AABCA1234F', '+91 241 2345678', 'contact@arham.com', 'Active', 1, 1
    ]);
    companyId = compRes.insertId;
    console.log('Created Company Arham with ID:', companyId);
  }

  console.log('=== 2. CHECK / CREATE LOCATION AHILYANAGAR ===');
  const [existingLoc] = await conn.query('SELECT * FROM locations WHERE (city = ? OR name LIKE ?) AND organization_id = ?', ['Ahilyanagar', '%Ahilyanagar%', 8]);
  
  let locationId;
  if (existingLoc.length > 0) {
    locationId = existingLoc[0].id;
    console.log('Ahilyanagar Location already exists with ID:', locationId);
  } else {
    const locUuid = uuidv4();
    const [locRes] = await conn.query(`
      INSERT INTO locations (
        uuid, organization_id, company_id, name, code,
        city, state, country, status, is_active, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      locUuid, 8, companyId, 'Ahilyanagar Branch', 'LOC-AHIL',
      'Ahilyanagar', 'Maharashtra', 'India', 'active', 'Yes', 10, 10
    ]);
    locationId = locRes.insertId;
    console.log('Created Location Ahilyanagar with ID:', locationId);
  }

  console.log('=== 3. FETCH DEPARTMENTS AND DESIGNATIONS ===');
  const [depts] = await conn.query('SELECT id, name FROM departments WHERE organization_id = 8 LIMIT 10');
  const [desigs] = await conn.query('SELECT id, name FROM designations WHERE organization_id = 8 LIMIT 10');
  const defaultDeptId = depts[0]?.id || 1;
  const defaultDesigId = desigs[0]?.id || 1;

  const employeesData = [
    { code: 'ARH001', first: 'Aarav', last: 'Shah', email: 'aarav.shah@arham.com', phone: '+91 9823011001', gender: 'male', gross: 95000, title: 'Engineering Manager', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[0]?.id || defaultDesigId },
    { code: 'ARH002', first: 'Priya', last: 'Deshmukh', email: 'priya.deshmukh@arham.com', phone: '+91 9823011002', gender: 'female', gross: 75000, title: 'Senior Software Engineer', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[1]?.id || defaultDesigId },
    { code: 'ARH003', first: 'Rohan', last: 'Kulkarni', email: 'rohan.kulkarni@arham.com', phone: '+91 9823011003', gender: 'male', gross: 55000, title: 'Full Stack Developer', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[2]?.id || defaultDesigId },
    { code: 'ARH004', first: 'Sneha', last: 'Patil', email: 'sneha.patil@arham.com', phone: '+91 9823011004', gender: 'female', gross: 45000, title: 'HR Executive', deptId: depts[1]?.id || defaultDeptId, desigId: desigs[3]?.id || defaultDesigId },
    { code: 'ARH005', first: 'Vikram', last: 'Shinde', email: 'vikram.shinde@arham.com', phone: '+91 9823011005', gender: 'male', gross: 65000, title: 'Sales Manager', deptId: depts[2]?.id || defaultDeptId, desigId: desigs[4]?.id || defaultDesigId },
    { code: 'ARH006', first: 'Ananya', last: 'Joshi', email: 'ananya.joshi@arham.com', phone: '+91 9823011006', gender: 'female', gross: 50000, title: 'UI/UX Designer', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[2]?.id || defaultDesigId },
    { code: 'ARH007', first: 'Karan', last: 'Gaikwad', email: 'karan.gaikwad@arham.com', phone: '+91 9823011007', gender: 'male', gross: 42000, title: 'QA Engineer', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[2]?.id || defaultDesigId },
    { code: 'ARH008', first: 'Pooja', last: 'More', email: 'pooja.more@arham.com', phone: '+91 9823011008', gender: 'female', gross: 40000, title: 'Accounts Executive', deptId: depts[3]?.id || defaultDeptId, desigId: desigs[3]?.id || defaultDesigId },
    { code: 'ARH009', first: 'Aditya', last: 'Pawar', email: 'aditya.pawar@arham.com', phone: '+91 9823011009', gender: 'male', gross: 60000, title: 'DevOps Engineer', deptId: depts[0]?.id || defaultDeptId, desigId: desigs[1]?.id || defaultDesigId },
    { code: 'ARH010', first: 'Neha', last: 'Tambe', email: 'neha.tambe@arham.com', phone: '+91 9823011010', gender: 'female', gross: 38000, title: 'Operations Specialist', deptId: depts[4]?.id || defaultDeptId, desigId: desigs[4]?.id || defaultDesigId }
  ];

  console.log('=== 4. INSERTING 10 EMPLOYEES & SALARY STRUCTURES ===');
  for (let i = 0; i < employeesData.length; i++) {
    const emp = employeesData[i];
    const [existingEmp] = await conn.query('SELECT id FROM employees WHERE email = ? AND organization_id = ?', [emp.email, 8]);
    
    let empId;
    if (existingEmp.length > 0) {
      empId = existingEmp[0].id;
      console.log(`Employee ${emp.code} (${emp.first} ${emp.last}) exists (ID: ${empId})`);
    } else {
      const empUuid = uuidv4();
      const aadhar = '8921' + String(1000 + i) + '4512';
      const pan = 'ARHPM' + String(2000 + i) + 'K';
      const accNo = '9876543210' + String(10 + i);

      const [res] = await conn.query(`
        INSERT INTO employees (
          uuid, organization_id, company_id, employee_code, status,
          first_name, last_name, email, phone, mobile,
          date_of_birth, gender, blood_group, nationality,
          aadhar_number, pan_number, current_designation_id, current_department_id,
          current_location_id, employment_type, date_of_joining,
          job_title, bank_name, account_no, ifsc_code, branch_name,
          pf_no, uan_no, esic_no, created_by, updated_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `, [
        empUuid, 8, companyId, emp.code, 'active',
        emp.first, emp.last, emp.email, emp.phone, emp.phone,
        '1995-05-15', emp.gender, 'O+', 'Indian',
        aadhar, pan, emp.desigId, emp.deptId,
        locationId, 'Full Time', '2026-01-15',
        emp.title, 'Bank of Maharashtra', accNo, 'MAHB0001234', 'Ahilyanagar Main',
        'MH/PUN/' + String(3000 + i), '1012345678' + String(i), '310000000000000' + String(i), 10, 10
      ]);
      empId = res.insertId;
      console.log(`✅ Created Employee ${emp.code}: ${emp.first} ${emp.last} (${emp.title}) -> ID: ${empId}`);
    }

    // Salary Structure
    const [existingStruct] = await conn.query('SELECT id FROM salary_structures WHERE employee_id = ?', [empId]);
    if (existingStruct.length === 0) {
      const basic = Math.round(emp.gross * 0.50);
      const hra = Math.round(basic * 0.40);
      const special = emp.gross - (basic + hra);
      const annualCtc = emp.gross * 12;
      const net = emp.gross - 200 - 1800; // Approx PT & PF

      await conn.query(`
        INSERT INTO salary_structures (
          uuid, organization_id, company_id, employee_id, structure_name, structure_code,
          annual_ctc, basic_monthly, hra_monthly, special_allowance_monthly,
          gross_monthly, pf_deduction, net_take_home, effective_from, status,
          created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), 8, companyId, empId, `Structure for ${emp.first}`, `STR-${emp.code}`,
        annualCtc, basic, hra, special,
        emp.gross, 1800, net, '2026-01-15', 'active',
        10, 10
      ]);
      console.log(`   -> Salary Structure assigned: Gross ₹${emp.gross}/mo | Net ₹${net}/mo`);
    }
  }

  console.log('=== 5. CHECK / CREATE ARHAM PAYROLL CYCLE ===');
  const [existingCyc] = await conn.query('SELECT id FROM payroll_cycles WHERE company_id = ? AND organization_id = ?', [companyId, 8]);
  if (existingCyc.length === 0) {
    await conn.query(`
      INSERT INTO payroll_cycles (
        uuid, organization_id, company_id, cycle_name, cycle_code, cycle_type,
        cycle_start_date, cycle_end_date, payroll_run_date, salary_credit_date,
        frequency, start_date, cutoff_day, disbursement_date_str, total_days_calc,
        is_active, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(), 8, companyId, 'Arham Ahilyanagar Monthly Cycle', 'CYC-ARHAM-01', 'monthly',
      '2026-08-01', '2026-08-31', '2026-08-25', '2026-08-27',
      'Monthly', 1, 25, '27', '30',
      1, 'open', 10, 10
    ]);
    console.log('✅ Created Arham Payroll Cycle (Cutoff: 25th, Disbursed: 27th)');
  } else {
    console.log('Arham Payroll Cycle already active (ID:', existingCyc[0].id, ')');
  }

  await conn.end();
  console.log('\n🎉 ALL DONE! Company Arham (Ahilyanagar) + 10 Employees seeded with full structures!');
}

seedArham().catch(err => {
  console.error('Error seeding Arham:', err);
  process.exit(1);
});
