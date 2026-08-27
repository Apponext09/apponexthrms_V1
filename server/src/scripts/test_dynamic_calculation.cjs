const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testDynamicCalculation() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'health',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  console.log('=== TESTING DYNAMIC CTC-DRIVEN SLAB & COMPONENT CALCULATION ===');

  // 1. Fetch Arham Employees (Company 18)
  const [employees] = await conn.query(`
    SELECT id, employee_code, first_name, last_name, company_id, organization_id 
    FROM employees 
    WHERE company_id = 18 
    ORDER BY id ASC
  `);

  console.log(`Found ${employees.length} employees in Arham (Company 18)`);

  // 2. Fetch slabs and pay cycle for Arham
  const [slabs] = await conn.query('SELECT id, name, min_ctc, max_ctc, selected_component_ids, cycle_id FROM payroll_slabs');
  await conn.query('UPDATE payroll_cycles SET company_id = 18 WHERE id = 12');
  const arhamCycleId = 12;

  // 3. For each employee, calculate their dynamic components from their CTC
  for (const emp of employees) {
    const [existingStr] = await conn.query('SELECT annual_ctc, gross_monthly FROM salary_structures WHERE employee_id = ?', [emp.id]);
    const annualCtc = Number(existingStr[0]?.annual_ctc || 600000);
    const grossMonthly = Number(existingStr[0]?.gross_monthly || annualCtc / 12);

    // Match Slab by CTC bracket
    const matchedSlab = slabs.find(s => annualCtc >= Number(s.min_ctc) && annualCtc <= Number(s.max_ctc)) || slabs[0];

    // Compute components dynamically
    const basicMonthly = Math.round(grossMonthly * 0.50);
    const hraMonthly = Math.round(basicMonthly * 0.40);
    const pfDeduction = Math.round(Math.min(basicMonthly, 15000) * 0.12);
    const ptDeduction = 200;
    const esiDeduction = grossMonthly <= 21000 ? Math.round(grossMonthly * 0.0075) : 0;
    const specialAllowanceMonthly = Math.max(0, grossMonthly - (basicMonthly + hraMonthly));
    const totalDeductions = pfDeduction + ptDeduction + esiDeduction;
    const netTakeHome = grossMonthly - totalDeductions;

    const earningsBreakup = [
      { component_id: 1, code: 'BASIC', name: 'Basic Salary', type: 'Formula', formula: '50% of CTC', amount: basicMonthly },
      { component_id: 2, code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'Formula', formula: '40% of Basic', amount: hraMonthly },
      { component_id: 3, code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'Derived', formula: 'CTC - (Basic + HRA + Other)', amount: specialAllowanceMonthly }
    ];

    const deductionsBreakup = [
      { component_id: 9, code: 'PF', name: 'Employee Provident Fund (EPF)', type: 'Formula', formula: '12% of Basic (capped at 1800)', amount: pfDeduction },
      { component_id: 11, code: 'PT', name: 'Professional Tax', type: 'Value', formula: 'Fixed PT Slab', amount: ptDeduction },
      ...(esiDeduction > 0 ? [{ component_id: 10, code: 'ESIC', name: 'Employee State Insurance (ESIC)', type: 'Formula', amount: esiDeduction }] : [])
    ];

    // Update salary_structures with explicit slab_id, cycle_id, and dynamic breakups
    await conn.query(`
      UPDATE salary_structures 
      SET 
        slab_id = ?,
        cycle_id = ?,
        annual_ctc = ?,
        gross_monthly = ?,
        basic_monthly = ?,
        hra_monthly = ?,
        special_allowance_monthly = ?,
        total_deductions = ?,
        pf_deduction = ?,
        esi_deduction = ?,
        tds_deduction = 0,
        net_take_home = ?,
        earnings_breakup = ?,
        deductions_breakup = ?
      WHERE employee_id = ?
    `, [
      matchedSlab.id,
      arhamCycleId,
      annualCtc,
      grossMonthly,
      basicMonthly,
      hraMonthly,
      specialAllowanceMonthly,
      totalDeductions,
      pfDeduction,
      esiDeduction,
      netTakeHome,
      JSON.stringify(earningsBreakup),
      JSON.stringify(deductionsBreakup),
      emp.id
    ]);
  }

  // 4. Query and print the updated salary_structures
  const [results] = await conn.query(`
    SELECT 
      ss.id,
      e.employee_code,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      ss.slab_id,
      ps.name AS slab_name,
      ss.cycle_id,
      pc.cycle_name,
      ss.annual_ctc,
      ss.gross_monthly,
      ss.basic_monthly,
      ss.hra_monthly,
      ss.special_allowance_monthly,
      ss.total_deductions,
      ss.net_take_home,
      ss.earnings_breakup,
      ss.deductions_breakup
    FROM salary_structures ss
    JOIN employees e ON e.id = ss.employee_id
    LEFT JOIN payroll_slabs ps ON ps.id = ss.slab_id
    LEFT JOIN payroll_cycles pc ON pc.id = ss.cycle_id
    WHERE ss.company_id = 18
    ORDER BY ss.employee_id ASC
  `);

  console.log('\n✅ VERIFIED SALARY STRUCTURES IN DB:');
  console.table(results.map(r => ({
    Code: r.employee_code,
    Name: r.employee_name,
    SlabId: r.slab_id,
    Slab: r.slab_name,
    CycleId: r.cycle_id,
    Cycle: r.cycle_name,
    CTC: r.annual_ctc,
    Gross: r.gross_monthly,
    Basic: r.basic_monthly,
    HRA: r.hra_monthly,
    Special: r.special_allowance_monthly,
    Deductions: r.total_deductions,
    NetTakeHome: r.net_take_home
  })));

  console.log('\nSample Dynamic Breakup JSON (Aarav Shah):');
  const eb = typeof results[0].earnings_breakup === 'string' ? JSON.parse(results[0].earnings_breakup) : results[0].earnings_breakup;
  const db = typeof results[0].deductions_breakup === 'string' ? JSON.parse(results[0].deductions_breakup) : results[0].deductions_breakup;

  console.log('Earnings Breakup:', eb);
  console.log('Deductions Breakup:', db);

  await conn.end();
}

testDynamicCalculation().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
