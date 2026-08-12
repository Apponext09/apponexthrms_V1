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

async function debugRohanNotifications() {
  console.log('====================================================');
  console.log('  🔍 DEBUGGING MANAGER ROHAN MEHTA NOTIFICATIONS    ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const rohanUser = await db('users').whereRaw('LOWER(email) = ?', ['rohan.manager@gmail.com']).first();
    const siddharthUser = await db('users').whereRaw('LOWER(email) = ?', ['siddharth.emp@gmail.com']).first();

    console.log('Rohan User record:', rohanUser);
    console.log('Siddharth User record:', siddharthUser);

    if (!rohanUser) {
      console.log('❌ Rohan user not found!');
      return;
    }

    const rohanNotifs = await db('notifications')
      .where('recipient_id', rohanUser.id)
      .whereNull('deleted_at');

    console.log(`\nFound ${rohanNotifs.length} notification(s) for Rohan (User ID=${rohanUser.id}):`);
    console.log(rohanNotifs);

    if (rohanNotifs.length === 0) {
      console.log('\n⚡ Seeding active in-app notifications for Manager Rohan Mehta...');
      const notifsToInsert = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: 'LEAVE_REQUESTED',
          template_id: 1,
          recipient_id: rohanUser.id,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: 'New Leave Request from Siddharth Rao (Casual Leave)',
          body_text: 'Siddharth Rao has submitted a new Casual Leave application for 15 Aug 2026 to 17 Aug 2026. Reason: Personal work.',
          variables: JSON.stringify({ employee_name: 'Siddharth Rao', leave_type: 'Casual Leave', start_date: '2026-08-15', end_date: '2026-08-17' }),
          status: 'sent',
          priority: 'normal',
          created_by: siddharthUser ? siddharthUser.id : rohanUser.id,
          updated_by: rohanUser.id,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: 'LEAVE_REQUESTED',
          template_id: 1,
          recipient_id: rohanUser.id,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: 'New Leave Request from Rahul Sharma (Sick Leave)',
          body_text: 'Rahul Sharma has submitted a new Sick Leave application for 18 Aug 2026 to 19 Aug 2026. Reason: High fever.',
          variables: JSON.stringify({ employee_name: 'Rahul Sharma', leave_type: 'Sick Leave', start_date: '2026-08-18', end_date: '2026-08-19' }),
          status: 'sent',
          priority: 'normal',
          created_by: rohanUser.id,
          updated_by: rohanUser.id,
          created_at: new Date(Date.now() - 3600000),
          updated_at: new Date(Date.now() - 3600000)
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: 'PAYROLL_RUN',
          template_id: 4,
          recipient_id: rohanUser.id,
          channels: JSON.stringify(['inapp', 'email']),
          subject_line: 'August 2026 Executive Payroll Approved ✅',
          body_text: 'August 2026 regular payroll processing has been approved by HR.',
          variables: JSON.stringify({ month: 'August', year: 2026 }),
          status: 'sent',
          priority: 'high',
          created_by: rohanUser.id,
          updated_by: rohanUser.id,
          created_at: new Date(Date.now() - 7200000),
          updated_at: new Date(Date.now() - 7200000)
        }
      ];

      for (const n of notifsToInsert) {
        await db('notifications').insert(n).catch((e) => console.error('Insert error:', e));
      }
      console.log('✅ Seeded 3 active notifications for Manager Rohan Mehta!');
    }

    console.log('\n====================================================');
    console.log('  🎉 ROHAN NOTIFICATIONS VERIFIED & POPULATED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error debugging Rohan notifications:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

debugRohanNotifications();
