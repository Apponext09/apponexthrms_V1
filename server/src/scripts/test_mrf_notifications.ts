import { getKnex } from '../db/knex.js';
import { MrfService } from '../modules/recruitment/services/MrfService.js';

async function runTest() {
  const db = getKnex();
  const mrfService = new MrfService();

  console.log('--- Starting MRF Notification Verification Test ---');

  try {
    // 1. Fetch a demo user and organization context
    const user = await db('users').where({ status: 'active' }).first();
    const employee = await db('employees')
      .where({ organization_id: user.organization_id })
      .whereNot('id', user.employee_id || 0)
      .first();

    if (!user) {
      throw new Error('No active user found to run test');
    }
    if (!employee) {
      throw new Error('No other employee found to assign as interviewer');
    }

    // Ensure there is a user linked to the employee
    let linkedUser = await db('users').where({ employee_id: employee.id }).first();
    if (!linkedUser) {
      console.log(`Creating a demo user account for employee ${employee.first_name} to test notifications...`);
      await db('users').insert({
        uuid: 'test-uuid-interviewer-12345',
        organization_id: user.organization_id,
        employee_id: employee.id,
        email: employee.email,
        password_hash: 'dummy_hash',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      linkedUser = await db('users').where({ employee_id: employee.id }).first();
    }

    console.log(`Using Requester User ID: ${user.id} (${user.email})`);
    console.log(`Using Interviewer Employee ID: ${employee.id} (${employee.first_name} ${employee.last_name}), User ID: ${linkedUser?.id}`);

    const ctx = {
      userId: user.id,
      organizationId: user.organization_id
    };

    // Create a mock MRF request input
    const input = {
      positionTitle: 'TEST INTERVIEWER NOTIFICATION',
      numberOfPositions: 3,
      recruitmentType: 'Both',
      interviewerId: employee.id,
      companyId: 1,
      companyLocationId: 1,
      departmentId: 1,
      gradeId: 1,
      employmentType: 'Full Time',
      qualificationRequired: 'B.Tech',
      experienceDesired: '3 Years',
      skills: ['TypeScript', 'Node.js'],
      comment: 'Testing dynamic seeding and notification delivery',
      jobDescription: '<p>Test description</p>'
    };

    // Call service to create MRF request
    const createdMrf = await mrfService.createMrf(ctx, input as any);
    console.log(`Successfully created MRF ID: ${createdMrf.id}, MR Number: ${createdMrf.mr_number}`);

    // Check if notification template was seeded
    const template = await db('notification_templates')
      .where({ organization_id: ctx.organizationId, template_name: 'MRF Interviewer Assigned' })
      .first();
    console.log('Seeded Notification Template:', template ? 'Found ✅' : 'Missing ❌');

    // Check if notification event was seeded
    const event = await db('notification_events')
      .where({ organization_id: ctx.organizationId, event_code: 'recruitment.mrf.assigned' })
      .first();
    console.log('Seeded Notification Event:', event ? 'Found ✅' : 'Missing ❌');

    // Check if notification was created in db
    const notification = await db('notifications')
      .where({ event_code: 'recruitment.mrf.assigned', recipient_id: linkedUser?.id })
      .first();
    console.log('Created Notification record:', notification ? 'Found ✅' : 'Missing ❌');
    if (notification) {
      console.log(`Subject: "${notification.subject_line || (notification as any).subject || ''}"`);
      console.log(`Body text snippet: "${notification.body_text.substring(0, 100)}..."`);
    }

    // Check queue items
    const queueItem = await db('notification_queue')
      .where({ notification_id: notification?.id })
      .first();
    console.log('Notification Queue Item:', queueItem ? 'Found ✅' : 'Missing ❌');

  } catch (err: any) {
    console.error('Test error:', err.message);
  } finally {
    process.exit(0);
  }
}

runTest();
