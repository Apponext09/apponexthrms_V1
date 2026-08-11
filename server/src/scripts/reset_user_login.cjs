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

async function resetAdminUserLogin() {
  console.log('====================================================');
  console.log('  🔑 LOGIN RECOVERY & PASSWORD RESET SCRIPT         ');
  console.log('====================================================\n');

  try {
    const defaultPasswordHash = await hash('Admin@123', {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const users = await db('users').select('id', 'email', 'status', 'organization_id');
    console.log(`📋 Found ${users.length} user(s) in MySQL database:`);

    for (const u of users) {
      console.log(`  - User ID=${u.id}, Email="${u.email}", Status="${u.status}", OrgID=${u.organization_id}`);
    }

    if (users.length === 0) {
      console.log('\n⚠️ No users found in database. Creating default admin user...');
      const org = await db('organizations').first();
      const orgId = org ? org.id : 1;

      const [newUserId] = await db('users').insert({
        uuid: 'admin-default-uuid-1',
        organization_id: orgId,
        email: 'admin@apponext.com',
        password_hash: defaultPasswordHash,
        first_name: 'System',
        last_name: 'Admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Created default admin user: email="admin@apponext.com", password="Admin@123", id=${newUserId}`);
    } else {
      // Reset all users password to Admin@123 and status to active
      await db('users').update({
        password_hash: defaultPasswordHash,
        status: 'active',
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date()
      });
      console.log('\n✅ Successfully reset password for ALL users to: Admin@123');
    }

    // Run setupAdminOrganizations logic as well
    const { setupAdminOrganizations } = require('./setup_admin_organizations.ts');
  } catch (err) {
    console.error('❌ Error resetting user login:', err.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

resetAdminUserLogin();
