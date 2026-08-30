import { ApplicationRepository, type Application } from '../repositories/ApplicationRepository';
import { JobRepository } from '../repositories/JobRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { ApplicationStageHistoryRepository } from '../repositories/SupportingRepository';
import { PipelineStageRepository } from '../repositories/PipelineStageRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export class RecruitmentService {
  private applicationRepo: ApplicationRepository;
  private jobRepo: JobRepository;
  private candidateRepo: CandidateRepository;
  private stageHistoryRepo: ApplicationStageHistoryRepository;
  private pipelineStageRepo: PipelineStageRepository;

  constructor() {
    this.applicationRepo = new ApplicationRepository();
    this.jobRepo = new JobRepository();
    this.candidateRepo = new CandidateRepository();
    this.stageHistoryRepo = new ApplicationStageHistoryRepository();
    this.pipelineStageRepo = new PipelineStageRepository();
  }

  async createApplication(
    ctx: TenantContext,
    input: {
      candidateId: number;
      jobId: number;
      appliedFromSource: string;
    }
  ): Promise<Application> {
    // Check if candidate and job exist
    const candidate = await this.candidateRepo.getById(ctx, input.candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const job = await this.jobRepo.getById(ctx, input.jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Check if application already exists
    const existing = await this.applicationRepo.getByJobAndCandidate(ctx, input.jobId, input.candidateId);
    if (existing) {
      throw new ValidationError('Application already exists for this candidate and job');
    }

    // Create application
    const application = await this.applicationRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: input.candidateId,
      job_id: input.jobId,
      application_status: 'applied',
      applied_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      applied_from_source: input.appliedFromSource,
      initial_screening_status: 'pending',
      screening_completed_by: null,
      screening_completed_at: null,
      pipeline_stage_id: null,
      current_stage_entered_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Synchronize initial stage and candidate status
    const { statusSyncService } = await import('./StatusSyncService');
    const syncResult = await statusSyncService.syncApplicationStatus(
      ctx,
      application.id,
      'applied',
      { notes: `Application created from source: ${input.appliedFromSource}` }
    );

    return syncResult.application;
  }

  async moveApplicationToStage(
    ctx: TenantContext,
    applicationId: number,
    stageId: number,
    notes?: string,
    rejectionReason?: string
  ): Promise<Application> {
    const { statusSyncService } = await import('./StatusSyncService');
    const result = await statusSyncService.syncApplicationStatus(
      ctx,
      applicationId,
      stageId,
      {
        stageId,
        notes,
        rejectionReason,
        changedBy: ctx.userId,
      }
    );

    return result.application;
  }

  async assignRecruiter(ctx: TenantContext, applicationId: number, recruiterId: number | null): Promise<Application> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const updated = await this.applicationRepo.update(ctx, applicationId, {
      assigned_recruiter_id: recruiterId,
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async getApplications(ctx: TenantContext, options?: ListQueryOptions) {
    return this.applicationRepo.list(ctx, options);
  }

  async getHiredCandidates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.applicationRepo.listHiredNotOnboarded(ctx, options);
  }

  async getJobApplications(ctx: TenantContext, jobId: number, options?: ListQueryOptions) {
    return this.applicationRepo.getByJob(ctx, jobId, options);
  }

  async getCandidateApplications(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.applicationRepo.getByCandidate(ctx, candidateId, options);
  }

  async getApplicationStageHistory(ctx: TenantContext, applicationId: number, options?: ListQueryOptions) {
    return this.stageHistoryRepo.getByApplication(ctx, applicationId, options);
  }

  async performInitialScreening(
    ctx: TenantContext,
    applicationId: number,
    result: 'passed' | 'failed'
  ): Promise<Application> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.applicationRepo.update(ctx, applicationId, {
      initial_screening_status: result,
      screening_completed_by: ctx.userId,
      screening_completed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);
  }

  async rejectApplication(ctx: TenantContext, applicationId: number): Promise<Application> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.applicationRepo.update(ctx, applicationId, {
      application_status: 'rejected',
      updated_by: ctx.userId,
    } as any);
  }

  async sendRejectionEmail(
    ctx: TenantContext,
    input: {
      applicationId: number;
      rejectionReason?: string;
      customSubject?: string;
      customBody?: string;
      sendEmail?: boolean;
    }
  ) {
    const { statusSyncService } = await import('./StatusSyncService');
    await statusSyncService.syncApplicationStatus(
      ctx,
      input.applicationId,
      'rejected',
      {
        triggeredBy: 'application_rejected',
        notes: input.rejectionReason || 'Not selected for this position',
        rejectionReason: input.rejectionReason || 'Not selected for this position',
        changedBy: ctx.userId,
      }
    );

    if (input.sendEmail !== false) {
      try {
        const { getKnex } = await import('../../../db/knex');
        const db = getKnex();
        const application = await this.applicationRepo.getById(ctx, input.applicationId);
        if (!application) return;

        const candidate = application.candidate_id 
          ? await db('candidates').where('id', application.candidate_id).first() 
          : null;

        if (!candidate || !candidate.email) return;

        let positionTitle = 'Position';
        if (application.job_posting_id) {
          const job = await db('job_postings').where('id', application.job_posting_id).first();
          if (job) {
            positionTitle = job.title || job.position_title || job.job_title || positionTitle;
          }
        }

        let companyName = 'Apponext HRMS';
        if (ctx.organizationId) {
          const org = await db('organizations').where('id', ctx.organizationId).first();
          if (org) {
            companyName = org.name || companyName;
          }
        }

        const candidateName = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.name || 'Candidate';
        const rejectedStage = application.application_status || 'Application';

        const variables: Record<string, string> = {
          candidateName,
          candidate_name: candidateName,
          positionTitle,
          position_title: positionTitle,
          companyName,
          company_name: companyName,
          rejectedStage,
          rejected_stage: rejectedStage,
          rejectionReason: input.rejectionReason || 'Not selected',
          rejection_reason: input.rejectionReason || 'Not selected',
        };

        const defaultSubject = 'Update on your application for {{positionTitle}} at {{companyName}}';
        const defaultBody = `Dear {{candidateName}},

Thank you for your interest in the {{positionTitle}} position at {{companyName}} and taking the time to participate in our recruitment process.

After careful consideration of your profile and qualifications, we regret to inform you that we will not be moving forward with your application at this time.

We truly appreciate the time and effort you put into applying, and we wish you all the best in your job search and future professional endeavors.

Best regards,
Talent Acquisition Team
{{companyName}}`;

        let rawSubject = input.customSubject || defaultSubject;
        let rawBody = input.customBody || defaultBody;

        const stripHtml = (htmlStr: string) => {
          if (!htmlStr) return '';
          return htmlStr
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim();
        };

        rawBody = input.customBody ? stripHtml(input.customBody) : rawBody;

        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
          rawSubject = rawSubject.replace(regex, value);
          rawBody = rawBody.replace(regex, value);
        }

        const wrapInExecutiveHtml = (subj: string, bodyText: string, company: string) => {
          if (bodyText.includes('<div style="background-color:') || bodyText.includes('<table')) {
            return bodyText;
          }
          const lines = bodyText.split('\n');
          let innerHtml = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              innerHtml += '<div style="height: 10px;"></div>';
            } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
              innerHtml += `<div style="margin: 4px 0 4px 12px; font-size: 14px; color: #334155; font-family: sans-serif;">• ${trimmed.substring(1).trim()}</div>`;
            } else {
              innerHtml += `<p style="margin: 4px 0; font-size: 14px; color: #334155; line-height: 1.6; font-family: sans-serif;">${trimmed}</p>`;
            }
          }
          return `<!DOCTYPE html><html><body style="background:#f1f5f9;font-family:sans-serif;padding:30px 10px;"><table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#334155,#1e293b);padding:24px;color:#fff;"><h2 style="margin:0;font-size:18px;">${company}</h2><p style="margin:4px 0 0 0;font-size:12px;color:#cbd5e1;">Recruitment Application Status Update</p></td></tr><tr><td style="padding:28px;">${innerHtml}</td></tr><tr><td style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">Talent Acquisition Team • <strong>${company}</strong>.</td></tr></table></body></html>`;
        };

        const { sendMail } = await import('../../../common/lib/mail');
        await sendMail({
          to: candidate.email,
          subject: rawSubject,
          html: wrapInExecutiveHtml(rawSubject, rawBody, companyName),
          organizationId: ctx.organizationId,
        });
      } catch (mailError) {
        console.error('Failed to send candidate rejection email:', mailError);
      }
    }
  }

  async getRejectionTemplates(ctx: TenantContext) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let templates: any[] = [];
    if (await db.schema.hasTable('notification_templates')) {
      templates = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where(function() {
          this.where('template_name', 'like', '%Reject%')
            .orWhere('template_name', 'like', '%Regret%');
        });
    }

    const defaultTemplates = [
      {
        id: 'default_reject_general',
        template_name: 'General Application Regret Letter',
        subject: 'Update on your application for {{positionTitle}} at {{companyName}}',
        email_notification: `Dear {{candidateName}},

Thank you for your interest in the {{positionTitle}} position at {{companyName}} and for taking the time to share your application with us.

After careful review, we regret to inform you that we have decided to pursue other candidates whose experience aligns more closely with our current requirements.

We wish you every success in your job search and future professional endeavors.

Best regards,
Talent Acquisition Team
{{companyName}}`,
      },
      {
        id: 'default_reject_assessment',
        template_name: 'Assessment Stage Regret Letter',
        subject: 'Technical Assessment Result: {{positionTitle}} at {{companyName}}',
        email_notification: `Dear {{candidateName}},

Thank you for completing the technical assessment for the {{positionTitle}} position at {{companyName}}.

We evaluated your assessment results alongside our target criteria for this position. Unfortunately, we will not be advancing your candidacy to the next interview round at this stage.

We appreciate the time you invested in completing the assessment and encourage you to apply for future opportunities with us.

Best regards,
Technical Recruiting Team
{{companyName}}`,
      },
      {
        id: 'default_reject_interview',
        template_name: 'Post-Interview Stage Regret Letter',
        subject: 'Interview Status Update: {{positionTitle}} at {{companyName}}',
        email_notification: `Dear {{candidateName}},

Thank you for taking the time to interview with our team for the {{positionTitle}} position at {{companyName}}.

While our interviewers were impressed with your background and qualifications, we have chosen to move forward with another candidate for this role.

We sincerely appreciate your interest in {{companyName}} and the effort you put into our interview process.

Best regards,
Hiring Panel & HR Team
{{companyName}}`,
      }
    ];

    return {
      customTemplates: templates,
      defaultTemplates,
    };
  }

  async withdrawApplication(ctx: TenantContext, applicationId: number): Promise<Application> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.applicationRepo.update(ctx, applicationId, {
      application_status: 'withdrawn',
      updated_by: ctx.userId,
    } as any);
  }

  async getPipelineStages(ctx: TenantContext): Promise<any[]> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let stages: any[] = [];
    try {
      if (await db.schema.hasTable('pipeline_stages')) {
        stages = await db('pipeline_stages')
          .where(function() {
            this.where('organization_id', ctx.organizationId)
              .orWhereNull('organization_id');
          })
          .whereNull('deleted_at')
          .orderBy('stage_order', 'asc');
      }
    } catch (e) {
      console.warn('Failed to query pipeline_stages table:', e);
    }

    if (!stages || stages.length === 0) {
      stages = [
        { id: 1, stage_name: 'Applied', stageName: 'Applied', stage_code: 'applied', stage_order: 1, is_system: true },
        { id: 2, stage_name: 'Screening', stageName: 'Screening', stage_code: 'screening', stage_order: 2, is_system: true },
        { id: 3, stage_name: 'Assessment', stageName: 'Assessment', stage_code: 'assessment', stage_order: 3, is_system: true },
        { id: 4, stage_name: 'Interview', stageName: 'Interview', stage_code: 'interview', stage_order: 4, is_system: true },
        { id: 5, stage_name: 'Offer', stageName: 'Offer', stage_code: 'offer', stage_order: 5, is_system: true },
        { id: 6, stage_name: 'Hired', stageName: 'Hired', stage_code: 'hired', stage_order: 6, is_system: true },
        { id: 7, stage_name: 'Rejected', stageName: 'Rejected', stage_code: 'rejected', stage_order: 7, is_system: true },
      ];
    }

    return stages;
  }

  async getRecruitmentDashboard(ctx: TenantContext, filters: any = {}): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const departmentId = filters.department_id || filters.departmentId ? Number(filters.department_id || filters.departmentId) : null;
    const jobId = filters.job_id || filters.jobId ? Number(filters.job_id || filters.jobId) : null;
    const gradeId = filters.grade_id || filters.gradeId ? Number(filters.grade_id || filters.gradeId) : null;
    const timeRange = filters.time_range || filters.timeRange || 'all';
    const startDate = filters.start_date || filters.startDate;
    const endDate = filters.end_date || filters.endDate;
    const statusFilter = filters.status;

    const applyDateFilter = (q: any, col: string) => {
      if (startDate && endDate) {
        q.whereBetween(col, [startDate, `${endDate} 23:59:59`]);
      } else if (startDate) {
        q.where(col, '>=', startDate);
      } else if (endDate) {
        q.where(col, '<=', `${endDate} 23:59:59`);
      } else if (timeRange && timeRange !== 'all') {
        const now = new Date();
        if (timeRange === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 19).replace('T', ' ');
          q.where(col, '>=', start);
        } else if (timeRange === 'this_week') {
          const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
          const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()).toISOString().slice(0, 19).replace('T', ' ');
          q.where(col, '>=', start);
        } else if (timeRange === 'this_month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');
          q.where(col, '>=', start);
        } else if (timeRange === 'this_quarter') {
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          const start = new Date(now.getFullYear(), quarterMonth, 1).toISOString().slice(0, 19).replace('T', ' ');
          q.where(col, '>=', start);
        } else if (timeRange === 'this_year') {
          const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 19).replace('T', ' ');
          q.where(col, '>=', start);
        }
      }
    };

    // 1. Open published jobs count
    let jobsQuery = db('jobs')
      .where('jobs.organization_id', ctx.organizationId)
      .whereNull('jobs.deleted_at');

    if (departmentId) jobsQuery = jobsQuery.where('jobs.department_id', departmentId);
    if (jobId) jobsQuery = jobsQuery.where('jobs.id', jobId);
    if (gradeId) {
      jobsQuery = jobsQuery
        .leftJoin('mrf_requests', 'jobs.mrf_request_id', 'mrf_requests.id')
        .where('mrf_requests.grade_id', gradeId);
    }
    applyDateFilter(jobsQuery, 'jobs.created_at');

    const totalOpenJobsRes = await jobsQuery.clone()
      .where(function() {
        this.where('jobs.status', 'published')
          .orWhere('jobs.status', 'active')
          .orWhere('jobs.status', 'open');
      })
      .count('jobs.id as count')
      .first();
    const totalOpenJobs = Number(totalOpenJobsRes?.count || (totalOpenJobsRes as any)?.count || 0);

    // 2. Applications query with full joins
    let appsQuery = db('applications')
      .where('applications.organization_id', ctx.organizationId)
      .whereNull('applications.deleted_at')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id');

    if (departmentId) appsQuery = appsQuery.where('jobs.department_id', departmentId);
    if (jobId) appsQuery = appsQuery.where('applications.job_id', jobId);
    if (statusFilter && statusFilter !== 'all') appsQuery = appsQuery.where('applications.application_status', statusFilter);
    if (gradeId) {
      appsQuery = appsQuery
        .leftJoin('mrf_requests', 'jobs.mrf_request_id', 'mrf_requests.id')
        .where('mrf_requests.grade_id', gradeId);
    }
    applyDateFilter(appsQuery, 'applications.created_at');

    const appStatsRes = await appsQuery.clone()
      .select('applications.application_status')
      .count('applications.id as count')
      .groupBy('applications.application_status');

    const stageCounts: Record<string, number> = {
      applied: 0,
      screening: 0,
      assessment: 0,
      interview: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };

    const normalizeKey = (s: any) => {
      const lower = String(s || '').toLowerCase().trim();
      if (!lower) return 'applied';
      if (['shortlisted', 'screening', 'screened', 'reviewed', 'resume review', 'hr review', 'under review'].includes(lower)) return 'screening';
      if (['new', 'applied', 'application', 'pending', 'lead', 'inquiry', 'sourced'].includes(lower)) return 'applied';
      if (['assessment', 'test', 'evaluating', 'evaluated', 'technical test', 'assignment', 'exam'].includes(lower)) return 'assessment';
      if (['scheduled', 'interview', 'interviewed', 'interviewing', 'round 1', 'round 2', 'round 3', 'in_interview', 'panel', 'technical interview', 'hr interview', 'manager interview'].includes(lower)) return 'interview';
      if (['offered', 'offer', 'offer_extended', 'offer_accepted', 'offer released', 'salary negotiation'].includes(lower)) return 'offer';
      if (['joined', 'hired', 'onboarded', 'completed', 'active', 'converted', 'closed'].includes(lower)) return 'hired';
      if (['rejected', 'regret', 'dropped', 'failed', 'disqualified', 'declined'].includes(lower)) return 'rejected';
      if (['withdrawn', 'cancelled'].includes(lower)) return 'withdrawn';
      return 'applied';
    };

    let totalApplications = 0;

    (appStatsRes as any[]).forEach((row: any) => {
      const count = Number(row.count || 0);
      totalApplications += count;
      const rawStatus = row.applicationStatus || row.application_status || row.status || '';
      const key = normalizeKey(rawStatus);
      if (stageCounts[key] !== undefined) {
        stageCounts[key] += count;
      } else {
        stageCounts.applied += count;
      }
    });

    // Fallback to candidates table if applications table has 0 for initial setup
    if (totalApplications === 0 && !departmentId && !jobId && !gradeId) {
      let candQuery = db('candidates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at');
      applyDateFilter(candQuery, 'created_at');

      const candStatsRes = await candQuery
        .select('status')
        .count('id as count')
        .groupBy('status');

      (candStatsRes as any[]).forEach((row: any) => {
        const count = Number(row.count || 0);
        totalApplications += count;
        const rawStatus = row.status || row.candidateStatus || '';
        const key = normalizeKey(rawStatus);
        if (stageCounts[key] !== undefined) {
          stageCounts[key] += count;
        } else {
          stageCounts.applied += count;
        }
      });
    }

    // 3. Funnel & Conversion Calculations
    // Cumulative progression funnel calculation
    const totalAppliedVolume = Math.max(totalApplications, stageCounts.applied + stageCounts.screening + stageCounts.assessment + stageCounts.interview + stageCounts.offer + stageCounts.hired + stageCounts.rejected);
    const enteredScreening = stageCounts.screening + stageCounts.assessment + stageCounts.interview + stageCounts.offer + stageCounts.hired;
    const enteredInterview = stageCounts.assessment + stageCounts.interview + stageCounts.offer + stageCounts.hired;
    const enteredOffer = stageCounts.offer + stageCounts.hired;
    const enteredHired = stageCounts.hired;

    const funnel = {
      applied: totalAppliedVolume,
      screening: enteredScreening > 0 ? enteredScreening : stageCounts.screening,
      assessment: stageCounts.assessment,
      interview: enteredInterview > 0 ? enteredInterview : stageCounts.interview,
      offer: enteredOffer > 0 ? enteredOffer : stageCounts.offer,
      hired: enteredHired > 0 ? enteredHired : stageCounts.hired,
      rejected: stageCounts.rejected,
    };

    const conversions = {
      appliedToScreening: funnel.applied > 0 ? Math.round((funnel.screening / funnel.applied) * 100) : 0,
      screeningToInterview: funnel.screening > 0 ? Math.round((funnel.interview / funnel.screening) * 100) : 0,
      interviewToOffer: funnel.interview > 0 ? Math.round((funnel.offer / funnel.interview) * 100) : 0,
      offerToHired: funnel.offer > 0 ? Math.round((funnel.hired / funnel.offer) * 100) : 0,
      appliedToHired: funnel.applied > 0 ? Math.round((funnel.hired / funnel.applied) * 100) : 0,
    };

    // 4. Calculate Avg. Time to Hire (Days)
    let avgTimeToHire = 0;
    try {
      const hiredApps = await appsQuery.clone()
        .where(function() {
          this.whereRaw("LOWER(COALESCE(applications.application_status, '')) IN ('hired', 'joined', 'onboarded')");
        })
        .select(['applications.id', 'applications.applied_at', 'applications.created_at', 'applications.updated_at'])
        .limit(100);

      if (hiredApps.length > 0) {
        let totalDays = 0;
        for (const app of hiredApps) {
          const appliedDate = new Date(app.applied_at || app.appliedAt || app.created_at || app.createdAt);
          const endDate = new Date(app.updated_at || app.updatedAt || new Date());
          const days = Math.max(0, Math.floor((endDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)));
          totalDays += days;
        }
        avgTimeToHire = Math.round(totalDays / hiredApps.length);
      }
    } catch (e) {}

    const stats = {
      totalOpenJobs,
      totalApplications: totalAppliedVolume,
      appliedCount: stageCounts.applied,
      screeningCount: stageCounts.screening,
      assessmentCount: stageCounts.assessment,
      interviewCount: stageCounts.interview,
      offerCount: stageCounts.offer,
      hiredCount: stageCounts.hired,
      rejectedCount: stageCounts.rejected,
      timeToHire: avgTimeToHire || (funnel.hired > 0 ? 14 : 0),
      conversionRate: conversions.appliedToHired,
    };

    // 5. Sourcing Channels Breakdown
    let sourceMetrics: Array<{ name: string; value: number }> = [];
    try {
      const sourceStatsRows = await appsQuery.clone()
        .select(db.raw("COALESCE(NULLIF(candidates.source, ''), NULLIF(applications.applied_from_source, ''), 'Direct Sourcing') as source_name"))
        .count('applications.id as count')
        .groupBy('source_name');

      sourceMetrics = (sourceStatsRows as any[]).map((r: any) => {
        const rawName = r.sourceName || r.source_name || 'Direct Sourcing';
        return {
          name: rawName ? String(rawName).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Direct Sourcing',
          value: Number(r.count || 0),
        };
      }).filter(s => s.value > 0);

      if (sourceMetrics.length === 0) {
        const candSources = await db('candidates')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select(db.raw("COALESCE(NULLIF(source, ''), 'Direct Sourcing') as source_name"))
          .count('id as count')
          .groupBy('source_name');

        sourceMetrics = (candSources as any[]).map((r: any) => {
          const rawName = r.sourceName || r.source_name || 'Direct Sourcing';
          return {
            name: rawName ? String(rawName).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Direct Sourcing',
            value: Number(r.count || 0),
          };
        }).filter(s => s.value > 0);
      }

      if (sourceMetrics.length === 0 && totalAppliedVolume > 0) {
        sourceMetrics = [{ name: 'Direct Sourcing', value: totalAppliedVolume }];
      }
    } catch (err) {
      console.warn('Error computing sourceMetrics:', err);
      sourceMetrics = [{ name: 'Direct Sourcing', value: Math.max(totalAppliedVolume, 1) }];
    }

    // 6. Monthly Trends (Applications & Hires over last 6 months) — independent query, not filtered by dashboard params
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const idx = (currentMonthIdx - 5 + i + 12) % 12;
      return months[idx];
    });

    const monthMap: Record<string, { apps: number; hires: number }> = {};
    last6Months.forEach(m => { monthMap[m] = { apps: 0, hires: 0 }; });

    // Calculate start date for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 19).replace('T', ' ');

    try {
      // Query applications table directly (no cloning from filtered appsQuery)
      const monthlyStatsRows = await db('applications')
        .where('applications.organization_id', ctx.organizationId)
        .whereNull('applications.deleted_at')
        .where('applications.created_at', '>=', sixMonthsAgoStr)
        .select([
          db.raw("DATE_FORMAT(applications.created_at, '%b') as month_name"),
          db.raw("COUNT(applications.id) as total_apps"),
          db.raw("SUM(CASE WHEN LOWER(COALESCE(applications.application_status, '')) IN ('hired', 'joined', 'onboarded') THEN 1 ELSE 0 END) as total_hires"),
        ])
        .groupByRaw("DATE_FORMAT(applications.created_at, '%Y-%m'), DATE_FORMAT(applications.created_at, '%b')")
        .orderByRaw("DATE_FORMAT(applications.created_at, '%Y-%m') asc");

      (monthlyStatsRows as any[]).forEach((row: any) => {
        const mName = row.monthName || row.month_name;
        const totalApps = Number(row.totalApps || row.total_apps || 0);
        const totalHires = Number(row.totalHires || row.total_hires || 0);

        if (mName && monthMap[mName] !== undefined) {
          monthMap[mName].apps += totalApps;
          monthMap[mName].hires += totalHires;
        }
      });

      // If no applications found, try candidates table as fallback
      const totalMappedApps = Object.values(monthMap).reduce((sum, v) => sum + v.apps, 0);
      if (totalMappedApps === 0) {
        const candMonthlyRows = await db('candidates')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .where('created_at', '>=', sixMonthsAgoStr)
          .select([
            db.raw("DATE_FORMAT(created_at, '%b') as month_name"),
            db.raw("COUNT(id) as total_apps"),
            db.raw("SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('hired', 'joined', 'onboarded') THEN 1 ELSE 0 END) as total_hires"),
          ])
          .groupByRaw("DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')")
          .orderByRaw("DATE_FORMAT(created_at, '%Y-%m') asc");

        (candMonthlyRows as any[]).forEach((row: any) => {
          const mName = row.monthName || row.month_name;
          const totalApps = Number(row.totalApps || row.total_apps || 0);
          const totalHires = Number(row.totalHires || row.total_hires || 0);

          if (mName && monthMap[mName] !== undefined) {
            monthMap[mName].apps += totalApps;
            monthMap[mName].hires += totalHires;
          }
        });
      }

      // Final fallback: if we have total volume but nothing mapped, place in current month
      const finalMappedApps = Object.values(monthMap).reduce((sum, v) => sum + v.apps, 0);
      if (finalMappedApps === 0 && totalAppliedVolume > 0) {
        const currentMonthName = months[currentMonthIdx];
        monthMap[currentMonthName].apps = totalAppliedVolume;
        monthMap[currentMonthName].hires = stageCounts.hired;
      }
    } catch (err) {
      console.warn('Error fetching monthly trends:', err);
    }

    const monthlyTrends = last6Months.map(m => ({
      month: m,
      applications: monthMap[m].apps,
      hires: monthMap[m].hires,
    }));

    // 7. Department Breakdown
    let departmentBreakdown: any[] = [];
    try {
      let deptQuery = db('departments')
        .where('departments.organization_id', ctx.organizationId)
        .whereNull('departments.deleted_at')
        .select(['departments.id', 'departments.name']);

      if (departmentId) deptQuery = deptQuery.where('departments.id', departmentId);
      const depts = await deptQuery.limit(15);

      departmentBreakdown = await Promise.all(depts.map(async (dept: any) => {
        const dId = dept.id;
        const dName = dept.name;

        const openPos = await db('jobs')
          .where({ organization_id: ctx.organizationId, department_id: dId })
          .where(function() {
            this.where('status', 'published')
              .orWhere('status', 'active')
              .orWhere('status', 'open');
          })
          .whereNull('deleted_at')
          .count('id as count')
          .first();

        const deptApps = await db('applications')
          .leftJoin('jobs', 'applications.job_id', 'jobs.id')
          .where('applications.organization_id', ctx.organizationId)
          .where('jobs.department_id', dId)
          .whereNull('applications.deleted_at')
          .count('applications.id as count')
          .first();

        const deptHires = await db('applications')
          .leftJoin('jobs', 'applications.job_id', 'jobs.id')
          .where('applications.organization_id', ctx.organizationId)
          .where('jobs.department_id', dId)
          .where(function() {
            this.whereRaw("LOWER(COALESCE(applications.application_status, '')) IN ('hired', 'joined', 'onboarded')");
          })
          .whereNull('applications.deleted_at')
          .count('applications.id as count')
          .first();

        return {
          departmentId: dId,
          departmentName: dName,
          openPositions: Number(openPos?.count || (openPos as any)?.count || 0),
          applications: Number(deptApps?.count || (deptApps as any)?.count || 0),
          hires: Number(deptHires?.count || (deptHires as any)?.count || 0),
        };
      }));
    } catch (e) {
      console.warn('Error calculating departmentBreakdown:', e);
    }

    // 8. Recent Applications enriched with Candidate Name, Position, Department
    let recentApplications = await appsQuery.clone()
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .select([
        'applications.id',
        'applications.uuid',
        'applications.candidate_id',
        'applications.job_id',
        'applications.application_status',
        'applications.applied_at',
        'applications.created_at',
        db.raw("TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
        'candidates.email as candidate_email',
        'candidates.phone as candidate_phone',
        'jobs.job_title as position_title',
        'jobs.job_code as job_code',
        'departments.name as department_name',
      ])
      .orderBy('applications.created_at', 'desc')
      .limit(15);

    if (recentApplications.length === 0 && !departmentId && !jobId) {
      const recentCandidates = await db('candidates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .select([
          'id',
          'uuid',
          'email as candidate_email',
          'phone as candidate_phone',
          'status as application_status',
          'current_position as position_title',
          'created_at as applied_at',
          'created_at',
          db.raw("TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) as candidate_name"),
        ])
        .orderBy('created_at', 'desc')
        .limit(15);

      recentApplications = recentCandidates as any;
    }

    // 9. Dynamic Filter Dropdown Options
    const filterDepartments = await db('departments')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select(['id', 'name'])
      .orderBy('name', 'asc');

    const filterJobs = await db('jobs')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .select(['id', 'job_title', 'job_code', 'department_id'])
      .orderBy('job_title', 'asc');

    let filterGrades: any[] = [];
    try {
      if (await db.schema.hasTable('grades')) {
        filterGrades = await db('grades')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .select(['id', 'name', 'code'])
          .orderBy('name', 'asc');
      }
    } catch (e) {}

    return {
      stats,
      funnel,
      conversions,
      sourceMetrics,
      monthlyTrends,
      departmentBreakdown,
      recentApplications,
      filterOptions: {
        departments: filterDepartments,
        jobs: filterJobs,
        grades: filterGrades,
      },
    };
  }
}
