import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { CandidateRepository, type Candidate } from '../repositories/CandidateRepository';
import {
  CandidateSkillRepository,
  CandidateEducationRepository,
  CandidateExperienceRepository,
  CandidateCertificationRepository,
  CandidateNoteRepository,
} from '../repositories/CandidateProfileRepository';
import {
  CandidateResumeRepository,
  CandidateDocumentRepository,
} from '../repositories/CandidateDocumentRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class CandidateService {
  private candidateRepo: CandidateRepository;
  private skillRepo: CandidateSkillRepository;
  private educationRepo: CandidateEducationRepository;
  private experienceRepo: CandidateExperienceRepository;
  private certificationRepo: CandidateCertificationRepository;
  private noteRepo: CandidateNoteRepository;
  private resumeRepo: CandidateResumeRepository;
  private documentRepo: CandidateDocumentRepository;
  private auditService: AuditService;

  constructor() {
    this.candidateRepo = new CandidateRepository();
    this.skillRepo = new CandidateSkillRepository();
    this.educationRepo = new CandidateEducationRepository();
    this.experienceRepo = new CandidateExperienceRepository();
    this.certificationRepo = new CandidateCertificationRepository();
    this.noteRepo = new CandidateNoteRepository();
    this.resumeRepo = new CandidateResumeRepository();
    this.documentRepo = new CandidateDocumentRepository();
    this.auditService = new AuditService();
  }

  private saveBase64Resume(dataUrl: string | null | undefined, prefix: string): string | null {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    if (!dataUrl.startsWith('data:')) return dataUrl; // Already a URL or path

    try {
      const uploadsDir = path.join(process.cwd(), 'uploads/resumes');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const matches = dataUrl.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return dataUrl;

      const mimeType = matches[1];
      let ext = 'pdf';
      if (mimeType.includes('wordprocessingml.document')) ext = 'docx';
      else if (mimeType.includes('msword')) ext = 'doc';
      else if (mimeType.includes('jpeg')) ext = 'jpg';
      else if (mimeType.includes('png')) ext = 'png';

      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `${prefix}_${Date.now()}_${Math.floor(100 + Math.random() * 900)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);
      console.log(`📄 Saved resume file to disk: ${filePath}`);

      return `/uploads/resumes/${filename}`;
    } catch (err) {
      console.error(`Failed to save base64 resume (${prefix}):`, err);
      return dataUrl;
    }
  }

  async createCandidate(
    ctx: TenantContext,
    input: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      alternativePhone?: string;
      gender?: string;
      maritalStatus?: string;
      qualification?: string;
      skills?: string;
      dateOfBirth?: string;
      currentLocation?: number;
      preferredLocation?: number;
      currentSalary?: number;
      salaryCurrency?: string;
      expectedSalary?: number;
      noticePeriodDays?: number;
      currentCompany?: string;
      yearsOfExperience?: number;
      linkedinUrl?: string;
      githubUrl?: string;
      portfolioUrl?: string;
      source: string;
      resumeUrl?: string;
    }
  ): Promise<Candidate> {
    let candidate = await this.candidateRepo.getByEmail(ctx, input.email);
    const resumePath = this.saveBase64Resume(input.resumeUrl, input.firstName.toLowerCase());

    if (candidate) {
      // Update existing candidate profile details with latest details (and restore if soft-deleted)
      candidate = await this.candidateRepo.update(ctx, candidate.id, {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone || candidate.phone,
        alternative_phone: input.alternativePhone || candidate.alternativePhone || null,
        gender: input.gender || (candidate as any).gender || null,
        marital_status: input.maritalStatus || (candidate as any).marital_status || null,
        qualification: input.qualification || (candidate as any).qualification || null,
        skills: input.skills || (candidate as any).skills || null,
        dob: input.dateOfBirth || (candidate as any).dob || null,
        current_location_id: input.currentLocation || candidate.currentLocationId || null,
        preferred_location_id: input.preferredLocation || candidate.preferredLocationId || null,
        current_salary: input.currentSalary || candidate.currentSalary || null,
        salary_currency: input.salaryCurrency || candidate.salaryCurrency || null,
        expected_salary: input.expectedSalary || candidate.expectedSalary || null,
        notice_period_days: input.noticePeriodDays || candidate.noticePeriodDays || null,
        current_company: input.currentCompany || candidate.currentCompany || null,
        years_of_experience: input.yearsOfExperience || candidate.yearsOfExperience || null,
        linkedin_url: input.linkedinUrl || candidate.linkedinUrl || null,
        github_url: input.githubUrl || candidate.githubUrl || null,
        portfolio_url: input.portfolioUrl || candidate.portfolioUrl || null,
        source: input.source || candidate.source,
        resume_url: resumePath || candidate.resumeUrl || null,
        deleted_at: null, // RESTORE candidate if soft-deleted
        updated_by: ctx.userId,
      } as any);


      await this.auditService.log(ctx, {
        action: 'UPDATE',
        entityType: 'CANDIDATE',
        entityId: candidate.id,
        afterState: { firstName: input.firstName, email: input.email },
      });
    } else {
      // Create a new candidate record
      candidate = await this.candidateRepo.create(ctx, {
        uuid: uuidv4(),
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone || null,
        alternative_phone: input.alternativePhone || null,
        gender: input.gender || null,
        marital_status: input.maritalStatus || null,
        qualification: input.qualification || null,
        skills: input.skills || null,
        dob: input.dateOfBirth || null,
        current_location_id: input.currentLocation || null,
        preferred_location_id: input.preferredLocation || null,
        current_salary: input.currentSalary || null,
        salary_currency: input.salaryCurrency || null,
        expected_salary: input.expectedSalary || null,
        notice_period_days: input.noticePeriodDays || null,
        current_company: input.currentCompany || null,
        years_of_experience: input.yearsOfExperience || null,
        linkedin_url: input.linkedinUrl || null,
        github_url: input.githubUrl || null,
        portfolio_url: input.portfolioUrl || null,
        status: 'applied',
        source: input.source,
        resume_url: resumePath,
        ai_score: null,
        ai_summary: null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);

      await this.auditService.log(ctx, {
        action: 'CREATE',
        entityType: 'CANDIDATE',
        entityId: candidate.id,
        afterState: { firstName: input.firstName, email: input.email },
      });
    }

    return candidate;
  }

  async updateCandidateProfile(ctx: TenantContext, candidateId: number, input: Partial<Candidate> & Record<string, any>): Promise<Candidate> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const updateData: any = { updated_by: ctx.userId };
    const assign = (column: string, ...keys: string[]) => {
      for (const key of keys) {
        if (input[key] !== undefined) {
          updateData[column] = input[key] === '' ? null : input[key];
          return;
        }
      }
    };

    assign('first_name', 'firstName', 'first_name');
    assign('last_name', 'lastName', 'last_name');
    assign('email', 'email');
    assign('phone', 'phone');
    assign('alternative_phone', 'alternativePhone', 'alternative_phone');
    assign('gender', 'gender');
    assign('marital_status', 'maritalStatus', 'marital_status');
    assign('qualification', 'qualification');
    assign('skills', 'skills');
    assign('dob', 'dateOfBirth', 'dob');
    assign('current_salary', 'currentSalary', 'current_salary');
    assign('expected_salary', 'expectedSalary', 'expected_salary');
    assign('notice_period_days', 'noticePeriodDays', 'notice_period_days');
    assign('current_company', 'currentCompany', 'current_company');
    assign('years_of_experience', 'yearsOfExperience', 'years_of_experience');
    assign('linkedin_url', 'linkedinUrl', 'linkedin_url');
    assign('github_url', 'githubUrl', 'github_url');
    assign('portfolio_url', 'portfolioUrl', 'portfolio_url');
    assign('source', 'source');

    if (input.status !== undefined) {
      const nextStatus = String(input.status).toLowerCase();
      const currentStatus = String(candidate.status || 'applied').toLowerCase();
      const rank = (status: string) => {
        if (['rejected', 'dropped', 'withdrawn'].includes(status)) return 4;
        if (['offer', 'offered', 'hired'].includes(status)) return 3;
        if (['interview', 'interviewing', 'assessment'].includes(status)) return 2;
        return 1;
      };
      const fromRank = rank(currentStatus);
      const toRank = rank(nextStatus);
      const isSame = currentStatus === nextStatus;
      const canReject = nextStatus === 'rejected' && fromRank < 4;
      const isForward = toRank > fromRank;
      if (!isSame && !canReject && !isForward) {
        throw new ValidationError('Candidate pipeline can only move forward. Offered candidates cannot return to Interview.');
      }
      updateData.status = nextStatus;
    }

    const resumePayload = input.resumeUrl || input.resume_url;
    if (resumePayload) {
      const firstName = candidate.firstName || candidate.first_name || 'candidate';
      updateData.resume_url = this.saveBase64Resume(resumePayload, String(firstName).toLowerCase());
    }

    const updated = await this.candidateRepo.update(ctx, candidateId, updateData as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      afterState: input,
    });

    return updated;
  }

  async getCandidate(ctx: TenantContext, candidateId: number): Promise<Candidate> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }
    return candidate;
  }

  async listCandidates(ctx: TenantContext, options?: ListQueryOptions) {
    return this.candidateRepo.list(ctx, options);
  }

  async addCandidateNote(ctx: TenantContext, candidateId: number, noteText: string): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const note = await this.noteRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      note_text: noteText,
      created_by: ctx.userId,
    } as any);

    return note;
  }

  async getCandidateNotes(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    return this.noteRepo.getByCandidate(ctx, candidateId, options);
  }

  async addSkill(
    ctx: TenantContext,
    candidateId: number,
    input: {
      skillName: string;
      proficiencyLevel: string;
      yearsOfExperience?: number;
    }
  ): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    return this.skillRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      skill_name: input.skillName,
      proficiency_level: input.proficiencyLevel,
      years_of_experience: input.yearsOfExperience || null,
    } as any);
  }

  async addEducation(
    ctx: TenantContext,
    candidateId: number,
    input: {
      degree: string;
      fieldOfStudy: string;
      institution: string;
      graduationYear?: number;
      cgpa?: number;
    }
  ): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    return this.educationRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      degree: input.degree,
      field_of_study: input.fieldOfStudy,
      institution: input.institution,
      graduation_year: input.graduationYear || null,
      cgpa: input.cgpa || null,
    } as any);
  }

  async addExperience(
    ctx: TenantContext,
    candidateId: number,
    input: {
      companyName: string;
      jobTitle: string;
      description?: string;
      startDate: string;
      endDate?: string;
      currentlyWorking: boolean;
    }
  ): Promise<any> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    return this.experienceRepo.create(ctx, {
      uuid: uuidv4(),
      candidate_id: candidateId,
      company_name: input.companyName,
      job_title: input.jobTitle,
      description: input.description || null,
      start_date: input.startDate,
      end_date: input.endDate || null,
      currently_working: input.currentlyWorking,
    } as any);
  }

  async getCandidateSkills(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.skillRepo.getByCandidate(ctx, candidateId, options);
  }

  async getCandidateEducation(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.educationRepo.getByCandidate(ctx, candidateId, options);
  }

  async getCandidateExperience(ctx: TenantContext, candidateId: number, options?: ListQueryOptions) {
    return this.experienceRepo.getByCandidate(ctx, candidateId, options);
  }

  async deleteCandidate(ctx: TenantContext, candidateId: number): Promise<void> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const applicationIds: number[] = await db('applications')
      .where({ candidate_id: candidateId, organization_id: ctx.organizationId })
      .pluck('id');

    if (applicationIds.length > 0) {
      const applicationTables = ['interview_feedback', 'interview_panel', 'interviewers', 'interviews', 'offers', 'offer_versions', 'assessments', 'application_stage_history'];
      for (const table of applicationTables) {
        try {
          if (await db.schema.hasTable(table)) {
            const hasAppId = await db.schema.hasColumn(table, 'application_id');
            if (hasAppId) {
              await db(table).whereIn('application_id', applicationIds).del();
            }
          }
        } catch (err) {
          console.warn(`[deleteCandidate] Could not clear ${table}:`, err);
        }
      }
      await db('applications').whereIn('id', applicationIds).del();
    }

    try {
      if (await db.schema.hasTable('employees') && await db.schema.hasColumn('employees', 'source_candidate_id')) {
        await db('employees').where('source_candidate_id', candidateId).update({
          source_candidate_id: null,
          source_application_id: null,
        });
      }
    } catch (err) {
      console.warn('[deleteCandidate] Could not unlink employees:', err);
    }

    try {
      if (await db.schema.hasTable('resume_bank') && await db.schema.hasColumn('resume_bank', 'candidate_id')) {
        await db('resume_bank').where('candidate_id', candidateId).update({ candidate_id: null });
      }
    } catch (err) {
      console.warn('[deleteCandidate] Could not unlink resume bank:', err);
    }

    const relatedTables = [
      'candidate_documents',
      'candidate_skills',
      'candidate_education',
      'candidate_experience',
      'candidate_notes',
      'candidate_certifications',
      'candidate_resumes',
      'referrals',
    ];
    for (const table of relatedTables) {
      try {
        if (await db.schema.hasTable(table)) {
          await db(table).where('candidate_id', candidateId).del();
        }
      } catch (err) {
        console.warn(`[deleteCandidate] Could not clear ${table}:`, err);
      }
    }

    await this.candidateRepo.hardDelete(ctx, candidateId);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });
  }

  async bulkImportCandidates(
    ctx: TenantContext,
    candidatesList: Array<{
      firstName?: string;
      lastName?: string;
      email: string;
      phone?: string;
      alternativePhone?: string;
      gender?: string;
      maritalStatus?: string;
      qualification?: string;
      skills?: string;
      dateOfBirth?: string;
      yearsOfExperience?: number;
      currentCompany?: string;
      currentSalary?: number;
      expectedSalary?: number;
      noticePeriodDays?: number;
      linkedinUrl?: string;
      portfolioUrl?: string;
      source?: string;
    }>
  ): Promise<{ insertedCount: number; skippedCount: number }> {
    if (!Array.isArray(candidatesList) || candidatesList.length === 0) {
      throw new ValidationError('Candidates list must be a non-empty array');
    }

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const parseStr = (val: any) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s.length > 0 ? s : null;
    };

    const parseNum = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return !isNaN(n) ? n : null;
    };

    const parseDate = (val: any) => {
      if (!val) return null;
      const s = String(val).trim();
      if (!s || s === 'undefined' || s === 'null') return null;
      return s;
    };

    let insertedCount = 0;
    let skippedCount = 0;
    const seenEmails = new Set<string>();

    const batchSize = 100;
    for (let i = 0; i < candidatesList.length; i += batchSize) {
      const chunk = candidatesList.slice(i, i + batchSize);
      
      const rowsToInsert: any[] = [];
      for (const item of chunk) {
        if (!item.email || !String(item.email).includes('@')) {
          skippedCount++;
          continue;
        }

        const cleanEmail = String(item.email).trim().toLowerCase();

        // In-batch deduplication
        if (seenEmails.has(cleanEmail)) {
          skippedCount++;
          continue;
        }
        seenEmails.add(cleanEmail);

        // Database duplicate check (including soft-deleted records)
        const existing = await db('candidates')
          .where('organization_id', ctx.organizationId)
          .where('email', cleanEmail)
          .first();

        if (existing) {
          if (existing.deleted_at || existing.deletedAt) {
            try {
              await db('candidates').where('id', existing.id).del();
            } catch {
              skippedCount++;
              continue;
            }
          } else {
            skippedCount++;
            continue;
          }
        }

        const firstName = parseStr(item.firstName) || cleanEmail.split('@')[0] || 'Candidate';
        const lastName = parseStr(item.lastName) || '';

        rowsToInsert.push({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: (ctx as any).companyId || null,
          first_name: firstName,
          last_name: lastName,
          email: cleanEmail,
          phone: parseStr(item.phone),
          alternative_phone: parseStr(item.alternativePhone),
          gender: parseStr(item.gender),
          marital_status: parseStr(item.maritalStatus),
          qualification: parseStr(item.qualification),
          skills: parseStr(item.skills),
          dob: parseDate(item.dateOfBirth),
          current_company: parseStr(item.currentCompany),
          years_of_experience: parseNum(item.yearsOfExperience),
          current_salary: parseNum(item.currentSalary),
          expected_salary: parseNum(item.expectedSalary),
          notice_period_days: parseNum(item.noticePeriodDays),
          linkedin_url: parseStr(item.linkedinUrl),
          portfolio_url: parseStr(item.portfolioUrl),
          status: 'applied',
          source: parseStr(item.source) || 'bulk_import',
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
      }

      if (rowsToInsert.length > 0) {
        try {
          await db('candidates').insert(rowsToInsert);
          insertedCount += rowsToInsert.length;
        } catch (batchErr) {
          // Row-by-row fallback in case one row fails
          for (const row of rowsToInsert) {
            try {
              await db('candidates').insert(row);
              insertedCount++;
            } catch (singleErr) {
              skippedCount++;
            }
          }
        }
      }
    }

    return { insertedCount, skippedCount };
  }
}
