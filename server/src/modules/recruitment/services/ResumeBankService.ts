import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { ResumeBankRepository } from '../repositories/ResumeBankRepository';
import { ResumeUploadLogRepository } from '../repositories/ResumeUploadLogRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import type { CreateResumeBankEntryInput } from '../types/mrf';

export class ResumeBankService {
  private resumeRepo: ResumeBankRepository;
  private uploadLogRepo: ResumeUploadLogRepository;
  private candidateRepo: CandidateRepository;

  constructor() {
    this.resumeRepo = new ResumeBankRepository();
    this.uploadLogRepo = new ResumeUploadLogRepository();
    this.candidateRepo = new CandidateRepository();
  }

  /**
   * Add a single resume bank entry (and create/link candidate)
   */
  async addEntry(ctx: TenantContext, input: CreateResumeBankEntryInput) {
    // Parse name into first/last
    const nameParts = input.name.trim().split(' ');
    const firstName = nameParts[0] || input.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create candidate record
    const candidate = await this.candidateRepo.create(ctx, {
      first_name: firstName,
      last_name: lastName,
      email: input.email,
      phone: input.contact || null,
      dob: input.dob || null,
      gender: input.gender || null,
      marital_status: input.maritalStatus || null,
      current_company: input.company || null,
      qualification: input.qualification || null,
      university: input.university || null,
      years_of_experience: input.totalExp ? parseFloat(input.totalExp) : null,
      source: input.source || 'direct_apply',
      address_line1: input.addressLine1 || null,
      address_line2: input.addressLine2 || null,
      country: input.country || null,
      zipcode: input.zipcode || null,
      state: input.state || null,
      city: input.city || null,
      skills: input.skills || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Generate tracker ID and create resume bank entry
    const trackerId = await this.resumeRepo.getNextTrackerId(ctx);

    const entry = await this.resumeRepo.create(ctx, {
      tracker_id: trackerId,
      candidate_id: candidate.id,
      job_id: input.jobId || null,
      mrf_request_id: input.mrfRequestId || null,
      source: input.source || 'Direct',
      position: input.position || null,
      status: 'Applied',
      uploaded_by: ctx.userId,
    } as any);

    // Link resume_bank_id on candidate if schema supports it
    const { getKnex: getKnexDb } = await import('../../../db/knex');
    const knexDb = getKnexDb();
    const hasResumeBankCol = await knexDb.schema.hasColumn('candidates', 'resume_bank_id');
    if (hasResumeBankCol) {
      await knexDb('candidates').where('id', candidate.id).update({
        resume_bank_id: entry.id,
      });
    }

    return { ...entry, candidate };
  }

  /**
   * Shortlist a resume bank entry to Candidate Pipeline (Applications table)
   */
  async shortlistToPipeline(
    ctx: TenantContext,
    resumeBankId: number,
    input: { jobId?: number; pipelineStageId?: number }
  ) {
    const resumeEntry = await this.resumeRepo.getById(ctx, resumeBankId);
    if (!resumeEntry) {
      throw new Error('Resume bank record not found');
    }

    const targetJobId = input.jobId || resumeEntry.job_id;
    if (!targetJobId) {
      throw new Error('A valid job opening must be selected to shortlist this resume to the pipeline');
    }

    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();

    // Verify job exists
    const job = await db('jobs').where({ id: targetJobId, organization_id: ctx.organizationId }).first();
    if (!job) {
      throw new Error('Selected job opening not found');
    }

    // Ensure candidate exists
    let candidateId = resumeEntry.candidate_id;
    if (!candidateId) {
      const now = new Date();
      const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const candidateInsertData: any = {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        first_name: 'Candidate',
        last_name: resumeEntry.tracker_id,
        email: `candidate_${resumeEntry.tracker_id.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        source: resumeEntry.source || 'Resume Bank',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: mysqlNow,
        updated_at: mysqlNow,
      };

      const hasResumeBankId = await db.schema.hasColumn('candidates', 'resume_bank_id');
      if (hasResumeBankId) {
        candidateInsertData.resume_bank_id = resumeBankId;
      }

      const [newCandidateId] = await db('candidates').insert(candidateInsertData);
      candidateId = newCandidateId;
      await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
    } else {
      // If candidate already exists, only set resume_bank_id if currently NULL to preserve original source
      const hasResumeBankId = await db.schema.hasColumn('candidates', 'resume_bank_id');
      if (hasResumeBankId) {
        const existingCandidate = await db('candidates').where('id', candidateId).first();
        if (existingCandidate && !existingCandidate.resume_bank_id) {
          await db('candidates').where('id', candidateId).update({
            resume_bank_id: resumeBankId,
            source: existingCandidate.source || resumeEntry.source || 'Resume Bank',
          });
        }
      }
    }

    // Determine pipeline stage
    let stageId = input.pipelineStageId;
    if (!stageId) {
      const firstStage = await db('pipeline_stages')
        .where({ organization_id: ctx.organizationId })
        .whereNull('deleted_at')
        .orderBy('stage_order', 'asc')
        .first();
      stageId = firstStage?.id || null;
    }

    // Execute within database transaction
    return await db.transaction(async (trx) => {
      const now = new Date();
      const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Check existing application
      let application = await trx('applications')
        .where({
          organization_id: ctx.organizationId,
          candidate_id: candidateId,
          job_id: targetJobId,
        })
        .first();

      if (!application) {
        const [appId] = await trx('applications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          candidate_id: candidateId,
          job_id: targetJobId,
          mrf_request_id: resumeEntry.mrf_request_id || job.mrf_request_id || null,
          application_status: 'applied',
          pipeline_stage_id: input.pipelineStageId || null,
          applied_from_source: resumeEntry.source || 'Resume Bank',
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: mysqlNow,
          updated_at: mysqlNow,
        });

        application = await trx('applications').where('id', appId).first();
      }

      // Delegate status and stage synchronization to centralized StatusSyncService
      const { statusSyncService } = await import('./StatusSyncService');
      const syncResult = await statusSyncService.syncApplicationStatus(
        ctx,
        application.id,
        'screening',
        {
          stageId: input.pipelineStageId,
          notes: `Shortlisted from Resume Bank (${resumeEntry.tracker_id})`,
          trx,
        }
      );

      // Update resume_bank status to 'Screening' and ensure job_id is linked
      await trx('resume_bank')
        .where('id', resumeBankId)
        .update({
          job_id: targetJobId,
          mrf_request_id: resumeEntry.mrf_request_id || job.mrf_request_id || null,
          status: 'Screening',
          updated_at: mysqlNow,
        });

      return syncResult.application;
    });
  }

  /**
   * List resume bank entries with filters
   */
  async listEntries(
    ctx: TenantContext,
    options: ListQueryOptions & {
      trackerId?: string;
      source?: string;
      position?: string;
      status?: string;
      mrfRequestId?: number | string;
    } = {}
  ) {
    const filters: Record<string, unknown> = {
      ...(options.filters || {})
    };

    if (options.source && options.source !== 'all') filters.source = options.source;
    if (options.position && options.position !== 'all') filters.position = options.position;
    if (options.status && options.status !== 'all') filters.status = options.status;
    if (options.mrfRequestId) filters.mrf_request_id = options.mrfRequestId;

    let search = options.search;
    if (options.trackerId) search = options.trackerId;

    const resumeResult = await this.resumeRepo.list(ctx, {
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy || 'created_at',
      sortOrder: options.sortOrder || 'desc',
      search,
      filters,
    });

    const mrfId = filters.mrf_request_id || filters.mrfRequestId;
    if (mrfId) {
      try {
        const db = this.resumeRepo.db;
        const appRows = await db('applications')
          .where('applications.organization_id', ctx.organizationId)
          .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
          .leftJoin('jobs', 'applications.job_id', 'jobs.id')
          .where('jobs.mrf_request_id', mrfId)
          .select([
            'applications.id as id',
            db.raw("TRIM(CONCAT(COALESCE(candidates.first_name, ''), ' ', COALESCE(candidates.last_name, ''))) as candidate_name"),
            'candidates.email as candidate_email',
            'candidates.phone as candidate_phone',
            'applications.created_at as created_at',
            'applications.application_status as status',
            'jobs.job_title as position'
          ]);

        const combined = [...(resumeResult.items || [])];
        const existingEmails = new Set(combined.map((c: any) => (c.candidate_email || c.email || '').toLowerCase()).filter(Boolean));

        for (const app of appRows) {
          const emailKey = (app.candidate_email || '').toLowerCase();
          if (!emailKey || !existingEmails.has(emailKey)) {
            combined.push(app);
            if (emailKey) existingEmails.add(emailKey);
          }
        }

        return {
          items: combined,
          meta: {
            page: 1,
            pageSize: Math.max(1, combined.length),
            total: combined.length,
            hasMore: false,
            totalPages: 1
          }
        };
      } catch (err) {
        console.error('Error fetching applications for MRF:', err);
      }
    }

    return resumeResult;
  }

  /**
   * Log a bulk upload operation
   */
  async createUploadLog(
    ctx: TenantContext,
    fileName: string,
    totalRecords: number
  ) {
    return this.uploadLogRepo.create(ctx, {
      uploaded_by: ctx.userId,
      file_name: fileName,
      total_records: totalRecords,
      success_count: 0,
      failed_count: 0,
      status: 'Processing',
    } as any);
  }

  /**
   * Update upload log after processing
   */
  async updateUploadLog(
    ctx: TenantContext,
    logId: number,
    successCount: number,
    failedCount: number,
    errorLog?: any
  ) {
    return this.uploadLogRepo.update(ctx, logId, {
      success_count: successCount,
      failed_count: failedCount,
      status: failedCount > 0 && successCount === 0 ? 'Failed' : 'Completed',
      error_log_json: errorLog ? JSON.stringify(errorLog) : null,
    } as any);
  }

  /**
   * Get upload logs
   */
  async getUploadLogs(ctx: TenantContext, options?: ListQueryOptions) {
    return this.uploadLogRepo.list(ctx, {
      ...options,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  /**
   * Export filtered results as CSV string
   */
  async exportCsv(ctx: TenantContext, options?: ListQueryOptions): Promise<string> {
    const result = await this.resumeRepo.list(ctx, {
      ...options,
      pageSize: 10000, // Export all
    });

    const headers = ['Tracker ID', 'Source', 'Position', 'Status', 'Created At'];
    const rows = result.items.map((item: any) =>
      `"${item.trackerId || item.tracker_id}","${item.source || ''}","${item.position || ''}","${item.status || ''}","${item.createdAt || item.created_at}"`
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
