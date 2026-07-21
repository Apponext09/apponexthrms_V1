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
      applied_at: new Date().toISOString(),
      applied_from_source: input.appliedFromSource,
      initial_screening_status: 'pending',
      screening_completed_by: null,
      screening_completed_at: null,
      pipeline_stage_id: null,
      current_stage_entered_at: new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    return application;
  }

  async moveApplicationToStage(
    ctx: TenantContext,
    applicationId: number,
    stageId: number,
    notes?: string
  ): Promise<Application> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const stage = await this.pipelineStageRepo.getById(ctx, stageId);
    if (!stage) {
      throw new NotFoundError('Stage not found');
    }

    // Record stage history
    if (application.pipeline_stage_id) {
      await this.stageHistoryRepo.create(ctx, {
        uuid: uuidv4(),
        application_id: applicationId,
        from_stage_id: application.pipeline_stage_id,
        to_stage_id: stageId,
        moved_at: new Date().toISOString(),
        moved_by_user_id: ctx.userId,
        notes: notes || null,
      } as any);
    }

    // Update application status based on stage
    let newStatus = application.application_status;
    if (stage.is_rejection_stage) {
      newStatus = 'rejected';
    }

    const updated = await this.applicationRepo.update(ctx, applicationId, {
      pipeline_stage_id: stageId,
      application_status: newStatus,
      current_stage_entered_at: new Date().toISOString(),
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
      screening_completed_at: new Date().toISOString(),
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
    const openJobs = await this.jobRepo.getPublished(ctx);
    const allApplications = await this.applicationRepo.list(ctx);

    const stats = {
      totalOpenJobs: openJobs.meta.total,
      totalApplications: allApplications.meta.total,
      appliedCount: allApplications.items.filter((a) => a.application_status === 'applied').length,
      interviewCount: allApplications.items.filter((a) => a.application_status === 'interview').length,
      offerCount: allApplications.items.filter((a) => a.application_status === 'offer').length,
      hiredCount: allApplications.items.filter((a) => a.application_status === 'hired').length,
      rejectedCount: allApplications.items.filter((a) => a.application_status === 'rejected').length,
    };

    return {
      stats,
      openJobs: openJobs.items,
      recentApplications: allApplications.items.slice(0, 10),
    };
  }
}
