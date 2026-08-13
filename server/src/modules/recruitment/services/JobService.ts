import { v4 as uuidv4 } from 'uuid';
import { JobRepository, type Job } from '../repositories/JobRepository';
import { JobSkillRepository, type JobSkill } from '../repositories/SupportingRepository';
import { JobLocationRepository, type JobLocation } from '../repositories/SupportingRepository';
import { MrfRequestRepository } from '../repositories/MrfRequestRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

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
      jobTemplateId?: number;
      isInternal?: boolean;
      isPublishedExternal?: boolean;
      skills?: Array<{ name: string; proficiency: string; isMandatory: boolean }>;
      locations?: number[];
    }
  ): Promise<Job> {
    const isUnique = await this.jobRepo.isCodeUnique(ctx, input.jobCode);
    if (!isUnique) {
      throw new ValidationError(`Job code '${input.jobCode}' already exists`);
    }

    if (input.mrfRequestId) {
      const mrf = await this.mrfRepo.getById(ctx, input.mrfRequestId);
      if (!mrf) {
        throw new ValidationError(`Linked MRF Request with ID ${input.mrfRequestId} not found`);
      }
      if (mrf.stage !== 'Approved') {
        throw new ValidationError('A job posting can only be created for an APPROVED MRF Request');
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
      job_type: input.jobType,
      experience_level: input.experienceLevel,
      min_experience_years: input.minExperienceYears || null,
      max_experience_years: input.maxExperienceYears || null,
      min_salary: input.minSalary || null,
      max_salary: input.maxSalary || null,
      currency: input.currency,
      employment_type: input.employmentType,
      no_of_positions: input.noOfPositions,
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

    const updated = await this.jobRepo.update(ctx, jobId, {
      ...input,
      updated_by: ctx.userId,
    } as any);

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
