import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Assessment {
  id: number;
  uuid: string;
  organization_id: number;
  assessment_name: string;
  assessment_type: 'coding' | 'mcq' | 'assignment' | 'form';
  duration_minutes: number;
  passing_score: number;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AssessmentRepository extends BaseRepository<Assessment> {
  constructor() {
    super('assessments');
  }

  protected getSearchableFields(): string[] {
    return ['assessment_name', 'description'];
  }

  async getByType(ctx: TenantContext, type: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { assessment_type: type },
    });
  }
}

export interface AssessmentAttempt {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  assessment_id: number;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AssessmentAttemptRepository extends BaseRepository<AssessmentAttempt> {
  constructor() {
    super('assessment_attempts');
  }

  async getByApplication(ctx: TenantContext, applicationId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { application_id: applicationId },
    });
  }

  async getByApplicationAndAssessment(
    ctx: TenantContext,
    applicationId: number,
    assessmentId: number
  ): Promise<AssessmentAttempt | null> {
    return this.query(ctx)
      .where('application_id', applicationId)
      .where('assessment_id', assessmentId)
      .orderBy('created_at', 'desc')
      .first();
  }

  async getInProgress(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'in_progress' },
    });
  }
}
