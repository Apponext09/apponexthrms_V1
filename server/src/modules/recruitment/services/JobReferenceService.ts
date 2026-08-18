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
   * Get public-facing job reference data for a given MRF ID.
  /**
   * Get public-facing job reference data for a given MRF ID or mr_number.
   * Returns limited public info (no salary, no internal notes).
   */
  async getPublicJobData(mrfId: number | string) {
    const db = getKnex();
    const idStr = String(mrfId).trim();

    const mrf = await db('mrf_requests')
      .whereNull('deleted_at')
      .where((q) => {
        if (!isNaN(Number(idStr))) {
          q.where('id', Number(idStr))
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

    if (!mrf) return null;

    // Resolve department name
    let departmentName = '';
    if (mrf.department_id) {
      const dept = await db('departments').where('id', mrf.department_id).first();
      departmentName = dept?.name || '';
    }

    // Resolve designation name
    let designationName = '';
    if (mrf.grade_id) {
      const desig = await db('designations').where('id', mrf.grade_id).first();
      designationName = desig?.title || desig?.name || '';
    }

    let parsedSkills: any = null;
    if (mrf.skills) {
      if (typeof mrf.skills === 'string') {
        try {
          parsedSkills = JSON.parse(mrf.skills);
        } catch {
          parsedSkills = mrf.skills;
        }
      } else {
        parsedSkills = mrf.skills;
      }
    }

    const title = mrf.position_title || mrf.positionTitle || `Position ${mrf.mr_number}`;

    return {
      id: mrf.id,
      organizationId: mrf.organization_id,
      organization_id: mrf.organization_id,
      mrNumber: mrf.mr_number,
      mr_number: mrf.mr_number,
      positionTitle: title,
      position_title: title,
      numberOfPositions: mrf.number_of_positions,
      number_of_positions: mrf.number_of_positions,
      departmentId: mrf.department_id,
      department_id: mrf.department_id,
      departmentName,
      department_name: departmentName,
      designationName,
      designation_name: designationName,
      employmentType: mrf.employment_type || 'Full Time',
      employment_type: mrf.employment_type || 'Full Time',
      qualificationRequired: mrf.qualification_required || '',
      qualification_required: mrf.qualification_required || '',
      experienceDesired: mrf.experience_desired || '',
      experience_desired: mrf.experience_desired || '',
      skills: parsedSkills,
      jobDescription: mrf.job_description,
      job_description: mrf.job_description,
      status: mrf.status,
      targetClosureDate: mrf.target_closure_date || null,
      target_closure_date: mrf.target_closure_date || null,
      createdAt: mrf.created_at,
      created_at: mrf.created_at,
    };
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

    let employmentTypes: any[] = [];
    try {
      employmentTypes = await db('mrf_requests')
        .whereNotNull('employment_type')
        .where((q) => q.whereNot('status', 'Closed').orWhereNull('status'))
        .distinct('employment_type')
        .pluck('employment_type');
    } catch (err) {
      console.error('Error fetching employmentTypes:', err);
    }

    return {
      departments: departments.map((d: any) => ({ id: d.id, name: d.name })),
      designations: designations.map((d: any) => ({ id: d.id, name: d.name })),
      employmentTypes: employmentTypes.filter(Boolean),
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
   * List active job openings (MRF requests that are Open)
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

    let items: any[] = [];
    let total = 0;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const offset = (page - 1) * pageSize;

    try {
      const todayStr = new Date().toISOString().substring(0, 10);

      // Primary query with joins
      const query = db('mrf_requests as m')
        .leftJoin('departments as d', 'm.department_id', 'd.id')
        .leftJoin('grades as dg', 'm.grade_id', 'dg.id')
        .whereNull('m.deleted_at')
        .where((q) => {
          q.whereNot('m.status', 'Closed')
           .orWhereNull('m.status');
        })
        .andWhere((q) => {
          q.whereNull('m.target_closure_date')
           .orWhere('m.target_closure_date', '>=', todayStr);
        })
        .select(
          'm.id',
          'm.mr_number',
          'm.position_title',
          'm.number_of_positions',
          'm.department_id',
          'd.name as department_name',
          'dg.name as designation_name',
          'm.employment_type',
          'm.qualification_required',
          'm.experience_desired',
          'm.skills',
          'm.job_description',
          'm.target_closure_date',
          'm.created_at'
        );

      if (filters?.departmentId) {
        query.where('m.department_id', filters.departmentId);
      } else if (filters?.departmentName) {
        query.where('d.name', filters.departmentName);
      }
      if (filters?.employmentType) {
        query.where('m.employment_type', filters.employmentType);
      }
      if (filters?.search) {
        query.andWhere((q) => {
          q.where('m.position_title', 'like', `%${filters.search}%`)
            .orWhere('m.mr_number', 'like', `%${filters.search}%`)
            .orWhere('d.name', 'like', `%${filters.search}%`)
            .orWhere('m.qualification_required', 'like', `%${filters.search}%`);
        });
      }

      const countResult = await query.clone().clearSelect().count('m.id as count').first();
      total = parseInt((countResult as any)?.count as string, 10) || 0;

      items = await query
        .orderBy('m.created_at', 'desc')
        .limit(pageSize)
        .offset(offset);

    } catch (err) {
      console.error('listOpenings with joins failed, falling back to direct query:', err);
      try {
        const todayStr = new Date().toISOString().substring(0, 10);
        // Fallback query without joins
        const fallbackQuery = db('mrf_requests')
          .whereNull('deleted_at')
          .where((q) => {
            q.whereNot('status', 'Closed')
             .orWhereNull('status');
          })
          .andWhere((q) => {
            q.whereNull('target_closure_date')
             .orWhere('target_closure_date', '>=', todayStr);
          });

        if (filters?.employmentType) {
          fallbackQuery.where('employment_type', filters.employmentType);
        }
        if (filters?.search) {
          fallbackQuery.andWhere((q) => {
            q.where('position_title', 'like', `%${filters.search}%`)
              .orWhere('mr_number', 'like', `%${filters.search}%`);
          });
        }

        const countResult = await fallbackQuery.clone().count('id as count').first();
        total = parseInt((countResult as any)?.count as string, 10) || 0;

        items = await fallbackQuery
          .select('*')
          .orderBy('created_at', 'desc')
          .limit(pageSize)
          .offset(offset);
      } catch (fallbackErr) {
        console.error('Fallback query also failed:', fallbackErr);
      }
    }

    // Parse and map keys
    const parsed = items.map((item: any) => {
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
      const title = item.position_title || item.positionTitle || `Position ${item.mr_number || item.mrNumber}`;
      const dept = item.department_name || item.departmentName || '';
      const desig = item.designation_name || item.designationName || '';
      return {
        ...item,
        position_title: title,
        positionTitle: title,
        mr_number: item.mr_number || item.mrNumber,
        mrNumber: item.mr_number || item.mrNumber,
        department_name: dept,
        departmentName: dept,
        designation_name: desig,
        designationName: desig,
        employment_type: item.employment_type || 'Full Time',
        employmentType: item.employment_type || 'Full Time',
        qualification_required: item.qualification_required || '',
        qualificationRequired: item.qualification_required || '',
        experience_desired: item.experience_desired || '',
        experienceDesired: item.experience_desired || '',
        target_closure_date: item.target_closure_date,
        targetClosureDate: item.target_closure_date,
        created_at: item.created_at || new Date().toISOString(),
        createdAt: item.created_at || new Date().toISOString(),
        skills: parsedSkills,
      };
    });

    return {
      items: parsed,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
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
      const last_name = input.name.split(' ').slice(1).join(' ') || null;
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
          source: referringEmployeeId ? 'Referral' : 'Direct Apply',
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

    // 2. Resolve or create Job record linked to this MRF
    let job: any = null;
    try {
      job = await db('jobs')
        .where('organization_id', organizationId)
        .where('mrf_request_id', mrfId)
        .first();
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
           .orWhere('c.email', input.emailId);
        })
        .where((q) => {
          if (job?.id) q.where('a.job_id', job.id);
          q.orWhere('a.mrf_request_id', mrfId);
        })
        .first();
    } catch { application = null; }

    if (application) {
      throw new Error(`You have already submitted an application for this position (${job?.job_title || 'Opening'})! Duplicate applications for the same candidate and job opening are not allowed.`);
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
          source: referringEmployeeId ? 'Referral' : 'Direct Apply',
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
