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
      const columnsToAdd: { name: string; type: 'string' | 'text' | 'date' | 'bigInteger'; length?: number }[] = [
        { name: 'resume_bank_id', type: 'bigInteger' },
        { name: 'dob', type: 'date' },
        { name: 'date_of_birth', type: 'date' },
        { name: 'gender', type: 'string', length: 30 },
        { name: 'marital_status', type: 'string', length: 30 },
        { name: 'qualification', type: 'string', length: 255 },
        { name: 'skills', type: 'text' },
        { name: 'resume_url', type: 'string', length: 500 },
      ];

      for (const col of columnsToAdd) {
        const hasCol = await this.db.schema.hasColumn('candidates', col.name).catch(() => false);
        if (!hasCol) {
          await this.db.schema.alterTable('candidates', (table) => {
            if (col.type === 'bigInteger') table.bigInteger(col.name).unsigned().nullable();
            else if (col.type === 'date') table.date(col.name).nullable();
            else if (col.type === 'text') table.text(col.name).nullable();
            else table.string(col.name, col.length || 255).nullable();
          }).catch(() => {});
        }
      }
      CandidateRepository.schemaChecked = true;
    } catch (err) {}
  }

  override async update(ctx: TenantContext, id: number | string, data: Partial<Candidate>): Promise<Candidate> {
    await this.ensureColumns();
    return super.update(ctx, id, data);
  }

  override async create(ctx: TenantContext, data: Partial<Candidate>): Promise<Candidate> {
    await this.ensureColumns();
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      status: data.status || 'applied',
      created_by: data.created_by || ctx.userId || 1,
      updated_by: data.updated_by || ctx.userId || 1,
      ...data,
    });
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
      .whereNull('candidates.deleted_at');

    if (ctx.organizationId) {
      query.where((q) => {
        q.where('candidates.organization_id', ctx.organizationId)
         .orWhereNull('candidates.organization_id')
         .orWhere('candidates.organization_id', 1);
      });
    }

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
      .whereNull('candidates.deleted_at');

    if (ctx.organizationId) {
      query.where((q) => {
        q.where('candidates.organization_id', ctx.organizationId)
         .orWhereNull('candidates.organization_id')
         .orWhere('candidates.organization_id', 1);
      });
    }

    const hasApplicationsTable = await this.db.schema.hasTable('applications').catch(() => false);

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

    if (hasApplicationsTable) {
      query.select([
        this.db.raw('(SELECT job_id FROM applications WHERE applications.candidate_id = candidates.id ORDER BY applications.id DESC LIMIT 1) as linked_job_id'),
        this.db.raw('(SELECT GROUP_CONCAT(DISTINCT job_id) FROM applications WHERE applications.candidate_id = candidates.id) as applied_job_ids')
      ]);
    }

    if (options?.filters) {
      if (options.filters.status) {
        const st = String(options.filters.status).toLowerCase();
        if (st.includes('applied')) {
          query.whereRaw("LOWER(candidates.status) IN ('applied', 'new', 'screening')");
        } else if (st.includes('interview')) {
          query.whereRaw("LOWER(candidates.status) IN ('interview', 'interviewing', 'assessment')");
        } else if (st.includes('offer')) {
          query.whereRaw("LOWER(candidates.status) IN ('offer', 'offered', 'hired')");
        } else if (st.includes('reject')) {
          query.whereRaw("LOWER(candidates.status) IN ('rejected', 'dropped', 'withdrawn')");
        } else {
          query.whereRaw('LOWER(candidates.status) = ?', [st]);
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
