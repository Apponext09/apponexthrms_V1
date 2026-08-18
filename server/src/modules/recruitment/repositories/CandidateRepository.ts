import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Candidate {
  id: number;
  uuid: string;
  organization_id: number;
  resume_bank_id?: number | null;
  first_name: string;
  last_name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string | null;
  alternative_phone: string | null;
  alternativePhone?: string | null;
  current_location_id: number | null;
  currentLocationId?: number | null;
  preferred_location_id: number | null;
  preferredLocationId?: number | null;
  current_salary: number | null;
  currentSalary?: number | null;
  salary_currency: string | null;
  salaryCurrency?: string | null;
  expected_salary: number | null;
  expectedSalary?: number | null;
  notice_period_days: number | null;
  noticePeriodDays?: number | null;
  current_company: string | null;
  currentCompany?: string | null;
  years_of_experience: number | null;
  yearsOfExperience?: number | null;
  linkedin_url: string | null;
  linkedinUrl?: string | null;
  github_url: string | null;
  githubUrl?: string | null;
  portfolio_url: string | null;
  portfolioUrl?: string | null;
  status: 'applied' | 'screening' | 'assessment' | 'interview' | 'offer' | 'hired' | 'rejected' | 'dropped';
  source: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  resume_url: string | null;
  resumeUrl?: string | null;
  resume_tracker_id?: string | null;
  resume_source?: string | null;
  resume_uploaded_by?: number | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CandidateRepository extends BaseRepository<Candidate> {
  private static schemaChecked = false;

  constructor() {
    super('candidates');
  }

  private async ensureColumns(): Promise<void> {
    if (CandidateRepository.schemaChecked) return;
    try {
      const hasResumeBankId = await this.db.schema.hasColumn('candidates', 'resume_bank_id');
      if (!hasResumeBankId) {
        await this.db.schema.alterTable('candidates', (table) => {
          table.bigInteger('resume_bank_id').unsigned().nullable();
        });
      }
      CandidateRepository.schemaChecked = true;
    } catch (err) {}
  }

  protected getSearchableFields(): string[] {
    return ['first_name', 'last_name', 'email', 'current_company'];
  }

  override async getById(ctx: TenantContext, id: number): Promise<Candidate | null> {
    await this.ensureColumns();
    const hasResumeBankId = await this.db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
    const hasResumeBankTable = await this.db.schema.hasTable('resume_bank').catch(() => false);

    const query = this.db(this.tableName)
      .where('candidates.id', id)
      .where('candidates.organization_id', ctx.organizationId)
      .whereNull('candidates.deleted_at');

    if (hasResumeBankId && hasResumeBankTable) {
      query.leftJoin('resume_bank', 'candidates.resume_bank_id', 'resume_bank.id')
        .select([
          'candidates.*',
          'resume_bank.tracker_id as resume_tracker_id',
          'resume_bank.source as resume_source',
          'resume_bank.uploaded_by as resume_uploaded_by'
        ]);
    } else {
      query.select('candidates.*');
    }

    return query.first();
  }

  override async list(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    await this.ensureColumns();
    const hasResumeBankId = await this.db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
    const hasResumeBankTable = await this.db.schema.hasTable('resume_bank').catch(() => false);

    const query = this.db(this.tableName)
      .where('candidates.organization_id', ctx.organizationId)
      .whereNull('candidates.deleted_at');

    if (hasResumeBankId && hasResumeBankTable) {
      query.leftJoin('resume_bank', 'candidates.resume_bank_id', 'resume_bank.id')
        .select([
          'candidates.*',
          'resume_bank.tracker_id as resume_tracker_id',
          'resume_bank.source as resume_source',
          'resume_bank.uploaded_by as resume_uploaded_by'
        ]);
    } else {
      query.select('candidates.*');
    }

    if (options?.filters) {
      if (options.filters.status) {
        const st = String(options.filters.status).toLowerCase();
        if (st.includes('applied')) {
          query.whereIn(this.db.raw('LOWER(candidates.status)'), ['applied', 'new', 'screening']);
        } else if (st.includes('interview')) {
          query.whereIn(this.db.raw('LOWER(candidates.status)'), ['interview', 'interviewing']);
        } else if (st.includes('offer')) {
          query.whereIn(this.db.raw('LOWER(candidates.status)'), ['offer', 'offered', 'hired']);
        } else {
          query.where(this.db.raw('LOWER(candidates.status)'), st);
        }
      }
      if (options.filters.source) {
        query.where('candidates.source', options.filters.source);
      }
      if (hasResumeBankId && options.filters.resume_bank_id) {
        query.where('candidates.resume_bank_id', options.filters.resume_bank_id);
      }
    }

    if (options?.search) {
      query.andWhere((q) => {
        q.where('candidates.first_name', 'like', `%${options.search}%`)
         .orWhere('candidates.last_name', 'like', `%${options.search}%`)
         .orWhere('candidates.email', 'like', `%${options.search}%`)
         .orWhere('candidates.phone', 'like', `%${options.search}%`);
      });
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countQuery = query.clone().clearSelect().count('candidates.id as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    query.orderBy('candidates.created_at', 'desc').limit(pageSize).offset(offset);
    const items = await query;

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
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
