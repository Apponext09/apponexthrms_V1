import { SoftwareLicenseRepository } from '../repositories/SoftwareLicenseRepository';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class SoftwareLicenseService {
  private licenseRepo: SoftwareLicenseRepository;
  private auditService: AuditService;

  constructor() {
    this.licenseRepo = new SoftwareLicenseRepository();
    this.auditService = new AuditService();
  }

  async list(ctx: TenantContext, options = {}) {
    return this.licenseRepo.list(ctx, options);
  }

  async getById(ctx: TenantContext, id: number) {
    const license = await this.licenseRepo.getById(ctx, id);
    if (!license) {
      throw new NotFoundError('License not found');
    }
    return license;
  }

  async create(ctx: TenantContext, data: any) {
    const license = await this.licenseRepo.create(ctx, {
      ...data,
      usedLicenses: 0,
      status: 'active',
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'SOFTWARE_LICENSE',
      entityId: license.id,
      afterState: license,
    });

    return license;
  }

  async update(ctx: TenantContext, id: number, data: any) {
    const license = await this.getById(ctx, id);
    const updated = await this.licenseRepo.update(ctx, id, data);

    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'SOFTWARE_LICENSE',
      entityId: id,
      beforeState: license,
      afterState: updated,
    });

    return updated;
  }

  async getExpiring(ctx: TenantContext) {
    return this.licenseRepo.getExpiring(ctx);
  }

  async allocateLicense(ctx: TenantContext, licenseId: number) {
    const license = await this.getById(ctx, licenseId);

    if (license.usedLicenses >= license.totalLicenses) {
      throw new ValidationError('No available licenses');
    }

    return this.update(ctx, licenseId, {
      usedLicenses: license.usedLicenses + 1,
    });
  }

  async releaseLicense(ctx: TenantContext, licenseId: number) {
    const license = await this.getById(ctx, licenseId);

    if (license.usedLicenses <= 0) {
      throw new ValidationError('No licenses to release');
    }

    return this.update(ctx, licenseId, {
      usedLicenses: license.usedLicenses - 1,
    });
  }
}
