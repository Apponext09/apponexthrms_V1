import mysql from 'mysql2/promise';
import { generateAccessToken } from '../server/src/common/lib/jwt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function testEndpoints() {
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

  console.log('--- PROCESS REGISTER FULL RESPONSE ---');
  console.log(JSON.stringify(data, null, 2));

  await conn.end();
}

testEndpoints().catch(console.error);
