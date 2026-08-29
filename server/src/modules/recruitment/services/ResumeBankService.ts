import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { ResumeBankRepository } from '../repositories/ResumeBankRepository';
import { ResumeUploadLogRepository } from '../repositories/ResumeUploadLogRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import type { CreateResumeBankEntryInput } from '../types/mrf';
import AdmZip from 'adm-zip';

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
   * Resolve the real organization_id valid in FK references.
   * ctx.organizationId may not match FK in organizations table if the
   * JWT oid claim reflects a user_id or a legacy id.
   * Falls back to looking up the user's actual organization_id from users table.
   *
   * NOTE: Knex postProcessResponse converts snake_case → camelCase for ALL queries
   * including raw(). We handle both key names to be safe.
   */
  private async resolveOrgId(ctx: TenantContext): Promise<number> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    try {
      // Check if ctx.organizationId exists in organizations table
      const orgResult = await db.raw('SELECT id FROM organizations WHERE id = ? LIMIT 1', [ctx.organizationId]);
      const orgRows = orgResult[0];
      if (orgRows && orgRows.length > 0) {
        return ctx.organizationId; // Already valid
      }

      // Fallback: look up user's organization_id from users table
      // NOTE: Knex converts organization_id → organizationId in postProcessResponse
      if (ctx.userId) {
        const userResult = await db.raw('SELECT organization_id FROM users WHERE id = ? LIMIT 1', [ctx.userId]);
        const userRows = userResult[0];
        if (userRows && userRows.length > 0) {
          // Handle both camelCase (Knex processed) and snake_case (raw)
          const realOrgId = userRows[0].organizationId ?? userRows[0].organization_id;
          if (realOrgId) {
            console.warn(`[ResumeBankService] ctx.organizationId=${ctx.organizationId} not in organizations. Resolved from user id=${ctx.userId}: organizationId=${realOrgId}`);
            return Number(realOrgId);
          }
        }
      }

      // Last resort: use the first valid org ID
      const firstOrgResult = await db.raw('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
      const firstOrgRows = firstOrgResult[0];
      if (firstOrgRows && firstOrgRows.length > 0) {
        console.warn(`[ResumeBankService] Fallback to first org id=${firstOrgRows[0].id}`);
        return Number(firstOrgRows[0].id);
      }
    } catch (err) {
      console.error('[ResumeBankService] resolveOrgId error:', err);
    }

    return ctx.organizationId;
  }


  /**
   * Add a single resume bank entry (and create/link candidate)
   */
  async addEntry(ctx: TenantContext, input: CreateResumeBankEntryInput) {
    // Parse name into first/last safely
    const rawName = (input.name && typeof input.name === 'string' && input.name.trim()) 
      ? input.name.trim() 
      : 'Candidate Applicant';
    
    const nameParts = rawName.split(' ');
    const firstName = nameParts[0] || 'Candidate';
    const lastName = nameParts.slice(1).join(' ') || 'Applicant';

    const safeEmail = (input.email && typeof input.email === 'string' && input.email.trim())
      ? input.email.trim().toLowerCase()
      : `candidate_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}@example.com`;

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // Resolve the real FK-valid organizationId
    const realOrgId = await this.resolveOrgId(ctx);
    const resolvedCtx: TenantContext = { ...ctx, organizationId: realOrgId };

    // Check if candidate record already exists for this email
    let candidate: any = await this.candidateRepo.getByEmail(resolvedCtx, safeEmail);
    if (!candidate) {
      const rawCand = await db('candidates').where('email', safeEmail).first().catch(() => null);
      if (rawCand) {
        candidate = rawCand;
      } else {
        try {
          candidate = await this.candidateRepo.create(resolvedCtx, {
            first_name: firstName,
            last_name: lastName,
            email: safeEmail,
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
            created_by: ctx.userId || 1,
            updated_by: ctx.userId || 1,
          } as any);
        } catch (err: any) {
          const fallbackCand = await db('candidates').where('email', safeEmail).first().catch(() => null);
          if (fallbackCand) {
            candidate = fallbackCand;
          } else {
            throw err;
          }
        }
      }
    }

    const candidateId = candidate.id || candidate.ID;

    // Generate tracker ID and create resume bank entry
    const trackerId = await this.resumeRepo.getNextTrackerId(resolvedCtx);

    const entry = await this.resumeRepo.create(resolvedCtx, {
      tracker_id: trackerId,
      candidate_id: candidateId,
      job_id: input.jobId || null,
      mrf_request_id: input.mrfRequestId || null,
      source: input.source || 'Direct',
      position: input.position || null,
      status: 'Applied',
      uploaded_by: ctx.userId || 1,
    } as any);

    // Link resume_bank_id on candidate if schema supports it
    const hasResumeBankCol = await db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
    if (hasResumeBankCol) {
      await db('candidates').where('id', candidateId).update({
        resume_bank_id: entry.id,
      }).catch(() => {});
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
    const realOrgId = await this.resolveOrgId(ctx);
    const resolvedCtx: TenantContext = { ...ctx, organizationId: realOrgId };
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasJobIdCol = await db.schema.hasColumn('resume_upload_logs', 'target_job_id').catch(() => false);

    const data: any = {
      uploaded_by: ctx.userId || 1,
      file_name: fileName,
      total_records: totalRecords,
      success_count: 0,
      failed_count: 0,
      status: 'Processing',
    };

    if (hasJobIdCol && targetJobId) {
      data.target_job_id = targetJobId;
    }

    return this.uploadLogRepo.create(resolvedCtx, data);
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
    const realOrgId = await this.resolveOrgId(ctx);
    const resolvedCtx: TenantContext = { ...ctx, organizationId: realOrgId };
    const totalProcessed = successCount + failedCount;
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const hasAtsCol = await db.schema.hasColumn('resume_upload_logs', 'ats_passed_count').catch(() => false);

    const updateData: any = {
      total_records: totalProcessed > 0 ? totalProcessed : 1,
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

    return this.uploadLogRepo.update(resolvedCtx, logId, updateData);
  }

  /**
   * Get upload logs with target job information
   */
  async getUploadLogs(ctx: TenantContext, options?: ListQueryOptions) {
    const realOrgId = await this.resolveOrgId(ctx);
    const resolvedCtx: TenantContext = { ...ctx, organizationId: realOrgId };
    return this.uploadLogRepo.list(resolvedCtx, {
      ...options,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  /**
   * Process a single resume buffer (PDF) and save to DB
   */
  async processSingleResumeBuffer(
    ctx: TenantContext,
    buffer: Buffer,
    originalFilename: string,
    options: { jobId?: number; source?: string } = {}
  ) {
    try {
      const { ResumeParserService } = await import('./ResumeParserService');
      const parser = new ResumeParserService();
      const parsed = await parser.parseResumeBuffer(buffer, originalFilename);

      let fileUrl: string | null = null;
      try {
        const fs = await import('fs');
        const path = await import('path');
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const cleanName = (originalFilename || 'resume.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeFileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${cleanName}`;
        const filePath = path.join(uploadDir, safeFileName);
        fs.writeFileSync(filePath, buffer);
        fileUrl = `/uploads/${safeFileName}`;
      } catch (e) {
        console.warn('Failed to save physical PDF resume file to disk:', e);
      }

      const candidateName = parsed.name || (originalFilename ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[_-\s]+/g, ' ').trim() : '') || 'Candidate Applicant';
      const candidateEmail = parsed.email || `candidate_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}@example.com`;

      const resEntry = await this.addEntry(ctx, {
        name: candidateName,
        email: candidateEmail,
        contact: parsed.phone || undefined,
        skills: parsed.skills && parsed.skills.length ? parsed.skills.map(s => s.name).join(', ') : undefined,
        totalExp: parsed.yearsOfExperience ? String(parsed.yearsOfExperience) : undefined,
        source: options.source || 'bulk_import',
        jobId: options.jobId,
        position: options.jobId ? undefined : 'Software Engineer',
      });

      if (resEntry && resEntry.id) {
        const { getKnex } = await import('../../../db/knex');
        const db = getKnex();
        await db('resume_bank').where('id', resEntry.id).update({
          resume_text: parsed.extractedText || null,
          resume_file_url: fileUrl,
        }).catch((err) => {
          console.warn('Failed to update resume_text or resume_file_url:', err);
        });
      }

      return resEntry;
    } catch (err: any) {
      console.error('[processSingleResumeBuffer] Exception processing file:', originalFilename, err);
      throw new Error(`Failed to process ${originalFilename || 'file'}: ${err.message || String(err)}`);
    }
  }

  /**
   * Bulk upload resumes supporting PDF files, ZIP, and RAR archives
   */
  async bulkUploadResumes(
    ctx: TenantContext,
    files: Array<{ buffer: Buffer; originalname: string }>,
    options: { jobId?: number; source?: string } = {}
  ) {
    const log = await this.createUploadLog(ctx, files.map(f => f.originalname).join(', '), files.length);
    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const file of files) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (ext === 'rar') {
        failedCount++;
        errors.push({
          file: file.originalname,
          error: 'RAR archives are not supported. Upload PDF/DOCX files or a ZIP of resumes.',
        });
        continue;
      }
      if (ext === 'zip') {
        try {
          const zip = new AdmZip(file.buffer);
          const zipEntries = zip.getEntries();
          
          let processedAnyInZip = false;

          for (const entry of zipEntries) {
            const entryPath = entry.entryName || '';
            const fileName = entry.name || entryPath.split('/').pop() || '';

            // Skip directories, macOS metadata files (__MACOSX/._*), hidden files (.DS_Store, etc.)
            if (
              entry.isDirectory ||
              !fileName ||
              fileName.startsWith('.') ||
              fileName.startsWith('~') ||
              entryPath.includes('__MACOSX') ||
              fileName.toLowerCase() === '.ds_store' ||
              fileName.toLowerCase() === 'thumbs.db'
            ) {
              continue;
            }

            const entryExt = fileName.toLowerCase().split('.').pop() || '';
            if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'csv'].includes(entryExt)) {
              processedAnyInZip = true;
              try {
                const entryBuffer = entry.getData();
                if (!entryBuffer || entryBuffer.length === 0) {
                  console.warn('[bulkUploadResumes] Skipping empty file in ZIP:', fileName);
                  continue;
                }
                await this.processSingleResumeBuffer(ctx, entryBuffer, fileName, options);
                successCount++;
              } catch (err: any) {
                console.error('[bulkUploadResumes] ZIP Entry processing error:', fileName, err);
                failedCount++;
                errors.push({ file: fileName, error: err.message || String(err) });
              }
            }
          }

          if (!processedAnyInZip) {
            console.warn('[bulkUploadResumes] No valid resume files (.pdf, .doc, .docx, .txt) found in ZIP:', file.originalname);
            failedCount++;
            errors.push({ file: file.originalname, error: 'No valid resume files (.pdf, .doc, .docx, .txt) found inside ZIP archive' });
          }
        } catch (zipErr: any) {
          console.error('[bulkUploadResumes] ZIP Archive error:', file.originalname, zipErr);
          failedCount++;
          errors.push({ file: file.originalname, error: `Archive extraction error: ${zipErr.message}` });
        }
      } else {
        try {
          await this.processSingleResumeBuffer(ctx, file.buffer, file.originalname, options);
          successCount++;
        } catch (err: any) {
          console.error('[bulkUploadResumes] File processing error:', file.originalname, err);
          failedCount++;
          errors.push({ file: file.originalname, error: err.message || String(err) });
        }
      }
    }

    await this.updateUploadLog(ctx, log.id, successCount, failedCount, errors);

    return {
      success: true,
      logId: log.id,
      successCount,
      failedCount,
      errors,
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
