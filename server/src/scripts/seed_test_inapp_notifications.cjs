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

async function seedTestInAppNotifications() {
  console.log('====================================================');
  console.log('  🔔 SEEDING REAL IN-APP NOTIFICATIONS              ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const mgrUser = await db('users').whereRaw('LOWER(email) = ?', ['manager@gmail.com']).first();
    const empUser = await db('users').whereRaw('LOWER(email) = ?', ['employee@gmail.com']).first();
    const adminUser = await db('users').whereRaw('LOWER(email) = ?', ['ajay@gmail.com']).first();

    const templates = await db('notification_templates').select('id', 'template_code');
    const tmplMap = new Map(templates.map(t => [t.template_code, t.id]));
    const defaultTmplId = templates.length > 0 ? templates[0].id : 1;

    // 1. Notification for Manager Vikram Singh
    if (mgrUser) {
      await db('notifications').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        event_code: 'LEAVE_REQUESTED',
        template_id: tmplMap.get('LEAVE_REQUESTED') || defaultTmplId,
        recipient_id: mgrUser.id,
        channels: JSON.stringify(['inapp', 'email']),
        subject_line: 'New Leave Request from Rahul Sharma (Casual Leave)',
        body_text: 'Rahul Sharma has applied for Casual Leave from 10 Aug 2026 to 12 Aug 2026. Reason: Family function.',
        variables: JSON.stringify({ employee_name: 'Rahul Sharma', leave_type: 'Casual Leave' }),
        status: 'sent',
        priority: 'normal',
        created_by: empUser ? empUser.id : mgrUser.id,
        updated_by: empUser ? empUser.id : mgrUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Seeded in-app notification for Manager Vikram Singh (User ID=${mgrUser.id})`);
    }

    // 2. Notification for Employee Rahul Sharma
    if (empUser) {
      await db('notifications').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        event_code: 'LEAVE_APPROVED',
        template_id: tmplMap.get('LEAVE_APPROVED') || defaultTmplId,
        recipient_id: empUser.id,
        channels: JSON.stringify(['inapp', 'email']),
        subject_line: 'Your Casual Leave Application Has Been Approved! ✅',
        body_text: 'Good news! Your Casual Leave request for 10 Aug 2026 to 12 Aug 2026 has been approved by Manager Vikram Singh.',
        variables: JSON.stringify({ employee_name: 'Rahul Sharma', status: 'APPROVED' }),
        status: 'sent',
        priority: 'normal',
        created_by: mgrUser ? mgrUser.id : empUser.id,
        updated_by: mgrUser ? mgrUser.id : empUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Seeded in-app notification for Employee Rahul Sharma (User ID=${empUser.id})`);
    }

    // 3. Notification for Admin Ajay
    if (adminUser) {
      await db('notifications').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        event_code: 'PAYSLIP_GENERATED',
        template_id: tmplMap.get('PAYSLIP_GENERATED') || defaultTmplId,
        recipient_id: adminUser.id,
        channels: JSON.stringify(['inapp', 'email']),
        subject_line: 'August 2026 Monthly Payroll Cycle Processed 💰',
        body_text: 'Monthly Payroll for August 2026 has been published successfully for 7 employees.',
        variables: JSON.stringify({ month: 'August', year: '2026' }),
        status: 'sent',
        priority: 'normal',
        created_by: adminUser.id,
        updated_by: adminUser.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Seeded in-app notification for Admin Ajay (User ID=${adminUser.id})`);
    }

    console.log('\n====================================================');
    console.log('  🎉 IN-APP NOTIFICATIONS SEEDED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error seeding notifications:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedTestInAppNotifications();
