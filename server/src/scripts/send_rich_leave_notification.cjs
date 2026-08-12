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

async function sendRichTestNotification() {
  const user = await knex('users').where({ status: 'active' }).orderBy('id', 'asc').first();
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }

  // Fetch Master Template
  const tmpl = await knex('notification_templates')
    .where({ organization_id: user.organization_id || 68, template_code: 'LEAVE_REQUESTED' })
    .first()
    .catch(() => null);

  const empName = 'Rahul Sharma';
  const empCode = 'EMP001';
  const leaveType = 'Casual Leave (CL)';
  const startDate = '12-Aug-2026';
  const endDate = '14-Aug-2026';
  const reason = 'Urgent family function in hometown';
  const managerName = 'Ajay User';

  let subject = tmpl?.subject || `New Leave Request from {{employee_name}} ({{leave_type}})`;
  let body = tmpl?.email_notification || `Hi {{manager_name}},\n\n{{employee_name}} ({{employee_code}}) has submitted a new {{leave_type}} application.\n\n• Employee Name: {{employee_name}} ({{employee_code}})\n• Leave Type: {{leave_type}}\n• Start Date: {{start_date}}\n• End Date: {{end_date}}\n• Reason: {{reason}}\n\nPlease click below to review and approve/reject.\n\nRegards,\nApponext HR Team`;

  const replacements = {
    employee_name: empName,
    employee_code: empCode,
    manager_name: managerName,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: reason,
    company_name: 'Apponext',
    action_url: '/leaves/approvals'
  };

  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, val);
    body = body.replace(regex, val);
  }

  await knex('notifications').insert({
    uuid: uuidv4(),
    organization_id: user.organization_id || 68,
    event_code: 'LEAVE_REQUESTED',
    template_id: tmpl?.id || 9,
    recipient_id: user.id,
    channels: JSON.stringify(['inapp', 'email']),
    subject_line: subject,
    body_text: body,
    variables: JSON.stringify(replacements),
    status: 'sent',
    priority: 'high',
    created_by: user.id,
    updated_by: user.id,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('\n=== INSERTED RICH LEAVE NOTIFICATION ===');
  console.log('Subject:', subject);
  console.log('Body:\n', body);

  await knex.destroy();
}

sendRichTestNotification().catch(err => {
  console.error(err);
  process.exit(1);
});
