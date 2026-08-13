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

  private async ensureMetaColumn() {
    const db = getKnex();
    try {
      const hasColumn = await db.schema.hasColumn('offers', 'meta');
      if (!hasColumn) {
        await db.schema.table('offers', (table) => {
          table.text('meta', 'longtext').nullable();
        });
      }
    } catch (e) {
      // Ignore column check errors if migration handles it
    }
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
      meta?: any;
    }
  ): Promise<Offer> {
    await this.ensureMetaColumn();

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

    const payload: any = {
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
      meta: input.meta ? (typeof input.meta === 'string' ? input.meta : JSON.stringify(input.meta)) : null,
      status: 'draft',
      offer_pdf_url: null,
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      workflow_instance_id: null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    };

    const offer = await this.offerRepo.create(ctx, payload);
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

  async sendOffer(
    ctx: TenantContext, 
    offerId: number, 
    options?: { customSubject?: string; customBody?: string; sendEmails?: boolean }
  ): Promise<Offer> {
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

    if (options?.sendEmails === false) {
      return updated;
    }

    // Dynamic notification template check, compilation & SMTP email delivery
    const db = getKnex();
    try {
      let templateRow = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .where('template_name', 'Job Offer Letter')
        .whereNull('deleted_at')
        .first();

      const appId = offer.applicationId || (offer as any).application_id;
      const application = appId ? await db('applications').where('id', appId).first() : null;
      const candidate = application?.candidate_id ? await db('candidates').where('id', application.candidate_id).first() : null;
      const org = ctx.organizationId ? await db('organizations').where('id', ctx.organizationId).first() : null;

      let departmentName = 'N/A';
      if (offer.department_id || (offer as any).department_id) {
        const deptId = offer.department_id || (offer as any).department_id;
        const dept = await db('departments').where('id', deptId).first();
        departmentName = dept?.name || 'N/A';
      }

      const candidateName = candidate
        ? ([candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.name || 'Candidate')
        : 'Candidate';

      const variables: Record<string, string> = {
        candidateName,
        candidate_name: candidateName,
        positionTitle: offer.positionTitle || (offer as any).position_title || 'Software Engineer',
        position_title: offer.positionTitle || (offer as any).position_title || 'Software Engineer',
        companyName: org?.name || 'Apponext HRMS',
        company_name: org?.name || 'Apponext HRMS',
        departmentName,
        costToCompany: String(offer.costToCompany || (offer as any).cost_to_company || '0'),
        ctc: String(offer.costToCompany || (offer as any).cost_to_company || '0'),
        baseSalary: String(offer.baseSalary || (offer as any).base_salary || '0'),
        currency: offer.currency || 'INR',
        offerStartDate: offer.offerStartDate || (offer as any).offer_start_date || '',
        offerExpiryDate: offer.offerExpiryDate || (offer as any).offer_expiry_date || '',
        offerLink: `http://localhost:5173/public/offers/review/${offer.uuid}`
      };

      const defaultSubject = 'Job Offer: {{positionTitle}} - {{companyName}}';
      const defaultBody = `Dear {{candidateName}},

We are pleased to offer you the position of {{positionTitle}} at {{companyName}}.

Offer Highlights:
- Department: {{departmentName}}
- Cost to Company (CTC): {{costToCompany}} {{currency}}
- Base Salary: {{baseSalary}} {{currency}}
- Start Date: {{offerStartDate}}
- Offer Expiry Date: {{offerExpiryDate}}

Please click the link below to review and respond to this offer:
{{offerLink}}

Sincerely,
HR Recruiting Team
{{companyName}}`;

      let rawSubject = options?.customSubject || templateRow?.subject || defaultSubject;
      let rawBody = options?.customBody || templateRow?.email_notification || defaultBody;

      const stripHtml = (htmlStr: string) => {
        if (!htmlStr) return '';
        return htmlStr
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/gi, ' ')
          .trim();
      };

      rawBody = options?.customBody ? stripHtml(options.customBody) : rawBody;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        rawSubject = rawSubject.replace(regex, value);
        rawBody = rawBody.replace(regex, value);
      }

      const wrapInExecutiveHtml = (subj: string, bodyText: string, company: string) => {
        if (bodyText.includes('<div style="background-color:') || bodyText.includes('<table')) {
          return bodyText;
        }
        const lines = bodyText.split('\n');
        let innerHtml = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            innerHtml += '<div style="height: 10px;"></div>';
          } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            innerHtml += `<div style="margin: 4px 0 4px 12px; font-size: 14px; color: #334155; font-family: sans-serif;">• ${trimmed.substring(1).trim()}</div>`;
          } else {
            innerHtml += `<p style="margin: 4px 0; font-size: 14px; color: #334155; line-height: 1.6; font-family: sans-serif;">${trimmed}</p>`;
          }
        }
        innerHtml = innerHtml.replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">$1</a>'
        );
        return `<!DOCTYPE html><html><body style="background:#f1f5f9;font-family:sans-serif;padding:30px 10px;"><table width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px;color:#fff;"><h2 style="margin:0;font-size:18px;">${company}</h2><p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;">Employment Offer Letter</p></td></tr><tr><td style="padding:28px;">${innerHtml}</td></tr><tr><td style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">Official offer communication from <strong>${company}</strong>.</td></tr></table></body></html>`;
      };

      if (candidate?.email) {
        await sendMail({
          to: candidate.email,
          subject: rawSubject,
          html: wrapInExecutiveHtml(rawSubject, rawBody, org?.name || 'Apponext HRMS'),
          organizationId: ctx.organizationId,
        });
      }
    } catch (mailError) {
      console.error('Failed to compile or send offer letter email:', mailError);
    }

    return updated;
  }

  async getOfferTemplates(ctx: TenantContext) {
    const db = getKnex();
    let templates: any[] = [];
    if (await db.schema.hasTable('notification_templates')) {
      templates = await db('notification_templates')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .where(function() {
          this.where('template_name', 'like', '%Offer%');
        });
    }

    const defaultTemplates = [
      {
        id: 'default_offer_standard',
        template_name: 'Standard Job Offer Letter',
        subject: 'Job Offer: {{positionTitle}} - {{companyName}}',
        email_notification: `Dear {{candidateName}},

We are pleased to offer you the position of {{positionTitle}} at {{companyName}}.

Offer Details:
- Position: {{positionTitle}}
- Department: {{departmentName}}
- Cost to Company (CTC): {{costToCompany}} {{currency}}
- Base Salary: {{baseSalary}} {{currency}}
- Expected Start Date: {{offerStartDate}}
- Offer Valid Until: {{offerExpiryDate}}

Please click the link below to review full offer document and submit your response:
{{offerLink}}

Best regards,
Talent Acquisition Team
{{companyName}}`,
      },
      {
        id: 'default_offer_executive',
        template_name: 'Executive Leadership Offer Letter',
        subject: 'Executive Employment Offer: {{positionTitle}} at {{companyName}}',
        email_notification: `Dear {{candidateName}},

On behalf of {{companyName}}, we are thrilled to extend an offer for the position of {{positionTitle}}.

Key Terms:
- Position: {{positionTitle}}
- Total CTC: {{costToCompany}} {{currency}}
- Start Date: {{offerStartDate}}
- Review Link: {{offerLink}}

We look forward to welcoming you to our leadership team.

Warm regards,
Executive HR
{{companyName}}`,
      }
    ];

    return {
      customTemplates: templates,
      defaultTemplates,
    };
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
      userId: offerRecord.created_by || 1,
      sessionUuid: uuidv4()
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
      userId: offerRecord.created_by || 1,
      sessionUuid: uuidv4()
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

  async getOffer(ctx: TenantContext, offerId: number): Promise<any> {
    await this.ensureMetaColumn();
    const db = getKnex();
    const offer = await db('offers as o')
      .leftJoin('applications as a', 'o.application_id', 'a.id')
      .leftJoin('candidates as c', 'a.candidate_id', 'c.id')
      .leftJoin('departments as d', 'o.department_id', 'd.id')
      .leftJoin('designations as des', 'o.designation_id', 'des.id')
      .where('o.id', offerId)
      .where('o.organization_id', ctx.organizationId)
      .whereNull('o.deleted_at')
      .select(
        'o.*',
        db.raw("TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as candidate_name"),
        'c.email as candidate_email',
        'c.phone as candidate_phone',
        'd.name as department_name',
        'des.name as designation_name'
      )
      .first();

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    let parsedMeta: any = {};
    if (offer.meta) {
      try {
        parsedMeta = typeof offer.meta === 'string' ? JSON.parse(offer.meta) : offer.meta;
      } catch (e) {
        parsedMeta = {};
      }
    }

    return {
      ...offer,
      meta: parsedMeta,
      candidateName: offer.candidate_name || 'Candidate',
      candidateEmail: offer.candidate_email || 'No Email',
      candidatePhone: offer.candidate_phone || 'N/A',
      positionTitle: offer.position_title,
      costToCompany: offer.cost_to_company,
      baseSalary: offer.base_salary,
      offerStartDate: offer.offer_start_date,
      offerExpiryDate: offer.offer_expiry_date,
      offerCode: offer.offer_code,
      departmentName: offer.department_name,
      designationName: offer.designation_name,
    };
  }

  async listOffers(ctx: TenantContext, options?: ListQueryOptions) {
    await this.ensureMetaColumn();
    const db = getKnex();
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 100;
    const offset = (page - 1) * pageSize;

    let query = db('offers as o')
      .leftJoin('applications as a', 'o.application_id', 'a.id')
      .leftJoin('candidates as c', 'a.candidate_id', 'c.id')
      .leftJoin('departments as d', 'o.department_id', 'd.id')
      .leftJoin('designations as des', 'o.designation_id', 'des.id')
      .where('o.organization_id', ctx.organizationId)
      .whereNull('o.deleted_at');

    if (options?.filters?.status) {
      query = query.where('o.status', options.filters.status);
    }

    const countResult = await query.clone().clearSelect().count<{ count: string | number }>('o.id as count').first();
    const totalItems = parseInt(String(countResult?.count || 0), 10);

    const rows = await query
      .select(
        'o.*',
        db.raw("TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as candidate_name"),
        'c.email as candidate_email',
        'c.phone as candidate_phone',
        'd.name as department_name',
        'des.name as designation_name'
      )
      .orderBy('o.created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((r: any) => {
      let parsedMeta: any = {};
      if (r.meta) {
        try {
          parsedMeta = typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta;
        } catch (e) {
          parsedMeta = {};
        }
      }
      return {
        ...r,
        meta: parsedMeta,
        candidateName: r.candidate_name || 'Candidate',
        candidateEmail: r.candidate_email || 'No Email',
        candidatePhone: r.candidate_phone || 'N/A',
        positionTitle: r.position_title,
        costToCompany: r.cost_to_company,
        baseSalary: r.base_salary,
        offerStartDate: r.offer_start_date,
        offerExpiryDate: r.offer_expiry_date,
        offerCode: r.offer_code,
        departmentName: r.department_name,
        designationName: r.designation_name,
      };
    });

    return {
      items,
      meta: {
        itemCount: items.length,
        totalItems,
        itemsPerPage: pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
      },
    };
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
