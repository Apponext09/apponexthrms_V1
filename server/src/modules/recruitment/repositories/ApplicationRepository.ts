import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Application {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  job_id: number;
  application_status: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  applied_at: string;
  applied_from_source: string;
  initial_screening_status: 'pending' | 'passed' | 'failed';
  screening_completed_by: number | null;
  screening_completed_at: string | null;
  pipeline_stage_id: number | null;
  current_stage_entered_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ApplicationRepository extends BaseRepository<Application> {
  constructor() {
    super('applications');
  }

  async getByJobAndCandidate(
    ctx: TenantContext,
    jobId: number,
    candidateId: number
  ): Promise<Application | null> {
    return this.query(ctx)
      .where('job_id', jobId)
      .where('candidate_id', candidateId)
      .first();
  }

  async getByJob(ctx: TenantContext, jobId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { job_id: jobId },
    });
  }

  async getByCandidate(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { candidate_id: candidateId },
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { application_status: status },
    });
  }

  async countByJob(ctx: TenantContext, jobId: number): Promise<number> {
    return this.count(ctx, { job_id: jobId });
  }

  async countByStatus(ctx: TenantContext, status: string): Promise<number> {
    return this.count(ctx, { application_status: status });
  }
}
