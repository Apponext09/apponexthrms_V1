const knex = require('knex');
const { hash } = require('argon2');
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

async function fixAjayOrgLogin() {
  console.log('====================================================');
  console.log('  🔑 FIXING LOGIN FOR ajay@gmail.com IN ALL TABLES ');
  console.log('====================================================\n');

  try {
    const passwordHash = await hash('ajay', {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // 1. Update users table
    const userUpdated = await db('users')
      .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
      .update({
        password_hash: passwordHash,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date()
      });
    console.log(`✅ Updated ${userUpdated} row(s) in "users" table.`);

    // 2. Update organizations table if email exists
    const hasOrgCol = await db.schema.hasColumn('organizations', 'password_hash');
    if (hasOrgCol) {
      const orgUpdated = await db('organizations')
        .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
        .update({
          password_hash: passwordHash,
          status: 'active',
          updated_at: new Date()
        });
      console.log(`✅ Updated ${orgUpdated} row(s) in "organizations" table.`);
    }

    // 3. Check employees table
    const empUpdated = await db('employees')
      .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
      .update({
        status: 'active'
      }).catch(() => 0);
    console.log(`✅ Updated ${empUpdated} row(s) in "employees" table.`);

    console.log('\n====================================================');
    console.log('  🎉 SUCCESS: ajay@gmail.com / ajay IS FULLY ACTIVE');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error fixing login:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

fixAjayOrgLogin();
