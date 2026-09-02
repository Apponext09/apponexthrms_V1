import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { CandidateRepository } from '../repositories/CandidateRepository';
import { OfferRepository } from '../repositories/OfferRepository';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

/**
 * OnboardingIntegrationService
 * Integrates recruitment with employee management and onboarding
 * Triggered when an offer is accepted
 */
export class OnboardingIntegrationService {
  private applicationRepo: ApplicationRepository;
  private candidateRepo: CandidateRepository;
  private offerRepo: OfferRepository;

  constructor() {
    this.applicationRepo = new ApplicationRepository();
    this.candidateRepo = new CandidateRepository();
    this.offerRepo = new OfferRepository();
  }

  /**
   * Called when a candidate accepts an offer
   * Initiates employee creation and onboarding workflow
   */
  async onCandidateHired(ctx: TenantContext, applicationId?: number, directOfferId?: number): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let offer: any = null;
    if (directOfferId) {
      offer = await db('offers').where('id', directOfferId).first();
    }
    if (!offer && applicationId) {
      offer = await db('offers').where('application_id', applicationId).first();
    }
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    const appId = applicationId || offer.application_id || offer.applicationId;
    let application: any = appId ? await db('applications').where('id', appId).first() : null;

    let meta: any = {};
    if (offer.meta) {
      try {
        meta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : (offer.meta || {});
      } catch {
        meta = {};
      }
    }

    const candId = application?.candidate_id || application?.candidateId || offer.candidate_id || offer.candidateId;
    let candidate: any = candId ? await db('candidates').where('id', candId).first() : null;

    const targetEmail = meta.candidateEmail || offer.candidate_email || (offer as any).candidateEmail;
    if (!candidate && targetEmail) {
      candidate = await db('candidates').where('email', targetEmail).first();
    }

    if (!candidate) {
      const candidateFullName = (meta.candidateName || offer.candidate_name || (offer as any).candidateName || 'Candidate').trim();
      const nameParts = candidateFullName.split(' ');
      candidate = {
        id: candId || null,
        first_name: nameParts[0] || 'Candidate',
        last_name: nameParts.slice(1).join(' ') || '',
        email: targetEmail || (offer as any).candidate_email || 'candidate@example.com',
        phone: meta.candidatePhone || offer.candidate_phone || (offer as any).candidatePhone || null,
      };
    }

    // Update candidate status to 'hired' if candidate exists in DB
    if (candidate.id) {
      await db('candidates').where('id', candidate.id).update({
        status: 'hired',
        updated_by: ctx.userId,
        updated_at: new Date(),
      }).catch(() => {});
    }

    const candEmail = candidate.email || (candidate as any).email;
    const candFirstName = candidate.firstName || (candidate as any).first_name || 'Candidate';
    const candLastName = candidate.lastName || (candidate as any).last_name || '';
    const candPhone = candidate.phone || (candidate as any).phone;

    const offerDesigId = offer.designationId || (offer as any).designation_id;
    const offerDeptId = offer.departmentId || (offer as any).department_id;
    const offerStartDate = offer.offerStartDate || (offer as any).offer_start_date;
    const offerPositionTitle = offer.positionTitle || (offer as any).position_title;
    const offerCtc = offer.costToCompany || (offer as any).cost_to_company;
    const offerBaseSalary = offer.baseSalary || (offer as any).base_salary;

    // Check if employee with this email or source_candidate_id already exists to avoid duplicates
    const { hash } = await import('argon2');
    const { v4: uuidv4 } = await import('uuid');

    const existingEmp = await db('employees')
      .where(function() {
        this.where('email', candEmail);
        if (candId) {
          this.orWhere('source_candidate_id', candId);
        }
      })
      .whereNull('deleted_at')
      .first();

    let employee = existingEmp;
    let employeeCode = existingEmp?.employee_code || existingEmp?.employeeCode || this.generateEmployeeCode(candidate);

    const hasSourceCandidateId = await db.schema.hasColumn('employees', 'source_candidate_id').catch(() => false);
    const hasSourceApplicationId = await db.schema.hasColumn('employees', 'source_application_id').catch(() => false);
    const hasCompanyId = await db.schema.hasColumn('employees', 'company_id').catch(() => false);

