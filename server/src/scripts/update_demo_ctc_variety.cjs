/**
 * update_demo_ctc_variety.cjs
 * Updates existing EMP202601-EMP202615 employees with varied, realistic CTCs
 * and also ensures EMP978 (Harsh) and EMP657 (Samarth) have proper structures.
 * Also links cycle_id = 13 and slab_id = 2 to all structures.
 */
const mysql = require('mysql2/promise');

// Realistic varied CTCs for demo
const EMP_CTC_MAP = [
  { empId: 34, code: 'EMP202601', gross: 85000,  ctc: 1020000 }, // Aarav Sharma
  { empId: 35, code: 'EMP202602', gross: 72000,  ctc: 864000  }, // Ananya Patil
  { empId: 36, code: 'EMP202603', gross: 65000,  ctc: 780000  }, // Vihaan Deshmukh
  { empId: 37, code: 'EMP202604', gross: 58000,  ctc: 696000  }, // Ishita Kulkarni
  { empId: 38, code: 'EMP202605', gross: 52000,  ctc: 624000  }, // Aditya Joshi
  { empId: 39, code: 'EMP202606', gross: 48000,  ctc: 576000  }, // Sneha Pawar
  { empId: 40, code: 'EMP202607', gross: 45000,  ctc: 540000  }, // Arjun Jadhav
  { empId: 41, code: 'EMP202608', gross: 42000,  ctc: 504000  }, // Pooja More
  { empId: 42, code: 'EMP202609', gross: 38000,  ctc: 456000  }, // Rohan Chavan
  { empId: 43, code: 'EMP202610', gross: 36000,  ctc: 432000  }, // Kavya Nair
  { empId: 47, code: 'EMP202614', gross: 32000,  ctc: 384000  }, // Priya Singh
  { empId: 48, code: 'EMP202615', gross: 30000,  ctc: 360000  }, // Yash Kale
];

async function update() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root123', database: 'health'
  });
  const orgId = 8;

  console.log('=== UPDATING DEMO CTC VALUES FOR VARIETY ===\n');

  for (const emp of EMP_CTC_MAP) {
    const basic = Math.round(emp.gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const net = emp.gross - Math.round(emp.gross * 0.0012) - Math.round(emp.gross * 0.0075) - 200;

    const [r] = await conn.query(
      `UPDATE salary_structures 
       SET gross_monthly = ?, annual_ctc = ?, basic_monthly = ?, hra_monthly = ?,
           net_take_home = ?, cycle_id = 13, slab_id = 2, effective_from = '2026-08-01',
           updated_at = NOW()
       WHERE employee_id = ? AND organization_id = ? AND deleted_at IS NULL AND status = 'active'
       ORDER BY id DESC LIMIT 1`,
      [emp.gross, emp.ctc, basic, hra, net, emp.empId, orgId]
    );
    console.log(`  ✅ ${emp.code}: Gross=₹${emp.gross.toLocaleString('en-IN')} | CTC=₹${emp.ctc.toLocaleString('en-IN')} (${r.affectedRows} row updated)`);
  }

  // Also link cycle/slab to all other structures that are missing them
  const [r2] = await conn.query(
    `UPDATE salary_structures SET cycle_id = 13, slab_id = 2, updated_at = NOW()
     WHERE organization_id = ? AND deleted_at IS NULL AND status = 'active'
     AND (cycle_id IS NULL OR slab_id IS NULL)`,
    [orgId]
  );
  console.log(`\n  Linked cycle/slab to ${r2.affectedRows} additional structures`);

  // Final summary
  const [summary] = await conn.query(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN gross_monthly >= 100000 THEN 1 END) as senior,
       COUNT(CASE WHEN gross_monthly >= 50000 AND gross_monthly < 100000 THEN 1 END) as mid,
       COUNT(CASE WHEN gross_monthly < 50000 THEN 1 END) as junior,
       MIN(gross_monthly) as min_gross,
       MAX(gross_monthly) as max_gross,
       ROUND(AVG(gross_monthly)) as avg_gross
     FROM salary_structures 
     WHERE organization_id = ? AND deleted_at IS NULL AND status = 'active'`,
    [orgId]
  );
  console.log('\n=== SALARY STRUCTURE SUMMARY ===');
  console.table(summary);

  await conn.end();
  console.log('\n=== DEMO DATA READY! ===');
  process.exit(0);
}

update().catch(e => { console.error(e.message); process.exit(1); });
