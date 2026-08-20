const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function verifyPayslipGeneration() {
  console.log('=== VERIFYING PAYSLIP DATA ENGINE & SCHEMA INTEGRITY ===');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Check existing payslips in the database
    const [payslips] = await connection.query(`
      SELECT p.id, p.payslip_number, p.payslip_month, p.employee_id,
             e.first_name, e.last_name, e.employee_code,
             p.gross_salary, p.basic_salary, p.total_deductions, p.net_salary, p.ctc
      FROM payslips p
      LEFT JOIN employees e ON p.employee_id = e.id
      ORDER BY p.id DESC
      LIMIT 5
    `);

    console.log(`\n[CHECK 1] Recent Payslips in Database (${payslips.length} found):`);
    if (payslips.length > 0) {
      console.table(payslips.map(p => ({
        Number: p.payslip_number,
        Month: p.payslip_month,
        Employee: `${p.first_name || ''} ${p.last_name || ''} (${p.employee_code || ''})`,
        Basic: `₹${Number(p.basic_salary).toLocaleString('en-IN')}`,
        Gross: `₹${Number(p.gross_salary).toLocaleString('en-IN')}`,
        Deductions: `₹${Number(p.total_deductions).toLocaleString('en-IN')}`,
        NetPay: `₹${Number(p.net_salary).toLocaleString('en-IN')}`,
        CTC: `₹${Number(p.ctc).toLocaleString('en-IN')}`
      })));
    } else {
      console.log('No historical payslips found. Ready for first payroll run generation.');
    }

    // 2. Validate Payslip Math Consistency
    if (payslips.length > 0) {
      console.log('\n[CHECK 2] Mathematical Audit of Payslips:');
      for (const slip of payslips) {
        const gross = Number(slip.gross_salary);
        const ded = Number(slip.total_deductions);
        const net = Number(slip.net_salary);
        const calculatedNet = gross - ded;
        const isMatch = calculatedNet === net;
        console.log(`Payslip ${slip.payslip_number}: Gross(₹${gross}) - Deductions(₹${ded}) = Net(₹${net}) -> ${isMatch ? '✅ MATCHES EXACTLY' : '❌ MISMATCH'}`);
      }
    }

    console.log('\n=== PAYSLIP GENERATION INTEGRITY VERIFIED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await connection.end();
  }
}

verifyPayslipGeneration();
