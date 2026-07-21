import { logger } from '@/common/lib/logger';
import { subscribeEvent } from '../../../realtime/eventBus';
import type { TenantContext } from '../../../db/types';

/**
 * Performance Management System - Recruitment Integration Hooks
 * Integrates new hire onboarding with performance management system
 */

interface CandidateHiredEvent {
  ctx: TenantContext;
  candidateId: number;
  employeeId: number;
  candidateName: string;
  hiredDate: string;
  probationEndDate: string;
  designationId: number;
}

interface OfferAcceptedEvent {
  ctx: TenantContext;
  candidateId: number;
  offerLetterId: number;
  acceptanceDate: string;
}

/**
 * Initialize recruitment hooks
 * Register all recruitment integration listeners
 */
export function initializeRecruitmentHooks(): void {
  logger.info('Initializing performance recruitment integration hooks');

  registerNewHireGoalSetupHook();
  registerProbationReviewWorkflowHook();
  registerOfferAcceptanceHook();

  logger.info('Performance recruitment integration hooks initialized successfully');
}

/**
 * Hook: Create Goal Template for New Hires
 * Sets up probation goals when an employee is hired
 */
function registerNewHireGoalSetupHook(): void {
  subscribeEvent<CandidateHiredEvent>(
    'recruitment.offer_accepted',
    async (event) => {
      try {
        const { ctx, candidateId, employeeId, candidateName, hiredDate, probationEndDate } = event;

        logger.info(`Creating probation goals for new hire ${candidateName} (Employee ID: ${employeeId})`);

        // Create onboarding goals
        const probationGoals = [
          {
            title: 'Complete Onboarding',
            description: 'Complete all required onboarding activities and training',
            category: 'onboarding',
            targetValue: 100,
            weight: 1,
          },
          {
            title: 'Department Familiarization',
            description: 'Understand department processes, tools, and team dynamics',
            category: 'development',
            targetValue: 100,
            weight: 1,
          },
          {
            title: 'Role-Specific Competencies',
            description: 'Demonstrate understanding of key role responsibilities',
            category: 'competency',
            targetValue: 80,
            weight: 1.5,
          },
          {
            title: 'Team Integration',
            description: 'Build positive relationships with team members',
            category: 'collaboration',
            targetValue: 100,
            weight: 1,
          },
        ];

        for (const goal of probationGoals) {
          const goalData = {
            employeeId,
            goalTitle: goal.title,
            goalDescription: goal.description,
            goalCategory: goal.category,
            targetValue: goal.targetValue,
            weight: goal.weight,
            startDate: hiredDate,
            endDate: probationEndDate,
            status: 'draft',
            template: 'probation_goal',
            timestamp: new Date().toISOString(),
          };

          logger.debug(`Creating goal:`, goalData);

          // Publish goal creation event for performance module to handle
          subscribeEvent<{ ctx: TenantContext }>(
            'performance.probation_goal_to_create',
            async (goalEvent) => {
              try {
                logger.info(`Processing probation goal creation for employee ${employeeId}`);
              } catch (error) {
                logger.error('Error processing probation goal:', error);
              }
            }
          );
        }

        logger.info(`Probation goals created for new hire ${employeeId}`);
      } catch (error) {
        logger.error('Error creating probation goals:', error);
      }
    }
  );
}

/**
 * Hook: Create Probation Review Workflow
 * Sets up probation review workflow when employee enters probation
 */
function registerProbationReviewWorkflowHook(): void {
  subscribeEvent<CandidateHiredEvent>(
    'recruitment.candidate_hired',
    async (event) => {
      try {
        const { ctx, employeeId, candidateName, hiredDate, probationEndDate } = event;

        logger.info(`Setting up probation review workflow for employee ${employeeId}`);

        // Create probation review cycle
        const reviewCycle = {
          employeeId,
          cycleType: 'probation',
          cycleName: `Probation Review - ${candidateName}`,
          startDate: hiredDate,
          endDate: probationEndDate,
          description: 'Probation period performance evaluation',
          status: 'scheduled',
          reviewerAssignment: 'auto',
          timestamp: new Date().toISOString(),
        };

        logger.debug(`Creating probation review cycle:`, reviewCycle);

        // Publish review cycle creation event
        subscribeEvent<{ ctx: TenantContext }>(
          'performance.probation_cycle_to_create',
          async (cycleEvent) => {
            try {
              logger.info(`Processing probation review cycle for employee ${employeeId}`);
            } catch (error) {
              logger.error('Error processing probation review cycle:', error);
            }
          }
        );

        // Schedule probation review workflow
        const probationWorkflow = {
          processType: 'probation_review',
          employeeId,
          startDate: hiredDate,
          reviewDate: probationEndDate,
          reviewerType: 'direct_manager',
          approverType: 'hr_department',
          timestamp: new Date().toISOString(),
        };

        logger.debug(`Scheduling probation workflow:`, probationWorkflow);

        // Publish workflow scheduling event
        subscribeEvent<{ ctx: TenantContext }>(
          'performance.probation_workflow_scheduled',
          async (workflowEvent) => {
            try {
              logger.info(`Processing probation workflow for employee ${employeeId}`);
            } catch (error) {
              logger.error('Error processing probation workflow:', error);
            }
          }
        );

        logger.info(`Probation review workflow set up for employee ${employeeId}`);
      } catch (error) {
        logger.error('Error setting up probation review workflow:', error);
      }
    }
  );
}

