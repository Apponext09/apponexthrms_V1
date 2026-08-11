import { v4 as uuidv4 } from 'uuid';
import { OfferRepository, type Offer } from '../repositories/OfferRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';
import { sendMail } from '../../../common/lib/mail';
import { getKnex } from '../../../db/knex';

export interface OfferVersion {
  id: number;
  uuid: string;
  organization_id: number;
  offer_id: number;
  version_number: number;
  ctc: number;
  base_salary: number;
  created_by: number;
  created_at: string;
}

export interface OfferApproval {
  id: number;
  uuid: string;
  organization_id: number;
  offer_id: number;
  approver_user_id: number;
  approval_status: 'approved' | 'rejected';
  approval_date: string;
  approval_comments: string | null;
  created_at: string;
}

export class OfferService {
  private offerRepo: OfferRepository;
  private applicationRepo: ApplicationRepository;
  private notificationService: NotificationService;

  constructor() {
    this.offerRepo = new OfferRepository();
    this.applicationRepo = new ApplicationRepository();
    this.notificationService = new NotificationService();
  }

  async generateOffer(
    ctx: TenantContext,
    input: {
      applicationId: number;
      positionTitle: string;
      departmentId?: number;
      designationId?: number;
      costToCompany: number;
      baseSalary: number;
      currency: string;
      offerStartDate: string;
      offerExpiryDate: string;
    }
  ): Promise<Offer> {
    const application = await this.applicationRepo.getById(ctx, input.applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Generate offer code
    const offerCode = `OF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const isUnique = await this.offerRepo.isCodeUnique(ctx, offerCode);
    if (!isUnique) {
      return this.generateOffer(ctx, input); // Retry
    }

    const offer = await this.offerRepo.create(ctx, {
      uuid: uuidv4(),
      application_id: input.applicationId,
      offer_code: offerCode,
      position_title: input.positionTitle,
      department_id: input.departmentId || null,
      designation_id: input.designationId || null,
      cost_to_company: input.costToCompany,
      base_salary: input.baseSalary,
      currency: input.currency,
      offer_start_date: input.offerStartDate,
      offer_expiry_date: input.offerExpiryDate,
      status: 'draft',
      offer_pdf_url: null,
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      workflow_instance_id: null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    return offer;
  }

  async submitOfferForApproval(ctx: TenantContext, offerId: number): Promise<Offer> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'draft') {
      throw new ValidationError('Only draft offers can be submitted for approval');
    }

    return this.offerRepo.update(ctx, offerId, {
      status: 'sent',
      sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);
  }

  async sendOffer(ctx: TenantContext, offerId: number): Promise<Offer> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'draft' && offer.status !== 'sent') {
      throw new ValidationError('Cannot send offers in this status');
    }

    const updated = await this.offerRepo.update(ctx, offerId, {
      status: 'sent',
      sent_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);

    // Get application to find candidate
    const application = await this.applicationRepo.getById(ctx, offer.application_id);
    if (application) {
      try {
        await this.notificationService.sendNotification(ctx, {
          userId: application.candidate_id, // In reality, we'd need to join with candidates table
          type: 'offer_sent',
          title: 'Job Offer Received',
          message: `You have received an offer for ${offer.position_title}. Offer expires on ${offer.offer_expiry_date}`,
          metadata: {
            offerId: offerId,
            applicationId: offer.application_id,
          },
        } as any);
      } catch (error) {
        console.error('Failed to send offer notification:', error);
      }
    }

    // Dynamic notification template check, compilation & SMTP email delivery
    const db = getKnex();
    try {
      let templateRow = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .where('template_name', 'Job Offer Letter')
        .whereNull('deleted_at')
        .first();

      if (!templateRow) {
        const defaultSubject = 'Job Offer: {{positionTitle}} - {{companyName}}';
        const defaultBody = `<p>Dear {{candidateName}},</p>
<p>We are pleased to offer you the position of <strong>{{positionTitle}}</strong> at {{companyName}}.</p>
<p>Here are the key details of your offer:</p>
<ul>
  <li><strong>Department:</strong> {{departmentName}}</li>
  <li><strong>Cost to Company (CTC):</strong> {{costToCompany}} {{currency}}</li>
  <li><strong>Base Salary:</strong> {{baseSalary}} {{currency}}</li>
  <li><strong>Start Date:</strong> {{offerStartDate}}</li>
  <li><strong>Offer Expiry Date:</strong> {{offerExpiryDate}}</li>
</ul>
<p>Please click the link below to accept or reject this offer.</p>
<p><a href="{{offerLink}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Review & Respond to Offer</a></p>
<p>Sincerely,<br/>HR Team<br/>{{companyName}}</p>`;

        const [insertedId] = await db('notification_templates').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          template_name: 'Job Offer Letter',
          subject: defaultSubject,
          email_notification: defaultBody,
          is_active: 'Yes',
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
        templateRow = { id: insertedId, subject: defaultSubject, email_notification: defaultBody };
      }

      const appId = offer.applicationId || (offer as any).application_id;
      const application = await db('applications').where('id', appId).first();
      const candidate = await db('candidates').where('id', application.candidate_id).first();
      const org = await db('organizations').where('id', ctx.organizationId).first();

      let departmentName = 'N/A';
      if (offer.department_id || (offer as any).department_id) {
        const deptId = offer.department_id || (offer as any).department_id;
        const dept = await db('departments').where('id', deptId).first();
        departmentName = dept?.name || 'N/A';
      }

      const variables = {
        candidateName: `${candidate.first_name} ${candidate.last_name || ''}`.trim(),
        positionTitle: offer.positionTitle || (offer as any).position_title || 'Software Engineer',
        companyName: org?.name || 'Apponext Organization',
        departmentName,
        costToCompany: String(offer.costToCompany || (offer as any).cost_to_company || '0'),
        baseSalary: String(offer.baseSalary || (offer as any).base_salary || '0'),
        currency: offer.currency || 'INR',
        offerStartDate: offer.offerStartDate || (offer as any).offer_start_date || '',
        offerExpiryDate: offer.offerExpiryDate || (offer as any).offer_expiry_date || '',
        offerLink: `http://localhost:5173/public/offers/review/${offer.uuid}`
      };

      let subject = templateRow.subject || 'Job Offer';
      let emailBody = templateRow.email_notification || '';

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, value);
        emailBody = emailBody.replace(regex, value);
      }

      await sendMail({
        to: candidate.email,
        subject: subject,
        html: emailBody
      });
    } catch (mailError) {
      console.error('Failed to compile or send offer letter email:', mailError);
    }

    return updated;
  }

  async acceptOffer(ctx: TenantContext, offerId: number): Promise<Offer> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'sent') {
      throw new ValidationError('Can only accept sent offers');
    }

    // Check expiry
    const expiryStr = offer.offerExpiryDate || (offer as any).offer_expiry_date;
    const expiryDate = new Date(expiryStr);
    if (expiryDate < new Date()) {
      throw new ValidationError('Offer has expired');
    }

    const updated = await this.offerRepo.update(ctx, offerId, {
      status: 'accepted',
      accepted_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);

    // Update application status
    const appId = offer.applicationId || (offer as any).application_id;
    await this.applicationRepo.update(ctx, appId, {
      application_status: 'hired',
      updated_by: ctx.userId,
    } as any);

    // Trigger onboarding / employee provisioning
    try {
      const { OnboardingIntegrationService } = await import('./OnboardingIntegrationService');
      const onboardingService = new OnboardingIntegrationService();
      await onboardingService.onCandidateHired(ctx, appId);
    } catch (onboardingError: any) {
      console.error('Failed to auto-provision employee during offer acceptance:', onboardingError);
      throw onboardingError;
    }

    return updated;
  }

  async acceptOfferByUuid(uuid: string, signature: string): Promise<Offer> {
    const db = getKnex();
    const offerRecord = await db('offers').where('uuid', uuid).first();
    if (!offerRecord) {
      throw new NotFoundError('Offer not found');
    }

    const ctx: TenantContext = {
      organizationId: offerRecord.organization_id,
      userId: offerRecord.created_by || 1
    };

    return this.acceptOffer(ctx, offerRecord.id);
  }

  async rejectOfferByUuid(uuid: string, comments: string): Promise<Offer> {
    const db = getKnex();
    const offerRecord = await db('offers').where('uuid', uuid).first();
    if (!offerRecord) {
      throw new NotFoundError('Offer not found');
    }

    const ctx: TenantContext = {
      organizationId: offerRecord.organization_id,
      userId: offerRecord.created_by || 1
    };

    const updated = await this.offerRepo.update(ctx, offerRecord.id, {
      status: 'rejected',
      rejected_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);

    await this.applicationRepo.update(ctx, offerRecord.application_id, {
      application_status: 'rejected',
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async rejectOffer(ctx: TenantContext, offerId: number): Promise<Offer> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'sent') {
      throw new ValidationError('Can only reject sent offers');
    }

    const updated = await this.offerRepo.update(ctx, offerId, {
      status: 'rejected',
      rejected_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_by: ctx.userId,
    } as any);

    // Update application status
    await this.applicationRepo.update(ctx, offer.application_id, {
      application_status: 'rejected',
      updated_by: ctx.userId,
    } as any);

    return updated;
  }

  async getOffer(ctx: TenantContext, offerId: number): Promise<Offer> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }
    return offer;
  }

  async listOffers(ctx: TenantContext, options?: ListQueryOptions) {
    return this.offerRepo.list(ctx, options);
  }

  async getOfferByCode(ctx: TenantContext, code: string): Promise<Offer | null> {
    return this.offerRepo.getByCode(ctx, code);
  }

  async deleteOffer(ctx: TenantContext, offerId: number): Promise<void> {
    const offer = await this.offerRepo.getById(ctx, offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== 'draft') {
      throw new ValidationError('Can only delete draft offers');
    }

    await this.offerRepo.delete(ctx, offerId);
  }
}
