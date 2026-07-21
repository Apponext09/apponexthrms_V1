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

    const candidate = await this.candidateRepo.getById(ctx, application.candidate_id);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    const offer = await this.offerRepo.getByApplication(ctx, applicationId);
    if (!offer) {
      throw new NotFoundError('No offer found for this application');
    }

    if (offer.status !== 'accepted') {
      throw new ValidationError('Can only onboard candidates with accepted offers');
    }

    // Create employee record (would call EmployeeService)
    const employeeData = {
      employeeCode: this.generateEmployeeCode(candidate),
      firstName: candidate.first_name,
      lastName: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      dateOfJoining: offer.offer_start_date,
      employmentType: 'full_time',
      designationId: offer.designation_id,
      departmentId: offer.department_id,
      status: 'onboarding',
    };

    // In a real implementation, this would call EmployeeService.createEmployee
    // For now, we'll return the prepared data
    const onboardingData = {
      applicationId,
      candidateId: application.candidate_id,
      offerId: offer.id,
      employeeData,
      onboardingWorkflowData: {
        candidateName: `${candidate.first_name} ${candidate.last_name}`,
        positionTitle: offer.position_title,
        department: offer.department_id,
        joinDate: offer.offer_start_date,
        offeredCTC: offer.cost_to_company,
        baseSalary: offer.base_salary,
      },
    };

    return onboardingData;
  }

  /**
   * Generate employee code from candidate info
   */
  private generateEmployeeCode(candidate: any): string {
    const timestamp = Date.now().toString().slice(-4);
    const initials = `${candidate.first_name[0]}${candidate.last_name[0]}`.toUpperCase();
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
    // In real implementation, would call UserService to create account
    return {
      userId: employeeId, // Placeholder
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      accountCreatedAt: new Date().toISOString(),
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
    // In real implementation, would update employee designation and reporting chain
    return {
      employeeId,
      departmentId: input.departmentId,
      designationId: input.designationId,
      reportingManagerId: input.reportingManagerId || null,
      assignedAt: new Date().toISOString(),
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
    // In real implementation, would call WorkflowService.createInstance
    // with onboarding workflow definition
    return {
      workflowInstanceId: Math.random().toString(36).substr(2, 9),
      employeeId,
      workflowType: input.workflowType,
      department: input.department,
      positionTitle: input.positionTitle,
      joinDate: input.joinDate,
      workflowInitiatedAt: new Date().toISOString(),
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
    // In real implementation, would integrate with NotificationService
    return {
      notificationId: Math.random().toString(36).substr(2, 9),
      recipientEmail: input.email,
      type: 'welcome_email',
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(ctx: TenantContext, employeeId: number): Promise<any> {
    // Update employee status to 'active'
    // Archive onboarding workflow
    return {
      employeeId,
      status: 'active',
      onboardingCompletedAt: new Date().toISOString(),
    };
  }
}
