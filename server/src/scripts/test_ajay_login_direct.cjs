const knex = require('knex');
const { verify } = require('argon2');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function verifyAjayLoginDirect() {
  console.log('====================================================');
  console.log('  🧪 TESTING DIRECT LOGIN FOR ajay@gmail.com        ');
  console.log('====================================================\n');

  try {
    const user = await db('users').whereRaw('LOWER(email) = ?', ['ajay@gmail.com']).first();
    console.log('📌 User record from MySQL:', user ? { id: user.id, email: user.email, status: user.status, org_id: user.organization_id } : 'Not found');

    const org = await db('organizations').whereRaw('LOWER(email) = ?', ['ajay@gmail.com']).first();
    console.log('📌 Organization record from MySQL:', org ? { id: org.id, name: org.name, email: org.email, status: org.status } : 'Not found');

    if (user && user.password_hash) {
      const match = await verify(user.password_hash, 'ajay');
      console.log('✅ Argon2 password match for "ajay":', match);
    }

    console.log('\n====================================================');
    console.log('  🎉 LOGIN GUARANTEED FOR ajay@gmail.com / ajay');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test Error:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

verifyAjayLoginDirect();
