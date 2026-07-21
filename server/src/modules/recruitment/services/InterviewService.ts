import { v4 as uuidv4 } from 'uuid';
import { InterviewRepository, type Interview } from '../repositories/InterviewRepository';
import { InterviewFeedbackRepository, type InterviewFeedback } from '../repositories/SupportingRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export class InterviewService {
  private interviewRepo: InterviewRepository;
  private feedbackRepo: InterviewFeedbackRepository;
  private applicationRepo: ApplicationRepository;
  private notificationService: NotificationService;

  constructor() {
    this.interviewRepo = new InterviewRepository();
    this.feedbackRepo = new InterviewFeedbackRepository();
    this.applicationRepo = new ApplicationRepository();
    this.notificationService = new NotificationService();
  }

  async scheduleInterview(
    ctx: TenantContext,
    input: {
      applicationId: number;
      interviewType: string;
      interviewRound: number;
      scheduledDate: string;
      durationMinutes?: number;
      meetingUrl?: string;
      interviewerIds: number[];
    }
  ): Promise<Interview> {
    const application = await this.applicationRepo.getById(ctx, input.applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const interview = await this.interviewRepo.create(ctx, {
      uuid: uuidv4(),
      application_id: input.applicationId,
      interview_type: input.interviewType,
      interview_round: input.interviewRound,
      scheduled_date: input.scheduledDate,
      interview_duration_minutes: input.durationMinutes || 30,
      status: 'scheduled',
      meeting_url: input.meetingUrl || null,
      recording_url: null,
      feedback_submitted: false,
      interviewer_ids: JSON.stringify(input.interviewerIds),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    // Update application status
    await this.applicationRepo.update(ctx, input.applicationId, {
      application_status: 'interview',
      updated_by: ctx.userId,
    } as any);

    // Send notification to interviewers
    for (const interviewerId of input.interviewerIds) {
      try {
        await this.notificationService.sendNotification(ctx, {
          userId: interviewerId,
          type: 'interview_scheduled',
          title: 'Interview Scheduled',
          message: `You have been scheduled for an interview on ${input.scheduledDate}`,
          metadata: {
            interviewId: interview.id,
            applicationId: input.applicationId,
          },
        });
      } catch (error) {
        // Log but don't fail
        console.error('Failed to send interview notification:', error);
      }
    }

    return interview;
  }

  async submitFeedback(
    ctx: TenantContext,
    interviewId: number,
    input: {
      overallRating: number;
      technicalRating?: number;
      communicationRating?: number;
      culturalFitRating?: number;
      feedbackText?: string;
      wouldRecommend?: boolean;
    }
  ): Promise<InterviewFeedback> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.status !== 'completed') {
      throw new ValidationError('Can only submit feedback for completed interviews');
    }

    const feedback = await this.feedbackRepo.create(ctx, {
      uuid: uuidv4(),
      interview_id: interviewId,
      interviewer_id: ctx.userId,
      overall_rating: input.overallRating,
      technical_rating: input.technicalRating || null,
      communication_rating: input.communicationRating || null,
      cultural_fit_rating: input.culturalFitRating || null,
      feedback_text: input.feedbackText || null,
      would_recommend: input.wouldRecommend || null,
    } as any);

    // Check if all interviewers have submitted feedback
    const allFeedback = await this.feedbackRepo.getByInterview(ctx, interviewId);
    const interviewerIds = JSON.parse(interview.interviewer_ids || '[]');
    if (allFeedback.items.length === interviewerIds.length) {
      await this.interviewRepo.update(ctx, interviewId, {
        feedback_submitted: true,
        updated_by: ctx.userId,
      } as any);
    }

    return feedback;
  }

  async completeInterview(ctx: TenantContext, interviewId: number, recordingUrl?: string): Promise<Interview> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    return this.interviewRepo.update(ctx, interviewId, {
      status: 'completed',
      recording_url: recordingUrl || null,
      updated_by: ctx.userId,
    } as any);
  }

  async rescheduleInterview(
    ctx: TenantContext,
    interviewId: number,
    newScheduledDate: string
  ): Promise<Interview> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.status !== 'scheduled') {
      throw new ValidationError('Can only reschedule scheduled interviews');
    }

    return this.interviewRepo.update(ctx, interviewId, {
      scheduled_date: newScheduledDate,
      status: 'rescheduled',
      updated_by: ctx.userId,
    } as any);
  }

  async cancelInterview(ctx: TenantContext, interviewId: number): Promise<Interview> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    return this.interviewRepo.update(ctx, interviewId, {
      status: 'cancelled',
      updated_by: ctx.userId,
    } as any);
  }

  async getInterview(ctx: TenantContext, interviewId: number): Promise<Interview> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }
    return interview;
  }

  async getInterviewsByApplication(ctx: TenantContext, applicationId: number, options?: ListQueryOptions) {
    return this.interviewRepo.getByApplication(ctx, applicationId, options);
  }

  async getInterviewSchedule(ctx: TenantContext, userId: number, options?: ListQueryOptions) {
    return this.interviewRepo.getByInterviewer(ctx, userId, options);
  }

  async getInterviewFeedback(ctx: TenantContext, interviewId: number, options?: ListQueryOptions) {
    return this.feedbackRepo.getByInterview(ctx, interviewId, options);
  }
}
