import { v4 as uuidv4 } from 'uuid';
import { OfferRepository, type Offer } from '../repositories/OfferRepository';
import { ApplicationRepository } from '../repositories/ApplicationRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

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

    // In a real implementation, this would integrate with WorkflowService
    // For now, we'll just update the status
    return this.offerRepo.update(ctx, offerId, {
      status: 'sent',
      sent_at: new Date().toISOString(),
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
      sent_at: new Date().toISOString(),
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
        });
      } catch (error) {
        console.error('Failed to send offer notification:', error);
      }
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
    const expiryDate = new Date(offer.offer_expiry_date);
    if (expiryDate < new Date()) {
      throw new ValidationError('Offer has expired');
    }

    const updated = await this.offerRepo.update(ctx, offerId, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_by: ctx.userId,
    } as any);

    // Update application status
    await this.applicationRepo.update(ctx, offer.application_id, {
      application_status: 'hired',
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
      rejected_at: new Date().toISOString(),
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
