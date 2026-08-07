require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });
const { verify } = require('argon2');

async function testEmployeeLogins() {
  console.log('=== TESTING EMPLOYEE PASSWORDS ===');

  const users = await k('users')
    .whereNull('deleted_at')
    .whereNotNull('employee_id')
    .select('id', 'email', 'password_hash');

  console.log(`Testing ${users.length} active employee user accounts against sample passwords...\n`);

  const samplePasswords = ['Password@123', 'password123', 'Password123', 'admin123', '123456'];

  for (const u of users) {
    let matchedPassword = null;
    for (const pw of samplePasswords) {
      try {
        if (await verify(u.password_hash, pw)) {
          matchedPassword = pw;
          break;
        }
      } catch (err) {}
    }

    if (matchedPassword) {
      console.log(`✓ ${u.email} -> Password is "${matchedPassword}"`);
    } else {
      console.log(`❓ ${u.email} -> Password does NOT match standard test passwords`);
    }
  }

  await k.destroy();
}

testEmployeeLogins().catch(e => { console.error(e); k.destroy(); });
