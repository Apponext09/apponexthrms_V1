import { logger } from '@/common/lib/logger';
import { publishEvent } from '../../../realtime/eventBus';
import type { TenantContext } from '../../../db/types';
import { WorkflowExecutionService } from '../../workflow/services/WorkflowExecutionService';

/**
 * Performance Management System - Workflow Integration Hooks
 * Triggers workflow processes for performance-related approvals
 */

interface GoalApprovalEvent {
  goalId: number;
  employeeId: number;
  approvalType: 'goal_approval';
  timestamp: string;
}

interface ReviewApprovalEvent {
  reviewId: number;
  employeeId: number;
  cycleId: number;
  approvalType: 'review_approval';
  timestamp: string;
}

interface AppraisalApprovalEvent {
  appraisalId: number;
  employeeId: number;
  cycleId: number;
  approvalType: 'appraisal_approval';
  timestamp: string;
}

interface PIPApprovalEvent {
  pipId: number;
  employeeId: number;
  approvalType: 'pip_approval';
  timestamp: string;
}

interface SalaryIncrementEvent {
  employeeId: number;
  incrementPercentage: number;
  effectiveDate: string;
  approvalType: 'salary_increment_approval';
  timestamp: string;
}

/**
 * Initialize workflow hooks
 * Register all workflow event listeners
 */
export function initializeWorkflowHooks(WorkflowExecutionService: WorkflowExecutionService): void {
  logger.info('Initializing performance workflow hooks');

  // Goal approval workflow
  registerGoalApprovalHook(WorkflowExecutionService);

  // Review approval workflow
  registerReviewApprovalHook(WorkflowExecutionService);

  // Appraisal approval workflow
  registerAppraisalApprovalHook(WorkflowExecutionService);

  // PIP approval workflow
  registerPIPApprovalHook(WorkflowExecutionService);

  // Salary increment approval workflow
  registerSalaryIncrementApprovalHook(WorkflowExecutionService);

  logger.info('Performance workflow hooks initialized successfully');
}

/**
 * Hook: Goal Approval Workflow
 * Triggered when a goal is submitted for approval
 */