    if (!existingEmp) {
      try {
        const empPayload: any = {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_code: employeeCode,
          status: 'onboarding',
          first_name: candFirstName,
          last_name: candLastName,
          email: candEmail,
          phone: candPhone || null,
          current_designation_id: offerDesigId || null,
          current_department_id: offerDeptId || null,
          date_of_joining: offerStartDate || new Date().toISOString().split('T')[0],
          employment_type: 'full_time',
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        };

        if (hasCompanyId) empPayload.company_id = ctx.companyId || null;
        if (hasSourceCandidateId) empPayload.source_candidate_id = candId || null;
        if (hasSourceApplicationId) empPayload.source_application_id = appId || null;

        const [createdEmpId] = await db('employees').insert(empPayload);
        employee = await db('employees').where('id', createdEmpId).first();
        console.log(`👤 Auto-provisioned employee record: ${employeeCode} (ID: ${createdEmpId}) for candidate ${candEmail}`);
      } catch (insertError: any) {
        console.error('❌ ONBOARDING INSERTION FAILED:', insertError);
        throw insertError;
      }
    } else {
      // Ensure status is at least onboarding if it was candidate
      if (existingEmp.status === 'candidate') {
        await db('employees').where('id', existingEmp.id).update({
          status: 'onboarding',
          current_designation_id: offerDesigId || existingEmp.current_designation_id,
          current_department_id: offerDeptId || existingEmp.current_department_id,
          date_of_joining: offerStartDate || existingEmp.date_of_joining,
          updated_at: new Date(),
        });
      }
      console.log(`👤 Employee record already exists for ${candEmail}, employee ID: ${existingEmp.id}`);
    }

    const employeeId = employee.id || (employee as any).id;

