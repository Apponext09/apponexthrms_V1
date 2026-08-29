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
    const hasTemplatesTable = await db.schema.hasTable('notification_templates');
    if (!hasTemplatesTable) {
      await db.schema.createTable('notification_templates', (table) => {
        table.bigIncrements('id').primary();
        table.uuid('uuid').notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('template_code', 100).nullable();
        table.string('template_name', 255).notNullable();
        table.text('template_description').nullable();
        table.string('category', 100).nullable();
        table.json('channels').nullable();
        table.string('subject_line', 500).nullable();
        table.string('subject', 500).nullable();
        table.text('body_text').nullable();
        table.text('body_html').nullable();
        table.text('email_notification').nullable();
        table.string('sms_text', 160).nullable();
        table.string('whatsapp_template_name', 100).nullable();
        table.json('variables').nullable();
        table.integer('version_number').defaultTo(1);
        table.boolean('is_published').defaultTo(true);
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.string('status', 50).defaultTo('published');
        table.bigInteger('company_id').unsigned().nullable();
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
        table.index('organization_id');
      }).catch(() => {});
    } else {
      const templateCols = [
        { name: 'template_code', type: (t: any) => t.string('template_code', 100).nullable() },
        { name: 'template_description', type: (t: any) => t.text('template_description').nullable() },
        { name: 'category', type: (t: any) => t.string('category', 100).nullable() },
        { name: 'channels', type: (t: any) => t.json('channels').nullable() },
        { name: 'subject_line', type: (t: any) => t.string('subject_line', 500).nullable() },
        { name: 'subject', type: (t: any) => t.string('subject', 500).nullable() },
        { name: 'body_text', type: (t: any) => t.text('body_text').nullable() },
        { name: 'body_html', type: (t: any) => t.text('body_html').nullable() },
        { name: 'email_notification', type: (t: any) => t.text('email_notification').nullable() },
        { name: 'sms_text', type: (t: any) => t.string('sms_text', 160).nullable() },
        { name: 'whatsapp_template_name', type: (t: any) => t.string('whatsapp_template_name', 100).nullable() },
        { name: 'variables', type: (t: any) => t.json('variables').nullable() },
        { name: 'version_number', type: (t: any) => t.integer('version_number').defaultTo(1) },
        { name: 'is_published', type: (t: any) => t.boolean('is_published').defaultTo(true) },
        { name: 'is_active', type: (t: any) => t.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes') },
        { name: 'status', type: (t: any) => t.string('status', 50).defaultTo('published') },
        { name: 'company_id', type: (t: any) => t.bigInteger('company_id').unsigned().nullable() },
        { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
        { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        { name: 'deleted_at', type: (t: any) => t.timestamp('deleted_at').nullable() },
      ];
      for (const col of templateCols) {
        if (!(await db.schema.hasColumn('notification_templates', col.name))) {
          await db.schema.table('notification_templates', col.type).catch(() => {});
        }
      }
      if (await db.schema.hasColumn('notification_templates', 'template_code')) {
        try {
          await db.raw('ALTER TABLE notification_templates MODIFY COLUMN template_code VARCHAR(100) NULL');
        } catch (e: any) {}
      }
    }

    const hasEventsTable = await db.schema.hasTable('notification_events');
    if (!hasEventsTable) {
      await db.schema.createTable('notification_events', (table) => {
        table.bigIncrements('id').primary();
        table.uuid('uuid').notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('event_code', 100).notNullable();
        table.string('event_name', 255).notNullable();
        table.text('event_description').nullable();
        table.bigInteger('default_template_id').unsigned().nullable();
        table.boolean('is_enabled').defaultTo(true);
        table.integer('retry_count').defaultTo(3);
        table.integer('retry_interval_minutes').defaultTo(5);
        table.integer('max_queue_delay_hours').defaultTo(1);
        table.bigInteger('company_id').unsigned().nullable();
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
        table.index('organization_id');
      }).catch(() => {});
    } else {
      const eventCols = [
        { name: 'uuid', type: (t: any) => t.uuid('uuid').nullable() },
        { name: 'event_code', type: (t: any) => t.string('event_code', 100).nullable() },
        { name: 'event_name', type: (t: any) => t.string('event_name', 255).nullable() },
        { name: 'event_description', type: (t: any) => t.text('event_description').nullable() },
        { name: 'default_template_id', type: (t: any) => t.bigInteger('default_template_id').unsigned().nullable() },
        { name: 'is_enabled', type: (t: any) => t.boolean('is_enabled').defaultTo(true) },
        { name: 'retry_count', type: (t: any) => t.integer('retry_count').defaultTo(3) },
        { name: 'retry_interval_minutes', type: (t: any) => t.integer('retry_interval_minutes').defaultTo(5) },
        { name: 'max_queue_delay_hours', type: (t: any) => t.integer('max_queue_delay_hours').defaultTo(1) },
        { name: 'company_id', type: (t: any) => t.bigInteger('company_id').unsigned().nullable() },
        { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
        { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        { name: 'deleted_at', type: (t: any) => t.timestamp('deleted_at').nullable() },
      ];
      for (const col of eventCols) {
        if (!(await db.schema.hasColumn('notification_events', col.name))) {
          await db.schema.table('notification_events', col.type).catch(() => {});
        }
      }
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
        // Check if template exists by template_code or template_name
        let template: any = null;
        const hasTmplCode = await db.schema.hasColumn('notification_templates', 'template_code');
        if (hasTmplCode) {
          template = await db('notification_templates')
            .where('organization_id', orgId)
            .where('template_code', event.templateCode)
            .first()
            .catch(() => null);
        }
        if (!template) {
          template = await db('notification_templates')
            .where('organization_id', orgId)
            .where('template_name', event.templateName)
            .first()
            .catch(() => null);
        }

        if (!template) {
          // Prepare payload with column existence checks
          const insertPayload: any = {
            uuid: uuidv4(),
            organization_id: orgId,
            template_name: event.templateName,
            created_by: userId,
            updated_by: userId,
            created_at: new Date(),
            updated_at: new Date(),
          };

          if (hasTmplCode) {
            insertPayload.template_code = event.templateCode;
          }
          if (await db.schema.hasColumn('notification_templates', 'template_description')) {
            insertPayload.template_description = event.eventDescription;
          }
          if (await db.schema.hasColumn('notification_templates', 'category')) {
            insertPayload.category = event.category;
          }
          if (await db.schema.hasColumn('notification_templates', 'channels')) {
            insertPayload.channels = JSON.stringify(['inapp']);
          }
          if (await db.schema.hasColumn('notification_templates', 'version_number')) {
            insertPayload.version_number = 1;
          }
          if (await db.schema.hasColumn('notification_templates', 'is_published')) {
            insertPayload.is_published = true;
          }
          if (await db.schema.hasColumn('notification_templates', 'is_active')) {
            insertPayload.is_active = 'Yes';
          }
          if (await db.schema.hasColumn('notification_templates', 'status')) {
            insertPayload.status = 'published';
          }
          if (await db.schema.hasColumn('notification_templates', 'subject_line')) {
            insertPayload.subject_line = event.subjectLine;
          }
          if (await db.schema.hasColumn('notification_templates', 'subject')) {
            insertPayload.subject = event.subjectLine;
          }
          if (await db.schema.hasColumn('notification_templates', 'body_text')) {
            insertPayload.body_text = event.bodyText;
          }
          if (await db.schema.hasColumn('notification_templates', 'email_notification')) {
            insertPayload.email_notification = event.bodyText;
          }
          if (await db.schema.hasColumn('notification_templates', 'variables')) {
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
          .first()
          .catch(() => null);

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
        const eventPayload: any = {
          uuid: uuidv4(),
          organization_id: orgId,
          event_code: event.eventCode,
          event_name: event.eventName,
          created_by: userId,
          updated_by: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };

        if (await db.schema.hasColumn('notification_events', 'event_description')) {
          eventPayload.event_description = event.eventDescription;
        }
        if (await db.schema.hasColumn('notification_events', 'default_template_id')) {
          eventPayload.default_template_id = template?.id || null;
        }
        if (await db.schema.hasColumn('notification_events', 'is_enabled')) {
          eventPayload.is_enabled = true;
        }
        if (await db.schema.hasColumn('notification_events', 'retry_count')) {
          eventPayload.retry_count = 3;
        }
        if (await db.schema.hasColumn('notification_events', 'retry_interval_minutes')) {
          eventPayload.retry_interval_minutes = 5;
        }
        if (await db.schema.hasColumn('notification_events', 'max_queue_delay_hours')) {
          eventPayload.max_queue_delay_hours = 1;
        }

        await db('notification_events').insert(eventPayload);
      } catch (err: any) {
        // non-fatal seed failure
      }
    }
  }
}

export { seedRecruitmentNotificationEvents };