function registerGoalApprovalHook(WorkflowExecutionService: WorkflowExecutionService): void {
  publishEvent('performance.goal_submitted', async (event: GoalApprovalEvent & { ctx: TenantContext }) => {
    try {
      const { ctx, goalId, employeeId } = event;

      logger.info(`Triggering goal approval workflow for goal ${goalId}`);

      // Trigger workflow process
      await (WorkflowExecutionService as any).startProcess(ctx, {
        processType: 'goal_approval',
        entityType: 'GOAL',
        entityId: goalId,
        initiatorId: employeeId,
        context: {
          goalId,
          employeeId,
          timestamp: new Date().toISOString(),
        },
      } as any);

      // Publish workflow started event
      publishEvent('performance.goal_approval_started', {
        goalId,
        employeeId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Goal approval workflow started for goal ${goalId}`);
    } catch (error) {
      logger.error('Error triggering goal approval workflow:', error);
      // Don't throw - allow system to continue
    }
  });
}

/**
 * Hook: Review Approval Workflow
 * Triggered when a review is submitted for approval
 */
function registerReviewApprovalHook(WorkflowExecutionService: WorkflowExecutionService): void {
  publishEvent('performance.review_submitted', async (event: ReviewApprovalEvent & { ctx: TenantContext }) => {
    try {
      const { ctx, reviewId, employeeId, cycleId } = event;

      logger.info(`Triggering review approval workflow for review ${reviewId}`);

      // Trigger workflow process
      await (WorkflowExecutionService as any).startProcess(ctx, {
        processType: 'review_approval',
        entityType: 'REVIEW',
        entityId: reviewId,
        initiatorId: employeeId,
        context: {
          reviewId,
          employeeId,
          cycleId,
          timestamp: new Date().toISOString(),
        },
      } as any);

      // Publish workflow started event
      publishEvent('performance.review_approval_started', {
        reviewId,
        employeeId,
        cycleId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Review approval workflow started for review ${reviewId}`);
    } catch (error) {
      logger.error('Error triggering review approval workflow:', error);
      // Don't throw - allow system to continue
    }
  });
}

/**
 * Hook: Appraisal Approval Workflow
 * Triggered when an appraisal is finalized and submitted for approval
 */
function registerAppraisalApprovalHook(WorkflowExecutionService: WorkflowExecutionService): void {
  publishEvent('performance.appraisal_finalized', async (event: AppraisalApprovalEvent & { ctx: TenantContext }) => {
    try {
      const { ctx, appraisalId, employeeId, cycleId } = event;

      logger.info(`Triggering appraisal approval workflow for appraisal ${appraisalId}`);

      // Trigger workflow process
      await (WorkflowExecutionService as any).startProcess(ctx, {
        processType: 'appraisal_approval',
        entityType: 'APPRAISAL',
        entityId: appraisalId,
        initiatorId: employeeId,
        context: {
          appraisalId,
          employeeId,
          cycleId,
          timestamp: new Date().toISOString(),
        },
      } as any);

      // Publish workflow started event
      publishEvent('performance.appraisal_approval_started', {
        appraisalId,
        employeeId,
        cycleId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Appraisal approval workflow started for appraisal ${appraisalId}`);
    } catch (error) {
      logger.error('Error triggering appraisal approval workflow:', error);
      // Don't throw - allow system to continue
    }
  });
}

/**
 * Hook: PIP Approval Workflow
 * Triggered when a PIP is created and needs approval
 */
function registerPIPApprovalHook(WorkflowExecutionService: WorkflowExecutionService): void {
  publishEvent('performance.pip_created', async (event: PIPApprovalEvent & { ctx: TenantContext }) => {
    try {
      const { ctx, pipId, employeeId } = event;

      logger.info(`Triggering PIP approval workflow for PIP ${pipId}`);

      // Trigger workflow process
      await (WorkflowExecutionService as any).startProcess(ctx, {
        processType: 'pip_approval',
        entityType: 'PIP',
        entityId: pipId,
        initiatorId: employeeId,
        context: {
          pipId,
          employeeId,
          timestamp: new Date().toISOString(),
        },
      } as any);

      // Publish workflow started event
      publishEvent('performance.pip_approval_started', {
        pipId,
        employeeId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`PIP approval workflow started for PIP ${pipId}`);
    } catch (error) {
      logger.error('Error triggering PIP approval workflow:', error);
      // Don't throw - allow system to continue
    }
  });
}

/**
 * Hook: Salary Increment Approval Workflow
 * Triggered when salary increment recommendations are ready for approval
 */
function registerSalaryIncrementApprovalHook(WorkflowExecutionService: WorkflowExecutionService): void {
  publishEvent('performance.salary_increment_recommended', async (event: SalaryIncrementEvent & { ctx: TenantContext }) => {
    try {
      const { ctx, employeeId, incrementPercentage, effectiveDate } = event;

      logger.info(`Triggering salary increment approval workflow for employee ${employeeId}`);

      // Trigger workflow process
      await (WorkflowExecutionService as any).startProcess(ctx, {
        processType: 'salary_increment_approval',
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        initiatorId: ctx.userId,
        context: {
          employeeId,
          incrementPercentage,
          effectiveDate,
          timestamp: new Date().toISOString(),
        },
      } as any);

      // Publish workflow started event
      publishEvent('performance.salary_increment_approval_started', {
        employeeId,
        incrementPercentage,
        effectiveDate,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Salary increment approval workflow started for employee ${employeeId}`);
    } catch (error) {
      logger.error('Error triggering salary increment approval workflow:', error);
      // Don't throw - allow system to continue
    }
  });
}

/**
 * Hook: Workflow Completion Handlers
 * Handle actions when workflows are completed/approved
 */
export function registerWorkflowCompletionHandlers(WorkflowExecutionService: WorkflowExecutionService): void {
  // Goal approval completion
  publishEvent('workflow.goal_approval_completed', async (event: { processId: number; status: 'approved' | 'rejected'; ctx: TenantContext }) => {
    try {
      const { status } = event;
      if (status === 'approved') {
        publishEvent('performance.goal_approved', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling goal approval completion:', error);
    }
  });

  // Review approval completion
  publishEvent('workflow.review_approval_completed', async (event: { processId: number; status: 'approved' | 'rejected'; ctx: TenantContext }) => {
    try {
      const { status } = event;
      if (status === 'approved') {
        publishEvent('performance.review_approved', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling review approval completion:', error);
    }
  });

  // Appraisal approval completion
  publishEvent('workflow.appraisal_approval_completed', async (event: { processId: number; status: 'approved' | 'rejected'; ctx: TenantContext }) => {
    try {
      const { status } = event;
      if (status === 'approved') {
        publishEvent('performance.appraisal_approved', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling appraisal approval completion:', error);
    }
  });

  // PIP approval completion
  publishEvent('workflow.pip_approval_completed', async (event: { processId: number; status: 'approved' | 'rejected'; ctx: TenantContext }) => {
    try {
      const { status } = event;
      if (status === 'approved') {
        publishEvent('performance.pip_approved', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling PIP approval completion:', error);
    }
  });

  // Salary increment approval completion
  publishEvent('workflow.salary_increment_approval_completed', async (event: { processId: number; status: 'approved' | 'rejected'; ctx: TenantContext }) => {
    try {
      const { status } = event;
      if (status === 'approved') {
        publishEvent('performance.salary_increment_approved', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Error handling salary increment approval completion:', error);
    }
  });
}



