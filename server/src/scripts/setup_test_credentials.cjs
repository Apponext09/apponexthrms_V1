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

async function setupTestHierarchyCredentials() {
  console.log('====================================================');
  console.log('  👥 CREATING HIERARCHY TEST LOGINS (EMP -> MANAGER -> HR)');
  console.log('====================================================\n');

  try {
    const passwordHashAjay = await hash('ajay', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const passwordHashAdmin = await hash('admin', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    // 1. Ensure HR / Admin User (ajay@gmail.com)
    let adminUser = await db('users').whereRaw('LOWER(email) = ?', ['ajay@gmail.com']).first();
    if (!adminUser) {
      const [id] = await db('users').insert({
        uuid: 'uuid-admin-ajay',
        organization_id: orgId,
        email: 'ajay@gmail.com',
        password_hash: passwordHashAjay,
        first_name: 'Ajay',
        last_name: 'Admin (HR)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      adminUser = { id };
    } else {
      await db('users').where('id', adminUser.id).update({ password_hash: passwordHashAjay, status: 'active' });
    }

    // 2. Ensure Manager User (manager@gmail.com)
    let managerUser = await db('users').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    if (!managerUser) {
      const [id] = await db('users').insert({
        uuid: 'uuid-manager-1',
        organization_id: orgId,
        email: 'manager@gmail.com',
        password_hash: passwordHashAdmin,
        first_name: 'Vikram',
        last_name: 'Singh (Manager)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      managerUser = { id };
    } else {
      await db('users').where('id', managerUser.id).update({ password_hash: passwordHashAdmin, status: 'active' });
    }

    // 3. Ensure Employee User (employee@gmail.com)
    let employeeUser = await db('users').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();
    if (!employeeUser) {
      const [id] = await db('users').insert({
        uuid: 'uuid-employee-1',
        organization_id: orgId,
        email: 'employee@gmail.com',
        password_hash: passwordHashAdmin,
        first_name: 'Rahul',
        last_name: 'Sharma (Employee)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      employeeUser = { id };
    } else {
      await db('users').where('id', employeeUser.id).update({ password_hash: passwordHashAdmin, status: 'active' });
    }

    console.log('✅ 1. Admin / HR Account:      Email="ajay@gmail.com",     Password="ajay"');
    console.log('✅ 2. Reporting Manager Account: Email="manager@gmail.com",  Password="admin" (Vikram Singh)');
    console.log('✅ 3. Employee Account:          Email="employee@gmail.com", Password="admin" (Rahul Sharma)');
    console.log('\n🔗 LINKED HIERARCHY LOGINS CREATED SUCCESSFULLY!');

    console.log('\n====================================================');
    console.log('  🎉 READY FOR END-TO-END LEAVE TEST!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error setting up test credentials:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

setupTestHierarchyCredentials();
