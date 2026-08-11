import type { Request, Response } from 'express';
import { NotFoundError, ValidationError } from '../../../common/errors';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate';
import { RecruitmentService } from '../services/RecruitmentService';
import { JobService } from '../services/JobService';
import { CandidateService } from '../services/CandidateService';
import { InterviewService } from '../services/InterviewService';
import { AssessmentService } from '../services/AssessmentService';
import { OfferService } from '../services/OfferService';
import { ReferralService } from '../services/ReferralService';
import { AnalyticsService } from '../services/AnalyticsService';
import {
  createJobSchema,
  updateJobSchema,
  createCandidateSchema,
  updateCandidateSchema,
  createApplicationSchema,
  scheduleInterviewSchema,
  submitFeedbackSchema,
  createAssessmentSchema,
  assignAssessmentSchema,
  generateOfferSchema,
  createReferralSchema,
  moveApplicationStageSchema,
  assignRecruiterSchema,
} from '../types/index';
import { ResumeParserService } from '../services/ResumeParserService';

export class RecruitmentController {
  private recruitmentService: RecruitmentService;
  private jobService: JobService;
  private candidateService: CandidateService;
  private interviewService: InterviewService;
  private assessmentService: AssessmentService;
  private offerService: OfferService;
  private referralService: ReferralService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.recruitmentService = new RecruitmentService();
    this.jobService = new JobService();
    this.candidateService = new CandidateService();
    this.interviewService = new InterviewService();
    this.assessmentService = new AssessmentService();
    this.offerService = new OfferService();
    this.referralService = new ReferralService();
    this.analyticsService = new AnalyticsService();
  }

  // ==================== Job Endpoints ====================

  createJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createJobSchema);

    const job = await this.jobService.createJob(ctx, {
      mrfRequestId: validated.mrfRequestId,
      jobCode: validated.jobCode,
      jobTitle: validated.jobTitle,
      jobDescription: validated.jobDescription,
      departmentId: validated.departmentId,
      designationId: validated.designationId,
      locationId: validated.locationId,
      jobType: validated.jobType,
      experienceLevel: validated.experienceLevel,
      minExperienceYears: validated.minExperienceYears,
      maxExperienceYears: validated.maxExperienceYears,
      minSalary: validated.minSalary,
      maxSalary: validated.maxSalary,
      currency: validated.currency,
      employmentType: validated.employmentType,
      noOfPositions: validated.noOfPositions,
      jobTemplateId: validated.jobTemplateId,
      skills: validated.skills,
      locations: validated.locations,
    });

    res.status(201).json({ success: true, data: job });
  });

  listJobs = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const result = await this.jobService.listJobs(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const job = await this.jobService.getJob(ctx, parseInt(id, 10));

    res.json({ success: true, data: job });
  });

  publishJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const job = await this.jobService.publishJob(ctx, parseInt(id, 10));

    res.json({ success: true, data: job });
  });

  pauseJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const job = await this.jobService.pauseJob(ctx, parseInt(id, 10));

    res.json({ success: true, data: job });
  });

  closeJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const job = await this.jobService.closeJob(ctx, parseInt(id, 10));

    res.json({ success: true, data: job });
  });

  deleteJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.jobService.deleteJob(ctx, parseInt(id, 10));

    res.json({ success: true, message: 'Job deleted successfully' });
  });

  // ==================== Candidate Endpoints ====================

  createCandidate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createCandidateSchema);

    const candidate = await this.candidateService.createCandidate(ctx, {
      firstName: validated.firstName,
      lastName: validated.lastName,
      email: validated.email,
      phone: validated.phone,
      alternativePhone: validated.alternativePhone,
      currentLocation: validated.currentLocation,
      preferredLocation: validated.preferredLocation,
      currentSalary: validated.currentSalary,
      salaryCurrency: validated.salaryCurrency,
      expectedSalary: validated.expectedSalary,
      noticePeriodDays: validated.noticePeriodDays,
      currentCompany: validated.currentCompany,
      yearsOfExperience: validated.yearsOfExperience,
      linkedinUrl: validated.linkedinUrl,
      githubUrl: validated.githubUrl,
      portfolioUrl: validated.portfolioUrl,
      source: validated.source,
    });

    res.status(201).json({ success: true, data: candidate });
  });

  listCandidates = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const result = await this.candidateService.listCandidates(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getCandidate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const candidate = await this.candidateService.getCandidate(ctx, parseInt(id, 10));

    res.json({ success: true, data: candidate });
  });

  deleteCandidate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.candidateService.deleteCandidate(ctx, parseInt(id, 10));

    res.json({ success: true, message: 'Candidate deleted successfully' });
  });

  // ==================== Application Endpoints ====================

  createApplication = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createApplicationSchema);

    const application = await this.recruitmentService.createApplication(ctx, {
      candidateId: validated.candidateId,
      jobId: validated.jobId,
      appliedFromSource: validated.appliedFromSource,
    });

    res.status(201).json({ success: true, data: application });
  });

  listApplications = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { 
      page = 1, 
      pageSize = 20, 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      companyId,
      locationId,
      departmentId,
      gradeId,
      typeId,
      designationId,
      stage
    } = req.query;

    const filters: any = {};
    if (companyId && companyId !== 'all') filters.company_id = parseInt(companyId as string, 10);
    if (locationId && locationId !== 'all') filters.location_id = parseInt(locationId as string, 10);
    if (departmentId && departmentId !== 'all') filters.department_id = parseInt(departmentId as string, 10);
    if (gradeId && gradeId !== 'all') filters.grade_id = parseInt(gradeId as string, 10);
    if (typeId && typeId !== 'all') filters.type_id = typeId as string;
    if (designationId && designationId !== 'all') filters.designation_id = parseInt(designationId as string, 10);
    if (stage && stage !== 'all') filters.application_status = stage as string;

    const result = await this.recruitmentService.getApplications(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      filters
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  moveApplicationStage = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const validated = validate(req.body, moveApplicationStageSchema);

    const application = await this.recruitmentService.moveApplicationToStage(
      ctx,
      parseInt(applicationId, 10),
      validated.stageId,
      validated.notes,
      validated.rejectionReason
    );

    res.json({ success: true, data: application });
  });

  assignRecruiter = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const validated = validate(req.body, assignRecruiterSchema);

    const application = await this.recruitmentService.assignRecruiter(
      ctx,
      parseInt(applicationId, 10),
      validated.assignedRecruiterId
    );

    res.json({ success: true, data: application });
  });

  // ==================== Interview Endpoints ====================

  scheduleInterview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, scheduleInterviewSchema);

    const interview = await this.interviewService.scheduleInterview(ctx, {
      applicationId: validated.applicationId,
      interviewType: validated.interviewType,
      interviewRound: validated.interviewRound,
      scheduledDate: validated.scheduledDate,
      durationMinutes: validated.durationMinutes,
      meetingUrl: validated.meetingUrl,
      interviewerIds: validated.interviewerIds,
    });

    res.status(201).json({ success: true, data: interview });
  });

  getInterviewsByApplication = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.interviewService.getInterviewsByApplication(
      ctx,
      parseInt(applicationId, 10),
      {
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      }
    );

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getInterviewSchedule = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 100 } = req.query;

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const user = await db('users').where({ id: ctx.userId }).first();
    const employeeId = user?.employee_id;

    if (!employeeId) {
      res.json({ success: true, data: [] });
      return;
    }

    const result = await this.interviewService.getInterviewSchedule(ctx, Number(employeeId), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getTodayInterviews = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 100 } = req.query;

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const user = await db('users').where({ id: ctx.userId }).first();
    const employeeId = user?.employee_id;

    if (!employeeId) {
      res.json({ success: true, data: [] });
      return;
    }

    const result = await this.interviewService.getInterviewSchedule(ctx, Number(employeeId), {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    // Filter to today's interviews only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayItems = result.items.filter((item: any) => {
      const interviewDate = new Date(item.scheduled_at || item.scheduledAt || item.interview_date);
      return interviewDate >= today && interviewDate < tomorrow;
    });

    res.json({ success: true, data: todayItems, meta: { ...result.meta, totalCount: todayItems.length } });
  });

  // ==================== Assessment Endpoints ====================

  createAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createAssessmentSchema);

    const assessment = await this.assessmentService.createAssessment(ctx, {
      assessmentName: req.body.assessmentName || validated.assessmentName,
      assessmentType: req.body.assessmentType || validated.assessmentType,
      durationMinutes: req.body.durationMinutes || validated.durationMinutes,
      passingScore: req.body.passingScore || validated.passingScore,
      description: req.body.description || validated.description,
      departmentId: req.body.departmentId ? Number(req.body.departmentId) : undefined,
      designationId: req.body.designationId ? Number(req.body.designationId) : undefined,
      allowReattempt: req.body.allowReattempt !== undefined ? Boolean(req.body.allowReattempt) : true,
    });

    res.status(201).json({ success: true, data: assessment });
  });

  updateAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assessmentId = parseInt(req.params.assessmentId, 10);
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const updateData: any = {};
    if (req.body.assessmentName !== undefined) updateData.assessment_name = req.body.assessmentName;
    if (req.body.assessmentType !== undefined) updateData.assessment_type = req.body.assessmentType;
    if (req.body.durationMinutes !== undefined) updateData.duration_minutes = req.body.durationMinutes;
    if (req.body.passingScore !== undefined) updateData.passing_score = req.body.passingScore;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.departmentId !== undefined) updateData.department_id = req.body.departmentId ? Number(req.body.departmentId) : null;
    if (req.body.designationId !== undefined) updateData.designation_id = req.body.designationId ? Number(req.body.designationId) : null;
    if (req.body.allowReattempt !== undefined) updateData.allow_reattempt = req.body.allowReattempt;

    updateData.updated_at = new Date();

    await db('assessments')
      .where({ id: assessmentId, organization_id: ctx.organizationId })
      .update(updateData);

    const updated = await db('assessments').where({ id: assessmentId, organization_id: ctx.organizationId }).first();
    res.json({ success: true, data: updated });
  });

  listAssessments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.assessmentService.listAssessments(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  deleteAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assessmentId = parseInt(req.params.assessmentId, 10);

    await this.assessmentService.deleteAssessment(ctx, assessmentId);
    res.json({ success: true, message: 'Assessment deleted successfully' });
  });

  getAttemptsByAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const assessmentId = parseInt(req.params.assessmentId, 10);
    const db = (await import('../../../db/knex')).getKnex();

    const attempts = await db('assessment_attempts')
      .where({ assessment_id: assessmentId, organization_id: ctx.organizationId })
      .orderBy('created_at', 'desc');

    // Enrich with candidate info
    const enriched = await Promise.all(attempts.map(async (attempt: any) => {
      const application = await db('applications').where('id', attempt.application_id).first();
      let candidateName = `App #${attempt.application_id}`;
      let candidateEmail = '';
      if (application) {
        const candidate = await db('candidates').where('id', application.candidate_id).first();
        if (candidate) {
          candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
          candidateEmail = candidate.email || '';
        }
      }
      return {
        ...attempt,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
      };
    }));

    res.json({ success: true, data: enriched });
  });

  // ==================== Offer Endpoints ====================

  generateOffer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, generateOfferSchema);

    const offer = await this.offerService.generateOffer(ctx, {
      applicationId: validated.applicationId,
      positionTitle: validated.positionTitle,
      departmentId: validated.departmentId,
      designationId: validated.designationId,
      costToCompany: validated.costToCompany,
      baseSalary: validated.baseSalary,
      currency: validated.currency,
      offerStartDate: validated.offerStartDate,
      offerExpiryDate: validated.offerExpiryDate,
    });

    res.status(201).json({ success: true, data: offer });
  });

  listOffers = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.offerService.listOffers(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  acceptOffer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { offerId } = req.params;

    const offer = await this.offerService.acceptOffer(ctx, parseInt(offerId, 10));

    res.json({ success: true, data: offer });
  });

  // ==================== Analytics Endpoints ====================

  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;

    const dashboard = await this.recruitmentService.getRecruitmentDashboard(ctx);

    res.json({ success: true, data: dashboard });
  });

  getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;

    const metrics = await this.analyticsService.getDashboardMetrics(ctx);

    res.json({ success: true, data: metrics });
  });

  // ==================== Additional Candidate Endpoints ====================

  updateCandidate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, updateCandidateSchema);

    const candidate = await this.candidateService.updateCandidateProfile(
      ctx,
      parseInt(id, 10),
      validated
    );

    res.json({ success: true, data: candidate });
  });

  getCandidateNotes = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const notes = await db('candidate_notes')
      .where('organization_id', ctx.organizationId)
      .where('candidate_id', parseInt(id, 10))
      .orderBy('created_at', 'desc');

    res.json({ success: true, data: notes });
  });

  addCandidateNote = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { noteText } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const [noteId] = await db('candidate_notes').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      candidate_id: parseInt(id, 10),
      note_text: noteText,
      created_by: ctx.userId,
      created_at: mysqlNow,
      updated_at: mysqlNow,
    });

    res.status(201).json({ success: true, data: { id: noteId } });
  });

  // ==================== Additional Application Endpoints ====================

  getApplicationHistory = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const history = await db('application_stage_history')
      .where('organization_id', ctx.organizationId)
      .where('application_id', parseInt(applicationId, 10))
      .orderBy('changed_at', 'desc');

    res.json({ success: true, data: history });
  });

  // ==================== Additional Interview Endpoints ====================

  submitInterviewFeedback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, submitFeedbackSchema);

    const feedback = await this.interviewService.submitFeedback(ctx, validated.interviewId, validated);

    res.status(201).json({ success: true, data: feedback });
  });

  recordInterviewDecision = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { interviewId } = req.params;
    const { decision, notes } = req.body;

    if (!['advance', 'reject', 'hold'].includes(decision)) {
      throw new ValidationError('Invalid decision. Must be advance, reject, or hold.');
    }

    const result = await this.interviewService.recordInterviewDecision(ctx, parseInt(interviewId, 10), {
      decision,
      notes,
    });

    res.json({
      success: true,
      data: result,
      message: `Interview decision '${decision}' recorded successfully`,
    });
  });

  getInterviewFeedback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { interviewId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const feedback = await db('interview_feedback')
      .where('organization_id', ctx.organizationId)
      .where('interview_id', parseInt(interviewId, 10));

    res.json({ success: true, data: feedback });
  });

  listAllInterviewFeedback = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasDecisionCol = await db.schema.hasColumn('interviews', 'decision').catch(() => false);

    const selectCols: any[] = [
      'interview_feedback.*',
      'interviews.status as interview_status',
      'interviews.feedback_submitted as interview_feedback_submitted',
      'interviews.interview_round as interview_round',
      'interviews.interview_type as interview_type',
      'interviews.application_id as application_id',
      'applications.application_status as application_status',
      db.raw("TRIM(CONCAT(candidates.first_name, ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
      'candidates.email as candidate_email',
      'candidates.phone as candidate_phone',
      db.raw("TRIM(CONCAT(COALESCE(interviewer_emp.first_name, interviewer_user.first_name), ' ', COALESCE(interviewer_emp.last_name, interviewer_user.last_name, ''))) as interviewer_name")
    ];

    if (hasDecisionCol) {
      selectCols.push('interviews.decision as interview_decision');
    }

    const items = await db('interview_feedback')
      .join('interviews', 'interview_feedback.interview_id', 'interviews.id')
      .join('applications', 'interviews.application_id', 'applications.id')
      .join('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('users as interviewer_user', 'interview_feedback.interviewer_id', 'interviewer_user.id')
      .leftJoin('employees as interviewer_emp', 'interviewer_user.employee_id', 'interviewer_emp.id')
      .where('interview_feedback.organization_id', ctx.organizationId)
      .select(selectCols)
      .orderBy('interview_feedback.created_at', 'desc');

    res.json({ success: true, data: items });
  });

  listPipelineStages = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasStageOrder = await db.schema.hasColumn('pipeline_stages', 'stage_order');
    const orderCol = hasStageOrder ? 'stage_order' : 'sequence_order';

    const stages = await db('pipeline_stages')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy(orderCol, 'asc');

    res.json({ success: true, data: stages });
  });

  onboardCandidate = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();

    const result = await db.transaction(async (trx) => {
      const now = new Date();
      const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0 Easter')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`.replace(' Easter', '');

      const application = await trx('applications')
        .where('organization_id', ctx.organizationId)
        .where('id', parseInt(applicationId, 10))
        .first();

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      // Duplicate Prevention: only proceed if application is not already hired
      if (application.applicationStatus === 'hired') {
        throw new ValidationError('This candidate application has already been onboarded / hired.');
      }

      const candidateId = application.candidateId || application.candidate_id;
      const candidate = await trx('candidates')
        .where('organization_id', ctx.organizationId)
        .where('id', candidateId)
        .first();

      if (!candidate) {
        throw new NotFoundError('Candidate not found');
      }

      const offer = await trx('offers')
        .where('organization_id', ctx.organizationId)
        .where('application_id', applicationId)
        .first();

      const timestamp = Date.now().toString().slice(-4);
      const initials = `${(candidate.firstName || 'E')[0]}${(candidate.lastName || 'M')[0]}`.toUpperCase();
      const employeeCode = `EMP-${initials}-${timestamp}`;

      const hasSourceCandidateId = await trx.schema.hasColumn('employees', 'source_candidate_id').catch(() => false);
      const hasSourceApplicationId = await trx.schema.hasColumn('employees', 'source_application_id').catch(() => false);

      const employeeInsertData: any = {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_code: employeeCode,
        status: 'active',
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
        current_designation_id: offer?.designationId || null,
        current_department_id: offer?.departmentId || null,
        date_of_joining: offer?.offerStartDate || new Date().toISOString().split('T')[0],
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: mysqlNow,
        updated_at: mysqlNow,
      };

      if (hasSourceCandidateId) employeeInsertData.source_candidate_id = candidate.id;
      if (hasSourceApplicationId) employeeInsertData.source_application_id = application.id;

      const [employeeId] = await trx('employees').insert(employeeInsertData);

      // Decrement jobs.no_of_positions by 1 with 0-guard
      let updatedJob = null;
      const jobId = application.jobId || application.job_id;
      if (jobId) {
        const job = await trx('jobs')
          .where({ id: jobId, organization_id: ctx.organizationId })
          .first();

        if (job) {
          const currentPositions = Number(job.noOfPositions ?? 1);
          if (currentPositions <= 0) {
            console.warn(`[Recruitment] Over-hiring warning: Job ID ${job.id} already has ${currentPositions} positions remaining.`);
          }

          const newPositions = Math.max(0, currentPositions - 1);
          const jobUpdateData: any = {
            no_of_positions: newPositions,
            updated_by: ctx.userId,
            updated_at: mysqlNow,
          };

          // Auto-close job if positions reach 0
          if (newPositions === 0) {
            jobUpdateData.status = 'closed';
            jobUpdateData.closed_at = mysqlNow;
          }

          await trx('jobs').where('id', job.id).update(jobUpdateData);
          updatedJob = await trx('jobs').where('id', job.id).first();
        }
      }

      // Synchronize application status to 'hired' using StatusSyncService
      const { statusSyncService } = await import('../services/StatusSyncService');
      const syncResult = await statusSyncService.syncApplicationStatus(
        ctx,
        application.id,
        'hired',
        {
          triggeredBy: 'candidate_onboarded',
          notes: `Candidate onboarded as Employee ${employeeCode} (ID: ${employeeId})`,
          metadata: {
            employeeId,
            employeeCode,
            jobId: jobId,
            remainingJobPositions: updatedJob?.noOfPositions ?? null,
            jobStatus: updatedJob?.status ?? null,
          },
          trx,
        }
      );

      return {
        employeeId,
        employeeCode,
        application: syncResult.application,
        candidate: syncResult.candidate,
        remainingPositions: updatedJob?.noOfPositions ?? null,
        jobStatus: updatedJob?.status ?? null,
      };
    });

    res.json({ success: true, ...result });
  });

  getCandidateFunnelReport = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // 1. Application Funnel Counts (by application_status)
    const appStages = await db('applications')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .select('application_status')
      .count('id as count')
      .groupBy('application_status');

    const appFunnelMap: Record<string, number> = {
      applied: 0,
      screening: 0,
      assessment: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };
    appStages.forEach((item: any) => {
      if (item.application_status) {
        appFunnelMap[item.application_status] = Number(item.count || 0);
      }
    });

    // 2. Sourcing Funnel by Channel (from resume_bank)
    const sourcingByChannelRaw = await db('resume_bank')
      .where('resume_bank.organization_id', ctx.organizationId)
      .whereNull('resume_bank.deleted_at')
      .leftJoin('candidates', 'resume_bank.id', 'candidates.resume_bank_id')
      .leftJoin('applications', 'candidates.id', 'applications.candidate_id')
      .select([
        db.raw("COALESCE(resume_bank.source, 'General Sourcing') as source_channel"),
        db.raw('COUNT(DISTINCT resume_bank.id) as total_sourced'),
        db.raw("COUNT(DISTINCT CASE WHEN resume_bank.candidate_id IS NOT NULL OR resume_bank.status != 'Available' OR applications.id IS NOT NULL THEN resume_bank.id END) as total_shortlisted"),
        db.raw("COUNT(DISTINCT CASE WHEN applications.application_status = 'hired' OR candidates.status = 'hired' THEN resume_bank.id END) as total_hired"),
      ])
      .groupBy('source_channel');

    const bySource = sourcingByChannelRaw.map((row: any) => {
      const sourced = Number(row.total_sourced || 0);
      const shortlisted = Number(row.total_shortlisted || 0);
      const hired = Number(row.total_hired || 0);
      return {
        sourceChannel: row.source_channel,
        totalSourced: sourced,
        totalShortlisted: shortlisted,
        totalHired: hired,
        shortlistRatePct: sourced > 0 ? Math.round((shortlisted / sourced) * 100) : 0,
        hireRatePct: sourced > 0 ? Math.round((hired / sourced) * 100) : 0,
      };
    });

    // 3. Sourcing Funnel by Job
    const sourcingByJobRaw = await db('resume_bank')
      .where('resume_bank.organization_id', ctx.organizationId)
      .whereNull('resume_bank.deleted_at')
      .leftJoin('jobs', 'resume_bank.job_id', 'jobs.id')
      .select([
        db.raw("COALESCE(jobs.job_title, 'General / Unassigned Pool') as position_title"),
        'resume_bank.job_id',
        'jobs.no_of_positions',
        'jobs.status as job_status',
        db.raw('COUNT(DISTINCT resume_bank.id) as total_sourced'),
        db.raw("COUNT(DISTINCT CASE WHEN resume_bank.candidate_id IS NOT NULL OR resume_bank.status != 'Available' THEN resume_bank.id END) as total_shortlisted"),
      ])
      .groupBy('resume_bank.job_id', 'jobs.job_title', 'jobs.no_of_positions', 'jobs.status');

    const byJob = sourcingByJobRaw.map((row: any) => {
      const sourced = Number(row.total_sourced || 0);
      const shortlisted = Number(row.total_shortlisted || 0);
      return {
        jobId: row.job_id,
        positionTitle: row.position_title,
        noOfPositions: row.no_of_positions ?? null,
        jobStatus: row.job_status || 'open',
        totalSourced: sourced,
        totalShortlisted: shortlisted,
        shortlistRatePct: sourced > 0 ? Math.round((shortlisted / sourced) * 100) : 0,
      };
    });

    const totalSourcedAll = bySource.reduce((acc: number, cur: any) => acc + cur.totalSourced, 0);
    const totalShortlistedAll = bySource.reduce((acc: number, cur: any) => acc + cur.totalShortlisted, 0);
    const totalHiredAll = bySource.reduce((acc: number, cur: any) => acc + cur.totalHired, 0);

    res.json({
      success: true,
      data: {
        applicationFunnel: appFunnelMap,
        sourcingFunnel: {
          summary: {
            totalSourced: totalSourcedAll,
            totalShortlisted: totalShortlistedAll,
            totalHired: totalHiredAll,
            overallShortlistRatePct: totalSourcedAll > 0 ? Math.round((totalShortlistedAll / totalSourcedAll) * 100) : 0,
            overallHireRatePct: totalSourcedAll > 0 ? Math.round((totalHiredAll / totalSourcedAll) * 100) : 0,
          },
          bySource,
          byJob,
        },
      },
    });
  });

  // ==================== Additional Assessment Endpoints ====================

  assignAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, assignAssessmentSchema);
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const attemptUuid = uuidv4();
    const [attemptId] = await db('assessment_attempts').insert({
      uuid: attemptUuid,
      organization_id: ctx.organizationId,
      application_id: validated.applicationId,
      assessment_id: validated.assessmentId,
      status: 'in_progress',
      attempt_number: 1,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: mysqlNow,
      updated_at: mysqlNow,
    });

    res.status(201).json({ success: true, data: { id: attemptId, uuid: attemptUuid } });
  });


  getAssessmentAttempts = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { applicationId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const attempts = await db('assessment_attempts')
      .where('organization_id', ctx.organizationId)
      .where('application_id', parseInt(applicationId, 10));

    res.json({ success: true, data: attempts });
  });

  getAttemptsByAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { assessmentId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const attempts = await db('assessment_attempts')
      .leftJoin('applications', 'assessment_attempts.application_id', 'applications.id')
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .select(
        'assessment_attempts.*',
        db.raw(`CONCAT(candidates.first_name, ' ', COALESCE(candidates.last_name, '')) as candidate_name`),
        'candidates.email as candidate_email'
      )
      .where('assessment_attempts.organization_id', ctx.organizationId)
      .where('assessment_attempts.assessment_id', parseInt(assessmentId, 10));

    res.json({ success: true, data: attempts });
  });

  // ==================== Additional Offer Endpoints ====================

  rejectOffer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { offerId } = req.params;

    const offer = await this.offerService.rejectOffer(ctx, parseInt(offerId, 10));

    res.json({ success: true, data: offer });
  });

  sendOffer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { offerId } = req.params;

    const offer = await this.offerService.sendOffer(ctx, parseInt(offerId, 10));

    res.json({ success: true, data: offer });
  });

  getPublicOffer = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const offer = await db('offers').where('uuid', uuid).first();
    if (!offer) {
      res.status(404).json({ success: false, error: 'Offer not found' });
      return;
    }

    const application = await db('applications').where('id', offer.application_id).first();
    const candidate = await db('candidates').where('id', application.candidate_id).first();
    const org = await db('organizations').where('id', offer.organization_id).first();

    let departmentName = 'N/A';
    if (offer.department_id) {
      const dept = await db('departments').where('id', offer.department_id).first();
      departmentName = dept?.name || 'N/A';
    }

    res.json({
      success: true,
      data: {
        offer,
        candidateName: `${candidate.first_name} ${candidate.last_name || ''}`.trim(),
        candidateEmail: candidate.email,
        companyName: org?.name || 'Apponext Organization',
        departmentName
      }
    });
  });

  acceptPublicOffer = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const { signature } = req.body;

    const offer = await this.offerService.acceptOfferByUuid(uuid, signature);

    res.json({ success: true, data: offer });
  });

  rejectPublicOffer = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const { comments } = req.body;

    const offer = await this.offerService.rejectOfferByUuid(uuid, comments);

    res.json({ success: true, data: offer });
  });

  getPublicAssessmentAttempt = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const data = await this.assessmentService.getAssessmentAttemptByUuid(uuid);
    res.json({ success: true, data });
  });

  submitPublicAssessmentAttempt = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const result = await this.assessmentService.submitAssessmentResultByUuid(uuid, req.body);
    res.json({ success: true, data: result });
  });

  // ==================== Job Update ====================

  updateJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const validated = validate(req.body, updateJobSchema);

    const updateData: any = {};
    if (validated.jobTitle !== undefined) updateData.job_title = validated.jobTitle;
    if (validated.jobDescription !== undefined) updateData.job_description = validated.jobDescription;
    if (validated.departmentId !== undefined) updateData.department_id = validated.departmentId;
    if (validated.designationId !== undefined) updateData.designation_id = validated.designationId;
    if (validated.locationId !== undefined) updateData.location_id = validated.locationId;
    if (validated.jobType !== undefined) updateData.job_type = validated.jobType;
    if (validated.experienceLevel !== undefined) updateData.experience_level = validated.experienceLevel;
    if (validated.minExperienceYears !== undefined) updateData.min_experience_years = validated.minExperienceYears;
    if (validated.maxExperienceYears !== undefined) updateData.max_experience_years = validated.maxExperienceYears;
    if (validated.minSalary !== undefined) updateData.min_salary = validated.minSalary;
    if (validated.maxSalary !== undefined) updateData.max_salary = validated.maxSalary;
    if (validated.currency !== undefined) updateData.currency = validated.currency;
    if (validated.employmentType !== undefined) updateData.employment_type = validated.employmentType;
    if (validated.noOfPositions !== undefined) updateData.no_of_positions = validated.noOfPositions;

    const job = await this.jobService.updateJob(ctx, parseInt(id, 10), updateData);

    res.json({ success: true, data: job });
  });

  // ==================== Interview Reschedule & Cancel ====================

  rescheduleInterview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { interviewId } = req.params;
    const { scheduledDate, meetingUrl } = req.body;

    if (!scheduledDate) {
      throw new ValidationError('scheduledDate is required for rescheduling');
    }

    const interview = await this.interviewService.rescheduleInterview(
      ctx,
      parseInt(interviewId, 10),
      scheduledDate
    );

    res.json({ success: true, data: interview, message: 'Interview rescheduled successfully' });
  });

  cancelInterview = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { interviewId } = req.params;

    const interview = await this.interviewService.cancelInterview(
      ctx,
      parseInt(interviewId, 10)
    );

    res.json({ success: true, data: interview, message: 'Interview cancelled successfully' });
  });

  // ==================== Offer Get-by-ID (Enriched) ====================

  getOffer = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { offerId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const offer = await db('offers')
      .where({ id: parseInt(offerId, 10), organization_id: ctx.organizationId })
      .first();

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    const application = await db('applications').where('id', offer.application_id).first();
    const candidate = application ? await db('candidates').where('id', application.candidate_id).first() : null;
    const job = application ? await db('jobs').where('id', application.job_id).first() : null;
    let departmentName = 'N/A';
    if (offer.department_id) {
      const dept = await db('departments').where('id', offer.department_id).first();
      departmentName = dept?.name || 'N/A';
    }

    res.json({
      success: true,
      data: {
        ...offer,
        candidate_name: candidate ? `${candidate.first_name} ${candidate.last_name || ''}`.trim() : 'N/A',
        candidate_email: candidate?.email || '',
        job_title: job?.job_title || 'N/A',
        department_name: departmentName,
      },
    });
  });

  // ==================== Referral Endpoints ====================

  createReferral = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createReferralSchema);

    const referral = await this.referralService.createReferral(ctx, {
      employeeId: validated.employeeId,
      candidateId: validated.candidateId,
      referralRewardAmount: validated.referralRewardAmount,
    });

    res.status(201).json({ success: true, data: referral });
  });

  listReferrals = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { page = 1, pageSize = 20 } = req.query;

    const result = await this.referralService.listReferrals(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    });

    res.json({ success: true, data: result.items, meta: result.meta });
  });

  getReferral = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const referral = await this.referralService.getReferral(ctx, parseInt(id, 10));

    res.json({ success: true, data: referral });
  });

  rewardReferral = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { rewardAmount, rewardType } = req.body;

    if (!rewardAmount) {
      throw new ValidationError('rewardAmount is required');
    }

    const result = await this.referralService.rewardReferral(ctx, parseInt(id, 10), {
      rewardAmount,
      rewardType: rewardType || 'cash',
    });

    res.json({ success: true, data: result, message: 'Referral reward processed successfully' });
  });

  deleteReferral = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    await this.referralService.deleteReferral(ctx, parseInt(id, 10));

    res.json({ success: true, message: 'Referral deleted successfully' });
  });

  trackReferralProgress = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const progress = await this.referralService.trackReferralProgress(ctx, parseInt(id, 10));

    res.json({ success: true, data: progress });
  });

  // ==================== Candidate Documents ====================

  uploadCandidateDocument = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const file = (req as any).file;
    const { documentType } = req.body;

    if (!file) {
      throw new ValidationError('File is required');
    }

    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const [docId] = await db('candidate_documents').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      candidate_id: parseInt(id, 10),
      document_type: documentType || 'general',
      file_name: file.originalname,
      file_url: `/uploads/${file.filename}`,
      file_size: file.size,
      uploaded_at: now,
      created_at: now,
      updated_at: now,
    });

    res.status(201).json({ success: true, data: { id: docId, fileName: file.originalname, fileUrl: `/uploads/${file.filename}` } });
  });

  listCandidateDocuments = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const documents = await db('candidate_documents')
      .where({ organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .orderBy('created_at', 'desc');

    res.json({ success: true, data: documents });
  });

  deleteCandidateDocument = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id, docId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    await db('candidate_documents')
      .where({ id: parseInt(docId, 10), organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .delete();

    res.json({ success: true, message: 'Document deleted successfully' });
  });

  // ==================== Candidate Skills ====================

  listCandidateSkills = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasTable = await db.schema.hasTable('candidate_skills');
    if (!hasTable) { res.json({ success: true, data: [] }); return; }

    const skills = await db('candidate_skills')
      .where({ organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .orderBy('created_at', 'desc');

    res.json({ success: true, data: skills });
  });

  addCandidateSkill = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { skillName, proficiency, yearsOfExperience } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const hasTable = await db.schema.hasTable('candidate_skills');
    if (!hasTable) {
      res.status(400).json({ success: false, error: 'candidate_skills table not available' });
      return;
    }

    const hasProficiencyLevelCol = await db.schema.hasColumn('candidate_skills', 'proficiency_level');
    const hasUpdatedAtCol = await db.schema.hasColumn('candidate_skills', 'updated_at');
    const insertData: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      candidate_id: parseInt(id, 10),
      skill_name: skillName,
      years_of_experience: yearsOfExperience || null,
      created_at: now,
    };

    if (hasUpdatedAtCol) {
      insertData.updated_at = now;
    }

    if (hasProficiencyLevelCol) {
      insertData.proficiency_level = proficiency || 'intermediate';
    } else {
      insertData.proficiency = proficiency || 'intermediate';
    }

    const [skillId] = await db('candidate_skills').insert(insertData);

    res.status(201).json({ success: true, data: { id: skillId } });
  });



  deleteCandidateSkill = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id, skillId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    await db('candidate_skills')
      .where({ id: parseInt(skillId, 10), organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .delete();

    res.json({ success: true, message: 'Skill deleted successfully' });
  });

  // ==================== Candidate Education ====================

  listCandidateEducation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasTable = await db.schema.hasTable('candidate_education');
    if (!hasTable) { res.json({ success: true, data: [] }); return; }

    const hasGradCol = await db.schema.hasColumn('candidate_education', 'graduation_year');
    const education = await db('candidate_education')
      .where({ organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .orderBy(hasGradCol ? 'graduation_year' : 'created_at', 'desc');

    res.json({ success: true, data: education });
  });

  addCandidateEducation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { degree, fieldOfStudy, institution, graduationYear } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const hasTable = await db.schema.hasTable('candidate_education');
    if (!hasTable) {
      res.status(400).json({ success: false, error: 'candidate_education table not available' });
      return;
    }

    const hasGraduationYearCol = await db.schema.hasColumn('candidate_education', 'graduation_year');
    const hasUpdatedAtCol = await db.schema.hasColumn('candidate_education', 'updated_at');
    const insertData: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      candidate_id: parseInt(id, 10),
      degree: degree || '',
      field_of_study: fieldOfStudy || '',
      institution: institution || '',
      created_at: now,
    };

    if (hasUpdatedAtCol) {
      insertData.updated_at = now;
    }

    if (hasGraduationYearCol) {
      insertData.graduation_year = graduationYear || null;
    } else {
      insertData.end_date = graduationYear ? `${graduationYear}-12-31` : null;
    }

    const [eduId] = await db('candidate_education').insert(insertData);

    res.status(201).json({ success: true, data: { id: eduId } });
  });



  deleteCandidateEducation = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id, eduId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    await db('candidate_education')
      .where({ id: parseInt(eduId, 10), organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .delete();

    res.json({ success: true, message: 'Education record deleted successfully' });
  });

  // ==================== Candidate Experience ====================

  listCandidateExperience = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasTable = await db.schema.hasTable('candidate_experience');
    if (!hasTable) { res.json({ success: true, data: [] }); return; }

    const experience = await db('candidate_experience')
      .where({ organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .orderBy('created_at', 'desc');

    res.json({ success: true, data: experience });
  });

  addCandidateExperience = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;
    const { companyName, jobTitle, startDate, endDate, isCurrent, description } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const hasTable = await db.schema.hasTable('candidate_experience');
    if (!hasTable) {
      res.status(400).json({ success: false, error: 'candidate_experience table not available' });
      return;
    }

    const hasDesignationCol = await db.schema.hasColumn('candidate_experience', 'designation');
    const hasUpdatedAtCol = await db.schema.hasColumn('candidate_experience', 'updated_at');
    const insertData: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      candidate_id: parseInt(id, 10),
      company_name: companyName || '',
      start_date: startDate || null,
      end_date: endDate || null,
      is_current: isCurrent || false,
      description: description || null,
      created_at: now,
    };

    if (hasUpdatedAtCol) {
      insertData.updated_at = now;
    }

    if (hasDesignationCol) {
      insertData.designation = jobTitle || '';
    } else {
      insertData.job_title = jobTitle || '';
    }

    const [expId] = await db('candidate_experience').insert(insertData);

    res.status(201).json({ success: true, data: { id: expId } });
  });



  deleteCandidateExperience = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id, expId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    await db('candidate_experience')
      .where({ id: parseInt(expId, 10), organization_id: ctx.organizationId, candidate_id: parseInt(id, 10) })
      .delete();

    res.json({ success: true, message: 'Experience record deleted successfully' });
  });

  // ==================== Candidate Fitment / Scoring ====================

  getCandidateFitment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id, jobId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const candidate = await db('candidates')
      .where({ id: parseInt(id, 10), organization_id: ctx.organizationId })
      .first();
    if (!candidate) throw new NotFoundError('Candidate not found');

    const job = await db('jobs')
      .where({ id: parseInt(jobId, 10), organization_id: ctx.organizationId })
      .first();
    if (!job) throw new NotFoundError('Job not found');

    const resumeParser = new ResumeParserService();
    const fitment = await resumeParser.generateFitmentAnalysis(ctx, candidate.id, job.id);

    res.json({ success: true, data: fitment });
  });


  // ==================== Assessment Questions ====================

  listAssessmentQuestions = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { assessmentId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasTable = await db.schema.hasTable('assessment_questions');
    if (!hasTable) { res.json({ success: true, data: [] }); return; }

    const questions = await db('assessment_questions')
      .where({ organization_id: ctx.organizationId, assessment_id: parseInt(assessmentId, 10) })
      .whereNull('deleted_at')
      .orderBy('question_number', 'asc');

    res.json({ success: true, data: questions });
  });

  addAssessmentQuestion = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { assessmentId } = req.params;
    const { questionText, questionType, optionsJson, correctAnswer, marks, explanation, questionNumber } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const hasTable = await db.schema.hasTable('assessment_questions');
    if (!hasTable) {
      res.status(400).json({ success: false, error: 'assessment_questions table not available. Run migration first.' });
      return;
    }

    // Auto-assign question number if not provided
    let qNum = questionNumber;
    if (!qNum) {
      const maxRes = await db('assessment_questions')
        .where({ assessment_id: parseInt(assessmentId, 10), organization_id: ctx.organizationId })
        .max('question_number as maxNum')
        .first();
      qNum = (maxRes?.maxNum || 0) + 1;
    }

    const [questionId] = await db('assessment_questions').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      assessment_id: parseInt(assessmentId, 10),
      question_number: qNum,
      question_text: questionText,
      question_type: questionType || 'mcq',
      options_json: optionsJson ? JSON.stringify(optionsJson) : null,
      correct_answer: correctAnswer || null,
      marks: marks || 1,
      explanation: explanation || null,
      created_by: ctx.userId,
      created_at: now,
      updated_at: now,
    });

    res.status(201).json({ success: true, data: { id: questionId, questionNumber: qNum } });
  });

  updateAssessmentQuestion = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { assessmentId, questionId } = req.params;
    const { questionText, questionType, optionsJson, correctAnswer, marks, explanation, questionNumber } = req.body;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const updateData: any = { updated_at: now };
    if (questionText !== undefined) updateData.question_text = questionText;
    if (questionType !== undefined) updateData.question_type = questionType;
    if (optionsJson !== undefined) updateData.options_json = JSON.stringify(optionsJson);
    if (correctAnswer !== undefined) updateData.correct_answer = correctAnswer;
    if (marks !== undefined) updateData.marks = marks;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (questionNumber !== undefined) updateData.question_number = questionNumber;

    await db('assessment_questions')
      .where({ id: parseInt(questionId, 10), assessment_id: parseInt(assessmentId, 10), organization_id: ctx.organizationId })
      .update(updateData);

    res.json({ success: true, message: 'Question updated successfully' });
  });

  deleteAssessmentQuestion = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { assessmentId, questionId } = req.params;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db('assessment_questions')
      .where({ id: parseInt(questionId, 10), assessment_id: parseInt(assessmentId, 10), organization_id: ctx.organizationId })
      .update({ deleted_at: now });

    res.json({ success: true, message: 'Question deleted successfully' });
  });
}

export const recruitmentController = new RecruitmentController();
