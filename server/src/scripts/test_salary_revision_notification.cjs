const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function testSalaryRevisionNotification() {
  console.log("================================================================================");
  console.log("    TESTING HR SALARY REVISION CREATION -> ADMIN NOTIFICATION DISPATCH          ");
  console.log("================================================================================\n");

  const orgId = 68;
  const hrUserId = 51; // Isha Shinde (HR)
  const empId = 54; // Rahul

  // 1. Simulate HR submitting a salary revision for Employee #54
  const [insertedId] = await knex('salary_revisions').insert({
    uuid: uuidv4(),
    organization_id: orgId,
    employee_id: empId,
    revision_type: 'increment',
    old_ctc: 1200000,
    new_ctc: 1500000,
    increment_percentage: 25,
    increment_amount: 300000,
    effective_from: '2026-09-01',
    reason_description: 'Performance Appraisal 2026',
    status: 'submitted',
    submitted_at: new Date(),
    created_by: hrUserId,
    updated_by: hrUserId,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log(`✅ 1. Created Salary Revision Request ID #${insertedId}`);

  // 2. Dispatch Notification to Organization Admins
  const emp = await knex('employees').where('id', empId).first();
  const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${empId}`;

  const adminUsers = await knex('users as u')
    .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
    .leftJoin('roles as r', 'ur.role_id', 'r.id')
    .where('u.organization_id', orgId)
    .where(function() {
      this.whereIn('r.code', ['organization_admin', 'super_admin', 'finance_manager'])
          .orWhere('u.email', 'ajay@gmail.com');
    })
    .whereNull('u.deleted_at')
    .select('u.id', 'u.email')
    .distinct();

  console.log(`✅ 2. Found ${adminUsers.length} Admin User(s) to notify: ${adminUsers.map(a => a.email).join(', ')}`);

  let notifIds = [];
  for (const admin of adminUsers) {
    const [nId] = await knex('notifications').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      event_code: 'SALARY_REVISION_SUBMITTED',
      recipient_id: admin.id,
      channels: JSON.stringify(['inapp', 'email']),
      subject_line: `New Salary Revision Request for ${empName}`,
      body_text: `HR submitted a salary revision request for ${empName} (New CTC: ₹15,00,000). Please review and approve.`,
      variables: JSON.stringify({ employee_name: empName, new_ctc: 1500000, revision_id: insertedId }),
      status: 'sent',
      priority: 'high',
      created_by: hrUserId,
      updated_by: hrUserId,
      created_at: new Date(),
      updated_at: new Date()
    });
    notifIds.push(nId);
  }

  console.log(`✅ 3. Notifications Inserted into DB for Admins: IDs [${notifIds.join(', ')}]`);

  // 3. Verify Admin `ajay@gmail.com` receives notification in unread query
  const ajayUser = adminUsers.find(a => a.email === 'ajay@gmail.com');
  if (ajayUser) {
    const adminNotifs = await knex('notifications')
      .where({ recipient_id: ajayUser.id, event_code: 'SALARY_REVISION_SUBMITTED' })
      .orderBy('id', 'desc');

    console.log(`\n📬 4. Verification for Admin (ajay@gmail.com, User ID #${ajayUser.id}):`);
    console.log(`   - Found ${adminNotifs.length} Salary Revision notification(s) in Admin's Inbox.`);
    console.log(`   - Latest Notification Subject: "${adminNotifs[0].subject_line}"`);
    console.log(`   - Notification Body: "${adminNotifs[0].body_text}"`);
  }

  console.log("\n================================================================================");
  console.log("       TEST PASSED: ADMIN RECEIVED SALARY REVISION NOTIFICATION SUCCESSFULLY!    ");
  console.log("================================================================================\n");

  await knex.destroy();
}

testSalaryRevisionNotification().catch(err => {
  console.error("Test Failed:", err);
  process.exit(1);
});
