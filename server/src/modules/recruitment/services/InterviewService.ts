import { v4 as uuidv4 } from 'uuid';
import { InterviewRepository, type Interview } from '../repositories/InterviewRepository';
import { InterviewFeedbackRepository, type InterviewFeedback } from '../repositories/SupportingRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { sendMail } from '../../../common/lib/mail';

function fillTemplatePlaceholders(templateStr: string, variables: Record<string, string>): string {
  if (!templateStr) return '';
  let result = templateStr;
  for (const [key, val] of Object.entries(variables)) {
    const reg = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(reg, val !== undefined && val !== null ? String(val) : '');
  }
  return result;
}

function wrapInExecutiveHtmlTemplate(subject: string, bodyContent: string, companyName: string): string {
  if (bodyContent.includes('<div style="background-color:') || bodyContent.includes('<table')) {
    return bodyContent;
  }

  const lines = bodyContent.split('\n');
  let formattedInnerHtml = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      formattedInnerHtml += '<div style="height: 10px;"></div>';
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const itemContent = trimmed.substring(1).trim();
      formattedInnerHtml += `<div style="margin: 4px 0 4px 12px; font-size: 14px; color: #334155; font-family: sans-serif;">• ${itemContent}</div>`;
    } else {
      formattedInnerHtml += `<p style="margin: 4px 0; font-size: 14px; color: #334155; line-height: 1.6; font-family: sans-serif;">${trimmed}</p>`;
    }
  }

  formattedInnerHtml = formattedInnerHtml.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">$1</a>'
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px 28px; text-align: left;">
              <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 700;">${companyName}</h2>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Talent Acquisition & HR Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              ${formattedInnerHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Automated HR invitation from <strong>${companyName}</strong>. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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
      templateId?: number;
      customSubject?: string;
      customCandidateBody?: string;
      customInterviewerBody?: string;
      sendEmails?: boolean;
    }
  ): Promise<Interview> {
    const application = await this.applicationRepo.getById(ctx, input.applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const scheduledDateObj = new Date(input.scheduledDate);
    const dbFormattedScheduledDate = !isNaN(scheduledDateObj.getTime())
      ? scheduledDateObj.toISOString().replace('T', ' ').substring(0, 19)
      : input.scheduledDate;

    const interview = await this.interviewRepo.create(ctx, {
      uuid: uuidv4(),
      application_id: input.applicationId,
      interview_type: input.interviewType,
      interview_round: input.interviewRound,
      scheduled_date: dbFormattedScheduledDate,
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

    // Send in-app notification to interviewers
    for (const interviewerId of input.interviewerIds) {
      try {
        await this.notificationService.sendNotification(ctx, {
          eventCode: 'INTERVIEW_SCHEDULED',
          recipientId: interviewerId,
          variables: {
            interviewId: interview.id,
            applicationId: input.applicationId,
            scheduledDate: input.scheduledDate,
          },
        } as any);
      } catch (error) {
        // Silently skip if eventCode template is not seeded in notification_events table
      }
    }

    // =========================================================================
    // Send Email Notifications to Candidate & Assigned Interviewers
    // =========================================================================
    if (input.sendEmails !== false) {
      try {
        // Fetch candidate details
        let candidate: any = null;
        if (application.candidate_id) {
          candidate = await db('candidates').where('id', application.candidate_id).first();
        }

        // Fetch position / job title
        let positionTitle = 'Position';
        if (application.job_posting_id) {
          const job = await db('job_postings').where('id', application.job_posting_id).first();
          if (job) {
            positionTitle = job.title || job.position_title || job.job_title || positionTitle;
          }
        }

        // Fetch Organization name
        let companyName = 'Apponext HRMS';
        if (ctx.organizationId) {
          const org = await db('organizations').where('id', ctx.organizationId).first();
          if (org) {
            companyName = org.name || companyName;
          }
        }

        // Fetch Interviewer details
        let interviewers: Array<{ id: number; name: string; email: string }> = [];
        if (input.interviewerIds && input.interviewerIds.length > 0) {
          const empList = await db('employees').whereIn('id', input.interviewerIds);
          interviewers = empList.map(e => ({
            id: e.id,
            name: [e.first_name, e.last_name].filter(Boolean).join(' ') || `Interviewer #${e.id}`,
            email: e.email || e.work_email || '',
          }));
        }

        const candidateName = candidate
          ? ([candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.name || 'Candidate')
          : 'Candidate';
        const candidateEmail = candidate ? (candidate.email || candidate.email_address || '') : '';

        const dateObj = new Date(input.scheduledDate);
        const dateFormatted = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : input.scheduledDate;

        const timeFormatted = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '';

        const fullDateTimeFormatted = !isNaN(dateObj.getTime())
          ? `${dateFormatted} at ${timeFormatted}`
          : input.scheduledDate;

        const modeText = input.interviewType === 'video' 
          ? 'Online Video Call' 
          : input.interviewType === 'phone' 
            ? 'Phone Screening' 
            : 'In-Person (Office)';

        const commonVars: Record<string, string> = {
          candidateName,
          candidate_name: candidateName,
          positionTitle,
          position_title: positionTitle,
          companyName,
          company_name: companyName,
          scheduledDate: fullDateTimeFormatted,
          scheduled_date: fullDateTimeFormatted,
          scheduledTime: timeFormatted || fullDateTimeFormatted,
          scheduled_time: timeFormatted || fullDateTimeFormatted,
          interviewDate: dateFormatted,
          interview_date: dateFormatted,
          durationMinutes: String(input.durationMinutes || 30),
          duration_minutes: String(input.durationMinutes || 30),
          interviewType: String(input.interviewType || 'Interview').toUpperCase(),
          interview_type: String(input.interviewType || 'Interview').toUpperCase(),
          interviewMode: modeText,
          interview_mode: modeText,
          interviewRound: String(input.interviewRound || 1),
          interview_round: String(input.interviewRound || 1),
          meetingUrl: input.meetingUrl || 'N/A',
          meeting_url: input.meetingUrl || 'N/A',
          interviewerName: '',
          interviewer_name: '',
        };

        const stripHtml = (htmlStr: string) => {
          if (!htmlStr) return '';
          return htmlStr
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
        };

        // 1. Candidate Email
        if (candidateEmail) {
          const defaultCandSubject = `Interview Invitation: {{positionTitle}} - {{companyName}}`;
          const defaultCandBody = `Dear {{candidateName}},

We are pleased to invite you for an interview for the {{positionTitle}} position at {{companyName}}.

Interview Details:
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Interview Round: Round {{interviewRound}} ({{interviewType}})
- Meeting Link: {{meetingUrl}}

Please confirm your availability by replying to this email. Best of luck!

Best regards,
HR Recruiting Team
{{companyName}}`;

          const rawSubject = input.customSubject || defaultCandSubject;
          const rawBody = input.customCandidateBody ? stripHtml(input.customCandidateBody) : defaultCandBody;

          const subjectToUse = fillTemplatePlaceholders(rawSubject, commonVars);
          const bodyFilled = fillTemplatePlaceholders(rawBody, commonVars);
          const finalHtml = wrapInExecutiveHtmlTemplate(subjectToUse, bodyFilled, companyName);

          await sendMail({
            to: candidateEmail,
            subject: subjectToUse,
            html: finalHtml,
            organizationId: ctx.organizationId,
          });
        }

        // 2. Interviewers Email
        for (const interviewer of interviewers) {
          if (interviewer.email) {
            const intVars = { ...commonVars, interviewerName: interviewer.name, interviewer_name: interviewer.name };
            const defaultIntSubject = `Interview Assignment: {{candidateName}} - {{positionTitle}}`;
            const defaultIntBody = `Dear {{interviewerName}},

You have been assigned as an interviewer for candidate {{candidateName}} applying for the {{positionTitle}} position at {{companyName}}.

Interview Details:
- Candidate Name: {{candidateName}}
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Round & Type: Round {{interviewRound}} ({{interviewType}})
- Meeting Link: {{meetingUrl}}

Please review the candidate profile and log your evaluation feedback after the session.

Best regards,
HR Management System
{{companyName}}`;

            const rawIntSubject = input.customSubject || defaultIntSubject;
            const rawIntBody = input.customInterviewerBody ? stripHtml(input.customInterviewerBody) : defaultIntBody;

            const intSubjectToUse = fillTemplatePlaceholders(rawIntSubject, intVars);
            const intBodyFilled = fillTemplatePlaceholders(rawIntBody, intVars);
            const finalIntHtml = wrapInExecutiveHtmlTemplate(intSubjectToUse, intBodyFilled, companyName);

            await sendMail({
              to: interviewer.email,
              subject: intSubjectToUse,
              html: finalIntHtml,
              organizationId: ctx.organizationId,
            });
          }
        }
      } catch (mailError) {
        console.error('Failed to send interview email notifications:', mailError);
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

    const dateObj = new Date(newScheduledDate);
    const dbFormattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().replace('T', ' ').substring(0, 19)
      : newScheduledDate;

    return this.interviewRepo.update(ctx, interviewId, {
      scheduled_date: dbFormattedDate,
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

  async getInterviewTemplates(ctx: TenantContext) {
    const { getKnex } = await import('../../../db/knex');
    const db = getKnex();

    let templates: any[] = [];
    if (await db.schema.hasTable('notification_templates')) {
      templates = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where(function() {
          this.where('template_name', 'like', '%Interview%')
            .orWhere('template_name', 'like', '%Recruitment%');
        });
    }

    // Default presets if no custom templates exist in db
    const defaultTemplates = [
      {
        id: 'default_standard',
        template_name: 'Standard Interview Invitation (Default)',
        subject: 'Interview Invitation: {{positionTitle}} - {{companyName}}',
        candidate_body: `Dear {{candidateName}},

We are pleased to invite you for an interview for the {{positionTitle}} position at {{companyName}}.

Interview Details:
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Interview Round: Round {{interviewRound}} ({{interviewType}})
- Meeting Link: {{meetingUrl}}

Please confirm your availability by replying to this email. Best of luck!

Best regards,
HR Recruiting Team
{{companyName}}`,
        interviewer_body: `Dear {{interviewerName}},

You have been assigned as an interviewer for candidate {{candidateName}} applying for the {{positionTitle}} position at {{companyName}}.

Interview Details:
- Candidate Name: {{candidateName}}
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Round & Type: Round {{interviewRound}} ({{interviewType}})
- Meeting Link: {{meetingUrl}}

Please review the candidate profile and log your evaluation feedback after the session.

Best regards,
HR Management System
{{companyName}}`,
      },
      {
        id: 'default_technical',
        template_name: 'Technical Round Invitation',
        subject: 'Technical Coding Interview: {{positionTitle}} - {{companyName}}',
        candidate_body: `Dear {{candidateName}},

You are scheduled for the Technical Assessment Round for {{positionTitle}} at {{companyName}}.

Interview Details:
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Round: Technical Round {{interviewRound}}
- Meeting Link: {{meetingUrl}}

Please ensure a quiet environment with a stable internet connection.

Best regards,
Technical Hiring Team
{{companyName}}`,
        interviewer_body: `Dear {{interviewerName}},

Technical interview round assigned for {{candidateName}} applying for {{positionTitle}}.

Details:
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Meeting Link: {{meetingUrl}}

Please prepare your technical evaluation criteria and submit ratings post interview.

Best regards,
Engineering HR
{{companyName}}`,
      },
      {
        id: 'default_executive',
        template_name: 'Executive / HR Discussion Round',
        subject: 'Final HR Discussion: {{positionTitle}} at {{companyName}}',
        candidate_body: `Dear {{candidateName}},

Congratulations on progressing to the final stage! We would like to invite you for the Executive HR Discussion for {{positionTitle}} at {{companyName}}.

Interview Details:
- Date & Time: {{scheduledDate}}
- Duration: {{durationMinutes}} Minutes
- Meeting Link: {{meetingUrl}}

We look forward to speaking with you.

Best regards,
Executive HR Team
{{companyName}}`,
        interviewer_body: `Dear {{interviewerName}},

Final executive discussion assigned for candidate {{candidateName}} ({{positionTitle}}).

Details:
- Date & Time: {{scheduledDate}}
- Meeting Link: {{meetingUrl}}

Best regards,
HR Operations
{{companyName}}`,
      }
    ];

    return {
      customTemplates: templates,
      defaultTemplates,
    };
  }
}
