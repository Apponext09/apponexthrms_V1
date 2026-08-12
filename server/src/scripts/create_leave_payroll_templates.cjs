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

async function createLeaveAndPayrollTemplates() {
  console.log('====================================================');
  console.log('  📜 CREATING LEAVE & PAYROLL NOTIFICATION TEMPLATES');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    const users = await db('users').select('id');
    const userId = users.length > 0 ? users[0].id : 47;

    const templatesToInsert = [
      {
        uuid: 'tmpl-leave-req-1',
        organization_id: orgId,
        template_name: 'Leave Request Submitted',
        template_code: 'LEAVE_REQUESTED',
        subject: 'New Leave Request from {{employee_name}} ({{leave_type}})',
        email_notification: `Hi {{manager_name}},\n\n{{employee_name}} has submitted a new {{leave_type}} application.\n\n• Employee Name: {{employee_name}}\n• Leave Type: {{leave_type}}\n• Start Date: {{start_date}}\n• End Date: {{end_date}}\n• Reason: {{reason}}\n\nPlease click below to review and approve/reject:\n{{action_url}}\n\nRegards,\n{{company_name}} HR Team`,
        is_active: 'Yes',
        created_by: userId,
        updated_by: userId
      },
      {
        uuid: 'tmpl-leave-app-2',
        organization_id: orgId,
        template_name: 'Leave Request Approved',
        template_code: 'LEAVE_APPROVED',
        subject: 'Your {{leave_type}} Application Has Been Approved! ✅',
        email_notification: `Hi {{employee_name}},\n\nGood news! Your {{leave_type}} application from {{start_date}} to {{end_date}} has been APPROVED by {{manager_name}}.\n\n• Status: APPROVED ✅\n• Leave Type: {{leave_type}}\n• Dates: {{start_date}} to {{end_date}}\n\nRegards,\n{{company_name}} HR Team`,
        is_active: 'Yes',
        created_by: userId,
        updated_by: userId
      },
      {
        uuid: 'tmpl-leave-rej-3',
        organization_id: orgId,
        template_name: 'Leave Request Rejected',
        template_code: 'LEAVE_REJECTED',
        subject: 'Update on Your {{leave_type}} Request',
        email_notification: `Hi {{employee_name}},\n\nYour {{leave_type}} application for {{start_date}} to {{end_date}} could not be approved at this time.\n\n• Status: REJECTED\n• Reason: {{rejection_reason}}\n\nPlease contact your manager {{manager_name}} if you have questions.\n\nRegards,\n{{company_name}} HR Team`,
        is_active: 'Yes',
        created_by: userId,
        updated_by: userId
      },
      {
        uuid: 'tmpl-payroll-pub-4',
        organization_id: orgId,
        template_name: 'Payslip Released Alert',
        template_code: 'PAYSLIP_GENERATED',
        subject: 'Your Salary Payslip for {{month}} {{year}} is Ready 💰',
        email_notification: `Hi {{employee_name}},\n\nYour monthly salary payslip of ₹{{net_salary}} for {{month}} {{year}} has been published.\n\n• Net Take-Home: ₹{{net_salary}}\n• Payment Month: {{month}} {{year}}\n\nClick here to view and download your payslip:\n{{action_url}}\n\nRegards,\n{{company_name}} Payroll Team`,
        is_active: 'Yes',
        created_by: userId,
        updated_by: userId
      }
    ];

    for (const t of templatesToInsert) {
      const existing = await db('notification_templates')
        .where('organization_id', t.organization_id)
        .where('template_code', t.template_code)
        .first();

      if (existing) {
        await db('notification_templates')
          .where('id', existing.id)
          .update({
            template_name: t.template_name,
            subject: t.subject,
            email_notification: t.email_notification,
            is_active: t.is_active,
            updated_by: userId,
            updated_at: new Date()
          });
        console.log(`✅ Updated existing template: "${t.template_name}" (${t.template_code})`);
      } else {
        await db('notification_templates').insert({
          ...t,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Inserted new template: "${t.template_name}" (${t.template_code})`);
      }
    }

    console.log('\n====================================================');
    console.log('  🎉 ALL LEAVE & PAYROLL TEMPLATES CREATED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error creating templates:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

createLeaveAndPayrollTemplates();
