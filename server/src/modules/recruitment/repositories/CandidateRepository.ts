import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Candidate {
  id: number;
  uuid: string;
  organization_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  alternative_phone: string | null;
  current_location_id: number | null;
  preferred_location_id: number | null;
  current_salary: number | null;
  salary_currency: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  current_company: string | null;
  years_of_experience: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  status: 'applied' | 'screening' | 'assessment' | 'interview' | 'offer' | 'hired' | 'rejected' | 'dropped';
  source: 'job_board' | 'employee_referral' | 'direct_apply' | 'recruitment_agency';
  ai_score: number | null;
  ai_summary: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CandidateRepository extends BaseRepository<Candidate> {
  constructor() {
    super('candidates');
  }

  protected getSearchableFields(): string[] {
    return ['first_name', 'last_name', 'email', 'current_company'];
  }

  async getByEmail(ctx: TenantContext, email: string): Promise<Candidate | null> {
    return this.query(ctx).where('email', email).first();
  }

  async isEmailUnique(ctx: TenantContext, email: string, excludeId?: number): Promise<boolean> {
    let query = this.query(ctx).where('email', email);
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

  async getBySource(ctx: TenantContext, source: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { source },
    });
  }

  async getHighScorers(ctx: TenantContext, minScore: number, options?: ListQueryOptions) {
    const query = this.query(ctx).where('ai_score', '>=', minScore);
    return this.list(ctx, {
      ...options,
      filters: { ai_score: minScore },
    });
  }
}
