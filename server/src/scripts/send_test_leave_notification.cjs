require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});
const { v4: uuidv4 } = require('uuid');

async function sendTestNotification() {
  // Find current admin/active user
  const user = await knex('users').where({ status: 'active' }).orderBy('id', 'asc').first();
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }

  const result = await knex('notifications').insert({
    uuid: uuidv4(),
    organization_id: user.organization_id || 68,
    event_code: 'LEAVE_REQUESTED',
    template_id: 9,
    recipient_id: user.id,
    channels: JSON.stringify(['inapp', 'email']),
    subject_line: '🌴 New Test Leave Request: Rahul Sharma (Casual Leave)',
    body_text: 'Rahul Sharma has requested Casual Leave from 12-Aug-2026 to 14-Aug-2026. Reason: Urgent family work.',
    variables: JSON.stringify({ employee_name: 'Rahul Sharma', leave_type: 'Casual Leave' }),
    status: 'sent',
    priority: 'high',
    created_by: user.id,
    updated_by: user.id,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log(`✅ Success! Inserted test leave notification for user '${user.email}' (ID: ${user.id}).`);
  await knex.destroy();
}

sendTestNotification().catch(err => {
  console.error(err);
  process.exit(1);
});
