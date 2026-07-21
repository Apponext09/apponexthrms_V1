import type { Request, Response } from 'express';
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
  createCandidateSchema,
  createApplicationSchema,
  scheduleInterviewSchema,
  createAssessmentSchema,
  generateOfferSchema,
  createReferralSchema,
  moveApplicationStageSchema,
} from '../types/index';

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

  closeJob = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const { id } = req.params;

    const job = await this.jobService.closeJob(ctx, parseInt(id, 10));

    res.json({ success: true, data: job });
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
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    const result = await this.recruitmentService.getApplications(ctx, {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
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
      validated.notes
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

  // ==================== Assessment Endpoints ====================

  createAssessment = asyncHandler(async (req: Request, res: Response) => {
    const ctx = req.ctx!;
    const validated = validate(req.body, createAssessmentSchema);

    const assessment = await this.assessmentService.createAssessment(ctx, {
      assessmentName: validated.assessmentName,
      assessmentType: validated.assessmentType,
      durationMinutes: validated.durationMinutes,
      passingScore: validated.passingScore,
      description: validated.description,
    });

    res.status(201).json({ success: true, data: assessment });
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
}

export const recruitmentController = new RecruitmentController();

