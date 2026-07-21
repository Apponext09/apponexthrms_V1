import { logger } from '@/common/lib/logger';
import { subscribeEvent } from '../../../realtime/eventBus';
import { NotificationService } from '../../notifications/services/notification.service';
import type { TenantContext } from '../../../db/types';

/**
 * Performance Management System - Notification Integration Hooks
 * Triggers notifications for performance-related events
 */

/**
 * Initialize notification hooks
 * Register all notification event listeners
 */
export function initializeNotificationHooks(notificationService: NotificationService): void {
  logger.info('Initializing performance notification hooks');

  // Review cycle notifications
  registerReviewCycleStartNotification(notificationService);

  // Pending feedback notifications
  registerPendingFeedbackNotification(notificationService);

  // Goal due date notifications
  registerGoalDueDateNotification(notificationService);

  // PIP milestone notifications
  registerPIPMilestoneNotification(notificationService);

  // Appraisal completion notifications
  registerAppraisalCompletionNotification(notificationService);

  // Recognition notifications
  registerRecognitionNotification(notificationService);

  logger.info('Performance notification hooks initialized successfully');
}

/**
 * Notification: Review Cycle Started
 * Notifies employees when a review cycle starts
 */
function registerReviewCycleStartNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; cycleId: number; employeeIds: number[] }>(
    'performance.review_cycle_activated',
    async (event) => {
      try {
        const { ctx, cycleId, employeeIds } = event;

        logger.info(`Sending review cycle start notifications for cycle ${cycleId}`);

        for (const employeeId of employeeIds) {
          try {
            await notificationService.sendNotification(ctx, {
              eventCode: 'performance.review_cycle_started',
              recipientId: employeeId,
              variables: {
                cycleId: String(cycleId),
                employeeName: '', // Will be resolved by template
              },
              priority: 'normal',
              channels: ['in_app', 'email'],
            });
          } catch (error) {
            logger.error(`Error sending review cycle notification to employee ${employeeId}:`, error);
            // Continue with other employees
          }
        }

        logger.info(`Review cycle start notifications sent for cycle ${cycleId}`);
      } catch (error) {
        logger.error('Error processing review cycle start notifications:', error);
      }
    }
  );
}

/**
 * Notification: Pending Feedback Requests
 * Notifies reviewers about pending feedback requests
 */
function registerPendingFeedbackNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; requestId: number; reviewerId: number; revieweeName: string }>(
    'performance.feedback_requested',
    async (event) => {
      try {
        const { ctx, requestId, reviewerId, revieweeName } = event;

        logger.info(`Sending pending feedback notification to reviewer ${reviewerId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.feedback_pending',
          recipientId: reviewerId,
          variables: {
            requestId: String(requestId),
            revieweeName,
            dueDate: '', // Will be set in template
          },
          priority: 'normal',
          channels: ['in_app', 'email'],
        });

        logger.info(`Pending feedback notification sent to reviewer ${reviewerId}`);
      } catch (error) {
        logger.error('Error sending pending feedback notification:', error);
      }
    }
  );
}

/**
 * Notification: Goal Due Date Reminder
 * Notifies employees about upcoming goal due dates
 */
function registerGoalDueDateNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; goalId: number; employeeId: number; goalTitle: string; daysUntilDue: number }>(
    'performance.goal_due_date_approaching',
    async (event) => {
      try {
        const { ctx, goalId, employeeId, goalTitle, daysUntilDue } = event;

        logger.info(`Sending goal due date reminder to employee ${employeeId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.goal_due_soon',
          recipientId: employeeId,
          variables: {
            goalId: String(goalId),
            goalTitle,
            daysUntilDue: String(daysUntilDue),
          },
          priority: daysUntilDue <= 3 ? 'high' : 'normal',
          channels: ['in_app', 'email'],
        });

        logger.info(`Goal due date reminder sent to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error sending goal due date notification:', error);
      }
    }
  );
}

/**
 * Notification: PIP Milestone Reminders
 * Notifies employees about upcoming PIP milestone reviews
 */
function registerPIPMilestoneNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; pipId: number; employeeId: number; milestoneName: string; dueDate: string }>(
    'performance.pip_milestone_upcoming',
    async (event) => {
      try {
        const { ctx, pipId, employeeId, milestoneName, dueDate } = event;

        logger.info(`Sending PIP milestone reminder to employee ${employeeId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.pip_milestone_reminder',
          recipientId: employeeId,
          variables: {
            pipId: String(pipId),
            milestoneName,
            dueDate,
          },
          priority: 'high',
          channels: ['in_app', 'email'],
        });

        logger.info(`PIP milestone reminder sent to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error sending PIP milestone notification:', error);
      }
    }
  );
}

/**
 * Notification: Appraisal Completion
 * Notifies employees when their appraisal is completed
 */
function registerAppraisalCompletionNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; appraisalId: number; employeeId: number; rating: string }>(
    'performance.appraisal_completed',
    async (event) => {
      try {
        const { ctx, appraisalId, employeeId, rating } = event;

        logger.info(`Sending appraisal completion notification to employee ${employeeId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.appraisal_complete',
          recipientId: employeeId,
          variables: {
            appraisalId: String(appraisalId),
            rating,
          },
          priority: 'normal',
          channels: ['in_app', 'email'],
        });

        logger.info(`Appraisal completion notification sent to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error sending appraisal completion notification:', error);
      }
    }
  );
}

/**
 * Notification: Recognition Received
 * Notifies employees when they receive recognition/rewards
 */
function registerRecognitionNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; recognitionId: number; employeeId: number; recognitionText: string; points: number; givenBy: string }>(
    'performance.recognition_given',
    async (event) => {
      try {
        const { ctx, recognitionId, employeeId, recognitionText, points, givenBy } = event;

        logger.info(`Sending recognition notification to employee ${employeeId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.recognition_received',
          recipientId: employeeId,
          variables: {
            recognitionId: String(recognitionId),
            recognitionText,
            points: String(points),
            givenBy,
          },
          priority: 'normal',
          channels: ['in_app', 'email', 'sms'],
        });

        logger.info(`Recognition notification sent to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error sending recognition notification:', error);
      }
    }
  );
}

/**
 * Notification: Goal Approved
 * Notifies employees when their goal is approved
 */
export function registerGoalApprovedNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; goalId: number; employeeId: number; goalTitle: string }>(
    'performance.goal_approved',
    async (event) => {
      try {
        const { ctx, goalId, employeeId, goalTitle } = event;

        logger.info(`Sending goal approval notification to employee ${employeeId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.goal_approved',
          recipientId: employeeId,
          variables: {
            goalId: String(goalId),
            goalTitle,
          },
          priority: 'normal',
          channels: ['in_app', 'email'],
        });

        logger.info(`Goal approval notification sent to employee ${employeeId}`);
      } catch (error) {
        logger.error('Error sending goal approval notification:', error);
      }
    }
  );
}

/**
 * Notification: Review Submitted
 * Notifies approvers when a review is submitted for their approval
 */
export function registerReviewSubmittedNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; reviewId: number; approverId: number; employeeName: string }>(
    'performance.review_submitted',
    async (event) => {
      try {
        const { ctx, reviewId, approverId, employeeName } = event;

        logger.info(`Sending review submitted notification to approver ${approverId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.review_pending_approval',
          recipientId: approverId,
          variables: {
            reviewId: String(reviewId),
            employeeName,
          },
          priority: 'high',
          channels: ['in_app', 'email'],
        });

        logger.info(`Review submitted notification sent to approver ${approverId}`);
      } catch (error) {
        logger.error('Error sending review submitted notification:', error);
      }
    }
  );
}

/**
 * Notification: Appraisal Submitted
 * Notifies approvers when an appraisal is submitted for their approval
 */
export function registerAppraisalSubmittedNotification(notificationService: NotificationService): void {
  subscribeEvent<{ ctx: TenantContext; appraisalId: number; approverId: number; employeeName: string }>(
    'performance.appraisal_finalized',
    async (event) => {
      try {
        const { ctx, appraisalId, approverId, employeeName } = event;

        logger.info(`Sending appraisal finalized notification to approver ${approverId}`);

        await notificationService.sendNotification(ctx, {
          eventCode: 'performance.appraisal_pending_approval',
          recipientId: approverId,
          variables: {
            appraisalId: String(appraisalId),
            employeeName,
          },
          priority: 'high',
          channels: ['in_app', 'email'],
        });

        logger.info(`Appraisal finalized notification sent to approver ${approverId}`);
      } catch (error) {
        logger.error('Error sending appraisal finalized notification:', error);
      }
    }
  );
}


