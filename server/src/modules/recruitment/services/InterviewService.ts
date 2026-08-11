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

    // Save panel records to interview_panel table
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const panelRecords = input.interviewerIds.map((employeeId) => ({
      organization_id: ctx.organizationId,
      interview_id: interview.id,
      employee_id: employeeId,
    }));
    if (panelRecords.length > 0) {
      await db('interview_panel').insert(panelRecords);
    }

    // Update application status via StatusSyncService
    const { statusSyncService } = await import('./StatusSyncService');
    await statusSyncService.syncApplicationStatus(
      ctx,
      input.applicationId,
      'interview',
      {
        triggeredBy: 'interview_scheduled',
        notes: `Interview scheduled (Round ${input.interviewRound}, Type: ${input.interviewType})`,
        metadata: {
          interviewId: interview.id,
          round: input.interviewRound,
          type: input.interviewType,
          scheduledDate: input.scheduledDate,
        },
        changedBy: ctx.userId,
      }
    );

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
        } as any);
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

    const feedback = await this.feedbackRepo.create(ctx, {
      uuid: uuidv4(),
      interview_id: interviewId,
      interviewer_id: ctx.userId,
      overall_rating: input.overallRating,
      technical_rating: input.technicalRating || null,
      communication_rating: input.communicationRating || null,
      cultural_fit_rating: input.culturalFitRating || null,
      feedback_text: input.feedbackText || null,
      would_recommend: input.wouldRecommend !== undefined ? input.wouldRecommend : true,
    } as any);

    // Check if ALL assigned interviewers have now submitted feedback
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    const panelCountRes = await db('interview_panel')
      .where({ interview_id: interviewId, organization_id: ctx.organizationId })
      .count('id as count')
      .first();
    
    let expectedCount = Number(panelCountRes?.count || 0);
    if (expectedCount === 0) {
      try {
        const ids = JSON.parse(interview.interviewer_ids || '[]');
        expectedCount = Array.isArray(ids) && ids.length > 0 ? ids.length : 1;
      } catch {
        expectedCount = 1;
      }
    }

    const feedbackCountRes = await db('interview_feedback')
      .where({ interview_id: interviewId, organization_id: ctx.organizationId })
      .count('id as count')
      .first();
    const actualFeedbackCount = Number(feedbackCountRes?.count || 1);

    const isFullySubmitted = actualFeedbackCount >= expectedCount;

    if (isFullySubmitted) {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await this.interviewRepo.update(ctx, interviewId, {
        status: 'completed',
        feedback_submitted: true,
        updated_by: ctx.userId,
        updated_at: nowStr,
      } as any);
    }

    return feedback;
  }

  /**
   * Recruiter Decision Endpoint
   * Allows recruiters to advance, reject, or put on hold a candidate once interview feedback is in.
   */
  async recordInterviewDecision(
    ctx: TenantContext,
    interviewId: number,
    input: {
      decision: 'advance' | 'reject' | 'hold';
      notes?: string;
    }
  ): Promise<any> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    // Check if feedback is complete
    const feedbackCountRes = await db('interview_feedback')
      .where({ interview_id: interviewId, organization_id: ctx.organizationId })
      .count('id as count')
      .first();
    const feedbackCount = Number(feedbackCountRes?.count || 0);

    if (feedbackCount === 0 && interview.status !== 'completed') {
      throw new ValidationError('Cannot record decision before interview feedback has been submitted');
    }

    const now = new Date();
    const mysqlNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const { statusSyncService } = await import('./StatusSyncService');

    let syncResult = null;

    if (input.decision === 'advance') {
      // Advance to 'offer' stage
      syncResult = await statusSyncService.syncApplicationStatus(
        ctx,
        interview.application_id,
        'offer',
        {
          triggeredBy: 'interview_advanced',
          notes: input.notes || `Candidate advanced to Offer stage following Round ${interview.interview_round} interview feedback`,
          metadata: {
            interviewId,
            decision: 'advance',
            round: interview.interview_round,
          },
          changedBy: ctx.userId,
        }
      );
    } else if (input.decision === 'reject') {
      // Reject application
      syncResult = await statusSyncService.syncApplicationStatus(
        ctx,
        interview.application_id,
        'rejected',
        {
          triggeredBy: 'interview_rejected',
          rejectionReason: input.notes || `Rejected following Round ${interview.interview_round} interview evaluation`,
          notes: input.notes,
          metadata: {
            interviewId,
            decision: 'reject',
            round: interview.interview_round,
          },
          changedBy: ctx.userId,
        }
      );
    } else if (input.decision === 'hold') {
      // Soft hold - record audit note in application_stage_history without altering application_status
      const hasMetadataCol = await db.schema.hasColumn('application_stage_history', 'metadata').catch(() => false);
      const app = await db('applications').where('id', interview.application_id).first();

      const historyData: any = {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        application_id: interview.application_id,
        from_stage_id: app?.pipeline_stage_id || null,
        to_stage_id: app?.pipeline_stage_id || 0,
        changed_by: ctx.userId,
        notes: `[interview_on_hold] Application put on hold: ${input.notes || 'Awaiting recruiter review'}`,
        changed_at: mysqlNow,
        created_at: mysqlNow,
      };

      if (hasMetadataCol) {
        historyData.metadata = JSON.stringify({
          triggeredBy: 'interview_on_hold',
          interviewId,
          reason: input.notes,
        });
      }

      await db('application_stage_history').insert(historyData);
    }

    // Update interviews record if decision columns exist
    const hasDecisionCol = await db.schema.hasColumn('interviews', 'decision').catch(() => false);
    if (hasDecisionCol) {
      await db('interviews').where('id', interviewId).update({
        decision: input.decision,
        decision_notes: input.notes || null,
        decision_at: mysqlNow,
        updated_by: ctx.userId,
        updated_at: mysqlNow,
      });
    }

    return {
      decision: input.decision,
      interviewId,
      applicationId: interview.application_id,
      syncResult,
    };
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

  async getInterview(ctx: TenantContext, interviewId: number): Promise<any> {
    const interview = await this.interviewRepo.getById(ctx, interviewId);
    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();
    const panel = await db('interview_panel')
      .join('employees', 'interview_panel.employee_id', '=', 'employees.id')
      .where('interview_panel.interview_id', interviewId)
      .select('employees.id', 'employees.first_name', 'employees.last_name', 'employees.email');

    return {
      ...interview,
      panel,
    };
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