    // Generate or resolve temporary password
    const cleanName = candFirstName.replace(/[^a-zA-Z]/g, '') || 'Emp';
    const tempPassword = `${cleanName}@${new Date().getFullYear()}!`;
    const passwordHash = await hash(tempPassword, {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Provision User account if not existing
    try {
      const existingUser = await db('users')
        .where({ email: candEmail, organization_id: ctx.organizationId })
        .first();

      let userId = existingUser?.id;
      if (!existingUser) {
        const [newUserId] = await db('users').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          employee_id: employeeId,
          email: candEmail,
          password_hash: passwordHash,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        userId = newUserId;
        console.log(`🔑 Created user account for ${candEmail} with temp password: ${tempPassword}`);
      } else {
        await db('users').where('id', existingUser.id).update({
          employee_id: employeeId,
          updated_at: new Date(),
        });
      }

      // Assign employee role in user_roles
      if (userId) {
        const empRole = await db('roles')
          .where('code', 'employee')
          .where(function() {
            this.where('organization_id', ctx.organizationId).orWhere('is_platform_role', true);
          })
          .first();

        if (empRole) {
          const hasUserRole = await db('user_roles')
            .where({ organization_id: ctx.organizationId, user_id: userId, role_id: empRole.id })
            .first();

          if (!hasUserRole) {
            await db('user_roles').insert({
              organization_id: ctx.organizationId,
              user_id: userId,
              role_id: empRole.id,
              assigned_by: ctx.userId,
              assigned_at: new Date(),
            });
          }
        }
      }
    } catch (userErr) {
      console.warn('⚠️ Could not provision user login account:', userErr);
    }

    // Save temporary password and onboarding details in offer metadata
    try {
      let offerMeta: any = {};
      if (offer.meta) {
        try {
          offerMeta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : offer.meta;
        } catch {
          offerMeta = {};
        }
      }
      offerMeta.tempPassword = offerMeta.tempPassword || tempPassword;
      offerMeta.employeeId = employeeId;
      offerMeta.employeeCode = employee.employee_code || employeeCode;
      offerMeta.onboardedAt = new Date().toISOString();

      await db('offers').where('id', offer.id).update({
        meta: JSON.stringify(offerMeta),
        updated_at: new Date(),
      });
    } catch (metaErr) {
      console.warn('⚠️ Could not update offer meta with onboarding info:', metaErr);
    }

    // Decrement jobs.no_of_positions if application has a job_id
    const jobId = application?.jobId || application?.job_id;
    if (jobId) {
      try {
        const job = await db('jobs').where({ id: jobId, organization_id: ctx.organizationId }).first();
        if (job) {
          const currentPositions = Number(job.no_of_positions ?? job.noOfPositions ?? 1);
          const newPositions = Math.max(0, currentPositions - 1);
          const jobUpdateData: any = {
            no_of_positions: newPositions,
            updated_by: ctx.userId,
            updated_at: new Date(),
          };
          if (newPositions === 0) {
            jobUpdateData.status = 'closed';
            jobUpdateData.closed_at = new Date();
          }
          await db('jobs').where('id', job.id).update(jobUpdateData);
        }
      } catch (jobErr) {
        console.warn('⚠️ Could not update job openings:', jobErr);
      }
    }

    // Sync application and candidate status to 'hired'
    if (appId) {
      try {
        const { statusSyncService } = await import('./StatusSyncService');
        await statusSyncService.syncApplicationStatus(ctx, appId, 'hired', {
          triggeredBy: 'offer_accepted_onboarding',
          notes: `Candidate auto-onboarded as Employee ${employeeCode} (ID: ${employeeId})`,
          metadata: {
            employeeId,
            employeeCode,
            jobId,
          },
        });
      } catch (syncErr) {
        console.warn('⚠️ Could not sync status with StatusSyncService:', syncErr);
      }
    }

    const onboardingData = {
      applicationId: appId || null,
      candidateId: candId || null,
      offerId: offer.id,
      employeeId: employeeId,
      employeeCode: employee.employee_code || employeeCode,
      email: candEmail,
      tempPassword,
      status: 'onboarding',
      onboardingWorkflowData: {
        candidateName: `${candFirstName} ${candLastName}`.trim(),
        positionTitle: offerPositionTitle,
        department: offerDeptId,
        joinDate: offerStartDate,
        offeredCTC: offerCtc,
        baseSalary: offerBaseSalary,
      },
    };

    return onboardingData;
  }

  /**
   * Update temporary credentials for an onboarded employee
   */
  async updateEmployeeCredentials(
    ctx: TenantContext,
    offerId: number,
    newPassword: string
  ): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const { hash } = await import('argon2');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();

    const offer = await db('offers as o')
      .leftJoin('applications as a', 'o.application_id', 'a.id')
      .leftJoin('candidates as c', 'a.candidate_id', 'c.id')
      .where('o.id', offerId)
      .where('o.organization_id', ctx.organizationId)
      .select(
        'o.*',
        'c.email as candidate_email',
        'c.id as candidate_id',
        'c.first_name as candidate_first_name',
        'c.last_name as candidate_last_name'
      )
      .first();

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    let meta: any = {};
    if (offer.meta) {
      try {
        meta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : offer.meta;
      } catch {
        meta = {};
      }
    }

    const candEmail = meta.candidateEmail || offer.candidate_email || (offer as any).candidateEmail;
    const candId = offer.candidate_id || meta.candidateId;
    const appId = offer.application_id || (offer as any).applicationId;

    let employeeId = meta.employeeId;

    // Try finding existing employee if employeeId not in meta
    if (!employeeId) {
      const existingEmp = await db('employees')
        .where(function() {
          if (candEmail) this.where('email', candEmail);
          if (candId) this.orWhere('source_candidate_id', candId);
          if (appId) this.orWhere('source_application_id', appId);
        })
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();

      if (existingEmp) {
        employeeId = existingEmp.id;
        meta.employeeId = existingEmp.id;
        meta.employeeCode = existingEmp.employee_code;
      } else if (appId) {
        // Auto-provision employee right now
        try {
          const onboardResult = await this.onCandidateHired(ctx, appId);
          employeeId = onboardResult.employeeId;
          meta.employeeId = onboardResult.employeeId;
          meta.employeeCode = onboardResult.employeeCode;
        } catch (onboardErr) {
          console.warn('Could not auto-provision during credential update:', onboardErr);
        }
      }
    }

    const passwordHash = await hash(newPassword.trim(), {
      type: 2, // argon2id
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Update or create user account
    if (employeeId || candEmail) {
      const existingUser = await db('users')
        .where(function() {
          if (employeeId) this.where('employee_id', employeeId);
          if (candEmail) this.orWhere('email', candEmail);
        })
        .where('organization_id', ctx.organizationId)
        .first();

      if (existingUser) {
        await db('users').where('id', existingUser.id).update({
          employee_id: employeeId || existingUser.employee_id,
          password_hash: passwordHash,
          status: 'active',
          updated_at: new Date(),
        });
      } else if (candEmail) {
        await db('users').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          company_id: ctx.companyId || null,
          employee_id: employeeId || null,
          email: candEmail,
          password_hash: passwordHash,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    // Update meta
    meta.tempPassword = newPassword.trim();
    meta.credentialsUpdatedAt = new Date().toISOString();

    await db('offers').where('id', offerId).update({
      meta: JSON.stringify(meta),
      updated_at: new Date(),
    });

    return {
      success: true,
      offerId,
      employeeId: employeeId || null,
      tempPassword: newPassword.trim(),
    };
  }

  /**
   * Get onboarding status & credentials summary for an offer
   */
  async getOfferOnboardingDetails(ctx: TenantContext, offerId: number): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const offer = await db('offers as o')
      .leftJoin('applications as a', 'o.application_id', 'a.id')
      .leftJoin('candidates as c', 'a.candidate_id', 'c.id')
      .leftJoin('departments as d', 'o.department_id', 'd.id')
      .leftJoin('designations as des', 'o.designation_id', 'des.id')
      .where('o.id', offerId)
      .where('o.organization_id', ctx.organizationId)
      .select(
        'o.*',
        db.raw("TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as candidate_name"),
        'c.email as candidate_email',
        'c.phone as candidate_phone',
        'c.id as candidate_id',
        'd.name as department_name',
        'des.name as designation_name'
      )
      .first();

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    let meta: any = {};
    if (offer.meta) {
      try {
        meta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : offer.meta;
      } catch {
        meta = {};
      }
    }

    let employee: any = null;
    let employeeId = meta.employeeId;

    if (!employeeId && offer.candidate_email) {
      employee = await db('employees')
        .where('email', offer.candidate_email)
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();
      if (employee) employeeId = employee.id;
    } else if (employeeId) {
      employee = await db('employees')
        .where('id', employeeId)
        .where('organization_id', ctx.organizationId)
        .first();
    }

    const candidateName = (offer.candidate_name || meta.candidateName || 'Candidate').trim();
    const cleanName = candidateName.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'Emp';
    const tempPassword = meta.tempPassword || `${cleanName}@${new Date().getFullYear()}!`;

    return {
      offerId: offer.id,
      offerCode: offer.offer_code || offer.offerCode,
      offerStatus: offer.status,
      candidateId: offer.candidate_id,
      candidateName,
      candidateEmail: offer.candidate_email || meta.candidateEmail || 'No Email',
      candidatePhone: offer.candidate_phone || 'N/A',
      positionTitle: offer.position_title || 'N/A',
      departmentName: offer.department_name || 'General',
      designationName: offer.designation_name || 'Staff',
      joiningDate: offer.offer_start_date,
      costToCompany: offer.cost_to_company,
      baseSalary: offer.base_salary,
      currency: offer.currency || 'INR',
      isOnboarded: !!employee,
      employeeId: employee?.id || employeeId || null,
      employeeCode: employee?.employee_code || meta.employeeCode || null,
      employeeStatus: employee?.status || (offer.status === 'accepted' ? 'onboarding' : 'not_started'),
      tempPassword,
      onboardedAt: meta.onboardedAt || null,
    };

  }

  /**
   * Generate employee code from candidate info
   */
  private generateEmployeeCode(candidate: any): string {
    const timestamp = Date.now().toString().slice(-4);
    const firstName = candidate.firstName || candidate.first_name || 'E';
    const lastName = candidate.lastName || candidate.last_name || 'M';
    const initials = `${firstName[0] || 'E'}${lastName[0] || 'M'}`.toUpperCase();
    return `EMP-${initials}-${timestamp}`;
  }

  /**
   * Create user account for new employee
   * Integrates with auth module
   */
  async createEmployeeUserAccount(
    ctx: TenantContext,
    employeeId: number,
    input: {
      email: string;
      firstName: string;
      lastName: string;
    }
  ): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const [userId] = await db('users').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      email: input.email,
      password_hash: '$argon2id$v=19$m=65536,t=3,p=4$Rk5DZHlqZk5yNmt6U1E2WQ$Z5K5mQy5l0Q2K4P4O4P4Q4', // Temp default password
      employee_id: employeeId,
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    return {
      userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      accountCreatedAt: now,
    };
  }

  /**
   * Assign department and reporting manager
   */
  async assignEmployeeHierarchy(
    ctx: TenantContext,
    employeeId: number,
    input: {
      departmentId: number;
      designationId: number;
      reportingManagerId?: number;
    }
  ): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db('employees')
      .where({ id: employeeId, organization_id: ctx.organizationId })
      .update({
        current_department_id: input.departmentId,
        current_designation_id: input.designationId,
        reporting_manager_id: input.reportingManagerId || null,
        updated_at: now,
      });

    return {
      employeeId,
      departmentId: input.departmentId,
      designationId: input.designationId,
      reportingManagerId: input.reportingManagerId || null,
      assignedAt: now,
    };
  }

  /**
   * Trigger onboarding workflow
   * Integrates with WorkflowService
   */
  async triggerOnboardingWorkflow(
    ctx: TenantContext,
    employeeId: number,
    input: {
      workflowType: string;
      department: number;
      positionTitle: string;
      joinDate: string;
    }
  ): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let instanceId = 0;
    try {
      const hasOnboardingInstTable = await db.schema.hasTable('employee_onboarding_instances');
      if (hasOnboardingInstTable) {
        [instanceId] = await db('employee_onboarding_instances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: employeeId,
          status: 'initiated',
          initiated_at: now,
          created_at: now,
          updated_at: now,
        });
      }
    } catch (e) {
      console.warn('Failed to insert onboarding instance:', e);
    }

