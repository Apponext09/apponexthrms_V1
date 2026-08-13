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

async function setAjayPassword() {
  console.log('====================================================');
  console.log('  🔑 SETTING PASSWORD FOR ajay@gmail.com TO "ajay"  ');
  console.log('====================================================\n');

  try {
    const passwordHash = await hash('ajay', {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const updated = await db('users')
      .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
      .update({
        password_hash: passwordHash,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date()
      });

    console.log(`✅ Updated ${updated} user row(s). Password for ajay@gmail.com is now set to "ajay".`);

    // Also update super_admins table if exists
    const hasSuperAdmin = await db.schema.hasTable('super_admins');
    if (hasSuperAdmin) {
      await db('super_admins')
        .whereRaw('LOWER(email) = ?', ['ajay@gmail.com'])
        .update({
          password_hash: passwordHash,
          status: 'active',
          updated_at: new Date()
        }).catch(() => {});
    }

    console.log('\n====================================================');
    console.log('  🎉 SUCCESS: Email="ajay@gmail.com", Password="ajay"');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error setting password:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

setAjayPassword();
