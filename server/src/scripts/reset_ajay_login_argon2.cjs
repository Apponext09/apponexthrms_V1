require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});
const argon2 = require('argon2');

async function resetAjayLogin() {
  console.log('\n======================================================');
  console.log('🔑 RESETTING ajay@gmail.com PASSWORD WITH ARGON2');
  console.log('======================================================\n');

  // 1. Find user ajay@gmail.com
  const user = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  if (!user) {
    console.error('❌ User ajay@gmail.com not found in database!');
    process.exit(1);
  }

  const plainPassword = 'Admin@123';
  const hashedPassword = await argon2.hash(plainPassword);

  console.log(`👤 Found User: ajay@gmail.com (ID: #${user.id}, Org ID: #${user.organization_id})`);

  // 2. Update DB with argon2 hash
  await knex('users').where('id', user.id).update({
    password_hash: hashedPassword,
    status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    must_change_password: 0,
    updated_at: new Date()
  });

  console.log(`✅ Password successfully reset to: "${plainPassword}"`);
  console.log(`✅ Account status set to: ACTIVE`);

  // 3. Verify Argon2 password matching
  const updatedUser = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  const isValid = await argon2.verify(updatedUser.password_hash, plainPassword);
  console.log(`🔒 Argon2 Password Verify Check: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);

  console.log('\n======================================================');
  console.log('🎉 LOGIN CREDENTIALS FOR ajay@gmail.com:');
  console.log('   Email: ajay@gmail.com');
  console.log(`   Password: ${plainPassword}`);
  console.log('======================================================\n');

  await knex.destroy();
}

resetAjayLogin().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
