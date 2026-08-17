import { TenantContext } from '../db/types';
import { getKnex } from '../db/knex';
import { RecruitmentService } from '../modules/recruitment/services/RecruitmentService';
import { JobService } from '../modules/recruitment/services/JobService';
import { CandidateService } from '../modules/recruitment/services/CandidateService';
import { InterviewService } from '../modules/recruitment/services/InterviewService';
import { OfferService } from '../modules/recruitment/services/OfferService';
import { AnalyticsService } from '../modules/recruitment/services/AnalyticsService';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const recruitmentService = new RecruitmentService();
const jobService = new JobService();
const candidateService = new CandidateService();
const interviewService = new InterviewService();
const offerService = new OfferService();
const analyticsService = new AnalyticsService();

export async function runRecruitmentIntegrationTest(): Promise<void> {
  const logFile = path.resolve(process.cwd(), 'test_results.log');
  const logs: string[] = [];

  const log = (msg: string) => {
    const formatted = `[${new Date().toISOString()}] ${msg}`;
    console.log(formatted);
    logs.push(formatted);
  };

  log('🚀 STARTING RECRUITMENT LIFE-CYCLE INTEGRATION TESTS...');

  try {
    const db = getKnex();

    // 1. Resolve Organization ID 4 user admin (Abhishek)
    const abhishekOrg = await db('organizations').whereRaw('LOWER(email) = ?', ['abhishek@gmail.com']).first();
    if (!abhishekOrg) {
      throw new Error('Abhishek organization not found in DB. Make sure seed has run.');
    }
    const orgId = abhishekOrg.id || abhishekOrg.Id;

    const user = await db('users').where('organization_id', orgId).first();
    const userId = user ? user.id : 1;

    const ctx: TenantContext = {
      organizationId: orgId,
      userId: userId,
      role: 'organization_admin'
    };

    log(`✅ Context Resolved: OrgId=${orgId}, UserId=${userId}`);

    const dbStages = await db('pipeline_stages').where('organization_id', orgId).select('*');
    log(`🔍 Pipeline Stages found in DB for Org ${orgId}: ${JSON.stringify(dbStages)}`);

    // Clean up previous test candidates/jobs to allow fresh testing
    const testCandidateEmails = ['test.candidate@testflow.com'];
    const testCandidates = await db('candidates')
      .where('organization_id', orgId)
      .whereIn('email', testCandidateEmails)
      .select('id');
    const testCandIds = testCandidates.map(c => c.id);

    await db('offers').where('organization_id', orgId).where('position_title', 'QA Automation Engineer').del();
    await db('users').where('organization_id', orgId).whereIn('email', testCandidateEmails).del();
    await db('employees').where('organization_id', orgId).whereIn('email', testCandidateEmails).del();
    
    const prevApps = await db('applications')
      .where('organization_id', orgId)
      .where((builder) => {
        builder.where('applied_from_source', 'integration_test');
        if (testCandIds.length > 0) {
          builder.orWhereIn('candidate_id', testCandIds);
        }
      })
      .select('id');
    const prevAppIds = prevApps.map(a => a.id);

    if (prevAppIds.length > 0) {
      const prevInterviews = await db('interviews').whereIn('application_id', prevAppIds).select('id');
      const prevInterviewIds = prevInterviews.map(i => i.id);

      if (prevInterviewIds.length > 0) {
        await db('interview_feedback').whereIn('interview_id', prevInterviewIds).del();
        await db('interview_panel').whereIn('interview_id', prevInterviewIds).del();
        await db('interviews').whereIn('id', prevInterviewIds).del();
      }

      await db('application_stage_history').whereIn('application_id', prevAppIds).del();
      await db('offers').whereIn('application_id', prevAppIds).del();

      if (await db.schema.hasTable('assessment_attempts')) {
        await db('assessment_attempts').whereIn('application_id', prevAppIds).del();
      }
      if (await db.schema.hasTable('candidate_assessments')) {
        await db('candidate_assessments').whereIn('application_id', prevAppIds).del();
      }
      if (await db.schema.hasTable('candidate_referrals')) {
        await db('candidate_referrals').whereIn('application_id', prevAppIds).del();
      }

      await db('applications').whereIn('id', prevAppIds).del();
    }

    if (testCandIds.length > 0) {
      await db('candidates').whereIn('id', testCandIds).del();
    }
    await db('candidates').where('organization_id', orgId).whereIn('email', testCandidateEmails).del();
    await db('jobs').where('organization_id', orgId).where('job_code', 'TEST-JOB-101').del();

    log('🧹 Old test data cleaned successfully.');

    // 2. Create Job Posting
    log('Step 1: Creating a job posting...');
    const job = await jobService.createJob(ctx, {
      jobCode: 'TEST-JOB-101',
      jobTitle: 'QA Automation Engineer',
      jobDescription: 'Integration testing job description details.',
      departmentId: 1, // Engineering/Default
      designationId: 1,
      noOfPositions: 2,
      jobType: 'full_time',
      experienceLevel: 'mid',
      employmentType: 'remote',
      isInternal: false,
      isPublishedExternal: true,
    });
    log(`✅ Job Created: ID=${job.id}, Code=${job.job_code}, Title="${job.job_title}"`);

    // 3. Create Candidate Profile (Verify Email Deduplication)
    log('Step 2: Creating candidate profile (first time)...');
    const cand1 = await candidateService.createCandidate(ctx, {
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'test.candidate@testflow.com',
      phone: '1234567890',
      source: 'direct_apply',
      skills: 'TypeScript, Testing, Playwright',
    });
    log(`✅ Candidate Created: ID=${cand1.id}, Email=${cand1.email}`);

    log('Step 2b: Creating candidate with duplicate email to test deduplication...');
    const cand2 = await candidateService.createCandidate(ctx, {
      firstName: 'Test-UpdatedName',
      lastName: 'Candidate',
      email: 'test.candidate@testflow.com',
      phone: '9999999999', // Updated phone
      source: 'direct_apply',
      skills: 'TypeScript, Testing, Playwright, CI/CD', // Updated skills
    });
    log(`✅ Candidate Deduplication Success! Profile merged into ID=${cand2.id}, Phone=${cand2.phone}`);

    if (cand1.id !== cand2.id) {
      throw new Error(`Deduplication failed: Expected same ID but got cand1.id=${cand1.id} and cand2.id=${cand2.id}`);
    }

    // 4. Create Application
    log('Step 3: Submitting application for candidate...');
    const app = await recruitmentService.createApplication(ctx, {
      candidateId: cand2.id,
      jobId: job.id,
      appliedFromSource: 'integration_test',
    });
    const appStatus = app.applicationStatus || (app as any).application_status;
    log(`✅ Application Submitted: ID=${app.id}, Status=${appStatus}`);

    // 5. Schedule Interview Panel
    log('Step 4: Scheduling Interview Round with panelists...');
    let testEmp = await db('employees').where('organization_id', orgId).first();
    if (!testEmp) {
      const [insertedId] = await db('employees').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_code: 'TEST-EMP-001',
        first_name: 'Test',
        last_name: 'Interviewer',
        email: 'interviewer.test@apponext.com',
        status: 'active',
        date_of_joining: '2024-01-01',
        created_by: userId,
        updated_by: userId,
      });
      testEmp = await db('employees').where('id', insertedId).first();
    }

    const interview = await interviewService.scheduleInterview(ctx, {
      applicationId: app.id,
      interviewType: 'video',
      interviewRound: 1,
      scheduledDate: new Date(Date.now() + 86400000).toISOString().replace('T', ' ').substring(0, 19),
      durationMinutes: 45,
      meetingUrl: 'https://zoom.us/j/123456789',
      interviewerIds: [testEmp.id] // Valid employee as panelist
    });
    log(`✅ Interview Scheduled: ID=${interview.id}, Stage="technical"`);

    // Verify Panel relationship
    const panelists = await db('interview_panel').where('interview_id', interview.id).select('employee_id');
    log(`✅ Interview Panel verified. Assigned interviewers: ${JSON.stringify(panelists)}`);

    // 6. Submit Interview Feedback
    log('Step 5: Submitting Interview Feedback ratings...');
    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    await db('interview_feedback').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      interview_id: interview.id,
      interviewer_id: ctx.userId,
      overall_rating: 5,
      technical_rating: 5,
      communication_rating: 4,
      cultural_fit_rating: 5,
      feedback_text: 'Integration test feedback text. Strong fit.',
      would_recommend: true,
      created_at: mysqlNow,
    });
    log('✅ Interview Feedback submitted successfully.');

    // 7. Move Stage to Offer
    log('Step 6: Moving application stage to "offer"...');
    // Find stage ID for offer stage
    const offerStage = await db('pipeline_stages')
      .where('organization_id', orgId)
      .whereRaw('LOWER(stage_name) LIKE ?', ['%offer%'])
      .first();
    const stageId = offerStage ? offerStage.id : 4;

    const updatedApp = await recruitmentService.moveApplicationToStage(ctx, app.id, stageId, 'Moving to offer generation');
    log(`✅ Application Stage Updated: ID=${updatedApp.id}, Stage=${updatedApp.application_status}`);

    // 8. Generate Offer Letter
    log('Step 7: Generating offer letter...');
    
    // Dynamically resolve or create department & designation for the tenant
    let dept = await db('departments').where('organization_id', orgId).first();
    if (!dept) {
      log('Creating mock department for Abhishek...');
      const [newDeptId] = await db('departments').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Engineering',
        code: 'DEP-ENG',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      dept = { id: newDeptId };
    }

    let desig = await db('designations').where('organization_id', orgId).first();
    if (!desig) {
      log('Creating mock designation for Abhishek...');
      const [newDesigId] = await db('designations').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'QA Automation Engineer',
        code: 'DES-QA-AUTO',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });
      desig = { id: newDesigId };
    }

    const offer = await offerService.generateOffer(ctx, {
      applicationId: app.id,
      positionTitle: 'QA Automation Engineer',
      departmentId: dept.id,
      designationId: desig.id,
      costToCompany: 850000,
      baseSalary: 650000,
      currency: 'INR',
      offerStartDate: new Date(Date.now() + 86400000 * 7).toISOString().substring(0, 10),
      offerExpiryDate: new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10),
    });
    const offerCtc = offer.costToCompany || (offer as any).cost_to_company;
    const offerStatusDraft = offer.status || (offer as any).status;
    log(`✅ Offer Generated: ID=${offer.id}, CTC=${offerCtc}, Status=${offerStatusDraft}`);

    log('Step 7b: Sending offer letter...');
    await offerService.sendOffer(ctx, offer.id);

    // 9. Accept Offer & Verify Auto-Onboarding
    log('Step 8: Accepting offer to trigger employee provisioning...');
    const acceptedOffer = await offerService.acceptOffer(ctx, offer.id);
    const offerStatus = acceptedOffer.status || (acceptedOffer as any).status;
    log(`✅ Offer Accepted: ID=${acceptedOffer.id}, Status=${offerStatus}`);

    // Verify application status is 'hired'
    const finalApp = await db('applications').where('id', app.id).first();
    const finalAppStatus = finalApp.applicationStatus || finalApp.application_status;
    log(`✅ Final Application Status check: Status=${finalAppStatus}`);
    if (finalAppStatus !== 'hired') {
      throw new Error(`Expected application status to be 'hired' but got ${finalAppStatus}`);
    }

    // Verify new employee provisioned
    const employee = await db('employees')
      .where('organization_id', orgId)
      .where('email', 'test.candidate@testflow.com')
      .first();

    if (!employee) {
      throw new Error('Auto-onboarding verification failed: No employee record found with candidate email.');
    }
    log(`✅ Auto-Onboarding verified: Employee Created: ID=${employee.id}, Code=${employee.employee_code || 'N/A'}, Status=${employee.status}`);
    if (employee.status !== 'onboarding') {
      throw new Error(`Expected employee status to be 'onboarding' but got ${employee.status}`);
    }

    // 10. Verify Analytics Metrics
    log('Step 9: Verifying Recruitment Analytics calculations...');
    const metrics = await analyticsService.getDashboardMetrics(ctx);
    log(`✅ Analytics Funnel metrics: ${JSON.stringify(metrics.funnel)}`);
    log(`✅ Analytics Drop-off metrics: ${JSON.stringify(metrics.dropOff)}`);
    log(`✅ Analytics Time-to-Hire: ${metrics.timeToHire} days`);

    log('🎉 INTEGRATION TESTS COMPLETED SUCCESSFULLY! ALL CHECKS PASSED!');
  } catch (error: any) {
    log(`❌ INTEGRATION TESTS FAILED: ${error.message}`);
    log(error.stack || '');
  }

  // Write logs to file
  fs.writeFileSync(logFile, logs.join('\n'));
}
