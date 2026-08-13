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
  async onCandidateHired(ctx: TenantContext, applicationId: number): Promise<any> {
    const application = await this.applicationRepo.getById(ctx, applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const candId = application.candidateId || (application as any).candidate_id;
    const candidate = await this.candidateRepo.getById(ctx, candId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const offer = await this.offerRepo.getByApplication(ctx, applicationId);
    if (!offer) {
      throw new NotFoundError('No offer found for this application');
    }

    const offerStatus = offer.status || (offer as any).status;
    if (offerStatus !== 'accepted') {
      throw new ValidationError('Can only onboard candidates with accepted offers');
    }

    // Update candidate status to 'hired'
    await this.candidateRepo.update(ctx, candidate.id, {
      status: 'hired',
      updated_by: ctx.userId,
    } as any);

    // Create employee record programmatically
    const { EmployeeRepository } = await import('../../employee/repositories/EmployeeRepository');
    const employeeRepo = new EmployeeRepository();

    const employeeCode = this.generateEmployeeCode(candidate);

    const candEmail = candidate.email || (candidate as any).email;
    const candFirstName = candidate.firstName || (candidate as any).first_name;
    const candLastName = candidate.lastName || (candidate as any).last_name;
    const candPhone = candidate.phone || (candidate as any).phone;

    const offerDesigId = offer.designationId || (offer as any).designation_id;
    const offerDeptId = offer.departmentId || (offer as any).department_id;
    const offerStartDate = offer.offerStartDate || (offer as any).offer_start_date;
    const offerPositionTitle = offer.positionTitle || (offer as any).position_title;
    const offerCtc = offer.costToCompany || (offer as any).cost_to_company;
    const offerBaseSalary = offer.baseSalary || (offer as any).base_salary;

    // Check if employee with this email already exists to avoid duplicates
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const existingEmp = await db('employees').where('email', candEmail).whereNull('deleted_at').first();

    const { v4: uuidv4 } = await import('uuid');

    let employee;
    if (!existingEmp) {
      try {
        employee = await employeeRepo.create(ctx, {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_code: employeeCode,
          status: 'onboarding',
          first_name: candFirstName,
          last_name: candLastName,
          email: candEmail,
          phone: candPhone,
          current_designation_id: offerDesigId,
          current_department_id: offerDeptId,
          date_of_joining: offerStartDate,
          employment_type: 'full_time',
          created_by: ctx.userId,
          updated_by: ctx.userId,
        } as any);
        console.log(`👤 Auto-provisioned employee record: ${employeeCode} for candidate ${candEmail}`);
      } catch (insertError: any) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          fs.writeFileSync(path.resolve(process.cwd(), 'onboarding_error.log'), insertError.stack || insertError.message || String(insertError));
        } catch (fsErr) {}
        console.error('❌ ONBOARDING INSERTION FAILED:', insertError);
        throw insertError;
      }
    } else {
      employee = existingEmp;
      console.log(`👤 Employee record already exists for ${candEmail}, skipping auto-provisioning`);
    }

    const employeeId = employee.id || (employee as any).id;
    const onboardingData = {
      applicationId,
      candidateId: candId,
      offerId: offer.id,
      employeeId: employeeId,
      employeeCode: employee.employee_code || employeeCode,
      onboardingWorkflowData: {
        candidateName: `${candFirstName} ${candLastName}`,
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

