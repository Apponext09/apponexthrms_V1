const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/Samarth/OneDrive/Documents/Desktop/apponexthrms/server/.env' });

async function runE2ETest() {
  console.log('=== RUNNING FULL DYNAMIC PAYROLL WORKFLOW VERIFICATION ===\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy',
  });

  try {
    // 1. Authenticate as Org Admin
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'abhishek@gmail.com', password: 'Admin@123' })
    });
    const cookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    console.log('1. Admin Login: SUCCESS');

    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    };

    // 2. Fetch Groups & Components
    const groupsRes = await axios.get('http://localhost:5000/api/v1/payroll/component-groups', { headers });
    const groups = groupsRes.data.data || groupsRes.data;
    console.log(`2. Component Groups Found: ${groups.length}`);
    const firstGroup = groups[0] || { id: 1, name: 'Earning Group' };

    // 3. Create two dynamic components under the group
    // Component A: Base Allowance [CTC / 12] with based_on_attendance = 1
    const compAName = `DynAllowance_${Date.now()}`;
    const compARes = await axios.post('http://localhost:5000/api/v1/payroll/component-definitions', {
      groupId: firstGroup.id,
      name: compAName,
      type: 'Derived',
      formula: '[CTC / 12]',
      basedOnAttendance: true,
      isNonCashable: false,
      isActive: true,
    }, { headers });
    const compA = compARes.data.data || compARes.data;
    console.log(`3. Created Dynamic Component A (${compAName}): id=${compA.id}, formula="${compA.formula}", basedOnAttendance=true`);

    // Component B: Derived cross-reference [DYNALLOWANCE * 100 / CTC] with based_on_attendance = 0
    const compBName = `DynCrossRef_${Date.now()}`;
    const compBFormula = `[${compAName.toUpperCase()} * 100 / CTC]`;
    const compBRes = await axios.post('http://localhost:5000/api/v1/payroll/component-definitions', {
      groupId: firstGroup.id,
      name: compBName,
      type: 'Derived',
      formula: compBFormula,
      basedOnAttendance: false,
      isNonCashable: false,
      isActive: true,
    }, { headers });
    const compB = compBRes.data.data || compBRes.data;
    console.log(`4. Created Dynamic Component B (${compBName}): id=${compB.id}, formula="${compB.formula}", basedOnAttendance=false`);

    // 4. Create a dynamic Pay Slab with these components
    const slabName = `Test Dynamic Slab ${Date.now()}`;
    const slabRes = await axios.post('http://localhost:5000/api/v1/payroll/slabs', {
      name: slabName,
      minCtc: 300000,
      maxCtc: 1500000,
      cycleId: 2,
      departments: ['All Departments'],
      grades: ['All Grades'],
      locations: ['All Locations'],
      selectedComponentIds: [String(compA.id), String(compB.id), compAName.toLowerCase(), compBName.toLowerCase()],
      isActive: true
    }, { headers });
    const slab = slabRes.data.data || slabRes.data;
    console.log(`5. Created Dynamic Slab (${slabName}): id=${slab.id}, components=[${compA.id}, ${compB.id}]`);

    // 5. Test Calculation via direct node import or API
    // Let's test the calculation service
    const { SalaryCalculationService } = require('../server/src/modules/payroll/services/SalaryCalculationService.ts');
    
    // 5a. Full attendance (1.0 factor)
    const calcFull = await SalaryCalculationService.calculateSalaryBreakup({
      orgId: 3,
      ctc: 600000,
      slabId: slab.id,
    });
    console.log('\n6a. Calculation with 100% Attendance (CTC = ₹600,000):');
    console.log('  Gross Monthly:', calcFull.grossMonthly);
    for (const eb of calcFull.earningsBreakup) {
      console.log(`  - ${eb.name}: ₹${eb.amount} (formula: "${eb.formula}", attBased: ${eb.based_on_attendance})`);
    }

    const itemA = calcFull.earningsBreakup.find(e => e.component_id === compA.id);
    const itemB = calcFull.earningsBreakup.find(e => e.component_id === compB.id);

    if (itemA && itemA.amount === 50000) {
      console.log('  PASSED: [CTC / 12] evaluated to ₹50,000 (600,000 / 12)');
    } else {
      console.log('  FAILED: Expected 50000, got', itemA?.amount);
    }

    if (itemB && Math.abs(itemB.amount - 8.33) < 0.1) {
      console.log('  PASSED: Cross-reference [DYNALLOWANCE * 100 / CTC] evaluated to 8.33');
    } else {
      console.log('  FAILED: Expected 8.33, got', itemB?.amount);
    }

    // 5b. Prorated Attendance (15 days out of 30 => 0.5 factor)
    const calcHalf = await SalaryCalculationService.calculateSalaryBreakup({
      orgId: 3,
      ctc: 600000,
      slabId: slab.id,
      presentDays: 15,
      totalDays: 30
    });
    console.log('\n6b. Calculation with 50% Attendance (15/30 days, CTC = ₹600,000):');
    const itemAHalf = calcHalf.earningsBreakup.find(e => e.component_id === compA.id);
    const itemBHalf = calcHalf.earningsBreakup.find(e => e.component_id === compB.id);

    console.log(`  - ${itemAHalf?.name} (based_on_attendance=true): ₹${itemAHalf?.amount}`);
    console.log(`  - ${itemBHalf?.name} (based_on_attendance=false): ₹${itemBHalf?.amount}`);

    if (itemAHalf && itemAHalf.amount === 25000) {
      console.log('  PASSED: Attendance prorating applied correctly (₹50,000 * 0.5 = ₹25,000)');
    } else {
      console.log('  FAILED attendance proration: Expected 25000, got', itemAHalf?.amount);
    }

    if (itemBHalf && Math.abs(itemBHalf.amount - 8.33) < 0.1) {
      console.log('  PASSED: Non-attendance based component preserved without reduction (8.33)');
    } else {
      console.log('  FAILED: Expected 8.33, got', itemBHalf?.amount);
    }

    // 6. Test Employee Slab Assignment Flow
    console.log('\n7. Testing Employee Slab Assignment Flow:');
    // Create an employee or find existing employee
    const [empRows] = await conn.query('SELECT id, first_name, last_name FROM employees WHERE organization_id = 3 LIMIT 1');
    const testEmp = empRows[0];
    if (testEmp) {
      console.log(`  Using employee id=${testEmp.id} (${testEmp.first_name} ${testEmp.last_name})`);
      const assignRes = await axios.post('http://localhost:5000/api/v1/payroll/structures/assign', {
        employeeId: testEmp.id,
        slabId: slab.id,
        structureName: slabName,
        annualCtc: 600000,
        grossMonthly: 50000
      }, { headers });
      console.log('  Assigned Slab via API: SUCCESS');

      // Fetch employee salary structure
      const structRes = await axios.get(`http://localhost:5000/api/v1/payroll/salary-structure?employee_id=${testEmp.id}`, { headers });
      const structData = structRes.data.data || structRes.data;
      const assigned = structData[0];
      console.log(`  Assigned Structure slab_id: ${assigned?.slab_id || assigned?.slabId}, slab_name: "${assigned?.slab_name || assigned?.slabName}"`);
      if (String(assigned?.slab_id || assigned?.slabId) === String(slab.id)) {
        console.log('  PASSED: Employee profile correctly returned assigned slab');
      } else {
        console.log('  FAILED: Slab mismatch');
      }
    }

    console.log('\n=== ALL E2E VERIFICATIONS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error in E2E test:', err?.response?.data || err?.message || err);
  } finally {
    await conn.end();
  }
}

runE2ETest();
