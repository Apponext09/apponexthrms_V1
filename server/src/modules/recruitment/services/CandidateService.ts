import { v4 as uuidv4 } from 'uuid';
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

  async createCandidate(
    ctx: TenantContext,
    input: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      alternativePhone?: string;
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
    }
  ): Promise<Candidate> {
    const isUnique = await this.candidateRepo.isEmailUnique(ctx, input.email);
    if (!isUnique) {
      throw new ValidationError(`Email '${input.email}' already exists`);
    }

    const candidate = await this.candidateRepo.create(ctx, {
      uuid: uuidv4(),
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone || null,
      alternative_phone: input.alternativePhone || null,
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

    return candidate;
  }

  async updateCandidateProfile(ctx: TenantContext, candidateId: number, input: Partial<Candidate>): Promise<Candidate> {
    const candidate = await this.candidateRepo.getById(ctx, candidateId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const updated = await this.candidateRepo.update(ctx, candidateId, {
      ...input,
      updated_by: ctx.userId,
    } as any);

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

    await this.candidateRepo.delete(ctx, candidateId);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });
  }
}
