/**
 * Seed script: Create recruitment notification events + templates
 * 
 * This script is idempotent — it skips events that already exist for the org.
 * 
 * Usage:
 *   npx ts-node server/src/scripts/seed_recruitment_notification_events.ts
 */
import { getKnex } from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

interface EventSeed {
  eventCode: string;
  eventName: string;
  eventDescription: string;
  templateCode: string;
  templateName: string;
  category: string;
  subjectLine: string;
  bodyText: string;
}

const RECRUITMENT_EVENTS: EventSeed[] = [
  {
    eventCode: 'INTERVIEW_SCHEDULED',
    eventName: 'Interview Scheduled',
    eventDescription: 'Triggered when an interview is scheduled for a candidate',
    templateCode: 'TMPL_INTERVIEW_SCHEDULED',
    templateName: 'Interview Scheduled',
    category: 'recruitment',
    subjectLine: 'Interview Scheduled: {{candidateName}} — {{scheduledDate}}',
    bodyText: 'You have been assigned to conduct an interview with candidate "{{candidateName}}".\n\nDate & Time: {{scheduledDate}}\nRound: {{round}}\nType: {{interviewType}}',
  },
  {
    eventCode: 'NEW_APPLICATION_RECEIVED',
    eventName: 'New Application Received',
    eventDescription: 'Triggered when a candidate applies for a job posting',
    templateCode: 'TMPL_NEW_APPLICATION_RECEIVED',
    templateName: 'New Application Received',
    category: 'recruitment',
    subjectLine: 'New Application: {{candidateName}} for {{jobTitle}}',
    bodyText: 'A new application has been received from {{candidateName}} for the position "{{jobTitle}}".\n\nSource: {{source}}\nApplied At: {{appliedAt}}',
  },
  {
    eventCode: 'CANDIDATE_REFERRED',
    eventName: 'Candidate Referred by Employee',
    eventDescription: 'Triggered when an employee refers a candidate',
    templateCode: 'TMPL_CANDIDATE_REFERRED',
    templateName: 'Employee Referral Received',
    category: 'recruitment',
    subjectLine: 'New Referral: {{candidateName}} referred by {{referrerName}}',
    bodyText: '{{referrerName}} has referred a candidate "{{candidateName}}" for recruitment.\n\nReferred On: {{referralDate}}',
  },
  {
    eventCode: 'INTERVIEW_RESCHEDULED',
    eventName: 'Interview Rescheduled',
    eventDescription: 'Triggered when an interview is rescheduled to a new date/time',
    templateCode: 'TMPL_INTERVIEW_RESCHEDULED',
    templateName: 'Interview Rescheduled',
    category: 'recruitment',
    subjectLine: 'Interview Rescheduled: {{candidateName}} — {{newDate}}',
    bodyText: 'An interview for candidate "{{candidateName}}" has been rescheduled.\n\nNew Date & Time: {{newDate}}\nRound: {{round}}\nType: {{interviewType}}',
  },
  {
    eventCode: 'INTERVIEW_CANCELLED',
    eventName: 'Interview Cancelled',
    eventDescription: 'Triggered when a scheduled interview is cancelled',
    templateCode: 'TMPL_INTERVIEW_CANCELLED',
    templateName: 'Interview Cancelled',
    category: 'recruitment',
    subjectLine: 'Interview Cancelled: {{candidateName}}',
    bodyText: 'The interview for candidate "{{candidateName}}" has been cancelled.\n\nOriginal Date: {{scheduledDate}}\nRound: {{round}}\nType: {{interviewType}}',
  },
  {
    eventCode: 'INTERVIEW_COMPLETED',
    eventName: 'Interview Completed',
    eventDescription: 'Triggered when an interviewer marks an interview as completed',
    templateCode: 'TMPL_INTERVIEW_COMPLETED',
    templateName: 'Interview Completed',
    category: 'recruitment',
    subjectLine: 'Interview Completed: {{candidateName}} — Round {{round}}',
    bodyText: 'The interview for candidate "{{candidateName}}" (Round {{round}}) has been marked as completed.\n\nDate: {{scheduledDate}}\nType: {{interviewType}}\nCompleted By: {{completedBy}}',
  },
  {
    eventCode: 'INTERVIEW_FEEDBACK_SUBMITTED',
    eventName: 'Interview Feedback Submitted',
    eventDescription: 'Triggered when an interviewer submits feedback for an interview',
    templateCode: 'TMPL_INTERVIEW_FEEDBACK_SUBMITTED',
    templateName: 'Interview Feedback Submitted',
    category: 'recruitment',
    subjectLine: 'Feedback Received: {{candidateName}} — Round {{round}}',
    bodyText: 'Interview feedback has been submitted for candidate "{{candidateName}}" (Round {{round}}).\n\nRating: {{rating}}/5\nRecommendation: {{recommendation}}\nSubmitted By: {{submittedBy}}',
  },
  {
    eventCode: 'INTERVIEW_DECISION_MADE',
    eventName: 'Interview Decision Made',
    eventDescription: 'Triggered when a hire/reject decision is recorded for a candidate',
    templateCode: 'TMPL_INTERVIEW_DECISION_MADE',
    templateName: 'Interview Decision Made',
    category: 'recruitment',
    subjectLine: 'Interview Decision: {{candidateName}} — {{decision}}',
    bodyText: 'A decision has been made for candidate "{{candidateName}}".\n\nDecision: {{decision}}\nRound: {{round}}\nDecision By: {{decisionBy}}\nNotes: {{notes}}',
  },
  {
    eventCode: 'OFFER_GENERATED',
    eventName: 'Offer Letter Generated',
    eventDescription: 'Triggered when a new offer letter is created for a candidate',
    templateCode: 'TMPL_OFFER_GENERATED',
    templateName: 'Offer Letter Generated',
    category: 'recruitment',
    subjectLine: 'Offer Generated: {{candidateName}} — {{positionTitle}}',
    bodyText: 'An offer letter has been generated for candidate "{{candidateName}}" for the position "{{positionTitle}}".\n\nSalary: {{salary}}\nJoining Date: {{joiningDate}}',
  },
  {
    eventCode: 'OFFER_ACCEPTED',
    eventName: 'Offer Accepted',
    eventDescription: 'Triggered when a candidate accepts an offer letter',
    templateCode: 'TMPL_OFFER_ACCEPTED',
    templateName: 'Offer Accepted',
    category: 'recruitment',
    subjectLine: 'Offer Accepted: {{candidateName}} — {{positionTitle}}',
    bodyText: 'Great news! Candidate "{{candidateName}}" has accepted the offer for "{{positionTitle}}".\n\nExpected Joining Date: {{joiningDate}}',
  },
  {
    eventCode: 'APPLICATION_STAGE_CHANGED',
    eventName: 'Application Stage Changed',
    eventDescription: 'Triggered when an application moves to a different pipeline stage',
    templateCode: 'TMPL_APPLICATION_STAGE_CHANGED',
    templateName: 'Application Stage Changed',
    category: 'recruitment',
    subjectLine: 'Stage Update: {{candidateName}} moved to {{newStage}}',
    bodyText: 'The application for "{{candidateName}}" has been moved to a new stage.\n\nPrevious Stage: {{previousStage}}\nNew Stage: {{newStage}}\nJob: {{jobTitle}}\nMoved By: {{movedBy}}',
  },
  {
    eventCode: 'MRF_INTERVIEWER_ASSIGNED',
    eventName: 'MRF Interviewer Assigned',
    eventDescription: 'Triggered when an interviewer is assigned on a Manpower Requisition Form',
    templateCode: 'TMPL_MRF_INTERVIEWER_ASSIGNED',
    templateName: 'MRF Interviewer Assignment',
    category: 'recruitment',
    subjectLine: 'New Interviewer Assignment for MRF {{mrNumber}} - {{positionTitle}}',
    bodyText: 'Hello {{employeeName}},\n\nYou have been assigned as the designated Interviewer for Manpower Requisition Form (MRF) {{mrNumber}}.\n\nPosition Details:\n- Title: {{positionTitle}}\n- Open Positions: {{numberOfPositions}}\n- Department: {{department}}\n- Note/Comment: {{comment}}\n\nPlease visit the Recruitment Module to view requisition specifics and interview schedules.',
  }
];

