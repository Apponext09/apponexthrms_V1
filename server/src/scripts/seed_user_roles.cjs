const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
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

async function seedUserRoles() {
  console.log('====================================================');
  console.log('  🎭 SEEDING USER ROLES FOR EMPLOYEE & MANAGER       ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    // 1. Ensure role records exist in roles table
    let empRole = await db('roles').where('code', 'employee').first();
    if (!empRole) {
      const [id] = await db('roles').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Employee',
        code: 'employee',
        description: 'Standard employee portal access',
        is_system: true,
        is_platform_role: false,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      empRole = { id };
    }

    let mgrRole = await db('roles').where('code', 'manager').first();
    if (!mgrRole) {
      const [id] = await db('roles').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Manager',
        code: 'manager',
        description: 'Department manager portal access',
        is_system: true,
        is_platform_role: false,
        is_default: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      mgrRole = { id };
    }

    // 2. Link employee@gmail.com to employee role
    const empUser = await db('users').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();
    if (empUser) {
      await db('user_roles').where('user_id', empUser.id).delete();
      await db('user_roles').insert({
        organization_id: orgId,
        user_id: empUser.id,
        role_id: empRole.id,
        assigned_by: empUser.id,
        assigned_at: new Date()
      });
      console.log(`✅ Linked user "employee@gmail.com" (ID ${empUser.id}) to role "employee" (ID ${empRole.id})`);
    }

    // 3. Link manager@gmail.com to manager role
    const mgrUser = await db('users').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    if (mgrUser) {
      await db('user_roles').where('user_id', mgrUser.id).delete();
      await db('user_roles').insert({
        organization_id: orgId,
        user_id: mgrUser.id,
        role_id: mgrRole.id,
        assigned_by: mgrUser.id,
        assigned_at: new Date()
      });
      console.log(`✅ Linked user "manager@gmail.com" (ID ${mgrUser.id}) to role "manager" (ID ${mgrRole.id})`);
    }

    console.log('\n====================================================');
    console.log('  🎉 ROLES SEEDED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error seeding user roles:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedUserRoles();
