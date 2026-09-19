import { getKnex } from '../../../db/knex';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { ReferralRepository } from '../repositories/ReferralRepository';
import { MrfRequestRepository } from '../repositories/MrfRequestRepository';
import type { JobReferenceApplyInput } from '../types/mrf';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class JobReferenceService {
  private candidateRepo: CandidateRepository;
  private applicationRepo: ApplicationRepository;
  private referralRepo: ReferralRepository;
  private mrfRepo: MrfRequestRepository;

  private saveBase64File(dataUrl: string | null | undefined, prefix: string): string | null {
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
      console.log(`📄 Saved resume/signature file to disk: ${filePath}`);

      return `/uploads/resumes/${filename}`;
    } catch (err) {
      console.error(`Failed to save base64 file (${prefix}):`, err);
      return dataUrl;
    }
  }

  constructor() {
    this.candidateRepo = new CandidateRepository();
    this.applicationRepo = new ApplicationRepository();
    this.referralRepo = new ReferralRepository();
    this.mrfRepo = new MrfRequestRepository();
  }

  /**
   * Get public-facing job reference data for a given MRF ID or job ID / code.
   * Returns limited public info (no salary, no internal notes).
   */
  async getPublicJobData(mrfId: number | string) {
    const db = getKnex();
    const idStr = String(mrfId).trim();
    const idNum = !isNaN(Number(idStr)) ? Number(idStr) : null;

    // 1. Try finding in jobs table (created from Job Management) first
    let jobQuery = db('jobs as j')
      .leftJoin('departments as d', 'j.department_id', 'd.id')
      .leftJoin('designations as des', 'j.designation_id', 'des.id')
      .leftJoin('mrf_requests as m', 'j.mrf_request_id', 'm.id')
      .whereNull('j.deleted_at')
      .where((q) => {
        if (idNum !== null) {
          q.where('j.id', idNum)
           .orWhere('j.job_code', idStr)
           .orWhere('j.mrf_request_id', idNum);
        } else {
          q.where('j.job_code', idStr)
           .orWhere('j.uuid', idStr);
        }
      });

    const job = await jobQuery
      .select(
        'j.*',
        'd.name as dept_name',
        'des.name as desig_name',
        'm.qualification_required as mrf_qualification',
        'm.experience_desired as mrf_experience',
        'm.skills as mrf_skills',
        'm.target_closure_date as mrf_closure_date'
      )
      .first();

    if (job) {
      const jobCode = (job as any).jobCode || (job as any).job_code || '';
      const jobTitle = (job as any).jobTitle || (job as any).job_title || `Position ${jobCode}`;
      const jobOrgId = (job as any).organizationId || (job as any).organization_id;
      const jobNoPos = (job as any).noOfPositions || (job as any).no_of_positions || 1;
      const jobDeptId = (job as any).departmentId || (job as any).department_id;
      const jobDeptName = (job as any).deptName || (job as any).dept_name || '';
      const jobDesigName = (job as any).desigName || (job as any).desig_name || '';
      const jobType = (job as any).jobType || (job as any).job_type || '';
      const jobEmpType = (job as any).employmentType || (job as any).employment_type || '';
      const jobMinExp = (job as any).minExperienceYears || (job as any).min_experience_years;
      const jobMaxExp = (job as any).maxExperienceYears || (job as any).max_experience_years;
      const jobExpLevel = (job as any).experienceLevel || (job as any).experience_level || '';
      const jobDesc = (job as any).jobDescription || (job as any).job_description || '';
      const jobStatus = (job as any).status;
      const jobExpiry = (job as any).expiryDate || (job as any).expiry_date || (job as any).mrf_closure_date || null;
      const jobCreatedAt = (job as any).createdAt || (job as any).created_at;

      const effectiveEmpType = jobType === 'full_time' ? 'Full Time'
        : jobType === 'part_time' ? 'Part Time'
        : jobType === 'contract' ? 'Contract'
        : jobType === 'internship' ? 'Internship'
        : (jobEmpType || jobType || 'Full Time');

      // Fetch skills from job_skills, fallback to mrf_skills
      let parsedSkills: any[] = [];
      try {
        const skillRows = await db('job_skills').where('job_id', job.id).select('skill_name');
        parsedSkills = skillRows.map((r: any) => (r as any).skillName || (r as any).skill_name).filter(Boolean);
      } catch { /* ignore */ }

      if (parsedSkills.length === 0 && (job as any).mrf_skills) {
        const rawSkills = (job as any).mrf_skills;
        if (typeof rawSkills === 'string') {
          try {
            parsedSkills = JSON.parse(rawSkills);
          } catch {
            parsedSkills = rawSkills.split(',').map((s: string) => s.trim());
          }
        } else if (Array.isArray(rawSkills)) {
          parsedSkills = rawSkills;
        }
      }

      const qual = (job as any).mrf_qualification || 'Graduate / Diploma';
      const exp = jobMinExp ? `${jobMinExp}-${jobMaxExp || 5} Years` : ((job as any).mrf_experience || jobExpLevel || 'Experienced');

      return {
        id: job.id,
        organizationId: jobOrgId,
        organization_id: jobOrgId,
        mrNumber: jobCode,
        mr_number: jobCode,
        positionTitle: jobTitle,
        position_title: jobTitle,
        numberOfPositions: jobNoPos,
        number_of_positions: jobNoPos,
        departmentId: jobDeptId,
        department_id: jobDeptId,
        departmentName: jobDeptName,
        department_name: jobDeptName,
        designationName: jobDesigName,
        designation_name: jobDesigName,
        employmentType: effectiveEmpType,
        employment_type: effectiveEmpType,
        qualificationRequired: qual,
        qualification_required: qual,
        experienceDesired: exp,
        experience_desired: exp,
        skills: parsedSkills,
        jobDescription: jobDesc,
        job_description: jobDesc,
        status: jobStatus,
        targetClosureDate: jobExpiry,
        target_closure_date: jobExpiry,
        createdAt: jobCreatedAt,
        created_at: jobCreatedAt,
      };
    }

    // 2. Fallback: Try finding in mrf_requests
    const mrf = await db('mrf_requests')
      .whereNull('deleted_at')
      .where((q) => {
        if (idNum !== null) {
          q.where('id', idNum)
           .orWhere('mr_number', idStr)
           .orWhere('mr_number', `MR-${idStr}`)
           .orWhere('mr_number', `MR-0${idStr}`)
           .orWhere('mr_number', `MR-00${idStr}`);
        } else {
          q.where('mr_number', idStr)
           .orWhere('mr_number', 'like', idStr)
           .orWhere('uuid', idStr);
        }
      })
      .first();

    if (mrf) {
      const mrfDeptId = (mrf as any).departmentId || (mrf as any).department_id;
      const mrfGradeId = (mrf as any).gradeId || (mrf as any).grade_id;
      const mrfMrNumber = (mrf as any).mrNumber || (mrf as any).mr_number || '';
      const mrfOrgId = (mrf as any).organizationId || (mrf as any).organization_id;
      const mrfPositionTitle = (mrf as any).positionTitle || (mrf as any).position_title || `Position ${mrfMrNumber}`;
      const mrfNumPositions = (mrf as any).numberOfPositions || (mrf as any).number_of_positions || 1;
      const mrfEmpType = (mrf as any).employmentType || (mrf as any).employment_type || 'Full Time';
      const mrfQual = (mrf as any).qualificationRequired || (mrf as any).qualification_required || '';
      const mrfExp = (mrf as any).experienceDesired || (mrf as any).experience_desired || '';
      const mrfJobDesc = (mrf as any).jobDescription || (mrf as any).job_description || '';
      const mrfStatus = (mrf as any).status;
      const mrfClosureDate = (mrf as any).targetClosureDate || (mrf as any).target_closure_date || null;
      const mrfCreatedAt = (mrf as any).createdAt || (mrf as any).created_at;

      let departmentName = '';
      if (mrfDeptId) {
        const dept = await db('departments').where('id', mrfDeptId).first();
        departmentName = (dept as any)?.name || '';
      }

      let designationName = '';
      if (mrfGradeId) {
        const desig = await db('designations').where('id', mrfGradeId).first();
        designationName = (desig as any)?.title || (desig as any)?.name || '';
      }

      let parsedSkills: any = null;
      const rawSkills = (mrf as any).skills;
      if (rawSkills) {
        if (typeof rawSkills === 'string') {
          try {
            parsedSkills = JSON.parse(rawSkills);
          } catch {
            parsedSkills = rawSkills.split(',').map((s: string) => s.trim());
          }
        } else {
          parsedSkills = rawSkills;
        }
      }

      return {
        id: mrf.id,
        organizationId: mrfOrgId,
        organization_id: mrfOrgId,
        mrNumber: mrfMrNumber,
        mr_number: mrfMrNumber,
        positionTitle: mrfPositionTitle,
        position_title: mrfPositionTitle,
        numberOfPositions: mrfNumPositions,
        number_of_positions: mrfNumPositions,
        departmentId: mrfDeptId,
        department_id: mrfDeptId,
        departmentName,
        department_name: departmentName,
        designationName,
        designation_name: designationName,
        employmentType: mrfEmpType,
        employment_type: mrfEmpType,
        qualificationRequired: mrfQual,
        qualification_required: mrfQual,
        experienceDesired: mrfExp,
        experience_desired: mrfExp,
        skills: parsedSkills || [],
        jobDescription: mrfJobDesc,
        job_description: mrfJobDesc,
        status: mrfStatus,
        targetClosureDate: mrfClosureDate,
        target_closure_date: mrfClosureDate,
        createdAt: mrfCreatedAt,
        created_at: mrfCreatedAt,
      };
    }

    return null;
  }

  /**
   * Alias for backwards compatibility
   */
  async getPublicJobDataByMrNumber(mrNumber: string) {
    return this.getPublicJobData(mrNumber);
  }

  /**
   * Get filter data for the job portal: departments, designations, employment types
   */
  async getFilterData(_orgId?: number) {
    const db = getKnex();

    let departments: any[] = [];
    try {
      departments = await db('departments')
        .select('id', 'name')
        .orderBy('name');
    } catch (err) {
      console.error('Error fetching departments:', err);
    }

    let designations: any[] = [];
    try {
      designations = await db('designations')
        .select('id', 'name')
        .orderBy('name');
    } catch (err) {
      try {
        designations = await db('grades')
          .select('id', 'name')
          .orderBy('name');
      } catch (errGrades) {
        console.error('Error fetching designations/grades:', errGrades);
      }
    }

    let employmentTypes: string[] = ['Full Time', 'Part Time', 'Contract', 'Internship'];
    try {
      const jobTypes = await db('jobs')
        .whereNotNull('job_type')
        .where((q) => {
          q.where('is_published_external', true).orWhere('is_published_external', 1);
        })
        .where((q) => q.where('status', 'published').orWhere('status', 'active').orWhere('status', 'open'))
        .distinct('job_type')
        .pluck('job_type');

      const formattedJobTypes = jobTypes.map((t: string) => t === 'full_time' ? 'Full Time' : (t === 'part_time' ? 'Part Time' : (t === 'contract' ? 'Contract' : (t === 'internship' ? 'Internship' : t))));
      employmentTypes = Array.from(new Set([...employmentTypes, ...formattedJobTypes])).filter(Boolean);
    } catch (err) {
      console.error('Error fetching employmentTypes:', err);
    }

    return {
      departments: departments.map((d: any) => ({ id: d.id, name: d.name })),
      designations: designations.map((d: any) => ({ id: d.id, name: d.name })),
      employmentTypes,
    };
  }

  /**
   * Get list of real candidates from database with uploaded resumes
   */
  async getCandidatesWithResumes(organizationId?: number) {
    const db = getKnex();
    try {
      let query = db('candidates')
        .whereNull('deleted_at')
        .where((q) => {
          q.whereNotNull('resume_url')
           .andWhere('resume_url', '!=', '');
          q.orWhereNotNull('resume_bank_id');
        });

      if (organizationId) {
        query = query.where('organization_id', organizationId);
      }

      const candidates = await query
        .select('id', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'resume_url')
        .orderBy('created_at', 'desc');

      return candidates.map((c: any) => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
        email: c.email,
        phone: c.phone,
        qualification: c.qualification,
        resumeUrl: c.resume_url,
      })).filter((c: any) => c.name);
    } catch (err) {
      console.error('getCandidatesWithResumes error:', err);
      return [];
    }
  }

  /**
   * List active job postings for external public consumption
   */
  async listPublicJobs(organizationId: number, options?: { page?: number; pageSize?: number; search?: string }) {
    return this.listOpenings(organizationId, {
      page: options?.page,
      pageSize: options?.pageSize,
      search: options?.search,
    });
  }

  /**
   * List active job openings on the Career Portal
   * Strictly respects Job Publishing status and "Job Visibility & Candidate Reach" (is_published_external)
   */
  async listOpenings(_orgId?: number, filters?: {
    departmentId?: number;
    departmentName?: string;
    employmentType?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const db = getKnex();

    let allOpenings: any[] = [];
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    const todayStr = new Date().toISOString().substring(0, 10);

    // ── Fetch REAL published & externally visible jobs from `jobs` table ──
    try {
      const jobsQuery = db('jobs as j')
        .leftJoin('departments as d', 'j.department_id', 'd.id')
        .leftJoin('designations as des', 'j.designation_id', 'des.id')
        .leftJoin('mrf_requests as m', 'j.mrf_request_id', 'm.id')
        .whereNull('j.deleted_at')
        .whereNull('j.closed_at')
        .where((q) => {
          q.where('j.is_published_external', true)
           .orWhere('j.is_published_external', 1);
        })
        .where((q) => {
          q.whereIn('j.status', ['published', 'active', 'open', 'Published', 'Active', 'Open', 'Approved']);
        })
        .where((q) => {
          q.whereNull('j.expiry_date')
           .orWhere('j.expiry_date', '>=', todayStr);
        });

      if (_orgId) {
        jobsQuery.andWhere((q) => {
          q.where('j.organization_id', _orgId)
           .orWhereNull('j.organization_id');
        });
      }
      if (filters?.departmentId) {
        jobsQuery.where('j.department_id', filters.departmentId);
      } else if (filters?.departmentName && filters.departmentName !== 'All' && filters.departmentName !== 'All Departments') {
        jobsQuery.where('d.name', filters.departmentName);
      }
      if (filters?.employmentType && filters.employmentType !== 'All' && filters.employmentType !== 'All Types') {
        const empType = filters.employmentType.toLowerCase().replace(/\s+/g, '_');
        jobsQuery.where((q) => {
          q.where('j.job_type', empType)
           .orWhere('j.job_type', filters.employmentType!)
           .orWhere('j.employment_type', empType)
           .orWhere('j.employment_type', filters.employmentType!);
        });
      }
      if (filters?.search) {
        jobsQuery.andWhere((q) => {
          q.where('j.job_title', 'like', `%${filters.search}%`)
           .orWhere('j.job_code', 'like', `%${filters.search}%`)
           .orWhere('d.name', 'like', `%${filters.search}%`);
        });
      }

      const jobRows = await jobsQuery
        .select(
          'j.id', 'j.job_code', 'j.job_title', 'j.no_of_positions',
          'j.department_id', 'd.name as dept_name',
          'des.name as desig_name',
          'j.job_type', 'j.employment_type',
          'j.experience_level', 'j.min_experience_years', 'j.max_experience_years',
          'j.job_description', 'j.status', 'j.expiry_date', 'j.closed_at', 'j.created_at',
          'm.qualification_required as mrf_qualification',
          'm.experience_desired as mrf_experience',
          'm.skills as mrf_skills'
        )
        .orderBy('j.created_at', 'desc');

      // Fetch skills from job_skills table
      const jobIds = jobRows.map((j: any) => j.id);
      const jobSkillsMap = new Map<number, string[]>();
      if (jobIds.length > 0) {
        try {
          const skillsRows = await db('job_skills')
            .whereIn('job_id', jobIds)
            .select('job_id', 'skill_name');
          for (const row of skillsRows) {
            const jid = Number((row as any).jobId || (row as any).job_id);
            const sname = (row as any).skillName || (row as any).skill_name;
            if (!jobSkillsMap.has(jid)) jobSkillsMap.set(jid, []);
            if (sname) jobSkillsMap.get(jid)!.push(sname);
          }
        } catch (skErr) {
          console.warn('Could not fetch job_skills:', skErr);
        }
      }

      for (const j of jobRows) {
        const jStatus = String((j as any).status || '').toLowerCase();
        if (jStatus === 'closed' || jStatus === 'archived' || jStatus === 'rejected') {
          continue;
        }
        if ((j as any).closedAt || (j as any).closed_at) {
          continue;
        }

        const jobCode = (j as any).jobCode || (j as any).job_code || '';
        const jobTitle = (j as any).jobTitle || (j as any).job_title || '';
        const noOfPositions = (j as any).noOfPositions || (j as any).no_of_positions || 1;
        const deptId = (j as any).departmentId || (j as any).department_id;
        const deptName = (j as any).deptName || (j as any).dept_name || '';
        const desigName = (j as any).desigName || (j as any).desig_name || '';
        const jobType = (j as any).jobType || (j as any).job_type || '';
        const empType = (j as any).employmentType || (j as any).employment_type || '';
        const expLevel = (j as any).experienceLevel || (j as any).experience_level || '';
        const minExp = (j as any).minExperienceYears || (j as any).min_experience_years;
        const maxExp = (j as any).maxExperienceYears || (j as any).max_experience_years;
        const jobDesc = (j as any).jobDescription || (j as any).job_description || '';
        const expDateRaw = (j as any).expiryDate || (j as any).expiry_date;
        const createdAt = (j as any).createdAt || (j as any).created_at || new Date().toISOString();

        const effectiveEmpType = jobType === 'full_time' ? 'Full Time'
          : jobType === 'part_time' ? 'Part Time'
          : jobType === 'contract' ? 'Contract'
          : jobType === 'internship' ? 'Internship'
          : (empType || jobType || 'Full Time');

        let parsedSkills: string[] = jobSkillsMap.get(Number(j.id)) || [];
        if (parsedSkills.length === 0 && (j as any).mrf_skills) {
          const rawSkills = (j as any).mrf_skills;
          if (typeof rawSkills === 'string') {
            try {
              parsedSkills = JSON.parse(rawSkills);
            } catch {
              parsedSkills = rawSkills.split(',').map((s: string) => s.trim());
            }
          } else if (Array.isArray(rawSkills)) {
            parsedSkills = rawSkills;
          }
        }

        const qual = (j as any).mrf_qualification || 'Graduate / Diploma';
        const exp = minExp ? `${minExp}-${maxExp || 5} Years` : ((j as any).mrf_experience || expLevel || 'Experienced');

        allOpenings.push({
          id: j.id,
          mr_number: jobCode,
          position_title: jobTitle,
          number_of_positions: noOfPositions,
          department_id: deptId,
          department_name: deptName,
          designation_name: desigName,
          employment_type: effectiveEmpType,
          qualification_required: qual,
          experience_desired: exp,
          skills: parsedSkills,
          job_description: jobDesc,
          target_closure_date: expDateRaw || null,
          created_at: createdAt,
          source_type: 'job',
        });
      }
    } catch (jobsErr) {
      console.error('Error fetching jobs in listOpenings:', jobsErr);
    }

    // Deduplicate by mr_number
    const seen = new Set<string>();
    const uniqueOpenings = allOpenings.filter((item) => {
      const key = `${item.mr_number || item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by created_at desc
    uniqueOpenings.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    const total = uniqueOpenings.length;
    const paginatedItems = uniqueOpenings.slice(offset, offset + pageSize);

    // Parse skills and build final response
    const parsed = paginatedItems.map((item: any) => {
      let parsedSkills: any[] = [];
      if (item.skills) {
        if (typeof item.skills === 'string') {
          try {
            parsedSkills = JSON.parse(item.skills);
          } catch {
            parsedSkills = item.skills.split(',').map((s: string) => s.trim());
          }
        } else if (Array.isArray(item.skills)) {
          parsedSkills = item.skills;
        }
      }

      return {
        id: item.id,
        mr_number: item.mr_number,
        mrNumber: item.mr_number,
        position_title: item.position_title,
        positionTitle: item.position_title,
        number_of_positions: item.number_of_positions,
        numberOfPositions: item.number_of_positions,
        department_id: item.department_id,
        departmentId: item.department_id,
        department_name: item.department_name,
        departmentName: item.department_name,
        designation_name: item.designation_name,
        designationName: item.designation_name,
        employment_type: item.employment_type,
        employmentType: item.employment_type,
        qualification_required: item.qualification_required,
        qualificationRequired: item.qualification_required,
        experience_desired: item.experience_desired,
        experienceDesired: item.experience_desired,
        job_description: item.job_description,
        jobDescription: item.job_description,
        target_closure_date: item.target_closure_date,
        targetClosureDate: item.target_closure_date,
        created_at: item.created_at,
        createdAt: item.created_at,
        skills: parsedSkills,
      };
    });

    return {
      items: parsed,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Safe insert helper: queries the actual DB table columns first,
   * filters the payload to only include columns that exist, and inserts.
   * This prevents "Unknown column" and "no default value" errors permanently.
   */
  private async safeInsert(tableName: string, data: Record<string, any>): Promise<number> {
    const db = getKnex();
    try {
      // Get actual columns from the live database
      const [columns] = await db.raw(`SHOW COLUMNS FROM \`${tableName}\``);
      const validColumnNames = new Set(columns.map((c: any) => c.Field));

      // Filter payload to only include columns that exist in the table
      const safeData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (validColumnNames.has(key)) {
          safeData[key] = value;
        }
      }

      const [insertedId] = await db(tableName).insert(safeData);
      return insertedId;
    } catch (err: any) {
      console.error(`[safeInsert] Failed to insert into ${tableName}:`, err.message);
      throw err;
    }
  }

  /**
   * Submit a new candidate application from the public reference portal
   */
  async applyFromReference(organizationId: number, mrfId: number, input: any, referringEmployeeId?: number) {
    const db = getKnex();

    // Decode and save files if provided in base64 format
    const resumePath = this.saveBase64File(input.resumeUrl, 'resume');
    const signaturePath = this.saveBase64File(input.signatureUrl, 'signature');

    const effectiveEmail = (input.emailId && input.emailId.trim())
      || `${(input.name || 'candidate').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@applied.portal`;

    // 1. Check if candidate already exists
    let candidate = await db('candidates')
      .where('organization_id', organizationId)
      .where('email', effectiveEmail)
      .first();

    if (!candidate) {
      const first_name = input.name.split(' ')[0] || input.name;
      const last_name = input.name.split(' ').slice(1).join(' ') || first_name || 'Applicant';
      try {
        const candId = await this.safeInsert('candidates', {
          uuid: uuidv4(),
          organization_id: organizationId,
          first_name,
          last_name,
          email: effectiveEmail,
          phone: input.contactNumber || null,
          date_of_birth: input.dateOfBirth || null,
          dob: input.dateOfBirth || null,
          gender: input.gender || 'Male',
          address_line1: input.addressLine1 || null,
          address_line2: input.addressLine2 || null,
          country: input.country || null,
          zipcode: input.zipcode || null,
          state: input.state || null,
          city: input.city || null,
          marital_status: input.maritalStatus || null,
          current_company: input.currentCompany || null,
          years_of_experience: input.totalExperience ? parseFloat(input.totalExperience) : null,
          qualification: input.qualification || null,
          university: input.university || null,
          skills: input.skills || null,
          comments: input.comments || null,
          resume_url: resumePath,
          signature_url: signaturePath,
          // candidates.source is an enum in existing installations. Store its
          // canonical values here; display labels are derived when reading.
          source: referringEmployeeId ? 'employee_referral' : 'direct_apply',
          created_by: referringEmployeeId || 1,
          updated_by: referringEmployeeId || 1,
        });
        candidate = await db('candidates').where('id', candId).first();
      } catch (err: any) {
        throw new Error(`Failed to create candidate: ${err.message}`);
      }
    } else {
      // Update candidate details with new submission
      const updateData: any = {
        phone: input.contactNumber || candidate.phone,
        date_of_birth: input.dateOfBirth || candidate.date_of_birth,
        dob: input.dateOfBirth || candidate.dob,
        gender: input.gender || candidate.gender,
        address_line1: input.addressLine1 || candidate.address_line1,
        address_line2: input.addressLine2 || candidate.address_line2,
        country: input.country || candidate.country,
        zipcode: input.zipcode || candidate.zipcode,
        state: input.state || candidate.state,
        city: input.city || candidate.city,
        marital_status: input.maritalStatus || candidate.marital_status,
        current_company: input.currentCompany || candidate.current_company,
        years_of_experience: input.totalExperience ? parseFloat(input.totalExperience) : candidate.years_of_experience,
        qualification: input.qualification || candidate.qualification,
        university: input.university || candidate.university,
        skills: input.skills || candidate.skills,
        comments: input.comments || candidate.comments,
      };
      if (resumePath) updateData.resume_url = resumePath;
      if (signaturePath) updateData.signature_url = signaturePath;
      await db('candidates').where('id', candidate.id).update(updateData);
      candidate = await db('candidates').where('id', candidate.id).first();
    }

    // 2. Resolve or create Job record linked to this MRF or Job
    let job: any = null;
    try {
      // First check if mrfId is already a direct job ID
      job = await db('jobs')
        .where('organization_id', organizationId)
        .where('id', mrfId)
        .first();

      if (!job) {
        job = await db('jobs')
          .where('organization_id', organizationId)
          .where('mrf_request_id', mrfId)
          .first();
      }
    } catch {
      // mrf_request_id column may not exist, try without it
      job = null;
    }

    if (!job) {
      try {
        const mrf = await db('mrf_requests').where('id', mrfId).first();
        const resolvedTitle = mrf?.position_title || (mrf as any)?.positionTitle || (mrf as any)?.title || (mrf as any)?.job_title || (mrf as any)?.designation_name || 'Software Developer';

        const jobId = await this.safeInsert('jobs', {
          uuid: uuidv4(),
          organization_id: organizationId,
          mrf_request_id: mrfId,
          job_code: `JOB-${mrf?.mr_number || uuidv4().substring(0, 8)}`,
          job_title: resolvedTitle,
          job_description: mrf?.job_description || '',
          department_id: mrf?.department_id || null,
          location_id: mrf?.company_location_id || null,
          no_of_positions: mrf?.number_of_positions || 1,
          // Both recruitment job schemas use `published` for portal-visible
          // postings; `internal` is not a valid jobs.status enum value.
          status: 'published',
          created_by: mrf?.created_by || mrf?.requested_by || 1,
          updated_by: mrf?.created_by || mrf?.requested_by || 1,
        });
        job = await db('jobs').where('id', jobId).first();
      } catch (err: any) {
        throw new Error(`Failed to create job record: ${err.message}`);
      }
    }

    // 3. Create candidate application linked to the resolved job
    let application: any = null;
    try {
      application = await db('applications as a')
        .join('candidates as c', 'a.candidate_id', 'c.id')
        .where('a.organization_id', organizationId)
        .where((q) => {
          q.where('a.candidate_id', candidate.id)
           .orWhere('c.email', effectiveEmail);
        })
        // Use the stable core columns. Older production schemas may not have
        // applications.mrf_request_id; referencing it here made duplicate
        // detection fail and then the unique (candidate_id, job_id) insert
        // surfaced as an unexplained 500.
        .where('a.job_id', job.id)
        .first();
    } catch { application = null; }

    if (application) {
      return { candidate, job, application, alreadyApplied: true };
    }

    try {
      const appId = await this.safeInsert('applications', {
        uuid: uuidv4(),
        organization_id: organizationId,
        candidate_id: candidate.id,
        job_id: job.id,
        mrf_request_id: mrfId,
        application_status: 'applied',
        applied_from_source: referringEmployeeId ? 'Referral' : 'Direct Apply',
        created_by: referringEmployeeId || 1,
        updated_by: referringEmployeeId || 1,
      });
      application = await db('applications').where('id', appId).first();
    } catch (err: any) {
      throw new Error(`Failed to create application: ${err.message}`);
    }

    // 3b. Sync to Resume Bank so candidate appears in HR "Resume Source Screen Bank"
    try {
      let resumeEntry = await db('resume_bank')
        .where('organization_id', organizationId)
        .where('candidate_id', candidate.id)
        .first();

      if (!resumeEntry) {
        const allEntries: any[] = await db('resume_bank')
          .where('organization_id', organizationId)
          .select('tracker_id');
        let maxNum = 0;
        for (const r of allEntries) {
          const tid = r.trackerId || r.tracker_id || '';
          const num = parseInt(tid.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        const trackerId = `TRK-${String(maxNum + 1).padStart(3, '0')}`;

        const mrf = await db('mrf_requests').where('id', mrfId).first().catch(() => null);
        const posTitle = mrf?.position_title || job?.job_title || 'Position';

        await this.safeInsert('resume_bank', {
          uuid: uuidv4(),
          organization_id: organizationId,
          tracker_id: trackerId,
          candidate_id: candidate.id,
          job_id: job?.id || null,
          mrf_request_id: mrfId,
          source: referringEmployeeId ? 'employee_referral' : 'direct_apply',
          position: posTitle,
          status: 'Applied',
          uploaded_by: referringEmployeeId || 1,
          created_by: referringEmployeeId || 1,
          updated_by: referringEmployeeId || 1,
        });
      }
    } catch (rbErr: any) {
      console.error('Failed to sync to resume_bank (non-fatal):', rbErr.message);
    }

    // 4. Create Referral record if referring employee is provided
    if (referringEmployeeId) {
      try {
        let existingReferral: any = null;
        try {
          existingReferral = await db('referrals')
            .where('organization_id', organizationId)
            .where('candidate_id', candidate.id)
            .first();
        } catch { existingReferral = null; }

        if (!existingReferral) {
          await this.safeInsert('referrals', {
            uuid: uuidv4(),
            organization_id: organizationId,
            mrf_request_id: mrfId,
            referring_employee_id: referringEmployeeId,
            referrer_employee_id: referringEmployeeId,
            candidate_id: candidate.id,
            referral_date: new Date(),
            status: 'submitted',
            created_by: referringEmployeeId,
            updated_by: referringEmployeeId,
          });
        }
      } catch (err: any) {
        console.error('Failed to create referral (non-fatal):', err.message);
        // Non-fatal: candidate + application already saved
      }
    }

    return { candidate, job, application };
  }

  /**
   * Submit a referral for an existing candidate
   */
  async referExisting(organizationId: number, mrfId: number, candidateId: number, referringEmployeeId?: number) {
    const db = getKnex();

    // 1. Verify candidate exists
    const candidate = await db('candidates').where('id', candidateId).first();
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // 2. Resolve or create Job record linked to this MRF
    let job: any = null;
    try {
      job = await db('jobs')
        .where('organization_id', organizationId)
        .where('mrf_request_id', mrfId)
        .first();
    } catch { job = null; }

    if (!job) {
      try {
        const mrf = await db('mrf_requests').where('id', mrfId).first();
        const resolvedTitle = mrf?.position_title || (mrf as any)?.positionTitle || (mrf as any)?.title || (mrf as any)?.job_title || (mrf as any)?.designation_name || 'Software Developer';

        const jobId = await this.safeInsert('jobs', {
          uuid: uuidv4(),
          organization_id: organizationId,
          mrf_request_id: mrfId,
          job_code: `JOB-${mrf?.mr_number || uuidv4().substring(0, 8)}`,
          job_title: resolvedTitle,
          job_description: mrf?.job_description || '',
          department_id: mrf?.department_id || null,
          location_id: mrf?.company_location_id || null,
          no_of_positions: mrf?.number_of_positions || 1,
          status: 'published',
          created_by: mrf?.created_by || mrf?.requested_by || 1,
          updated_by: mrf?.created_by || mrf?.requested_by || 1,
        });
        job = await db('jobs').where('id', jobId).first();
      } catch (err: any) {
        throw new Error(`Failed to create job record: ${err.message}`);
      }
    }

    // 3. Create candidate application linked to the resolved job
    let application: any = null;
    try {
      application = await db('applications')
        .where('organization_id', organizationId)
        .where('candidate_id', candidateId)
        .where('job_id', job.id)
        .first();
    } catch { application = null; }

    if (!application) {
      try {
        await this.safeInsert('applications', {
          uuid: uuidv4(),
          organization_id: organizationId,
          candidate_id: candidateId,
          job_id: job.id,
          mrf_request_id: mrfId,
          application_status: 'applied',
          applied_from_source: 'Referral',
          created_by: referringEmployeeId || 1,
          updated_by: referringEmployeeId || 1,
        });
      } catch (err: any) {
        throw new Error(`Failed to create application: ${err.message}`);
      }
    }

    // 3b. Sync to Resume Bank so candidate appears in HR "Resume Source Screen Bank"
    try {
      let resumeEntry = await db('resume_bank')
        .where('organization_id', organizationId)
        .where('candidate_id', candidateId)
        .first();

      if (!resumeEntry) {
        const allEntries: any[] = await db('resume_bank')
          .where('organization_id', organizationId)
          .select('tracker_id');
        let maxNum = 0;
        for (const r of allEntries) {
          const tid = r.trackerId || r.tracker_id || '';
          const num = parseInt(tid.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        const trackerId = `TRK-${String(maxNum + 1).padStart(3, '0')}`;

        const mrf = await db('mrf_requests').where('id', mrfId).first().catch(() => null);
        const posTitle = mrf?.position_title || job?.job_title || 'Position';

        await this.safeInsert('resume_bank', {
          uuid: uuidv4(),
          organization_id: organizationId,
          tracker_id: trackerId,
          candidate_id: candidateId,
          job_id: job?.id || null,
          mrf_request_id: mrfId,
          source: 'Referral',
          position: posTitle,
          status: 'Applied',
          uploaded_by: referringEmployeeId || 1,
          created_by: referringEmployeeId || 1,
          updated_by: referringEmployeeId || 1,
        });
      }
    } catch (rbErr: any) {
      console.error('Failed to sync referral to resume_bank (non-fatal):', rbErr.message);
    }

    // 4. Create Referral record
    try {
      let existingReferral: any = null;
      try {
        existingReferral = await db('referrals')
          .where('organization_id', organizationId)
          .where('candidate_id', candidateId)
          .first();
      } catch { existingReferral = null; }

      if (!existingReferral) {
        await this.safeInsert('referrals', {
          uuid: uuidv4(),
          organization_id: organizationId,
          mrf_request_id: mrfId,
          referring_employee_id: referringEmployeeId || null,
          referrer_employee_id: referringEmployeeId || null,
          candidate_id: candidateId,
          referral_date: new Date(),
          status: 'submitted',
          created_by: referringEmployeeId || 1,
          updated_by: referringEmployeeId || 1,
        });
      }
    } catch (err: any) {
      console.error('Failed to create referral (non-fatal):', err.message);
    }

    return { candidate, job, application: true };
  }
}