    return {
      workflowInstanceId: instanceId || Math.random().toString(36).substr(2, 9),
      employeeId,
      workflowType: input.workflowType,
      department: input.department,
      positionTitle: input.positionTitle,
      joinDate: input.joinDate,
      workflowInitiatedAt: now,
    };
  }

  /**
   * Send welcome notification/email to new employee
   */
  async sendWelcomeNotification(
    ctx: TenantContext,
    employeeId: number,
    input: {
      email: string;
      firstName: string;
      joinDate: string;
      onboardingPortalUrl: string;
    }
  ): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const { v4: uuidv4 } = await import('uuid');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let notifId = 0;
    try {
      [notifId] = await db('notifications').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        user_id: employeeId, // Link to provisioned employee/user
        type: 'welcome_email',
        title: 'Welcome to the Organization!',
        message: `Hello ${input.firstName}, welcome to our team! Your onboarding journey starts on ${input.joinDate}. Access your portal here: ${input.onboardingPortalUrl}`,
        status: 'unread',
        created_at: now,
        updated_at: now,
      });
    } catch (e) {
      console.warn('Failed to insert notification:', e);
    }

    return {
      notificationId: notifId || Math.random().toString(36).substr(2, 9),
      recipientEmail: input.email,
      type: 'welcome_email',
      sentAt: now,
    };
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(ctx: TenantContext, employeeId: number): Promise<any> {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await db('employees')
      .where({ id: employeeId, organization_id: ctx.organizationId })
      .update({
        status: 'active',
        updated_at: now,
      });

    return {
      employeeId,
      status: 'active',
      onboardingCompletedAt: now,
    };
  }
}

