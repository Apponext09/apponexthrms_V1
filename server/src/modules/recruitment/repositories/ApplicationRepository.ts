import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Application {
  id: number;
  uuid: string;
  organization_id: number;
  candidate_id: number;
  job_id: number;
  job_posting_id?: number;
  candidateId?: number;
  jobId?: number;
  application_status: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  applicationStatus?: string;
  applied_at: string;
  applied_from_source: string;
  initial_screening_status: 'pending' | 'passed' | 'failed';
  screening_completed_by: number | null;
  screening_completed_at: string | null;
  pipeline_stage_id: number | null;
  current_stage_entered_at: string | null;
  assigned_recruiter_id: number | null;
  rejection_reason: string | null;
  rejected_at_stage: string | null;
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

  override async list(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    const hasEmployeesTable = await this.db.schema.hasTable('employees').catch(() => false);
    const hasOfficialEmail = hasEmployeesTable ? await this.db.schema.hasColumn('employees', 'official_email').catch(() => false) : false;
    const hasCandidateStatus = await this.db.schema.hasColumn('candidates', 'status').catch(() => false);

    const query = this.db(this.tableName)
      .where('applications.organization_id', ctx.organizationId)
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .leftJoin('mrf_requests', 'jobs.mrf_request_id', 'mrf_requests.id')
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .leftJoin('resume_ats_scores', function() {
        this.on('resume_ats_scores.candidate_id', '=', 'applications.candidate_id')
            .andOn('resume_ats_scores.job_id', '=', 'applications.job_id');
      })
      .leftJoin('candidate_job_matches', function() {
        this.on('candidate_job_matches.candidate_id', '=', 'applications.candidate_id')
            .andOn('candidate_job_matches.job_id', '=', 'applications.job_id');
      })
      .leftJoin('resume_bank', 'applications.candidate_id', 'resume_bank.candidate_id');

    if (hasEmployeesTable) {
      if (hasOfficialEmail) {
        query.leftJoin('employees', function() {
          this.on('candidates.email', '=', 'employees.official_email')
              .orOn('candidates.email', '=', 'employees.personal_email');
        });
      } else {
        query.leftJoin('employees', 'candidates.email', 'employees.email');
      }
    }

    const selectFields: any[] = [
      'applications.*',
      this.db.raw("TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
      'candidates.email as candidate_email',
      'candidates.phone as candidate_phone',
      'candidates.source as candidate_source',
      'candidates.years_of_experience as candidate_experience',
      'candidates.current_company as candidate_company',
      this.db.raw("COALESCE(NULLIF(TRIM(candidates.skills), ''), (SELECT GROUP_CONCAT(skill_name SEPARATOR ', ') FROM candidate_skills WHERE candidate_skills.candidate_id = candidates.id), '-') as candidate_skills"),
      this.db.raw("COALESCE(NULLIF(TRIM(candidates.gender), ''), '-') as gender"),
      this.db.raw("COALESCE(NULLIF(TRIM(candidates.marital_status), ''), '-') as marital_status"),
      this.db.raw("COALESCE(NULLIF(TRIM(candidates.qualification), ''), '-') as qualification"),
      hasCandidateStatus ? 'candidates.status as candidate_status' : 'applications.application_status as candidate_status',
      'jobs.job_title as position_title',
      'jobs.job_code as job_code',
      'departments.name as department_name',
      this.db.raw("MAX(COALESCE(resume_ats_scores.ats_score, candidate_job_matches.overall_score, resume_bank.ats_score, NULL)) as ats_score"),
      this.db.raw("MAX(COALESCE(candidate_job_matches.overall_score, resume_ats_scores.ats_score, resume_bank.ats_score, NULL)) as jd_match_score"),
      hasEmployeesTable ? this.db.raw("MAX(employees.id) as employee_id") : this.db.raw('NULL as employee_id'),
      hasEmployeesTable ? this.db.raw("MAX(employees.employee_code) as employee_code") : this.db.raw('NULL as employee_code')
    ];

    query.select(selectFields).groupBy('applications.id');

    if (options?.filters) {
      if (options.filters.job_id) {
        query.where('applications.job_id', options.filters.job_id);
      }
      if (options.filters.candidate_id) {
        query.where('applications.candidate_id', options.filters.candidate_id);
      }
      if (options.filters.application_status) {
        query.where('applications.application_status', options.filters.application_status);
      }
      if (options.filters.company_id) {
        query.where('mrf_requests.company_id', options.filters.company_id);
      }
      if (options.filters.location_id) {
        query.where('jobs.location_id', options.filters.location_id);
      }
      if (options.filters.department_id) {
        query.where('jobs.department_id', options.filters.department_id);
      }
      if (options.filters.grade_id) {
        query.where('mrf_requests.grade_id', options.filters.grade_id);
      }
      if (options.filters.designation_id) {
        query.where('jobs.designation_id', options.filters.designation_id);
      }
      if (options.filters.type_id) {
        query.where('jobs.employment_type', options.filters.type_id);
      }
    }

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 100;
    const offset = (page - 1) * pageSize;

    // Get total count (clone before adding orderBy/limit/offset)
    const countQuery = query.clone().clearSelect().count('applications.id as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    // Apply sorting
    if (options?.sortBy) {
      // Qualify sortBy with table name to avoid ambiguity
      const sortCol = options.sortBy.includes('.') ? options.sortBy : `applications.${options.sortBy}`;
      query.orderBy(sortCol, options.sortOrder || 'desc');
    } else {
      query.orderBy('applications.created_at', 'desc');
    }

    // Get paginated items
    const items = await query.limit(pageSize).offset(offset);

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

  /**
   * Returns only applications with status = 'hired' or 'offer' whose candidate
   * has NOT yet been converted to an employee (matched by email).
   * Powers the "New Candidate (Hired)" dropdown in offer creation.
   */
  async listHiredNotOnboarded(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 200;
    const offset = (page - 1) * pageSize;

    const hasEmployeesTable = await this.db.schema.hasTable('employees').catch(() => false);
    const hasOfficialEmail = hasEmployeesTable ? await this.db.schema.hasColumn('employees', 'official_email').catch(() => false) : false;
    const hasCandidateStatus = await this.db.schema.hasColumn('candidates', 'status').catch(() => false);

    const query = this.db('applications')
      .where('applications.organization_id', ctx.organizationId)
      .whereIn('applications.application_status', ['hired', 'offer'])
      .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
      .leftJoin('jobs', 'applications.job_id', 'jobs.id')
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .leftJoin('designations', 'jobs.designation_id', 'designations.id');

    // Exclude candidates already converted to employees
    if (hasEmployeesTable) {
      if (hasOfficialEmail) {
        query.leftJoin('employees', function () {
          this.on('candidates.email', '=', 'employees.official_email')
            .orOn('candidates.email', '=', 'employees.personal_email');
        });
      } else {
        query.leftJoin('employees', 'candidates.email', 'employees.email');
      }
      query.whereNull('employees.id');
    }

    query.select([
      'applications.*',
      this.db.raw("TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
      'candidates.email as candidate_email',
      'candidates.phone as candidate_phone',
      'candidates.source as candidate_source',
      'candidates.years_of_experience as candidate_experience',
      'candidates.current_company as candidate_company',
      hasCandidateStatus ? 'candidates.status as candidate_status' : 'applications.application_status as candidate_status',
      'jobs.job_title as position_title',
      'jobs.job_code as job_code',
      'jobs.department_id as department_id',
      'jobs.designation_id as designation_id',
      'departments.name as department_name',
      'designations.name as designation_name',
    ]);

    // Search filter
    if (options?.filters?.search) {
      const q = `%${options.filters.search}%`;
      query.where(function () {
        this.whereRaw("CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, '')) LIKE ?", [q])
          .orWhere('candidates.email', 'like', q)
          .orWhere('jobs.job_title', 'like', q);
      });
    }

    const countResult = await query.clone().clearSelect().count('applications.id as count').first();
    const total = parseInt(String((countResult as any)?.count || 0), 10);

    const items = await query
      .orderBy('applications.updated_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
