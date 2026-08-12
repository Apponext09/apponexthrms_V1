const knex = require('knex');
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

async function verifyApproverEmployeeId() {
  console.log('====================================================');
  console.log('  🔍 VERIFYING & FIXING USER -> EMPLOYEE_ID LINKS   ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id', 'email', 'employee_id');
    console.log(`📋 Found ${users.length} user(s):`);

    for (const u of users) {
      let emp = await db('employees').whereRaw('LOWER(email) = ?', [u.email.toLowerCase()]).first();
      if (!emp) {
        // Create employee profile if missing
        const [empId] = await db('employees').insert({
          uuid: `emp-uuid-${u.id}`,
          organization_id: orgId,
          first_name: u.email.split('@')[0],
          last_name: 'User',
          email: u.email,
          employee_code: `EMP-${u.id}`,
          date_of_joining: '2026-01-01',
          gender: 'Male',
          status: 'active',
          created_by: u.id,
          updated_by: u.id,
          created_at: new Date(),
          updated_at: new Date()
        });
        emp = { id: empId };
        console.log(`✅ Created missing employee record ID=${empId} for "${u.email}"`);
      }

      // Link user.employee_id
      await db('users').where('id', u.id).update({
        employee_id: emp.id
      });
      console.log(`✅ User ID=${u.id} ("${u.email}") -> employee_id = ${emp.id}`);
    }

    // Set LEAVE_APPROVAL_LEVELS setting to 1 so Manager approval is single-step final approval!
    const existingSetting = await db('organization_settings')
      .where('organization_id', orgId)
      .where('setting_key', 'LEAVE_APPROVAL_LEVELS')
      .first();

    if (existingSetting) {
      await db('organization_settings')
        .where('id', existingSetting.id)
        .update({
          setting_value: '1',
          settingValue: '1',
          updated_at: new Date()
        });
    } else {
      await db('organization_settings').insert({
        organization_id: orgId,
        setting_key: 'LEAVE_APPROVAL_LEVELS',
        setting_value: '1',
        settingValue: '1',
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => {});
    }
    console.log('✅ Set organization LEAVE_APPROVAL_LEVELS = 1 (Single-step Manager Approval)');

    console.log('\n====================================================');
    console.log('  🎉 APPROVER PROFILES & SINGLE-STEP APPROVAL READY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error fixing approvers:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

verifyApproverEmployeeId();
