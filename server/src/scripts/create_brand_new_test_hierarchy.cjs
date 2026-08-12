const knex = require('knex');
const { hash } = require('argon2');
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

async function createBrandNewTestHierarchy() {
  console.log('====================================================');
  console.log('  ✨ CREATING BRAND NEW TEST HIERARCHY (EMP -> MGR -> HR)');
  console.log('====================================================\n');

  try {
    const passwordHash = await hash('admin', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    // Roles from DB
    const adminRole = await db('roles').where('code', 'organization_admin').first();
    const mgrRole = await db('roles').where('code', 'manager').first();
    const empRole = await db('roles').where('code', 'employee').first();

    // ----------------------------------------------------
    // 1. CREATE HR / ADMIN USER & EMPLOYEE: Priya Verma
    // ----------------------------------------------------
    const hrEmail = 'priya.hr@gmail.com';
    let hrUser = await db('users').whereRaw('LOWER(email) = ?', [hrEmail]).first();
    if (!hrUser) {
      const [id] = await db('users').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        email: hrEmail,
        password_hash: passwordHash,
        first_name: 'Priya',
        last_name: 'Verma (HR)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      hrUser = { id, email: hrEmail };
    } else {
      await db('users').where('id', hrUser.id).update({ password_hash: passwordHash, status: 'active' });
    }

    let hrEmp = await db('employees').whereRaw('LOWER(email) = ?', [hrEmail]).first();
    if (!hrEmp) {
      const [id] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        first_name: 'Priya',
        last_name: 'Verma',
        email: hrEmail,
        employee_code: 'EMP-HR-001',
        date_of_joining: '2025-01-01',
        gender: 'Female',
        status: 'active',
        created_by: hrUser.id,
        updated_by: hrUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      hrEmp = { id };
    }
    await db('users').where('id', hrUser.id).update({ employee_id: hrEmp.id }).catch(() => {});
    if (adminRole) {
      await db('user_roles').where('user_id', hrUser.id).delete();
      await db('user_roles').insert({ organization_id: orgId, user_id: hrUser.id, role_id: adminRole.id, assigned_by: hrUser.id, assigned_at: new Date() }).catch(() => {});
    }

    // ----------------------------------------------------
    // 2. CREATE MANAGER USER & EMPLOYEE: Rohan Mehta
    // ----------------------------------------------------
    const mgrEmail = 'rohan.manager@gmail.com';
    let mgrUser = await db('users').whereRaw('LOWER(email) = ?', [mgrEmail]).first();
    if (!mgrUser) {
      const [id] = await db('users').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        email: mgrEmail,
        password_hash: passwordHash,
        first_name: 'Rohan',
        last_name: 'Mehta (Manager)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      mgrUser = { id, email: mgrEmail };
    } else {
      await db('users').where('id', mgrUser.id).update({ password_hash: passwordHash, status: 'active' });
    }

    let mgrEmp = await db('employees').whereRaw('LOWER(email) = ?', [mgrEmail]).first();
    if (!mgrEmp) {
      const [id] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        first_name: 'Rohan',
        last_name: 'Mehta',
        email: mgrEmail,
        employee_code: 'EMP-MGR-002',
        date_of_joining: '2025-03-01',
        gender: 'Male',
        status: 'active',
        created_by: hrUser.id,
        updated_by: hrUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      mgrEmp = { id };
    }
    await db('users').where('id', mgrUser.id).update({ employee_id: mgrEmp.id }).catch(() => {});
    if (mgrRole) {
      await db('user_roles').where('user_id', mgrUser.id).delete();
      await db('user_roles').insert({ organization_id: orgId, user_id: mgrUser.id, role_id: mgrRole.id, assigned_by: hrUser.id, assigned_at: new Date() }).catch(() => {});
    }

    // ----------------------------------------------------
    // 3. CREATE NEW EMPLOYEE: Siddharth Rao (Reports to Rohan)
    // ----------------------------------------------------
    const empEmail = 'siddharth.emp@gmail.com';
    let empUser = await db('users').whereRaw('LOWER(email) = ?', [empEmail]).first();
    if (!empUser) {
      const [id] = await db('users').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        email: empEmail,
        password_hash: passwordHash,
        first_name: 'Siddharth',
        last_name: 'Rao (Employee)',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      empUser = { id, email: empEmail };
    } else {
      await db('users').where('id', empUser.id).update({ password_hash: passwordHash, status: 'active' });
    }

    let empRecord = await db('employees').whereRaw('LOWER(email) = ?', [empEmail]).first();
    if (!empRecord) {
      const [id] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        reporting_manager_id: mgrEmp.id,
        first_name: 'Siddharth',
        last_name: 'Rao',
        email: empEmail,
        employee_code: 'EMP-DEV-501',
        date_of_joining: '2026-02-01',
        gender: 'Male',
        status: 'active',
        created_by: hrUser.id,
        updated_by: hrUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      empRecord = { id };
    } else {
      await db('employees').where('id', empRecord.id).update({ reporting_manager_id: mgrEmp.id });
    }
    await db('users').where('id', empUser.id).update({ employee_id: empRecord.id }).catch(() => {});
    if (empRole) {
      await db('user_roles').where('user_id', empUser.id).delete();
      await db('user_roles').insert({ organization_id: orgId, user_id: empUser.id, role_id: empRole.id, assigned_by: hrUser.id, assigned_at: new Date() }).catch(() => {});
    }

    // ----------------------------------------------------
    // 4. ALLOCATE LEAVE BALANCES FOR SIDDHARTH RAO
    // ----------------------------------------------------
    const leaveTypes = await db('leave_types').where('organization_id', orgId).select('id', 'annual_quota');
    for (const lt of leaveTypes) {
      const quota = lt.annual_quota || 12;
      await db('employee_leave_balances').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: empRecord.id,
        leave_type_id: lt.id,
        allocated_days: quota,
        used_days: 0,
        pending_days: 0,
        remaining_days: quota,
        year: 2026,
        created_by: hrUser.id,
        updated_by: hrUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }

    console.log('✅ 1. HR / Admin Account:     Email="priya.hr@gmail.com",       Password="admin" (Priya Verma)');
    console.log('✅ 2. Reporting Manager:      Email="rohan.manager@gmail.com",  Password="admin" (Rohan Mehta)');
    console.log('✅ 3. New Employee Account:   Email="siddharth.emp@gmail.com", Password="admin" (Siddharth Rao)');
    console.log('\n🔗 HIERARCHY: Siddharth Rao (Employee) -> Reporting Manager: Rohan Mehta');

    console.log('\n====================================================');
    console.log('  🎉 NEW HIERARCHY CREATED & READY FOR TESTING!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error creating new hierarchy:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

createBrandNewTestHierarchy();
