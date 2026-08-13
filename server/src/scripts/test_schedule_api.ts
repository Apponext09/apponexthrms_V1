import { getKnex } from '../db/knex.js';
import { InterviewService } from '../modules/recruitment/services/InterviewService.js';

async function runTest() {
  const db = getKnex();
  const interviewService = new InterviewService();

  console.log('--- Starting Interview Schedule API Verification ---');

  try {
    // Fetch a demo user context
    const user = await db('users').where({ status: 'active' }).first();
    if (!user || !user.employee_id) {
      throw new Error('No active user with linked employee_id found to run test');
    }

    console.log(`Using User ID: ${user.id}, Employee ID: ${user.employee_id}`);

    // Insert a dummy candidate if none exist
    let candidate = await db('candidates').first();
    if (!candidate) {
      console.log('Inserting dummy candidate...');
      await db('candidates').insert({
        uuid: 'test-cand-uuid-111',
        organization_id: user.organization_id,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        status: 'applied',
        source: 'direct_apply',
        created_by: user.id,
        updated_by: user.id
      });
      candidate = await db('candidates').first();
    }

    // Insert a dummy job if none exist
    let job = await db('jobs').first();
    if (!job) {
      console.log('Inserting dummy job...');
      await db('jobs').insert({
        uuid: 'test-job-uuid-222',
        organization_id: user.organization_id,
        job_code: 'JOB-TEST',
        job_title: 'Test Software Engineer',
        job_description: 'Test Description',
        no_of_positions: 1,
        status: 'published',
        created_by: user.id,
        updated_by: user.id
      });
      job = await db('jobs').first();
    }

    // Insert a dummy application if none exist
    let application = await db('applications').where({ candidate_id: candidate.id, job_id: job.id }).first();
    if (!application) {
      console.log('Inserting dummy application...');
      await db('applications').insert({
        uuid: 'test-app-uuid-333',
        organization_id: user.organization_id,
        candidate_id: candidate.id,
        job_id: job.id,
        application_status: 'applied',
        created_by: user.id,
        updated_by: user.id
      });
      application = await db('applications').where({ candidate_id: candidate.id, job_id: job.id }).first();
    }

    // Schedule a dummy interview for today
    const today = new Date().toISOString();
    console.log('Scheduling dummy interview for today...');
    const createdInterview = await interviewService.scheduleInterview({
      userId: user.id,
      organizationId: user.organization_id
    } as any, {
      applicationId: application.id,
      interviewType: 'video',
      interviewRound: 1,
      scheduledDate: today,
      durationMinutes: 45,
      meetingUrl: 'https://zoom.us/test-meeting',
      interviewerIds: [Number(user.employee_id)]
    });

    console.log(`Created Interview ID: ${createdInterview.id}`);

    // Query schedules via service / repository method
    const scheduleResult = await interviewService.getInterviewSchedule({
      userId: user.id,
      organizationId: user.organization_id
    } as any, Number(user.employee_id));

    console.log('Retrieved schedule items count:', scheduleResult.items.length);
    const match = scheduleResult.items.find(i => i.id === createdInterview.id);
    
    if (match) {
      console.log('Test result: MATCH FOUND ✅');
      console.log(`Candidate Name: "${match.candidate_name}" (Expected: "${candidate.first_name} ${candidate.last_name}")`);
      console.log(`Position Title: "${match.position_title}" (Expected: "${job.job_title}")`);
      console.log(`Meeting URL: "${match.meeting_url}"`);
    } else {
      console.log('Test result: MATCH NOT FOUND ❌');
    }

  } catch (err: any) {
    console.error('Verification error:', err.message);
  } finally {
    process.exit(0);
  }
}

runTest();
