import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { JobRepository, type Job } from '../repositories/JobRepository';
import { JobSkillRepository, type JobSkill } from '../repositories/SupportingRepository';
import { JobLocationRepository, type JobLocation } from '../repositories/SupportingRepository';
import { MrfRequestRepository } from '../repositories/MrfRequestRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

function normalizeJobType(val?: any): 'full_time' | 'part_time' | 'contract' | 'internship' {
  if (!val) return 'full_time';
  const s = String(val).toLowerCase().replace(/[\s_-]+/g, '');
  if (s.includes('part')) return 'part_time';
  if (s.includes('contract') || s.includes('temp') || s.includes('freelance')) return 'contract';
  if (s.includes('intern') || s.includes('trainee')) return 'internship';
  return 'full_time';
}

function normalizeEmploymentType(val?: any): 'onsite' | 'remote' | 'hybrid' {
  if (!val) return 'onsite';
  const s = String(val).toLowerCase().replace(/[\s_-]+/g, '');
  if (s.includes('remote') || s.includes('wfh') || s.includes('home')) return 'remote';
  if (s.includes('hybrid') || s.includes('flex')) return 'hybrid';
  return 'onsite';
}

function normalizeExperienceLevel(val?: any): 'entry' | 'mid' | 'senior' | 'lead' {
  if (!val) return 'mid';
  const s = String(val).toLowerCase().replace(/[\s_-]+/g, '');
  if (s.includes('entry') || s.includes('fresh') || s.includes('junior')) return 'entry';
  if (s.includes('lead') || s.includes('manager') || s.includes('dir') || s.includes('exec') || s.includes('principal')) return 'lead';
  if (s.includes('senior') || s.includes('sr')) return 'senior';
  return 'mid';
}

export class JobService {
  private jobRepo: JobRepository;
  private mrfRepo: MrfRequestRepository;
  private skillRepo: JobSkillRepository;
  private locationRepo: JobLocationRepository;
  private auditService: AuditService;

  constructor() {
    this.jobRepo = new JobRepository();
    this.mrfRepo = new MrfRequestRepository();
    this.skillRepo = new JobSkillRepository();
    this.locationRepo = new JobLocationRepository();
    this.auditService = new AuditService();
  }

