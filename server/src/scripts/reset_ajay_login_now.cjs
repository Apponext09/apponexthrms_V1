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
const bcrypt = require('bcryptjs');

async function resetAjayLogin() {
  console.log('\n======================================================');
  console.log('🔑 FIXING & RESETTING LOGIN FOR ajay@gmail.com');
  console.log('======================================================\n');

  // 1. Find user
  const user = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  if (!user) {
    console.error('❌ User ajay@gmail.com not found in database!');
    process.exit(1);
  }

  console.log('👤 Existing User Record:');
  console.table({
    ID: user.id,
    UUID: user.uuid,
    Email: user.email,
    FirstName: user.first_name || user.firstName,
    LastName: user.last_name || user.lastName,
    Status: user.status,
    OrgID: user.organization_id,
    IsActive: Boolean(user.is_active)
  });

  // 2. Hash new password: Admin@123
  const newPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 3. Update DB
  await knex('users').where('id', user.id).update({
    password_hash: hashedPassword,
    password: hashedPassword, // in case legacy column exists
    status: 'active',
    is_active: 1,
    email_verified: 1,
    failed_login_attempts: 0,
    lockout_until: null,
    updated_at: new Date()
  });

  console.log(`\n✅ Password for ajay@gmail.com successfully reset to: "${newPassword}"`);
  console.log('✅ Account status set to: ACTIVE');

  // 4. Verify login credentials against bcrypt
  const updatedUser = await knex('users').where({ email: 'ajay@gmail.com' }).first();
  const isMatch = await bcrypt.compare(newPassword, updatedUser.password_hash);
  console.log(`\n🔒 Bcrypt Verification Check: ${isMatch ? 'PASSED ✅' : 'FAILED ❌'}`);

  console.log('\n======================================================');
  console.log('🎉 LOGIN CREDENTIALS READY FOR ajay@gmail.com!');
  console.log('======================================================\n');

  await knex.destroy();
}

resetAjayLogin().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