async function seedRecruitmentNotificationEvents() {
  const db = getKnex();

  try {
    const hasSubjectLine = await db.schema.hasColumn('notification_templates', 'subject_line');
    if (!hasSubjectLine) {
      await db.schema.alterTable('notification_templates', (table) => {
        table.string('subject_line', 500).nullable();
      });
    }
    const hasBodyText = await db.schema.hasColumn('notification_templates', 'body_text');
    if (!hasBodyText) {
      await db.schema.alterTable('notification_templates', (table) => {
        table.text('body_text').nullable();
      });
    }
  } catch {
    // schema check non-fatal
  }

  // Get all organizations
  const orgs = await db('organizations').select('id').catch(() => []);
  if (orgs.length === 0) return;

  for (const org of orgs) {
    const orgId = org.id;

    // Get a system user for created_by / updated_by
    const systemUser = await db('users')
      .where('organization_id', orgId)
      .where('status', 'active')
      .first()
      .catch(() => null);

    if (!systemUser) continue;
    const userId = systemUser.id;

    for (const event of RECRUITMENT_EVENTS) {
      try {
        // Check if template exists
        let template = await db('notification_templates')
          .where('organization_id', orgId)
          .where('template_code', event.templateCode)
          .first();

        if (!template) {
          // Prepare payload with fallbacks for both old and new schema columns
          const insertPayload: any = {
            uuid: uuidv4(),
            organization_id: orgId,
            template_code: event.templateCode,
            template_name: event.templateName,
            template_description: event.eventDescription,
            category: event.category,
            channels: JSON.stringify(['inapp']),
            version_number: 1,
            is_published: true,
            is_active: 'Yes',
            status: 'published',
            created_by: userId,
            updated_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
          };

          const hasSubjLine = await db.schema.hasColumn('notification_templates', 'subject_line');
          if (hasSubjLine) {
            insertPayload.subject_line = event.subjectLine;
          }
          const hasSubject = await db.schema.hasColumn('notification_templates', 'subject');
          if (hasSubject) {
            insertPayload.subject = event.subjectLine;
          }

          const hasBodyTxt = await db.schema.hasColumn('notification_templates', 'body_text');
          if (hasBodyTxt) {
            insertPayload.body_text = event.bodyText;
          }
          const hasEmailNotif = await db.schema.hasColumn('notification_templates', 'email_notification');
          if (hasEmailNotif) {
            insertPayload.email_notification = event.bodyText;
          }

          const hasVars = await db.schema.hasColumn('notification_templates', 'variables');
          if (hasVars) {
            insertPayload.variables = JSON.stringify(
              (event.bodyText.match(/\{\{(\w+)\}\}/g) || []).map((v: string) => v.replace(/[{}]/g, ''))
            );
          }

          const [templateId] = await db('notification_templates').insert(insertPayload);
          template = await db('notification_templates').where('id', templateId).first();
        }

        // Check if event already exists
        const existingEvent = await db('notification_events')
          .where('organization_id', orgId)
          .where('event_code', event.eventCode)
          .first();

        if (existingEvent) {
          // If event exists but missing default_template_id, update it
          if (!existingEvent.default_template_id && template?.id) {
            await db('notification_events')
              .where('id', existingEvent.id)
              .update({
                default_template_id: template.id,
                is_enabled: true,
                updated_at: new Date(),
              });
          }
          continue;
        }

        // Create event linked to template
        await db('notification_events').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: event.eventCode,
          event_name: event.eventName,
          event_description: event.eventDescription,
          default_template_id: template?.id || 1,
          is_enabled: true,
          retry_count: 3,
          retry_interval_minutes: 5,
          max_queue_delay_hours: 1,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } catch (err: any) {
        // non-fatal seed failure
      }
    }
  }
}

export { seedRecruitmentNotificationEvents };