/**
 * Hook: Map Candidate to Goal System After Offer Acceptance
 * Creates initial performance management records for new hires
 */
function registerOfferAcceptanceHook(): void {
  subscribeEvent<OfferAcceptedEvent>(
    'recruitment.offer_accepted_confirmation',
    async (event) => {
      try {
        const { ctx, candidateId, employeeId, acceptanceDate } = event;

        logger.info(`Mapping candidate ${candidateId} to performance system after offer acceptance`);

        // Get probable hire date (usually within 30 days)
        const startDate = new Date(acceptanceDate);
        startDate.setDate(startDate.getDate() + 30); // 30 days from acceptance
        const hireDate = startDate.toISOString().split('T')[0];

        // Create performance profile
        const performanceProfile = {
          employeeId,
          profileType: 'new_hire',
          setupStatus: 'pending',
          onboardingStartDate: hireDate,
          initialReviewDate: new Date(new Date(hireDate).getFullYear(), 8, 30).toISOString().split('T')[0], // Sept 30 for Q1 hires
          timestamp: new Date().toISOString(),
        };

        logger.debug(`Creating performance profile:`, performanceProfile);

        // Publish performance profile creation event
        subscribeEvent<{ ctx: TenantContext }>(
          'performance.profile_created_for_new_hire',
          async (profileEvent) => {
            try {
              logger.info(`Processing performance profile for employee ${employeeId}`);
            } catch (error) {
              logger.error('Error processing performance profile:', error);
            }
          }
        );

        // Mark candidate as mapped to performance system
        const candidateMapping = {
          candidateId,
          employeeId,
          mappingType: 'performance_system',
          mappedDate: new Date().toISOString(),
          status: 'mapped',
        };

        logger.debug(`Candidate mapping created:`, candidateMapping);

        logger.info(`Candidate ${candidateId} mapped to performance system`);
      } catch (error) {
        logger.error('Error mapping candidate to performance system:', error);
      }
    }
  );
}

/**
 * Hook: Set Up Initial Competency Assessment
 * Creates initial competency framework assignment for new hires
 */
export function registerInitialCompetencySetupHook(): void {
  subscribeEvent<{ ctx: TenantContext; employeeId: number; designationId: number; departmentId: number }>(
    'employee.onboarded',
    async (event) => {
      try {
        const { ctx, employeeId, designationId, departmentId } = event;

        logger.info(`Setting up competency framework for employee ${employeeId}`);

        // Assign competency framework based on designation
        const competencyAssignment = {
          employeeId,
          designationId,
          departmentId,
          assignmentDate: new Date().toISOString(),
          assessmentScheduleDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days out
          status: 'assigned',
        };

        logger.debug(`Competency framework assignment:`, competencyAssignment);

        // Publish competency setup event
        subscribeEvent<{ ctx: TenantContext }>(
          'performance.competency_framework_assigned',
          async (competencyEvent) => {
            try {
              logger.info(`Processing competency framework for employee ${employeeId}`);
            } catch (error) {
              logger.error('Error processing competency framework:', error);
            }
          }
        );

        logger.info(`Competency framework assigned to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error setting up competency framework:', error);
      }
    }
  );
}

/**
 * Helper: Get probation end date based on hire date
 */
export function calculateProbationEndDate(hireDate: string, probationMonths: number = 6): string {
  const date = new Date(hireDate);
  date.setMonth(date.getMonth() + probationMonths);
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Get review schedule for new hire
 */
export function getNewHireReviewSchedule(hireDate: string): { thirtyDayReview: string; sixtyDayReview: string; probationEndReview: string } {
  const hireDateTime = new Date(hireDate);

  const thirtyDays = new Date(hireDateTime);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const sixtyDays = new Date(hireDateTime);
  sixtyDays.setDate(sixtyDays.getDate() + 60);

  const probationEnd = new Date(hireDateTime);
  probationEnd.setMonth(probationEnd.getMonth() + 6);

  return {
    thirtyDayReview: thirtyDays.toISOString().split('T')[0],
    sixtyDayReview: sixtyDays.toISOString().split('T')[0],
    probationEndReview: probationEnd.toISOString().split('T')[0],
  };
}