  async createJob(
    ctx: TenantContext,
    input: {
      mrfRequestId?: number;
      jobCode: string;
      jobTitle: string;
      jobDescription: string;
      departmentId?: number;
      designationId?: number;
      locationId?: number;
      jobType: string;
      experienceLevel: string;
      minExperienceYears?: number;
      maxExperienceYears?: number;
      minSalary?: number;
      maxSalary?: number;
      currency: string;
      employmentType: string;
      noOfPositions: number;
      expiryDate?: string;
      jobTemplateId?: number;
      isInternal?: boolean;
      isPublishedExternal?: boolean;
      skills?: Array<{ name: string; proficiency: string; isMandatory: boolean }>;
      locations?: number[];
    }
  ): Promise<Job> {
    const isUnique = await this.jobRepo.isCodeUnique(ctx, input.jobCode);
    if (!isUnique) {
      throw new ValidationError(`Job code '${input.jobCode}' already exists! Cannot create duplicate job code.`);
    }

    const existingTitle = await this.jobRepo.query(ctx)
      .whereRaw('LOWER(job_title) = ?', [input.jobTitle.toLowerCase().trim()])
      .whereNull('deleted_at')
      .first();

    if (existingTitle) {
      throw new ValidationError(`A job opening with title '${input.jobTitle}' already exists! Duplicate job postings are not allowed.`);
    }

    if (input.mrfRequestId) {
      const mrf = await this.mrfRepo.getById(ctx, input.mrfRequestId);
      if (!mrf) {
        throw new ValidationError(`Linked MRF Request with ID ${input.mrfRequestId} not found`);
      }
      if (mrf.stage === 'Rejected') {
        throw new ValidationError('Cannot create a job posting for a REJECTED MRF Request');
      }
      if (mrf.stage !== 'Approved') {
        await this.mrfRepo.update(ctx, mrf.id, {
          stage: 'Approved',
          approved_by: ctx.userId,
          approved_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updated_by: ctx.userId,
        } as any);
      }
    }

    const job = await this.jobRepo.create(ctx, {
      uuid: uuidv4(),
      mrf_request_id: input.mrfRequestId || null,
      job_code: input.jobCode,
      job_title: input.jobTitle,
      job_description: input.jobDescription,
      department_id: input.departmentId || null,
      designation_id: input.designationId || null,
      location_id: input.locationId || null,
      job_type: normalizeJobType(input.jobType || (input as any).employmentType),
      experience_level: normalizeExperienceLevel(input.experienceLevel),
      min_experience_years: input.minExperienceYears || null,
      max_experience_years: input.maxExperienceYears || null,
      min_salary: input.minSalary || null,
      max_salary: input.maxSalary || null,
      currency: input.currency || 'INR',
      employment_type: normalizeEmploymentType(input.employmentType),
      no_of_positions: input.noOfPositions || 1,
      expiry_date: input.expiryDate || null,
      job_template_id: input.jobTemplateId || null,
      is_internal: input.isInternal ?? false,
      is_published_external: input.isPublishedExternal ?? true,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Add skills
    if (input.skills && input.skills.length > 0) {
      for (const skill of input.skills) {
        await this.skillRepo.create(ctx, {
          uuid: uuidv4(),
          job_id: job.id,
          skill_name: skill.name,
          proficiency_level: skill.proficiency,
          is_mandatory: skill.isMandatory,
        } as any);
      }
    }

    // Add locations
    if (input.locations && input.locations.length > 0) {
      for (const locationId of input.locations) {
        await this.locationRepo.create(ctx, {
          uuid: uuidv4(),
          job_id: job.id,
          location_id: locationId,
        } as any);
      }
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'JOB',
      entityId: job.id,
      afterState: { jobCode: input.jobCode, jobTitle: input.jobTitle },
    });

    return job;
  }

  async updateJob(ctx: TenantContext, jobId: number, input: Partial<Job>): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (input.job_code && input.job_code !== job.job_code) {
      const isUniqueCode = await this.jobRepo.isCodeUnique(ctx, input.job_code, jobId);
      if (!isUniqueCode) {
        throw new ValidationError(`Job code '${input.job_code}' already exists`);
      }
    }

    const titleToCheck = input.job_title || (input as any).jobTitle;
    const currentJobTitle = job.job_title || (job as any).jobTitle || '';
    if (titleToCheck && titleToCheck.toLowerCase().trim() !== currentJobTitle.toLowerCase().trim()) {
      const existingTitle = await this.jobRepo.query(ctx)
        .whereRaw('LOWER(job_title) = ?', [titleToCheck.toLowerCase().trim()])
        .whereNot('id', jobId)
        .whereNull('deleted_at')
        .first();

      if (existingTitle) {
        throw new ValidationError(`A job opening with title '${titleToCheck}' already exists!`);
      }
    }

    const sanitizedInput: any = {
      ...input,
      updated_by: ctx.userId,
    };
    if (input.job_type !== undefined || (input as any).jobType !== undefined) {
      sanitizedInput.job_type = normalizeJobType(input.job_type || (input as any).jobType);
    }
    if (input.employment_type !== undefined || (input as any).employmentType !== undefined) {
      sanitizedInput.employment_type = normalizeEmploymentType(input.employment_type || (input as any).employmentType);
    }
    if (input.experience_level !== undefined || (input as any).experienceLevel !== undefined) {
      sanitizedInput.experience_level = normalizeExperienceLevel(input.experience_level || (input as any).experienceLevel);
    }

    const updated = await this.jobRepo.update(ctx, jobId, sanitizedInput);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'JOB',
      entityId: jobId,
      afterState: input,
    });

    return updated;
  }

  async publishJob(ctx: TenantContext, jobId: number): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'draft' && job.status !== 'on_hold') {
      throw new ValidationError('Only draft or paused (on hold) jobs can be activated');
    }

    return this.updateJob(ctx, jobId, {
      status: 'published',
      published_at: job.published_at || new Date().toISOString().replace('T', ' ').substring(0, 19),
    } as any);
  }

  async pauseJob(ctx: TenantContext, jobId: number): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'published') {
      throw new ValidationError('Only active (published) jobs can be paused');
    }

    return this.updateJob(ctx, jobId, {
      status: 'on_hold',
    } as any);
  }

  async closeJob(ctx: TenantContext, jobId: number): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'published' && job.status !== 'on_hold') {
      throw new ValidationError('Only active or paused jobs can be closed');
    }

    return this.updateJob(ctx, jobId, {
      status: 'closed',
      closed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    } as any);
  }

  async archiveJob(ctx: TenantContext, jobId: number): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    return this.updateJob(ctx, jobId, { status: 'archived' } as any);
  }

  async cloneJob(ctx: TenantContext, jobId: number, newJobCode: string): Promise<Job> {
    const original = await this.jobRepo.getById(ctx, jobId);
    if (!original) {
      throw new NotFoundError('Job not found');
    }

    const isUnique = await this.jobRepo.isCodeUnique(ctx, newJobCode);
    if (!isUnique) {
      throw new ValidationError(`Job code '${newJobCode}' already exists`);
    }

    const cloned = await this.jobRepo.create(ctx, {
      uuid: uuidv4(),
      job_code: newJobCode,
      job_title: original.job_title,
      job_description: original.job_description,
      department_id: original.department_id,
      designation_id: original.designation_id,
      location_id: original.location_id,
      job_type: original.job_type,
      experience_level: original.experience_level,
      min_experience_years: original.min_experience_years,
      max_experience_years: original.max_experience_years,
      min_salary: original.min_salary,
      max_salary: original.max_salary,
      currency: original.currency,
      employment_type: original.employment_type,
      no_of_positions: original.no_of_positions,
      job_template_id: original.job_template_id,
      status: 'draft',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Clone skills
    const skills = await this.skillRepo.getByJob(ctx, jobId);
    for (const skill of skills.items) {
      await this.skillRepo.create(ctx, {
        uuid: uuidv4(),
        job_id: cloned.id,
        skill_name: skill.skill_name,
        proficiency_level: skill.proficiency_level,
        is_mandatory: skill.is_mandatory,
      } as any);
    }

    // Clone locations
    const locations = await this.locationRepo.getByJob(ctx, jobId);
    for (const location of locations.items) {
      await this.locationRepo.create(ctx, {
        uuid: uuidv4(),
        job_id: cloned.id,
        location_id: location.location_id,
      } as any);
    }

    return cloned;
  }

  async getJob(ctx: TenantContext, jobId: number): Promise<Job> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    return job;
  }

  async listJobs(ctx: TenantContext, options?: ListQueryOptions) {
    const db = getKnex();
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      await db('jobs')
        .where('organization_id', ctx.organizationId)
        .where('status', 'published')
        .whereNotNull('expiry_date')
        .where('expiry_date', '<', todayStr)
        .update({
          status: 'closed',
          closed_at: db.raw('NOW()'),
        });
    } catch (err) {
      console.warn('Auto-close expired jobs query notice:', err);
    }
    return this.jobRepo.list(ctx, options);
  }

  async getOpenJobs(ctx: TenantContext, options?: ListQueryOptions) {
    return this.jobRepo.getPublished(ctx, options);
  }

  async deleteJob(ctx: TenantContext, jobId: number): Promise<void> {
    const job = await this.jobRepo.getById(ctx, jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    await this.jobRepo.delete(ctx, jobId);
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'JOB',
      entityId: jobId,
    });
  }
}
