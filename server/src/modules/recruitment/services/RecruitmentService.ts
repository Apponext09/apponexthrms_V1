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

  async getRecruitmentDashboard(ctx: TenantContext): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // 1. Open published jobs count
    const openJobsCountRes = await db('jobs')
      .where({ organization_id: ctx.organizationId, status: 'published' })
      .whereNull('deleted_at')
      .count('id as count')
      .first();
    const totalOpenJobs = Number(openJobsCountRes?.count || 0);

    // 2. Application & Candidate status breakdown across database
    const appStatsRes = await db('applications')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .select('application_status')
      .count('id as count')
      .groupBy('application_status');

    const candStatsRes = await db('candidates')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .select('status')
      .count('id as count')
      .groupBy('status');

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

    const normalizeKey = (s: string) => {
      const lower = String(s || '').toLowerCase().trim();
      if (lower === 'shortlisted') return 'screening';
      if (lower === 'new') return 'applied';
      if (lower === 'offered') return 'offer';
      if (lower === 'joined') return 'hired';
      if (lower === 'scheduled' || lower === 'interviewed') return 'interview';
      return lower;
    };

    let totalApplications = 0;

    appStatsRes.forEach((row: any) => {
      const count = Number(row.count || 0);
      totalApplications += count;
      const key = normalizeKey(row.application_status);
      if (stageCounts[key] !== undefined) {
        stageCounts[key] += count;
      }
    });

    candStatsRes.forEach((row: any) => {
      const count = Number(row.count || 0);
      if (totalApplications === 0) totalApplications += count;
      const key = normalizeKey(row.status);
      if (stageCounts[key] !== undefined && appStatsRes.length === 0) {
        stageCounts[key] += count;
      }
    });

    const stats = {
      totalOpenJobs,
      totalApplications: Math.max(totalApplications, candStatsRes.length),
      appliedCount: stageCounts.applied,
      screeningCount: stageCounts.screening,
      assessmentCount: stageCounts.assessment,
      interviewCount: stageCounts.interview,
      offerCount: stageCounts.offer,
      hiredCount: stageCounts.hired,
      rejectedCount: stageCounts.rejected,
    };

    // 3. Open jobs list
    const openJobs = await this.jobRepo.getPublished(ctx, { pageSize: 10 });

    // 4. Recent applications enriched with candidate name and job title
    let recentApplications = await db('applications')
      .where('applications.organization_id', ctx.organizationId)
      .whereNull('applications.deleted_at')
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .select([
        'applications.id',
        'applications.uuid',
        'applications.candidate_id',
        'applications.job_id',
        'applications.application_status',
        'applications.applied_at',
        'applications.created_at',
        db.raw("TRIM(CONCAT(candidates.first_name, ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
        'candidates.email as candidate_email',
        'candidates.phone as candidate_phone',
        'jobs.job_title as position_title',
        'jobs.job_code as job_code',
      ])
      .orderBy('applications.created_at', 'desc')
      .limit(10);

    if (recentApplications.length === 0) {
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
          db.raw("TRIM(CONCAT(first_name, ' ', COALESCE(last_name, ''))) as candidate_name"),
        ])
        .orderBy('created_at', 'desc')
        .limit(10);

      recentApplications = recentCandidates;
    }

    return {
      stats,
      openJobs: openJobs.items,
      recentApplications,
    };
  }
}
