const knex = require('knex');
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

async function debugLoginError() {
  console.log('====================================================');
  console.log('  🔍 DEBUGGING AUTH LOGIN ERROR FOR ajay@gmail.com ');
  console.log('====================================================\n');

  try {
    const { AuthService } = require('../dist/modules/auth/auth.service.js');
    const service = new AuthService();
    const result = await service.login('ajay@gmail.com', 'ajay');
    console.log('✅ Login succeeded! Output:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ LOGIN THREW EXCEPTION:');
    console.error(err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

debugLoginError();
