import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Job {
  id: number;
  uuid: string;
  organization_id: number;
  job_code: string;
  job_title: string;
  job_description: string;
  department_id: number | null;
  designation_id: number | null;
  location_id: number | null;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  min_experience_years: number | null;
  max_experience_years: number | null;
  min_salary: number | null;
  max_salary: number | null;
  currency: string;
  employment_type: 'onsite' | 'remote' | 'hybrid';
  no_of_positions: number;
  job_template_id: number | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
  published_at: string | null;
  closed_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class JobRepository extends BaseRepository<Job> {
  constructor() {
    super('jobs');
  }

  protected getSearchableFields(): string[] {
    return ['job_code', 'job_title', 'job_description'];
  }

  async getByCode(ctx: TenantContext, code: string): Promise<Job | null> {
    return this.query(ctx).where('job_code', code).first();
  }

  async isCodeUnique(ctx: TenantContext, code: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('job_code', code);
    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }
    const result = await query.first();
    return !result;
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  async getByDepartment(ctx: TenantContext, departmentId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { department_id: departmentId },
    });
  }

  async getPublished(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'published' },
    });
  }

  async getOpen(ctx: TenantContext, options?: ListQueryOptions) {
    return this.getPublished(ctx, options);
  }
}
