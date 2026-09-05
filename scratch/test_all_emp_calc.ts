import mysql from 'mysql2/promise';
import { generateAccessToken } from '../server/src/common/lib/jwt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function testAllEmps() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  const [users]: any = await conn.query('SELECT * FROM users WHERE id = 4');
  const user = users[0];

  const token = generateAccessToken({
    sub: String(user.id),
    userId: user.id,
    organizationId: user.organization_id,
    role: user.role,
    userType: 'employee'
  } as any);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Company-Id': '5',
    'Content-Type': 'application/json'
  };

  const baseUrl = 'http://localhost:5000/api/v1/payroll';

  const res = await fetch(`${baseUrl}/process-register?month=2026-09`, { headers });
  const data = await res.json();

  console.log('\n================ PAYROLL PROCESS REGISTER AUDIT ================');
  console.log(`Success: ${data.success}`);
  console.log(`Total Employees Processed: ${data.data?.rows?.length || 0}`);
  console.log(`Dynamic Component Columns: ${data.component_definitions?.length || 0}`);

  if (data.data?.rows) {
    console.log('\n---------------- EMPLOYEES SUMMARY ----------------');
    for (const emp of data.data.rows) {
      console.log(`
Employee ID: ${emp.employee_id} | Name: ${emp.employee_name} | Code: ${emp.employee_code}
Slab: ${emp.slab_name || emp.salary_slab} | Annual CTC: ₹${emp.ctc || emp.annual_ctc}
Gross Monthly: ₹${emp.gross_monthly} | Earned Gross: ₹${emp.gross_earned} | Total Deductions: ₹${emp.total_deduction} | Net Salary: ₹${emp.net_salary}
Paid Days: ${emp.paid_days} | Lop Days: ${emp.lop_days} | Status: ${emp.status}`);
      
      console.log('Earned Component Values:');
      if (emp.component_values) {
        for (const [compId, compVal] of Object.entries(emp.component_values as Record<string, any>)) {
          console.log(`  - [ID ${compId}] ${compVal.name} (${compVal.category}): Monthly ₹${compVal.monthly} -> Earned ₹${compVal.earned}`);
        }
      }
    }
  }

  await conn.end();
}

testAllEmps().catch(console.error);
