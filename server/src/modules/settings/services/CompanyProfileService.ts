import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../audit/audit.service';
import { OrganizationProfileRepository } from '../repositories/OrganizationProfileRepository';
import type { TenantContext } from '../../../db/types';
import { NotFoundError } from '../../../common/errors/index';
import type { OrganizationProfileCreate, OrganizationProfileUpdate } from '@apponexthrms/shared/validation/settings.schemas';

export class CompanyProfileService {
  private profileRepo: OrganizationProfileRepository;
  private auditService: AuditService;

  constructor() {
    this.profileRepo = new OrganizationProfileRepository();
    this.auditService = new AuditService();
  }

  /**
   * Get company profile (1:1 with organization)
   */
  async getProfile(ctx: TenantContext) {
    let profile = await this.profileRepo.getByOrganizationId(ctx);

    if (!profile) {
      // Auto-create basic profile if not exists
      profile = await this.profileRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_name: 'Default Company',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      } as any);
    }

    return profile;
  }

  /**
   * Create or update company profile
   */
  async upsertProfile(ctx: TenantContext, data: OrganizationProfileCreate) {
    const existing = await this.profileRepo.getByOrganizationId(ctx);

    if (existing) {
      return this.updateProfile(ctx, existing.id, data);
    }

    const profile = await this.profileRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      company_name: data.companyName,
      legal_name: data.legalName || null,
      website: data.website || null,
      gst_number: data.gstNumber || null,
      pan_number: data.panNumber || null,
      cin_number: data.cinNumber || null,
      logo_url: data.logoUrl || null,
      logo_dark_url: data.logoDarkUrl || null,
      address_line1: data.addressLine1 || null,
      address_line2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postal_code: data.postalCode || null,
      primary_contact_email: data.primaryContactEmail || null,
      primary_contact_phone: data.primaryContactPhone || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'COMPANY_PROFILE',
      entityId: profile.id,
      afterState: { company_name: profile.company_name },
    });

    return profile;
  }

  /**
   * Update company profile
   */
  async updateProfile(ctx: TenantContext, id: number | string, data: OrganizationProfileUpdate) {
    const existing = await this.profileRepo.getById(ctx, id);
    if (!existing) {
      throw new NotFoundError('Company profile not found');
    }

    const updated = await this.profileRepo.update(ctx, id, {
      company_name: data.companyName || undefined,
      legal_name: data.legalName !== undefined ? data.legalName : undefined,
      website: data.website !== undefined ? data.website : undefined,
      gst_number: data.gstNumber !== undefined ? data.gstNumber : undefined,
      pan_number: data.panNumber !== undefined ? data.panNumber : undefined,
      cin_number: data.cinNumber !== undefined ? data.cinNumber : undefined,
      logo_url: data.logoUrl !== undefined ? data.logoUrl : undefined,
      logo_dark_url: data.logoDarkUrl !== undefined ? data.logoDarkUrl : undefined,
      address_line1: data.addressLine1 !== undefined ? data.addressLine1 : undefined,
      address_line2: data.addressLine2 !== undefined ? data.addressLine2 : undefined,
      city: data.city !== undefined ? data.city : undefined,
      state: data.state !== undefined ? data.state : undefined,
      country: data.country !== undefined ? data.country : undefined,
      postal_code: data.postalCode !== undefined ? data.postalCode : undefined,
      primary_contact_email: data.primaryContactEmail !== undefined ? data.primaryContactEmail : undefined,
      primary_contact_phone: data.primaryContactPhone !== undefined ? data.primaryContactPhone : undefined,
      updated_by: ctx.userId,
    } as any);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'COMPANY_PROFILE',
      entityId: existing.id,
      beforeState: { company_name: existing.company_name },
      afterState: { company_name: updated.company_name },
    });

    return updated;
  }
}
