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

async function setAjayPasswordToEmail() {
  console.log('\n======================================================');
  console.log('🔑 SETTING PASSWORD FOR ajay@gmail.com TO "ajay@gmail.com"');
  console.log('======================================================\n');

  const user = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  if (!user) {
    console.error('❌ User ajay@gmail.com not found!');
    process.exit(1);
  }

  const plainPassword = 'ajay@gmail.com';
  const hashedPassword = await argon2.hash(plainPassword);

  await knex('users').where('id', user.id).update({
    password_hash: hashedPassword,
    status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    must_change_password: 0,
    updated_at: new Date()
  });

  console.log(`👤 User: ajay@gmail.com (ID: #${user.id}, Org ID: #${user.organization_id})`);
  console.log(`✅ Password set to: "${plainPassword}"`);
  console.log(`✅ Status set to: ACTIVE`);

  const updatedUser = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  const isValid = await argon2.verify(updatedUser.password_hash, plainPassword);
  console.log(`🔒 Argon2 Password Verification: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);

  console.log('\n======================================================');
  console.log('🎉 LOGIN CREDENTIALS SET SUCCESSFULLY:');
  console.log('   Email: ajay@gmail.com');
  console.log('   Password: ajay@gmail.com');
  console.log('======================================================\n');

  await knex.destroy();
}

setAjayPasswordToEmail().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
