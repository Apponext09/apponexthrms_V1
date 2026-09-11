import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ResumeBankEntry {
  id: number;
  uuid: string;
  organization_id: number;
  tracker_id: string;
  candidate_id: number | null;
  job_id: number | null;
  mrf_request_id: number | null;
  source: string | null;
  position: string | null;
  status: 'Applied' | 'Screening' | 'Interview' | 'Offered' | 'Hired' | 'Rejected' | 'On Hold';
  uploaded_by: number | null;
  candidate_email?: string;
  candidate_phone?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  candidate_name?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ResumeBankRepository extends BaseRepository<ResumeBankEntry> {
  private static schemaChecked = false;

  constructor() {
    super('resume_bank');
  }

  private async ensureColumns(): Promise<boolean> {
    if (ResumeBankRepository.schemaChecked) return true;
    try {
      const hasJobId = await this.db.schema.hasColumn(this.tableName, 'job_id');
      if (!hasJobId) {
        await this.db.schema.alterTable(this.tableName, (table) => {
          table.bigInteger('job_id').unsigned().nullable();
          table.bigInteger('mrf_request_id').unsigned().nullable();
        });
      }

      const hasAtsScore = await this.db.schema.hasColumn(this.tableName, 'ats_score');
      if (!hasAtsScore) {
        await this.db.schema.alterTable(this.tableName, (table) => {
          table.integer('ats_score').nullable();
          table.text('matched_skills').nullable();
          table.text('missing_skills').nullable();
          table.text('resume_text').nullable();
          table.string('resume_file_url', 500).nullable();
          table.timestamp('ats_scored_at').nullable();
        });
      }

      const hasCandidates = await this.db.schema.hasTable('candidates');
      if (hasCandidates) {
        const candidateCols = [
          { name: 'dob', type: 'date' },
          { name: 'gender', type: 'string', len: 20 },
          { name: 'marital_status', type: 'string', len: 30 },
          { name: 'current_company', type: 'string', len: 255 },
          { name: 'qualification', type: 'string', len: 255 },
          { name: 'university', type: 'string', len: 255 },
          { name: 'years_of_experience', type: 'decimal' },
          { name: 'skills', type: 'text' },
          { name: 'address_line1', type: 'string', len: 500 },
          { name: 'address_line2', type: 'string', len: 500 },
          { name: 'country', type: 'string', len: 100 },
          { name: 'zipcode', type: 'string', len: 20 },
          { name: 'state', type: 'string', len: 100 },
          { name: 'city', type: 'string', len: 100 },
        ];

        for (const col of candidateCols) {
          const exists = await this.db.schema.hasColumn('candidates', col.name);
          if (!exists) {
            await this.db.schema.alterTable('candidates', (table) => {
              if (col.type === 'date') table.date(col.name).nullable();
              else if (col.type === 'decimal') table.decimal(col.name, 4, 1).nullable();
              else if (col.type === 'text') table.text(col.name).nullable();
              else table.string(col.name, col.len || 255).nullable();
            });
          }
        }
      }

      ResumeBankRepository.schemaChecked = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  override async create(ctx: TenantContext, data: Partial<ResumeBankEntry>): Promise<ResumeBankEntry> {
    await this.ensureColumns();
    const { v4: uuidv4 } = await import('uuid');
    return super.create(ctx, {
      uuid: data.uuid || uuidv4(),
      ...data
    });
  }

  override async list(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    await this.ensureColumns();
    const hasJobId     = await this.db.schema.hasColumn(this.tableName, 'job_id').catch(() => false);
    const hasDob       = await this.db.schema.hasColumn('candidates', 'dob').catch(() => false);
    const hasGender    = await this.db.schema.hasColumn('candidates', 'gender').catch(() => false);
    const hasMarital   = await this.db.schema.hasColumn('candidates', 'marital_status').catch(() => false);
    const hasCompany   = await this.db.schema.hasColumn('candidates', 'current_company').catch(() => false);
    const hasQual      = await this.db.schema.hasColumn('candidates', 'qualification').catch(() => false);
    const hasUniv      = await this.db.schema.hasColumn('candidates', 'university').catch(() => false);
    const hasExp       = await this.db.schema.hasColumn('candidates', 'years_of_experience').catch(() => false);
    const hasSkills    = await this.db.schema.hasColumn('candidates', 'skills').catch(() => false);
    // resume_bank own name columns (may not exist in older schemas)
    const hasRbFirstName    = await this.db.schema.hasColumn(this.tableName, 'first_name').catch(() => false);
    const hasRbLastName     = await this.db.schema.hasColumn(this.tableName, 'last_name').catch(() => false);
    const hasRbCandName     = await this.db.schema.hasColumn(this.tableName, 'candidate_name').catch(() => false);

    const hasAtsTable     = await this.db.schema.hasTable('resume_ats_scores').catch(() => false);
    const hasJdMatchTable = await this.db.schema.hasTable('candidate_job_matches').catch(() => false);

    const query = this.db(this.tableName)
      .where('resume_bank.organization_id', ctx.organizationId)
      .leftJoin('candidates', 'resume_bank.candidate_id', 'candidates.id');

    if (hasAtsTable) {
      query.leftJoin('resume_ats_scores', function() {
        this.on('resume_ats_scores.candidate_id', '=', 'candidates.id');
      });
    }

    if (hasJdMatchTable) {
      query.leftJoin('candidate_job_matches', function() {
        this.on('candidate_job_matches.candidate_id', '=', 'candidates.id');
      });
    }

    const selectFields: any[] = [
      'resume_bank.*',
      // Build candidate_name COALESCE based on which columns actually exist in the DB
      (() => {
        const parts: string[] = [];
        if (hasRbFirstName && hasRbLastName) {
          parts.push(`NULLIF(TRIM(CONCAT(COALESCE(resume_bank.first_name, ''), ' ', COALESCE(resume_bank.last_name, ''))), '')`);
        } else if (hasRbFirstName) {
          parts.push(`NULLIF(TRIM(COALESCE(resume_bank.first_name, '')), '')`);
        }
        if (hasRbCandName) parts.push('resume_bank.candidate_name');
        parts.push(`NULLIF(TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))), '')`);
        parts.push('resume_bank.tracker_id');
        return this.db.raw(`COALESCE(${parts.join(', ')}) as candidate_name`);
      })(),
      'candidates.email as candidate_email',
      'candidates.phone as candidate_phone',
      hasDob ? 'candidates.dob as candidate_dob' : this.db.raw('NULL as candidate_dob'),
      hasGender ? 'candidates.gender as candidate_gender' : this.db.raw('NULL as candidate_gender'),
      hasMarital ? 'candidates.marital_status as candidate_marital_status' : this.db.raw('NULL as candidate_marital_status'),
      hasCompany ? 'candidates.current_company as candidate_company' : this.db.raw('NULL as candidate_company'),
      hasQual ? 'candidates.qualification as candidate_qualification' : this.db.raw('NULL as candidate_qualification'),
      hasUniv ? 'candidates.university as candidate_university' : this.db.raw('NULL as candidate_university'),
      hasExp ? 'candidates.years_of_experience as candidate_experience' : this.db.raw('NULL as candidate_experience'),
      hasSkills ? 'candidates.skills as candidate_skills' : this.db.raw('NULL as candidate_skills'),
      'candidates.resume_url as candidate_resume_url',
      hasAtsTable ? this.db.raw('MAX(resume_ats_scores.ats_score) as ats_score') : this.db.raw('NULL as ats_score'),
      hasJdMatchTable ? this.db.raw('MAX(candidate_job_matches.overall_score) as jd_match_score') : this.db.raw('NULL as jd_match_score'),
    ];

    if (hasJobId) {
      query.leftJoin('jobs', 'resume_bank.job_id', 'jobs.id');
      selectFields.push(this.db.raw("MAX(CAST(CASE WHEN jobs.job_title IS NOT NULL AND jobs.job_title != '' AND jobs.job_title != 'Job Position' THEN jobs.job_title WHEN resume_bank.position IS NOT NULL AND resume_bank.position != '' THEN resume_bank.position ELSE 'SOFTWARE DEVELOPER' END AS CHAR)) as job_title"));
      selectFields.push(this.db.raw("MAX(CAST(jobs.job_code AS CHAR)) as job_code"));
    }

    const hasEmployeesTable = await this.db.schema.hasTable('employees').catch(() => false);
    if (hasEmployeesTable) {
      // Exclude active on-role working employees from Resume Bank UNLESS they applied for an Internal Job Posting (IJP)
      const knexDb = this.db;
      query.andWhere(function() {
        this.where(function() {
          // Check that candidate does not match any active employee by email
          this.whereNotIn(knexDb.raw('LOWER(TRIM(COALESCE(candidates.email, "")))'), function() {
            this.select(knexDb.raw('LOWER(TRIM(email))')).from('employees')
              .whereNull('deleted_at')
              .whereNotNull('email')
              .whereRaw('TRIM(email) != ""');
          })
          // Also candidate phone does not match employee phone/mobile
          .andWhere(function() {
            this.whereNull('candidates.phone')
              .orWhere('candidates.phone', '=', '')
              .orWhereNotIn(knexDb.raw("RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(candidates.phone, ''), '+', ''), '-', ''), ' ', ''), 10)"), function() {
                this.select(knexDb.raw("RIGHT(REPLACE(REPLACE(REPLACE(COALESCE(phone, mobile, ''), '+', ''), '-', ''), ' ', ''), 10)")).from('employees')
                  .whereNull('deleted_at')
                  .whereRaw("COALESCE(phone, mobile, '') != ''");
              });
          })
          // Also full name does not match employee full name
          .andWhere(function() {
            this.whereNotIn(knexDb.raw("LOWER(TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))))"), function() {
              this.select(knexDb.raw("LOWER(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))))")).from('employees')
                .whereNull('deleted_at')
                .whereRaw("CONCAT(COALESCE(first_name, ''), COALESCE(last_name, '')) != ''");
            });
          });
        })
        // OR: Candidate is an employee whose IJP application has been APPROVED / ENDORSED by their Manager
        .orWhereIn('candidates.id', function() {
          this.select('applications.candidate_id').from('applications')
            .leftJoin('workflow_approvals', function() {
              this.on('workflow_approvals.reference_id', '=', 'applications.id')
                .andOn('workflow_approvals.module_type', '=', knexDb.raw("'IJP'"));
            })
            .where(function() {
              this.where('workflow_approvals.status', '=', 'Approved')
                .orWhere(function() {
                  this.whereNull('workflow_approvals.id')
                    .andWhere('applications.application_status', 'in', ['screening', 'interview', 'approved']);
                });
            })
            .where(function() {
              this.where('applications.applied_from_source', 'like', '%internal%')
                .orWhere('applications.applied_from_source', 'like', '%ijp%');
            });
        });
      });
    }

    query.select(selectFields).groupBy('resume_bank.id');

    if (options?.filters) {
      if (options.filters.mrf_request_id || options.filters.mrfRequestId) {
        const mrfId = options.filters.mrf_request_id || options.filters.mrfRequestId;
        const mrfRow = await this.db('mrf_requests').where('id', mrfId).first();
        const posTitle = mrfRow?.position_title || (mrfRow as any)?.positionTitle;

        query.andWhere((q) => {
          q.where('resume_bank.mrf_request_id', mrfId);
          if (hasJobId) {
            q.orWhereIn('resume_bank.job_id', function() {
              this.select('id').from('jobs').where('mrf_request_id', mrfId);
            });
          }
          if (posTitle) {
            q.orWhere('resume_bank.position', 'like', `%${posTitle}%`);
          }
        });
      }
      if (hasJobId && options.filters.job_id) {
        query.where('resume_bank.job_id', options.filters.job_id);
      }
      if (options.filters.source) {
        const s = options.filters.source;
        query.andWhere((q) => {
          q.where('resume_bank.source', 'like', `%${s}%`)
            .orWhere('candidates.source', 'like', `%${s}%`);
        });
      }
      if (options.filters.position) {
        const p = options.filters.position;
        query.andWhere((q) => {
          q.where('resume_bank.position', 'like', `%${p}%`);
          if (hasJobId) {
            q.orWhere('jobs.job_title', 'like', `%${p}%`);
          }
        });
      }
      if (options.filters.status) {
        query.andWhere('resume_bank.status', 'like', `%${options.filters.status}%`);
      }
      if (options.filters.qualification) {
        query.where('candidates.qualification', 'like', `%${options.filters.qualification}%`);
      }
      if (options.filters.skills) {
        query.where('candidates.skills', 'like', `%${options.filters.skills}%`);
      }
    }

    if (options?.search) {
      query.andWhere((q) => {
        q.where('resume_bank.tracker_id', 'like', `%${options.search}%`)
         .orWhere('candidates.first_name', 'like', `%${options.search}%`)
         .orWhere('candidates.last_name', 'like', `%${options.search}%`)
         .orWhere('candidates.email', 'like', `%${options.search}%`)
         .orWhere('candidates.phone', 'like', `%${options.search}%`);
      });
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const countQuery = query.clone().clearSelect().count('resume_bank.id as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    query.orderBy('resume_bank.created_at', 'desc').limit(pageSize).offset(offset);
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

  async getByTrackerId(ctx: TenantContext, trackerId: string): Promise<ResumeBankEntry | null> {
    return this.query(ctx).where('tracker_id', trackerId).first();
  }

  async getNextTrackerId(ctx: TenantContext): Promise<string> {
    const rows: any[] = await this.query(ctx).select('tracker_id');
    let maxNum = 0;
    for (const r of rows) {
      const tid = r.trackerId || r.tracker_id || '';
      const num = parseInt(tid.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    return `TRK-${String(maxNum + 1).padStart(3, '0')}`;
  }

  async getBySource(ctx: TenantContext, source: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { source },
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }
}
