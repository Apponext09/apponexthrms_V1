const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './server/.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'apponexthrms_jwt_secret_key_2026_super_secure';

async function testEndpoints() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  // Get user ID 4 (abhishek@gmail.com, org 3)
  const [users] = await conn.query('SELECT * FROM users WHERE id = 4');
  const user = users[0];
  console.log('Test User:', user.email, 'Org ID:', user.organization_id);

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, organizationId: user.organization_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Company-Id': '5',
    'Content-Type': 'application/json'
  };

  const baseUrl = 'http://localhost:5000/api/v1/payroll';

  async function fetchJson(endpoint) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, { headers });
      const data = await res.json();
      return { status: res.status, data };
    } catch (err) {
      return { error: err.message };
    }
  }

  console.log('\n--- 1. CYCLES ---');
  const cyclesRes = await fetchJson('/cycles');
  console.log('Status:', cyclesRes.status, 'Data:', JSON.stringify(cyclesRes.data, null, 2));

  console.log('\n--- 2. COMPONENT GROUPS ---');
  const groupsRes = await fetchJson('/component-groups');
  console.log('Status:', groupsRes.status, 'Count:', Array.isArray(groupsRes.data?.data) ? groupsRes.data.data.length : groupsRes.data);

  console.log('\n--- 3. COMPONENT DEFINITIONS / COMPONENTS ---');
  const compsRes = await fetchJson('/components');
  console.log('Status:', compsRes.status, 'Count:', Array.isArray(compsRes.data?.data) ? compsRes.data.data.length : compsRes.data);

  console.log('\n--- 4. SLABS ---');
  const slabsRes = await fetchJson('/slabs');
  console.log('Status:', slabsRes.status, 'Data:', JSON.stringify(slabsRes.data, null, 2));

  console.log('\n--- 5. PROCESS REGISTER (Sept 2026) ---');
  const regRes = await fetchJson('/process-register?month=2026-09');
  console.log('Status:', regRes.status, 'Employees:', regRes.data?.data?.employees?.length, 'Columns:', regRes.data?.data?.dynamicColumns?.length);
  if (regRes.data?.data?.employees?.length > 0) {
    console.log('First Employee Calc:', {
      name: regRes.data.data.employees[0].employee_name,
      ctc: regRes.data.data.employees[0].annual_ctc,
      gross: regRes.data.data.employees[0].gross_earnings,
      takeHome: regRes.data.data.employees[0].net_take_home,
      earnings: regRes.data.data.employees[0].earnings,
      deductions: regRes.data.data.employees[0].deductions
    });
  }

  await conn.end();
}

testEndpoints().catch(console.error);
