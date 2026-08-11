import { getKnex } from '../../../db/knex';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { ReferralRepository } from '../repositories/ReferralRepository';
import { MrfRequestRepository } from '../repositories/MrfRequestRepository';
import type { JobReferenceApplyInput } from '../types/mrf';
import type { TenantContext } from '../../../db/types';
import { v4 as uuidv4 } from 'uuid';

export class JobReferenceService {
  private candidateRepo: CandidateRepository;
  private applicationRepo: ApplicationRepository;
  private referralRepo: ReferralRepository;
  private mrfRepo: MrfRequestRepository;

  constructor() {
    this.candidateRepo = new CandidateRepository();
    this.applicationRepo = new ApplicationRepository();
    this.referralRepo = new ReferralRepository();
    this.mrfRepo = new MrfRequestRepository();
  }

  /**
   * Get public-facing job reference data for a given MRF ID.
   * Returns limited public info (no salary, no internal notes).
   */
  async getPublicJobData(mrfId: number) {
    const db = getKnex();

    const mrf = await db('mrf_requests')
      .where('id', mrfId)
      .whereNull('deleted_at')
      .first();

    if (!mrf) return null;

    return {
      id: mrf.id,
      mrNumber: mrf.mr_number,
      positionTitle: mrf.position_title,
      numberOfPositions: mrf.number_of_positions,
      department: mrf.department_id,
      employmentType: mrf.employment_type,
      qualificationRequired: mrf.qualification_required,
      experienceDesired: mrf.experience_desired,
      skills: mrf.skills ? JSON.parse(mrf.skills) : null,
      jobDescription: mrf.job_description,
      status: mrf.status,
    };
  }

  /**
   * Submit a new candidate application from the public reference page.
   * Creates a candidate record, then an application linked to the MRF's job.
   */
  async applyFromReference(
    organizationId: number,
    mrfId: number,
    input: JobReferenceApplyInput,
    referringEmployeeId?: number
  ) {
    const db = getKnex();

    // Parse name
    const nameParts = input.name.trim().split(' ');
    const firstName = nameParts[0] || input.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 1. Create candidate
    const [candidateId] = await db('candidates').insert({
      uuid: uuidv4(),
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      email: input.emailId,
      phone: input.contactNumber || null,
      dob: input.dateOfBirth || null,
      gender: input.gender || null,
      marital_status: input.maritalStatus || null,
      current_company: input.currentCompany || null,
      qualification: input.qualification || null,
      university: input.university || null,
      years_of_experience: input.totalExperience ? parseFloat(input.totalExperience) : null,
      source: referringEmployeeId ? 'employee_referral' : 'direct_apply',
      address_line1: input.addressLine1 || null,
      address_line2: input.addressLine2 || null,
      country: input.country || null,
      zipcode: input.zipcode || null,
      state: input.state || null,
      city: input.city || null,
      skills: input.skills || null,
      comments: input.comments || null,
      created_at: mysqlNow,
      updated_at: mysqlNow,
    });

    // 2. Find the job linked to this MRF (if any)
    const job = await db('jobs').where('mrf_request_id', mrfId).first();

    // 3. Create application (linking candidate → job or MRF)
    const [applicationId] = await db('applications').insert({
      uuid: uuidv4(),
      organization_id: organizationId,
      candidate_id: candidateId,
      job_id: job?.id || null,
      mrf_request_id: mrfId,
      application_status: 'applied',
      applied_at: mysqlNow,
      applied_from_source: referringEmployeeId ? 'employee_referral' : 'job_reference_link',
      initial_screening_status: 'pending',
      created_at: mysqlNow,
      updated_at: mysqlNow,
    });

    // 4. Create referral entry if applicable
    if (referringEmployeeId) {
      await db('referrals').insert({
        uuid: uuidv4(),
        organization_id: organizationId,
        mrf_request_id: mrfId,
        referring_employee_id: referringEmployeeId,
        candidate_id: candidateId,
        status: 'submitted',
        created_at: mysqlNow,
        updated_at: mysqlNow,
      });
    }

    return {
      candidateId,
      applicationId,
      message: 'Application submitted successfully',
    };
  }

  /**
   * Submit a referral for an existing candidate
   */
  async referExisting(
    organizationId: number,
    mrfId: number,
    candidateId: number,
    referringEmployeeId?: number
  ) {
    const db = getKnex();
    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Find the job linked to this MRF
    const job = await db('jobs').where('mrf_request_id', mrfId).first();

    // Create application
    const [applicationId] = await db('applications').insert({
      uuid: uuidv4(),
      organization_id: organizationId,
      candidate_id: candidateId,
      job_id: job?.id || null,
      mrf_request_id: mrfId,
      application_status: 'applied',
      applied_at: mysqlNow,
      applied_from_source: 'existing_candidate_referral',
      initial_screening_status: 'pending',
      created_at: mysqlNow,
      updated_at: mysqlNow,
    });

    // Create referral entry
    if (referringEmployeeId) {
      await db('referrals').insert({
        uuid: uuidv4(),
        organization_id: organizationId,
        mrf_request_id: mrfId,
        referring_employee_id: referringEmployeeId,
        candidate_id: candidateId,
        status: 'submitted',
        created_at: mysqlNow,
        updated_at: mysqlNow,
      });
    }

    return {
      applicationId,
      message: 'Referral submitted successfully',
    };
  }

  async listPublicJobs(orgId: number, options?: { page?: number; pageSize?: number; search?: string }) {
    const { JobRepository } = await import('../repositories/JobRepository');
    const jobRepo = new JobRepository();
    return jobRepo.getPublishedExternal(orgId, {
      page: options?.page,
      pageSize: options?.pageSize,
      search: options?.search,
    });
  }
}
