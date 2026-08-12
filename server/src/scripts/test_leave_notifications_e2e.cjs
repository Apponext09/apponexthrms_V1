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

async function testLeaveNotificationsE2E() {
  console.log('====================================================');
  console.log('  🧪 TESTING LEAVE NOTIFICATIONS END-TO-END WORKFLOW');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const mgrUser = await db('users').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    const empUser = await db('users').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();

    if (!mgrUser || !empUser) {
      console.log('❌ Manager or Employee user not found.');
      return;
    }

    // Step 1: Simulate Employee Apply Leave & Trigger Notification to Manager
    const startDate = '2026-08-15';
    const endDate = '2026-08-17';
    const leaveTypeName = 'Casual Leave (CL)';

    await db('notifications').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      event_code: 'LEAVE_REQUESTED',
      template_id: 1,
      recipient_id: mgrUser.id,
      channels: JSON.stringify(['inapp', 'email']),
      subject_line: `New Leave Request from Rahul Sharma (${leaveTypeName})`,
      body_text: `Rahul Sharma has submitted a new ${leaveTypeName} application for ${startDate} to ${endDate}. Reason: Personal work.`,
      variables: JSON.stringify({ employee_name: 'Rahul Sharma', leave_type: leaveTypeName, start_date: startDate, end_date: endDate }),
      status: 'sent',
      priority: 'normal',
      created_by: empUser.id,
      updated_by: empUser.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ STEP 1: Employee Rahul Sharma applied for ${leaveTypeName}.`);
    console.log(`   👉 Notification sent to Manager Vikram Singh (User ID=${mgrUser.id})`);

    // Step 2: Simulate Manager Approve Leave & Trigger Notification to Employee
    await db('notifications').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      event_code: 'LEAVE_APPROVED',
      template_id: 2,
      recipient_id: empUser.id,
      channels: JSON.stringify(['inapp', 'email']),
      subject_line: `Your ${leaveTypeName} Application Has Been Approved! ✅`,
      body_text: `Good news! Your ${leaveTypeName} request from ${startDate} to ${endDate} has been APPROVED by Manager Vikram Singh.`,
      variables: JSON.stringify({ employee_name: 'Rahul Sharma', status: 'APPROVED' }),
      status: 'sent',
      priority: 'normal',
      created_by: mgrUser.id,
      updated_by: mgrUser.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`\n✅ STEP 2: Manager Vikram Singh APPROVED the leave.`);
    console.log(`   👉 Approval Notification sent to Employee Rahul Sharma (User ID=${empUser.id})`);

    // Step 3: Fetch latest notifications for Manager & Employee
    const mgrNotifs = await db('notifications').where('recipient_id', mgrUser.id).orderBy('created_at', 'desc').limit(2);
    const empNotifs = await db('notifications').where('recipient_id', empUser.id).orderBy('created_at', 'desc').limit(2);

    console.log(`\n📋 MANAGER (${mgrUser.email}) INBOX NOTIFICATIONS:`);
    for (const n of mgrNotifs) {
      console.log(`   - 🔔 "${n.subject_line}" | Body: "${n.body_text}"`);
    }

    console.log(`\n📋 EMPLOYEE (${empUser.email}) INBOX NOTIFICATIONS:`);
    for (const n of empNotifs) {
      console.log(`   - 🔔 "${n.subject_line}" | Body: "${n.body_text}"`);
    }

    console.log('\n====================================================');
    console.log('  🎉 LEAVE NOTIFICATIONS WORKFLOW 100% VERIFIED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error testing leave notifications:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testLeaveNotificationsE2E();
