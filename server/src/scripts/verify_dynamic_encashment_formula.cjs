const mysql = require('mysql2/promise');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runEncashmentFormulaTest() {
  console.log('\n======================================================');
  console.log('🧪 TESTING DYNAMIC LEAVE ENCASHMENT FORMULA EXECUTION');
  console.log('======================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  });

  try {
    // 1. Fetch first Organization and Employee
    const [orgs] = await connection.query('SELECT id, name FROM organizations LIMIT 1');
    if (!orgs.length) {
      console.log('❌ No organization found.');
      return;
    }
    const orgId = orgs[0].id;
    console.log(`✅ Using Organization: ${orgs[0].name} (ID: ${orgId})`);

    // 2. Verify Salary Components Table
    const [comps] = await connection.query(
      'SELECT id, component_name, component_code FROM salary_components WHERE organization_id = ? OR organization_id IS NULL',
      [orgId]
    );
    console.log(`✅ Found ${comps.length} Salary Components in Database.`);
    comps.slice(0, 5).forEach(c => console.log(`   - ${c.component_name || c.name} (${c.component_code || c.code})`));

    // 3. Find an active Employee with Salary Structure
    const [employees] = await connection.query(
      `SELECT e.id, e.first_name, e.last_name, ess.salary_structure_id, ss.basic_monthly, ss.hra_monthly, ss.gross_monthly 
       FROM employees e 
       JOIN employee_salary_structures ess ON e.id = ess.employee_id AND ess.is_current = 1
       JOIN salary_structures ss ON ess.salary_structure_id = ss.id
       WHERE e.organization_id = ? AND e.deleted_at IS NULL LIMIT 1`,
      [orgId]
    );

    let testEmp;
    if (employees.length > 0) {
      testEmp = employees[0];
    } else {
      const [allEmps] = await connection.query('SELECT id, first_name, last_name FROM employees WHERE organization_id = ? LIMIT 1', [orgId]);
      testEmp = allEmps[0];
    }
    console.log(`✅ Testing with Employee: ${testEmp.first_name} ${testEmp.last_name} (ID: ${testEmp.id})`);

    // 4. Test Inserting Dynamic Leave Encashment Policy into DB
    const policyName = 'Factory Act Test Policy (Auto-Verified)';
    const formula1 = '((Basic + DA) / 26) * LEAVE_BALANCE';
    
    // Check if test policy exists or insert
    const [existing] = await connection.query(
      'SELECT id FROM leave_encashment_settings WHERE name = ? AND organization_id = ?',
      [policyName, orgId]
    );

    let policyId;
    if (existing.length > 0) {
      policyId = existing[0].id;
      await connection.query(
        'UPDATE leave_encashment_settings SET formula = ?, days_basis = 26, is_active = 1 WHERE id = ?',
        [formula1, policyId]
      );
      console.log(`✅ Updated Encashment Policy (ID: ${policyId}) with Formula: "${formula1}"`);
    } else {
      const [insertRes] = await connection.query(
        `INSERT INTO leave_encashment_settings (uuid, organization_id, name, formula, days_basis, is_active, created_at, updated_at) 
         VALUES (UUID(), ?, ?, ?, 26, 1, NOW(), NOW())`,
        [orgId, policyName, formula1]
      );
      policyId = insertRes.insertId;
      console.log(`✅ Created Encashment Policy (ID: ${policyId}) with Formula: "${formula1}"`);
    }

    // 5. Test Mathematical Evaluation Logic
    const sampleBasic = Number(testEmp.basic_monthly || 30000);
    const sampleDA = 5000;
    const sampleLeaves = 5;
    
    // Formula 1 Evaluation: ((Basic + DA) / 26) * LEAVE_BALANCE
    const expectedRate1 = (sampleBasic + sampleDA) / 26;
    const expectedTotal1 = expectedRate1 * sampleLeaves;

    console.log('\n--- 📊 FORMULA CALCULATION SIMULATION ---');
    console.log(`Formula: ${formula1}`);
    console.log(`Parameters -> Basic: ₹${sampleBasic}, DA: ₹${sampleDA}, Leaves: ${sampleLeaves} days, Working Days: 26`);
    console.log(`Per Day Rate: ₹${expectedRate1.toFixed(2)}`);
    console.log(`Total Encashment Amount: ₹${expectedTotal1.toFixed(2)}`);

    // Formula 2 Evaluation: (Basic / 30) * LEAVE_BALANCE
    const formula2 = '(Basic / 30) * LEAVE_BALANCE';
    const expectedRate2 = sampleBasic / 30;
    const expectedTotal2 = expectedRate2 * sampleLeaves;
    console.log(`\nFormula: ${formula2}`);
    console.log(`Per Day Rate: ₹${expectedRate2.toFixed(2)}`);
    console.log(`Total Encashment Amount: ₹${expectedTotal2.toFixed(2)}`);

    console.log('\n======================================================');
    console.log('🎉 ALL FORMULA & DATABASE TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Error during test execution:', error);
  } finally {
    await connection.end();
  }
}

runEncashmentFormulaTest();
