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

  private saveBase64Resume(dataUrl: string | null | undefined, prefix: string): string | null {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    if (!dataUrl.startsWith('data:')) return dataUrl.length > 500 ? dataUrl.slice(0, 500) : dataUrl;

    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads/resumes');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const matches = dataUrl.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return dataUrl.slice(0, 500);

      const mimeType = matches[1];
      let ext = 'pdf';
      if (mimeType.includes('wordprocessingml.document')) ext = 'docx';
      else if (mimeType.includes('msword')) ext = 'doc';
      else if (mimeType.includes('jpeg')) ext = 'jpg';
      else if (mimeType.includes('png')) ext = 'png';

      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `${prefix.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.floor(100 + Math.random() * 900)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);
      return `/uploads/resumes/${filename}`;
    } catch (err) {
      console.error(`Failed to save base64 resume (${prefix}):`, err);
      return null;
    }
  }

  /**
   * Add a single resume bank entry (and create/link candidate)
   */
  async addEntry(ctx: TenantContext, input: CreateResumeBankEntryInput) {
    const { getKnex: getKnexDb } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const knexDb = getKnexDb();

    // Parse name into first/last
    const nameParts = input.name.trim().split(' ');
    const firstName = nameParts[0] || input.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Handle resume_url disk writing if base64 data URI was passed
    let resumeUrl = (input as any).resumeUrl || null;
    if (resumeUrl && resumeUrl.startsWith('data:')) {
      resumeUrl = this.saveBase64Resume(resumeUrl, firstName.toLowerCase());
    }

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Ensure candidate table columns are altered to TEXT for safety
    await knexDb.raw('ALTER TABLE candidates MODIFY COLUMN resume_url TEXT NULL').catch(() => {});
    await knexDb.raw('ALTER TABLE candidates MODIFY COLUMN ai_summary LONGTEXT NULL').catch(() => {});
    await knexDb.raw('ALTER TABLE candidates MODIFY COLUMN source VARCHAR(255) NULL').catch(() => {});

    // Check if candidate already exists in organization
    const cleanEmail = (input.email || '').toLowerCase().trim();
    let candidate = await knexDb('candidates')
      .where({ organization_id: ctx.organizationId, email: cleanEmail })
      .first();

    const candidateData: any = {
      first_name: firstName,
      last_name: lastName,
      email: cleanEmail,
      phone: input.contact || null,
      dob: input.dob || null,
      gender: input.gender || null,
      marital_status: input.maritalStatus || null,
      current_company: input.company || null,
      qualification: input.qualification || null,
      university: input.university || null,
      years_of_experience: input.totalExp ? parseFloat(input.totalExp) : null,
      source: input.source || 'Resume Upload',
      address_line1: input.addressLine1 || null,
      address_line2: input.addressLine2 || null,
      country: input.country || null,
      zipcode: input.zipcode || null,
      state: input.state || null,
      city: input.city || null,
      skills: input.skills || null,
      resume_url: resumeUrl,
      ai_summary: (input as any).rawText ? (input as any).rawText.substring(0, 3000) : null,
      updated_by: ctx.userId,
      updated_at: mysqlNow,
    };

    if (candidate) {
      // Update existing candidate profile
      await knexDb('candidates').where({ id: candidate.id }).update(candidateData);
      candidate = await knexDb('candidates').where({ id: candidate.id }).first();
    } else {
      // Create new candidate
      candidateData.uuid = uuidv4();
      candidateData.organization_id = ctx.organizationId;
      candidateData.created_by = ctx.userId;
      candidateData.created_at = mysqlNow;
      const [newId] = await knexDb('candidates').insert(candidateData);
      candidate = await knexDb('candidates').where({ id: newId }).first();
    }

    // Check if resume_bank entry already exists for this candidate
    let entry = await knexDb('resume_bank')
      .where({ organization_id: ctx.organizationId, candidate_id: candidate.id })
      .first();

    if (entry) {
      await knexDb('resume_bank').where({ id: entry.id }).update({
        job_id: input.jobId || entry.job_id || null,
        mrf_request_id: input.mrfRequestId || entry.mrf_request_id || null,
        source: input.source || entry.source || 'Direct',
        position: input.position || entry.position || null,
        status: entry.status || 'Applied',
        uploaded_by: ctx.userId || entry.uploaded_by,
        updated_at: mysqlNow,
      });
      entry = await knexDb('resume_bank').where({ id: entry.id }).first();
    } else {
      const trackerId = await this.resumeRepo.getNextTrackerId(ctx);
      const [newEntryId] = await knexDb('resume_bank').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        tracker_id: trackerId,
        candidate_id: candidate.id,
        job_id: input.jobId || null,
        mrf_request_id: input.mrfRequestId || null,
        source: input.source || 'Direct',
        position: input.position || null,
        status: 'Applied',
        uploaded_by: ctx.userId,
        created_at: mysqlNow,
        updated_at: mysqlNow,
      });
      entry = await knexDb('resume_bank').where({ id: newEntryId }).first();
    }

    // Link resume_bank_id on candidate if schema supports it
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

    // 1. Try to resolve candidate by candidate_id on resume_bank
    if (candidateId) {
      const cand = await db('candidates').where({ id: candidateId, organization_id: ctx.organizationId }).first();
      if (!cand) candidateId = null;
    }

    // 2. Try to resolve candidate by resume_bank_id on candidates table
    if (!candidateId) {
      const hasResumeBankId = await db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
      if (hasResumeBankId) {
        const linkedCandidate = await db('candidates')
          .where({ organization_id: ctx.organizationId, resume_bank_id: resumeBankId })
          .first();

        if (linkedCandidate) {
          candidateId = linkedCandidate.id;
          await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
        }
      }
    }

    // 3. Try to resolve candidate by uuid
    if (!candidateId && resumeEntry.uuid) {
      const linkedCandidateByUuid = await db('candidates')
        .where({ organization_id: ctx.organizationId, uuid: resumeEntry.uuid })
        .first();

      if (linkedCandidateByUuid) {
        candidateId = linkedCandidateByUuid.id;
        await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
      }
    }

    // 4. Try to resolve candidate by phone / email
    if (!candidateId) {
      const searchEmail = resumeEntry.candidate_email || resumeEntry.email;
      const searchPhone = resumeEntry.candidate_phone || resumeEntry.phone;
      
      if (searchEmail || searchPhone) {
        let candidateQuery = db('candidates').where('organization_id', ctx.organizationId);
        if (searchEmail && searchPhone) {
          candidateQuery = candidateQuery.where(function() {
            this.where('email', searchEmail).orWhere('phone', searchPhone);
          });
        } else if (searchEmail) {
          candidateQuery = candidateQuery.where('email', searchEmail);
        } else {
          candidateQuery = candidateQuery.where('phone', searchPhone);
        }

        const matchByContact = await candidateQuery.first().catch(() => null);
        if (matchByContact) {
          candidateId = matchByContact.id;
          await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
        }
      }
    }

    // 5. If no candidate match by contact/link, resolve to existing organization candidate or create
    if (!candidateId) {
      const realCandidate = await db('candidates')
        .where('organization_id', ctx.organizationId)
        .whereNot('first_name', 'Applicant')
        .whereNot('first_name', 'Candidate')
        .whereNot('email', 'like', 'candidate_trk%')
        .orderBy('id', 'desc')
        .first();

      if (realCandidate) {
        candidateId = realCandidate.id;
        await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
      } else {
        const now = new Date();
        const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const trackerIdTag = String(resumeEntry.tracker_id || `TRK-${resumeBankId}`);

        await db.raw("ALTER TABLE candidates MODIFY COLUMN source VARCHAR(255) NULL").catch(() => {});
        const rawSource = String(resumeEntry.source || 'direct_apply').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15);
        const candidateEmail = resumeEntry.candidate_email || resumeEntry.email || `candidate_${trackerIdTag.toLowerCase().replace(/[^a-z0-9]/g, '')}_${resumeBankId}@example.com`;

        const candidateInsertData: any = {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          first_name: resumeEntry.first_name || 'Candidate',
          last_name: resumeEntry.last_name || trackerIdTag,
          email: candidateEmail,
          phone: resumeEntry.phone || null,
          source: rawSource,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: mysqlNow,
          updated_at: mysqlNow,
        };

        const hasResumeBankId = await db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
        if (hasResumeBankId) {
          candidateInsertData.resume_bank_id = resumeBankId;
        }

        const [newCandidateId] = await db('candidates').insert(candidateInsertData);
        candidateId = newCandidateId;
        await db('resume_bank').where('id', resumeBankId).update({ candidate_id: candidateId });
      }
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
      const hasStageOrder = await db.schema.hasColumn('pipeline_stages', 'stage_order').catch(() => false);
      const hasSeqOrder = await db.schema.hasColumn('pipeline_stages', 'sequence_order').catch(() => false);
      let stagesQuery = db('pipeline_stages').where({ organization_id: ctx.organizationId }).whereNull('deleted_at');
      if (hasStageOrder) {
        stagesQuery = stagesQuery.orderBy('stage_order', 'asc');
      } else if (hasSeqOrder) {
        stagesQuery = stagesQuery.orderBy('sequence_order', 'asc');
      } else {
        stagesQuery = stagesQuery.orderBy('id', 'asc');
      }
      const firstStage = await stagesQuery.first();
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
          notes: `Shortlisted from Resume Bank (${resumeEntry.tracker_id || 'TRK-' + resumeBankId})`,
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

    // ──────── AUTO-BACKFILL / AUTO-SYNC UNLINKED CANDIDATES ────────
    // Ensures any candidates created previously or via other routes automatically get
    // indexed into resume_bank with a valid Tracker ID so they appear in Resume Source Screen Bank.
    try {
      const db = this.resumeRepo.db;
      // Delete dummy rows (Applicant TRK-34 / candidate_trk%)
      await db('candidates')
        .where('organization_id', ctx.organizationId)
        .where(function() {
          this.where('first_name', 'Applicant')
            .orWhere('first_name', 'Candidate')
            .orWhere('email', 'like', 'candidate_trk%');
        })
        .delete()
        .catch(() => {});

      await db('resume_bank')
        .where('organization_id', ctx.organizationId)
        .where(function() {
          this.whereNull('candidate_id')
            .orWhereIn('candidate_id', function() {
              this.select('id').from('candidates').where('first_name', 'Applicant').orWhere('first_name', 'Candidate');
            });
        })
        .delete()
        .catch(() => {});

      // Auto-link resume_bank entries to candidates by resume_bank_id or email match
      const hasResumeBankIdCol = await db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
      if (hasResumeBankIdCol) {
        await db.raw(`
          UPDATE resume_bank rb
          INNER JOIN candidates c ON (c.resume_bank_id = rb.id OR c.email = rb.candidate_email) AND c.organization_id = rb.organization_id
          SET rb.candidate_id = c.id
          WHERE rb.candidate_id IS NULL;
        `).catch(() => {});
      }
    } catch (autoSyncErr: any) {
      console.error('[ResumeBank AutoSync] Linking check completed:', autoSyncErr.message);
    }

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

        for (const app of (appRows as any[])) {
          const emailKey = ((app as any).candidate_email || '').toLowerCase();
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
    totalRecords: number,
    targetJobId?: number | null
  ) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const hasJobIdCol = await db.schema.hasColumn('resume_upload_logs', 'target_job_id').catch(() => false);

    const data: any = {
      uploaded_by: ctx.userId,
      file_name: fileName,
      total_records: totalRecords,
      success_count: 0,
      failed_count: 0,
      status: 'Processing',
    };

    if (hasJobIdCol && targetJobId) {
      data.target_job_id = targetJobId;
    }

    return this.uploadLogRepo.create(ctx, data);
  }

  /**
   * Update upload log after processing with AI screening metrics
   */
  async updateUploadLog(
    ctx: TenantContext,
    logId: number,
    successCount: number,
    failedCount: number,
    errorLog?: any,
    aiStats?: { atsPassedCount?: number; jdMatchPassedCount?: number; aiShortlistedCount?: number }
  ) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const hasAtsCol = await db.schema.hasColumn('resume_upload_logs', 'ats_passed_count').catch(() => false);

    const updateData: any = {
      success_count: successCount,
      failed_count: failedCount,
      status: failedCount > 0 && successCount === 0 ? 'Failed' : 'Completed',
      error_log_json: errorLog ? JSON.stringify(errorLog) : null,
    };

    if (hasAtsCol && aiStats) {
      updateData.ats_passed_count = aiStats.atsPassedCount || 0;
      updateData.jd_match_passed_count = aiStats.jdMatchPassedCount || 0;
      updateData.ai_shortlisted_count = aiStats.aiShortlistedCount || 0;
    }

    return this.uploadLogRepo.update(ctx, logId, updateData);
  }

  /**
   * Get upload logs with target job information
   */
  async getUploadLogs(ctx: TenantContext, options?: ListQueryOptions) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const hasJobIdCol = await db.schema.hasColumn('resume_upload_logs', 'target_job_id').catch(() => false);

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let query = db('resume_upload_logs')
      .where('resume_upload_logs.organization_id', ctx.organizationId)
      .leftJoin('users', 'resume_upload_logs.uploaded_by', 'users.id');

    const selectFields: any[] = [
      'resume_upload_logs.*',
      db.raw("COALESCE(NULLIF(TRIM(CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))), ''), users.email, 'HR Admin') as uploaded_by_name")
    ];

    if (hasJobIdCol) {
      query = query.leftJoin('jobs', 'resume_upload_logs.target_job_id', 'jobs.id');
      selectFields.push('jobs.job_title as target_job_title');
      selectFields.push('jobs.job_code as target_job_code');
    }

    const countQuery = query.clone().clearSelect().count('resume_upload_logs.id as count').first();
    const countResult = await countQuery;
    const total = parseInt((countResult as any)?.count as string, 10) || 0;

    query = query.select(selectFields).orderBy('resume_upload_logs.created_at', 'desc').limit(pageSize).offset(offset);
    const items = await query;

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        hasMore: offset + items.length < total,
        totalPages: Math.ceil(total / pageSize) || 1,
      }
    };
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
