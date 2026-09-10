import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { JobRepository } from '../repositories/JobRepository';

export class IjpService {
  private jobRepo: JobRepository;

  constructor() {
    this.jobRepo = new JobRepository();
  }

  /**
   * Helper to resolve the employee record for the authenticated user context.
   */
  private async resolveEmployee(ctx: TenantContext): Promise<any> {
    const db = getKnex();
    if (!ctx.userId) {
      throw new ValidationError('Authentication required to access internal job portal');
    }

    const user = await db('users')
      .where('id', ctx.userId)
      .first();

    let employee = null;
    const empId = user?.employeeId || user?.employee_id;

    if (empId) {
      employee = await db('employees')
        .where('id', empId)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();
    }

    if (!employee && user?.email) {
      employee = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
        .whereNull('deleted_at')
        .first();
    }

    if (!employee) {
      throw new NotFoundError('Employee record not found for the current user');
    }

    return employee;
  }

  /**
   * Lists all published internal jobs for the current organization.
   */
  async listInternalJobs(ctx: TenantContext, options?: ListQueryOptions): Promise<any> {
    const db = getKnex();
    const page = Math.max(1, Number(options?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options?.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    let query = db('jobs')
      .where('jobs.organization_id', ctx.organizationId)
      .where('jobs.status', 'published')
      .where('jobs.is_internal', true)
      .whereNull('jobs.deleted_at');

    if (options?.search) {
      const s = `%${options.search.trim()}%`;
      query = query.andWhere((q) => {
        q.where('jobs.job_title', 'like', s)
          .orWhere('jobs.job_code', 'like', s)
          .orWhere('jobs.job_description', 'like', s);
      });
    }

    if (options?.filters) {
      if (options.filters.department_id) {
        query = query.where('jobs.department_id', options.filters.department_id);
      }
      if (options.filters.job_type) {
        query = query.where('jobs.job_type', options.filters.job_type);
      }
      if (options.filters.experience_level) {
        query = query.where('jobs.experience_level', options.filters.experience_level);
      }
      if (options.filters.employment_type) {
        query = query.where('jobs.employment_type', options.filters.employment_type);
      }
    }

    const countQuery = query.clone().clearSelect().count('* as count').first();
    const countRes = await countQuery;
    const total = parseInt(String((countRes as any)?.count || 0), 10);

    const jobs = await query
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .leftJoin('designations', 'jobs.designation_id', 'designations.id')
      .leftJoin('locations', 'jobs.location_id', 'locations.id')
      .select(
        'jobs.*',
        'departments.name as department_name',
        'designations.name as designation_name',
        'locations.name as location_name'
      )
      .orderBy('jobs.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    // Fetch required skills for these jobs if table exists
    const jobIds = jobs.map((j: any) => j.id);
    let jobSkillsMap: Record<number, string[]> = {};
    if (jobIds.length > 0) {
      try {
        const hasJobSkills = await db.schema.hasTable('job_skills');
        if (hasJobSkills) {
          const skills = await db('job_skills')
            .whereIn('job_id', jobIds)
            .select('job_id', 'skill_name');
          for (const item of skills) {
            if (!jobSkillsMap[item.job_id]) jobSkillsMap[item.job_id] = [];
            jobSkillsMap[item.job_id].push(item.skill_name);
          }
        }
      } catch {
        // Ignore if skill lookup fails
      }
    }

    const items = jobs.map((job: any) => {
      const skills = jobSkillsMap[job.id] || [];
      const title = job.jobTitle || job.job_title || job.title || 'Untitled Position';
      const code = job.jobCode || job.job_code || `JOB-${job.id}`;
      const description = job.jobDescription || job.job_description || job.description || '';
      const dept = job.departmentName || job.department_name || null;
      const desig = job.designationName || job.designation_name || null;
      const loc = job.locationName || job.location_name || null;
      const empType = job.employmentType || job.employment_type || 'onsite';
      const jType = job.jobType || job.job_type || 'full_time';
      const expLevel = job.experienceLevel || job.experience_level || 'mid';
      const minSalary = job.minSalary ?? job.min_salary ?? null;
      const maxSalary = job.maxSalary ?? job.max_salary ?? null;
      const positions = job.noOfPositions || job.no_of_positions || 1;
      const expiry = job.expiryDate || job.expiry_date || null;

      return {
        ...job,
        id: Number(job.id),
        uuid: job.uuid,
        job_code: code,
        jobCode: code,
        job_title: title,
        jobTitle: title,
        job_description: description,
        jobDescription: description,
        department_name: dept,
        departmentName: dept,
        designation_name: desig,
        designationName: desig,
        location_name: loc,
        locationName: loc,
        employment_type: empType,
        employmentType: empType,
        job_type: jType,
        jobType: jType,
        experience_level: expLevel,
        experienceLevel: expLevel,
        min_salary: minSalary,
        minSalary: minSalary,
        max_salary: maxSalary,
        maxSalary: maxSalary,
        currency: job.currency || 'INR',
        no_of_positions: positions,
        noOfPositions: positions,
        is_internal: true,
        isInternal: true,
        expiry_date: expiry,
        expiryDate: expiry,
        skills,
      };
    });

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

  /**
   * Allows an active employee to apply to an internal job.
   * Resolves employee from ctx.userId, blocks duplicate applications,
   * creates candidate profile if not present, and creates application record.
   */
  async applyToJob(
    ctx: TenantContext,
    input: {
      jobId: number;
      coverLetter?: string;
      reasonForMove?: string;
      availability?: string;
      relevantExperienceYears?: number | string;
      currentProjects?: string;
      managerInformed?: boolean;
    }
  ): Promise<any> {
    const db = getKnex();
    const employee = await this.resolveEmployee(ctx);

    const empStatus = employee.status || 'active';
    if (empStatus !== 'active' && empStatus !== 'probation') {
      throw new ValidationError('Only active or probation employees can apply for internal jobs');
    }

    // 1. Validate Job
    const job = await db('jobs')
      .where('id', input.jobId)
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .first();

    if (!job) {
      throw new NotFoundError('Job opening not found');
    }

    const isInternal = Boolean(job.isInternal ?? job.is_internal);
    if (job.status !== 'published' || !isInternal) {
      throw new ValidationError('This job is not currently accepting internal applications');
    }

    const expiryDate = job.expiryDate || job.expiry_date;
    if (expiryDate && new Date(expiryDate) < new Date()) {
      throw new ValidationError('This job posting has expired');
    }

    // 2. Find or Create Candidate Profile for Employee
    let candidate = await db('candidates')
      .where('organization_id', ctx.organizationId)
      .whereRaw('LOWER(email) = ?', [employee.email.toLowerCase()])
      .whereNull('deleted_at')
      .first();

    let candidateId: number;

    if (candidate) {
      candidateId = candidate.id;
    } else {
      const firstName = employee.firstName || employee.first_name || 'Employee';
      const lastName = employee.lastName || employee.last_name || '';
      const phone = employee.phone || employee.mobile || employee.contactNumber || null;

      const [newCandidateId] = await db('candidates').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        first_name: firstName,
        last_name: lastName,
        email: employee.email,
        phone,
        source: 'employee_referral',
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      candidateId = newCandidateId;
    }

    // 3. Duplicate application check
    const existingApp = await db('applications')
      .where('job_id', job.id)
      .where('organization_id', ctx.organizationId)
      .where('candidate_id', candidateId)
      .whereNull('deleted_at')
      .first();

    if (existingApp) {
      throw new ValidationError('You have already submitted an application for this job posting');
    }

    // 4. Format structured cover letter dossier
    let formattedCoverLetter = input.coverLetter?.trim() || '';
    const metaSections: string[] = [];
    if (input.reasonForMove) metaSections.push(`📌 Reason for Move: ${input.reasonForMove}`);
    if (input.availability) metaSections.push(`⏱️ Availability / Notice: ${input.availability}`);
    if (input.relevantExperienceYears) metaSections.push(`💼 Relevant Experience: ${input.relevantExperienceYears} years`);
    if (input.currentProjects) metaSections.push(`🚀 Current Projects Highlight: ${input.currentProjects}`);
    if (input.managerInformed !== undefined) metaSections.push(`📢 Manager Informed: ${input.managerInformed ? 'Yes' : 'No'}`);

    if (metaSections.length > 0) {
      formattedCoverLetter = metaSections.join('\n') + (formattedCoverLetter ? `\n\n📝 Statement of Interest:\n${formattedCoverLetter}` : '');
    }

    // Store candidate note with the rich application dossier
    if (formattedCoverLetter) {
      try {
        const hasNotesTable = await db.schema.hasTable('candidate_notes');
        if (hasNotesTable) {
          await db('candidate_notes').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            candidate_id: candidateId,
            note_text: `[Internal Job Application - ${job.jobTitle || job.job_title || 'Position'}]\n${formattedCoverLetter}`,
            created_by: ctx.userId || 1,
            created_at: new Date(),
          });
        }
      } catch {
        // Non-blocking note insert
      }
    }

    // 5. Create Application Record
    const applicationUuid = uuidv4();
    const [appId] = await db('applications').insert({
      uuid: applicationUuid,
      organization_id: ctx.organizationId,
      candidate_id: candidateId,
      job_id: job.id,
      application_status: 'applied',
      applied_at: new Date(),
      applied_from_source: 'internal_employee',
      initial_screening_status: 'pending',
      created_by: ctx.userId || 1,
      updated_by: ctx.userId || 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      id: appId,
      uuid: applicationUuid,
      jobId: job.id,
      jobTitle: job.jobTitle || job.job_title || job.title || 'Job Opening',
      applicationStatus: 'applied',
      appliedAt: new Date(),
      message: 'Internal job application submitted successfully',
    };
  }

  /**
   * Returns all IJP applications for the currently logged-in employee.
   */
  async getMyApplications(ctx: TenantContext): Promise<any> {
    const db = getKnex();
    const employee = await this.resolveEmployee(ctx);

    const candidate = await db('candidates')
      .where('organization_id', ctx.organizationId)
      .whereRaw('LOWER(email) = ?', [employee.email.toLowerCase()])
      .whereNull('deleted_at')
      .first();

    if (!candidate) {
      return [];
    }

    const applications = await db('applications')
      .join('jobs', 'applications.job_id', 'jobs.id')
      .leftJoin('departments', 'jobs.department_id', 'departments.id')
      .leftJoin('designations', 'jobs.designation_id', 'designations.id')
      .leftJoin('locations', 'jobs.location_id', 'locations.id')
      .where('applications.organization_id', ctx.organizationId)
      .where('applications.candidate_id', candidate.id)
      .whereNull('applications.deleted_at')
      .select(
        'applications.id as application_id',
        'applications.uuid as application_uuid',
        'applications.application_status',
        'applications.applied_at',
        'jobs.id as job_id',
        'jobs.job_code',
        'jobs.job_title',
        'jobs.job_type',
        'jobs.experience_level',
        'jobs.employment_type',
        'jobs.status as job_status',
        'departments.name as department_name',
        'designations.name as designation_name',
        'locations.name as location_name'
      )
      .orderBy('applications.created_at', 'desc');

    // Fetch latest candidate note for dossier preview
    let latestNoteText: string | null = null;
    try {
      const hasNotesTable = await db.schema.hasTable('candidate_notes');
      if (hasNotesTable) {
        const note = await db('candidate_notes')
          .where('candidate_id', candidate.id)
          .where('organization_id', ctx.organizationId)
          .orderBy('created_at', 'desc')
          .first();
        if (note) {
          latestNoteText = note.noteText || note.note_text || null;
        }
      }
    } catch {
      // Non-blocking
    }

    return applications.map((app: any) => ({
      ...app,
      application_id: app.applicationId || app.application_id || app.id,
      applicationId: app.applicationId || app.application_id || app.id,
      application_uuid: app.applicationUuid || app.application_uuid || app.uuid,
      applicationUuid: app.applicationUuid || app.application_uuid || app.uuid,
      application_status: app.applicationStatus || app.application_status || 'applied',
      applicationStatus: app.applicationStatus || app.application_status || 'applied',
      applied_at: app.appliedAt || app.applied_at || app.created_at,
      appliedAt: app.appliedAt || app.applied_at || app.created_at,
      cover_letter: latestNoteText,
      coverLetter: latestNoteText,
      job_id: app.jobId || app.job_id,
      jobId: app.jobId || app.job_id,
      job_code: app.jobCode || app.job_code || `JOB-${app.jobId || app.job_id}`,
      jobCode: app.jobCode || app.job_code || `JOB-${app.jobId || app.job_id}`,
      job_title: app.jobTitle || app.job_title || 'Untitled Role',
      jobTitle: app.jobTitle || app.job_title || 'Untitled Role',
      job_type: app.jobType || app.job_type || 'full_time',
      jobType: app.jobType || app.job_type || 'full_time',
      experience_level: app.experienceLevel || app.experience_level || 'mid',
      experienceLevel: app.experienceLevel || app.experience_level || 'mid',
      employment_type: app.employmentType || app.employment_type || 'onsite',
      employmentType: app.employmentType || app.employment_type || 'onsite',
      job_status: app.jobStatus || app.job_status || 'published',
      jobStatus: app.jobStatus || app.job_status || 'published',
      department_name: app.departmentName || app.department_name || null,
      departmentName: app.departmentName || app.department_name || null,
      designation_name: app.designationName || app.designation_name || null,
      designationName: app.designationName || app.designation_name || null,
      location_name: app.locationName || app.location_name || null,
      locationName: app.locationName || app.location_name || null,
    }));
  }
}

export const ijpService = new IjpService();
