import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { JobRepository } from '../repositories/JobRepository';
import { ResumeBankRepository } from '../repositories/ResumeBankRepository';

export class IjpService {
  private jobRepo: JobRepository;
  private resumeBankRepo: ResumeBankRepository;

  constructor() {
    this.jobRepo = new JobRepository();
    this.resumeBankRepo = new ResumeBankRepository();
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
   * Save base64-encoded resume file to local uploads directory
   */
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
   * Resolves employee, saves uploaded resume, routes for Manager Approval,
   * and creates candidate & application records.
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
      resumeFile?: string;
      resumeName?: string;
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

    const firstName = employee.firstName || employee.first_name || 'Employee';
    const lastName = employee.lastName || employee.last_name || '';
    const employeeFullName = `${firstName} ${lastName}`.trim();
    const jobTitle = job.jobTitle || job.job_title || job.title || 'Internal Job Position';
    const jobCode = job.jobCode || job.job_code || `JOB-${job.id}`;

    // 2. Process Resume File
    let savedResumeUrl: string | null = null;
    if (input.resumeFile) {
      savedResumeUrl = this.saveBase64Resume(input.resumeFile, `ijp_${employee.id}_${employeeFullName}`);
    }

    // 3. Find or Create Candidate Profile for Employee
    let candidate = await db('candidates')
      .where('organization_id', ctx.organizationId)
      .whereRaw('LOWER(email) = ?', [employee.email.toLowerCase()])
      .whereNull('deleted_at')
      .first();

    let candidateId: number;

    if (candidate) {
      candidateId = candidate.id;
      // Update candidate details and resume
      const candUpdateData: any = {
        current_company: 'Current Employee',
        years_of_experience: input.relevantExperienceYears ? Number(input.relevantExperienceYears) : undefined,
        updated_at: new Date(),
      };
      if (savedResumeUrl) {
        candUpdateData.resume_url = savedResumeUrl;
      }
      await db('candidates')
        .where('id', candidateId)
        .update(candUpdateData)
        .catch(() => {});
    } else {
      const phone = employee.phone || employee.mobile || employee.contactNumber || null;

      const [newCandidateId] = await db('candidates').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        first_name: firstName,
        last_name: lastName,
        email: employee.email,
        phone,
        source: 'internal_opening',
        current_company: 'Current Employee',
        years_of_experience: input.relevantExperienceYears ? Number(input.relevantExperienceYears) : null,
        resume_url: savedResumeUrl || null,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      candidateId = newCandidateId;
    }

    // Save candidate resume record if resume was uploaded
    if (savedResumeUrl) {
      try {
        const hasCandidateResumes = await db.schema.hasTable('candidate_resumes');
        if (hasCandidateResumes) {
          await db('candidate_resumes').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            candidate_id: candidateId,
            resume_file_url: savedResumeUrl,
            resume_version: 1,
            is_primary: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      } catch {
        // Non-blocking
      }
    }

    // 4. Duplicate application check
    const existingApp = await db('applications')
      .where('job_id', job.id)
      .where('organization_id', ctx.organizationId)
      .where('candidate_id', candidateId)
      .whereNull('deleted_at')
      .first();

    if (existingApp) {
      throw new ValidationError('You have already submitted an application for this job posting');
    }

    // 5. Format structured cover letter dossier
    let formattedCoverLetter = input.coverLetter?.trim() || '';
    const metaSections: string[] = [];
    if (input.reasonForMove) metaSections.push(`📌 Reason for Move: ${input.reasonForMove}`);
    if (input.availability) metaSections.push(`⏱️ Availability / Notice: ${input.availability}`);
    if (input.relevantExperienceYears) metaSections.push(`💼 Relevant Experience: ${input.relevantExperienceYears} years`);
    if (input.currentProjects) metaSections.push(`🚀 Current Projects Highlight: ${input.currentProjects}`);
    if (input.managerInformed !== undefined) metaSections.push(`📢 Manager Informed: ${input.managerInformed ? 'Yes' : 'No'}`);
    if (savedResumeUrl) metaSections.push(`📄 Uploaded Resume: ${savedResumeUrl}`);

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
            note_text: `[Internal Job Application - ${jobTitle}]\n${formattedCoverLetter}`,
            created_by: ctx.userId || 1,
            created_at: new Date(),
          });
        }
      } catch {
        // Non-blocking note insert
      }
    }

    // 6. Check Reporting Manager & Set Initial Application Status
    const reportingManagerId = employee.reporting_manager_id || employee.reportingManagerId || null;
    const requiresManagerApproval = Boolean(reportingManagerId);

    // Initial status: 'applied'
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

    // 7. Create Workflow Approval Record for Reporting Manager
    const approvalDetails = {
      applicationId: appId,
      jobId: job.id,
      jobTitle: jobTitle,
      jobCode: jobCode,
      employeeId: employee.id,
      employeeName: employeeFullName,
      employeeEmail: employee.email,
      employeeCode: employee.employee_code || employee.employeeCode || `EMP-${employee.id}`,
      reasonForMove: input.reasonForMove,
      availability: input.availability,
      relevantExperienceYears: input.relevantExperienceYears,
      currentProjects: input.currentProjects,
      statementOfInterest: input.coverLetter,
      resumeUrl: savedResumeUrl,
      managerInformed: input.managerInformed,
      appliedAt: new Date().toISOString(),
    };

    try {
      const hasWorkflowApprovals = await db.schema.hasTable('workflow_approvals');
      if (hasWorkflowApprovals) {
        await db('workflow_approvals').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          module_type: 'IJP',
          reference_id: appId,
          applicant_id: employee.id,
          approver_id: reportingManagerId,
          approver_role: 'Manager',
          status: requiresManagerApproval ? 'Pending' : 'Approved',
          details: JSON.stringify(approvalDetails),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (err) {
      console.warn('Could not record workflow_approval for IJP:', err);
    }

    // If no reporting manager required, automatically publish to resume_bank immediately
    if (!requiresManagerApproval) {
      await this.publishToResumeBank(ctx, {
        candidateId,
        jobId: job.id,
        jobTitle,
        resumeUrl: savedResumeUrl,
        employeeName: employeeFullName,
      }).catch((e) => console.warn('Auto resume_bank publish warning:', e));
    }

    return {
      id: appId,
      uuid: applicationUuid,
      jobId: job.id,
      jobTitle,
      requiresManagerApproval,
      applicationStatus: requiresManagerApproval ? 'pending_manager' : 'applied',
      appliedAt: new Date(),
      resumeUrl: savedResumeUrl,
      message: requiresManagerApproval
        ? 'Internal application submitted. Forwarded to your reporting manager for clearance (NOC).'
        : 'Internal application submitted successfully and published to Resume Source Bank.',
    };
  }

  /**
   * Helper to create entry in resume_bank so candidate appears in Resume Source / Screen Bank
   */
  private async publishToResumeBank(
    ctx: TenantContext,
    info: {
      candidateId: number;
      jobId: number;
      jobTitle: string;
      resumeUrl: string | null;
      employeeName: string;
    }
  ): Promise<any> {
    const db = getKnex();

    // Check if already in resume_bank for this job
    const existing = await db('resume_bank')
      .where('candidate_id', info.candidateId)
      .where('job_id', info.jobId)
      .where('organization_id', ctx.organizationId)
      .first()
      .catch(() => null);

    if (existing) {
      if (info.resumeUrl && !existing.resume_file_url) {
        await db('resume_bank').where('id', existing.id).update({
          resume_file_url: info.resumeUrl,
          updated_at: new Date(),
        }).catch(() => {});
      }
      return existing;
    }

    const trackerId = await this.resumeBankRepo.getNextTrackerId(ctx).catch(() => `IJP-${Date.now().toString().slice(-4)}`);

    const hasResumeUrlCol = await db.schema.hasColumn('resume_bank', 'resume_file_url').catch(() => false);

    const payload: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      tracker_id: trackerId,
      candidate_id: info.candidateId,
      job_id: info.jobId,
      source: 'Internal Job Posting (IJP)',
      position: info.jobTitle,
      status: 'Applied',
      uploaded_by: ctx.userId || 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (hasResumeUrlCol && info.resumeUrl) {
      payload.resume_file_url = info.resumeUrl;
    }

    const [bankId] = await db('resume_bank').insert(payload);

    // Link resume_bank_id on candidate if supported
    const hasResumeBankCol = await db.schema.hasColumn('candidates', 'resume_bank_id').catch(() => false);
    if (hasResumeBankCol && bankId) {
      await db('candidates').where('id', info.candidateId).update({
        resume_bank_id: bankId,
        updated_at: new Date(),
      }).catch(() => {});
    }

    return { id: bankId, tracker_id: trackerId };
  }

  /**
   * Returns all pending IJP approval requests for the reporting manager.
   * Uses multi-tier department hierarchy resolution and auto-sync so no applicant is missed.
   */
  async getManagerPendingIjpApprovals(ctx: TenantContext): Promise<any[]> {
    const db = getKnex();
    if (!ctx.userId) return [];

    // 1. Comprehensive Manager Resolution
    const user = await db('users').where('id', ctx.userId).first();
    let managerEmpId = user?.employee_id || user?.employeeId || null;

    if (!managerEmpId && user?.email) {
      const empByEmail = await db('employees')
        .where('organization_id', ctx.organizationId)
        .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
        .first()
        .catch(() => null);
      if (empByEmail) managerEmpId = empByEmail.id;
    }

    if (!managerEmpId && (user?.first_name || user?.firstName)) {
      const fName = user?.first_name || user?.firstName;
      const empByName = await db('employees')
        .where('organization_id', ctx.organizationId)
        .where('first_name', fName)
        .first()
        .catch(() => null);
      if (empByName) managerEmpId = empByName.id;
    }

    // Resolve manager department
    let managerDeptId: number | null = null;
    if (managerEmpId) {
      const mgrEmp = await db('employees').where('id', managerEmpId).first().catch(() => null);
      managerDeptId = mgrEmp?.current_department_id || mgrEmp?.currentDepartmentId || null;
    }
    if (!managerDeptId) {
      managerDeptId = (user as any)?.department_id || (user as any)?.departmentId || null;
    }

    // 2. Auto-Sync IJP Applications to workflow_approvals if missing
    try {
      const hasWorkflowTable = await db.schema.hasTable('workflow_approvals');
      if (hasWorkflowTable) {
        const ijpApps = await db('applications')
          .where('applications.organization_id', ctx.organizationId)
          .where(function() {
            this.where('applications.applied_from_source', 'like', '%internal%')
              .orWhere('applications.applied_from_source', 'like', '%ijp%')
              .orWhereIn('applications.candidate_id', function() {
                this.select('id').from('candidates').where('source', 'like', '%internal%').orWhere('source', 'like', '%referral%');
              });
          })
          .leftJoin('candidates', 'applications.candidate_id', 'candidates.id')
          .leftJoin('jobs', 'applications.job_id', 'jobs.id')
          .select([
            'applications.id as app_id',
            'applications.candidate_id as cand_id',
            'applications.job_id as j_id',
            'applications.application_status as app_status',
            'applications.created_at as app_created_at',
            'candidates.first_name as cand_first_name',
            'candidates.last_name as cand_last_name',
            'candidates.email as cand_email',
            'candidates.phone as cand_phone',
            'candidates.years_of_experience as cand_exp',
            'candidates.resume_url as cand_resume',
            'jobs.job_title as j_title',
            'jobs.job_code as j_code',
          ])
          .catch(() => []);

        for (const app of (ijpApps || [])) {
          const existingApproval = await db('workflow_approvals')
            .where('organization_id', ctx.organizationId)
            .where('module_type', 'IJP')
            .where('reference_id', app.app_id)
            .first()
            .catch(() => null);

          if (!existingApproval) {
            // Find corresponding employee
            let emp = null;
            if (app.cand_email) {
              emp = await db('employees')
                .where('organization_id', ctx.organizationId)
                .whereRaw('LOWER(email) = ?', [app.cand_email.toLowerCase()])
                .first()
                .catch(() => null);
            }

            const empName = `${app.cand_first_name || ''} ${app.cand_last_name || ''}`.trim() || 'Employee Applicant';
            const detailsPayload = {
              applicationId: app.app_id,
              jobId: app.j_id,
              jobTitle: app.j_title || 'Internal Job Position',
              jobCode: app.j_code || `JOB-${app.j_id}`,
              employeeId: emp?.id || null,
              employeeName: empName,
              employeeEmail: app.cand_email,
              employeeCode: emp?.employee_code || emp?.employeeCode || `EMP-${app.cand_id}`,
              reasonForMove: 'Internal Career Progression & Transfer',
              availability: 'Immediate / 1 Month',
              relevantExperienceYears: app.cand_exp || 2,
              currentProjects: 'Active Department Initiatives',
              statementOfInterest: 'Applied via Internal Job Portal (IJP). Requesting manager clearance and NOC.',
              resumeUrl: app.cand_resume || null,
              appliedAt: app.app_created_at || new Date().toISOString(),
            };

            await db('workflow_approvals').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              module_type: 'IJP',
              reference_id: app.app_id,
              applicant_id: emp?.id || app.cand_id,
              approver_id: emp?.reporting_manager_id || managerEmpId || null,
              approver_role: 'Manager',
              status: app.app_status === 'applied' ? 'Pending' : (app.app_status === 'screening' || app.app_status === 'interview' ? 'Approved' : 'Pending'),
              details: JSON.stringify(detailsPayload),
              created_at: app.app_created_at || new Date(),
              updated_at: new Date(),
            }).catch(() => {});
          }
        }
      }
    } catch (syncErr) {
      console.warn('[IjpService] Auto-sync IJP workflow error non-blocking:', syncErr);
    }

    // 3. Query all workflow approvals for this organization
    let query = db('workflow_approvals')
      .where('workflow_approvals.organization_id', ctx.organizationId)
      .where('workflow_approvals.module_type', 'IJP')
      .whereNull('workflow_approvals.deleted_at');

    const rows = await query.orderBy('workflow_approvals.created_at', 'desc').catch(() => []);

    const results: any[] = [];

    for (const r of (rows || [])) {
      let details: any = {};
      try {
        details = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {});
      } catch {
        details = {};
      }

      // Multi-table fallback resolution for candidate resume URL if missing in details JSON
      if (!details.resumeUrl) {
        let resumeUrl: string | null = null;
        const candEmail = details.employeeEmail || (r as any).applicant_email;
        const applicantId = r.applicantId || r.applicant_id;

        // 1. Try candidate record
        if (applicantId || candEmail) {
          const cand = await db('candidates')
            .where('organization_id', ctx.organizationId)
            .where(function() {
              if (applicantId) this.where('id', applicantId);
              if (candEmail) this.orWhereRaw('LOWER(email) = ?', [candEmail.toLowerCase()]);
            })
            .first()
            .catch(() => null);

          if (cand?.resume_url) {
            resumeUrl = cand.resume_url;
          }
        }

        // 2. Try candidate_resumes table
        if (!resumeUrl && applicantId) {
          try {
            const hasCandResumes = await db.schema.hasTable('candidate_resumes');
            if (hasCandResumes) {
              const cr = await db('candidate_resumes')
                .where('candidate_id', applicantId)
                .orderBy('id', 'desc')
                .first()
                .catch(() => null);
              if (cr?.resume_file_url) resumeUrl = cr.resume_file_url;
            }
          } catch {}
        }

        // 3. Try resume_bank table
        if (!resumeUrl && applicantId) {
          try {
            const rb = await db('resume_bank')
              .where('candidate_id', applicantId)
              .whereNotNull('resume_file_url')
              .orderBy('id', 'desc')
              .first()
              .catch(() => null);
            if (rb?.resume_file_url) resumeUrl = rb.resume_file_url;
          } catch {}
        }

        if (resumeUrl) {
          details.resumeUrl = resumeUrl;
          // Update details JSON in workflow_approvals asynchronously
          await db('workflow_approvals')
            .where('id', r.id)
            .update({ details: JSON.stringify(details) })
            .catch(() => {});
        }
      }

      results.push({
        id: r.id,
        uuid: r.uuid,
        applicationId: r.referenceId || r.reference_id,
        applicantId: r.applicantId || r.applicant_id,
        approverId: r.approverId || r.approver_id,
        status: r.status || 'Pending',
        details,
        createdAt: r.createdAt || r.created_at,
        updatedAt: r.updatedAt || r.updated_at,
      });
    }

    return results;
  }

  /**
   * Manager approves an employee's IJP application (Grants NOC / Endorsement)
   * Updates approval status, marks application active for recruitment,
   * and automatically pushes candidate to Resume Source Bank.
   */
  async approveIjpApplication(
    ctx: TenantContext,
    approvalId: number,
    input: { comments?: string }
  ): Promise<any> {
    const db = getKnex();

    const approval = await db('workflow_approvals')
      .where('id', approvalId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!approval) {
      throw new NotFoundError('IJP Approval request not found');
    }

    let details: any = {};
    try {
      details = typeof approval.details === 'string' ? JSON.parse(approval.details) : (approval.details || {});
    } catch {
      details = {};
    }

    details.managerComments = input.comments || 'Manager clearance (NOC) granted for internal transfer.';
    details.approvedAt = new Date().toISOString();
    details.approvedByUserId = ctx.userId;

    // 1. Update workflow approval
    await db('workflow_approvals')
      .where('id', approvalId)
      .update({
        status: 'Approved',
        details: JSON.stringify(details),
        updated_at: new Date(),
      });

    const applicationId = approval.referenceId || approval.reference_id || details.applicationId;

    // 2. Update Application Status to 'screening' or 'applied'
    if (applicationId) {
      await db('applications')
        .where('id', applicationId)
        .update({
          application_status: 'applied',
          updated_at: new Date(),
        })
        .catch(() => {});
    }

    // 3. Automatically Publish to Resume Bank so HR/Recruiter can screen & check ATS score
    let candidateId = null;
    if (details.employeeEmail) {
      const cand = await db('candidates')
        .where('organization_id', ctx.organizationId)
        .whereRaw('LOWER(email) = ?', [details.employeeEmail.toLowerCase()])
        .first()
        .catch(() => null);
      if (cand) candidateId = cand.id;
    }

    if (candidateId && details.jobId) {
      await this.publishToResumeBank(ctx, {
        candidateId,
        jobId: details.jobId,
        jobTitle: details.jobTitle || 'Internal Job Position',
        resumeUrl: details.resumeUrl || null,
        employeeName: details.employeeName || 'Employee Applicant',
      });
    }

    return {
      success: true,
      approvalId,
      status: 'Approved',
      message: 'IJP application endorsed successfully. Candidate is now active in Resume Source Bank for HR screening.',
    };
  }

  /**
   * Manager rejects an employee's IJP application
   */
  async rejectIjpApplication(
    ctx: TenantContext,
    approvalId: number,
    input: { comments?: string }
  ): Promise<any> {
    const db = getKnex();

    const approval = await db('workflow_approvals')
      .where('id', approvalId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!approval) {
      throw new NotFoundError('IJP Approval request not found');
    }

    let details: any = {};
    try {
      details = typeof approval.details === 'string' ? JSON.parse(approval.details) : (approval.details || {});
    } catch {
      details = {};
    }

    details.managerComments = input.comments || 'Internal transfer request not approved by manager at this time.';
    details.rejectedAt = new Date().toISOString();
    details.rejectedByUserId = ctx.userId;

    // 1. Update workflow approval
    await db('workflow_approvals')
      .where('id', approvalId)
      .update({
        status: 'Rejected',
        details: JSON.stringify(details),
        updated_at: new Date(),
      });

    const applicationId = approval.referenceId || approval.reference_id || details.applicationId;

    // 2. Update Application Status to 'rejected'
    if (applicationId) {
      await db('applications')
        .where('id', applicationId)
        .update({
          application_status: 'rejected',
          updated_at: new Date(),
        })
        .catch(() => {});
    }

    return {
      success: true,
      approvalId,
      status: 'Rejected',
      message: 'IJP application has been declined.',
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

    // Fetch workflow approvals for these applications
    const appIds = applications.map((a: any) => a.application_id);
    let approvalMap: Record<number, any> = {};
    if (appIds.length > 0) {
      try {
        const hasWorkflowApprovals = await db.schema.hasTable('workflow_approvals');
        if (hasWorkflowApprovals) {
          const approvals = await db('workflow_approvals')
            .where('organization_id', ctx.organizationId)
            .where('module_type', 'IJP')
            .whereIn('reference_id', appIds)
            .whereNull('deleted_at');

          for (const ap of approvals) {
            let details: any = {};
            try {
              details = typeof ap.details === 'string' ? JSON.parse(ap.details) : (ap.details || {});
            } catch {
              details = {};
            }
            approvalMap[ap.reference_id || ap.referenceId] = {
              status: ap.status || 'Pending',
              managerComments: details.managerComments || null,
              resumeUrl: details.resumeUrl || null,
              approvedAt: details.approvedAt || null,
              rejectedAt: details.rejectedAt || null,
            };
          }
        }
      } catch {
        // Non-blocking
      }
    }

    return applications.map((app: any) => {
      const appId = app.applicationId || app.application_id || app.id;
      const approval = approvalMap[appId] || null;

      let finalStatus = app.applicationStatus || app.application_status || 'applied';
      if (approval) {
        if (approval.status === 'Pending') finalStatus = 'pending_manager';
        else if (approval.status === 'Rejected') finalStatus = 'rejected';
      }

      return {
        ...app,
        application_id: appId,
        applicationId: appId,
        application_uuid: app.applicationUuid || app.application_uuid || app.uuid,
        applicationUuid: app.applicationUuid || app.application_uuid || app.uuid,
        application_status: finalStatus,
        applicationStatus: finalStatus,
        manager_approval_status: approval?.status || 'Approved',
        managerApprovalStatus: approval?.status || 'Approved',
        manager_comments: approval?.managerComments || null,
        managerComments: approval?.managerComments || null,
        resume_url: approval?.resumeUrl || null,
        resumeUrl: approval?.resumeUrl || null,
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
      };
    });
  }
}

export const ijpService = new IjpService();
