import { v4 as uuidv4 } from 'uuid';
import { ReferralRepository, type Referral } from '../repositories/ReferralRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ReferralReward {
  id: number;
  uuid: string;
  organization_id: number;
  referral_id: number;
  reward_amount: number;
  reward_type: string;
  status: 'pending' | 'paid' | 'forfeited';
  paid_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ReferralService {
  private referralRepo: ReferralRepository;
  private candidateRepo: CandidateRepository;
  private applicationRepo: ApplicationRepository;
  private auditService: AuditService;

  constructor() {
    this.referralRepo = new ReferralRepository();
    this.candidateRepo = new CandidateRepository();
    this.applicationRepo = new ApplicationRepository();
    this.auditService = new AuditService();
  }

  async createReferral(
    ctx: TenantContext,
    input: {
      employeeId: number;
      candidateId: number;
      referralRewardAmount?: number;
    }
  ): Promise<Referral> {
    const candidate = await this.candidateRepo.getById(ctx, input.candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const referral = await this.referralRepo.create(ctx, {
      uuid: uuidv4(),
      referrer_employee_id: input.employeeId,
      candidate_id: input.candidateId,
      application_id: null,
      referral_date: new Date().toISOString().split('T')[0],
      referral_reward_amount: input.referralRewardAmount || null,
      referral_status: 'pending',
      hired_date: null,
      reward_status: 'pending',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'REFERRAL',
      entityId: referral.id,
      afterState: {
        employeeId: input.employeeId,
        candidateId: input.candidateId,
      },
    });

    return referral;
  }

  async linkApplicationToReferral(
    ctx: TenantContext,
    referralId: number,
    applicationId: number
  ): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.referralRepo.update(ctx, referralId, {
      application_id: applicationId,
      updated_by: ctx.userId,
    } as any);
  }

  async markReferralAsHired(ctx: TenantContext, referralId: number): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    return this.referralRepo.update(ctx, referralId, {
      referral_status: 'hired',
      hired_date: new Date().toISOString().split('T')[0],
      reward_status: 'pending',
      updated_by: ctx.userId,
    } as any);
  }

  async rewardReferral(
    ctx: TenantContext,
    referralId: number,
    input: {
      rewardAmount: number;
      rewardType: string;
      newStatus?: string;
    }
  ): Promise<any> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    // Determine statuses based on what HR chose
    const targetStatus = input.newStatus || 'hired';
    const rewardPaid = targetStatus === 'reward_paid';

    const updated = await this.referralRepo.update(ctx, referralId, {
      referral_status: targetStatus === 'submitted' ? (referral.referral_status || 'pending') : targetStatus,
      status: targetStatus,
      reward_status: rewardPaid ? 'paid' : 'pending',
      hired_date: (targetStatus === 'hired' || rewardPaid)
        ? (referral.hired_date || new Date().toISOString().substring(0, 10))
        : referral.hired_date,
      referral_reward_amount: input.rewardAmount,
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async getReferral(ctx: TenantContext, referralId: number): Promise<Referral> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }
    return referral;
  }

  private saveResumeFile(
    fileOrBase64: any,
    prefix: string = 'referral'
  ): { filePath: string | null; fileName: string | null; fileSize: number | null } {
    if (!fileOrBase64) return { filePath: null, fileName: null, fileSize: null };

    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
      const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');

      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      if (!fs.existsSync(publicUploadsDir)) fs.mkdirSync(publicUploadsDir, { recursive: true });

      const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'referral';
      const timestamp = Date.now();
      const randomSuffix = Math.floor(100 + Math.random() * 900);

      // Case 1: Multer file object with buffer
      if (fileOrBase64.buffer && Buffer.isBuffer(fileOrBase64.buffer)) {
        const origName = fileOrBase64.originalname || 'resume.pdf';
        const extMatch = origName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
        const diskFilename = `${safePrefix}_${timestamp}_${randomSuffix}.${ext}`;
        const targetPath = path.join(uploadsDir, diskFilename);
        const publicTargetPath = path.join(publicUploadsDir, diskFilename);

        fs.writeFileSync(targetPath, fileOrBase64.buffer);
        try { fs.writeFileSync(publicTargetPath, fileOrBase64.buffer); } catch (e) {}

        return {
          filePath: `/uploads/resumes/${diskFilename}`,
          fileName: origName,
          fileSize: fileOrBase64.size || fileOrBase64.buffer.length,
        };
      }

      // Case 2: String - base64 Data URL or direct path
      if (typeof fileOrBase64 === 'string') {
        if (fileOrBase64.startsWith('data:')) {
          const matches = fileOrBase64.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            let ext = 'pdf';
            if (mimeType.includes('wordprocessingml.document')) ext = 'docx';
            else if (mimeType.includes('msword')) ext = 'doc';
            else if (mimeType.includes('jpeg')) ext = 'jpg';
            else if (mimeType.includes('png')) ext = 'png';
            else if (mimeType.includes('plain')) ext = 'txt';

            const buffer = Buffer.from(matches[2], 'base64');
            const diskFilename = `${safePrefix}_${timestamp}_${randomSuffix}.${ext}`;
            const targetPath = path.join(uploadsDir, diskFilename);
            const publicTargetPath = path.join(publicUploadsDir, diskFilename);

            fs.writeFileSync(targetPath, buffer);
            try { fs.writeFileSync(publicTargetPath, buffer); } catch (e) {}

            return {
              filePath: `/uploads/resumes/${diskFilename}`,
              fileName: `${safePrefix}_resume.${ext}`,
              fileSize: buffer.length,
            };
          }
        }
        // If already a URL / path
        return {
          filePath: fileOrBase64,
          fileName: path.basename(fileOrBase64),
          fileSize: null,
        };
      }
    } catch (err) {
      console.warn('[saveResumeFile] Error saving resume file:', err);
    }

    return { filePath: null, fileName: null, fileSize: null };
  }

  async submitReferral(
    ctx: TenantContext,
    input: {
      employeeId?: number;
      candidateId?: number;
      candidateName?: string;
      candidateEmail?: string;
      candidatePhone?: string;
      positionTitle?: string;
      referralRewardAmount?: number;
      resumeFile?: any;
      resumeUrl?: string;
    }
  ): Promise<any> {
    let candidateId = input.candidateId;
    let employeeId = input.employeeId;

    if (!employeeId && ctx.userId) {
      const user = await this.referralRepo.db('users').where('id', ctx.userId).first();
      const userEmail = user?.email || '';
      // NOTE: employees table has no user_id column — find by email
      if (userEmail) {
        const emp = await this.referralRepo.db('employees')
          .where('organization_id', ctx.organizationId)
          .where('email', userEmail)
          .whereNull('deleted_at')
          .first();
        if (emp) {
          employeeId = emp.id;
        }
      }
      // Fallback: use linked employee_id from users table, or ctx.userId
      if (!employeeId) {
        const linkedEmpId = user?.employee_id || user?.employeeId;
        employeeId = linkedEmpId || ctx.userId;
      }
    }

    const nameParts = (input.candidateName || '').trim().split(' ');
    const firstName = nameParts[0] || 'Referral';
    const lastName = nameParts.slice(1).join(' ') || 'Candidate';
    const email = input.candidateEmail || `referral_${Date.now()}@example.com`;

    const resumeInfo = this.saveResumeFile(
      input.resumeFile || input.resumeUrl || (input as any).resume_url || (input as any).resume,
      `${firstName}_${lastName}`
    );

    if (!candidateId && (input.candidateName || input.candidateEmail)) {
      let existingCand = await this.candidateRepo.db('candidates')
        .where('organization_id', ctx.organizationId)
        .where('email', email)
        .whereNull('deleted_at')
        .first();

      if (existingCand) {
        candidateId = existingCand.id;
        if (resumeInfo.filePath) {
          await this.candidateRepo.db('candidates')
            .where('id', candidateId)
            .update({
              resume_url: resumeInfo.filePath,
              updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
              updated_by: ctx.userId || 1,
            });
        }
      } else {
        const [newId] = await this.candidateRepo.db('candidates').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: input.candidatePhone || null,
          current_company: input.positionTitle || null,
          status: 'applied',
          source: 'employee_referral',
          resume_url: resumeInfo.filePath || null,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        candidateId = newId;
      }
    } else if (candidateId && resumeInfo.filePath) {
      await this.candidateRepo.db('candidates')
        .where('id', candidateId)
        .update({
          resume_url: resumeInfo.filePath,
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updated_by: ctx.userId || 1,
        });
    }

    if (!candidateId) {
      throw new ValidationError('Candidate ID or candidate details (name, email) are required');
    }

    if (!employeeId) {
      throw new ValidationError('Referrer employee ID is required');
    }

    // Insert into candidate_documents if table exists
    if (resumeInfo.filePath && candidateId) {
      try {
        const hasDocTable = await this.referralRepo.db.schema.hasTable('candidate_documents');
        if (hasDocTable) {
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const hasUuid = await this.referralRepo.db.schema.hasColumn('candidate_documents', 'uuid');
          const docData: any = {
            organization_id: ctx.organizationId,
            candidate_id: candidateId,
            created_at: now,
          };
          if (hasUuid) docData.uuid = uuidv4();
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'document_type')) docData.document_type = 'resume';
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'file_name')) docData.file_name = resumeInfo.fileName || 'candidate_resume.pdf';
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'file_url')) docData.file_url = resumeInfo.filePath;
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'document_url')) docData.document_url = resumeInfo.filePath;
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'file_size')) docData.file_size = resumeInfo.fileSize || 0;
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'uploaded_at')) docData.uploaded_at = now;
          if (await this.referralRepo.db.schema.hasColumn('candidate_documents', 'updated_at')) docData.updated_at = now;

          await this.referralRepo.db('candidate_documents').insert(docData);
        }
      } catch (docErr) {
        console.warn('[submitReferral] Could not insert into candidate_documents:', docErr);
      }

      // Also index in resume_bank if table exists
      try {
        const hasResumeBank = await this.referralRepo.db.schema.hasTable('resume_bank');
        if (hasResumeBank) {
          const trackerId = `REF-${Date.now().toString().slice(-6)}`;
          const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const hasUuid = await this.referralRepo.db.schema.hasColumn('resume_bank', 'uuid');
          const rbData: any = {
            organization_id: ctx.organizationId,
            candidate_id: candidateId,
            tracker_id: trackerId,
            created_at: now,
            updated_at: now,
          };
          if (hasUuid) rbData.uuid = uuidv4();
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'source')) rbData.source = 'employee_referral';
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'candidate_name')) rbData.candidate_name = `${firstName} ${lastName}`.trim();
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'candidate_email')) rbData.candidate_email = email;
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'candidate_phone')) rbData.candidate_phone = input.candidatePhone || null;
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'position_applied')) rbData.position_applied = input.positionTitle || null;
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'resume_file_url')) rbData.resume_file_url = resumeInfo.filePath;
          if (await this.referralRepo.db.schema.hasColumn('resume_bank', 'status')) rbData.status = 'active';

          await this.referralRepo.db('resume_bank').insert(rbData);
        }
      } catch (rbErr) {
        console.warn('[submitReferral] Could not insert into resume_bank:', rbErr);
      }
    }

    const [refId] = await this.referralRepo.db('referrals').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      referrer_employee_id: employeeId,
      candidate_id: candidateId,
      referral_date: new Date().toISOString().substring(0, 10),
      referral_reward_amount: input.referralRewardAmount || null,
      referral_status: 'pending',
      status: 'submitted',
      reward_status: 'pending',
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    return this.referralRepo.getById(ctx, refId);
  }

  async listReferrals(ctx: TenantContext, options?: ListQueryOptions) {
    const items = await this.referralRepo.listEnriched(ctx);
    return {
      items,
      data: items,
      meta: {
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / (options?.pageSize || 20)) || 1,
      }
    };
  }

  async getEmployeeReferrals(ctx: TenantContext, options: number | { referrerEmployeeId?: number; referrerEmployeeIds?: number[]; createdBy?: number }) {
    const filterOpts = typeof options === 'number'
      ? { referrerEmployeeId: options }
      : options;
    const items = await this.referralRepo.listEnriched(ctx, filterOpts);
    return {
      items,
      data: items,
    };
  }

  async getHiredReferrals(ctx: TenantContext, options?: ListQueryOptions) {
    return this.referralRepo.getHired(ctx, options);
  }

  async trackReferralProgress(ctx: TenantContext, referralId: number): Promise<any> {
    const referral = await this.referralRepo.getById(ctx, referralId) as any;
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    // Get associated application if any
    let applicationStatus = null;
    const appId = referral.applicationId || (referral as any).application_id;
    if (appId) {
      const application = await this.applicationRepo.getById(ctx, appId);
      if (application) {
        applicationStatus = application.application_status;
      }
    }

    return {
      referral,
      applicationStatus,
      progress: {
        referralStatus: referral.referral_status,
        rewardStatus: referral.reward_status,
        hiredDate: referral.hired_date,
      },
    };
  }

  async deleteReferral(ctx: TenantContext, referralId: number): Promise<void> {
    const referral = await this.referralRepo.getById(ctx, referralId);
    if (!referral) {
      throw new NotFoundError('Referral not found');
    }

    await this.referralRepo.delete(ctx, referralId);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'REFERRAL',
      entityId: referralId,
    });
  }
}
