import { AuditService } from '../audit/audit.service';
import { OrganizationsRepository } from './organizations.repository';
import type { TenantContext } from '../../db/types';
import type { UpdateOrganizationInput } from './organizations.types';

export class OrganizationsService {
  private orgRepo: OrganizationsRepository;
  private auditService: AuditService;

  constructor() {
    this.orgRepo = new OrganizationsRepository();
    this.auditService = new AuditService();
  }

  /**
   * Get current organization
   */
  async getCurrentOrganization(ctx: TenantContext) {
    return this.orgRepo.getCurrent(ctx);
  }

  /**
   * Update current organization
   */
  async updateOrganization(ctx: TenantContext, input: UpdateOrganizationInput) {
    const current = await this.orgRepo.getCurrent(ctx);

    const updated = await this.orgRepo.updateCore(ctx, input as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ORGANIZATION',
      entityId: ctx.organizationId,
      beforeState: {
        name: current.name,
        domain: current.domain,
        timezone: current.timezone,
        locale: current.locale,
      },
      afterState: input as Record<string, unknown>,
    });

    return updated;
  }
}
