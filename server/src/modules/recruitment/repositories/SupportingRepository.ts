import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface InterviewFeedback {
  id: number;
  uuid: string;
  organization_id: number;
  interview_id: number;
  interviewer_id: number;
  overall_rating: number;
  technical_rating: number | null;
  communication_rating: number | null;
  cultural_fit_rating: number | null;
  feedback_text: string | null;
  would_recommend: boolean | null;
  created_at: string;
}

export class InterviewFeedbackRepository extends BaseRepository<InterviewFeedback> {
  constructor() {
    super('interview_feedback');
  }

  async getByInterview(ctx: TenantContext, interviewId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { interview_id: interviewId },
    });
  }

  async getByInterviewer(ctx: TenantContext, interviewerId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { interviewer_id: interviewerId },
    });
  }
}

export interface JobSkill {
  id: number;
  uuid: string;
  organization_id: number;
  job_id: number;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'expert';
  is_mandatory: boolean;
  created_at: string;
}

export class JobSkillRepository extends BaseRepository<JobSkill> {
  constructor() {
    super('job_skills');
  }

  async getByJob(ctx: TenantContext, jobId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { job_id: jobId },
    });
  }

  async getMandatorySkills(ctx: TenantContext, jobId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { job_id: jobId, is_mandatory: true },
    });
  }
}

export interface JobLocation {
  id: number;
  uuid: string;
  organization_id: number;
  job_id: number;
  location_id: number;
  created_at: string;
}

export class JobLocationRepository extends BaseRepository<JobLocation> {
  constructor() {
    super('job_locations');
  }

  async getByJob(ctx: TenantContext, jobId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { job_id: jobId },
    });
  }
}

export interface JobTemplate {
  id: number;
  uuid: string;
  organization_id: number;
  template_name: string;
  description: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class JobTemplateRepository extends BaseRepository<JobTemplate> {
  constructor() {
    super('job_templates');
  }

  protected getSearchableFields(): string[] {
    return ['template_name', 'description'];
  }
}

export interface CareerPortalPage {
  id: number;
  uuid: string;
  organization_id: number;
  page_name: string;
  page_slug: string;
  page_content: string;
  is_published: boolean;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CareerPortalPageRepository extends BaseRepository<CareerPortalPage> {
  constructor() {
    super('career_portal_pages');
  }

  async getBySlug(ctx: TenantContext, slug: string): Promise<CareerPortalPage | null> {
    return this.query(ctx).where('page_slug', slug).first();
  }

  async getPublished(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { is_published: true },
    });
  }
}

export interface ApplicationStageHistory {
  id: number;
  uuid: string;
  organization_id: number;
  application_id: number;
  from_stage_id: number | null;
  to_stage_id: number;
  moved_at: string;
  moved_by_user_id: number;
  notes: string | null;
  created_at: string;
}

export class ApplicationStageHistoryRepository extends BaseRepository<ApplicationStageHistory> {
  constructor() {
    super('application_stage_history');
  }

  async getByApplication(ctx: TenantContext, applicationId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { application_id: applicationId },
      sortBy: 'moved_at',
      sortOrder: 'desc',
    });
  }
}
