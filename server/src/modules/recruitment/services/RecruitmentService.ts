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

    // 2. Application status breakdown
    const appStatsRes = await db('applications')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .select('application_status')
      .count('id as count')
      .groupBy('application_status');

    let totalApplications = 0;
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

    appStatsRes.forEach((row: any) => {
      const count = Number(row.count || 0);
      totalApplications += count;
      if (row.application_status && stageCounts[row.application_status] !== undefined) {
        stageCounts[row.application_status] = count;
      }
    });

    const stats = {
      totalOpenJobs,
      totalApplications,
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
    const recentApplications = await db('applications')
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

    return {
      stats,
      openJobs: openJobs.items,
      recentApplications,
    };
  }
}
