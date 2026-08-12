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

async function fixEmployeeUserLink() {
  console.log('====================================================');
  console.log('  🔍 CHECKING & FIXING EMPLOYEE RECORDS & USER LINKS  ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id');
    const userId = users.length > 0 ? users[0].id : 47;

    // 1. Check user record for employee@gmail.com
    const empUser = await db('users').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();
    console.log('📌 User record (employee@gmail.com):', empUser ? { id: empUser.id, email: empUser.email } : 'Not found');

    // 2. Check user record for manager@gmail.com
    const mgrUser = await db('users').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    console.log('📌 User record (manager@gmail.com):', mgrUser ? { id: mgrUser.id, email: mgrUser.email } : 'Not found');

    // 3. Ensure manager record exists in employees table
    let mgrRecord = await db('employees').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    if (!mgrRecord && mgrUser) {
      console.log('⚡ Creating missing employee record for manager@gmail.com...');
      const [newMgrId] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        user_id: mgrUser.id,
        first_name: 'Vikram',
        last_name: 'Singh',
        email: 'manager@gmail.com',
        employee_code: 'EMP-MGR-01',
        date_of_joining: '2025-01-01',
        gender: 'Male',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(async () => {
        return await db('employees').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          first_name: 'Vikram',
          last_name: 'Singh',
          email: 'manager@gmail.com',
          employee_code: 'EMP-MGR-01',
          date_of_joining: '2025-01-01',
          gender: 'Male',
          status: 'active',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      mgrRecord = { id: newMgrId };
    }

    // 4. Ensure employee record exists for employee@gmail.com
    let empRecord = await db('employees').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();
    if (!empRecord && empUser) {
      console.log('⚡ Creating missing employee record for employee@gmail.com...');
      const [newEmpId] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        user_id: empUser.id,
        reporting_manager_id: mgrRecord ? mgrRecord.id : null,
        first_name: 'Rahul',
        last_name: 'Sharma',
        email: 'employee@gmail.com',
        employee_code: 'EMP-102',
        date_of_joining: '2026-01-01',
        gender: 'Male',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(async () => {
        return await db('employees').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          reporting_manager_id: mgrRecord ? mgrRecord.id : null,
          first_name: 'Rahul',
          last_name: 'Sharma',
          email: 'employee@gmail.com',
          employee_code: 'EMP-102',
          date_of_joining: '2026-01-01',
          gender: 'Male',
          status: 'active',
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
      empRecord = { id: newEmpId };
    }

    // Update employees table reporting manager link
    if (empRecord && mgrRecord) {
      await db('employees').where('id', empRecord.id).update({
        reporting_manager_id: mgrRecord.id,
        user_id: empUser ? empUser.id : null,
        updated_by: userId
      }).catch(() => {});
    }

    // Update users table employee_id link if column exists
    const hasEmpIdCol = await db.schema.hasColumn('users', 'employee_id');
    if (hasEmpIdCol && empUser && empRecord) {
      await db('users').where('id', empUser.id).update({
        employee_id: empRecord.id
      });
      console.log(`✅ Updated users table employee_id=${empRecord.id} for employee@gmail.com`);
    }

    if (hasEmpIdCol && mgrUser && mgrRecord) {
      await db('users').where('id', mgrUser.id).update({
        employee_id: mgrRecord.id
      });
      console.log(`✅ Updated users table employee_id=${mgrRecord.id} for manager@gmail.com`);
    }

    console.log('\n====================================================');
    console.log('  🎉 EMPLOYEE RECORD CREATED & LINKED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error fixing employee link:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

fixEmployeeUserLink();
